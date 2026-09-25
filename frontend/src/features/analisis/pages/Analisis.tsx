import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { Badge } from "@/shared/components/ui/badge"
import { Link } from 'react-router-dom'
import { formatDate } from "@/shared/lib/utils"

export default function Analisis() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 500)
  const [children, setChildren] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [analysis, setAnalysis] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [showHistory, setShowHistory] = useState(false)

  const fetchChildren = async () => {
    try {
      const r = await api.get('/children', { params: { search: debounced || undefined, per_page: 20 } })
      setChildren(r.data.data)
      if (r.data.data.length && !selected) setSelected(r.data.data[0])
    } catch {}
  }
  useEffect(()=>{ fetchChildren() }, [debounced])

  const loadAnalysis = async (childId:number) => {
    setLoading(true)
    try {
      const r = await api.get(`/children/${childId}/analysis`)
      // API returns {analysis, recommendations}
      const data = r.data.data
      setAnalysis(data.analysis || data)
      setRecommendations(data.recommendations || [])
      setHistory([])
      setShowHistory(false)
    } catch (e:any) {
      setAnalysis({ overall_status: 'Belum ada data', summary: e.response?.data?.message || 'Belum ada data pemeriksaan untuk analisis.' })
      setRecommendations([])
    } finally { setLoading(false) }
  }

  const loadHistory = async () => {
    if(!selected) return
    try {
      const r = await api.get(`/children/${selected.id}/analysis/history`)
      setHistory(r.data.data || r.data || [])
      setShowHistory(true)
    } catch {}
  }

  useEffect(()=>{ if(selected) loadAnalysis(selected.id) }, [selected])

  const statusColor = (label:string) => {
    if(label?.includes('Sesuai')) return 'bg-emerald-50 border-emerald-200 text-emerald-800'
    if(label?.includes('Perlu Perhatian')) return 'bg-amber-50 border-amber-200 text-amber-800'
    if(label?.includes('Lebih Lanjut')) return 'bg-orange-50 border-orange-200 text-orange-800'
    if(label?.includes('Konsultasi')) return 'bg-red-50 border-red-200 text-red-800'
    return 'bg-slate-50 border-slate-200'
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Analisis Pertumbuhan</h1>
        <p className="text-sm text-slate-500">Output <code>GrowthAnalysisService</code> + <code>NutritionRecommendationService</code> – murni pemantauan/skrining, <b>bukan diagnosis</b></p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari anak..." className="flex-1 min-w-[220px] px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none" />
          <select value={selected?.id||''} onChange={e=>{
            const c = children.find(x=> String(x.id)===e.target.value)
            if(c) setSelected(c)
          }} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white min-w-[220px]">
            <option value="">Pilih Anak</option>
            {children.map((c:any)=><option key={c.id} value={c.id}>{c.nama_lengkap} – {c.posyandu?.nama_posyandu}</option>)}
          </select>
        </CardContent>
      </Card>

      {!selected ? (
        <Card><CardContent className="text-center py-10 text-slate-500">Pilih anak untuk lihat analisis.</CardContent></Card>
      ) : loading ? (
        <Card><CardContent className="text-center py-10">Memuat analisis...</CardContent></Card>
      ) : !analysis ? (
        <Card><CardContent className="text-center py-10 text-slate-500">Belum ada data.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center font-bold text-teal-700">{selected.nama_lengkap.charAt(0)}</div>
                <div>
                  <p className="font-semibold">{selected.nama_lengkap} <span className="text-xs text-slate-500">• {analysis.age_months ?? '-'} bulan • {analysis.gender==='L'?'Laki-laki':'Perempuan'}</span></p>
                  <p className="text-xs text-slate-500">{selected.posyandu?.nama_posyandu} • <Link to={`/children/${selected.id}`} className="text-teal-600 hover:underline">Detail Anak →</Link></p>
                </div>
              </div>
              <button onClick={loadHistory} className="px-4 py-2 rounded-xl border border-slate-200 text-sm bg-white hover:bg-slate-50">Lihat Riwayat Analisis</button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <div className={`p-4 rounded-xl border ${statusColor(analysis.overall_status)}`}>
                <p className="font-bold flex items-center gap-2"><Badge label={analysis.overall_status} /> <span className="ml-2">{analysis.overall_status}</span></p>
                <p className="text-sm mt-2">{analysis.summary}</p>
                {analysis.analyzed_at && <p className="text-xs text-slate-500 mt-2">Dianalisis: {formatDate(analysis.analyzed_at)} • Sumber: {analysis.indicators?.weight?.source || 'Konfigurasi sistem'}</p>}
              </div>
            </CardContent>
          </Card>

          {analysis.indicators && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {Object.entries(analysis.indicators).map(([key, val]:any)=>(
                <Card key={key}>
                  <CardHeader title={key==='weight'?'Berat Badan':key==='height'?'Tinggi/Panjang':key==='head_circumference'?'Lingkar Kepala':key==='arm_circumference'?'LiLA (Lingkar Lengan Atas)':key} />
                  <CardContent className="space-y-2">
                    <p className="text-2xl font-bold">{val.value ?? '-'} <span className="text-sm font-normal text-slate-500">{key==='weight'?'kg':'cm'}</span></p>
                    <Badge label={val.label || val.status || '-'} />
                    <p className="text-xs text-slate-600">{val.message}</p>
                    {val.deviation_percent !== undefined && <p className="text-xs text-slate-400">Deviasi: {val.deviation_percent}% dari referensi {val.reference}</p>}
                    {val.plausible_min !== undefined && <p className="text-xs text-slate-400">Rentang pemantauan: {val.plausible_min} – {val.plausible_max}</p>}
                    {val.source && <p className="text-[11px] text-slate-400">Sumber: {val.source}</p>}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          <Card>
            <CardHeader title="Rekomendasi Edukasi (rule-based)" subtitle="Dari NutritionRecommendationService – bersifat edukasi & tindak lanjut" />
            <CardContent>
              {recommendations.length===0 ? <p className="text-sm text-slate-500">Belum ada rekomendasi.</p> : (
                <div className="space-y-3">
                  {recommendations.map((rec:any, i:number)=>(
                    <div key={i} className={`p-3 rounded-xl border ${rec.priority==='urgent'?'bg-red-50 border-red-200':rec.priority==='high'?'bg-amber-50 border-amber-200':'bg-slate-50 border-slate-200'}`}>
                      <p className="font-semibold text-sm">{rec.title} <span className="text-xs font-normal text-slate-500">({rec.priority})</span></p>
                      <p className="text-sm text-slate-700 mt-1">{rec.content}</p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {showHistory && (
            <Card>
              <CardHeader title="Riwayat Analisis per Pemeriksaan" />
              <CardContent>
                {history.length===0 ? <p className="text-sm text-slate-500">Belum ada riwayat.</p> : (
                  <div className="space-y-3">
                    {history.map((h:any, idx:number)=>(
                      <div key={idx} className="p-3 rounded-xl border flex justify-between gap-3">
                        <div>
                          <p className="text-xs text-slate-500">Pemeriksaan #{h.examination_id} • {h.age_months} bln</p>
                          <p className="font-medium text-sm mt-1">{h.overall_status}</p>
                          <p className="text-xs text-slate-600">{h.summary}</p>
                        </div>
                        <Badge label={h.overall_status} />
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
