import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate } from "@/shared/lib/utils"

export default function FollowUps(){
  const toast=useToast()
  const [data,setData]=useState<any[]>([])
  const [children,setChildren]=useState<any[]>([])
  const [posyandus,setPosyandus]=useState<any[]>([])
  const [show,setShow]=useState(false)
  const [form,setForm]=useState({ child_id:'', posyandu_id:'', type:'', status:'pending', follow_up_date:'', notes:''})
  const fetch=async()=>{ try{ const r=await api.get('/follow-ups',{params:{per_page:50}}); setData(r.data.data?.data||r.data.data||[]) }catch{}}
  useEffect(()=>{ fetch(); api.get('/children',{params:{per_page:100}}).then(r=>setChildren(r.data.data||[])).catch(()=>{}); api.get('/posyandu',{params:{per_page:100}}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{}) },[])
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.post('/follow-ups',{ child_id:parseInt(form.child_id), posyandu_id:parseInt(form.posyandu_id), type:form.type, status:form.status, follow_up_date:form.follow_up_date, notes:form.notes }); toast.show('Berhasil disimpan'); setShow(false); fetch()}catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const updateStatus=async(id:number, status:string)=>{ try{ await api.put(`/follow-ups/${id}`,{status}); toast.show('Status diperbarui'); fetch()}catch{ toast.show('Gagal','error')}}
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Tindak Lanjut</h1><button onClick={()=>setShow(true)} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah</button></div>
      <Card><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">Anak</th><th className="text-left px-4 py-3">Tipe</th><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y">{data.map((f:any)=><tr key={f.id}><td className="px-4 py-3">{f.child?.nama_lengkap||f.child_id}</td><td className="px-4 py-3">{f.type}</td><td className="px-4 py-3">{formatDate(f.follow_up_date)}</td><td className="px-4 py-3"><Badge label={f.status}/></td><td className="px-4 py-3 text-right flex justify-end gap-1"><select value={f.status} onChange={e=>updateStatus(f.id,e.target.value)} className="px-2 py-1 text-xs rounded-lg border bg-white"><option value="pending">pending</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select></td></tr>)}</tbody></table></CardContent></Card>
      {show && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setShow(false)}/><div className="relative bg-white rounded-2xl w-full max-w-md p-6"><h3 className="font-semibold">Tambah Tindak Lanjut</h3><form onSubmit={submit} className="space-y-3 mt-4">
        <select required value={form.child_id} onChange={e=>setForm({...form, child_id:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Pilih Anak</option>{children.map((c:any)=><option key={c.id} value={c.id}>{c.nama_lengkap}</option>)}</select>
        <select required value={form.posyandu_id} onChange={e=>setForm({...form, posyandu_id:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Pilih Posyandu</option>{posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu}</option>)}</select>
        <input required value={form.type} onChange={e=>setForm({...form, type:e.target.value})} placeholder="Tipe (Konsultasi, Rujukan...)" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input required type="date" value={form.follow_up_date} onChange={e=>setForm({...form, follow_up_date:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="pending">pending</option><option value="in_progress">in_progress</option><option value="completed">completed</option><option value="cancelled">cancelled</option></select>
        <textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} placeholder="Catatan" rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
      </form></div></div>}
    </div>
  )
}
