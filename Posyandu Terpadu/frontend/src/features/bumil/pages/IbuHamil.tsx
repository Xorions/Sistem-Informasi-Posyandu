import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiErrorMessage, apiIbuHamil, apiParents, apiPosyandu } from '@/shared/lib/api'
import { ROUTES } from '@/app/routes'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { can } from '@/shared/lib/rbac'
import { useAuth } from '@/features/auth/AuthContext'
import type { IbuHamil, OrangTua, Posyandu } from '@/shared/types'

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
  const { isAdmin } = useAuth()

  const [rows, setRows] = useState<IbuHamil[]>([])
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])
  const [parents, setParents] = useState<OrangTua[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [posyanduFilter, setPosyanduFilter] = useState('')
  const [trimesterFilter, setTrimesterFilter] = useState('')
  const [search, setSearch] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<IbuHamil | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<IbuHamil | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data } = await apiIbuHamil.list({
        posyandu_id: posyanduFilter || undefined,
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
  }, [posyanduFilter, trimesterFilter, search])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const [pos, par] = await Promise.all([
          apiPosyandu.list({ per_page: 100 }),
          apiParents.list({ per_page: 100 }),
        ])

        setPosyandus(pos.data)
        setParents(par.data)
      } catch {
        // Referensi opsional; halaman tetap bisa menampilkan daftar.
      }
    })()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, posyandu_id: posyanduFilter || String(posyandus[0]?.id ?? '') })
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (i: IbuHamil) => {
    setEditing(i)
    setForm(toForm(i))
    setFormError(null)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const num = (v: string) => (v === '' ? null : Number(v))

    const payload = {
      posyandu_id: Number(form.posyandu_id),
      hpht: form.hpht || null,
      tanggal_perkiraan_lahir: form.tanggal_perkiraan_lahir || null,
      jarak_kehamilan: num(form.jarak_kehamilan),
      jumlah_anak_lahir: num(form.jumlah_anak_lahir),
      tinggi_funds: num(form.tinggi_funds),
      berat_badan: num(form.berat_badan),
      golongan_darah: form.golongan_darah || null,
      riwayat_penyakit: form.riwayat_penyakit || null,
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
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Ibu Hamil"
          subtitle="Pendampingan kehamilan di Posyandu Terpadu. Usia kehamilan dihitung otomatis dari HPHT."
          action={
            can('KADER', 'manage-ibu-hamil') ? (
              <Button onClick={openCreate}>+ Tambah Ibu Hamil</Button>
            ) : (
              <span className="text-xs text-slate-500">Mode lihat saja</span>
            )
          }
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Input placeholder="Cari nama ibu..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <Select value={posyanduFilter} onChange={(e) => setPosyanduFilter(e.target.value)}>
              <option value="">Semua posyandu</option>
              {posyandus.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_posyandu}
                </option>
              ))}
            </Select>
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
            <Spinner />
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
                    <span className="text-slate-800 font-medium text-right">{i.usia_kehamilan} minggu</span>
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
                  <Field label="Orang Tua" required hint="Pilih ibu dari daftar orang tua yang sudah terdaftar.">
                    <Select value={form.parent_id} onChange={set('parent_id')} required>
                      <option value="">-- Pilih orang tua --</option>
                      {parents
                        .filter((p) => p.jenis_kelamin === 'P')
                        .map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.nama_lengkap}
                            {p.nik ? ` (${p.nik})` : ''}
                          </option>
                        ))}
                    </Select>
                  </Field>
                )}

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

                <Field label="HPHT" hint="Hari pertama haid terakhir. Usia kehamilan dihitung dari sini.">
                  <Input type="date" value={form.hpht} onChange={set('hpht')} max={new Date().toISOString().slice(0, 10)} />
                </Field>

                <Field label="Perkiraan Hari Lahir" hint="Dipakai bila HPHT tidak diisi.">
                  <Input
                    type="date"
                    value={form.tanggal_perkiraan_lahir}
                    onChange={set('tanggal_perkiraan_lahir')}
                  />
                </Field>

                <Field label="Jarak Kehamilan" hint="Dalam bulan sejak kehamilan terakhir.">
                  <Input type="number" min={0} max={60} value={form.jarak_kehamilan} onChange={set('jarak_kehamilan')} />
                </Field>

                <Field label="Jumlah Anak Lahir">
                  <Input
                    type="number"
                    min={0}
                    max={15}
                    value={form.jumlah_anak_lahir}
                    onChange={set('jumlah_anak_lahir')}
                  />
                </Field>

                <Field label="Tinggi Fundus" hint="cm, normal 10-35 cm.">
                  <Input type="number" step="0.1" min={10} max={45} value={form.tinggi_funds} onChange={set('tinggi_funds')} />
                </Field>

                <Field label="Berat Badan" hint="kg">
                  <Input type="number" step="0.1" min={30} max={150} value={form.berat_badan} onChange={set('berat_badan')} />
                </Field>

                <Field label="Golongan Darah">
                  <Select value={form.golongan_darah} onChange={set('golongan_darah')}>
                    <option value="">-- Pilih --</option>
                    {GOLONGAN_DARAH.map((g) => (
                      <option key={g} value={g}>
                        {g}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Status">
                  <Select value={form.status} onChange={set('status')}>
                    <option value="active">Aktif</option>
                    <option value="inactive">Selesai Dipantau</option>
                  </Select>
                </Field>
              </div>

              <Field label="Riwayat Penyakit">
                <Textarea rows={2} value={form.riwayat_penyakit} onChange={set('riwayat_penyakit')} />
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