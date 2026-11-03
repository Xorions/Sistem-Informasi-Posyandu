import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { api, apiErrorMessage, apiValidationErrors } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Button, Field, Input, Select, Textarea } from "@/shared/components/ui/field"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate, parseNumeric } from "@/shared/lib/utils"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'

export default function Examinations() {
  const toast = useToast()
  const [searchParams] = useSearchParams()
  const initialChildId = searchParams.get('child_id') || ''

  // Orang tua boleh melihat hasil pemeriksaan, tetapi tidak boleh mencatat.
  const { role } = useAuth()
  const canManage = can(role, 'manage-pemeriksaan')
  const [children, setChildren] = useState<any[]>([])
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    child_id: initialChildId,
    posyandu_id: '',
    examination_date: new Date().toISOString().substring(0,10),
    weight: '',
    height: '',
    length: '',
    head_circumference: '',
    arm_circumference: '',
    notes: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/examinations', { params: { per_page: 10 }}); setExams(r.data.data?.data||r.data.data||[]) } catch {}
    setLoading(false)
  }
  useEffect(()=>{
    api.get('/children', { params: { per_page: 100 }}).then(r=>{
      const list = r.data.data||[]
      setChildren(list)
      if (initialChildId) {
        const found = list.find((c: any) => String(c.id) === String(initialChildId))
        if (found?.posyandu_id) {
          setForm(f => ({ ...f, posyandu_id: String(found.posyandu_id) }))
        }
      }
    }).catch(()=>{})
    api.get('/posyandu', { params:{ per_page:100}}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{})
    load()
  },[initialChildId])

  const onChildChange = (cid: string) => {
    const found = children.find((c: any) => String(c.id) === cid)
    setForm(f => ({
      ...f,
      child_id: cid,
      posyandu_id: found?.posyandu_id ? String(found.posyandu_id) : f.posyandu_id,
    }))
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.child_id) {
      errs.child_id = 'Pilih anak terlebih dahulu.'
    }
    if (!form.posyandu_id) {
      errs.posyandu_id = 'Posyandu wajib dipilih.'
    }
    if (!form.examination_date) {
      errs.examination_date = 'Tanggal pemeriksaan wajib diisi.'
    } else {
      const todayStr = new Date().toISOString().substring(0, 10)
      if (form.examination_date > todayStr) {
        errs.examination_date = 'Tanggal pemeriksaan tidak boleh di masa depan.'
      }
    }

    if (!form.arm_circumference || form.arm_circumference.trim() === '') {
      errs.arm_circumference = 'Lingkar lengan atas (LiLA) wajib diisi (7 - 30 cm).'
    } else {
      const ac = Number(form.arm_circumference)
      if (isNaN(ac) || ac < 7 || ac > 30) {
        errs.arm_circumference = 'Lingkar lengan atas (LiLA) harus antara 7 - 30 cm.'
      }
    }

    if (form.weight && form.weight.trim() !== '') {
      const w = Number(form.weight)
      if (isNaN(w) || w < 1 || w > 40) {
        errs.weight = 'Berat badan harus antara 1 - 40 kg.'
      }
    }

    if (form.height && form.height.trim() !== '') {
      const h = Number(form.height)
      if (isNaN(h) || h < 30 || h > 150) {
        errs.height = 'Tinggi badan harus antara 30 - 150 cm.'
      }
    }

    if (form.length && form.length.trim() !== '') {
      const l = Number(form.length)
      if (isNaN(l) || l < 30 || l > 150) {
        errs.length = 'Panjang badan harus antara 30 - 150 cm.'
      }
    }

    if (form.head_circumference && form.head_circumference.trim() !== '') {
      const hc = Number(form.head_circumference)
      if (isNaN(hc) || hc < 25 || hc > 65) {
        errs.head_circumference = 'Lingkar kepala harus antara 25 - 65 cm.'
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.show('Mohon perbaiki data formulir yang belum sesuai.', 'error')
      return
    }

    setSaving(true)
    try {
      await api.post('/examinations', {
        child_id: parseInt(form.child_id),
        posyandu_id: parseInt(form.posyandu_id),
        examination_date: form.examination_date,
        weight: parseNumeric(form.weight),
        height: parseNumeric(form.height),
        length: parseNumeric(form.length),
        head_circumference: parseNumeric(form.head_circumference),
        arm_circumference: parseNumeric(form.arm_circumference)!,
        notes: form.notes.trim() || null,
      })
      toast.show('Pemeriksaan berhasil disimpan.')
      setForm(f => ({ ...f, weight:'', height:'', length:'', head_circumference:'', arm_circumference:'', notes:'' }))
      setErrors({})
      load()
    } catch (err: any) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      toast.show(apiErrorMessage(err, 'Gagal menyimpan pemeriksaan.'), 'error')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold">Pemeriksaan</h1>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {canManage && (
        <Card className="lg:col-span-1">
          <CardHeader title="Form Pemeriksaan" subtitle="Mobile-first • Simpan BB/TB/PB/LK/LiLA" />
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <Field label="Pilih Anak" required error={errors.child_id}>
                <Select
                  required
                  value={form.child_id}
                  onChange={e => {
                    onChildChange(e.target.value)
                    if (errors.child_id) setErrors(prev => ({ ...prev, child_id: '' }))
                  }}
                  hasError={!!errors.child_id}
                >
                  <option value="">-- Pilih Anak --</option>
                  {children.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_lengkap} - {c.posyandu?.nama_posyandu}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Posyandu" required error={errors.posyandu_id}>
                <Select
                  required
                  value={form.posyandu_id}
                  onChange={e => {
                    setForm({ ...form, posyandu_id: e.target.value })
                    if (errors.posyandu_id) setErrors(prev => ({ ...prev, posyandu_id: '' }))
                  }}
                  hasError={!!errors.posyandu_id}
                >
                  <option value="">-- Pilih Posyandu --</option>
                  {posyandus.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_posyandu}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Tanggal Pemeriksaan" required error={errors.examination_date}>
                <Input
                  required
                  type="date"
                  max={new Date().toISOString().substring(0, 10)}
                  value={form.examination_date}
                  onChange={e => {
                    setForm({ ...form, examination_date: e.target.value })
                    if (errors.examination_date) setErrors(prev => ({ ...prev, examination_date: '' }))
                  }}
                  hasError={!!errors.examination_date}
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Berat Badan (kg)" hint="1 - 40 kg" error={errors.weight}>
                  <div className="relative">
                    <Input
                      value={form.weight}
                      onChange={e => {
                        setForm({ ...form, weight: e.target.value })
                        if (errors.weight) setErrors(prev => ({ ...prev, weight: '' }))
                      }}
                      type="number"
                      step="0.01"
                      min={1}
                      max={40}
                      placeholder="10.2"
                      className="pr-12"
                      hasError={!!errors.weight}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">kg</span>
                  </div>
                </Field>

                <Field label="Tinggi Badan (cm)" hint="30 - 150 cm" error={errors.height}>
                  <div className="relative">
                    <Input
                      value={form.height}
                      onChange={e => {
                        setForm({ ...form, height: e.target.value })
                        if (errors.height) setErrors(prev => ({ ...prev, height: '' }))
                      }}
                      type="number"
                      step="0.1"
                      min={30}
                      max={150}
                      placeholder="80"
                      className="pr-12"
                      hasError={!!errors.height}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">cm</span>
                  </div>
                </Field>

                <Field label="Panjang Badan (cm)" hint="30 - 150 cm" error={errors.length}>
                  <div className="relative">
                    <Input
                      value={form.length}
                      onChange={e => {
                        setForm({ ...form, length: e.target.value })
                        if (errors.length) setErrors(prev => ({ ...prev, length: '' }))
                      }}
                      type="number"
                      step="0.1"
                      min={30}
                      max={150}
                      placeholder="75"
                      className="pr-12"
                      hasError={!!errors.length}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">cm</span>
                  </div>
                </Field>

                <Field label="Lingkar Kepala (cm)" hint="25 - 65 cm" error={errors.head_circumference}>
                  <div className="relative">
                    <Input
                      value={form.head_circumference}
                      onChange={e => {
                        setForm({ ...form, head_circumference: e.target.value })
                        if (errors.head_circumference) setErrors(prev => ({ ...prev, head_circumference: '' }))
                      }}
                      type="number"
                      step="0.1"
                      min={25}
                      max={65}
                      placeholder="47"
                      className="pr-12"
                      hasError={!!errors.head_circumference}
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">cm</span>
                  </div>
                </Field>
              </div>

              <Field
                label="Lingkar Lengan Atas (LiLA)"
                required
                hint="Wajib diisi (7 - 30 cm) • Disimpan ke growth_records.arm_circumference"
                error={errors.arm_circumference}
              >
                <div className="relative">
                  <Input
                    required
                    value={form.arm_circumference}
                    onChange={e => {
                      setForm({ ...form, arm_circumference: e.target.value })
                      if (errors.arm_circumference) setErrors(prev => ({ ...prev, arm_circumference: '' }))
                    }}
                    type="number"
                    step="0.1"
                    min={7}
                    max={30}
                    placeholder="15.2"
                    className="border-2 border-amber-200 focus:border-amber-400 bg-amber-50/50 pr-12"
                    hasError={!!errors.arm_circumference}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500 pointer-events-none">cm</span>
                </div>
              </Field>

              <Field label="Catatan" error={errors.notes}>
                <Textarea
                  value={form.notes}
                  onChange={e => {
                    setForm({ ...form, notes: e.target.value })
                    if (errors.notes) setErrors(prev => ({ ...prev, notes: '' }))
                  }}
                  rows={3}
                  placeholder="Catatan pemeriksaan..."
                  hasError={!!errors.notes}
                />
              </Field>

              <Button
                type="submit"
                loading={saving}
                className="w-full py-3"
              >
                Simpan Pemeriksaan
              </Button>
            </form>
          </CardContent>
        </Card>
        )}

        {!canManage && (
          <Card className="lg:col-span-1 h-fit">
            <CardHeader title="Mode lihat saja" />
            <CardContent>
              <p className="text-sm text-slate-600">
                Role Anda dapat melihat hasil pemeriksaan, namun tidak dapat mencatat pemeriksaan baru.
                Hubungi kader posyandu bila ada jadwal pemeriksaan.
              </p>
            </CardContent>
          </Card>
        )}

        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title="Riwayat Terbaru" />
            <CardContent>
              {loading ? <p className="text-sm text-slate-500">Memuat...</p> : exams.length===0 ? <p className="text-sm text-slate-500">Belum ada pemeriksaan.</p> : (
                <div className="space-y-3">
                  {exams.map((e:any)=>(
                    <div key={e.id} className="p-4 rounded-xl border flex justify-between gap-4">
                      <div>
                        <p className="font-medium text-sm">{e.child?.nama_lengkap} • {formatDate(e.examination_date)}</p>
                        <p className="text-xs text-slate-500">{e.posyandu?.nama_posyandu} • oleh {e.examiner?.name||'-'}</p>
                        <div className="flex flex-wrap gap-2 mt-2 text-xs">
                          <span className="px-2 py-1 rounded-full bg-slate-100">BB {e.growth_record?.weight ?? e.growthRecord?.weight ?? '-'} kg</span>
                          <span className="px-2 py-1 rounded-full bg-slate-100">TB {e.growth_record?.height ?? e.growthRecord?.height ?? '-'} cm</span>
                          <span className="px-2 py-1 rounded-full bg-slate-100">LK {e.growth_record?.head_circumference ?? e.growthRecord?.head_circumference ?? '-'} cm</span>
                          <span className="px-2 py-1 rounded-full bg-amber-100 border border-amber-200">LiLA {e.growth_record?.arm_circumference ?? e.growthRecord?.arm_circumference ?? '-'} cm</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
