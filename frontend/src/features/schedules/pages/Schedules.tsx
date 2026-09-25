import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate } from "@/shared/lib/utils"

export default function Schedules(){
  const toast=useToast()
  const [data,setData]=useState<any[]>([])
  const [posyandus,setPosyandus]=useState<any[]>([])
  const [show,setShow]=useState(false)
  const [form,setForm]=useState({ posyandu_id:'', title:'', date:'', start_time:'', end_time:'', location:'', description:'', status:'active'})
  const fetch=async()=>{ try{ const r=await api.get('/schedules',{params:{per_page:100}}); setData(r.data.data?.data||r.data.data||[]) }catch{}}
  useEffect(()=>{ fetch(); api.get('/posyandu',{params:{per_page:100}}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{}) },[])
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.post('/schedules',{ posyandu_id:parseInt(form.posyandu_id), title:form.title, date:form.date, start_time:form.start_time, end_time:form.end_time, location:form.location, description:form.description, status:form.status }); toast.show('Berhasil disimpan'); setShow(false); fetch()}catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const del=async(id:number)=>{ if(!confirm('Hapus jadwal?'))return; await api.delete(`/schedules/${id}`); toast.show('Dihapus'); fetch()}
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Jadwal Posyandu</h1><button onClick={()=>setShow(true)} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah Jadwal</button></div>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((s:any)=><Card key={s.id}><CardContent><p className="font-semibold">{s.title}</p><p className="text-xs text-slate-500">{s.posyandu?.nama_posyandu} • {formatDate(s.date)} {s.start_time||''}-{s.end_time||''}</p><p className="text-xs text-slate-600 mt-1">{s.location||'-'}</p><p className="text-xs text-slate-500 mt-1">{s.description||''}</p><div className="flex justify-end mt-3"><button onClick={()=>del(s.id)} className="px-2.5 py-1 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">Hapus</button></div></CardContent></Card>)}
      </div>
      {data.length===0 && <Card><CardContent className="text-center py-10 text-slate-500">Belum ada jadwal.</CardContent></Card>}
      {show && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setShow(false)}/><div className="relative bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto"><h3 className="font-semibold">Tambah Jadwal</h3><form onSubmit={submit} className="space-y-3 mt-4">
        <select required value={form.posyandu_id} onChange={e=>setForm({...form,posyandu_id:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Pilih Posyandu</option>{posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu}</option>)}</select>
        <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Judul *" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input required type="date" value={form.date} onChange={e=>setForm({...form,date:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <div className="grid grid-cols-2 gap-3"><input type="time" value={form.start_time} onChange={e=>setForm({...form,start_time:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200"/><input type="time" value={form.end_time} onChange={e=>setForm({...form,end_time:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200"/></div>
        <input value={form.location} onChange={e=>setForm({...form,location:e.target.value})} placeholder="Lokasi" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <textarea value={form.description} onChange={e=>setForm({...form,description:e.target.value})} placeholder="Deskripsi" rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
      </form></div></div>}
    </div>
  )
}
