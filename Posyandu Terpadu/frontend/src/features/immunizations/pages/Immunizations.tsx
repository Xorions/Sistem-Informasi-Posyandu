import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiChildren, apiErrorMessage, apiImunisasi, apiPosyandu } from '@/shared/lib/api'
import { ROUTES } from '@/app/routes'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge, StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { can } from '@/shared/lib/rbac'
import { useAuth } from '@/features/auth/AuthContext'
import {
  EMPTY_PAGE_META,
  JENIS_PEMBERIAN_LABEL,
  type ApiMeta,
  type Child,
  type Imunisasi,
  type JenisPemberian,
  type Posyandu,
} from '@/shared/types'

const JENIS_LIST: JenisPemberian[] = ['VAKSIN', 'VITAMIN']

/** Nama vaksin dan vitamin yang lazim diberikan di Posyandu. */
const NAMA_VAKSIN = ['BCG', 'Hepatitis B', 'Polio 0', 'Polio 1', 'Polio 2', 'Polio 3', 'Polio 4', 'DPT HB 1', 'DPT HB 2', 'DPT HB 3', 'Campak', 'Rubella']
const NAMA_VITAMIN = ['Vitamin A Merah', 'Vitamin A Biru', 'Vitamin D', 'Besi', 'Zinc']

type FormState = {
  child_id: string
  jenis: JenisPemberian
  vaccine_name: string
  batch: string
  vaccination_date: string
  status: 'sudah' | 'belum' | 'terjadwal'
  notes: string
}

function toForm(i: Imunisasi): FormState {
  return {
    child_id: String(i.child_id ?? ''),
    jenis: i.jenis,
    vaccine_name: i.vaccine_name,
    batch: i.batch ?? '',
    vaccination_date: i.vaccination_date ?? '',
    status: i.status,
    notes: i.notes ?? '',
  }
}

export default function ImmunizationsPage() {
  const toast = useToast()
  const { isOrangTua } = useAuth()

  const [rows, setRows] = useState<Imunisasi[]>([])
  const [children, setChildren] = useState<Child[]>([])
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_PAGE_META)

  const [jenisFilter, setJenisFilter] = useState<'' | JenisPemberian>('')
  const [statusFilter, setStatusFilter] = useState('')
  const [posyanduFilter, setPosyanduFilter] = useState('')
  const [page, setPage] = useState(1)

  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState<Imunisasi | null>(null)
  const [form, setForm] = useState<FormState>({
    child_id: '',
    jenis: 'VAKSIN',
    vaccine_name: '',
    batch: '',
    vaccination_date: '',
    status: 'sudah',
    notes: '',
  })
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Imunisasi | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data, meta } = await apiImunisasi.list({
        jenis: jenisFilter || undefined,
        status: statusFilter || undefined,
        page,
        per_page: 20,
      })

      setRows(data)
      setMeta(meta ?? EMPTY_PAGE_META)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data imunisasi tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [jenisFilter, statusFilter, page])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const [childRes, posRes] = await Promise.all([
          apiChildren.list({ per_page: 100 }),
          apiPosyandu.list({ per_page: 100 }),
        ])

        setChildren(childRes.data)
        setPosyandus(posRes.data)
      } catch {
        // Referensi tidak kritis untuk tabel baca.
      }
    })()
  }, [])

  // Nama pemberian yang hanya muncul untuk jenis terpilih.
  const namaOptions = form.jenis === 'VAKSIN' ? NAMA_VAKSIN : NAMA_VITAMIN

  const openCreate = () => {
    setEditing(null)
    setForm({
      child_id: '',
      jenis: 'VAKSIN',
      vaccine_name: '',
      batch: '',
      vaccination_date: new Date().toISOString().slice(0, 10),
      status: 'sudah',
      notes: '',
    })
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (i: Imunisasi) => {
    setEditing(i)
    setForm(toForm(i))
    setFormError(null)
    setOpen(true)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setFormError(null)

    const payload = {
      jenis: form.jenis,
      vaccine_name: form.vaccine_name,
      batch: form.batch || null,
      vaccination_date: form.vaccination_date || null,
      status: form.status,
      notes: form.notes || null,
    }

    try {
      if (editing) {
        await apiImunisasi.update(editing.id, payload)
        toast.show('Data pemberian berhasil diperbarui')
      } else {
        await apiImunisasi.create({ ...payload, child_id: Number(form.child_id) })
        toast.show('Pemberian berhasil dicatat')
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
      await apiImunisasi.remove(deleting.id)
      toast.show('Data pemberian dihapus')
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

  const filterAnak = children.filter((c) => !posyanduFilter || String(c.posyandu_id) === posyanduFilter)

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Imunisasi dan Vitamin"
          subtitle="Riwayat pemberian vaksin serta vitamin pada anak, dipisahkan agar mudah dipantau."
          action={
            can('KADER', 'manage-imunisasi') ? (
              <Button onClick={openCreate}>+ Catat Pemberian</Button>
            ) : (
              <span className="text-xs text-slate-500">Mode lihat saja</span>
            )
          }
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Select
              value={jenisFilter}
              onChange={(e) => {
                setJenisFilter(e.target.value as '' | JenisPemberian)
                setPage(1)
              }}
            >
              <option value="">Semua jenis</option>
              {JENIS_LIST.map((j) => (
                <option key={j} value={j}>
                  {JENIS_PEMBERIAN_LABEL[j]}
                </option>
              ))}
            </Select>
            <Select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Semua status</option>
              <option value="sudah">Sudah</option>
              <option value="belum">Belum</option>
              <option value="terjadwal">Terjadwal</option>
            </Select>
            <Select
              value={posyanduFilter}
              onChange={(e) => {
                setPosyanduFilter(e.target.value)
                setPage(1)
              }}
            >
              <option value="">Semua posyandu</option>
              {posyandus.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.nama_posyandu}
                </option>
              ))}
            </Select>
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
            <EmptyState title="Belum ada data" description="Belum ada catatan pemberian pada filter ini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-3 pr-3 font-semibold">Anak</th>
                    <th className="py-3 pr-3 font-semibold">Jenis</th>
                    <th className="py-3 pr-3 font-semibold">Nama</th>
                    <th className="py-3 pr-3 font-semibold">Batch</th>
                    <th className="py-3 pr-3 font-semibold">Tanggal</th>
                    <th className="py-3 pr-3 font-semibold">Status</th>
                    {!isOrangTua && can('KADER', 'manage-imunisasi') && (
                      <th className="py-3 font-semibold text-right">Aksi</th>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((i) => (
                    <tr key={i.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-3">
                        <Link to={ROUTES.childDetail(i.child_id)} className="font-medium text-teal-700 hover:text-teal-900">
                          {i.nama_anak || `#${i.child_id}`}
                        </Link>
                      </td>
                      <td className="py-3 pr-3">
                        <Badge
                          label={i.jenis_label || JENIS_PEMBERIAN_LABEL[i.jenis]}
                          className={
                            i.jenis === 'VAKSIN'
                              ? 'bg-sky-50 text-sky-700 border border-sky-100'
                              : 'bg-amber-50 text-amber-700 border border-amber-100'
                          }
                        />
                      </td>
                      <td className="py-3 pr-3 text-slate-700">{i.vaccine_name}</td>
                      <td className="py-3 pr-3 text-slate-500">{i.batch || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{i.vaccination_date || '-'}</td>
                      <td className="py-3 pr-3">
                        <StatusBadge status={i.status} />
                      </td>
                      {can('KADER', 'manage-imunisasi') && !isOrangTua && (
                        <td className="py-3 text-right space-x-2 whitespace-nowrap">
                          <button onClick={() => openEdit(i)} className="text-teal-600 hover:text-teal-800 text-xs font-medium">
                            Ubah
                          </button>
                          <button onClick={() => setDeleting(i)} className="text-red-600 hover:text-red-800 text-xs font-medium">
                            Hapus
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && meta.last_page > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <span>
                Halaman {meta.current_page} dari {meta.last_page} ({meta.total} catatan)
              </span>
              <div className="flex gap-2">
                <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  Sebelumnya
                </Button>
                <Button variant="secondary" size="sm" disabled={page >= meta.last_page} onClick={() => setPage((p) => p + 1)}>
                  Berikutnya
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editing ? 'Ubah Data Pemberian' : 'Catat Pemberian'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                Ã¢Å“â€¢
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                {!editing && (
                  <Field label="Anak" required>
                    <Select value={form.child_id} onChange={set('child_id')} required>
                      <option value="">-- Pilih anak --</option>
                      {filterAnak.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nama_lengkap}
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                <Field label="Jenis" required>
                  <Select
                    value={form.jenis}
                    onChange={(e) => {
                      const jenis = e.target.value as JenisPemberian
                      setForm((f) => ({ ...f, jenis, vaccine_name: '' }))
                    }}
                  >
                    {JENIS_LIST.map((j) => (
                      <option key={j} value={j}>
                        {JENIS_PEMBERIAN_LABEL[j]}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Nama" required>
                  <Select value={form.vaccine_name} onChange={set('vaccine_name')} required>
                    <option value="">-- Pilih --</option>
                    {namaOptions.map((n) => (
                      <option key={n} value={n}>
                        {n}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Tanggal Pemberian">
                  <Input
                    type="date"
                    value={form.vaccination_date}
                    onChange={set('vaccination_date')}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                </Field>

                <Field label="Nomor Batch" hint="Umumnya ada pada kemasan vaksin">
                  <Input value={form.batch} onChange={set('batch')} maxLength={50} />
                </Field>

                <Field label="Status" required>
                  <Select value={form.status} onChange={set('status')} required>
                    <option value="sudah">Sudah</option>
                    <option value="belum">Belum</option>
                    <option value="terjadwal">Terjadwal</option>
                  </Select>
                </Field>
              </div>

              <Field label="Keterangan">
                <Textarea rows={2} value={form.notes} onChange={set('notes')} />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  {editing ? 'Simpan Perubahan' : 'Simpan'}
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
        title="Hapus Data Pemberian?"
        description="Catatan pemberian ini akan dihapus permanen."
      />
    </div>
  )
}