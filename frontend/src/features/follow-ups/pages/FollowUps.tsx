import { useEffect, useMemo, useState } from 'react'
import { api, apiErrorMessage, apiValidationErrors } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge } from "@/shared/components/ui/badge"
import { Button, Field, Input, Select, Textarea } from "@/shared/components/ui/field"
import { CardSkeleton, TableSkeleton } from "@/shared/components/ui/Skeleton"
import { useToast } from "@/shared/components/ui/toast"
import { formatDate } from "@/shared/lib/utils"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'

const FOLLOWUP_STATUS_LABEL: Record<string, string> = {
  pending: 'Menunggu',
  in_progress: 'Dalam Proses',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
}

const FOLLOWUP_STATUS_CLASS: Record<string, string> = {
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-teal-50 text-teal-700 border-teal-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-slate-100 text-slate-700 border-slate-200',
}

export default function FollowUps() {
  const toast = useToast()
  // Orang tua hanya boleh melihat, tidak boleh menambah atau mengubah status.
  const { role } = useAuth()
  const canManage = can(role, 'manage-followup')
  const [data, setData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [children, setChildren] = useState<any[]>([])
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [show, setShow] = useState(false)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    child_id: '',
    posyandu_id: '',
    type: '',
    status: 'pending',
    follow_up_date: new Date().toISOString().slice(0, 10),
    notes: '',
  })

  const fetch = async () => {
    try {
      setLoading(true)
      const r = await api.get('/follow-ups', { params: { per_page: 50 } })
      setData(r.data.data?.data || r.data.data || [])
    } catch {} finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetch()
    api.get('/children', { params: { per_page: 100 } }).then((r) => setChildren(r.data.data || [])).catch(() => {})
    api.get('/posyandu', { params: { per_page: 100 } }).then((r) => setPosyandus(r.data.data?.data || r.data.data || [])).catch(() => {})
  }, [])

  const openModal = () => {
    setForm({
      child_id: '',
      posyandu_id: '',
      type: '',
      status: 'pending',
      follow_up_date: new Date().toISOString().slice(0, 10),
      notes: '',
    })
    setFormError(null)
    setErrors({})
    setShow(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.child_id) errs.child_id = 'Anak wajib dipilih.'
    if (!form.posyandu_id) errs.posyandu_id = 'Posyandu wajib dipilih.'
    if (!form.type.trim()) errs.type = 'Tipe tindak lanjut wajib diisi.'
    if (!form.follow_up_date) errs.follow_up_date = 'Tanggal tindak lanjut wajib diisi.'

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon lengkapi formulir.')
      return
    }

    setSaving(true)
    try {
      await api.post('/follow-ups', {
        child_id: parseInt(form.child_id, 10),
        posyandu_id: parseInt(form.posyandu_id, 10),
        type: form.type.trim(),
        status: form.status,
        follow_up_date: form.follow_up_date,
        notes: form.notes ? form.notes.trim() : null,
      })
      toast.show('Berhasil disimpan')
      setShow(false)
      fetch()
    } catch (err: any) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const updateStatus = async (id: number, status: string) => {
    try {
      await api.put(`/follow-ups/${id}`, { status })
      toast.show('Status diperbarui')
      fetch()
    } catch {
      toast.show('Gagal memperbarui status', 'error')
    }
  }

  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')
  const [selectedPosyandu, setSelectedPosyandu] = useState<string>('all')

  const stats = useMemo(() => {
    const total = data.length
    const pending = data.filter((d) => d.status === 'pending').length
    const inProgress = data.filter((d) => d.status === 'in_progress').length
    const completed = data.filter((d) => d.status === 'completed').length
    return { total, pending, inProgress, completed }
  }, [data])

  const filteredData = useMemo(() => {
    return data.filter((item: any) => {
      const childName = (item.child?.nama_lengkap || '').toLowerCase()
      const type = (item.type || '').toLowerCase()
      const query = search.toLowerCase()
      const matchSearch = query === '' || childName.includes(query) || type.includes(query)
      const matchStatus = selectedStatus === 'all' || item.status === selectedStatus
      const matchPosyandu = selectedPosyandu === 'all' || String(item.posyandu_id) === selectedPosyandu
      return matchSearch && matchStatus && matchPosyandu
    })
  }, [data, search, selectedStatus, selectedPosyandu])

  return (
    <div className="space-y-5 pb-24 md:pb-8">
      {/* Header Section (Desktop & Mobile) */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tindak Lanjut</h1>
          <p className="text-sm text-slate-500 mt-0.5">Pemantauan dan rujukan kesehatan anak posyandu</p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={openModal}
            className="hidden md:inline-flex items-center justify-center gap-2 h-11 px-5 bg-teal-600 hover:bg-teal-700 active:bg-teal-800 text-white text-sm font-semibold rounded-xl shadow-sm transition-colors"
          >
            <span className="text-lg leading-none font-bold">+</span>
            <span>Tambah Tindak Lanjut</span>
          </button>
        )}
      </div>

      {/* 1. DESKTOP KPI CARDS (Hidden on mobile, visible on >= md) */}
      <div className="hidden md:grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-700 font-bold flex items-center justify-center text-xl shrink-0">
            📋
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Kasus</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.total}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 font-bold flex items-center justify-center text-xl shrink-0">
            ⏳
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-amber-600">Menunggu Tindakan</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.pending}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-teal-50 text-teal-600 font-bold flex items-center justify-center text-xl shrink-0">
            🩺
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-teal-600">Dalam Proses</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.inProgress}</p>
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 font-bold flex items-center justify-center text-xl shrink-0">
            ✅
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-emerald-600">Kasus Selesai</p>
            <p className="text-2xl font-black text-slate-900 mt-1">{stats.completed}</p>
          </div>
        </div>
      </div>

      {/* 2. DESKTOP FILTER BAR (Hidden on mobile, visible on >= md) */}
      <div className="hidden md:flex items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-2xl mb-6 shadow-sm">
        {/* Kolom Search (Kiri) */}
        <div className="relative w-full max-w-md">
          <input
            type="text"
            placeholder="Cari nama anak, tipe rujukan, atau catatan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md h-11 pl-10 pr-4 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50 hover:bg-white focus:bg-white transition"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">
            🔍
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Filter Status/Posyandu (Kanan) */}
        <div className="flex items-center gap-2.5">
          {posyandus.length > 0 && (
            <select
              value={selectedPosyandu}
              onChange={(e) => setSelectedPosyandu(e.target.value)}
              className="h-11 px-3 rounded-xl border border-slate-200 bg-white text-sm font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500"
            >
              <option value="all">Semua Posyandu</option>
              {posyandus.map((p: any) => (
                <option key={p.id} value={String(p.id)}>
                  {p.nama_posyandu}
                </option>
              ))}
            </select>
          )}

          <div className="flex items-center gap-1.5 bg-slate-100/70 p-1 rounded-xl">
            {[
              { id: 'all', label: 'Semua' },
              { id: 'pending', label: 'Menunggu' },
              { id: 'in_progress', label: 'Proses' },
              { id: 'completed', label: 'Selesai' },
              { id: 'cancelled', label: 'Batal' },
            ].map((pill) => {
              const isActive = selectedStatus === pill.id
              return (
                <button
                  key={pill.id}
                  type="button"
                  onClick={() => setSelectedStatus(pill.id)}
                  className={`h-9 px-3 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? 'bg-white text-teal-700 shadow-sm'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                  }`}
                >
                  {pill.label}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* FILTER & PENCARIAN KHUSUS MOBILE (< md) */}
      <div className="block md:hidden space-y-3">
        <div className="relative">
          <input
            type="text"
            placeholder="Cari nama anak atau tipe rujukan..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-12 py-3 pl-11 pr-10 bg-white border border-slate-200 rounded-xl text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
          />
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-base pointer-events-none">
            🔍
          </span>
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 text-sm"
            >
              ✕
            </button>
          )}
        </div>

        <div className="flex overflow-x-auto gap-2 pb-2 snap-x scrollbar-none">
          {[
            { id: 'all', label: 'Semua Status' },
            { id: 'pending', label: 'Menunggu' },
            { id: 'in_progress', label: 'Dalam Proses' },
            { id: 'completed', label: 'Selesai' },
            { id: 'cancelled', label: 'Dibatalkan' },
          ].map((pill) => {
            const isActive = selectedStatus === pill.id
            return (
              <button
                key={pill.id}
                type="button"
                onClick={() => setSelectedStatus(pill.id)}
                className={`h-10 px-4 rounded-full whitespace-nowrap text-sm font-medium transition-colors shrink-0 snap-start ${
                  isActive
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
                }`}
              >
                {pill.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading ? (
        <>
          <TableSkeleton rows={5} cols={5} className="hidden md:block" />
          <CardSkeleton count={4} className="block md:hidden" />
        </>
      ) : (
        <>
          {/* State Kosong */}
          {filteredData.length === 0 && (
            <div className="p-10 text-center bg-white rounded-2xl border border-dashed border-slate-200">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-base font-semibold text-slate-800">Tidak ada data tindak lanjut</p>
              <p className="text-sm text-slate-500 mt-1 max-w-sm mx-auto">
                {search ? 'Tidak ditemukan data yang sesuai kata kunci pencarian.' : 'Belum ada agenda tindak lanjut.'}
              </p>
            </div>
          )}

          {/* 3. TAMPILAN DESKTOP DATAGRID (Tabel) (>= md) */}
          <div className="hidden md:block overflow-x-auto w-full">
        <div className="border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left border-collapse">
              <thead className="bg-slate-50 border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
                    Profil Anak
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
                    Tipe Tindak Lanjut
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
                    Tanggal Jadwal
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-left">
                    Status
                  </th>
                  <th className="px-5 py-3 text-xs font-bold uppercase tracking-wider text-slate-500 text-right">
                    Aksi Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredData.map((f: any) => {
                  const childName = f.child?.nama_lengkap || `Anak #${f.child_id}`
                  const initials = (childName.trim().slice(0, 2) || 'AN').toUpperCase()

                  return (
                    <tr key={f.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-50 last:border-0">
                      {/* Kolom Profil Anak: Flex horizontal */}
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center shrink-0">
                            {initials}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 leading-snug">{childName}</p>
                            <p className="text-xs text-slate-400 font-mono mt-0.5">NIK: {f.child?.nik || '-'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Kolom Tipe Tindak Lanjut */}
                      <td className="px-5 py-4 max-w-xs">
                        <span className="font-semibold text-teal-900 bg-teal-50/80 px-2.5 py-1 rounded-lg text-xs border border-teal-100 inline-block">
                          {f.type}
                        </span>
                        {f.notes && (
                          <p className="text-xs text-slate-500 mt-1 line-clamp-1 italic">
                            "{f.notes}"
                          </p>
                        )}
                      </td>

                      {/* Kolom Tanggal */}
                      <td className="px-5 py-4 text-xs font-semibold text-slate-700 font-mono">
                        {formatDate(f.follow_up_date)}
                      </td>

                      {/* Kolom Status Badge */}
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border ${
                            FOLLOWUP_STATUS_CLASS[f.status] || 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              f.status === 'completed'
                                ? 'bg-emerald-500'
                                : f.status === 'in_progress'
                                ? 'bg-teal-500'
                                : f.status === 'pending'
                                ? 'bg-amber-500'
                                : 'bg-slate-400'
                            }`}
                          />
                          {FOLLOWUP_STATUS_LABEL[f.status] || f.status}
                        </span>
                      </td>

                      {/* Kolom Aksi Status (Kanan): w-[140px] h-9 fixed width */}
                      <td className="px-5 py-4 text-right">
                        {canManage ? (
                          <select
                            value={f.status}
                            onChange={(e) => updateStatus(f.id, e.target.value)}
                            className="w-[140px] h-9 text-xs font-semibold rounded-lg border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500 shadow-sm"
                          >
                            <option value="pending">Menunggu</option>
                            <option value="in_progress">Dalam Proses</option>
                            <option value="completed">Selesai</option>
                            <option value="cancelled">Dibatalkan</option>
                          </select>
                        ) : (
                          <span className="text-xs text-slate-400 font-medium">Hanya Baca</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* 4. TAMPILAN MOBILE: Card List (< md) */}
      <div className="block md:hidden">
        {filteredData.map((f: any) => {
          const childName = f.child?.nama_lengkap || `Anak #${f.child_id}`
          const initials = (childName.trim().slice(0, 2) || 'AN').toUpperCase()

          return (
            <div
              key={f.id}
              className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mb-3"
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-50 text-teal-700 font-bold flex items-center justify-center text-lg shrink-0">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-base font-bold text-slate-900 truncate">{childName}</p>
                  <p className="text-sm text-slate-500">{formatDate(f.follow_up_date)}</p>
                </div>
              </div>

              <div className="mt-3 p-3 bg-slate-50 rounded-xl">
                <p className="text-sm font-semibold text-teal-800">{f.type}</p>
                {f.notes && <p className="text-xs text-slate-600 mt-1 line-clamp-2">{f.notes}</p>}
              </div>

              <div className="mt-3 pt-3 border-t border-slate-100">
                <div className="flex flex-col gap-1.5">
                  <span className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Status:</span>
                  {canManage ? (
                    <select
                      value={f.status}
                      onChange={(e) => updateStatus(f.id, e.target.value)}
                      className="w-full h-11 px-3 rounded-xl border border-slate-200 text-sm font-medium bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                    >
                      <option value="pending">Menunggu</option>
                      <option value="in_progress">Dalam Proses</option>
                      <option value="completed">Selesai</option>
                      <option value="cancelled">Dibatalkan</option>
                    </select>
                  ) : (
                    <div className="h-11 px-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-medium text-slate-700 flex items-center">
                      {FOLLOWUP_STATUS_LABEL[f.status] || f.status}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>
      </>
      )}

      {/* CTA Tombol Tambah Mobile: Fixed Bottom Floating Target */}
      {canManage && (
        <button
          type="button"
          onClick={openModal}
          className="fixed bottom-4 left-4 right-4 z-40 h-14 bg-teal-600 active:bg-teal-700 text-white text-base font-bold rounded-2xl shadow-xl flex items-center justify-center gap-2 md:hidden"
        >
          <span className="text-xl leading-none font-bold">+</span>
          <span>Tambah Tindak Lanjut</span>
        </button>
      )}

      {/* Form Modal (Touch-friendly dialog) */}
      {canManage && show && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShow(false)} />
          <div className="relative bg-white rounded-t-3xl sm:rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-y-auto shadow-2xl z-10">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-bold text-lg text-slate-800">Tambah Tindak Lanjut</h3>
              <button
                type="button"
                onClick={() => setShow(false)}
                className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 text-base"
              >
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="space-y-4 mt-4">
              {formError && (
                <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2.5 border border-red-100">
                  {formError}
                </p>
              )}

              <Field label="Anak" required error={errors.child_id}>
                <select
                  required
                  value={form.child_id}
                  onChange={(e) => {
                    setForm({ ...form, child_id: e.target.value })
                    if (errors.child_id) setErrors({ ...errors, child_id: '' })
                  }}
                  className={`w-full h-12 px-3 rounded-xl border ${
                    errors.child_id ? 'border-red-500' : 'border-slate-200'
                  } bg-white text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                >
                  <option value="">-- Pilih Anak --</option>
                  {children.map((c: any) => (
                    <option key={c.id} value={c.id}>
                      {c.nama_lengkap} (NIK: {c.nik || '-'})
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Posyandu" required error={errors.posyandu_id}>
                <select
                  required
                  value={form.posyandu_id}
                  onChange={(e) => {
                    setForm({ ...form, posyandu_id: e.target.value })
                    if (errors.posyandu_id) setErrors({ ...errors, posyandu_id: '' })
                  }}
                  className={`w-full h-12 px-3 rounded-xl border ${
                    errors.posyandu_id ? 'border-red-500' : 'border-slate-200'
                  } bg-white text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                >
                  <option value="">-- Pilih Posyandu --</option>
                  {posyandus.map((p: any) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_posyandu}
                    </option>
                  ))}
                </select>
              </Field>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <Field label="Tipe Tindak Lanjut" required hint="Contoh: Konsultasi Gizi" error={errors.type}>
                  <input
                    required
                    placeholder="Tipe tindak lanjut"
                    value={form.type}
                    onChange={(e) => {
                      setForm({ ...form, type: e.target.value })
                      if (errors.type) setErrors({ ...errors, type: '' })
                    }}
                    className={`w-full h-12 px-3 rounded-xl border ${
                      errors.type ? 'border-red-500' : 'border-slate-200'
                    } text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                </Field>

                <Field label="Tanggal Tindak Lanjut" required error={errors.follow_up_date}>
                  <input
                    required
                    type="date"
                    value={form.follow_up_date}
                    onChange={(e) => {
                      setForm({ ...form, follow_up_date: e.target.value })
                      if (errors.follow_up_date) setErrors({ ...errors, follow_up_date: '' })
                    }}
                    className={`w-full h-12 px-3 rounded-xl border ${
                      errors.follow_up_date ? 'border-red-500' : 'border-slate-200'
                    } text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500`}
                  />
                </Field>
              </div>

              <Field label="Status" error={errors.status}>
                <select
                  value={form.status}
                  onChange={(e) => {
                    setForm({ ...form, status: e.target.value })
                    if (errors.status) setErrors({ ...errors, status: '' })
                  }}
                  className="w-full h-12 px-3 rounded-xl border border-slate-200 bg-white text-base text-slate-800 focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="pending">Menunggu</option>
                  <option value="in_progress">Dalam Proses</option>
                  <option value="completed">Selesai</option>
                  <option value="cancelled">Dibatalkan</option>
                </select>
              </Field>

              <Field label="Catatan Tambahan" error={errors.notes}>
                <textarea
                  value={form.notes}
                  onChange={(e) => {
                    setForm({ ...form, notes: e.target.value })
                    if (errors.notes) setErrors({ ...errors, notes: '' })
                  }}
                  placeholder="Catatan hasil konsultasi atau instruksi rujukan..."
                  rows={3}
                  className="w-full p-3 rounded-xl border border-slate-200 text-base text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </Field>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShow(false)}
                  className="h-12 px-5 rounded-xl border border-slate-200 text-base font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="h-12 px-6 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-base font-bold shadow-sm transition disabled:opacity-50"
                >
                  {saving ? 'Menyimpan...' : 'Simpan Tindak Lanjut'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
