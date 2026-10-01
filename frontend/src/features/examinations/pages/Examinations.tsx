import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate } from "@/shared/lib/utils"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'

export default function Examinations() {
  const toast = useToast()
  // Orang tua boleh melihat hasil pemeriksaan, tetapi tidak boleh mencatat.
  const { role } = useAuth()
  const canManage = can(role, 'manage-pemeriksaan')
  const [children, setChildren] = useState<any[]>([])
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    child_id: '',
    posyandu_id: '',
    examination_date: new Date().toISOString().substring(0,10),
    weight: '',
    height: '',
    length: '',
    head_circumference: '',
    arm_circumference: '',
    notes: '',
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const r = await api.get('/examinations', { params: { per_page: 10 }}); setExams(r.data.data?.data||r.data.data||[]) } catch {}
    setLoading(false)
  }
  useEffect(()=>{
    api.get('/children', { params: { per_page: 100 }}).then(r=>setChildren(r.data.data||[])).catch(()=>{})
    api.get('/posyandu', { params:{ per_page:100}}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{})
    load()
  },[])

  const submit = async (e:React.FormEvent) => {
    e.preventDefault()
    if (!form.child_id || !form.posyandu_id || !form.examination_date) { toast.show('Lengkapi anak, posyandu, tanggal','error'); return }
    setSaving(true)
    try {
      await api.post('/examinations', {
        child_id: parseInt(form.child_id),
        posyandu_id: parseInt(form.posyandu_id),
        examination_date: form.examination_date,
        weight: form.weight ? parseFloat(form.weight) : null,
        height: form.height ? parseFloat(form.height) : null,
        length: form.length ? parseFloat(form.length) : null,
        head_circumference: form.head_circumference ? parseFloat(form.head_circumference) : null,
        arm_circumference: form.arm_circumference ? parseFloat(form.arm_circumference) : null,
        notes: form.notes || null,
      })
      toast.show('Pemeriksaan berhasil disimpan')
      setForm({...form, weight:'',height:'',length:'',head_circumference:'',arm_circumference:'',notes:''})
      load()
    } catch (err:any){ toast.show(err.response?.data?.message || 'Gagal menyimpan','error') }
    finally { setSaving(false) }
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
              <div>
                <label className="text-sm font-medium">Pilih Anak *</label>
                <select required value={form.child_id} onChange={e=>setForm({...form, child_id:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                  <option value="">-- Pilih Anak --</option>
                  {children.map((c:any)=><option key={c.id} value={c.id}>{c.nama_lengkap} - {c.posyandu?.nama_posyandu}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Posyandu *</label>
                <select required value={form.posyandu_id} onChange={e=>setForm({...form, posyandu_id:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                  <option value="">-- Pilih Posyandu --</option>
                  {posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu}</option>)}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium">Tanggal Pemeriksaan *</label>
                <input required type="date" value={form.examination_date} onChange={e=>setForm({...form, examination_date:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium">Berat Badan</label>
                  <div className="relative mt-1"><input value={form.weight} onChange={e=>setForm({...form, weight:e.target.value})} type="number" step="0.1" placeholder="10.2" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">kg</span></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Tinggi Badan</label>
                  <div className="relative mt-1"><input value={form.height} onChange={e=>setForm({...form, height:e.target.value})} type="number" step="0.1" placeholder="80" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">cm</span></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Panjang Badan</label>
                  <div className="relative mt-1"><input value={form.length} onChange={e=>setForm({...form, length:e.target.value})} type="number" step="0.1" placeholder="75" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">cm</span></div>
                </div>
                <div>
                  <label className="text-sm font-medium">Lingkar Kepala</label>
                  <div className="relative mt-1"><input value={form.head_circumference} onChange={e=>setForm({...form, head_circumference:e.target.value})} type="number" step="0.1" placeholder="47" className="w-full px-3 py-2.5 rounded-xl border border-slate-200 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">cm</span></div>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium">Lingkar Lengan Atas (LiLA) *</label>
                <div className="relative mt-1"><input value={form.arm_circumference} onChange={e=>setForm({...form, arm_circumference:e.target.value})} type="number" step="0.1" placeholder="15.2" className="w-full px-3 py-2.5 rounded-xl border-2 border-amber-200 focus:border-amber-400 bg-amber-50/50 pr-12" /><span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-500">cm</span></div>
                <p className="text-[11px] text-amber-700 mt-1">Wajib tersedia • Disimpan ke growth_records.arm_circumference</p>
              </div>
              <div>
                <label className="text-sm font-medium">Catatan</label>
                <textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} rows={3} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" placeholder="Catatan pemeriksaan..." />
              </div>
              <button disabled={saving} className="w-full py-3 rounded-xl bg-teal-600 text-white font-semibold hover:bg-teal-700 disabled:opacity-50 flex justify-center items-center gap-2">
                {saving && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
                Simpan Pemeriksaan
              </button>
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
