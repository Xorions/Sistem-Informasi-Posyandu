import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage, apiIbuHamil, apiParents, apiPosyandu, apiValidationErrors } from '@/shared/lib/api'
import { ROUTES } from '@/app/routes'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { CardSkeleton } from '@/shared/components/ui/Skeleton'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { can } from '@/shared/lib/rbac'
import { useAuth } from '@/features/auth/AuthContext'
import { parseNumeric } from '@/shared/lib/utils'
import type { IbuHamil, OrangTua, PosyanduRef } from '@/shared/types'
import { SearchableSelect } from '@/shared/components/ui/SearchableSelect'

type FormState = {
  parent_id: string
  posyandu_id: string
  hpht: string
  tanggal_perkiraan_lahir: string
  jarak_kehamilan: string
  jumlah_anak_lahir: string
  tinggi_funds: string
  berat_badan: string
  golongan_darah: string
  riwayat_penyakit: string
  status: 'active' | 'inactive'
}

const EMPTY_FORM: FormState = {
  parent_id: '',
  posyandu_id: '',
  hpht: '',
  tanggal_perkiraan_lahir: '',
  jarak_kehamilan: '',
  jumlah_anak_lahir: '',
  tinggi_funds: '',
  berat_badan: '',
  golongan_darah: '',
  riwayat_penyakit: '',
  status: 'active',
}

const GOLONGAN_DARAH = ['A', 'B', 'AB', 'O']

function toForm(i: IbuHamil): FormState {
  return {
    parent_id: String(i.parent_id ?? ''),
    posyandu_id: String(i.posyandu_id ?? ''),
    hpht: i.hpht ?? '',
    tanggal_perkiraan_lahir: i.tanggal_perkiraan_lahir ?? '',
    jarak_kehamilan: i.jarak_kehamilan != null ? String(i.jarak_kehamilan) : '',
    jumlah_anak_lahir: i.jumlah_anak_lahir != null ? String(i.jumlah_anak_lahir) : '',
    tinggi_funds: i.tinggi_funds != null ? String(i.tinggi_funds) : '',
    berat_badan: i.berat_badan != null ? String(i.berat_badan) : '',
    golongan_darah: i.golongan_darah ?? '',
    riwayat_penyakit: i.riwayat_penyakit ?? '',
    status: i.status,
  }
}

export default function IbuHamilPage() {
  const toast = useToast()
  const navigate = useNavigate()
  const { role, isAdmin, user } = useAuth()
  const canManage = can(role, 'manage-ibu-hamil')
  const canChoosePosyandu = isAdmin && (user?.posyandus?.length ?? 0) > 1
  const assignedPosyanduId = user?.kader?.posyandu_id ?? user?.posyandu_id ?? user?.posyandus?.[0]?.id

  const [rows, setRows] = useState<IbuHamil[]>([])
  const [posyandus, setPosyandus] = useState<PosyanduRef[]>([])
  const [parents, setParents] = useState<OrangTua[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [posyanduFilter, setPosyanduFilter] = useState('')
  const [trimesterFilter, setTrimesterFilter] = useState('')
  const [search, setSearch] = useState('')
  const effectivePosyanduFilter = canChoosePosyandu
    ? posyanduFilter
    : assignedPosyanduId != null
      ? String(assignedPosyanduId)
      : ''

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IbuHamil | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [deleting, setDeleting] = useState<IbuHamil | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data } = await apiIbuHamil.list({
        posyandu_id: effectivePosyanduFilter || undefined,
        trimester: trimesterFilter || undefined,
        search: search || undefined,
        per_page: 50,
      })

      setRows(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data ibu hamil tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [effectivePosyanduFilter, trimesterFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const parentsResult = await apiParents.list({ per_page: 100 })
        setParents(parentsResult.data)
      } catch {
        // Referensi orang tua opsional; halaman tetap bisa menampilkan daftar.
      }
    })()
    if (canChoosePosyandu) {
      void apiPosyandu.list({ per_page: 100 }).then((result) => setPosyandus(result.data)).catch(() => {
        // Filter daftar tetap dapat dipakai bila referensi posyandu gagal dimuat.
      })
    } else {
      const assigned = user?.posyandus?.length
        ? user.posyandus
        : user?.posyandu
          ? [user.posyandu]
          : []
      setPosyandus(assigned)
    }
  }, [canChoosePosyandu, user])

  const openCreate = () => {
    setEditing(null)
    setForm({
      ...EMPTY_FORM,
      posyandu_id: effectivePosyanduFilter || String(posyandus[0]?.id ?? ''),
    })
    setFormError(null)
    setErrors({})
    setOpen(true)
  }

  const openEdit = (i: IbuHamil) => {
    setEditing(i)
    setForm(toForm(i))
    setFormError(null)
    setErrors({})
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    if (!editing && !form.parent_id) {
      errs.parent_id = 'Orang tua wajib dipilih.'
    }
    if (!form.posyandu_id) {
      errs.posyandu_id = 'Posyandu wajib dipilih.'
    }

    const today = new Date().toISOString().substring(0, 10)
    if (!form.hpht && !form.tanggal_perkiraan_lahir) {
      errs.hpht = 'Isi salah satu dari HPHT atau perkiraan hari lahir.'
    }
    if (form.hpht && form.hpht > today) {
      errs.hpht = 'HPHT tidak boleh di masa depan.'
    } else if (form.hpht) {
      const hphtDate = new Date(`${form.hpht}T00:00:00`)
      const gestationDays = Math.floor((new Date(`${today}T00:00:00`).getTime() - hphtDate.getTime()) / 86400000)
      if (gestationDays > 42 * 7) errs.hpht = 'Usia kehamilan dari HPHT melebihi 42 minggu. Periksa kembali tanggal HPHT sebelum menyimpan.'
    }
    if (form.tanggal_perkiraan_lahir && form.tanggal_perkiraan_lahir <= today) {
      errs.tanggal_perkiraan_lahir = 'Perkiraan hari lahir harus di masa depan.'
    }
    if (form.tinggi_funds) {
      const tf = Number(form.tinggi_funds)
      if (isNaN(tf) || tf < 10 || tf > 45) {
        errs.tinggi_funds = 'Tinggi fundus harus antara 10 - 45 cm.'
      }
    }
    if (form.berat_badan) {
      const bb = Number(form.berat_badan)
      if (isNaN(bb) || bb < 30 || bb > 150) {
        errs.berat_badan = 'Berat badan harus antara 30 - 150 kg.'
      }
    }
    if (form.jarak_kehamilan) {
      const jk = Number(form.jarak_kehamilan)
      if (isNaN(jk) || jk < 0 || jk > 60) {
        errs.jarak_kehamilan = 'Jarak kehamilan harus antara 0 - 60 bulan.'
      }
    }
    if (form.jumlah_anak_lahir) {
      const ja = Number(form.jumlah_anak_lahir)
      if (isNaN(ja) || ja < 0 || ja > 15) {
        errs.jumlah_anak_lahir = 'Jumlah anak lahir harus antara 0 - 15.'
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon perbaiki kesalahan pada formulir.')
      return
    }

    setSaving(true)

    const payload = {
      posyandu_id: Number(form.posyandu_id),
      hpht: form.hpht || null,
      tanggal_perkiraan_lahir: form.tanggal_perkiraan_lahir || null,
      jarak_kehamilan: parseNumeric(form.jarak_kehamilan),
      jumlah_anak_lahir: parseNumeric(form.jumlah_anak_lahir),
      tinggi_funds: parseNumeric(form.tinggi_funds),
      berat_badan: parseNumeric(form.berat_badan),
      golongan_darah: form.golongan_darah || null,
      riwayat_penyakit: form.riwayat_penyakit ? form.riwayat_penyakit.trim() : null,
      status: form.status,
    }

    try {
      if (editing) {
        await apiIbuHamil.update(editing.id, payload)
        toast.show('Data ibu hamil berhasil diperbarui')
      } else {
        await apiIbuHamil.create({ ...payload, parent_id: Number(form.parent_id) })
        toast.show('Ibu hamil berhasil ditambahkan')
      }

      setOpen(false)
      setErrors({})
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
      await apiIbuHamil.remove(deleting.id)
      toast.show('Data ibu hamil dihapus')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      setForm((f) => ({ ...f, [key]: e.target.value }))
      if (errors[key]) setErrors((prev) => ({ ...prev, [key]: '' }))
    }

  const hphtToday = new Date()
  hphtToday.setHours(0, 0, 0, 0)
  const hphtDate = form.hpht ? new Date(`${form.hpht}T00:00:00`) : null
  const hphtOver42Weeks = hphtDate !== null && hphtToday.getTime() - hphtDate.getTime() > 42 * 7 * 86400000

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Ibu Hamil"
          subtitle="Pendampingan kehamilan di Posyandu Terpadu. Usia kehamilan dihitung otomatis dari HPHT."
          action={
            canManage ? (
              <Button onClick={openCreate}>+ Tambah Ibu Hamil</Button>
            ) : (
              <span className="text-xs text-slate-500">Mode lihat saja</span>
            )
          }
        />
        <CardContent>
          <div className={`grid gap-3 md:grid-cols-2 ${canChoosePosyandu ? 'md:grid-cols-3' : ''}`}>
            <Input placeholder="Cari nama ibu..." value={search} onChange={(e) => setSearch(e.target.value)} />
            {canChoosePosyandu && (
              <Select value={posyanduFilter} onChange={(e) => setPosyanduFilter(e.target.value)}>
                <option value="">Semua posyandu</option>
                {posyandus.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_posyandu}
                  </option>
                ))}
              </Select>
            )}
            <Select value={trimesterFilter} onChange={(e) => setTrimesterFilter(e.target.value)}>
              <option value="">Semua trimester</option>
              <option value="1">Trimester 1 (0-13 minggu)</option>
              <option value="2">Trimester 2 (14-27 minggu)</option>
              <option value="3">Trimester 3 (28-42 minggu)</option>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <CardSkeleton count={6} />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : rows.length === 0 ? (
            <EmptyState title="Belum ada data ibu hamil" description="Tambahkan ibu hamil yang mengikutiANC di posyandu." />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {rows.map((i) => (
                <button
                  key={i.id}
                  onClick={() => navigate(ROUTES.bumil(i.id))}
                  className="text-left p-4 rounded-2xl border border-slate-200 hover:border-teal-300 hover:bg-teal-50/40 transition"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-semibold text-slate-800 truncate">{i.nama_ibu}</p>
                      <p className="text-[11px] text-slate-500 truncate">{i.posyandu?.nama_posyandu}</p>
                    </div>
                    <span className="shrink-0 text-[11px] font-bold text-teal-700 bg-teal-50 border border-teal-100 rounded-lg px-2 py-1">
                      T{i.trimester}
                    </span>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-y-1 text-xs">
                    <span className="text-slate-500">Usia kehamilan</span>
                    <span className={`font-semibold text-right ${Number(i.usia_kehamilan) > 42 ? 'text-red-700' : 'text-slate-800'}`}>
                      {i.usia_kehamilan} minggu
                      {Number(i.usia_kehamilan) > 42 && <span className="ml-1 inline-flex rounded-full bg-red-50 px-2 py-0.5 text-[10px] text-red-700">Perlu perhatian</span>}
                    </span>
                    <span className="text-slate-500">Perkiraan lahir</span>
                    <span className="text-slate-800 font-medium text-right">{i.tanggal_perkiraan_lahir}</span>
                    {i.pemeriksaan_terakhir && (
                      <>
                        <span className="text-slate-500">Tekanan darah</span>
                        <span className="text-slate-800 font-medium text-right">
                          {i.pemeriksaan_terakhir.tekanan_darah || '-'}
                        </span>
                      </>
                    )}
                  </div>

                  <div className="mt-3 flex items-center justify-between">
                    <span
                      className={`text-[11px] font-medium ${
                        i.sudah_diperiksa ? 'text-emerald-600' : 'text-amber-600'
                      }`}
                    >
                      {i.sudah_diperiksa ? '✓ Sudah diperiksa bulan ini' : '○ Belum diperiksa bulan ini'}
                    </span>
                    <StatusBadge status={i.status} />
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editing ? 'Ubah Data Ibu Hamil' : 'Tambah Ibu Hamil'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                {!editing && (
                  <Field
                    label="Orang Tua"
                    required
                    hint="Pilih ibu dari daftar orang tua yang sudah terdaftar."
                    error={errors.parent_id}
                  >
                    <SearchableSelect
                      value={form.parent_id}
                      onChange={(parentId) => setForm((current) => ({ ...current, parent_id: parentId }))}
                      hasError={!!errors.parent_id}
                      required
                      placeholder="Pilih orang tua"
                      searchPlaceholder="Cari nama atau NIK..."
                      options={parents.filter((parent) => parent.jenis_kelamin === 'P').map((parent) => ({
                        value: parent.id,
                        label: `${parent.nama_lengkap}${parent.nik ? ` (${parent.nik})` : ''}`,
                        searchText: parent.nik ?? '',
                      }))}
                    />
                  </Field>
                )}

                <Field label="Posyandu" required error={errors.posyandu_id}>
                  <Select
                    value={form.posyandu_id}
                    onChange={set('posyandu_id')}
                    hasError={!!errors.posyandu_id}
                    required
                  >
                    <option value="">-- Pilih posyandu --</option>
                    {posyandus.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_posyandu}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field
                  label="HPHT"
                  hint="Hari pertama haid terakhir. Usia kehamilan dihitung dari sini."
                  error={errors.hpht || (hphtOver42Weeks ? 'Usia kehamilan dari HPHT melebihi 42 minggu. Periksa kembali tanggal HPHT.' : undefined)}
                >
                  <Input
                    type="date"
                    value={form.hpht}
                    onChange={set('hpht')}
                    hasError={!!errors.hpht || hphtOver42Weeks}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </Field>

                <Field
                  label="Perkiraan Hari Lahir"
                  hint="Dipakai bila HPHT tidak diisi."
                  error={errors.tanggal_perkiraan_lahir}
                >
                  <Input
                    type="date"
                    value={form.tanggal_perkiraan_lahir}
                    onChange={set('tanggal_perkiraan_lahir')}
                    hasError={!!errors.tanggal_perkiraan_lahir}
                  />
                </Field>

                <Field
                  label="Jarak Kehamilan"
                  hint="Dalam bulan sejak kehamilan terakhir (0-60)."
                  error={errors.jarak_kehamilan}
                >
                  <Input
                    type="number"
                    min={0}
                    max={60}
                    value={form.jarak_kehamilan}
                    onChange={set('jarak_kehamilan')}
                    hasError={!!errors.jarak_kehamilan}
                  />
                </Field>

                <Field label="Jumlah Anak Lahir" error={errors.jumlah_anak_lahir}>
                  <Input
                    type="number"
                    min={0}
                    max={15}
                    value={form.jumlah_anak_lahir}
                    onChange={set('jumlah_anak_lahir')}
                    hasError={!!errors.jumlah_anak_lahir}
                  />
                </Field>

                <Field
                  label="Tinggi Fundus"
                  hint="cm, normal 10-45 cm."
                  error={errors.tinggi_funds}
                >
                  <Input
                    type="number"
                    step="0.1"
                    min={10}
                    max={45}
                    value={form.tinggi_funds}
                    onChange={set('tinggi_funds')}
                    hasError={!!errors.tinggi_funds}
                  />
                </Field>

                <Field label="Berat Badan" hint="kg (30-150 kg)" error={errors.berat_badan}>
                  <Input
                    type="number"
                    step="0.1"
                    min={30}
                    max={150}
                    value={form.berat_badan}
                    onChange={set('berat_badan')}
                    hasError={!!errors.berat_badan}
                  />
                </Field>

                <Field label="Golongan Darah" error={errors.golongan_darah}>
                  <Select
                    value={form.golongan_darah}
                    onChange={set('golongan_darah')}
                    hasError={!!errors.golongan_darah}
                  >
                    <option value="">-- Pilih --</option>
                    {GOLONGAN_DARAH.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Status" error={errors.status}>
                  <Select
                    value={form.status}
                    onChange={set('status')}
                    hasError={!!errors.status}
                  >
                    <option value="active">Aktif</option>
                    <option value="inactive">Selesai Dipantau</option>
                  </Select>
                </Field>
              </div>

              <Field label="Riwayat Penyakit" error={errors.riwayat_penyakit}>
                <Textarea
                  rows={2}
                  value={form.riwayat_penyakit}
                  onChange={set('riwayat_penyakit')}
                  hasError={!!errors.riwayat_penyakit}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  {editing ? 'Simpan Perubahan' : 'Simpan Data'}
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
        title="Hapus Data Ibu Hamil?"
        description={
          deleting
            ? `Data kehamilan ${deleting.nama_ibu} beserta seluruh riwayat pemeriksaannya akan dihapus.`
            : ''
        }
      />

      {isAdmin && rows.length > 0 && (
        <p className="text-xs text-slate-400 text-center">
          Klik kartu ibu hamil untuk melihat riwayat pemeriksaan lengkap.
        </p>
      )}
    </div>
  )
}
