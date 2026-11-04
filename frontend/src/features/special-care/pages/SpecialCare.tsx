import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage, apiPosyandu, apiSpecialCare, apiValidationErrors } from '@/shared/lib/api'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { Modal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import {
  SPECIAL_CARE_STATUS_LABEL,
  SPECIAL_CARE_TRACK_LABEL,
  type Posyandu,
  type SpecialCareEnrollment,
  type SpecialCareExitEvaluation,
  type SpecialCareStatus,
  type SpecialCareStatusHistoryItem,
} from '@/shared/types'
import { formatDate } from '@/shared/lib/utils'

function getTrackLabel(item: SpecialCareEnrollment): string {
  const isUnderSixMonths = typeof item.child?.umur_bulan === 'number' && item.child.umur_bulan < 6
  if (isUnderSixMonths && (item.track === 'wasting' || item.track === 'both')) {
    return 'Konseling ASI Eksklusif & Rujukan Faskes (Tanpa PMT)'
  }
  return SPECIAL_CARE_TRACK_LABEL[item.track] || item.track
}

export default function SpecialCarePage() {
  const toast = useToast()
  const { role, isAdmin } = useAuth()
  const canManage = can(role, 'manage-penanganan-khusus')

  const [activeTab, setActiveTab] = useState<'active' | 'candidates' | 'proposals'>('active')
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])
  const [posyanduFilter, setPosyanduFilter] = useState('')
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 300)

  const [candidates, setCandidates] = useState<SpecialCareEnrollment[]>([])
  const [activeList, setActiveList] = useState<SpecialCareEnrollment[]>([])
  const [proposals, setProposals] = useState<
    Array<{ enrollment: SpecialCareEnrollment; evaluation: SpecialCareExitEvaluation }>
  >([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Modal States
  const [confirmModalOpen, setConfirmModalOpen] = useState(false)
  const [rejectModalOpen, setRejectModalOpen] = useState(false)
  const [exitModalOpen, setExitModalOpen] = useState(false)
  const [historyModalOpen, setHistoryModalOpen] = useState(false)
  const [selectedEnrollment, setSelectedEnrollment] = useState<SpecialCareEnrollment | null>(null)
  const [historyItems, setHistoryItems] = useState<SpecialCareStatusHistoryItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)
  const [submitting, setSubmitting] = useState(false)

  // Form States
  const [confirmForm, setConfirmForm] = useState({ entry_date: '', alasan: '', notes: '' })
  const [rejectForm, setRejectForm] = useState({ alasan_keluar: '', notes: '' })
  const [exitForm, setExitForm] = useState({
    status: 'graduated' as 'graduated' | 'cancelled',
    exit_date: '',
    alasan_keluar: '',
    notes: '',
  })
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})

  // Load Posyandu Options
  useEffect(() => {
    apiPosyandu
      .list({ per_page: 50 })
      .then((res) => setPosyandus(res.data))
      .catch(() => {})
  }, [])

  // Load Data
  const loadData = useCallback(async () => {
    setLoading(true)
    setError(null)
    const params = posyanduFilter ? { posyandu_id: posyanduFilter } : {}

    try {
      const [candRes, actRes, propRes] = await Promise.all([
        apiSpecialCare.candidates(params),
        apiSpecialCare.active(params),
        apiSpecialCare.exitProposals(params),
      ])
      setCandidates(candRes)
      setActiveList(actRes)
      setProposals(propRes)
    } catch (err) {
      setError(apiErrorMessage(err, 'Gagal memuat data pendampingan gizi.'))
    } finally {
      setLoading(false)
    }
  }, [posyanduFilter])

  useEffect(() => {
    loadData()
  }, [loadData])

  // Open Actions
  const handleOpenConfirm = (en: SpecialCareEnrollment) => {
    setSelectedEnrollment(en)
    setConfirmForm({
      entry_date: new Date().toISOString().split('T')[0],
      alasan: 'Dikonfirmasi untuk pendampingan nutrisi dan pemantauan berkala',
      notes: '',
    })
    setFormErrors({})
    setConfirmModalOpen(true)
  }

  const handleOpenReject = (en: SpecialCareEnrollment) => {
    setSelectedEnrollment(en)
    setRejectForm({ alasan_keluar: '', notes: '' })
    setFormErrors({})
    setRejectModalOpen(true)
  }

  const handleOpenExit = (en: SpecialCareEnrollment, defaultStatus: 'graduated' | 'cancelled' = 'graduated') => {
    setSelectedEnrollment(en)
    setExitForm({
      status: defaultStatus,
      exit_date: new Date().toISOString().split('T')[0],
      alasan_keluar: defaultStatus === 'graduated' ? 'Tumbuh kembang membaik dan mencapai target program' : '',
      notes: '',
    })
    setFormErrors({})
    setExitModalOpen(true)
  }

  const handleOpenHistory = async (en: SpecialCareEnrollment) => {
    setSelectedEnrollment(en)
    setHistoryModalOpen(true)
    setLoadingHistory(true)
    try {
      const res = await apiSpecialCare.auditLogs(en.id)
      setHistoryItems(res)
    } catch {
      toast.show('Gagal memuat riwayat status.', 'error')
    } finally {
      setLoadingHistory(false)
    }
  }

  // Submit Handlers
  const handleSubmitConfirm = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEnrollment) return
    setSubmitting(true)
    setFormErrors({})

    try {
      await apiSpecialCare.confirm(selectedEnrollment.id, confirmForm)
      toast.show('Peserta berhasil dikonfirmasi ke program pendampingan.', 'success')
      setConfirmModalOpen(false)
      loadData()
    } catch (err) {
      const fieldErrors = apiValidationErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors)
      } else {
        toast.show(apiErrorMessage(err, 'Gagal mengonfirmasi kandidat.'), 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitReject = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEnrollment) return
    setSubmitting(true)
    setFormErrors({})

    try {
      await apiSpecialCare.reject(selectedEnrollment.id, rejectForm)
      toast.show('Pencatatan kandidat telah diselesaikan.', 'success')
      setRejectModalOpen(false)
      loadData()
    } catch (err) {
      const fieldErrors = apiValidationErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors)
      } else {
        toast.show(apiErrorMessage(err, 'Gagal menolak kandidat.'), 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  const handleSubmitExit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedEnrollment) return
    setSubmitting(true)
    setFormErrors({})

    try {
      await apiSpecialCare.exit(selectedEnrollment.id, exitForm)
      toast.show(
        exitForm.status === 'graduated'
          ? 'Anak berhasil menyelesaikan program pendampingan!'
          : 'Pembaruan status program berhasil disimpan.',
        'success'
      )
      setExitModalOpen(false)
      loadData()
    } catch (err) {
      const fieldErrors = apiValidationErrors(err)
      if (Object.keys(fieldErrors).length > 0) {
        setFormErrors(fieldErrors)
      } else {
        toast.show(apiErrorMessage(err, 'Gagal menyimpan status keluar.'), 'error')
      }
    } finally {
      setSubmitting(false)
    }
  }

  // Filter local by search
  const filterBySearch = (list: SpecialCareEnrollment[]) => {
    if (!debouncedSearch.trim()) return list
    const q = debouncedSearch.toLowerCase()
    return list.filter((item) => {
      const childName = item.child?.nama_lengkap?.toLowerCase() || ''
      const posyanduName = item.posyandu?.nama_posyandu?.toLowerCase() || ''
      return childName.includes(q) || posyanduName.includes(q)
    })
  }

  const filteredCandidates = filterBySearch(candidates)
  const filteredActive = filterBySearch(activeList)
  const filteredProposals = proposals.filter((p) => {
    if (!debouncedSearch.trim()) return true
    const q = debouncedSearch.toLowerCase()
    const childName = p.enrollment.child?.nama_lengkap?.toLowerCase() || ''
    const posyanduName = p.enrollment.posyandu?.nama_posyandu?.toLowerCase() || ''
    return childName.includes(q) || posyanduName.includes(q)
  })

  // Monthly summary stats
  const totalRujukan = activeList.filter((a) => a.perlu_rujukan).length + candidates.filter((c) => c.perlu_rujukan).length
  const totalWasting = activeList.filter((a) => a.track === 'wasting' || a.track === 'both').length
  const totalStunting = activeList.filter((a) => a.track === 'stunting' || a.track === 'both').length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Program Pendampingan Gizi & Tumbuh Kembang</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Pemantauan intensif, evaluasi nutrisi berkala, dan koordinasi rujukan fasilitas kesehatan
          </p>
        </div>
      </div>

      {/* Catatan Penapisan Klinis */}
      <div className="bg-blue-50/70 border border-blue-200/80 rounded-xl p-3 text-xs text-blue-900 flex items-start gap-2.5">
        <svg className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="leading-relaxed">
          <span className="font-semibold text-blue-950">Panduan Penapisan Klinis:</span> Rekomendasi penanganan khusus merupakan alat bantu penapisan awal posyandu berdasarkan antropometri (LiLA, BB, TB/PB). Standar pertumbuhan lokal saat ini menggunakan estimasi deviasi referensi internal dan berstatus <em>belum divalidasi tabel LMS penuh Kemenkes</em>. Penetapan diagnosis klinis definitif, peresepan intervensi medis/PMT, dan kelulusan program tetap berada di bawah wewenang Petugas Gizi (TPG) dan Bidan Puskesmas.
        </div>
      </div>

      {/* Rekap Bulanan Ringkas */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-emerald-50/50 border-emerald-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-emerald-800 uppercase tracking-wider">Sedang Didampingi</p>
            <p className="text-2xl font-bold text-emerald-900 mt-1">{activeList.length}</p>
            <p className="text-[11px] text-emerald-700 mt-0.5">Anak dalam program</p>
          </CardContent>
        </Card>
        <Card className="bg-amber-50/50 border-amber-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-amber-800 uppercase tracking-wider">Perlu Konfirmasi</p>
            <p className="text-2xl font-bold text-amber-900 mt-1">{candidates.length}</p>
            <p className="text-[11px] text-amber-700 mt-0.5">Hasil penimbangan baru</p>
          </CardContent>
        </Card>
        <Card className="bg-blue-50/50 border-blue-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-blue-800 uppercase tracking-wider">Siap Evaluasi Lulus</p>
            <p className="text-2xl font-bold text-blue-900 mt-1">{proposals.length}</p>
            <p className="text-[11px] text-blue-700 mt-0.5">Memenuhi kriteria pulih</p>
          </CardContent>
        </Card>
        <Card className="bg-rose-50/50 border-rose-100">
          <CardContent className="p-4">
            <p className="text-xs font-semibold text-rose-800 uppercase tracking-wider">Perlu Konsultasi Medis</p>
            <p className="text-2xl font-bold text-rose-900 mt-1">{totalRujukan}</p>
            <p className="text-[11px] text-rose-700 mt-0.5">Koordinasi puskesmas</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter & Tabs */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
            {/* Tabs */}
            <div className="flex gap-1 p-1 bg-slate-100 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab('active')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'active' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Peserta Aktif ({activeList.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('candidates')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'candidates' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Menunggu Konfirmasi ({candidates.length})
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('proposals')}
                className={`px-4 py-2 rounded-lg text-xs font-semibold transition ${
                  activeTab === 'proposals' ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Usulan Lulus ({proposals.length})
              </button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {isAdmin && (
                <Select
                  value={posyanduFilter}
                  onChange={(e) => setPosyanduFilter(e.target.value)}
                  className="text-xs w-48"
                >
                  <option value="">Semua Posyandu</option>
                  {posyandus.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_posyandu}
                    </option>
                  ))}
                </Select>
              )}
              <Input
                placeholder="Cari nama anak..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="text-xs w-48"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Main Content */}
      {loading ? (
        <div className="py-16 text-center">
          <Spinner />
          <p className="text-xs text-slate-500 mt-2">Memuat daftar pendampingan gizi...</p>
        </div>
      ) : error ? (
        <ErrorState message={error} onRetry={loadData} />
      ) : activeTab === 'active' ? (
        /* TAB 1: PESERTA AKTIF */
        filteredActive.length === 0 ? (
          <EmptyState
            title="Tidak ada peserta aktif"
            description="Saat ini belum ada anak yang sedang dalam program pendampingan aktif."
          />
        ) : (
          <div className="space-y-3">
            {filteredActive.map((item) => (
              <Card key={item.id} className="hover:border-teal-200 transition">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/children/${item.child_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 text-base"
                        >
                          {item.child?.nama_lengkap}
                        </Link>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-teal-50 text-teal-700 border border-teal-200 font-medium">
                          {getTrackLabel(item)}
                        </span>
                        {item.perlu_rujukan && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 font-semibold flex items-center gap-1">
                            <span>⚠</span> Perlu Konsultasi Medis (Puskesmas)
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">
                        {item.posyandu?.nama_posyandu} • Mulai program: {formatDate(item.entry_date || '')} (
                        {item.days_in_program} hari berjalan)
                      </p>

                      <div className="p-2.5 rounded-xl bg-slate-50 text-xs text-slate-700 border border-slate-100 mt-2">
                        <span className="font-semibold text-slate-800">Catatan Awal: </span>
                        {item.alasan_masuk}
                        {item.notes && <span className="text-slate-500 italic block mt-0.5">"{item.notes}"</span>}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(item)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        Riwayat
                      </button>
                      <Link
                        to={`/children/${item.child_id}`}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-teal-700 hover:bg-teal-50 font-medium"
                      >
                        Detail Anak
                      </Link>
                      {canManage && (
                        <div className="flex items-center gap-1.5">
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
                            onClick={() => handleOpenExit(item, 'graduated')}
                          >
                            Lulus
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleOpenExit(item, 'cancelled')}
                            className="px-2.5 py-1.5 rounded-xl border border-rose-200 text-xs text-rose-600 hover:bg-rose-50 font-medium"
                          >
                            Alihkan
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : activeTab === 'candidates' ? (
        /* TAB 2: KANDIDAT MENUNGGU KONFIRMASI */
        filteredCandidates.length === 0 ? (
          <EmptyState
            title="Tidak ada kandidat menunggu"
            description="Seluruh hasil penimbangan telah sesuai atau sudah diverifikasi kader."
          />
        ) : (
          <div className="space-y-3">
            {filteredCandidates.map((item) => (
              <Card key={item.id} className="border-amber-200 bg-amber-50/20">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/children/${item.child_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 text-base"
                        >
                          {item.child?.nama_lengkap}
                        </Link>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200 font-semibold">
                          Kandidat Baru
                        </span>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-white text-slate-700 border border-slate-200">
                          {getTrackLabel(item)}
                        </span>
                        {item.perlu_rujukan && (
                          <span className="text-xs px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-semibold flex items-center gap-1">
                            <span>⚠</span> Perlu Konsultasi Medis
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-500">
                        {item.posyandu?.nama_posyandu} • Teridentifikasi:{' '}
                        {formatDate(item.created_at?.split('T')[0] || '')}
                      </p>

                      <div className="p-2.5 rounded-xl bg-white text-xs text-slate-700 border border-amber-200 mt-2">
                        <span className="font-semibold text-slate-800">Indikator Terdeteksi: </span>
                        {item.alasan_masuk}
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(item)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        Riwayat
                      </button>
                      {canManage && (
                        <>
                          <Button
                            size="sm"
                            className="bg-teal-600 hover:bg-teal-700 text-white text-xs"
                            onClick={() => handleOpenConfirm(item)}
                          >
                            Mulai Dampingi
                          </Button>
                          <button
                            type="button"
                            onClick={() => handleOpenReject(item)}
                            className="px-3 py-1.5 rounded-xl border border-slate-300 text-xs text-slate-600 hover:bg-slate-100 font-medium"
                          >
                            Lewati
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      ) : (
        /* TAB 3: USULAN LULUS PROGRAM */
        filteredProposals.length === 0 ? (
          <EmptyState
            title="Belum ada usulan lulus"
            description="Usulan muncul otomatis bila peserta telah aktif minimal 90 hari dan 2 penimbangan berturut-turut menunjukkan pertumbuhan optimal."
          />
        ) : (
          <div className="space-y-3">
            {filteredProposals.map(({ enrollment: item, evaluation: evalRes }) => (
              <Card key={item.id} className="border-emerald-300 bg-emerald-50/20">
                <CardContent className="p-4 sm:p-5">
                  <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
                    <div className="space-y-1.5 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link
                          to={`/children/${item.child_id}`}
                          className="font-bold text-slate-900 hover:text-teal-700 text-base"
                        >
                          {item.child?.nama_lengkap}
                        </Link>
                        <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 font-semibold">
                          ✓ Siap Menyelesaikan Program
                        </span>
                      </div>

                      <p className="text-xs text-slate-500">
                        {item.posyandu?.nama_posyandu} • Durasi: {evalRes.days_in_program} hari (Target:{' '}
                        {evalRes.min_duration_days} hari)
                      </p>

                      <div className="p-2.5 rounded-xl bg-white text-xs text-emerald-900 border border-emerald-200 mt-2">
                        <span className="font-semibold">Evaluasi Klinis: </span>
                        {evalRes.reason}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => handleOpenHistory(item)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs text-slate-600 hover:bg-slate-50 font-medium"
                      >
                        Riwayat
                      </button>
                      {canManage && (
                        <Button
                          size="sm"
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                          onClick={() => handleOpenExit(item, 'graduated')}
                        >
                          Konfirmasi Lulus
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )
      )}

      {/* MODAL 1: KONFIRMASI MULAI PENDAMPINGAN */}
      <Modal open={confirmModalOpen} onClose={() => setConfirmModalOpen(false)} title="Mulai Program Pendampingan">
        <form onSubmit={handleSubmitConfirm} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Anak <strong>{selectedEnrollment?.child?.nama_lengkap}</strong> akan didaftarkan ke dalam pemantauan
            nutrisi intensif.
          </p>

          <Field label="Tanggal Mulai Program" error={formErrors.entry_date}>
            <Input
              type="date"
              value={confirmForm.entry_date}
              onChange={(e) => setConfirmForm((prev) => ({ ...prev, entry_date: e.target.value }))}
            />
          </Field>

          <Field label="Alasan Konfirmasi Masuk" error={formErrors.alasan}>
            <Input
              value={confirmForm.alasan}
              onChange={(e) => setConfirmForm((prev) => ({ ...prev, alasan: e.target.value }))}
              placeholder="Mis: Pendampingan nutrisi & edukasi orang tua"
            />
          </Field>

          <Field label="Catatan Tambahan (Opsional)" error={formErrors.notes}>
            <Textarea
              rows={2}
              value={confirmForm.notes}
              onChange={(e) => setConfirmForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Rencana PMT atau saran dari kader..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setConfirmModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <Button type="submit" loading={submitting} className="bg-teal-600 hover:bg-teal-700 text-white">
              Konfirmasi Mulai
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 2: TOLAK KANDIDAT */}
      <Modal open={rejectModalOpen} onClose={() => setRejectModalOpen(false)} title="Selesaikan Pencatatan Kandidat">
        <form onSubmit={handleSubmitReject} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Kandidat untuk <strong>{selectedEnrollment?.child?.nama_lengkap}</strong> tidak dimasukkan ke program. Mohon
            sertakan pertimbangannya.
          </p>

          <Field label="Alasan / Pertimbangan (Wajib)" error={formErrors.alasan_keluar} required>
            <Input
              value={rejectForm.alasan_keluar}
              onChange={(e) => setRejectForm((prev) => ({ ...prev, alasan_keluar: e.target.value }))}
              placeholder="Mis: Terjadi kesalahan penimbangan / sudah ditangani puskesmas..."
            />
          </Field>

          <Field label="Catatan Tambahan (Opsional)" error={formErrors.notes}>
            <Textarea
              rows={2}
              value={rejectForm.notes}
              onChange={(e) => setRejectForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Informasi pelengkap..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setRejectModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <Button type="submit" loading={submitting} className="bg-slate-700 hover:bg-slate-800 text-white">
              Simpan
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 3: KELUAR PROGRAM (GRADUATED / CANCELLED) */}
      <Modal open={exitModalOpen} onClose={() => setExitModalOpen(false)} title="Penyelesaian Program Pendampingan">
        <form onSubmit={handleSubmitExit} className="space-y-4 text-xs">
          <p className="text-slate-600">
            Perubahan status pendampingan untuk <strong>{selectedEnrollment?.child?.nama_lengkap}</strong>.
          </p>

          <Field label="Status Akhir" error={formErrors.status} required>
            <Select
              value={exitForm.status}
              onChange={(e) => setExitForm((prev) => ({ ...prev, status: e.target.value as any }))}
            >
              <option value="graduated">Lulus Program (Tumbuh Kembang Optimal)</option>
              <option value="cancelled">Dialihkan / Pindah Domisili / Penanganan Lain</option>
            </Select>
          </Field>

          <Field label="Tanggal Selesai" error={formErrors.exit_date} required>
            <Input
              type="date"
              value={exitForm.exit_date}
              onChange={(e) => setExitForm((prev) => ({ ...prev, exit_date: e.target.value }))}
            />
          </Field>

          <Field label="Alasan / Evaluasi Akhir (Wajib)" error={formErrors.alasan_keluar} required>
            <Input
              value={exitForm.alasan_keluar}
              onChange={(e) => setExitForm((prev) => ({ ...prev, alasan_keluar: e.target.value }))}
              placeholder="Mis: Pertumbuhan stabil dan berat badan naik sesuai grafik"
            />
          </Field>

          <Field label="Catatan Tambahan (Opsional)" error={formErrors.notes}>
            <Textarea
              rows={2}
              value={exitForm.notes}
              onChange={(e) => setExitForm((prev) => ({ ...prev, notes: e.target.value }))}
              placeholder="Pesan untuk orang tua atau arahan selanjutnya..."
            />
          </Field>

          <div className="flex justify-end gap-2 pt-2 border-t">
            <button
              type="button"
              onClick={() => setExitModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-50 font-medium"
            >
              Batal
            </button>
            <Button
              type="submit"
              loading={submitting}
              className={
                exitForm.status === 'graduated'
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-slate-700 hover:bg-slate-800 text-white'
              }
            >
              Simpan Status
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL 4: RIWAYAT AUDIT LOG STATUS */}
      <Modal
        open={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        title={`Riwayat Pendampingan: ${selectedEnrollment?.child?.nama_lengkap || ''}`}
      >
        <div className="space-y-3 text-xs">
          {loadingHistory ? (
            <div className="py-8 text-center">
              <Spinner />
              <p className="text-slate-500 mt-2">Memuat riwayat perubahan status...</p>
            </div>
          ) : historyItems.length === 0 ? (
            <p className="text-slate-500 text-center py-6">Belum ada catatan riwayat perubahan status.</p>
          ) : (
            <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
              {historyItems.map((h, idx) => (
                <div key={h.id || idx} className="relative">
                  <div className="absolute -left-6 top-1 w-3 h-3 rounded-full bg-teal-600 border-2 border-white ring-2 ring-teal-100" />
                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex justify-between items-center gap-2">
                      <span className="font-bold text-slate-800">
                        {(h.status_baru && (SPECIAL_CARE_STATUS_LABEL as Record<string, string>)[h.status_baru]) || h.status_baru || h.action}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {h.kapan ? formatDate(h.kapan.split('T')[0]) : '-'}
                      </span>
                    </div>

                    <p className="text-slate-600 mt-1">
                      <span className="font-semibold text-slate-700">Oleh: </span>
                      {h.siapa?.nama} ({h.siapa?.role || 'Sistem'})
                    </p>

                    {h.alasan && (
                      <p className="text-slate-700 mt-1 bg-white p-2 rounded-lg border border-slate-100">
                        <span className="font-semibold text-slate-800">Keterangan: </span>
                        {h.alasan}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t">
            <button
              type="button"
              onClick={() => setHistoryModalOpen(false)}
              className="px-4 py-2 rounded-xl border text-slate-600 hover:bg-slate-50 font-medium"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
