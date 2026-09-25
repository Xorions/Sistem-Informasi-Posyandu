import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { Link } from 'react-router-dom'
import { formatDate } from "@/shared/lib/utils"

export default function Pertumbuhan() {
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 500)
  const [children, setChildren] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [chart, setChart] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [metric, setMetric] = useState<'weight'|'height'|'head_circumference'|'arm_circumference'>('weight')
  const [loadingChart, setLoadingChart] = useState(false)

  const fetchChildren = async () => {
    try {
      const r = await api.get('/children', { params: { search: debounced || undefined, per_page: 20 } })
      setChildren(r.data.data)
      if (r.data.data.length && !selected) {
        setSelected(r.data.data[0])
      }
    } catch {}
  }
  useEffect(() => { fetchChildren() }, [debounced])

  const loadChart = async (childId: number) => {
    setLoadingChart(true)
    try {
      const r = await api.get(`/children/${childId}/growth-chart`)
      setChart(r.data.data || [])
      const r2 = await api.get(`/children/${childId}/examinations`, { params: { per_page: 20 } })
      setExams(r2.data.data || [])
    } catch {} finally { setLoadingChart(false) }
  }
  useEffect(() => { if (selected) loadChart(selected.id) }, [selected])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Pertumbuhan</h1>
        <p className="text-sm text-slate-500">Grafik BB/TB/PB/LK/LiLA per anak – data dari <code>growth_records</code></p>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3">
          <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Cari anak (nama/NIK)..." className="flex-1 min-w-[220px] px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select value={selected?.id||''} onChange={e=>{
            const c = children.find(x=> String(x.id)===e.target.value)
            if(c) setSelected(c)
          }} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white min-w-[200px]">
            <option value="">Pilih Anak</option>
            {children.map((c:any)=><option key={c.id} value={c.id}>{c.nama_lengkap} – {c.posyandu?.nama_posyandu}</option>)}
          </select>
        </CardContent>
      </Card>

      {!selected ? (
        <Card><CardContent className="text-center py-10 text-slate-500">Pilih anak untuk melihat pertumbuhan.</CardContent></Card>
      ) : (
        <>
          <Card>
            <CardContent className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex gap-3 items-center">
                <div className="w-12 h-12 rounded-xl bg-teal-100 flex items-center justify-center font-bold text-teal-700">{selected.nama_lengkap.charAt(0)}</div>
                <div>
                  <p className="font-semibold">{selected.nama_lengkap}</p>
                  <p className="text-xs text-slate-500">{selected.jenis_kelamin==='L'?'Laki-laki':'Perempuan'} • {selected.posyandu?.nama_posyandu} • <Link to={`/children/${selected.id}`} className="text-teal-600 hover:underline">Lihat Detail →</Link></p>
                </div>
              </div>
              <select value={metric} onChange={e=>setMetric(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
                <option value="weight">Berat Badan (kg)</option>
                <option value="height">Tinggi/Panjang (cm)</option>
                <option value="head_circumference">Lingkar Kepala (cm)</option>
                <option value="arm_circumference">LiLA (cm)</option>
              </select>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2">
              <CardHeader title={`Grafik ${metric==='weight'?'Berat Badan':metric==='height'?'Tinggi/Panjang':metric==='head_circumference'?'Lingkar Kepala':'LiLA'}`} subtitle={loadingChart?'Memuat...':`${chart.length} titik pemeriksaan`} />
              <CardContent>
                {loadingChart ? <p className="text-sm text-slate-500">Memuat grafik...</p> : chart.length===0 ? <p className="text-sm text-slate-500">Belum ada data pemeriksaan untuk anak ini.</p> : (
                  <div className="h-[300px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{fontSize:11}} />
                        <YAxis tick={{fontSize:11}} />
                        <Tooltip />
                        <Line type="monotone" dataKey={metric} stroke="#0d9488" strokeWidth={2} dot />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader title="Riwayat Singkat" />
              <CardContent>
                {exams.length===0 ? <p className="text-sm text-slate-500">Belum ada riwayat.</p> : (
                  <div className="space-y-3 max-h-[300px] overflow-auto pr-1">
                    {exams.map((e:any)=>(
                      <div key={e.id} className="p-3 rounded-xl border bg-slate-50/50">
                        <p className="text-xs font-semibold">{formatDate(e.examination_date)}</p>
                        <div className="grid grid-cols-2 gap-1 mt-1 text-xs">
                          <span>BB: <b>{e.growth_record?.weight ?? e.growthRecord?.weight ?? '-'} kg</b></span>
                          <span>TB: <b>{e.growth_record?.height ?? e.growthRecord?.height ?? e.growth_record?.length ?? '-'} cm</b></span>
                          <span>LK: <b>{e.growth_record?.head_circumference ?? '-'} cm</b></span>
                          <span className="bg-amber-100 border border-amber-200 rounded px-1">LiLA: <b>{e.growth_record?.arm_circumference ?? '-'} cm</b></span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader title="Tabel Pertumbuhan (growth_records)" />
            <CardContent className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead className="bg-slate-50 text-slate-500 uppercase"><tr><th className="text-left px-3 py-2">Tanggal</th><th className="text-left px-3 py-2">BB kg</th><th className="text-left px-3 py-2">TB/PB cm</th><th className="text-left px-3 py-2">LK cm</th><th className="text-left px-3 py-2">LiLA cm</th></tr></thead>
                <tbody className="divide-y">
                  {chart.map((c:any, i:number)=><tr key={i}><td className="px-3 py-2">{c.date}</td><td className="px-3 py-2">{c.weight ?? '-'}</td><td className="px-3 py-2">{c.height ?? c.length ?? '-'}</td><td className="px-3 py-2">{c.head_circumference ?? '-'}</td><td className="px-3 py-2 font-semibold text-amber-700">{c.arm_circumference ?? '-'}</td></tr>)}
                </tbody>
              </table>
              {chart.length===0 && <p className="text-center py-6 text-sm text-slate-500">Belum ada data.</p>}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
