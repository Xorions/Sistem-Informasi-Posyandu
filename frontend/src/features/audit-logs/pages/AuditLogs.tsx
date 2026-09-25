import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { formatDate } from "@/shared/lib/utils"

export default function AuditLogs(){
  const [data,setData]=useState<any[]>([])
  const [meta,setMeta]=useState<any>(null)
  const [page,setPage]=useState(1)
  const fetch=async()=>{ try{ const r=await api.get('/audit-logs',{params:{page, per_page:20}}); setData(r.data.data?.data||r.data.data||[]); setMeta(r.data.meta||null)}catch{}}
  useEffect(()=>{ fetch()},[page])
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Audit Log</h1>
      <Card><CardContent className="overflow-x-auto">
        <table className="w-full text-xs"><thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="text-left px-4 py-3">Waktu</th><th className="text-left px-4 py-3">User</th><th className="text-left px-4 py-3">Aksi</th><th className="text-left px-4 py-3">Modul</th><th className="text-left px-4 py-3">Record</th><th className="text-left px-4 py-3">IP</th></tr></thead><tbody className="divide-y">{data.map((a:any)=><tr key={a.id}><td className="px-4 py-2">{formatDate(a.created_at)}</td><td className="px-4 py-2">{a.user?.name||a.user_id}</td><td className="px-4 py-2"><span className="px-2 py-1 rounded-full bg-slate-100">{a.action}</span></td><td className="px-4 py-2">{a.module}</td><td className="px-4 py-2">{a.record_id}</td><td className="px-4 py-2">{a.ip_address||'-'}</td></tr>)}</tbody></table>
      </CardContent>
      {meta && <div className="flex justify-between px-6 py-4 border-t text-xs text-slate-500"><span>Hal {meta.current_page}/{meta.last_page}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 border rounded-lg disabled:opacity-50">Prev</button><button disabled={page>=meta.last_page} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 border rounded-lg disabled:opacity-50">Next</button></div></div>}
      </Card>
    </div>
  )
}
