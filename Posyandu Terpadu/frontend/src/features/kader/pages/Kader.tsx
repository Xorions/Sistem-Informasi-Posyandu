import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage, apiKader, apiPosyandu, apiUsers } from '@/shared/lib/api'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { EMPTY_PAGE_META, type ApiMeta, type Kader, type Posyandu, type User } from '@/shared/types'

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

function toForm(k: Kader): FormState {
  return {
    posyandu_id: String(k.posyandu_id ?? ''),
    user_id: String(k.user_id ?? ''),
    nama_kader: k.nama_kader ?? '',
    nik_kader: k.nik_kader ?? '',
    no_hp: k.no_hp ?? '',
    jabatan: k.jabatan ?? '',
    pendidikan: k.pendidikan ?? '',
    alamat: k.alamat ?? '',
    tanggal_mulai_tugas: k.tanggal_mulai_tugas ?? '',
    status: k.status,
  }
}

export default function KaderPage() {
  const toast = useToast()
  const { isAdmin } = useAuth()

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
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

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
    setForm({ ...EMPTY_FORM, posyandu_id: posyanduFilter || String(posyandus[0]?.id ?? '') })
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (k: Kader) => {
    setEditing(k)
    setForm(toForm(k))
    setFormError(null)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

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

    try {
      if (editing) {
        await apiKader.update(editing.id, payload)
        toast.show('Data kader berhasil diperbarui')
      } else {
        await apiKader.create(payload)
        toast.show('Kader berhasil ditambahkan')
      }

      setOpen(false)
      await load()
    } catch (err) {
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
            can('ADMIN', 'manage-kader') ? (
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
                        {can('ADMIN', 'manage-kader') && (
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
                <Field label="Nama Kader" required>
                  <Input value={form.nama_kader} onChange={set('nama_kader')} required maxLength={255} />
                </Field>
                <Field label="NIK" hint="16 digit tanpa tanda hubung">
                  <Input value={form.nik_kader} onChange={set('nik_kader')} maxLength={20} />
                </Field>
                <Field label="Posyandu" required>
                  <Select value={form.posyandu_id} onChange={set('posyandu_id')} required>
                    <option value="">-- Pilih posyandu --</option>
                    {posyandus.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_posyandu}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Jabatan">
                  <Input value={form.jabatan} onChange={set('jabatan')} placeholder="Ketua Posyandu" maxLength={100} />
                </Field>
                <Field label="Nomor HP">
                  <Input value={form.no_hp} onChange={set('no_hp')} maxLength={20} placeholder="08xxxxxxxxxx" />
                </Field>
                <Field label="Pendidikan">
                  <Select value={form.pendidikan} onChange={set('pendidikan')}>
                    <option value="">-- Pilih --</option>
                    {PENDIDIKAN.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Tanggal Mulai Tugas">
                  <Input type="date" value={form.tanggal_mulai_tugas} onChange={set('tanggal_mulai_tugas')} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onChange={set('status')}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                  </Select>
                </Field>
              </div>

              <Field label="Alamat">
                <Input value={form.alamat} onChange={set('alamat')} />
              </Field>

              {isAdmin && (
                <Field label="Tautkan ke Akun Login" hint="Opsional. Akun KADER agar bisa masuk dan mencatat pemeriksaan.">
                  <Select value={form.user_id} onChange={set('user_id')}>
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