import { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import { api, apiSpecialCare } from "@/shared/lib/api"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { formatDate, ageFromDob } from "@/shared/lib/utils"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts'
import { useToast } from "@/shared/components/ui/toast"
import {
  SPECIAL_CARE_TRACK_LABEL,
  SPECIAL_CARE_STATUS_LABEL,
  type SpecialCareEnrollment,
} from "@/shared/types"

export default function ChildDetail() {
  const { id } = useParams()
  const { role } = useAuth()
  const toast = useToast()
  const canManageChild = can(role, 'manage-anak')
  const canManageExam = can(role, 'manage-pemeriksaan')
  const [child, setChild] = useState<any>(null)
  const [tab, setTab] = useState('profil')
  const [exams, setExams] = useState<any[]>([])
  const [chart, setChart] = useState<any[]>([])
  const [chartMetric, setChartMetric] = useState<'weight'|'height'|'head_circumference'|'arm_circumference'>('weight')
  const [analysis, setAnalysis] = useState<any>(null)
  const [immunizations, setImmunizations] = useState<any[]>([])
  const [followups, setFollowups] = useState<any[]>([])
  const [parents, setParents] = useState<any[]>([])
  const [specialCareList, setSpecialCareList] = useState<SpecialCareEnrollment[]>([])

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
    if (id) {
      try {
        const list = await apiSpecialCare.childHistory(Number(id))
        setSpecialCareList(list || [])
      } catch {}
    }
  }
  useEffect(()=>{ load() },[id])

  if (!child) return <div className="py-10 text-center">Memuat...</div>

  const tabs = [
    { id:'profil', label:'Profil' },
    { id:'orangtua', label:'Orang Tua' },
    { id:'pemeriksaan', label:'Pemeriksaan' },
    { id:'pertumbuhan', label:'Pertumbuhan' },
    { id:'analisis', label:'Analisis' },
    { id:'pendampingan', label:'Pendampingan Gizi' },
    { id:'imunisasi', label:'Imunisasi' },
    { id:'tindak', label:'Tindak Lanjut' },
  ]

  const activeEnrollment = specialCareList.find((e) => e.status === 'active' || e.status === 'candidate')
  const historyEnrollments = specialCareList.filter((e) => e.status === 'graduated' || e.status === 'cancelled')
  const hasGraduatedBefore = !activeEnrollment && historyEnrollments.some((h) => h.status === 'graduated')

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 text-sm text-slate-500"><Link to="/children" className="hover:text-teal-600">Anak</Link><span>/</span><span className="text-slate-800 font-medium">{child.nama_lengkap}</span></div>

      <Card>
        <CardContent className="flex flex-wrap gap-6 items-start">
          <div className="w-16 h-16 rounded-2xl bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-xl">{child.nama_lengkap.charAt(0)}</div>
          <div className="flex-1 min-w-[220px]">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{child.nama_lengkap} <span className="text-sm font-normal text-slate-500">({child.nama_panggilan||'-'})</span></h1>
              {activeEnrollment && (
                <span
                  className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    activeEnrollment.status === 'active'
                      ? 'bg-teal-100 text-teal-800 border border-teal-200'
                      : 'bg-amber-100 text-amber-800 border border-amber-200'
                  }`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {role === 'ORANG_TUA' && activeEnrollment.status === 'candidate'
                    ? 'Rencana Pendampingan'
                    : SPECIAL_CARE_STATUS_LABEL[activeEnrollment.status]}
                </span>
              )}
              {hasGraduatedBefore && (
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                  ✓ Lulus Program (Optimal)
                </span>
              )}
            </div>

            <p className="text-sm text-slate-600 mt-1">{child.tempat_lahir}, {formatDate(child.tanggal_lahir)} • {ageFromDob(child.tanggal_lahir)} • {child.jenis_kelamin==='L'?'Laki-laki':'Perempuan'}</p>
            <p className="text-sm text-slate-500">{child.posyandu?.nama_posyandu} • {child.alamat}</p>

            {/* Penanda Rujukan Medis yang Jelas & Halus */}
            {activeEnrollment?.perlu_rujukan && (
              <div className="mt-3 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 flex items-start gap-3 text-xs sm:text-sm">
                <span className="text-base leading-none mt-0.5">⚕️</span>
                <div className="flex-1">
                  <div className="font-semibold text-rose-800 flex items-center gap-2">
                    <span>Disarankan Konsultasi Medis (Puskesmas)</span>
                  </div>
                  <p className="mt-0.5 text-rose-700 text-xs">
                    {role === 'ORANG_TUA'
                      ? 'Berdasarkan catatan pemantauan berkala posyandu, ananda disarankan berkonsultasi dengan dokter di Puskesmas untuk pemeriksaan kesehatan yang lebih mendalam.'
                      : `Anak memenuhi kriteria rujukan medis: ${activeEnrollment.alasan_masuk || 'Memerlukan pemeriksaan oleh dokter Puskesmas.'}`}
                  </p>
                </div>
              </div>
            )}
          </div>
          {(canManageChild || canManageExam) && (
            <div className="flex gap-2">
              {canManageChild && (
                <Link to={`/children/${id}/edit`} className="px-4 py-2 rounded-xl border border-slate-200 text-sm">Edit</Link>
              )}
              {canManageExam && (
                <Link to={`/examinations?child_id=${id}`} className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">+ Pemeriksaan</Link>
              )}
            </div>
          )}
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

      {tab==='pendampingan' && (
        <div className="space-y-6">
          {/* Empathetic Informational Card */}
          <Card className="border-teal-100 bg-teal-50/40">
            <CardContent className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-teal-100 flex items-center justify-center text-teal-700 text-lg shrink-0">
                  🥣
                </div>
                <div className="text-sm">
                  <h3 className="font-semibold text-teal-950">
                    {role === 'ORANG_TUA' ? 'Ruang Pendampingan Nutrisi & Tumbuh Kembang' : 'Program Pendampingan Gizi Khusus'}
                  </h3>
                  <p className="text-slate-600 mt-1 text-xs sm:text-sm leading-relaxed">
                    {role === 'ORANG_TUA'
                      ? 'Program ini dihadirkan bersama posyandu dan puskesmas untuk memastikan setiap anak mendapatkan pemantauan gizi dan stimulasi tumbuh kembang yang paling sesuai dengan kebutuhannya. Pendampingan berjalan penuh kehangatan demi masa depan ananda yang sehat dan ceria.'
                      : 'Pemantauan intensif PMT Pemulihan dan stimulasi tumbuh kembang berbasis standar Permenkes & WHO. Seluruh data tercatat otomatis dan terdokumentasi.'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Status Pendampingan Saat Ini */}
          {activeEnrollment ? (
            <Card className="border-teal-200">
              <CardHeader
                title={activeEnrollment.status === 'active' ? 'Program Sedang Berjalan' : 'Rencana Pendampingan'}
                subtitle={SPECIAL_CARE_TRACK_LABEL[activeEnrollment.track]}
              />
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-500">Status</p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {role === 'ORANG_TUA' && activeEnrollment.status === 'candidate'
                        ? 'Rencana Pendampingan'
                        : SPECIAL_CARE_STATUS_LABEL[activeEnrollment.status]}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-500">Fokus Pendampingan</p>
                    <p className="font-bold text-teal-700 text-sm mt-0.5">
                      {SPECIAL_CARE_TRACK_LABEL[activeEnrollment.track]}
                    </p>
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-500">
                      {activeEnrollment.status === 'active' ? 'Tanggal Mulai' : 'Teridentifikasi'}
                    </p>
                    <p className="font-bold text-slate-800 text-sm mt-0.5">
                      {formatDate(activeEnrollment.entry_date || activeEnrollment.created_at || '')}
                    </p>
                    {activeEnrollment.status === 'active' && (
                      <p className="text-[11px] text-teal-600 mt-0.5 font-medium">
                        Hari ke-{activeEnrollment.days_in_program}
                      </p>
                    )}
                  </div>
                  <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <p className="text-slate-500">Rujukan Medis</p>
                    <p className={`font-bold text-sm mt-0.5 ${activeEnrollment.perlu_rujukan ? 'text-rose-600' : 'text-emerald-600'}`}>
                      {activeEnrollment.perlu_rujukan ? 'Perlu Puskesmas' : 'Posyandu Terpadu'}
                    </p>
                  </div>
                </div>

                {activeEnrollment.perlu_rujukan && (
                  <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-800">
                    <p className="font-bold">Anjuran Kunjungan Fasilitas Kesehatan:</p>
                    <p className="mt-1">
                      {role === 'ORANG_TUA'
                        ? 'Disarankan berkonsultasi dengan dokter di Puskesmas untuk pemeriksaan kesehatan yang lebih mendalam dan pemastian kondisi fisik ananda. Kader posyandu siap mendampingi proses konsultasi ke Puskesmas.'
                        : (activeEnrollment.alasan_masuk || 'Memerlukan pemeriksaan oleh dokter Puskesmas.')}
                    </p>
                  </div>
                )}

                {activeEnrollment.notes && (
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                    <p className="font-semibold text-slate-700">Catatan Pemantauan:</p>
                    <p className="mt-1 text-slate-600 whitespace-pre-line">{activeEnrollment.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-8 text-center text-slate-500 text-sm">
                <p className="font-medium text-slate-700">Tidak ada program pendampingan aktif saat ini.</p>
                <p className="text-xs text-slate-400 mt-1">Pertumbuhan ananda terpantau rutin melalui jadwal pemeriksaan bulanan posyandu.</p>
              </CardContent>
            </Card>
          )}

          {/* Riwayat Program Sebelumnya */}
          <Card>
            <CardHeader
              title="Riwayat Program Pendampingan"
              subtitle="Catatan program pendampingan yang telah diselesaikan"
            />
            <CardContent>
              {historyEnrollments.length === 0 ? (
                <p className="text-sm text-slate-500 py-4 text-center">Belum ada riwayat pendampingan sebelumnya.</p>
              ) : (
                <div className="space-y-3">
                  {historyEnrollments.map((h) => (
                    <div key={h.id} className="p-4 rounded-xl border border-slate-200 bg-white">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <span className="font-bold text-slate-900 text-sm">
                            {SPECIAL_CARE_TRACK_LABEL[h.track]}
                          </span>
                          <span className="text-xs text-slate-400 ml-2">
                            {formatDate(h.entry_date || h.created_at || '')} — {h.exit_date ? formatDate(h.exit_date) : 'Selesai'}
                          </span>
                        </div>
                        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                          h.status === 'graduated'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {SPECIAL_CARE_STATUS_LABEL[h.status]}
                        </span>
                      </div>
                      {h.alasan_keluar && (
                        <p className="text-xs text-slate-600 mt-2">
                          <span className="font-semibold text-slate-700">Keterangan Evaluasi: </span>
                          {h.alasan_keluar}
                        </p>
                      )}
                      {h.notes && (
                        <p className="text-xs text-slate-500 mt-1">
                          <span className="font-medium">Catatan: </span>
                          {h.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
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
