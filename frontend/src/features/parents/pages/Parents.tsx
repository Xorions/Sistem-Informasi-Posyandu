import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { ConfirmDeleteModal } from "@/shared/components/ui/modal"
import { useToast } from "@/shared/components/ui/toast"
import { useDebounce } from "@/shared/hooks/useDebounce"

export default function Parents() {
  const toast = useToast()
  const [data, setData] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search,500)
  const [page,setPage]=useState(1)
  const [showForm, setShowForm]=useState(false)
  const [form, setForm]=useState({ nik:'', nama_lengkap:'', tempat_lahir:'', tanggal_lahir:'', jenis_kelamin:'L', alamat:'', nomor_telepon:'', pekerjaan:''})
  const [editId, setEditId]=useState<number|null>(null)
  const [deleteId, setDeleteId]=useState<number|null>(null)

  const fetch = async()=>{
    try{ const r=await api.get('/parents',{params:{search:debounced||undefined, page}}); setData(r.data.data); setMeta(r.data.meta)}catch{ toast.show('Gagal memuat','error')}
  }
  useEffect(()=>{ fetch()},[debounced, page])

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{
      if(editId){ await api.put(`/parents/${editId}`,form); toast.show('Data berhasil diperbarui.')}
      else{ await api.post('/parents',form); toast.show('Data berhasil ditambahkan.')}
      setShowForm(false); setEditId(null); setForm({nik:'',nama_lengkap:'',tempat_lahir:'',tanggal_lahir:'',jenis_kelamin:'L',alamat:'',nomor_telepon:'',pekerjaan:''}); fetch()
    }catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const handleDelete=async()=>{
    if(!deleteId) return
    try{ await api.delete(`/parents/${deleteId}`); toast.show('Data berhasil dihapus'); setDeleteId(null); fetch()}catch{ toast.show('Gagal hapus','error')}
  }
  const startEdit=(p:any)=>{
    setEditId(p.id); setForm({nik:p.nik||'',nama_lengkap:p.nama_lengkap,tempat_lahir:p.tempat_lahir||'',tanggal_lahir:p.tanggal_lahir?.substring(0,10)||'',jenis_kelamin:p.jenis_kelamin||'L', alamat:p.alamat||'', nomor_telepon:p.nomor_telepon||'', pekerjaan:p.pekerjaan||''}); setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><h1 className="text-2xl font-bold">Orang Tua / Wali</h1><button onClick={()=>{setShowForm(true);setEditId(null)}} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah</button></div>
      <Card><CardContent className="flex gap-3"><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Cari nama, NIK..." className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200"/><button onClick={()=>fetch()} className="px-4 py-2.5 rounded-xl border border-slate-200">Cari</button></CardContent></Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm"><thead className="bg-slate-50 text-xs uppercase text-slate-500"><tr><th className="text-left px-4 py-3">Nama</th><th className="text-left px-4 py-3">NIK</th><th className="text-left px-4 py-3">Telepon</th><th className="text-left px-4 py-3">Alamat</th><th className="text-right px-4 py-3">Aksi</th></tr></thead>
          <tbody className="divide-y">{data.map((p:any)=><tr key={p.id}><td className="px-4 py-3 font-medium">{p.nama_lengkap}</td><td className="px-4 py-3">{p.nik||'-'}</td><td className="px-4 py-3">{p.nomor_telepon||'-'}</td><td className="px-4 py-3">{p.alamat||'-'}</td><td className="px-4 py-3 text-right flex justify-end gap-1"><button onClick={()=>startEdit(p)} className="px-2.5 py-1.5 rounded-lg border text-xs">Edit</button><button onClick={()=>setDeleteId(p.id)} className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">Hapus</button></td></tr>)}</tbody></table>
        </div>
        {meta && <div className="flex justify-between px-6 py-4 border-t text-xs text-slate-500"><span>Total {meta.total}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded-lg border disabled:opacity-50">Prev</button><button disabled={page>=meta.last_page} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-lg border disabled:opacity-50">Next</button></div></div>}
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <h3 className="font-semibold">{editId?'Edit':'Tambah'} Orang Tua</h3>
            <form onSubmit={submit} className="space-y-3 mt-4">
              <input required value={form.nama_lengkap} onChange={e=>setForm({...form,nama_lengkap:e.target.value})} placeholder="Nama Lengkap *" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.nik} onChange={e=>setForm({...form, nik:e.target.value})} placeholder="NIK" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
                <select value={form.jenis_kelamin} onChange={e=>setForm({...form, jenis_kelamin:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input value={form.tempat_lahir} onChange={e=>setForm({...form, tempat_lahir:e.target.value})} placeholder="Tempat Lahir" className="px-3 py-2.5 rounded-xl border border-slate-200"/>
                <input type="date" value={form.tanggal_lahir} onChange={e=>setForm({...form, tanggal_lahir:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200"/>
              </div>
              <input value={form.nomor_telepon} onChange={e=>setForm({...form, nomor_telepon:e.target.value})} placeholder="No Telepon" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
              <input value={form.pekerjaan} onChange={e=>setForm({...form, pekerjaan:e.target.value})} placeholder="Pekerjaan" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
              <textarea value={form.alamat} onChange={e=>setForm({...form, alamat:e.target.value})} placeholder="Alamat" rows={2} className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
              <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
            </form>
          </div>
        </div>
      )}
      <ConfirmDeleteModal open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete} title="Hapus Orang Tua?" description="Data akan di-soft delete." />
    </div>
  )
}
