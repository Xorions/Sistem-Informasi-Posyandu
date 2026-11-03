import { useEffect, useState } from 'react'
import { api, apiErrorMessage, apiValidationErrors } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button, Field, Input, Select, Textarea } from "@/shared/components/ui/field"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate } from "@/shared/lib/utils"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'

export default function FollowUps() {
  const toast = useToast()
  // Orang tua hanya boleh melihat, tidak boleh menambah atau mengubah status.
  const { role } = useAuth()
  const canManage = can(role, 'manage-followup')
  const [data, setData] = useState<any[]>([])
  const [children, setChildren] = useState<any[]>([])
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    child_id: '',
    posyandu_id: '',
    type: '',
    status: 'pending',
    follow_up_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const fetch = async () => {
    try {
      const r = await api.get('/follow-ups', { params: { per_page: 50 } })
      setData(r.data.data?.data || r.data.data || [])
    } catch {}
  }

  useEffect(() => {
    fetch()
    api.get('/children', { params: { per_page: 100 } }).then((r) => setChildren(r.data.data || [])).catch(() => {})
    api.get('/posyandu', { params: { per_page: 100 } }).then((r) => setPosyandus(r.data.data?.data || r.data.data || [])).catch(() => {})
  }, [])

  const openModal = () => {
    setForm({
      child_id: '',
      posyandu_id: '',
      type: '',
      status: 'pending',
      follow_up_date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setFormError(null)
    setErrors({})
    setShow(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.child_id) errs.child_id = 'Anak wajib dipilih.'
    if (!form.posyandu_id) errs.posyandu_id = 'Posyandu wajib dipilih.'
    if (!form.type.trim()) errs.type = 'Tipe tindak lanjut wajib diisi.'
    if (!form.follow_up_date) errs.follow_up_date = 'Tanggal tindak lanjut wajib diisi.'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon lengkapi formulir.')
      return
    }

    setSaving(true)
    try {
      await api.post('/follow-ups', {
        child_id: parseInt(form.child_id, 10),
        posyandu_id: parseInt(form.posyandu_id, 10),
        type: form.type.trim(),
        status: form.status,
        follow_up_date: form.follow_up_date,
        notes: form.notes ? form.notes.trim() : null,
      })
      toast.show('Berhasil disimpan')
      setShow(false)
      fetch()
    } catch (err: any) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/follow-ups/${id}`, { status })
      toast.show('Status diperbarui')
      fetch()
    } catch {
      toast.show('Gagal memperbarui status', 'error')
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Tindak Lanjut</h1>
        {canManage && (
          <Button onClick={openModal}>+ Tambah Tindak Lanjut</Button>
        )}
      </div>

      <Card>
        <CardContent className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Anak</th>
                <th className="text-left px-4 py-3">Tipe</th>
                <th className="text-left px-4 py-3">Tanggal</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-right px-4 py-3">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((f: any) => (
                <tr key={f.id}>
                  <td className="px-4 py-3 font-medium text-slate-800">{f.child?.nama_lengkap || `#${f.child_id}`}</td>
                  <td className="px-4 py-3 text-slate-600">{f.type}</td>
                  <td className="px-4 py-3 text-slate-600">{formatDate(f.follow_up_date)}</td>
                  <td className="px-4 py-3">
                    <Badge label={f.status} />
                  </td>
                  <td className="px-4 py-3 text-right">
                    {canManage ? (
                      <select
                        value={f.status}
                        onChange={(e) => updateStatus(f.id, e.target.value)}
                        className="px-2 py-1 text-xs rounded-lg border border-slate-200 bg-white"
                      >
                        <option value="pending">pending</option>
                        <option value="in_progress">in_progress</option>
                        <option value="completed">completed</option>
                        <option value="cancelled">cancelled</option>
                      </select>
                    ) : (
                      <span className="text-xs text-slate-400">baca saja</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>

      {canManage && show && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShow(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-md p-6 max-h-[90vh] overflow-y-auto">
            <h3 className="font-semibold text-lg text-slate-800">Tambah Tindak Lanjut</h3>
            <form onSubmit={submit} className="space-y-4 mt-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <Field label="Anak" required error={errors.child_id}>
                <Select
                  required
                  hasError={!!errors.child_id}
                  value={form.child_id}
                  onChange={(e) => {
                    setForm({ ...form, child_id: e.target.value })
                    if (errors.child_id) setErrors({ ...errors, child_id: '' })
                  }}
                >
                  <option value="">Pilih Anak</option>
                  {children.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_lengkap}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Posyandu" required error={errors.posyandu_id}>
                <Select
                  required
                  hasError={!!errors.posyandu_id}
                  value={form.posyandu_id}
                  onChange={(e) => {
                    setForm({ ...form, posyandu_id: e.target.value })
                    if (errors.posyandu_id) setErrors({ ...errors, posyandu_id: '' })
                  }}
                >
                  <option value="">Pilih Posyandu</option>
                  {posyandus.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_posyandu}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Tipe Tindak Lanjut" required hint="Contoh: Konsultasi Gizi, Rujukan RS" error={errors.type}>
                <Input
                  required
                  hasError={!!errors.type}
                  placeholder="Tipe tindak lanjut"
                  value={form.type}
                  onChange={(e) => {
                    setForm({ ...form, type: e.target.value })
                    if (errors.type) setErrors({ ...errors, type: '' })
                  }}
                />
              </Field>

              <Field label="Tanggal Tindak Lanjut" required error={errors.follow_up_date}>
                <Input
                  required
                  type="date"
                  hasError={!!errors.follow_up_date}
                  value={form.follow_up_date}
                  onChange={(e) => {
                    setForm({ ...form, follow_up_date: e.target.value })
                    if (errors.follow_up_date) setErrors({ ...errors, follow_up_date: '' })
                  }}
                />
              </Field>

              <Field label="Status" error={errors.status}>
                <Select
                  hasError={!!errors.status}
                  value={form.status}
                  onChange={(e) => {
                    setForm({ ...form, status: e.target.value })
                    if (errors.status) setErrors({ ...errors, status: '' })
                  }}
                >
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </Select>
              </Field>

              <Field label="Catatan" error={errors.notes}>
                <Textarea
                  hasError={!!errors.notes}
                  value={form.notes}
                  onChange={(e) => {
                    setForm({ ...form, notes: e.target.value })
                    if (errors.notes) setErrors({ ...errors, notes: '' })
                  }}
                  placeholder="Catatan tindak lanjut..."
                  rows={2}
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShow(false)}>
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
