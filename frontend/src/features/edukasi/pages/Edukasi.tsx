import { useCallback, useEffect, useState } from 'react'
import { apiEducations, apiErrorMessage } from '@/shared/lib/api'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { StatusBadge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner, Textarea } from '@/shared/components/ui/field'
import { ConfirmDeleteModal } from '@/shared/components/ui/modal'
import { useToast } from '@/shared/components/ui/toast'
import { useDebounce } from '@/shared/hooks/useDebounce'
import { useAuth } from '@/features/auth/AuthContext'
import { ROUTES } from '@/app/routes'
import { can } from '@/shared/lib/rbac'
import type { Education, EducationCategory, EducationStatus } from '@/shared/types'

type FormState = {
  category_id: string
  title: string
  content: string
  source: string
  source_url: string
  status: EducationStatus
}

const EMPTY_FORM: FormState = {
  category_id: '',
  title: '',
  content: '',
  source: '',
  source_url: '',
  status: 'draft',
}

export default function EdukasiPage() {
  const toast = useToast()
  const { role } = useAuth()
  const canManage = can(role, 'manage-edukasi')

  const [rows, setRows] = useState<Education[]>([])
  const [categories, setCategories] = useState<EducationCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')

  const [open, setOpen] = useState(false)
  const [editId, setEditId] = useState<number | null>(null)
  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const [deleting, setDeleting] = useState<Education | null>(null)
  const [deleteLoading, setDeleteLoading] = useState(false)

  const debouncedSearch = useDebounce(search, 400)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data } = await apiEducations.list({
        search: debouncedSearch || undefined,
        category_id: categoryFilter || undefined,
        per_page: 50,
      })

      setRows(data)
    } catch (err) {
      setError(apiErrorMessage(err, 'Konten edukasi tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [debouncedSearch, categoryFilter])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    void (async () => {
      try {
        // Endpoint kategori hanya tersedia bagi pengguna terautentikasi.
        setCategories(await apiEducations.categories())
      } catch {
        try {
          setCategories(await apiEducations.publicCategories())
        } catch {
          // Tanpa kategori pun halaman tetap berfungsi.
        }
      }
    })()
  }, [])

  const openCreate = () => {
    setEditId(null)
    setForm({ ...EMPTY_FORM, category_id: categoryFilter })
    setFormError(null)
    setOpen(true)
  }

  const openEdit = (e: Education) => {
    setEditId(e.id)
    setForm({
      category_id: String(e.category_id),
      title: e.title,
      content: e.content,
      source: e.source ?? '',
      source_url: e.source_url ?? '',
      status: e.status,
    })
    setFormError(null)
    setOpen(true)
  }

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault()
    setSaving(true)
    setFormError(null)

    const payload = {
      category_id: Number(form.category_id),
      title: form.title,
      content: form.content,
      source: form.source || null,
      source_url: form.source_url || null,
      status: form.status,
    }

    try {
      if (editId) {
        await apiEducations.update(editId, payload)
        toast.show('Konten edukasi berhasil diperbarui')
      } else {
        await apiEducations.create(payload)
        toast.show('Konten edukasi berhasil dibuat')
      }

      setOpen(false)
      await load()
    } catch (err) {
      setFormError(apiErrorMessage(err))
    } finally {
      setSaving(false)
    }
  }

  const togglePublish = async (item: Education) => {
    try {
      if (item.status === 'published') {
        await apiEducations.unpublish(item.id)
      } else {
        await apiEducations.publish(item.id)
      }

      toast.show('Status publikasi diperbarui')
      await load()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return

    setDeleteLoading(true)

    try {
      await apiEducations.remove(deleting.id)
      toast.show('Konten edukasi dihapus')
      setDeleting(null)
      await load()
    } catch (err) {
      toast.show(apiErrorMessage(err), 'error')
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Konten Edukasi"
          subtitle="Kelola informasi kesehatan untuk warga. Konten published tampil di halaman Edukasi Publik."
          action={
            canManage ? (
              <Button onClick={openCreate}>+ Tambah Edukasi</Button>
            ) : (
              <span className="text-xs text-slate-500">Mode lihat saja</span>
            )
          }
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              placeholder="Cari judul..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)}>
              <option value="">Semua kategori</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
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
            <EmptyState title="Belum ada konten edukasi" />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {rows.map((e) => (
                <Card key={e.id}>
                  <CardContent>
                    <p className="text-xs text-teal-600 font-semibold">{e.category?.name}</p>
                    <h3 className="font-semibold mt-1 line-clamp-2 text-slate-800">{e.title}</h3>

                    <div className="flex gap-2 mt-2 items-center">
                      <StatusBadge status={e.status} />
                      {e.author?.name && <span className="text-xs text-slate-500">{e.author.name}</span>}
                    </div>

                    <div
                      className="text-xs text-slate-600 mt-3 line-clamp-3 prose max-w-none"
                      dangerouslySetInnerHTML={{ __html: e.content?.substring(0, 150) }}
                    />

                    <div className="flex gap-1 mt-4 flex-wrap">
                      <a
                        href={ROUTES.edukasiDetail(e.slug)}
                        target="_blank"
                        rel="noreferrer"
                        className="px-2.5 py-1 text-xs rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50"
                      >
                        Lihat
                      </a>

                      {canManage && (
                        <>
                          <Button size="sm" variant="secondary" onClick={() => openEdit(e)}>
                            Edit
                          </Button>
                          <Button size="sm" variant="secondary" onClick={() => togglePublish(e)}>
                            {e.status === 'published' ? 'Unpublish' : 'Publish'}
                          </Button>
                          <Button size="sm" variant="danger" onClick={() => setDeleting(e)}>
                            Hapus
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {open && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 sticky top-0 bg-white">
              <h3 className="font-bold text-slate-800">{editId ? 'Edit Konten' : 'Tambah Konten Edukasi'}</h3>
              <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={submit} className="p-6 space-y-4">
              {formError && <p className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{formError}</p>}

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Kategori" required>
                  <Select
                    required
                    value={form.category_id}
                    onChange={(e) => setForm({ ...form, category_id: e.target.value })}
                  >
                    <option value="">-- Pilih kategori --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </Select>
                </Field>

                <Field label="Status" required>
                  <Select
                    value={form.status}
                    onChange={(e) => setForm({ ...form, status: e.target.value as EducationStatus })}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </Select>
                </Field>
              </div>

              <Field label="Judul" required>
                <Input required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </Field>

              <Field
                label="Konten"
                required
                hint="Mendukung tag HTML dasar: h2, p, ul, li, strong, em, a. Backend menyaring script."
              >
                <Textarea
                  required
                  rows={8}
                  value={form.content}
                  onChange={(e) => setForm({ ...form, content: e.target.value })}
                  className="font-mono text-sm"
                />
              </Field>

              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Sumber">
                  <Input
                    value={form.source}
                    onChange={(e) => setForm({ ...form, source: e.target.value })}
                    placeholder="Kementerian Kesehatan RI"
                  />
                </Field>
                <Field label="URL Sumber">
                  <Input
                    value={form.source_url}
                    onChange={(e) => setForm({ ...form, source_url: e.target.value })}
                    placeholder="https://..."
                  />
                </Field>
              </div>

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
        title="Hapus Konten Edukasi?"
        description={
          deleting ? `Konten "${deleting.title}" akan dihapus dari daftar.` : ''
        }
      />
    </div>
  )
}