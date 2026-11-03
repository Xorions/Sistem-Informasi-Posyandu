import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api, apiErrorMessage, apiValidationErrors } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { Button, Field, Input, Select, Textarea } from "@/shared/components/ui/field"
import { useToast } from "@/shared/components/ui/toast"
import { buildDirtyPayload, isMasked, isValidNik, isValidPhone } from "@/shared/lib/utils"

type ParentInput = {
  parent_id?: number | ''
  nama_lengkap: string
  nik?: string
  masked_nik?: string
  relationship: 'Ayah'|'Ibu'|'Wali'
  is_primary_contact?: boolean
  nomor_telepon?: string
  masked_nomor_telepon?: string
  alamat?: string
  tempat_lahir?: string
  tanggal_lahir?: string
  jenis_kelamin?: 'L'|'P'
  pekerjaan?: string
}

export default function ChildForm({ mode }: { mode: 'create' | 'edit' }) {
  const { id } = useParams()
  const nav = useNavigate()
  const toast = useToast()
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [form, setForm] = useState({
    posyandu_id: '',
    nik: '',
    nama_lengkap: '',
    nama_panggilan: '',
    tempat_lahir: '',
    tanggal_lahir: '',
    jenis_kelamin: 'L' as 'L'|'P',
    alamat: '',
    nomor_kk: '',
    status: 'active',
  })
  const [initialForm, setInitialForm] = useState(form)
  const [maskedPlaceholders, setMaskedPlaceholders] = useState<Record<string, string>>({})
  const [parents, setParents] = useState<ParentInput[]>([])
  const [existingParents, setExistingParents] = useState<any[]>([])

  useEffect(()=>{
    api.get('/posyandu', { params: { per_page: 100 }}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{})
    api.get('/parents', { params: { per_page: 100 }}).then(r=>setExistingParents(r.data.data?.data || r.data.data || [] )).catch(()=>{})
    if (mode==='edit' && id) {
      api.get(`/children/${id}`).then(r=>{
        const c = r.data.data
        const masked: Record<string, string> = {}
        if (isMasked(c.nik)) masked.nik = c.nik
        if (isMasked(c.nomor_kk)) masked.nomor_kk = c.nomor_kk
        setMaskedPlaceholders(masked)

        const initial = {
          posyandu_id: String(c.posyandu_id||''),
          nik: isMasked(c.nik) ? '' : (c.nik||''),
          nama_lengkap: c.nama_lengkap||'',
          nama_panggilan: c.nama_panggilan||'',
          tempat_lahir: c.tempat_lahir||'',
          tanggal_lahir: c.tanggal_lahir ? c.tanggal_lahir.substring(0,10) : '',
          jenis_kelamin: (c.jenis_kelamin||'L') as 'L'|'P',
          alamat: c.alamat||'',
          nomor_kk: isMasked(c.nomor_kk) ? '' : (c.nomor_kk||''),
          status: c.status||'active',
        }
        setForm(initial)
        setInitialForm(initial)

        if (c.parents?.length) {
          setParents(c.parents.map((p:any)=>({
            parent_id: p.id,
            nama_lengkap: p.nama_lengkap,
            relationship: p.pivot?.relationship || 'Ayah',
            is_primary_contact: !!p.pivot?.is_primary_contact,
            nik: isMasked(p.nik) ? '' : (p.nik||''),
            masked_nik: isMasked(p.nik) ? p.nik : undefined,
            nomor_telepon: isMasked(p.nomor_telepon) ? '' : (p.nomor_telepon||''),
            masked_nomor_telepon: isMasked(p.nomor_telepon) ? p.nomor_telepon : undefined,
          })))
        }
      }).catch(()=>toast.show('Data tidak dapat dimuat','error'))
    }
  },[mode, id])

  const addParent = () => setParents([...parents, { nama_lengkap:'', relationship:'Ayah', is_primary_contact:false }])
  const updateParent = (idx:number, patch: Partial<ParentInput>) => setParents(parents.map((p,i)=>i===idx?{...p,...patch}:p))
  const removeParent = (idx:number) => setParents(parents.filter((_,i)=>i!==idx))

  const submit = async (e:React.FormEvent) => {
    e.preventDefault()
    setErrors({})

    const errs: Record<string, string> = {}
    if (!form.nama_lengkap.trim()) errs.nama_lengkap = 'Nama lengkap wajib diisi.'
    if (!form.tempat_lahir.trim()) errs.tempat_lahir = 'Tempat lahir wajib diisi.'
    if (!form.tanggal_lahir) errs.tanggal_lahir = 'Tanggal lahir wajib diisi.'
    if (!form.posyandu_id) errs.posyandu_id = 'Posyandu wajib dipilih.'
    if (!form.alamat.trim()) errs.alamat = 'Alamat wajib diisi.'

    if (isMasked(form.nik)) errs.nik = 'Data tersamar tidak boleh dikirim langsung.'
    else if (form.nik && !isValidNik(form.nik)) errs.nik = 'NIK anak harus tepat 16 digit angka.'

    if (isMasked(form.nomor_kk)) errs.nomor_kk = 'Data tersamar tidak boleh dikirim langsung.'
    else if (form.nomor_kk && !isValidNik(form.nomor_kk)) errs.nomor_kk = 'Nomor KK harus tepat 16 digit angka.'

    const todayStr = new Date().toISOString().substring(0, 10)
    if (form.tanggal_lahir && form.tanggal_lahir > todayStr) {
      errs.tanggal_lahir = 'Tanggal lahir tidak boleh di masa depan.'
    }

    for (let i = 0; i < parents.length; i++) {
      const p = parents[i]
      if (!p.parent_id) {
        if (!p.nama_lengkap.trim()) {
          errs[`parents.${i}.nama_lengkap`] = `Nama lengkap Orang Tua #${i + 1} wajib diisi.`
        }
        if (isMasked(p.nik)) {
          errs[`parents.${i}.nik`] = `NIK Orang Tua #${i + 1} tersamar tidak boleh dikirim.`
        } else if (p.nik && !isValidNik(p.nik)) {
          errs[`parents.${i}.nik`] = `NIK Orang Tua #${i + 1} harus tepat 16 digit angka.`
        }
        if (isMasked(p.nomor_telepon)) {
          errs[`parents.${i}.nomor_telepon`] = `Nomor telepon Orang Tua #${i + 1} tersamar tidak boleh dikirim.`
        } else if (p.nomor_telepon && !isValidPhone(p.nomor_telepon)) {
          errs[`parents.${i}.nomor_telepon`] = `Format nomor telepon Orang Tua #${i + 1} tidak valid (contoh: 081234567890).`
        }
      }
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      toast.show('Mohon perbaiki data pada kolom yang bermasalah.', 'error')
      return
    }

    setLoading(true)
    try {
      if (mode==='create') {
        const payload:any = {
          ...form,
          posyandu_id: parseInt(form.posyandu_id),
          nik: form.nik || null,
          nomor_kk: form.nomor_kk || null,
          nama_panggilan: form.nama_panggilan || null,
          parents: parents.length ? parents.map(p=>({
            parent_id: p.parent_id || undefined,
            nama_lengkap: p.nama_lengkap,
            nik: isMasked(p.nik) ? undefined : (p.nik || null),
            relationship: p.relationship,
            is_primary_contact: !!p.is_primary_contact,
            nomor_telepon: isMasked(p.nomor_telepon) ? undefined : (p.nomor_telepon || null),
            alamat: p.alamat || null,
            tempat_lahir: p.tempat_lahir || null,
            tanggal_lahir: p.tanggal_lahir || null,
            jenis_kelamin: p.jenis_kelamin || null,
            pekerjaan: p.pekerjaan || null,
          })) : undefined
        }
        await api.post('/children', payload)
        toast.show('Data anak berhasil ditambahkan.')
      } else {
        const dirty = buildDirtyPayload(
          {
            posyandu_id: parseInt(form.posyandu_id),
            nik: form.nik || null,
            nama_lengkap: form.nama_lengkap,
            nama_panggilan: form.nama_panggilan || null,
            tempat_lahir: form.tempat_lahir,
            tanggal_lahir: form.tanggal_lahir,
            jenis_kelamin: form.jenis_kelamin,
            alamat: form.alamat,
            nomor_kk: form.nomor_kk || null,
            status: form.status,
          },
          {
            posyandu_id: parseInt(initialForm.posyandu_id || '0'),
            nik: initialForm.nik || null,
            nama_lengkap: initialForm.nama_lengkap,
            nama_panggilan: initialForm.nama_panggilan || null,
            tempat_lahir: initialForm.tempat_lahir,
            tanggal_lahir: initialForm.tanggal_lahir,
            jenis_kelamin: initialForm.jenis_kelamin,
            alamat: initialForm.alamat,
            nomor_kk: initialForm.nomor_kk || null,
            status: initialForm.status,
          },
          maskedPlaceholders
        )

        if (Object.keys(dirty).length > 0) {
          await api.put(`/children/${id}`, dirty)
        }

        // handle parents via attach separately if needed
        for (const p of parents) {
          if (!p.parent_id) {
            const parentPayload = {
              ...p,
              nik: isMasked(p.nik) ? undefined : (p.nik || null),
              nomor_telepon: isMasked(p.nomor_telepon) ? undefined : (p.nomor_telepon || null),
            }
            await api.post(`/children/${id}/parents`, parentPayload).catch(()=>{})
          }
        }
        toast.show('Data anak berhasil diperbarui.')
      }
      nav('/children')
    } catch (err:any) {
      const fieldErrors = apiValidationErrors(err)
      setErrors(fieldErrors)
      toast.show(apiErrorMessage(err, 'Terjadi kesalahan saat menyimpan data anak.'), 'error')
    } finally { setLoading(false) }
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{mode==='create' ? 'Tambah Anak' : 'Edit Anak'}</h1>
        <p className="text-sm text-slate-500">Lengkapi informasi anak dan posyandu</p>
      </div>
      <form onSubmit={submit} className="space-y-6">
        <Card>
          <CardHeader title="Informasi Anak" subtitle="Field bertanda * wajib diisi" />
          <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Field label="Nama Lengkap" required error={errors.nama_lengkap}>
                <Input
                  required
                  value={form.nama_lengkap}
                  onChange={e=>setForm({...form, nama_lengkap:e.target.value})}
                  hasError={!!errors.nama_lengkap}
                  placeholder="Nama lengkap anak"
                />
              </Field>
            </div>
            <div>
              <Field label="NIK (16 digit)" error={errors.nik}>
                <Input
                  inputMode="numeric"
                  maxLength={16}
                  pattern="[0-9]*"
                  value={form.nik}
                  onChange={e=>setForm({...form, nik:e.target.value.replace(/\D/g, '').slice(0, 16)})}
                  hasError={!!errors.nik}
                  placeholder={maskedPlaceholders.nik ? `Tersembunyi (${maskedPlaceholders.nik})` : "Contoh: 3201012345670001"}
                />
                {maskedPlaceholders.nik && (
                  <p className="mt-1 text-xs text-slate-500">Tersembunyi ({maskedPlaceholders.nik}) — isi hanya untuk mengganti</p>
                )}
              </Field>
            </div>
            <div>
              <Field label="Nama Panggilan" error={errors.nama_panggilan}>
                <Input
                  value={form.nama_panggilan}
                  onChange={e=>setForm({...form, nama_panggilan:e.target.value})}
                  hasError={!!errors.nama_panggilan}
                />
              </Field>
            </div>
            <div>
              <Field label="Tempat Lahir" required error={errors.tempat_lahir}>
                <Input
                  required
                  value={form.tempat_lahir}
                  onChange={e=>setForm({...form, tempat_lahir:e.target.value})}
                  hasError={!!errors.tempat_lahir}
                />
              </Field>
            </div>
            <div>
              <Field label="Tanggal Lahir" required error={errors.tanggal_lahir}>
                <Input
                  required
                  type="date"
                  max={new Date().toISOString().substring(0, 10)}
                  value={form.tanggal_lahir}
                  onChange={e=>setForm({...form, tanggal_lahir:e.target.value})}
                  hasError={!!errors.tanggal_lahir}
                />
              </Field>
            </div>
            <div>
              <Field label="Jenis Kelamin" required error={errors.jenis_kelamin}>
                <Select
                  value={form.jenis_kelamin}
                  onChange={e=>setForm({...form, jenis_kelamin:e.target.value as any})}
                  hasError={!!errors.jenis_kelamin}
                >
                  <option value="L">Laki-laki</option>
                  <option value="P">Perempuan</option>
                </Select>
              </Field>
            </div>
            <div>
              <Field label="Posyandu" required error={errors.posyandu_id}>
                <Select
                  required
                  value={form.posyandu_id}
                  onChange={e=>setForm({...form, posyandu_id:e.target.value})}
                  hasError={!!errors.posyandu_id}
                >
                  <option value="">Pilih Posyandu</option>
                  {posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu} ({p.kode_posyandu})</option>)}
                </Select>
              </Field>
            </div>
            <div className="md:col-span-2">
              <Field label="Alamat" required error={errors.alamat}>
                <Textarea
                  required
                  value={form.alamat}
                  onChange={e=>setForm({...form, alamat:e.target.value})}
                  rows={3}
                  hasError={!!errors.alamat}
                  placeholder="Alamat lengkap"
                />
              </Field>
            </div>
            <div>
              <Field label="Nomor KK (16 digit)" error={errors.nomor_kk}>
                <Input
                  inputMode="numeric"
                  maxLength={16}
                  pattern="[0-9]*"
                  value={form.nomor_kk}
                  onChange={e=>setForm({...form, nomor_kk:e.target.value.replace(/\D/g, '').slice(0, 16)})}
                  hasError={!!errors.nomor_kk}
                  placeholder={maskedPlaceholders.nomor_kk ? `Tersembunyi (${maskedPlaceholders.nomor_kk})` : "Contoh: 3201012345670002"}
                />
                {maskedPlaceholders.nomor_kk && (
                  <p className="mt-1 text-xs text-slate-500">Tersembunyi ({maskedPlaceholders.nomor_kk}) — isi hanya untuk mengganti</p>
                )}
              </Field>
            </div>
            <div>
              <Field label="Status" error={errors.status}>
                <Select
                  value={form.status}
                  onChange={e=>setForm({...form, status:e.target.value})}
                  hasError={!!errors.status}
                >
                  <option value="active">active</option>
                  <option value="inactive">inactive</option>
                </Select>
              </Field>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Orang Tua/Wali" subtitle="Tambahkan minimal satu jika diperlukan" action={<button type="button" onClick={addParent} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm">+ Tambah Orang Tua</button>} />
          <CardContent className="space-y-4">
            {parents.length===0 && <p className="text-sm text-slate-500 text-center py-4">Belum ada orang tua. Klik Tambah Orang Tua.</p>}
            {parents.map((p, idx)=>(
              <div key={idx} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex justify-between items-center"><p className="font-medium text-sm">Orang Tua #{idx+1}</p><button type="button" onClick={()=>removeParent(idx)} className="text-xs text-red-600 hover:underline">Hapus</button></div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="md:col-span-2">
                    <Field label="Pilih dari data existing (opsional)">
                      <Select value={p.parent_id||''} onChange={e=>{
                        const val = e.target.value ? parseInt(e.target.value) : ''
                        if (val) {
                          const ex = existingParents.find((x:any)=>x.id===val)
                          if (ex) updateParent(idx, {
                            parent_id: val,
                            nama_lengkap: ex.nama_lengkap,
                            nik: isMasked(ex.nik) ? '' : (ex.nik||''),
                            masked_nik: isMasked(ex.nik) ? ex.nik : undefined,
                            nomor_telepon: isMasked(ex.nomor_telepon) ? '' : (ex.nomor_telepon||''),
                            masked_nomor_telepon: isMasked(ex.nomor_telepon) ? ex.nomor_telepon : undefined,
                          })
                          else updateParent(idx, { parent_id: val })
                        } else updateParent(idx, { parent_id: '', })
                      }}>
                        <option value="">-- Buat baru --</option>
                        {existingParents.map((ex:any)=><option key={ex.id} value={ex.id}>{ex.nama_lengkap} - {ex.nik||'-'}</option>)}
                      </Select>
                    </Field>
                  </div>
                  <div>
                    <Field label="Nama Lengkap" required error={errors[`parents.${idx}.nama_lengkap`] || (errors.parents as any)}>
                      <Input
                        required
                        value={p.nama_lengkap}
                        onChange={e=>updateParent(idx,{nama_lengkap:e.target.value})}
                        hasError={!!errors[`parents.${idx}.nama_lengkap`]}
                        placeholder="Nama orang tua"
                      />
                    </Field>
                  </div>
                  <div>
                    <Field label="Hubungan" required error={errors[`parents.${idx}.relationship`]}>
                      <Select
                        value={p.relationship}
                        onChange={e=>updateParent(idx,{relationship:e.target.value as any})}
                        hasError={!!errors[`parents.${idx}.relationship`]}
                      >
                        <option value="Ayah">Ayah</option><option value="Ibu">Ibu</option><option value="Wali">Wali</option>
                      </Select>
                    </Field>
                  </div>
                  <div>
                    <Field label="NIK (16 digit)" error={errors[`parents.${idx}.nik`]}>
                      <Input
                        inputMode="numeric"
                        maxLength={16}
                        pattern="[0-9]*"
                        value={p.nik||''}
                        onChange={e=>updateParent(idx,{nik:e.target.value.replace(/\D/g, '').slice(0, 16)})}
                        hasError={!!errors[`parents.${idx}.nik`]}
                        placeholder={(p as any).masked_nik ? `Tersembunyi (${(p as any).masked_nik})` : "Contoh: 3201012345670001"}
                        disabled={!!p.parent_id}
                      />
                      {(p as any).masked_nik && !p.parent_id && (
                        <p className="mt-1 text-xs text-slate-500">Tersembunyi ({(p as any).masked_nik}) — isi hanya untuk mengganti</p>
                      )}
                    </Field>
                  </div>
                  <div>
                    <Field label="No Telepon" error={errors[`parents.${idx}.nomor_telepon`]}>
                      <Input
                        type="tel"
                        inputMode="tel"
                        value={p.nomor_telepon||''}
                        onChange={e=>updateParent(idx,{nomor_telepon:e.target.value})}
                        hasError={!!errors[`parents.${idx}.nomor_telepon`]}
                        placeholder={(p as any).masked_nomor_telepon ? `Tersembunyi (${(p as any).masked_nomor_telepon})` : "08xxxxxxxxxx"}
                        disabled={!!p.parent_id}
                      />
                      {(p as any).masked_nomor_telepon && !p.parent_id && (
                        <p className="mt-1 text-xs text-slate-500">Tersembunyi ({(p as any).masked_nomor_telepon}) — isi hanya untuk mengganti</p>
                      )}
                    </Field>
                  </div>
                  <div className="flex items-center gap-2 pt-6">
                    <input type="checkbox" id={`primary-${idx}`} checked={!!p.is_primary_contact} onChange={e=>updateParent(idx,{is_primary_contact:e.target.checked})} />
                    <label htmlFor={`primary-${idx}`} className="text-xs cursor-pointer">Kontak utama</label>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={() => nav('/children')}>
            Batal
          </Button>
          <Button type="submit" loading={loading}>
            {mode === 'create' ? 'Simpan' : 'Perbarui'}
          </Button>
        </div>
      </form>
    </div>
  )
}
