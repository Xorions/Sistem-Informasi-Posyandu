import { useEffect, useState } from 'react'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, BarChart, Bar, CartesianGrid } from 'recharts'
import { useAuth } from "@/features/auth/AuthContext"

type Dash = {
  anak_terdaftar: number
  pemeriksaan_bulan_ini: number
  follow_up_pending: number
  jumlah_posyandu: number
  perlu_pemantauan: number
  total_orang_tua?: number
  total_pemeriksaan?: number
  total_imunisasi?: number
  total_anak?: number
  total_kader?: number
  chart_monthly: { month: string; total: number }[]
  growth_trend: { month: string; avg_weight: string; avg_height: string }[]
}

export default function Dashboard() {
  const { user } = useAuth()
  const [data, setData] = useState<Dash | null>(null)
  const [posyanduId, setPosyanduId] = useState<string>('')
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  const fetch = async (pid?: string) => {
    setLoading(true)
    try {
      const res = await api.get('/dashboard', { params: pid ? { posyandu_id: pid } : {} })
      setData(res.data.data)
    } catch {} finally { setLoading(false) }
  }

  useEffect(() => {
    api.get('/posyandu', { params: { per_page: 100 } }).then(r=>{
      const list = r.data.data?.data || r.data.data || []
      setPosyandus(Array.isArray(list) ? list : [])
    }).catch(()=>{})
    fetch()
  }, [])

  const onFilter = (val: string) => {
    setPosyanduId(val)
    fetch(val || undefined)
  }

  if (loading && !data) return <div className="py-10 text-center text-slate-500">Memuat data dashboard...</div>
  if (!data) return <div className="py-10 text-center text-red-500">Data tidak dapat dimuat. Silakan coba kembali.</div>

  const stats = [
    { label: 'Anak Terdaftar', value: data.anak_terdaftar, sub: 'Total di posyandu terpilih', color: 'bg-teal-500' },
    { label: 'Pemeriksaan Bulan Ini', value: data.pemeriksaan_bulan_ini, sub: 'Kunjungan bulan berjalan', color: 'bg-sky-500' },
    { label: 'Perlu Pemantauan', value: data.perlu_pemantauan, sub: 'Follow-up pending', color: 'bg-amber-500' },
    { label: 'Follow-Up Pending', value: data.follow_up_pending, sub: 'Menunggu tindak lanjut', color: 'bg-orange-500' },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500">Selamat datang, {user?.name} • {user?.role}</p>
        </div>
        {(user?.posyandus?.length || 0) > 1 || user?.role === 'SUPER_ADMIN' ? (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Posyandu:</span>
            <select value={posyanduId} onChange={e=>onFilter(e.target.value)} className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
              <option value="">Semua Posyandu</option>
              {posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu}</option>)}
            </select>
          </div>
        ) : null}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map(s=>(
          <Card key={s.label}>
            <CardContent>
              <div className="flex justify-between items-start">
                <div>
                  <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{s.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{s.value}</p>
                  <p className="text-xs text-slate-500 mt-1">{s.sub}</p>
                </div>
                <div className={`w-10 h-10 rounded-xl ${s.color} flex items-center justify-center text-white`}>●</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {(data.total_orang_tua !== undefined) && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent><p className="text-xs text-slate-400 uppercase font-semibold">Total Orang Tua</p><p className="text-2xl font-bold mt-1">{data.total_orang_tua}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs text-slate-400 uppercase font-semibold">Total Pemeriksaan</p><p className="text-2xl font-bold mt-1">{data.total_pemeriksaan}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs text-slate-400 uppercase font-semibold">Total Imunisasi</p><p className="text-2xl font-bold mt-1">{data.total_imunisasi}</p></CardContent></Card>
        </div>
      )}

      {user?.role === 'SUPER_ADMIN' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card><CardContent><p className="text-xs text-slate-400 uppercase font-semibold">Total Kader</p><p className="text-2xl font-bold">{data.total_kader}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs text-slate-400 uppercase font-semibold">Jumlah Posyandu</p><p className="text-2xl font-bold">{data.jumlah_posyandu}</p></CardContent></Card>
          <Card><CardContent><p className="text-xs text-slate-400 uppercase font-semibold">Total Pemeriksaan Global</p><p className="text-2xl font-bold">{data.total_pemeriksaan ?? data.anak_terdaftar}</p></CardContent></Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <div className="px-6 py-4 border-b"><h3 className="font-semibold">Pemeriksaan 6 Bulan Terakhir</h3></div>
          <CardContent>
            {data.chart_monthly?.length ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={data.chart_monthly}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Bar dataKey="total" fill="#0d9488" radius={[8,8,0,0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-slate-500 text-center py-10">Belum ada data pemeriksaan.</p>}
          </CardContent>
        </Card>
        <Card>
          <div className="px-6 py-4 border-b"><h3 className="font-semibold">Tren Rata-rata Berat & Tinggi</h3></div>
          <CardContent>
            {data.growth_trend?.length ? (
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={data.growth_trend}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip />
                    <Line type="monotone" dataKey="avg_weight" stroke="#0ea5e9" strokeWidth={2} dot={false} name="BB (kg)" />
                    <Line type="monotone" dataKey="avg_height" stroke="#10b981" strokeWidth={2} dot={false} name="TB (cm)" />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : <p className="text-sm text-slate-500 text-center py-10">Belum ada data pertumbuhan.</p>}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
