import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate } from "@/shared/lib/utils"

export default function Immunizations(){
  const toast=useToast()
  const [data,setData]=useState<any[]>([])
  const [children,setChildren]=useState<any[]>([])
  const [form,setForm]=useState({ child_id:'', vaccine_name:'', vaccination_date:'', status:'sudah', notes:''})
  const [show,setShow]=useState(false)
  const fetch=async()=>{ try{ const r=await api.get('/immunizations',{params:{per_page:50}}); setData(r.data.data?.data||r.data.data||[]) }catch{}}
  useEffect(()=>{ fetch(); api.get('/children',{params:{per_page:100}}).then(r=>setChildren(r.data.data||[])).catch(()=>{}) },[])
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.post('/immunizations',{ child_id:parseInt(form.child_id), vaccine_name:form.vaccine_name, vaccination_date:form.vaccination_date, status:form.status, notes:form.notes}); toast.show('Berhasil disimpan'); setShow(false); fetch()}catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const del=async(id:number)=>{ if(!confirm('Hapus?'))return; await api.delete(`/immunizations/${id}`); toast.show('Dihapus'); fetch()}
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Imunisasi</h1><button onClick={()=>setShow(true)} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah Imunisasi</button></div>
      <Card><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">Anak</th><th className="text-left px-4 py-3">Vaksin</th><th className="text-left px-4 py-3">Tanggal</th><th className="text-left px-4 py-3">Status</th><th className="text-right px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y">{data.map((i:any)=><tr key={i.id}><td className="px-4 py-3">{i.child?.nama_lengkap||i.child_id}</td><td className="px-4 py-3 font-medium">{i.vaccine_name}</td><td className="px-4 py-3">{formatDate(i.vaccination_date)}</td><td className="px-4 py-3"><Badge label={i.status}/></td><td className="px-4 py-3 text-right"><button onClick={()=>del(i.id)} className="px-2.5 py-1 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">Hapus</button></td></tr>)}</tbody></table></CardContent></Card>
      {data.length===0 && <Card><CardContent className="text-center py-8 text-slate-500">Belum ada data imunisasi.</CardContent></Card>}
      {show && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setShow(false)}/><div className="relative bg-white rounded-2xl w-full max-w-md p-6"><h3 className="font-semibold">Tambah Imunisasi</h3><form onSubmit={submit} className="space-y-3 mt-4">
        <select required value={form.child_id} onChange={e=>setForm({...form, child_id:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Pilih Anak</option>{children.map((c:any)=><option key={c.id} value={c.id}>{c.nama_lengkap}</option>)}</select>
        <input required value={form.vaccine_name} onChange={e=>setForm({...form, vaccine_name:e.target.value})} placeholder="Nama Vaksin (BCG, Polio, DPT...)" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input required type="date" value={form.vaccination_date} onChange={e=>setForm({...form, vaccination_date:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="sudah">sudah</option><option value="belum">belum</option><option value="terjadwal">terjadwal</option></select>
        <textarea value={form.notes} onChange={e=>setForm({...form, notes:e.target.value})} placeholder="Catatan" rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
      </form></div></div>}
    </div>
  )
}
