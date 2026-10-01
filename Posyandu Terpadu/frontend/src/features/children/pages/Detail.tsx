import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { formatDate, ageFromDob } from "@/shared/lib/utils"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useToast } from "@/shared/components/ui/toast"

export default function ChildDetail() {
  const { id } = useParams()
  const toast = useToast()
  const [child, setChild] = useState<any>(null)
  const [tab, setTab] = useState('profil')
  const [exams, setExams] = useState<any[]>([])
  const [chart, setChart] = useState<any[]>([])
  const [chartMetric, setChartMetric] = useState<'weight'|'height'|'head_circumference'|'arm_circumference'>('weight')
  const [analysis, setAnalysis] = useState<any>(null)
  const [immunizations, setImmunizations] = useState<any[]>([])
  const [followups, setFollowups] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])

  const load = async () => {
    try {
      const res = await api.get(`/children/${id}`)
      setChild(res.data.data)
      setParents(res.data.data.parents||[])
    } catch (e:any){ toast.show('Gagal memuat data anak','error') }
    try { const r = await api.get(`/children/${id}/examinations`); setExams(r.data.data) } catch{}
    try { const r = await api.get(`/children/${id}/growth-chart`); setChart(r.data.data) } catch{}
    try { const r = await api.get(`/children/${id}/analysis`); setAnalysis(r.data.data || r.data) } catch{}
    try { const r = await api.get(`/children/${id}/immunizations`); setImmunizations(r.data.data?.data || r.data.data || []) } catch{}
    try { const r = await api.get('/follow-ups', { params: { child_id: id, per_page: 100 }}); setFollowups(r.data.data?.data || r.data.data || []) } catch{}
  }
  useEffect(()=>{ load() },[id])

  if (!child) return <div className="py-10 text-center">Memuat...</div>

  const tabs = [
    { id:'profil', label:'Profil' },
    { id:'orangtua', label:'Orang Tua' },
    { id:'pemeriksaan', label:'Pemeriksaan' },
    { id:'pertumbuhan', label:'Pertumbuhan' },
    { id:'analisis', label:'Analisis' },
    { id:'imunisasi', label:'Imunisasi' },
    { id:'tindak', label:'Tindak Lanjut' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Link to="/children" className="hover:text-teal-600">Anak</Link><span>/</span><span className="text-slate-800 font-medium">{child.nama_lengkap}</span></div>

      <Card>
        <CardContent className="flex flex-wrap gap-6 items-start">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">{child.nama_lengkap.charAt(0)}</div>
          <div className="flex-1 min-w-[220px]">
            <h1 className="text-xl font-bold text-slate-900">{child.nama_lengkap} <span className="text-sm font-normal text-slate-500">({child.nama_panggilan||'-'})</span></h1>
            <p className="text-sm text-slate-600 mt-1">{child.tempat_lahir}, {formatDate(child.tanggal_lahir)} • {ageFromDob(child.tanggal_lahir)} • {child.jenis_kelamin==='L'?'Laki-laki':'Perempuan'}</p>
            <p className="text-sm text-slate-500">{child.posyandu?.nama_posyandu} • {child.alamat}</p>
          </div>
          <div className="flex gap-2">
            <Link to={`/children/${id}/edit`} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">Edit</Link>
            <Link to={`/examinations?child_id=${id}`} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">+ Pemeriksaan</Link>
          </div>
        </CardContent>
      </Card>

      <div className="border-b border-slate-200 flex gap-1 overflow-x-auto">
        {tabs.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)} className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 ${tab===t.id ? 'border-teal-600 text-teal-700' : 'border-transparent text-slate-500 hover:text-slate-700'}`}>{t.label}</button>
        ))}
      </div>

      {tab==='profil' && (
        <Card><CardHeader title="Profil Anak" /><CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div><p className="text-slate-500">NIK</p><p className="font-medium">{child.nik||'-'}</p></div>
          <div><p className="text-slate-500">Nomor KK</p><p className="font-medium">{child.nomor_kk||'-'}</p></div>
          <div><p className="text-slate-500">Posyandu</p><p className="font-medium">{child.posyandu?.nama_posyandu}</p></div>
          <div><p className="text-slate-500">Status</p><p className="font-medium">{child.status}</p></div>
          <div className="md:col-span-2"><p className="text-slate-500">Alamat</p><p className="font-medium">{child.alamat}</p></div>
        </CardContent></Card>
      )}

      {tab==='orangtua' && (
        <Card><CardHeader title="Orang Tua / Wali" /><CardContent>
          {parents.length===0 ? <p className="text-sm text-slate-500">Belum ada orang tua terhubung.</p> : (
            <div className="space-y-3">
              {parents.map((p:any)=>(
                <div key={p.id} className="p-4 rounded-xl border flex justify-between">
                  <div>
                    <p className="font-medium">{p.nama_lengkap} <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 ml-2">{p.pivot?.relationship}</span></p>
                    <p className="text-xs text-slate-500">{p.nik||'-'} • {p.nomor_telepon||'-'} • {p.alamat||'-'}</p>
                  </div>
                  {p.pivot?.is_primary_contact && <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full h-fit">Kontak Utama</span>}
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {tab==='pemeriksaan' && (
        <Card><CardHeader title="Riwayat Pemeriksaan" /><CardContent>
          {exams.length===0 ? <p className="text-sm text-slate-500">Belum ada pemeriksaan.</p> : (
            <div className="space-y-4">
              {exams.map((e:any)=>(
                <div key={e.id} className="p-4 rounded-xl border border-slate-200">
                  <p className="font-medium text-sm">{formatDate(e.examination_date)} • {e.posyandu?.nama_posyandu} • oleh {e.examiner?.name||'-'}</p>
                  <div className="grid grid-cols-4 gap-2 mt-2 text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl"><p className="text-slate-500">BB</p><p className="font-bold">{e.growth_record?.weight ?? e.growthRecord?.weight ?? '-'} kg</p></div>
                    <div className="bg-slate-50 p-2 rounded-xl"><p className="text-slate-500">TB/PB</p><p className="font-bold">{e.growth_record?.height ?? e.growthRecord?.height ?? e.growth_record?.length ?? e.growthRecord?.length ?? '-'} cm</p></div>
                    <div className="bg-slate-50 p-2 rounded-xl"><p className="text-slate-500">LK</p><p className="font-bold">{e.growth_record?.head_circumference ?? e.growthRecord?.head_circumference ?? '-'} cm</p></div>
                    <div className="bg-amber-50 p-2 rounded-xl border border-amber-100"><p className="text-slate-500">LiLA</p><p className="font-bold">{e.growth_record?.arm_circumference ?? e.growthRecord?.arm_circumference ?? '-'} cm</p></div>
                  </div>
                  {e.notes && <p className="text-xs text-slate-600 mt-2">Catatan: {e.notes}</p>}
                </div>
              ))}
            </div>
          )}
        </CardContent></Card>
      )}

      {tab==='pertumbuhan' && (
        <div className="space-y-4">
          <Card>
            <CardHeader title="Grafik Pertumbuhan" action={
              <select value={chartMetric} onChange={e=>setChartMetric(e.target.value as any)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
                <option value="weight">Berat Badan</option>
                <option value="height">Tinggi/Panjang Badan</option>
                <option value="head_circumference">Lingkar Kepala</option>
                <option value="arm_circumference">Lingkar Lengan</option>
              </select>
            } />
            <CardContent>
              {chart.length ? (
                <div className="h-[280px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chart}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" tick={{fontSize:11}} />
                      <YAxis tick={{fontSize:11}} />
                      <Tooltip />
                      <Line type="monotone" dataKey={chartMetric} stroke="#0d9488" strokeWidth={2} dot />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : <p className="text-sm text-slate-500">Belum ada data grafik.</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {tab==='analisis' && (
        <Card><CardHeader title="Analisis Pertumbuhan" subtitle="Hasil pemantauan, bukan diagnosis medis" /><CardContent>
          {!analysis || analysis.overall_status==='Belum ada data' ? <p className="text-sm text-slate-500">{analysis?.summary || 'Belum ada data untuk analisis.'}</p> : (
            <div className="space-y-4">
              <div className={`p-4 rounded-xl border ${analysis.overall_status?.includes('Sesuai') ? 'bg-emerald-50 border-emerald-200' : analysis.overall_status?.includes('Perlu Perhatian') ? 'bg-amber-50 border-amber-200' : analysis.overall_status?.includes('Lebih Lanjut') ? 'bg-orange-50 border-orange-200' : 'bg-red-50 border-red-200'}`}>
                <p className="font-semibold">{analysis.overall_status}</p>
                <p className="text-sm mt-1">{analysis.summary}</p>
                <p className="text-xs text-slate-500 mt-2">Usia: {analysis.age_months} bulan • {analysis.gender==='L'?'Laki-laki':'Perempuan'}</p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {analysis.indicators && Object.entries(analysis.indicators).map(([k,v]:any)=>(
                  <div key={k} className="p-3 rounded-xl border bg-white">
                    <p className="text-xs font-semibold uppercase text-slate-500">{k}</p>
                    <p className="font-medium">{v.value ?? '-'} {k==='weight'?'kg':'cm'}</p>
                    <Badge label={v.label || v.status || '-'} />
                    <p className="text-xs text-slate-600 mt-1">{v.message}</p>
                    {v.source && <p className="text-[11px] text-slate-400 mt-1">Sumber: {v.source}</p>}
                  </div>
                ))}
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border text-xs text-slate-600">
                <p className="font-semibold">Rekomendasi Edukasi:</p>
                <p className="mt-1">Perhatikan variasi makanan sesuai usia. Pantau pertumbuhan pada kunjungan berikutnya. Jika memiliki kekhawatiran mengenai pertumbuhan anak, konsultasikan dengan tenaga kesehatan.</p>
              </div>
            </div>
          )}
        </CardContent></Card>
      )}

      {tab==='imunisasi' && (
        <Card><CardHeader title="Imunisasi" /><CardContent>
          {immunizations.length===0 ? <p className="text-sm text-slate-500">Belum ada data imunisasi.</p> : (
            <table className="w-full text-sm">
              <thead className="text-xs text-slate-500"><tr><th className="text-left py-2">Vaksin</th><th className="text-left py-2">Tanggal</th><th className="text-left py-2">Status</th><th className="text-left py-2">Catatan</th></tr></thead>
              <tbody>{immunizations.map((im:any)=><tr key={im.id} className="border-t"><td className="py-2">{im.vaccine_name}</td><td className="py-2">{formatDate(im.vaccination_date)}</td><td className="py-2"><Badge label={im.status} /></td><td className="py-2">{im.notes||'-'}</td></tr>)}</tbody>
            </table>
          )}
        </CardContent></Card>
      )}

      {tab==='tindak' && (
        <Card><CardHeader title="Tindak Lanjut" /><CardContent>
          {followups.length===0 ? <p className="text-sm text-slate-500">Belum ada tindak lanjut.</p> : (
            <div className="space-y-2">
              {followups.map((f:any)=><div key={f.id} className="p-3 rounded-xl border flex justify-between"><div><p className="font-medium text-sm">{f.type}</p><p className="text-xs text-slate-500">Tgl: {formatDate(f.follow_up_date)} • {f.status} • {f.notes||'-'}</p></div><Badge label={f.status} /></div>)}
            </div>
          )}
        </CardContent></Card>
      )}
    </div>
  )
}
