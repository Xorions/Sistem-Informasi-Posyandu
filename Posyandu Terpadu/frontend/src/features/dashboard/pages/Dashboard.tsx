import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { apiDashboard, apiPosyandu } from '@/shared/lib/api'
import { apiErrorMessage } from '@/shared/lib/api'
import { Card, CardContent } from '@/shared/components/ui/card'
import { Select, Spinner, ErrorState } from '@/shared/components/ui/field'
import { useAuth } from '@/features/auth/AuthContext'
import { ROUTES } from '@/app/routes'
import { can } from '@/shared/lib/rbac'
import { ROLE_LABEL, type Posyandu } from '@/shared/types'

type Dash = {
  anak_terdaftar: number
  pemeriksaan_bulan_ini: number
  follow_up_pending: number
  jumlah_posyandu: number
  perlu_pemantauan: number
  total_orang_tua?: number
  total_pemeriksaan?: number
  total_imunisasi?: number
  total_vitamin?: number
  total_kader?: number
  total_ibu_hamil?: number
  total_anak_global?: number
  total_posyandu_global?: number
  chart_monthly: { month: string; total: number }[]
  growth_trend: { month: string; avg_weight: string; avg_height: string }[]
}

function StatCard({
  label,
  value,
  sub,
  tone,
}: {
  label: string
  value: number | undefined
  sub: string
  tone: string
}) {
  return (
    <Card>
      <CardContent>
        <div className="flex justify-between items-start gap-3">
          <div className="min-w-0">
            <p className="text-xs font-semibold tracking-widest text-slate-400 uppercase">{label}</p>
            <p className="text-3xl font-bold text-slate-900 mt-2">{value ?? '-'}</p>
            <p className="text-xs text-slate-500 mt-1">{sub}</p>
          </div>
          <div className={`w-10 h-10 shrink-0 rounded-xl ${tone} flex items-center justify-center text-white`}>
            ◧
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default function Dashboard() {
  const { user, role, isAdmin, isOrangTua } = useAuth()

  const [data, setData] = useState<Dash | null>(null)
  const [posyanduId, setPosyanduId] = useState('')
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetch = async (pid?: string) => {
    setLoading(true)
    setError(null)

    try {
      const summary = (await apiDashboard.summary(pid ? { posyandu_id: pid } : undefined)) as unknown as Dash
      setData(summary)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data dashboard tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void (async () => {
      try {
        const { data: list } = await apiPosyandu.list({ per_page: 100 })
        setPosyandus(list)
      } catch {
        // Filter posyandu tidak wajib.
      }

      await fetch()
    })()
  }, [])

  const onFilter = (val: string) => {
    setPosyanduId(val)
    void fetch(val || undefined)
  }

  if (loading && !data) return <Spinner label="Memuat dashboard..." />
  if (error) return <ErrorState message={error} onRetry={() => fetch(posyanduId || undefined)} />
  if (!data) return null

  const showPosyanduFilter = !isOrangTua && ((user?.posyandus?.length || 0) > 1 || isAdmin)

  const stats = isOrangTua
    ? [
        { label: 'Anak Saya', value: data.anak_terdaftar, sub: 'Anak terdaftar pada akun ini', tone: 'bg-teal-500' },
        {
          label: 'Pemeriksaan Bulan Ini',
          value: data.pemeriksaan_bulan_ini,
          sub: 'Kunjungan bulan berjalan',
          tone: 'bg-sky-500',
        },
        {
          label: 'Imunisasi & Vitamin',
          value: data.total_imunisasi,
          sub: 'Catatan pemberian anak saya',
          tone: 'bg-violet-500',
        },
        {
          label: 'Perlu Pemantauan',
          value: data.perlu_pemantauan,
          sub: 'Menunggu tindak lanjut',
          tone: 'bg-amber-500',
        },
      ]
    : [
        {
          label: 'Anak Terdaftar',
          value: data.anak_terdaftar,
          sub: 'Total di posyandu terpilih',
          tone: 'bg-teal-500',
        },
        {
          label: 'Pemeriksaan Bulan Ini',
          value: data.pemeriksaan_bulan_ini,
          sub: 'Kunjungan bulan berjalan',
          tone: 'bg-sky-500',
        },
        {
          label: 'Perlu Pemantauan',
          value: data.perlu_pemantauan,
          sub: 'Follow-up pending',
          tone: 'bg-amber-500',
        },
        {
          label: 'Jumlah Posyandu',
          value: data.jumlah_posyandu,
          sub: 'Cakupan akses Anda',
          tone: 'bg-orange-500',
        },
      ]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {isOrangTua ? 'Ringkasan Anak Saya' : 'Dashboard'}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Selamat datang, {user?.name} · {role ? ROLE_LABEL[role] : '-'}
          </p>
          {isOrangTua && (
            <p className="text-sm text-slate-500 mt-1">
              Halaman ini menampilkan data yang berkaitan dengan anak Anda sendiri.
            </p>
          )}
        </div>

        {showPosyanduFilter && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-600">Posyandu:</span>
            <Select value={posyanduId} onChange={(e) => onFilter(e.target.value)}>
              <option value="">Semua Posyandu</option>
              {posyandus.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_posyandu}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value} sub={s.sub} tone={s.tone} />
        ))}
      </div>

      {isOrangTua && (
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-medium text-slate-800">Ingin melihat riwayat pertumbuhan anak?</p>
              <p className="text-sm text-slate-500 mt-0.5">
                Buka halaman Anak untuk melihat profil, pemeriksaan, dan imunisasi.
              </p>
            </div>
            <Link
              to={ROUTES.children}
              className="px-5 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
            >
              Lihat Anak Saya
            </Link>
          </CardContent>
        </Card>
      )}

      {!isOrangTua && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              ['Total Orang Tua', data.total_orang_tua],
              ['Total Pemeriksaan', data.total_pemeriksaan],
              ['Vaksin', data.total_imunisasi],
              ['Vitamin', data.total_vitamin],
              ['Kader Aktif', data.total_kader],
              ['Ibu Hamil', data.total_ibu_hamil],
            ]
              .filter(([, v]) => v !== undefined)
              .map(([label, value]) => (
                <Card key={label as string}>
                  <CardContent>
                    <p className="text-[11px] text-slate-400 uppercase font-semibold">{label}</p>
                    <p className="text-2xl font-bold mt-1">{value as number}</p>
                  </CardContent>
                </Card>
              ))}
          </div>

          {isAdmin && data.total_anak_global !== undefined && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Total Anak (semua posyandu)</p>
                  <p className="text-2xl font-bold mt-1">{data.total_anak_global}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Jumlah Posyandu</p>
                  <p className="text-2xl font-bold mt-1">{data.total_posyandu_global}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs text-slate-400 uppercase font-semibold">Total Pemeriksaan Global</p>
                  <p className="text-2xl font-bold mt-1">{data.total_pemeriksaan}</p>
                </CardContent>
              </Card>
            </div>
          )}
        </>
      )}

      {can(role, 'view-pemeriksaan') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold">Pemeriksaan 6 Bulan Terakhir</h3>
            </div>
            <CardContent>
              {data.chart_monthly?.length ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.chart_monthly}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="total" fill="#0d9488" radius={[8, 8, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-10">Belum ada data pemeriksaan.</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <div className="px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold">Tren Rata-rata Berat & Tinggi</h3>
            </div>
            <CardContent>
              {data.growth_trend?.length ? (
                <div className="h-[240px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={data.growth_trend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Line
                        type="monotone"
                        dataKey="avg_weight"
                        stroke="#0ea5e9"
                        strokeWidth={2}
                        dot={false}
                        name="BB (kg)"
                      />
                      <Line
                        type="monotone"
                        dataKey="avg_height"
                        stroke="#10b981"
                        strokeWidth={2}
                        dot={false}
                        name="TB (cm)"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-10">Belum ada data pertumbuhan.</p>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}