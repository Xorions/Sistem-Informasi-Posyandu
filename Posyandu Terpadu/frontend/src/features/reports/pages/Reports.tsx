import { useState } from 'react'
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { api } from "@/shared/lib/api"
import { useToast } from "@/shared/components/ui/toast"

export default function Reports(){
  const toast=useToast()
  const [filters, setFilters]=useState({ posyandu_id:'', from:'', to:'', jenis_kelamin:'', status:''})
  const [active, setActive]=useState('anak')
  const [data, setData]=useState<any>(null)
  const [loading, setLoading]=useState(false)

  const load=async(exportType?:string)=>{
    setLoading(true)
    try{
      const params:any={...filters}
      if(!params.posyandu_id) delete params.posyandu_id
      if(!params.from) delete params.from
      if(!params.to) delete params.to
      if(!params.jenis_kelamin) delete params.jenis_kelamin
      if(!params.status) delete params.status
      if(exportType) params.export=exportType
      const map:Record<string,string>={ anak:'anak', pemeriksaan:'pemeriksaan', pertumbuhan:'pertumbuhan', imunisasi:'imunisasi', 'follow-up':'follow-up', statistik:'statistik'}
      const endpoint = map[active]||'anak'
      if(exportType){
        const res=await api.get(`/reports/${endpoint}`,{ params, responseType:'blob'})
        const blob=new Blob([res.data])
        const url=window.URL.createObjectURL(blob)
        const a=document.createElement('a'); a.href=url; a.download=`laporan-${endpoint}.${exportType==='excel'?'xlsx':exportType}`; a.click(); window.URL.revokeObjectURL(url)
        toast.show('Export berhasil')
      } else {
        const res=await api.get(`/reports/${endpoint}`,{params})
        setData(res.data.data)
      }
    }catch(err:any){ toast.show(err.response?.data?.message||'Gagal memuat laporan','error')}
    finally{setLoading(false)}
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Laporan</h1>
      <Card><CardContent className="flex flex-wrap gap-2">
        {['anak','pemeriksaan','pertumbuhan','imunisasi','follow-up','statistik'].map(t=><button key={t} onClick={()=>{setActive(t); setData(null)}} className={`px-4 py-2 rounded-xl text-sm font-medium border ${active===t?'bg-teal-600 text-white border-teal-600':'bg-white text-slate-700 border-slate-200'}`}>{t}</button>)}
      </CardContent></Card>
      <Card>
        <CardHeader title="Filter" />
        <CardContent className="grid grid-cols-1 md:grid-cols-5 gap-3">
          <input type="date" value={filters.from} onChange={e=>setFilters({...filters, from:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200" placeholder="Tanggal mulai"/>
          <input type="date" value={filters.to} onChange={e=>setFilters({...filters, to:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200" placeholder="Tanggal akhir"/>
          <select value={filters.jenis_kelamin} onChange={e=>setFilters({...filters, jenis_kelamin:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Semua JK</option><option value="L">Laki-laki</option><option value="P">Perempuan</option></select>
          <select value={filters.status} onChange={e=>setFilters({...filters, status:e.target.value})} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white"><option value="">Semua Status</option><option value="active">active</option><option value="inactive">inactive</option></select>
          <button onClick={()=>load()} disabled={loading} className="px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm disabled:opacity-50">{loading?'Memuat...':'Tampilkan'}</button>
        </CardContent>
      </Card>

      {data && (
        <Card>
          <CardHeader title={`Hasil Laporan: ${active}`} action={
            <div className="flex gap-2">
              <button onClick={()=>load('csv')} className="px-3 py-1.5 rounded-lg border text-xs">CSV</button>
              <button onClick={()=>load('excel')} className="px-3 py-1.5 rounded-lg border text-xs">Excel</button>
              <button onClick={()=>load('pdf')} className="px-3 py-1.5 rounded-lg border text-xs">PDF</button>
            </div>
          } />
          <CardContent>
            <pre className="text-xs bg-slate-50 p-4 rounded-xl overflow-auto max-h-[400px]">{JSON.stringify(data, null, 2).substring(0, 5000)}</pre>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
