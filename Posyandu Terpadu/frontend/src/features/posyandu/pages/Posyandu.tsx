import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { StatusBadge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/toast"

export default function PosyanduPage() {
  const toast = useToast()
  const [data, setData]=useState<any[]>([])
  const [showForm, setShowForm]=useState(false)
  const [form, setForm]=useState({ kode_posyandu:'', nama_posyandu:'', alamat:'', desa_kelurahan:'', kecamatan:'', kabupaten_kota:'', provinsi:'', nama_ketua:'', nomor_telepon:'', status:'active'})
  const [editId, setEditId]=useState<number|null>(null)

  const fetch=async()=>{ try{ const r=await api.get('/posyandu',{params:{per_page:100}}); setData(r.data.data?.data||r.data.data||[]) }catch{}}
  useEffect(()=>{ fetch()},[])

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{
      if(editId){ await api.put(`/posyandu/${editId}`,form); toast.show('Data berhasil diperbarui.')}
      else{ await api.post('/posyandu',form); toast.show('Data berhasil ditambahkan.')}
      setShowForm(false); setEditId(null); fetch()
    }catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const del=async(id:number)=>{ if(!confirm('Hapus Posyandu?')) return; try{ await api.delete(`/posyandu/${id}`); toast.show('Berhasil dihapus'); fetch()}catch{ toast.show('Gagal','error')}}

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Posyandu</h1><button onClick={()=>{setShowForm(true);setEditId(null);setForm({kode_posyandu:'',nama_posyandu:'',alamat:'',desa_kelurahan:'',kecamatan:'',kabupaten_kota:'',provinsi:'',nama_ketua:'',nomor_telepon:'',status:'active'})}} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah Posyandu</button></div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((p:any)=><Card key={p.id}><CardContent><p className="font-semibold">{p.nama_posyandu}</p><p className="text-xs text-slate-500">{p.kode_posyandu} • {p.alamat}</p><p className="text-xs text-slate-500 mt-1">{p.desa_kelurahan}, {p.kecamatan} • {p.nama_ketua}</p><div className="flex gap-2 mt-3 items-center justify-between"><StatusBadge status={p.status}/><div className="flex gap-1"><button onClick={()=>{setEditId(p.id);setForm(p);setShowForm(true)}} className="px-2.5 py-1 text-xs rounded-lg border">Edit</button><button onClick={()=>del(p.id)} className="px-2.5 py-1 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">Hapus</button></div></div></CardContent></Card>)}
      </div>
      {data.length===0 && <Card><CardContent className="text-center py-10 text-slate-500">Belum ada data posyandu.</CardContent></Card>}

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setShowForm(false)}/><div className="relative bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto"><h3 className="font-semibold">{editId?'Edit':'Tambah'} Posyandu</h3><form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
        <input required value={form.kode_posyandu} onChange={e=>setForm({...form,kode_posyandu:e.target.value})} placeholder="Kode Posyandu *" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input required value={form.nama_posyandu} onChange={e=>setForm({...form,nama_posyandu:e.target.value})} placeholder="Nama Posyandu *" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.nama_ketua} onChange={e=>setForm({...form,nama_ketua:e.target.value})} placeholder="Nama Ketua" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.nomor_telepon} onChange={e=>setForm({...form,nomor_telepon:e.target.value})} placeholder="No Telepon" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.desa_kelurahan} onChange={e=>setForm({...form,desa_kelurahan:e.target.value})} placeholder="Desa/Kelurahan" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.kecamatan} onChange={e=>setForm({...form,kecamatan:e.target.value})} placeholder="Kecamatan" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.kabupaten_kota} onChange={e=>setForm({...form,kabupaten_kota:e.target.value})} placeholder="Kabupaten/Kota" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.provinsi} onChange={e=>setForm({...form,provinsi:e.target.value})} placeholder="Provinsi" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
        <textarea value={form.alamat} onChange={e=>setForm({...form,alamat:e.target.value})} placeholder="Alamat" rows={2} className="md:col-span-2 px-3 py-2.5 rounded-xl border border-slate-200"/>
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="active">active</option><option value="inactive">inactive</option></select>
        <div className="md:col-span-2 flex justify-end gap-2 mt-2"><button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
      </form></div></div>}
    </div>
  )
}
