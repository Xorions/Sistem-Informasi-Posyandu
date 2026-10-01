import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage, apiPosyandu, apiSchedules } from '@/shared/lib/api'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { formatDate } from '@/shared/lib/utils'
import type { Jadwal, Posyandu, ScheduleStatus } from '@/shared/types'

/** Sesuai enum kolom `status` pada tabel `schedules`. */
const STATUS_OPTIONS: { value: ScheduleStatus; label: string }[] = [
  { value: 'scheduled', label: 'Terjadwal' },
  { value: 'completed', label: 'Selesai' },
  { value: 'cancelled', label: 'Dibatalkan' },
]

type FormState = {
  posyandu_id: string
  title: string
  date: string
  start_time: string
  end_time: string
  location: string
  description: string
  status: ScheduleStatus
}

const EMPTY_FORM: FormState = {
  posyandu_id: '',
  title: '',
  date: '',
  start_time: '',
  end_time: '',
  location: '',
  description: '',
  status: 'scheduled',
}

function toForm(s: Jadwal): FormState {
  return {
    posyandu_id: String(s.posyandu_id ?? ''),
    title: s.title ?? '',
    date: s.date ?? '',
    start_time: s.start_time ?? '',
    end_time: s.end_time ?? '',
    location: s.location ?? '',
    description: s.description ?? '',
    status: s.status,
  }
}

export default function SchedulesPage() {
  const toast = useToast()
  const { role } = useAuth()
  const canManage = can(role, 'manage-jadwal')

  const [rows, setRows] = useState<Jadwal[]>([])
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [posyanduFilter, setPosyanduFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Jadwal | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Jadwal | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data } = await apiSchedules.list({
        posyandu_id: posyanduFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        per_page: 50,
      })

      setRows(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Jadwal tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [posyanduFilter, from, to])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiPosyandu.list({ per_page: 100 })
        setPosyandus(data)
      } catch {
        // Filter posyandu tidak wajib.
      }
    })()
  }, [])

  const openCreate = () => {
    setEditing(null)
    setForm({ ...EMPTY_FORM, posyandu_id: posyanduFilter || String(posyandus[0]?.id ?? '') })
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (s: Jadwal) => {
    setEditing(s)
    setForm(toForm(s))
    setFormError(null)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const payload = {
      posyandu_id: Number(form.posyandu_id),
      title: form.title,
      date: form.date,
      start_time: form.start_time || null,
      end_time: form.end_time || null,
      location: form.location || null,
      description: form.description || null,
      status: form.status,
    }

    try {
      if (editing) {
        await apiSchedules.update(editing.id, payload)
        toast.show('Jadwal berhasil diperbarui')
      } else {
        await apiSchedules.create(payload)
        toast.show('Jadwal berhasil disimpan')
      }

      setOpen(false)
      await load()
    } catch (err) {
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return

    setDeleteLoading(true)

    try {
      await apiSchedules.remove(deleting.id)
      toast.show('Jadwal dihapus')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const set =
    (key: keyof FormState) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }))

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Jadwal Posyandu"
          subtitle="Jadwal kegiatan bulanan per posyandu agar orang tua bisa tahu kapan posyandu buka."
          action={
            canManage ? (
              <Button onClick={openCreate}>+ Tambah Jadwal</Button>
            ) : (
              <span className="text-xs text-slate-500">Mode lihat saja</span>
            )
          }
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Dari tanggal">
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </Field>
            <Field label="Sampai tanggal">
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </Field>
            <Field label="Posyandu">
              <Select value={posyanduFilter} onChange={(e) => setPosyanduFilter(e.target.value)}>
                <option value="">Semua posyandu</option>
                {posyandus.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.nama_posyandu}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          {loading ? (
            <Spinner />
          ) : error ? (
            <ErrorState message={error} onRetry={load} />
          ) : rows.length === 0 ? (
            <EmptyState title="Belum ada jadwal" description="Tambahkan jadwal kegiatan posyandu berikutnya." />
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((s) => (
                <Card key={s.id}>
                  <CardContent>
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-semibold text-slate-800">{s.title}</p>
                      <StatusBadge status={s.status} />
                    </div>

                    <p className="text-xs text-slate-500 mt-1">{s.posyandu?.nama_posyandu}</p>

                    <p className="text-sm text-slate-700 mt-2 font-medium">
                      {formatDate(s.date)}
                      {s.start_time && ` · ${s.start_time}${s.end_time ? ` - ${s.end_time}` : ''}`}
                    </p>

                    {s.location && <p className="text-xs text-slate-600 mt-1">{s.location}</p>}
                    {s.description && <p className="text-xs text-slate-500 mt-1">{s.description}</p>}

                    {canManage && (
                      <div className="flex justify-end gap-2 mt-4">
                        <Button size="sm" variant="secondary" onClick={() => openEdit(s)}>
                          Ubah
                        </Button>
                        <Button size="sm" variant="danger" onClick={() => setDeleting(s)}>
                          Hapus
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editing ? 'Ubah Jadwal' : 'Tambah Jadwal'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <Field label="Posyandu" required>
                <Select value={form.posyandu_id} onChange={set('posyandu_id')} required>
                  <option value="">-- Pilih posyandu --</option>
                  {posyandus.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama_posyandu}
                    </option>
                  ))}
                </Select>
              </Field>

              <Field label="Agenda / Judul Kegiatan" required>
                <Input
                  required
                  value={form.title}
                  onChange={set('title')}
                  placeholder="Posyandu Rutin Bulanan"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Tanggal" required>
                  <Input required type="date" value={form.date} onChange={set('date')} />
                </Field>
                <Field label="Jam Mulai">
                  <Input type="time" value={form.start_time} onChange={set('start_time')} />
                </Field>
                <Field label="Jam Selesai">
                  <Input type="time" value={form.end_time} onChange={set('end_time')} />
                </Field>
              </div>

              <Field label="Lokasi">
                <Input value={form.location} onChange={set('location')} />
              </Field>

              <Field label="Keterangan">
                <Textarea rows={2} value={form.description} onChange={set('description')} />
              </Field>

              <Field label="Status" required>
                <Select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ScheduleStatus }))}
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  Simpan
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDeleteModal
        open={!!deleting}
        onClose={() => setDeleting(null)}
        onConfirm={confirmDelete}
        loading={deleteLoading}
        title="Hapus Jadwal?"
        description={deleting ? `Jadwal "${deleting.title}" akan dihapus.` : ''}
      />
    </div>
  )
}