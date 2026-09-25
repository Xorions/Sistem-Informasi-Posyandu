import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { useToast } from "@/shared/components/ui/toast"

export default function Users(){
  const toast=useToast()
  const [data,setData]=useState<any[]>([])
  const [posyandus,setPosyandus]=useState<any[]>([])
  const [show,setShow]=useState(false)
  const [form,setForm]=useState({ name:'', email:'', password:'', role:'KADER', phone:'', posyandu_ids:[] as number[]})
  const fetch=async()=>{ try{ const r=await api.get('/users',{params:{per_page:50}}); setData(r.data.data?.data||r.data.data||[]) }catch{}}
  useEffect(()=>{ fetch(); api.get('/posyandu',{params:{per_page:100}}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{})},[])
  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{ await api.post('/users',{ ...form, posyandu_ids: form.posyandu_ids }); toast.show('Berhasil dibuat'); setShow(false); fetch()}catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const del=async(id:number)=>{ if(!confirm('Hapus user?'))return; await api.delete(`/users/${id}`); toast.show('Dihapus'); fetch()}
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Pengguna</h1><button onClick={()=>setShow(true)} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah Pengguna</button></div>
      <Card><CardContent className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">Email</th><th className="text-left px-4 py-3">Role</th><th className="text-left px-4 py-3">Posyandu</th><th className="text-right px-4 py-3">Aksi</th></tr></thead><tbody className="divide-y">{data.map((u:any)=><tr key={u.id}><td className="px-4 py-3 font-medium">{u.name}</td><td className="px-4 py-3">{u.email}</td><td className="px-4 py-3">{u.role}</td><td className="px-4 py-3">{u.posyandus?.map((p:any)=>p.nama_posyandu).join(', ')||'-'}</td><td className="px-4 py-3 text-right"><button onClick={()=>del(u.id)} className="px-2.5 py-1 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">Hapus</button></td></tr>)}</tbody></table></CardContent></Card>
      {show && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setShow(false)}/><div className="relative bg-white rounded-2xl w-full max-w-lg p-6"><h3 className="font-semibold">Tambah Pengguna</h3><form onSubmit={submit} className="space-y-3 mt-4">
        <input required value={form.name} onChange={e=>setForm({...form,name:e.target.value})} placeholder="Nama *" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input required type="email" value={form.email} onChange={e=>setForm({...form,email:e.target.value})} placeholder="Email *" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input required type="password" value={form.password} onChange={e=>setForm({...form,password:e.target.value})} placeholder="Password *" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <select value={form.role} onChange={e=>setForm({...form,role:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="SUPER_ADMIN">SUPER_ADMIN</option><option value="ADMIN_POSYANDU">ADMIN_POSYANDU</option><option value="KADER">KADER</option><option value="ORANG_TUA">ORANG_TUA</option></select>
        <input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})} placeholder="Telepon" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <div><p className="text-xs font-medium mb-1">Posyandu akses</p><div className="space-y-1 max-h-[120px] overflow-auto border rounded-xl p-2">{posyandus.map((p:any)=><label key={p.id} className="flex items-center gap-2 text-sm"><input type="checkbox" checked={form.posyandu_ids.includes(p.id)} onChange={e=>setForm({...form, posyandu_ids: e.target.checked ? [...form.posyandu_ids, p.id] : form.posyandu_ids.filter(id=>id!==p.id)})}/>{p.nama_posyandu}</label>)}</div></div>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
      </form></div></div>}
    </div>
  )
}
