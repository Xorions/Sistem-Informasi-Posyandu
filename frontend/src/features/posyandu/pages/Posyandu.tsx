import { useEffect, useState } from 'react'
import { api, apiErrorMessage, apiValidationErrors } from "@/shared/lib/api"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { Card, CardContent } from "@/shared/components/ui/card"
import { StatusBadge } from "@/shared/components/ui/badge"
import { Button, Field, Input, Select, Textarea } from "@/shared/components/ui/field"
import { useToast } from "@/shared/components/ui/toast"
import { isValidPhone } from '@/shared/lib/utils'

export default function PosyanduPage() {
  const { role } = useAuth()
  const toast = useToast()
  const canManage = can(role, 'manage-posyandu')
  const [data, setData] = useState<any[]>([])
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    kode_posyandu: '',
    nama_posyandu: '',
    alamat: '',
    desa_kelurahan: '',
    kecamatan: '',
    kabupaten_kota: '',
    provinsi: '',
    nama_ketua: '',
    nomor_telepon: '',
    status: 'active',
  })
  const [editId, setEditId] = useState<number | null>(null)

  const fetch = async () => {
    try {
      const r = await api.get('/posyandu', { params: { per_page: 100 } })
      setData(r.data.data?.data || r.data.data || [])
    } catch {}
  }

  useEffect(() => {
    fetch()
  }, [])

  const openAdd = () => {
    setEditId(null)
    setForm({
      kode_posyandu: '',
      nama_posyandu: '',
      alamat: '',
      desa_kelurahan: '',
      kecamatan: '',
      kabupaten_kota: '',
      provinsi: '',
      nama_ketua: '',
      nomor_telepon: '',
      status: 'active',
    })
    setFormError(null)
    setErrors({})
    setShowForm(true)
  }

  const openEdit = (p: any) => {
    setEditId(p.id)
    setForm({
      kode_posyandu: p.kode_posyandu || '',
      nama_posyandu: p.nama_posyandu || '',
      alamat: p.alamat || '',
      desa_kelurahan: p.desa_kelurahan || '',
      kecamatan: p.kecamatan || '',
      kabupaten_kota: p.kabupaten_kota || '',
      provinsi: p.provinsi || '',
      nama_ketua: p.nama_ketua || '',
      nomor_telepon: p.nomor_telepon || '',
      status: p.status || 'active',
    })
    setFormError(null)
    setErrors({})
    setShowForm(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.kode_posyandu.trim()) errs.kode_posyandu = 'Kode posyandu wajib diisi.'
    if (!form.nama_posyandu.trim()) errs.nama_posyandu = 'Nama posyandu wajib diisi.'
    if (!form.alamat.trim()) errs.alamat = 'Alamat wajib diisi.'
    if (form.nomor_telepon.trim() && !isValidPhone(form.nomor_telepon.trim())) {
      errs.nomor_telepon = 'Format nomor telepon tidak valid (contoh: 081234567890).'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon periksa data formulir.')
      return
    }

    setSaving(true)
    const payload = {
      kode_posyandu: form.kode_posyandu.trim(),
      nama_posyandu: form.nama_posyandu.trim(),
      alamat: form.alamat.trim(),
      desa_kelurahan: form.desa_kelurahan.trim() || null,
      kecamatan: form.kecamatan.trim() || null,
      kabupaten_kota: form.kabupaten_kota.trim() || null,
      provinsi: form.provinsi.trim() || null,
      nama_ketua: form.nama_ketua.trim() || null,
      nomor_telepon: form.nomor_telepon.trim() || null,
      status: form.status,
    }

    try {
      if (editId) {
        await api.put(`/posyandu/${editId}`, payload)
        toast.show('Data berhasil diperbarui.')
      } else {
        await api.post('/posyandu', payload)
        toast.show('Data berhasil ditambahkan.')
      }
      setShowForm(false)
      setEditId(null)
      fetch()
    } catch (err: any) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const del = async (id: number) => {
    if (!confirm('Hapus Posyandu?')) return
    try {
      await api.delete(`/posyandu/${id}`)
      toast.show('Berhasil dihapus')
      fetch()
    } catch {
      toast.show('Gagal menghapus posyandu', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Posyandu</h1>
        {canManage && (
          <Button onClick={openAdd}>+ Tambah Posyandu</Button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((p: any) => (
          <Card key={p.id}>
            <CardContent>
              <p className="font-semibold">{p.nama_posyandu}</p>
              <p className="text-xs text-slate-500">
                {p.kode_posyandu} • {p.alamat}
              </p>
              <p className="text-xs text-slate-500 mt-1">
                {p.desa_kelurahan}, {p.kecamatan} • {p.nama_ketua}
              </p>
              <div className="flex gap-2 mt-3 items-center justify-between">
                <StatusBadge status={p.status} />
                {canManage && (
                  <div className="flex gap-1">
                    <Button size="sm" variant="secondary" onClick={() => openEdit(p)}>
                      Edit
                    </Button>
                    <Button size="sm" variant="danger" onClick={() => del(p.id)}>
                      Hapus
                    </Button>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {data.length === 0 && (
        <Card>
          <CardContent className="text-center py-10 text-slate-500">Belum ada data posyandu.</CardContent>
        </Card>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-bold text-lg text-slate-800">{editId ? 'Edit' : 'Tambah'} Posyandu</h3>
            <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {formError && (
                <div className="md:col-span-2">
                  <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>
                </div>
              )}

              <Field label="Kode Posyandu" required error={errors.kode_posyandu}>
                <Input
                  required
                  hasError={!!errors.kode_posyandu}
                  value={form.kode_posyandu}
                  onChange={(e) => {
                    setForm({ ...form, kode_posyandu: e.target.value })
                    if (errors.kode_posyandu) setErrors({ ...errors, kode_posyandu: '' })
                  }}
                  placeholder="Contoh: POS-01"
                />
              </Field>

              <Field label="Nama Posyandu" required error={errors.nama_posyandu}>
                <Input
                  required
                  hasError={!!errors.nama_posyandu}
                  value={form.nama_posyandu}
                  onChange={(e) => {
                    setForm({ ...form, nama_posyandu: e.target.value })
                    if (errors.nama_posyandu) setErrors({ ...errors, nama_posyandu: '' })
                  }}
                  placeholder="Nama posyandu"
                />
              </Field>

              <Field label="Nama Ketua" error={errors.nama_ketua}>
                <Input
                  hasError={!!errors.nama_ketua}
                  value={form.nama_ketua}
                  onChange={(e) => {
                    setForm({ ...form, nama_ketua: e.target.value })
                    if (errors.nama_ketua) setErrors({ ...errors, nama_ketua: '' })
                  }}
                  placeholder="Nama ketua"
                />
              </Field>

              <Field label="Nomor Telepon" error={errors.nomor_telepon}>
                <Input
                  type="tel"
                  inputMode="tel"
                  hasError={!!errors.nomor_telepon}
                  value={form.nomor_telepon}
                  onChange={(e) => {
                    setForm({ ...form, nomor_telepon: e.target.value })
                    if (errors.nomor_telepon) setErrors({ ...errors, nomor_telepon: '' })
                  }}
                  placeholder="081234567890"
                />
              </Field>

              <Field label="Desa / Kelurahan" error={errors.desa_kelurahan}>
                <Input
                  hasError={!!errors.desa_kelurahan}
                  value={form.desa_kelurahan}
                  onChange={(e) => {
                    setForm({ ...form, desa_kelurahan: e.target.value })
                    if (errors.desa_kelurahan) setErrors({ ...errors, desa_kelurahan: '' })
                  }}
                  placeholder="Desa / Kelurahan"
                />
              </Field>

              <Field label="Kecamatan" error={errors.kecamatan}>
                <Input
                  hasError={!!errors.kecamatan}
                  value={form.kecamatan}
                  onChange={(e) => {
                    setForm({ ...form, kecamatan: e.target.value })
                    if (errors.kecamatan) setErrors({ ...errors, kecamatan: '' })
                  }}
                  placeholder="Kecamatan"
                />
              </Field>

              <Field label="Kabupaten / Kota" error={errors.kabupaten_kota}>
                <Input
                  hasError={!!errors.kabupaten_kota}
                  value={form.kabupaten_kota}
                  onChange={(e) => {
                    setForm({ ...form, kabupaten_kota: e.target.value })
                    if (errors.kabupaten_kota) setErrors({ ...errors, kabupaten_kota: '' })
                  }}
                  placeholder="Kabupaten / Kota"
                />
              </Field>

              <Field label="Provinsi" error={errors.provinsi}>
                <Input
                  hasError={!!errors.provinsi}
                  value={form.provinsi}
                  onChange={(e) => {
                    setForm({ ...form, provinsi: e.target.value })
                    if (errors.provinsi) setErrors({ ...errors, provinsi: '' })
                  }}
                  placeholder="Provinsi"
                />
              </Field>

              <div className="md:col-span-2">
                <Field label="Alamat Lengkap" required error={errors.alamat}>
                  <Textarea
                    required
                    hasError={!!errors.alamat}
                    value={form.alamat}
                    onChange={(e) => {
                      setForm({ ...form, alamat: e.target.value })
                      if (errors.alamat) setErrors({ ...errors, alamat: '' })
                    }}
                    placeholder="Alamat jalan / RT / RW"
                    rows={2}
                  />
                </Field>
              </div>

              <div className="md:col-span-2">
                <Field label="Status" error={errors.status}>
                  <Select
                    hasError={!!errors.status}
                    value={form.status}
                    onChange={(e) => {
                      setForm({ ...form, status: e.target.value })
                      if (errors.status) setErrors({ ...errors, status: '' })
                    }}
                  >
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                  </Select>
                </Field>
              </div>

              <div className="md:col-span-2 flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
