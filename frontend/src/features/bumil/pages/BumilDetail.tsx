import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { apiErrorMessage, apiIbuHamil, apiPemeriksaanBumil, apiValidationErrors } from '@/shared/lib/api'
import { ROUTES } from '@/app/routes'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { parseNumeric } from '@/shared/lib/utils'
import { STATUS_BUMIL_LABEL, type IbuHamil, type PemeriksaanBumil, type StatusBumil } from '@/shared/types'

const STATUS_OPTIONS: StatusBumil[] = ['normal', 'perlu_perhatian', 'danger']

type FormState = {
  tanggal_periksa: string
  usia_kehamilan: string
  berat_badan: string
  tinggi_badan: string
  tekanan_darah: string
  lingkar_lengan_atas: string
  tinggi_funds: string
  denyut_jantung_janin: string
  posisi_janin: string
  keluhan: string
  catatan: string
  status: StatusBumil
}

const EMPTY_FORM: FormState = {
  tanggal_periksa: new Date().toISOString().slice(0, 10),
  usia_kehamilan: '',
  berat_badan: '',
  tinggi_badan: '',
  tekanan_darah: '',
  lingkar_lengan_atas: '',
  tinggi_funds: '',
  denyut_jantung_janin: '',
  posisi_janin: '',
  keluhan: '',
  catatan: '',
  status: 'normal',
}

const POSISI_JANIN = ['Belum dapat ditentukan', 'Head-on', 'Breech', 'Transversal', 'Kembar']

export default function BumilDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const toast = useToast()
  const { role, isAdmin } = useAuth()
  const canManage = can(role, 'manage-ibu-hamil')

  const ibuHamilId = Number(id)

  const [ibu, setIbu] = useState<IbuHamil | null>(null)
  const [riwayat, setRiwayat] = useState<PemeriksaanBumil[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<PemeriksaanBumil | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [deleting, setDeleting] = useState<PemeriksaanBumil | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    if (!ibuHamilId) return

    try {
      setError(null)
      const [detail, exam] = await Promise.all([
        apiIbuHamil.get(ibuHamilId),
        apiIbuHamil.pemeriksaan(ibuHamilId, { per_page: 50 }),
      ])

      setIbu(detail)
      setRiwayat(exam.data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data ibu hamil tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [ibuHamilId])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    // Usia kehamilan defaultdict mengikuti truncate ibu hamil saat ini.
    setForm({ ...EMPTY_FORM, usia_kehamilan: String(ibu?.usia_kehamilan ?? '') })
    setFormError(null)
    setErrors({})
    setOpen(true)
  }

  const openEdit = (p: PemeriksaanBumil) => {
    setEditing(p)
    setForm({
      tanggal_periksa: p.tanggal_periksa,
      usia_kehamilan: String(p.usia_kehamilan ?? ''),
      berat_badan: p.berat_badan != null ? String(p.berat_badan) : '',
      tinggi_badan: p.tinggi_badan != null ? String(p.tinggi_badan) : '',
      tekanan_darah: p.tekanan_darah ?? '',
      lingkar_lengan_atas: p.lingkar_lengan_atas != null ? String(p.lingkar_lengan_atas) : '',
      tinggi_funds: p.tinggi_funds != null ? String(p.tinggi_funds) : '',
      denyut_jantung_janin: p.denyut_jantung_janin != null ? String(p.denyut_jantung_janin) : '',
      posisi_janin: p.posisi_janin ?? '',
      keluhan: p.keluhan ?? '',
      catatan: p.catatan ?? '',
      status: p.status,
    })
    setFormError(null)
    setErrors({})
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    const today = new Date().toISOString().substring(0, 10)
    if (!form.tanggal_periksa) {
      errs.tanggal_periksa = 'Tanggal periksa wajib diisi.'
    } else if (form.tanggal_periksa > today) {
      errs.tanggal_periksa = 'Tanggal periksa tidak boleh di masa depan.'
    }

    if (!form.usia_kehamilan) {
      errs.usia_kehamilan = 'Usia kehamilan wajib diisi.'
    } else {
      const uk = Number(form.usia_kehamilan)
      if (isNaN(uk) || uk < 0 || uk > 42) {
        errs.usia_kehamilan = 'Usia kehamilan harus antara 0 - 42 minggu.'
      }
    }

    if (form.tekanan_darah && !/^\d{2,3}\/\d{2,3}$/.test(form.tekanan_darah)) {
      errs.tekanan_darah = 'Format tekanan darah harus seperti 120/80.'
    }

    if (form.berat_badan) {
      const bb = Number(form.berat_badan)
      if (isNaN(bb) || bb < 30 || bb > 150) {
        errs.berat_badan = 'Berat badan harus antara 30 - 150 kg.'
      }
    }

    if (form.tinggi_badan) {
      const tb = Number(form.tinggi_badan)
      if (isNaN(tb) || tb < 120 || tb > 200) {
        errs.tinggi_badan = 'Tinggi badan harus antara 120 - 200 cm.'
      }
    }

    if (form.lingkar_lengan_atas) {
      const lila = Number(form.lingkar_lengan_atas)
      if (isNaN(lila) || lila < 15 || lila > 50) {
        errs.lingkar_lengan_atas = 'Lingkar lengan atas (LiLA) harus antara 15 - 50 cm.'
      }
    }

    if (form.tinggi_funds) {
      const tf = Number(form.tinggi_funds)
      if (isNaN(tf) || tf < 10 || tf > 45) {
        errs.tinggi_funds = 'Tinggi fundus harus antara 10 - 45 cm.'
      }
    }

    if (form.denyut_jantung_janin) {
      const djj = Number(form.denyut_jantung_janin)
      if (isNaN(djj) || djj < 80 || djj > 200) {
        errs.denyut_jantung_janin = 'Denyut jantung janin harus antara 80 - 200 per menit.'
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon perbaiki kesalahan pada formulir.')
      return
    }

    setSaving(true)

    const payload = {
      tanggal_periksa: form.tanggal_periksa,
      usia_kehamilan: Number(form.usia_kehamilan),
      berat_badan: parseNumeric(form.berat_badan),
      tinggi_badan: parseNumeric(form.tinggi_badan),
      tekanan_darah: form.tekanan_darah ? form.tekanan_darah.trim() : null,
      lingkar_lengan_atas: parseNumeric(form.lingkar_lengan_atas),
      tinggi_funds: parseNumeric(form.tinggi_funds),
      denyut_jantung_janin: parseNumeric(form.denyut_jantung_janin),
      posisi_janin: form.posisi_janin || null,
      keluhan: form.keluhan ? form.keluhan.trim() : null,
      catatan: form.catatan ? form.catatan.trim() : null,
      status: form.status,
    }

    try {
      if (editing) {
        await apiPemeriksaanBumil.update(editing.id, payload)
        toast.show('Hasil pemeriksaan berhasil diperbarui')
      } else {
        await apiPemeriksaanBumil.create({ ...payload, ibu_hamil_id: ibuHamilId })
        toast.show('Hasil pemeriksaan berhasil disimpan')
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
      await apiPemeriksaanBumil.remove(deleting.id)
      toast.show('Hasil pemeriksaan dihapus')
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

  if (loading) return <Spinner />

  if (error || !ibu) {
    return (
      <Card>
        <CardContent>
          <ErrorState message={error || 'Ibu hamil tidak ditemukan.'} onRetry={load} />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-5">
      <button onClick={() => navigate(ROUTES.ibuHamil)} className="text-sm text-teal-600 hover:text-teal-800">
        ← Kembali ke daftar ibu hamil
      </button>

      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader title={ibu.nama_ibu || 'Ibu Hamil'} subtitle={ibu.posyandu?.nama_posyandu} />
          <CardContent>
            <dl className="space-y-3 text-sm">
              {[
                ['NIK', ibu.nik || '-'],
                ['No. HP', ibu.nomor_telepon || '-'],
                ['Alamat', ibu.alamat || '-'],
                ['Golongan darah', ibu.golongan_darah || '-'],
                ['HPHT', ibu.hpht || '-'],
                ['Perkiraan lahir', ibu.tanggal_perkiraan_lahir],
                ['Jarak kehamilan', ibu.jarak_kehamilan != null ? `${ibu.jarak_kehamilan} bulan` : '-'],
                ['Anak lahir', ibu.jumlah_anak_lahir != null ? `${ibu.jumlah_anak_lahir} orang` : '-'],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between gap-3 border-b border-slate-50 pb-2 last:border-0">
                  <dt className="text-slate-500">{label}</dt>
                  <dd className="font-medium text-slate-800 text-right">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-4 p-4 rounded-xl bg-teal-50 border border-teal-100">
              <p className="text-xs text-teal-700 font-semibold">USIA KEHAMILAN</p>
              <p className="text-3xl font-bold text-teal-700 mt-1">
                {ibu.usia_kehamilan} <span className="text-sm font-medium">minggu</span>
              </p>
              <p className="text-xs text-teal-600 mt-1">Trimester {ibu.trimester}</p>
              <p className={`text-xs mt-2 font-medium ${ibu.sudah_diperiksa ? 'text-emerald-600' : 'text-amber-600'}`}>
                {ibu.sudah_diperiksa ? '✓ Sudah diperiksa bulan ini' : '○ Belum diperiksa bulan ini'}
              </p>
            </div>

            {ibu.riwayat_penyakit && (
              <div className="mt-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <p className="text-xs font-semibold text-amber-800">Riwayat Penyakit</p>
                <p className="text-sm text-amber-900 mt-1">{ibu.riwayat_penyakit}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader
            title="Riwayat Pemeriksaan"
            subtitle={`${riwayat.length} pemeriksaan tercatat`}
            action={
              canManage ? (
                <Button onClick={openCreate}>+ Tambah Pemeriksaan</Button>
              ) : (
                <span className="text-xs text-slate-500">Mode lihat saja</span>
              )
            }
          />
          <CardContent>
            {riwayat.length === 0 ? (
              <EmptyState title="Belum ada pemeriksaan" description="Tambahkan hasil pemeriksaan rutin ibu hamil." />
            ) : (
              <div className="space-y-3">
                {riwayat.map((p) => (
                  <div key={p.id} className="p-4 rounded-xl border border-slate-200">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-slate-800">
                          {p.tanggal_periksa} · {p.usia_kehamilan} minggu
                        </p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Diperiksa oleh {p.nama_pemeriksa || '-'}
                        </p>
                      </div>
                      <Badge
                        label={STATUS_BUMIL_LABEL[p.status]}
                        className={
                          p.status === 'normal'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                            : p.status === 'perlu_perhatian'
                              ? 'bg-amber-50 text-amber-700 border border-amber-100'
                              : 'bg-red-50 text-red-700 border border-red-100'
                        }
                      />
                    </div>

                    <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      {[
                        ['Berat badan', p.berat_badan ? `${p.berat_badan} kg` : '-'],
                        ['Tekanan darah', p.tekanan_darah || '-'],
                        ['LILA', p.lingkar_lengan_atas ? `${p.lingkar_lengan_atas} cm` : '-'],
                        ['Fundus', p.tinggi_funds ? `${p.tinggi_funds} cm` : '-'],
                      ].map(([label, value]) => (
                        <div key={label}>
                          <p className="text-slate-400">{label}</p>
                          <p className="font-semibold text-slate-800">{value}</p>
                        </div>
                      ))}
                    </div>

                    {p.keluhan && (
                      <p className="mt-3 text-sm text-slate-600">
                        <span className="text-slate-400">Keluhan: </span>
                        {p.keluhan}
                      </p>
                    )}
                    {p.catatan && <p className="mt-1 text-sm text-slate-600">{p.catatan}</p>}

                    {(canManage || isAdmin) && (
                      <div className="mt-3 flex gap-3">
                        {canManage && (
                          <button onClick={() => openEdit(p)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                            Ubah
                          </button>
                        )}
                        {isAdmin && (
                          <button onClick={() => setDeleting(p)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                            Hapus
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editing ? 'Ubah Hasil Pemeriksaan' : 'Tambah Hasil Pemeriksaan'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Tanggal Periksa" required error={errors.tanggal_periksa}>
                  <Input
                    type="date"
                    value={form.tanggal_periksa}
                    onChange={set('tanggal_periksa')}
                    hasError={!!errors.tanggal_periksa}
                    max={new Date().toISOString().slice(0, 10)}
                    required
                  />
                </Field>

                <Field label="Usia Kehamilan" required hint="Dalam minggu (0-42)" error={errors.usia_kehamilan}>
                  <Input
                    type="number"
                    min={0}
                    max={42}
                    value={form.usia_kehamilan}
                    onChange={set('usia_kehamilan')}
                    hasError={!!errors.usia_kehamilan}
                    required
                  />
                </Field>

                <Field label="Tekanan Darah" hint="Format 120/80" error={errors.tekanan_darah}>
                  <Input
                    value={form.tekanan_darah}
                    onChange={set('tekanan_darah')}
                    hasError={!!errors.tekanan_darah}
                    placeholder="120/80"
                    pattern="\d{2,3}/\d{2,3}"
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

                <Field label="Tinggi Badan" hint="cm (120-200 cm)" error={errors.tinggi_badan}>
                  <Input
                    type="number"
                    step="0.1"
                    min={120}
                    max={200}
                    value={form.tinggi_badan}
                    onChange={set('tinggi_badan')}
                    hasError={!!errors.tinggi_badan}
                  />
                </Field>

                <Field label="Lingkar Lengan Atas" hint="cm, normal 23-27 cm (15-50 cm)" error={errors.lingkar_lengan_atas}>
                  <Input
                    type="number"
                    step="0.1"
                    min={15}
                    max={50}
                    value={form.lingkar_lengan_atas}
                    onChange={set('lingkar_lengan_atas')}
                    hasError={!!errors.lingkar_lengan_atas}
                  />
                </Field>

                <Field label="Tinggi Fundus" hint="cm (10-45 cm)" error={errors.tinggi_funds}>
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

                <Field label="Denyut Jantung Janin" hint="per menit (80-200 bpm)" error={errors.denyut_jantung_janin}>
                  <Input
                    type="number"
                    min={80}
                    max={200}
                    value={form.denyut_jantung_janin}
                    onChange={set('denyut_jantung_janin')}
                    hasError={!!errors.denyut_jantung_janin}
                  />
                </Field>

                <Field label="Posisi Janin" error={errors.posisi_janin}>
                  <Select
                    value={form.posisi_janin}
                    onChange={set('posisi_janin')}
                    hasError={!!errors.posisi_janin}
                  >
                    <option value="">-- Pilih --</option>
                    {POSISI_JANIN.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Status" required error={errors.status}>
                  <Select
                    value={form.status}
                    onChange={set('status')}
                    hasError={!!errors.status}
                    required
                  >
                    {STATUS_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {STATUS_BUMIL_LABEL[s]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>

              <Field label="Keluhan" error={errors.keluhan}>
                <Textarea
                  rows={2}
                  value={form.keluhan}
                  onChange={set('keluhan')}
                  hasError={!!errors.keluhan}
                />
              </Field>

              <Field label="Catatan Kader" error={errors.catatan}>
                <Textarea
                  rows={2}
                  value={form.catatan}
                  onChange={set('catatan')}
                  hasError={!!errors.catatan}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  {editing ? 'Simpan Perubahan' : 'Simpan Pemeriksaan'}
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
        title="Hapus Hasil Pemeriksaan?"
        description="Riwayat pemeriksaan ini akan dihapus permanen."
      />
    </div>
  )
}