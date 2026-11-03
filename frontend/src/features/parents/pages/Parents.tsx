import { useEffect, useState } from 'react'
import { api, apiErrorMessage, apiValidationErrors } from "@/shared/lib/api"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'
import { Card, CardContent } from "@/shared/components/ui/card"
import { Button, Field, Input, Select, Textarea } from "@/shared/components/ui/field"
import { ConfirmDeleteModal } from "@/shared/components/ui/modal"
import { useToast } from "@/shared/components/ui/toast"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { isMasked, isValidNik, isValidPhone, buildDirtyPayload } from "@/shared/lib/utils"

export default function Parents() {
  const { role } = useAuth()
  const toast = useToast()
  const canManage = can(role, 'manage-orang-tua')
  const [data, setData] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search,500)
  const [page,setPage]=useState(1)
  const [showForm, setShowForm]=useState(false)
  const [saving, setSaving]=useState(false)
  const [errors, setErrors]=useState<Record<string, string>>({})
  const emptyForm = { nik:'', nama_lengkap:'', tempat_lahir:'', tanggal_lahir:'', jenis_kelamin:'L', alamat:'', nomor_telepon:'', pekerjaan:''}
  const [form, setForm]=useState(emptyForm)
  const [initialForm, setInitialForm]=useState(emptyForm)
  const [maskedPlaceholders, setMaskedPlaceholders] = useState<{ [key: string]: string }>({})
  const [editId, setEditId]=useState<number|null>(null)
  const [deleteId, setDeleteId]=useState<number|null>(null)

  const fetch = async()=>{
    try{ const r=await api.get('/parents',{params:{search:debounced||undefined, page}}); setData(r.data.data); setMeta(r.data.meta)}catch{ toast.show('Gagal memuat','error')}
  }
  useEffect(()=>{ fetch()},[debounced, page])

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault()
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.nama_lengkap.trim()) {
      errs.nama_lengkap = 'Nama lengkap orang tua wajib diisi.'
    }

    if (isMasked(form.nik)) {
      errs.nik = 'Data tersamar tidak boleh dikirim langsung.'
    } else if (form.nik && !isValidNik(form.nik)) {
      errs.nik = 'NIK orang tua harus tepat 16 digit angka.'
    }

    if (isMasked(form.nomor_telepon)) {
      errs.nomor_telepon = 'Data tersamar tidak boleh dikirim langsung.'
    } else if (form.nomor_telepon && !isValidPhone(form.nomor_telepon)) {
      errs.nomor_telepon = 'Format nomor telepon tidak valid (contoh: 081234567890).'
    }

    const todayStr = new Date().toISOString().substring(0, 10)
    if (form.tanggal_lahir && form.tanggal_lahir > todayStr) {
      errs.tanggal_lahir = 'Tanggal lahir tidak boleh di masa depan.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.show('Mohon perbaiki data pada kolom yang bermasalah.', 'error')
      return
    }

    setSaving(true)
    try{
      if(editId){
        const dirty = buildDirtyPayload(
          {
            ...form,
            nik: form.nik || null,
            nomor_telepon: form.nomor_telepon || null,
          },
          {
            ...initialForm,
            nik: initialForm.nik || null,
            nomor_telepon: initialForm.nomor_telepon || null,
          },
          maskedPlaceholders
        )

        if (Object.keys(dirty).length > 0) {
          await api.put(`/parents/${editId}`, dirty)
        }
        toast.show('Data berhasil diperbarui.')
      } else {
        await api.post('/parents', {
          ...form,
          nik: form.nik || null,
          nomor_telepon: form.nomor_telepon || null,
        })
        toast.show('Data berhasil ditambahkan.')
      }
      setShowForm(false);
      setEditId(null);
      setForm(emptyForm);
      setInitialForm(emptyForm);
      setMaskedPlaceholders({});
      setErrors({})
      fetch()
    }catch(err:any){
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      toast.show(apiErrorMessage(err, 'Gagal menyimpan data orang tua.'),'error')
    } finally {
      setSaving(false)
    }
  }
  const handleDelete=async()=>{
    if(!deleteId) return
    try{ await api.delete(`/parents/${deleteId}`); toast.show('Data berhasil dihapus'); setDeleteId(null); fetch()}catch{ toast.show('Gagal hapus','error')}
  }
  const startEdit=async(p:any)=>{
    setEditId(p.id)
    setErrors({})
    try {
      const res = await api.get(`/parents/${p.id}`)
      const raw = res.data?.data || p
      const masks: { [key: string]: string } = {}

      const cleanNik = isMasked(raw.nik) ? '' : (raw.nik || '')
      if (isMasked(raw.nik)) masks.nik = raw.nik

      const cleanPhone = isMasked(raw.nomor_telepon) ? '' : (raw.nomor_telepon || '')
      if (isMasked(raw.nomor_telepon)) masks.nomor_telepon = raw.nomor_telepon

      const loadedForm = {
        nik: cleanNik,
        nama_lengkap: raw.nama_lengkap || '',
        tempat_lahir: raw.tempat_lahir || '',
        tanggal_lahir: raw.tanggal_lahir?.substring(0,10) || '',
        jenis_kelamin: raw.jenis_kelamin || 'L',
        alamat: raw.alamat || '',
        nomor_telepon: cleanPhone,
        pekerjaan: raw.pekerjaan || '',
      }
      setMaskedPlaceholders(masks)
      setForm(loadedForm)
      setInitialForm(loadedForm)
    } catch {
      const masks: { [key: string]: string } = {}
      const cleanNik = isMasked(p.nik) ? '' : (p.nik || '')
      if (isMasked(p.nik)) masks.nik = p.nik
      const cleanPhone = isMasked(p.nomor_telepon) ? '' : (p.nomor_telepon || '')
      if (isMasked(p.nomor_telepon)) masks.nomor_telepon = p.nomor_telepon

      const loadedForm = {
        nik: cleanNik,
        nama_lengkap: p.nama_lengkap || '',
        tempat_lahir: p.tempat_lahir || '',
        tanggal_lahir: p.tanggal_lahir?.substring(0,10) || '',
        jenis_kelamin: p.jenis_kelamin || 'L',
        alamat: p.alamat || '',
        nomor_telepon: cleanPhone,
        pekerjaan: p.pekerjaan || '',
      }
      setMaskedPlaceholders(masks)
      setForm(loadedForm)
      setInitialForm(loadedForm)
    }
    setShowForm(true)
  }

  const openCreate = () => {
    setEditId(null)
    setForm(emptyForm)
    setInitialForm(emptyForm)
    setMaskedPlaceholders({})
    setErrors({})
    setShowForm(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Orang Tua / Wali</h1>
        {canManage && (
          <button onClick={openCreate} className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700">+ Tambah</button>
        )}
      </div>
      <Card><CardContent className="flex gap-3"><input value={search} onChange={e=>{setSearch(e.target.value);setPage(1)}} placeholder="Cari nama, NIK..." className="flex-1 px-3 py-2.5 rounded-xl border border-slate-200"/><button onClick={()=>fetch()} className="px-4 py-2.5 rounded-xl border border-slate-200">Cari</button></CardContent></Card>
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="text-left px-4 py-3">Nama</th>
                <th className="text-left px-4 py-3">NIK</th>
                <th className="text-left px-4 py-3">Telepon</th>
                <th className="text-left px-4 py-3">Alamat</th>
                {canManage && <th className="text-right px-4 py-3">Aksi</th>}
              </tr>
            </thead>
            <tbody className="divide-y">
              {data.map((p:any)=>(
                <tr key={p.id}>
                  <td className="px-4 py-3 font-medium">{p.nama_lengkap}</td>
                  <td className="px-4 py-3">{p.nik||'-'}</td>
                  <td className="px-4 py-3">{p.nomor_telepon||'-'}</td>
                  <td className="px-4 py-3">{p.alamat||'-'}</td>
                  {canManage && (
                    <td className="px-4 py-3 text-right flex justify-end gap-1">
                      <button onClick={()=>startEdit(p)} className="px-2.5 py-1.5 rounded-lg border text-xs">Edit</button>
                      <button onClick={()=>setDeleteId(p.id)} className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs">Hapus</button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {meta && <div className="flex justify-between px-6 py-4 border-t text-xs text-slate-500"><span>Total {meta.total}</span><div className="flex gap-2"><button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1 rounded-lg border disabled:opacity-50">Prev</button><button disabled={page>=meta.last_page} onClick={()=>setPage(p=>p+1)} className="px-3 py-1 rounded-lg border disabled:opacity-50">Next</button></div></div>}
      </Card>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={()=>setShowForm(false)} />
          <div className="relative bg-white rounded-2xl w-full max-w-lg p-6 max-h-[90vh] overflow-auto">
            <h3 className="font-semibold">{editId?'Edit':'Tambah'} Orang Tua</h3>
            <form onSubmit={submit} className="space-y-3 mt-4">
              <Field label="Nama Lengkap" required error={errors.nama_lengkap}>
                <Input
                  required
                  value={form.nama_lengkap}
                  onChange={e=>setForm({...form, nama_lengkap:e.target.value})}
                  hasError={!!errors.nama_lengkap}
                  placeholder="Nama Lengkap"
                />
              </Field>

              <div className="grid grid-cols-2 gap-3">
                <Field label="NIK (16 digit)" error={errors.nik}>
                  <Input
                    inputMode="numeric"
                    maxLength={16}
                    pattern="[0-9]*"
                    value={form.nik}
                    onChange={e=>setForm({...form, nik:e.target.value.replace(/\D/g, '').slice(0, 16)})}
                    hasError={!!errors.nik}
                    placeholder={maskedPlaceholders.nik ? `Tersembunyi (${maskedPlaceholders.nik})` : "3201012345670001"}
                  />
                  {maskedPlaceholders.nik && (
                    <p className="mt-1 text-xs text-slate-500">Tersembunyi ({maskedPlaceholders.nik}) — isi hanya untuk mengganti</p>
                  )}
                </Field>

                <Field label="Jenis Kelamin" required error={errors.jenis_kelamin}>
                  <Select
                    value={form.jenis_kelamin}
                    onChange={e=>setForm({...form, jenis_kelamin:e.target.value})}
                    hasError={!!errors.jenis_kelamin}
                  >
                    <option value="L">Laki-laki</option>
                    <option value="P">Perempuan</option>
                  </Select>
                </Field>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <Field label="Tempat Lahir" error={errors.tempat_lahir}>
                  <Input
                    value={form.tempat_lahir}
                    onChange={e=>setForm({...form, tempat_lahir:e.target.value})}
                    hasError={!!errors.tempat_lahir}
                    placeholder="Tempat Lahir"
                  />
                </Field>

                <Field label="Tanggal Lahir" error={errors.tanggal_lahir}>
                  <Input
                    type="date"
                    max={new Date().toISOString().substring(0, 10)}
                    value={form.tanggal_lahir}
                    onChange={e=>setForm({...form, tanggal_lahir:e.target.value})}
                    hasError={!!errors.tanggal_lahir}
                  />
                </Field>
              </div>

              <Field label="No Telepon" error={errors.nomor_telepon}>
                <Input
                  type="tel"
                  inputMode="tel"
                  value={form.nomor_telepon}
                  onChange={e=>setForm({...form, nomor_telepon:e.target.value})}
                  hasError={!!errors.nomor_telepon}
                  placeholder={maskedPlaceholders.nomor_telepon ? `Tersembunyi (${maskedPlaceholders.nomor_telepon})` : "081234567890"}
                />
                {maskedPlaceholders.nomor_telepon && (
                  <p className="mt-1 text-xs text-slate-500">Tersembunyi ({maskedPlaceholders.nomor_telepon}) — isi hanya untuk mengganti</p>
                )}
              </Field>

              <Field label="Pekerjaan" error={errors.pekerjaan}>
                <Input
                  value={form.pekerjaan}
                  onChange={e=>setForm({...form, pekerjaan:e.target.value})}
                  hasError={!!errors.pekerjaan}
                  placeholder="Pekerjaan"
                />
              </Field>

              <Field label="Alamat" error={errors.alamat}>
                <Textarea
                  value={form.alamat}
                  onChange={e=>setForm({...form, alamat:e.target.value})}
                  rows={2}
                  hasError={!!errors.alamat}
                  placeholder="Alamat"
                />
              </Field>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>
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
      <ConfirmDeleteModal open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete} title="Hapus Orang Tua?" description="Data akan di-soft delete." />
    </div>
  )
}
