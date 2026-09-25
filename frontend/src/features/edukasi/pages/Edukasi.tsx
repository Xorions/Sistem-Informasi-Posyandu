import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { StatusBadge } from "@/shared/components/ui/badge"
import { useToast } from "@/shared/components/ui/toast"
import { useAuth } from "@/features/auth/AuthContext"

export default function Edukasi() {
  const { user } = useAuth()
  const toast = useToast()
  const [data, setData]=useState<any[]>([])
  const [categories, setCategories]=useState<any[]>([])
  const [categoryFilter, setCategoryFilter]=useState('')
  const [search, setSearch]=useState('')
  const [showForm, setShowForm]=useState(false)
  const [form, setForm]=useState({ category_id:'', title:'', content:'', source:'', source_url:'', status:'draft'})
  const [editId, setEditId]=useState<number|null>(null)
  const canManage = user?.role==='SUPER_ADMIN' || user?.role==='ADMIN_POSYANDU'

  const fetch=async()=>{
    const params:any={}; if(categoryFilter) params.category_id=categoryFilter; if(search) params.search=search
    try{ const r=await api.get('/educations',{params}); setData(r.data.data)}catch{
      // fallback public
      try{ const r=await api.get('/edukasi',{params}); setData(r.data.data)}catch{}
    }
  }
  useEffect(()=>{ api.get('/education-categories').then(r=>setCategories(r.data.data||r.data||[])).catch(()=>api.get('/edukasi/categories').then(r=>setCategories(r.data.data||r.data||[])).catch(()=>{})); fetch()},[])
  useEffect(()=>{ fetch()},[categoryFilter])

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    try{
      const payload={ category_id: parseInt(form.category_id), title: form.title, content: form.content, source: form.source||null, source_url: form.source_url||null, status: form.status }
      if(editId){ await api.put(`/educations/${editId}`,payload); toast.show('Berhasil diperbarui')}
      else{ await api.post('/educations',payload); toast.show('Berhasil dibuat')}
      setShowForm(false); setEditId(null); fetch()
    }catch(err:any){ toast.show(err.response?.data?.message||'Gagal','error')}
  }
  const del=async(id:number)=>{ if(!confirm('Hapus konten?'))return; try{ await api.delete(`/educations/${id}`); toast.show('Berhasil dihapus'); fetch()}catch{ toast.show('Gagal','error')}}
  const togglePublish=async(item:any)=>{
    try{
      if(item.status==='published') await api.post(`/educations/${item.id}/unpublish`)
      else await api.post(`/educations/${item.id}/publish`)
      toast.show('Status diperbarui'); fetch()
    }catch{ toast.show('Gagal','error')}
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center"><div><h1 className="text-2xl font-bold">Edukasi</h1><p className="text-sm text-slate-500">Kelola konten edukasi • Publish/Unpublish</p></div>{canManage && <button onClick={()=>{setShowForm(true);setEditId(null);setForm({category_id:'',title:'',content:'',source:'',source_url:'',status:'draft'})}} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white">+ Tambah Edukasi</button>}</div>
      <Card><CardContent className="flex flex-wrap gap-3">
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari judul..." className="flex-1 min-w-[200px] px-3 py-2.5 rounded-xl border border-slate-200"/>
        <select value={categoryFilter} onChange={e=>setCategoryFilter(e.target.value)} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Semua Kategori</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <button onClick={()=>fetch()} className="px-4 py-2.5 rounded-xl border border-slate-200">Cari</button>
      </CardContent></Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {data.map((e:any)=><Card key={e.id}><CardContent><p className="text-xs text-teal-600 font-semibold">{e.category?.name}</p><h3 className="font-semibold mt-1 line-clamp-2">{e.title}</h3><div className="flex gap-2 mt-2 items-center"><StatusBadge status={e.status}/><span className="text-xs text-slate-500">{e.author?.name}</span></div><div className="text-xs text-slate-600 mt-3 line-clamp-3 prose" dangerouslySetInnerHTML={{__html:e.content?.substring(0,150)}}/><div className="flex gap-1 mt-3"><a href={`/edukasi-view/${e.slug}`} target="_blank" className="px-2.5 py-1 text-xs rounded-lg border">Lihat</a>{canManage && <><button onClick={()=>{setEditId(e.id);setForm({category_id:String(e.category_id),title:e.title,content:e.content,source:e.source||'',source_url:e.source_url||'',status:e.status});setShowForm(true)}} className="px-2.5 py-1 text-xs rounded-lg border">Edit</button><button onClick={()=>togglePublish(e)} className="px-2.5 py-1 text-xs rounded-lg bg-white border">{e.status==='published'?'Unpublish':'Publish'}</button><button onClick={()=>del(e.id)} className="px-2.5 py-1 text-xs rounded-lg bg-red-50 border border-red-200 text-red-700">Hapus</button></>}</div></CardContent></Card>)}
      </div>
      {data.length===0 && <Card><CardContent className="text-center py-10 text-slate-500">Belum ada konten edukasi.</CardContent></Card>}

      {showForm && <div className="fixed inset-0 z-50 flex items-center justify-center p-4"><div className="absolute inset-0 bg-black/40" onClick={()=>setShowForm(false)}/><div className="relative bg-white rounded-2xl w-full max-w-2xl p-6 max-h-[90vh] overflow-auto"><h3 className="font-semibold">{editId?'Edit':'Tambah'} Edukasi</h3><form onSubmit={submit} className="space-y-3 mt-4">
        <select required value={form.category_id} onChange={e=>setForm({...form,category_id:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Pilih Kategori</option>{categories.map((c:any)=><option key={c.id} value={c.id}>{c.name}</option>)}</select>
        <input required value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Judul *" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <textarea required value={form.content} onChange={e=>setForm({...form,content:e.target.value})} placeholder="Konten (HTML) *" rows={8} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 font-mono text-sm"/>
        <p className="text-[11px] text-slate-500">Gunakan tag HTML: h2, p, ul, li, strong, em, a</p>
        <input value={form.source} onChange={e=>setForm({...form,source:e.target.value})} placeholder="Sumber (Kementerian Kesehatan RI)" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <input value={form.source_url} onChange={e=>setForm({...form,source_url:e.target.value})} placeholder="Source URL (https://...)" className="w-full px-3 py-2.5 rounded-xl border border-slate-200"/>
        <select value={form.status} onChange={e=>setForm({...form,status:e.target.value})} className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="draft">draft</option><option value="published">published</option><option value="archived">archived</option></select>
        <div className="flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="px-4 py-2 rounded-xl border">Batal</button><button className="px-6 py-2 rounded-xl bg-teal-600 text-white">Simpan</button></div>
      </form></div></div>}
    </div>
  )
}
