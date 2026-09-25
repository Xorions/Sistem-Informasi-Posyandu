import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Link } from 'react-router-dom'

export default function EdukasiPublic(){
  const [data,setData]=useState<any[]>([])
  useEffect(()=>{ api.get('/edukasi').then(r=>setData(r.data.data)).catch(()=>{})},[])
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
          <Link to="/" className="flex items-center gap-2"><div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">P</div><span className="font-bold">Posyandu Digital</span></Link>
          <Link to="/login" className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">Login</Link>
        </div>
      </header>
      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <h1 className="text-2xl font-bold">Edukasi Publik</h1>
        <div className="grid md:grid-cols-2 gap-4">
          {data.map((e:any)=><Card key={e.id}><CardContent><p className="text-xs text-teal-600 font-semibold">{e.category?.name}</p><h3 className="font-semibold mt-1">{e.title}</h3><div className="prose prose-sm mt-2 text-slate-600 line-clamp-4" dangerouslySetInnerHTML={{__html:e.content}}/><Link to={`/edukasi/${e.slug}`} className="inline-block mt-3 text-sm text-teal-600 hover:underline">Baca selengkapnya →</Link>{e.source && <p className="text-xs text-slate-400 mt-2">Sumber: {e.source}</p>}</CardContent></Card>)}
        </div>
        {data.length===0 && <Card><CardContent className="text-center py-10 text-slate-500">Belum ada konten publik.</CardContent></Card>}
      </main>
    </div>
  )
}

export function EdukasiPublicDetail(){
  const slug = window.location.pathname.split('/').pop()
  const [item,setItem]=useState<any>(null)
  useEffect(()=>{ if(slug) api.get(`/edukasi/${slug}`).then(r=>setItem(r.data.data)).catch(()=>{}) },[slug])
  if(!item) return <div className="p-10 text-center">Memuat...</div>
  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b"><div className="max-w-3xl mx-auto px-4 py-4"><Link to="/edukasi-public" className="text-sm text-teal-600">← Kembali</Link></div></header>
      <article className="max-w-3xl mx-auto px-4 py-8 bg-white mt-6 rounded-2xl border">
        <p className="text-xs text-teal-600 font-semibold">{item.category?.name}</p>
        <h1 className="text-2xl font-bold mt-1">{item.title}</h1>
        <p className="text-xs text-slate-500 mt-1">Oleh {item.author?.name} • {new Date(item.published_at).toLocaleDateString('id-ID')}</p>
        <div className="prose prose-slate max-w-none mt-6" dangerouslySetInnerHTML={{__html: item.content}} />
        {item.source && <p className="text-xs text-slate-500 mt-6 border-t pt-3">Sumber: {item.source} {item.source_url && <a href={item.source_url} className="text-teal-600 underline">{item.source_url}</a>}</p>}
      </article>
    </div>
  )
}
