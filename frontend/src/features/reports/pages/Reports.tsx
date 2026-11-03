import { useCallback, useEffect, useMemo, useState } from 'react'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import {
  Button,
  EmptyState,
  ErrorState,
  Field,
  Input,
  Select,
  Spinner,
  AccessDeniedState,
} from '@/shared/components/ui/field'
import { StatusBadge } from '@/shared/components/ui/badge'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { useToast } from '@/shared/components/ui/toast'
import {
  apiReports,
  apiPosyandu,
  apiErrorMessage,
  extractBlobErrorMessage,
} from '@/shared/lib/api'
import type { Posyandu, PosyanduRef } from '@/shared/types'

const REPORT_TABS = [
  { id: 'anak', label: 'Data Anak', icon: '👶' },
  { id: 'pemeriksaan', label: 'Pemeriksaan Fisik', icon: '🩺' },
  { id: 'pertumbuhan', label: 'Pertumbuhan & Gizi', icon: '📈' },
  { id: 'imunisasi', label: 'Imunisasi & Vitamin', icon: '💉' },
  { id: 'follow-up', label: 'Tindak Lanjut', icon: '📋' },
  { id: 'bumil', label: 'Kesehatan Ibu Hamil', icon: '🤰' },
  { id: 'statistik', label: 'Ringkasan Statistik', icon: '📊' },
] as const

type ReportTabId = (typeof REPORT_TABS)[number]['id']

type StatData = {
  total_anak?: number
  total_pemeriksaan?: number
  total_imunisasi?: number
  total_vitamin?: number
  total_ibu_hamil?: number
  total_kader?: number
  total_followup_pending?: number
  per_posyandu?: Array<{
    id: number
    nama_posyandu: string
    kode_posyandu?: string
    children_count?: number
    examinations_count?: number
    kaders_count?: number
    ibu_hamils_count?: number
  }>
}

export default function Reports() {
  const { user, role, isAdmin } = useAuth()
  const toast = useToast()

  const hasAccess = can(role, 'view-laporan')

  const [active, setActive] = useState<ReportTabId>('anak')
  const [posyanduList, setPosyanduList] = useState<Array<Posyandu | PosyanduRef>>([])

  const [filters, setFilters] = useState({
    posyandu_id: '',
    from: '',
    to: '',
    status: '',
    jenis_kelamin: '',
    jenis: '',
    search: '',
  })

  const [page, setPage] = useState(1)
  const [reportData, setReportData] = useState<unknown>(null)
  const [reportMeta, setReportMeta] = useState<{ total?: number } | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState<'csv' | 'excel' | 'pdf' | null>(null)

  // Inisialisasi daftar posyandu yang diizinkan sesuai role
  useEffect(() => {
    if (!hasAccess) return

    if (isAdmin) {
      // Admin: Ambil semua posyandu
      apiPosyandu
        .list({ per_page: 100 })
        .then(({ data }) => setPosyanduList(data))
        .catch(() => setPosyanduList([]))
    } else {
      // Kader: Hanya posyandu binaan yang terdaftar pada profil user
      const assigned = user?.posyandus ?? []
      setPosyanduList(assigned)
      if (assigned.length === 1) {
        setFilters((prev) => ({ ...prev, posyandu_id: String(assigned[0].id) }))
      }
    }
  }, [hasAccess, isAdmin, user])

  const loadData = useCallback(
    async (targetPage = page) => {
      setLoading(true)
      setError(null)
      try {
        const params: Record<string, unknown> = {
          page: targetPage,
        }
        if (filters.posyandu_id) params.posyandu_id = filters.posyandu_id
        if (filters.from) params.from = filters.from
        if (filters.to) params.to = filters.to
        if (filters.status) params.status = filters.status
        if (filters.jenis_kelamin && active === 'anak') params.jenis_kelamin = filters.jenis_kelamin
        if (filters.jenis && active === 'imunisasi') params.jenis = filters.jenis
        if (filters.search) params.search = filters.search

        const res = await apiReports.get(active, params)
        setReportData(res.data)
        setReportMeta((res.meta as { total?: number }) ?? null)
      } catch (err: unknown) {
        const msg = apiErrorMessage(err, 'Gagal memuat data laporan.')
        setError(msg)
        toast.show(msg, 'error')
      } finally {
        setLoading(false)
      }
    },
    [active, filters, page, toast]
  )

  useEffect(() => {
    if (hasAccess) {
      void loadData(1)
    }
  }, [active, filters.posyandu_id, hasAccess])

  const handleExport = async (format: 'csv' | 'excel' | 'pdf') => {
    setExporting(format)
    try {
      const params: Record<string, unknown> = {
        export: format,
      }
      if (filters.posyandu_id) params.posyandu_id = filters.posyandu_id
      if (filters.from) params.from = filters.from
      if (filters.to) params.to = filters.to
      if (filters.status) params.status = filters.status
      if (filters.jenis_kelamin && active === 'anak') params.jenis_kelamin = filters.jenis_kelamin
      if (filters.jenis && active === 'imunisasi') params.jenis = filters.jenis
      if (filters.search) params.search = filters.search

      const res = await apiReports.download(active, params)

      // Deteksi jika server mengembalikan error berformat JSON di dalam Blob
      if (res.data?.type === 'application/json') {
        const text = await res.data.text()
        const json = JSON.parse(text)
        if (!json.success) {
          throw new Error(json.message || 'Gagal mengekspor laporan.')
        }
      }

      const mimeTypes: Record<string, string> = {
        csv: 'text/csv;charset=utf-8;',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        pdf: 'application/pdf',
      }
      const ext = format === 'excel' ? 'xlsx' : format
      const blob = new Blob([res.data], { type: mimeTypes[format] || 'application/octet-stream' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      // Nama berkas standar dan generik, BEBAS dari PII (nama anak / NIK)
      a.download = `laporan-${active}-${new Date().toISOString().slice(0, 10)}.${ext}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      window.URL.revokeObjectURL(url)

      toast.show(`Laporan ${active} (${format.toUpperCase()}) berhasil diunduh.`)
    } catch (err: unknown) {
      const msg = await extractBlobErrorMessage(err, `Gagal mengekspor laporan ${active}.`)
      toast.show(msg, 'error')
    } finally {
      setExporting(null)
    }
  }

  // Ekstraksi baris data tabular
  const rows = useMemo<Record<string, any>[]>(() => {
    if (!reportData) return []
    if (Array.isArray(reportData)) return reportData
    if (typeof reportData === 'object' && reportData !== null) {
      const obj = reportData as Record<string, any>
      if (Array.isArray(obj.data)) return obj.data
    }
    return []
  }, [reportData])

  // Ekstraksi pagination
  const pagination = useMemo(() => {
    if (!reportData || typeof reportData !== 'object') {
      return { total: rows.length, currentPage: page, lastPage: 1 }
    }
    const obj = reportData as Record<string, any>
    if (typeof obj.current_page === 'number' && typeof obj.last_page === 'number') {
      return {
        total: typeof obj.total === 'number' ? obj.total : rows.length,
        currentPage: obj.current_page,
        lastPage: obj.last_page,
      }
    }
    if (reportMeta && typeof reportMeta.total === 'number') {
      return {
        total: reportMeta.total,
        currentPage: 1,
        lastPage: 1,
      }
    }
    return { total: rows.length, currentPage: 1, lastPage: 1 }
  }, [reportData, reportMeta, rows.length, page])

  if (!hasAccess) {
    return (
      <AccessDeniedState
        title="Akses Laporan Ditolak"
        message="Halaman dan menu laporan hanya dapat diakses oleh Admin dan Kader Posyandu."
      />
    )
  }

  const statData = active === 'statistik' ? (reportData as StatData) : null

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Laporan & Ekspor</h1>
          <p className="text-sm text-slate-500 mt-1">
            Rekapitulasi dan unduhan data operasional Posyandu dalam format CSV, Excel, dan PDF.
          </p>
        </div>
      </div>

      {/* Tabs Domain Laporan */}
      <Card>
        <CardContent className="p-3">
          <div className="flex flex-wrap gap-2">
            {REPORT_TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  setActive(t.id)
                  setPage(1)
                  setReportData(null)
                }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition ${
                  active === t.id
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white text-slate-700 hover:bg-slate-50 border border-slate-200'
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Filter Bar */}
      <Card>
        <CardHeader title="Filter Laporan" />
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Filter Posyandu: strictly scoped for Kader */}
            <Field label="Posyandu">
              <Select
                value={filters.posyandu_id}
                onChange={(e) => {
                  setFilters({ ...filters, posyandu_id: e.target.value })
                  setPage(1)
                }}
              >
                {isAdmin ? (
                  <option value="">Semua Posyandu</option>
                ) : posyanduList.length > 1 ? (
                  <option value="">Semua Posyandu Binaan</option>
                ) : null}
                {posyanduList.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_posyandu}
                  </option>
                ))}
              </Select>
            </Field>

            {/* Filter Tanggal */}
            {active !== 'statistik' && (
              <>
                <Field label="Dari Tanggal">
                  <Input
                    type="date"
                    value={filters.from}
                    onChange={(e) => setFilters({ ...filters, from: e.target.value })}
                  />
                </Field>
                <Field label="Sampai Tanggal">
                  <Input
                    type="date"
                    value={filters.to}
                    onChange={(e) => setFilters({ ...filters, to: e.target.value })}
                  />
                </Field>
              </>
            )}

            {/* Filter Jenis Kelamin (Khusus Anak) */}
            {active === 'anak' && (
              <Field label="Jenis Kelamin">
                <Select
                  value={filters.jenis_kelamin}
                  onChange={(e) => setFilters({ ...filters, jenis_kelamin: e.target.value })}
                >
                  <option value="">Semua Jenis Kelamin</option>
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </Select>
              </Field>
            )}

            {/* Filter Jenis Pemberian (Khusus Imunisasi) */}
            {active === 'imunisasi' && (
              <Field label="Jenis Pemberian">
                <Select
                  value={filters.jenis}
                  onChange={(e) => setFilters({ ...filters, jenis: e.target.value })}
                >
                  <option value="">Semua (Vaksin & Vitamin)</option>
                  <option value="VAKSIN">Vaksin</option>
                  <option value="VITAMIN">Vitamin</option>
                </Select>
              </Field>
            )}

            {/* Filter Status Sesuai Domain */}
            {active !== 'statistik' && active !== 'pertumbuhan' && (
              <Field label="Status">
                <Select
                  value={filters.status}
                  onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                >
                  <option value="">Semua Status</option>
                  {active === 'anak' && (
                    <>
                      <option value="active">Aktif</option>
                      <option value="inactive">Tidak Aktif</option>
                    </>
                  )}
                  {active === 'pemeriksaan' && (
                    <>
                      <option value="active">Aktif</option>
                      <option value="voided">Dibatalkan</option>
                    </>
                  )}
                  {active === 'imunisasi' && (
                    <>
                      <option value="sudah">Sudah Diberikan</option>
                      <option value="belum">Belum Diberikan</option>
                      <option value="terjadwal">Terjadwal</option>
                    </>
                  )}
                  {active === 'follow-up' && (
                    <>
                      <option value="pending">Menunggu (Pending)</option>
                      <option value="in_progress">Dalam Proses</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </>
                  )}
                  {active === 'bumil' && (
                    <>
                      <option value="active">Hamil Aktif</option>
                      <option value="completed">Sudah Melahirkan</option>
                    </>
                  )}
                </Select>
              </Field>
            )}

            {/* Pencarian Nama */}
            {(active === 'anak' || active === 'bumil') && (
              <Field label={active === 'anak' ? 'Cari Nama Anak' : 'Cari Nama Ibu'}>
                <Input
                  type="text"
                  placeholder="Ketik nama..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                />
              </Field>
            )}
          </div>

          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const defaultPosyandu = !isAdmin && posyanduList.length === 1 ? String(posyanduList[0].id) : ''
                setFilters({
                  posyandu_id: defaultPosyandu,
                  from: '',
                  to: '',
                  status: '',
                  jenis_kelamin: '',
                  jenis: '',
                  search: '',
                })
                setPage(1)
              }}
            >
              Reset Filter
            </Button>
            <Button size="sm" onClick={() => loadData(1)} loading={loading}>
              Terapkan Filter
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Konten Laporan */}
      <Card>
        <CardHeader
          title={`Hasil Laporan: ${REPORT_TABS.find((t) => t.id === active)?.label}`}
          action={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('csv')}
                loading={exporting === 'csv'}
                disabled={loading || !!exporting}
              >
                Unduh CSV
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleExport('excel')}
                loading={exporting === 'excel'}
                disabled={loading || !!exporting}
              >
                Unduh Excel
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => handleExport('pdf')}
                loading={exporting === 'pdf'}
                disabled={loading || !!exporting}
              >
                Unduh PDF
              </Button>
            </div>
          }
        />
        <CardContent>
          {loading ? (
            <Spinner label="Memuat data laporan..." />
          ) : error ? (
            <ErrorState message={error} onRetry={() => loadData(page)} />
          ) : active === 'statistik' && statData ? (
            <div className="space-y-6">
              {/* Kartu Ringkasan Statistik */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="p-4 rounded-2xl bg-teal-50 border border-teal-100">
                  <p className="text-xs font-medium text-teal-700">Total Anak Terdaftar</p>
                  <p className="text-2xl font-bold text-teal-900 mt-1">{statData.total_anak ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-blue-50 border border-blue-100">
                  <p className="text-xs font-medium text-blue-700">Total Pemeriksaan</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">{statData.total_pemeriksaan ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-indigo-50 border border-indigo-100">
                  <p className="text-xs font-medium text-indigo-700">Total Imunisasi</p>
                  <p className="text-2xl font-bold text-indigo-900 mt-1">{statData.total_imunisasi ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-xs font-medium text-amber-700">Total Vitamin Diberikan</p>
                  <p className="text-2xl font-bold text-amber-900 mt-1">{statData.total_vitamin ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-pink-50 border border-pink-100">
                  <p className="text-xs font-medium text-pink-700">Total Ibu Hamil</p>
                  <p className="text-2xl font-bold text-pink-900 mt-1">{statData.total_ibu_hamil ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-100">
                  <p className="text-xs font-medium text-emerald-700">Total Kader Aktif</p>
                  <p className="text-2xl font-bold text-emerald-900 mt-1">{statData.total_kader ?? 0}</p>
                </div>
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-100">
                  <p className="text-xs font-medium text-rose-700">Tindak Lanjut Pending</p>
                  <p className="text-2xl font-bold text-rose-900 mt-1">{statData.total_followup_pending ?? 0}</p>
                </div>
              </div>

              {/* Rincian Per Posyandu */}
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-3">Distribusi per Posyandu</h3>
                <div className="overflow-x-auto rounded-xl border border-slate-200">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3">Nama Posyandu</th>
                        <th className="px-4 py-3">Kode</th>
                        <th className="px-4 py-3 text-right">Anak</th>
                        <th className="px-4 py-3 text-right">Pemeriksaan</th>
                        <th className="px-4 py-3 text-right">Kader</th>
                        <th className="px-4 py-3 text-right">Ibu Hamil</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 bg-white">
                      {statData.per_posyandu?.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50/50">
                          <td className="px-4 py-3 font-medium text-slate-900">{p.nama_posyandu}</td>
                          <td className="px-4 py-3 text-slate-500">{p.kode_posyandu || '-'}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{p.children_count ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{p.examinations_count ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{p.kaders_count ?? 0}</td>
                          <td className="px-4 py-3 text-right text-slate-700">{p.ibu_hamils_count ?? 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : rows.length === 0 ? (
            <EmptyState
              title="Tidak ada data laporan"
              description="Tidak ditemukan data yang sesuai dengan kriteria filter yang Anda pilih."
            />
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-xs font-medium text-slate-500 uppercase tracking-wider border-b border-slate-200">
                    {active === 'anak' && (
                      <tr>
                        <th className="px-4 py-3">Nama Lengkap</th>
                        <th className="px-4 py-3">NIK</th>
                        <th className="px-4 py-3">No. KK</th>
                        <th className="px-4 py-3">JK</th>
                        <th className="px-4 py-3">TTL</th>
                        <th className="px-4 py-3">Posyandu</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    )}
                    {(active === 'pemeriksaan' || active === 'pertumbuhan') && (
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Nama Anak</th>
                        <th className="px-4 py-3">Posyandu</th>
                        <th className="px-4 py-3 text-right">BB</th>
                        <th className="px-4 py-3 text-right">TB/PB</th>
                        <th className="px-4 py-3 text-right">LK</th>
                        <th className="px-4 py-3 text-right">LiLA</th>
                      </tr>
                    )}
                    {active === 'imunisasi' && (
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Nama Anak</th>
                        <th className="px-4 py-3">Jenis</th>
                        <th className="px-4 py-3">Vaksin / Vitamin</th>
                        <th className="px-4 py-3">Dosis</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Catatan</th>
                      </tr>
                    )}
                    {active === 'follow-up' && (
                      <tr>
                        <th className="px-4 py-3">Tanggal</th>
                        <th className="px-4 py-3">Nama Anak</th>
                        <th className="px-4 py-3">Posyandu</th>
                        <th className="px-4 py-3">Tipe</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3">Catatan</th>
                      </tr>
                    )}
                    {active === 'bumil' && (
                      <tr>
                        <th className="px-4 py-3">Nama Ibu Hamil</th>
                        <th className="px-4 py-3">Posyandu</th>
                        <th className="px-4 py-3">Usia Kehamilan</th>
                        <th className="px-4 py-3">Trimester</th>
                        <th className="px-4 py-3">Perkiraan Lahir</th>
                        <th className="px-4 py-3">Tekanan Darah</th>
                        <th className="px-4 py-3">Berat Badan</th>
                        <th className="px-4 py-3">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {rows.map((row: any, idx: number) => {
                      const key = row.id ?? idx
                      if (active === 'anak') {
                        return (
                          <tr key={key} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">{row.nama_lengkap}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{row.nik || '-'}</td>
                            <td className="px-4 py-3 text-slate-600 font-mono text-xs">{row.nomor_kk || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">
                              {row.jenis_kelamin === 'L' ? 'Laki-laki' : row.jenis_kelamin === 'P' ? 'Perempuan' : row.jenis_kelamin}
                            </td>
                            <td className="px-4 py-3 text-slate-600 text-xs">
                              {row.tempat_lahir ? `${row.tempat_lahir}, ${row.tanggal_lahir || ''}` : row.tanggal_lahir || '-'}
                            </td>
                            <td className="px-4 py-3 text-slate-700">{row.posyandu?.nama_posyandu || '-'}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                          </tr>
                        )
                      }
                      if (active === 'pemeriksaan' || active === 'pertumbuhan') {
                        const rec = row.growth_record || row.growthRecord
                        return (
                          <tr key={key} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600 text-xs">{row.examination_date || '-'}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.child?.nama_lengkap || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{row.posyandu?.nama_posyandu || '-'}</td>
                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                              {rec?.weight != null ? `${rec.weight} kg` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                              {rec?.height != null ? `${rec.height} cm` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                              {rec?.head_circumference != null ? `${rec.head_circumference} cm` : '-'}
                            </td>
                            <td className="px-4 py-3 text-right text-slate-700 font-medium">
                              {rec?.arm_circumference != null ? `${rec.arm_circumference} cm` : '-'}
                            </td>
                          </tr>
                        )
                      }
                      if (active === 'imunisasi') {
                        return (
                          <tr key={key} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600 text-xs">{row.vaccination_date || '-'}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.child?.nama_lengkap || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">
                              <span
                                className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                                  row.jenis === 'VAKSIN' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                                }`}
                              >
                                {row.jenis}
                              </span>
                            </td>
                            <td className="px-4 py-3 font-medium text-slate-800">{row.vaccine_name || '-'}</td>
                            <td className="px-4 py-3 text-slate-600">{row.dose ? `Dosis ${row.dose}` : '-'}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-xs">{row.notes || '-'}</td>
                          </tr>
                        )
                      }
                      if (active === 'follow-up') {
                        return (
                          <tr key={key} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 text-slate-600 text-xs">{row.follow_up_date || '-'}</td>
                            <td className="px-4 py-3 font-medium text-slate-900">{row.child?.nama_lengkap || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{row.posyandu?.nama_posyandu || '-'}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{row.type || '-'}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={row.status} />
                            </td>
                            <td className="px-4 py-3 text-slate-500 text-xs truncate max-w-xs">{row.notes || '-'}</td>
                          </tr>
                        )
                      }
                      if (active === 'bumil') {
                        const exam = row.pemeriksaan_terakhir || (Array.isArray(row.pemeriksaan_bumils) && row.pemeriksaan_bumils[0])
                        return (
                          <tr key={key} className="hover:bg-slate-50/50">
                            <td className="px-4 py-3 font-medium text-slate-900">{row.parent?.nama_lengkap || row.nama_lengkap || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{row.posyandu?.nama_posyandu || '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{row.usia_kehamilan ? `${row.usia_kehamilan} minggu` : '-'}</td>
                            <td className="px-4 py-3 text-slate-700">{row.trimester ? `Trimester ${row.trimester}` : '-'}</td>
                            <td className="px-4 py-3 text-slate-600 text-xs">{row.tanggal_perkiraan_lahir || '-'}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{exam?.tekanan_darah || '-'}</td>
                            <td className="px-4 py-3 text-slate-700 font-medium">{exam?.berat_badan ? `${exam.berat_badan} kg` : '-'}</td>
                            <td className="px-4 py-3">
                              <StatusBadge status={exam?.status || row.status || 'active'} />
                            </td>
                          </tr>
                        )
                      }
                      return null
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              {pagination.lastPage > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <p className="text-xs text-slate-500">
                    Menampilkan halaman <span className="font-medium text-slate-700">{pagination.currentPage}</span> dari{' '}
                    <span className="font-medium text-slate-700">{pagination.lastPage}</span> (Total {pagination.total} data)
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.currentPage <= 1 || loading}
                      onClick={() => {
                        const prev = pagination.currentPage - 1
                        setPage(prev)
                        void loadData(prev)
                      }}
                    >
                      Sebelumnya
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={pagination.currentPage >= pagination.lastPage || loading}
                      onClick={() => {
                        const next = pagination.currentPage + 1
                        setPage(next)
                        void loadData(next)
                      }}
                    >
                      Selanjutnya
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

