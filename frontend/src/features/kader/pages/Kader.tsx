import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage, apiKader, apiPosyandu, apiUsers, apiValidationErrors } from '@/shared/lib/api'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { EMPTY_PAGE_META, type ApiMeta, type Kader, type Posyandu, type User } from '@/shared/types'
import { isMasked, isValidNik, isValidPhone, buildDirtyPayload } from '@/shared/lib/utils'

type FormState = {
  posyandu_id: string
  user_id: string
  nama_kader: string
  nik_kader: string
  no_hp: string
  jabatan: string
  pendidikan: string
  alamat: string
  tanggal_mulai_tugas: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: FormState = {
  posyandu_id: '',
  user_id: '',
  nama_kader: '',
  nik_kader: '',
  no_hp: '',
  jabatan: '',
  pendidikan: '',
  alamat: '',
  tanggal_mulai_tugas: '',
  status: 'active',
}

const PENDIDIKAN = ['SD', 'SMP', 'SMA', 'D1', 'D3', 'S1', 'S2', 'S3']

function toForm(k: Kader): { form: FormState; masks: { [key: string]: string } } {
  const masks: { [key: string]: string } = {}
  let nik = k.nik_kader ?? ''
  if (isMasked(nik)) {
    masks.nik_kader = nik
    nik = ''
  }
  let hp = k.no_hp ?? ''
  if (isMasked(hp)) {
    masks.no_hp = hp
    hp = ''
  }
  return {
    form: {
      posyandu_id: String(k.posyandu_id ?? ''),
      user_id: String(k.user_id ?? ''),
      nama_kader: k.nama_kader ?? '',
      nik_kader: nik,
      no_hp: hp,
      jabatan: k.jabatan ?? '',
      pendidikan: k.pendidikan ?? '',
      alamat: k.alamat ?? '',
      tanggal_mulai_tugas: k.tanggal_mulai_tugas ?? '',
      status: k.status,
    },
    masks,
  }
}

export default function KaderPage() {
  const toast = useToast()
  const { role, isAdmin } = useAuth()
  const canManage = can(role, 'manage-kader')

  const [rows, setRows] = useState<Kader[]>([])
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])
  const [users, setUsers] = useState<User[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_PAGE_META)

  const [search, setSearch] = useState('')
  const [posyanduFilter, setPosyanduFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Kader | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [initialForm, setInitialForm] = useState<FormState>(EMPTY_FORM)
  const [maskedPlaceholders, setMaskedPlaceholders] = useState<{ [key: string]: string }>({})
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [deleting, setDeleting] = useState<Kader | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data, meta } = await apiKader.list({
        search: debouncedSearch || undefined,
        posyandu_id: posyanduFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 10,
      })

      setRows(data)
      setMeta(meta ?? EMPTY_PAGE_META)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data kader tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, posyanduFilter, statusFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiPosyandu.list({ per_page: 100 })
        setPosyandus(data)

        // Hanya ADMIN yang boleh menautkan kader ke akun login.
        if (isAdmin) {
          const { data: userRows } = await apiUsers.list({ per_page: 100 })
          setUsers(userRows)
        }
      } catch {
        // Gagal memuat referensi tidak boleh memblokir halaman.
      }
    })()
  }, [isAdmin])

  const openCreate = () => {
    setEditing(null)
    const newForm = { ...EMPTY_FORM, posyandu_id: posyanduFilter || String(posyandus[0]?.id ?? '') }
    setForm(newForm)
    setInitialForm(newForm)
    setMaskedPlaceholders({})
    setFormError(null)
    setErrors({})
    setOpen(true)
  }

  const openEdit = async (k: Kader) => {
    setEditing(k)
    const parsed = toForm(k)
    setForm(parsed.form)
    setInitialForm(parsed.form)
    setMaskedPlaceholders(parsed.masks)
    setFormError(null)
    setErrors({})
    setOpen(true)
    try {
      const res = await apiKader.get(k.id)
      if (res) {
        const fullParsed = toForm(res)
        setForm(fullParsed.form)
        setInitialForm(fullParsed.form)
        setMaskedPlaceholders(fullParsed.masks)
      }
    } catch {
      // fallback to list data
    }
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.nama_kader.trim()) {
      errs.nama_kader = 'Nama kader wajib diisi.'
    }
    if (!form.posyandu_id) {
      errs.posyandu_id = 'Posyandu wajib dipilih.'
    }

    if (isMasked(form.nik_kader)) {
      errs.nik_kader = 'Data tersamar tidak boleh dikirim langsung.'
    } else if (form.nik_kader && !isValidNik(form.nik_kader)) {
      errs.nik_kader = 'NIK kader harus tepat 16 digit angka.'
    }

    if (isMasked(form.no_hp)) {
      errs.no_hp = 'Data tersamar tidak boleh dikirim langsung.'
    } else if (form.no_hp && !isValidPhone(form.no_hp)) {
      errs.no_hp = 'Format nomor HP tidak valid (contoh: 081234567890).'
    }

    const today = new Date().toISOString().substring(0, 10)
    if (form.tanggal_mulai_tugas && form.tanggal_mulai_tugas > today) {
      errs.tanggal_mulai_tugas = 'Tanggal mulai tugas tidak boleh di masa depan.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon perbaiki isian form yang bermasalah.')
      return
    }

    setSaving(true)

    try {
      if (editing) {
        const dirty = buildDirtyPayload(
          {
            posyandu_id: Number(form.posyandu_id),
            user_id: form.user_id ? Number(form.user_id) : null,
            nama_kader: form.nama_kader,
            nik_kader: form.nik_kader || null,
            no_hp: form.no_hp || null,
            jabatan: form.jabatan || null,
            pendidikan: form.pendidikan || null,
            alamat: form.alamat || null,
            tanggal_mulai_tugas: form.tanggal_mulai_tugas || null,
            status: form.status,
          },
          {
            posyandu_id: Number(initialForm.posyandu_id),
            user_id: initialForm.user_id ? Number(initialForm.user_id) : null,
            nama_kader: initialForm.nama_kader,
            nik_kader: initialForm.nik_kader || null,
            no_hp: initialForm.no_hp || null,
            jabatan: initialForm.jabatan || null,
            pendidikan: initialForm.pendidikan || null,
            alamat: initialForm.alamat || null,
            tanggal_mulai_tugas: initialForm.tanggal_mulai_tugas || null,
            status: initialForm.status,
          },
          maskedPlaceholders
        )

        if (Object.keys(dirty).length > 0) {
          await apiKader.update(editing.id, dirty as any)
        }
        toast.show('Data kader berhasil diperbarui')
      } else {
        const payload = {
          posyandu_id: Number(form.posyandu_id),
          user_id: form.user_id ? Number(form.user_id) : null,
          nama_kader: form.nama_kader,
          nik_kader: form.nik_kader || null,
          no_hp: form.no_hp || null,
          jabatan: form.jabatan || null,
          pendidikan: form.pendidikan || null,
          alamat: form.alamat || null,
          tanggal_mulai_tugas: form.tanggal_mulai_tugas || null,
          status: form.status,
        }
        await apiKader.create(payload)
        toast.show('Kader berhasil ditambahkan')
      }

      setOpen(false)
      await load()
    } catch (err) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return

    setDeleteLoading(true)

    try {
      await apiKader.remove(deleting.id)
      toast.show('Kader dihapus')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const set = (key: keyof FormState) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Kader dan Petugas Posyandu"
          subtitle="Data petugas yang bertugas di keempat posyandu beserta jabatan dan akun loginnya."
          action={
            canManage ? (
              <Button onClick={openCreate}>+ Tambah Kader</Button>
            ) : (
              <span className="text-xs text-slate-500">Mode lihat saja</span>
            )
          }
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input placeholder="Cari nama atau NIK kader..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1) }} />
            <Select value={posyanduFilter} onChange={(e) => { setPosyanduFilter(e.target.value); setPage(1) }}>
              <option value="">Semua posyandu</option>
              {posyandus.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_posyandu}
                </option>
              ))}
            </Select>
            <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}>
              <option value="">Semua status</option>
              <option value="active">Aktif</option>
              <option value="inactive">Tidak Aktif</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : rows.length === 0 ? (
            <EmptyState title="Belum ada kader" description="Tambahkan petugas yang bertugas di posyandu." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-3 pr-3 font-semibold">Nama</th>
                    <th className="py-3 pr-3 font-semibold">Jabatan</th>
                    <th className="py-3 pr-3 font-semibold">Posyandu</th>
                    <th className="py-3 pr-3 font-semibold">NIK</th>
                    <th className="py-3 pr-3 font-semibold">No. HP</th>
                    <th className="py-3 pr-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((k) => (
                    <tr key={k.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-3">
                        <p className="font-medium text-slate-800">{k.nama_kader}</p>
                        {k.user && <p className="text-[11px] text-teal-600">Punya akun login</p>}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">{k.jabatan || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{k.posyandu?.nama_posyandu || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{k.nik_kader || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{k.no_hp || '-'}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={k.status} />
                      </td>
                      <td className="py-3 text-right space-x-2 whitespace-nowrap">
                        {canManage && (
                          <>
                            <button onClick={() => openEdit(k)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                              Ubah
                            </button>
                            <button onClick={() => setDeleting(k)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                              Hapus
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && meta.last_page > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <span>
                Halaman {meta.current_page} dari {meta.last_page} ({meta.total} kader)
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editing ? 'Ubah Data Kader' : 'Tambah Kader'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                Ã¢Å“â€¢
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Nama Kader" required error={errors.nama_kader}>
                  <Input value={form.nama_kader} onChange={set('nama_kader')} required maxLength={255} hasError={!!errors.nama_kader} />
                </Field>
                <Field
                  label="NIK"
                  error={errors.nik_kader}
                  hint={
                    maskedPlaceholders.nik_kader
                      ? `Tersembunyi (${maskedPlaceholders.nik_kader}) — isi hanya untuk mengganti`
                      : '16 digit angka'
                  }
                >
                  <Input
                    inputMode="numeric"
                    pattern="[0-9]*"
                    value={form.nik_kader}
                    onChange={(e) => setForm((f) => ({ ...f, nik_kader: e.target.value.replace(/\D/g, '').slice(0, 16) }))}
                    maxLength={16}
                    hasError={!!errors.nik_kader}
                    placeholder={
                      maskedPlaceholders.nik_kader
                        ? `Tersembunyi (${maskedPlaceholders.nik_kader})`
                        : '16 digit NIK'
                    }
                  />
                </Field>
                <Field label="Posyandu" required error={errors.posyandu_id}>
                  <Select value={form.posyandu_id} onChange={set('posyandu_id')} required hasError={!!errors.posyandu_id}>
                    <option value="">-- Pilih posyandu --</option>
                    {posyandus.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_posyandu}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Jabatan" error={errors.jabatan}>
                  <Input value={form.jabatan} onChange={set('jabatan')} placeholder="Ketua Posyandu" maxLength={100} hasError={!!errors.jabatan} />
                </Field>
                <Field
                  label="Nomor HP"
                  error={errors.no_hp}
                  hint={
                    maskedPlaceholders.no_hp
                      ? `Tersembunyi (${maskedPlaceholders.no_hp}) — isi hanya untuk mengganti`
                      : undefined
                  }
                >
                  <Input
                    type="tel"
                    inputMode="tel"
                    value={form.no_hp}
                    onChange={set('no_hp')}
                    maxLength={15}
                    hasError={!!errors.no_hp}
                    placeholder={
                      maskedPlaceholders.no_hp
                        ? `Tersembunyi (${maskedPlaceholders.no_hp})`
                        : '08xxxxxxxxxx'
                    }
                  />
                </Field>
                <Field label="Pendidikan" error={errors.pendidikan}>
                  <Select value={form.pendidikan} onChange={set('pendidikan')} hasError={!!errors.pendidikan}>
                    <option value="">-- Pilih --</option>
                    {PENDIDIKAN.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tanggal Mulai Tugas" error={errors.tanggal_mulai_tugas}>
                  <Input type="date" max={new Date().toISOString().substring(0, 10)} value={form.tanggal_mulai_tugas} onChange={set('tanggal_mulai_tugas')} hasError={!!errors.tanggal_mulai_tugas} />
                </Field>
                <Field label="Status" error={errors.status}>
                  <Select value={form.status} onChange={set('status')} hasError={!!errors.status}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </Select>
                </Field>
              </div>

              <Field label="Alamat" error={errors.alamat}>
                <Input value={form.alamat} onChange={set('alamat')} hasError={!!errors.alamat} />
              </Field>

              {isAdmin && (
                <Field label="Tautkan ke Akun Login" hint="Opsional. Akun KADER agar bisa masuk dan mencatat pemeriksaan." error={errors.user_id}>
                  <Select value={form.user_id} onChange={set('user_id')} hasError={!!errors.user_id}>
                    <option value="">-- Tidak ditautkan --</option>
                    {users.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.name} ({u.email})
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  {editing ? 'Simpan Perubahan' : 'Simpan Kader'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Hapus Data Kader?"
        description={
          deleting
            ? `${deleting.nama_kader} akan dihapus dari daftar petugas posyandu. Riwayat pencatatan yang sudah tersimpan tidak ikut terhapus.`
            : ''
        }
      />
    </div>
  )
}