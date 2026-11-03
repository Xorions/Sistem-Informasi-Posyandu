import { useCallback, useEffect, useState } from 'react'
import { useAuth } from '@/features/auth/AuthContext'
import { apiErrorMessage, apiParents, apiPosyandu, apiUsers, apiValidationErrors } from '@/shared/lib/api'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { isValidPhone } from '@/shared/lib/utils'
import { ROLES, ROLE_LABEL, type OrangTua, type Posyandu, type Role, type User } from '@/shared/types'

type FormState = {
  name: string
  email: string
  password: string
  role: Role
  phone: string
  parent_id: string
  posyandu_ids: number[]
}

const EMPTY_FORM: FormState = {
  name: '',
  email: '',
  password: '',
  role: 'KADER',
  phone: '',
  parent_id: '',
  posyandu_ids: [],
}

export default function UsersPage() {
  const toast = useToast()
  const { isAdmin } = useAuth()

  const [rows, setRows] = useState<User[]>([])
  const [posyandus, setPosyandus] = useState<Posyandu[]>([])
  const [parents, setParents] = useState<OrangTua[]>([])

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')

  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})

  const [deleting, setDeleting] = useState<User | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const handleOpen = () => {
    setForm(EMPTY_FORM)
    setFormError(null)
    setErrors({})
    setOpen(true)
  }

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data } = await apiUsers.list({
        search: debouncedSearch || undefined,
        role: roleFilter || undefined,
        per_page: 50,
      })

      setRows(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data pengguna tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, roleFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        const [pos, par] = await Promise.all([
          apiPosyandu.list({ per_page: 100 }),
          apiParents.list({ per_page: 100 }),
        ])

        setPosyandus(pos.data)
        setParents(par.data)
      } catch {
        // Referensi tidak kritis.
      }
    })()
  }, [])

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.name.trim()) errs.name = 'Nama lengkap wajib diisi.'
    if (!form.email.trim()) errs.email = 'Email wajib diisi.'
    if (form.password.length < 8) {
      errs.password = 'Password minimal 8 karakter.'
    }
    if (isAdmin && form.role === 'ORANG_TUA' && !form.parent_id) {
      errs.parent_id = 'Profil orang tua wajib dipilih untuk akun peran Orang Tua.'
    }
    if (form.phone && !isValidPhone(form.phone)) {
      errs.phone = 'Format nomor telepon tidak valid (contoh: 081234567890).'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      setFormError('Mohon perbaiki kesalahan pada formulir.')
      return
    }

    setSaving(true)

    const payload: Record<string, unknown> = {
      name: form.name.trim(),
      email: form.email.trim(),
      password: form.password,
      password_confirmation: form.password,
      phone: form.phone.trim() || null,
    }

    // Keamanan: non-admin dilarang mengirimkan role, parent_id, posyandu_ids, dan is_active
    if (isAdmin) {
      payload.role = form.role
      payload.parent_id = form.role === 'ORANG_TUA' && form.parent_id ? Number(form.parent_id) : null
      payload.posyandu_ids = form.posyandu_ids
    }

    try {
      await apiUsers.create(payload)

      toast.show('Pengguna berhasil dibuat')
      setOpen(false)
      setForm(EMPTY_FORM)
      setErrors({})
      await load()
    } catch (err) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return

    setDeleteLoading(true)

    try {
      await apiUsers.remove(deleting.id)
      toast.show('Pengguna dihapus')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  const togglePosyandu = (id: number, checked: boolean) =>
    setForm((f) => ({
      ...f,
      posyandu_ids: checked ? [...f.posyandu_ids, id] : f.posyandu_ids.filter((x) => x !== id),
    }))

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Pengguna"
          subtitle="Akun login untuk admin, kader, dan orang tua. Akun orang tua wajib ditautkan ke profil orang tua."
          action={<Button onClick={handleOpen}>+ Tambah Pengguna</Button>}
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Cari nama atau email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={roleFilter} onChange={(e) => setRoleFilter(e.target.value)}>
              <option value="">Semua role</option>
              {ROLES.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABEL[r]}
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
            <EmptyState title="Belum ada pengguna" />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-3 pr-3 font-semibold">Nama</th>
                    <th className="py-3 pr-3 font-semibold">Email</th>
                    <th className="py-3 pr-3 font-semibold">Role</th>
                    <th className="py-3 pr-3 font-semibold">Terhubung ke</th>
                    <th className="py-3 pr-3 font-semibold">Posyandu</th>
                    <th className="py-3 font-semibold text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((u) => (
                    <tr key={u.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-3 font-medium text-slate-800">{u.name}</td>
                      <td className="py-3 pr-3 text-slate-600">{u.email}</td>
                      <td className="py-3 pr-3">
                        <span className="text-xs font-medium bg-slate-100 text-slate-700 rounded-lg px-2 py-1">
                          {ROLE_LABEL[u.role]}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-slate-600 text-xs">
                        {u.parent ? `Orang tua: ${u.parent.nama_lengkap}` : u.kader ? `Kader: ${u.kader.nama_kader}` : '-'}
                      </td>
                      <td className="py-3 pr-3 text-slate-600">
                        {u.posyandus?.map((p) => p.nama_posyandu).join(', ') || '-'}
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => setDeleting(u)}
                          className="text-red-600 hover:text-red-800 text-xs font-medium"
                        >
                          Hapus
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">Tambah Pengguna</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <Field label="Nama" required error={errors.name}>
                <Input
                  required
                  hasError={!!errors.name}
                  value={form.name}
                  onChange={(e) => {
                    setForm({ ...form, name: e.target.value })
                    if (errors.name) setErrors({ ...errors, name: '' })
                  }}
                />
              </Field>

              <Field label="Email" required error={errors.email}>
                <Input
                  required
                  type="email"
                  hasError={!!errors.email}
                  value={form.email}
                  onChange={(e) => {
                    setForm({ ...form, email: e.target.value })
                    if (errors.email) setErrors({ ...errors, email: '' })
                  }}
                />
              </Field>

              <Field label="Password" required hint="Minimal 8 karakter" error={errors.password}>
                <Input
                  required
                  type="password"
                  minLength={8}
                  hasError={!!errors.password}
                  value={form.password}
                  onChange={(e) => {
                    setForm({ ...form, password: e.target.value })
                    if (errors.password) setErrors({ ...errors, password: '' })
                  }}
                />
              </Field>

              {isAdmin && (
                <Field label="Role" required error={errors.role}>
                  <Select
                    hasError={!!errors.role}
                    value={form.role}
                    onChange={(e) => {
                      setForm({ ...form, role: e.target.value as Role, parent_id: '' })
                      if (errors.role) setErrors({ ...errors, role: '' })
                    }}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              {isAdmin && form.role === 'ORANG_TUA' && (
                <Field
                  label="Profil Orang Tua"
                  required
                  hint="Wajib. Menentukan anak mana yang boleh dilihat akun ini."
                  error={errors.parent_id}
                >
                  <Select
                    required
                    hasError={!!errors.parent_id}
                    value={form.parent_id}
                    onChange={(e) => {
                      setForm({ ...form, parent_id: e.target.value })
                      if (errors.parent_id) setErrors({ ...errors, parent_id: '' })
                    }}
                  >
                    <option value="">-- Pilih profil orang tua --</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.nama_lengkap}
                        {p.jenis_kelamin ? ` (${p.jenis_kelamin})` : ''}
                      </option>
                    ))}
                  </Select>
                </Field>
              )}

              <Field label="Nomor Telepon" hint="Format: 08xxxxxxxxxx atau +628xxxxxxxxxx" error={errors.phone}>
                <Input
                  type="tel"
                  inputMode="tel"
                  hasError={!!errors.phone}
                  placeholder="081234567890"
                  value={form.phone}
                  onChange={(e) => {
                    setForm({ ...form, phone: e.target.value })
                    if (errors.phone) setErrors({ ...errors, phone: '' })
                  }}
                />
              </Field>

              {isAdmin && (
                <Field
                  label="Posyandu yang Diakses"
                  hint="Kader hanya dapat mengakses posyandu yang dicentang. Admin selalu ke seluruh posyandu."
                  error={errors.posyandu_ids}
                >
                  <div className="space-y-1 max-h-[140px] overflow-auto border border-slate-200 rounded-xl p-3">
                    {posyandus.map((p) => (
                      <label key={p.id} className="flex items-center gap-2 text-sm text-slate-700">
                        <input
                          type="checkbox"
                          checked={form.posyandu_ids.includes(p.id)}
                          onChange={(e) => togglePosyandu(p.id, e.target.checked)}
                        />
                        {p.nama_posyandu}
                      </label>
                    ))}
                  </div>
                </Field>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setOpen(false)}>
                  Batal
                </Button>
                <Button type="submit" loading={saving}>
                  Simpan Pengguna
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
        title="Hapus Pengguna?"
        description={
          deleting
            ? `Akun ${deleting.name} akan dihapus dan tidak bisa login lagi. Riwayat pencatatan tetap tersimpan.`
            : ''
        }
      />
    </div>
  )
}