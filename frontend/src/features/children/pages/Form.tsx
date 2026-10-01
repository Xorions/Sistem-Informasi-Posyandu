import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from "@/shared/lib/api"
import { Card, CardContent, CardHeader } from "@/shared/components/ui/card"
import { useToast } from "@/shared/components/ui/toast"

type ParentInput = {
  parent_id?: number | ''
  nama_lengkap: string
  nik?: string
  relationship: 'Ayah'|'Ibu'|'Wali'
  is_primary_contact?: boolean
  nomor_telepon?: string
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
  const [parents, setParents] = useState<ParentInput[]>([])
  const [existingParents, setExistingParents] = useState<any[]>([])

  useEffect(()=>{
    api.get('/posyandu', { params: { per_page: 100 }}).then(r=>setPosyandus(r.data.data?.data||r.data.data||[])).catch(()=>{})
    api.get('/parents', { params: { per_page: 100 }}).then(r=>setExistingParents(r.data.data?.data || r.data.data || [] )).catch(()=>{})
    if (mode==='edit' && id) {
      api.get(`/children/${id}`).then(r=>{
        const c = r.data.data
        setForm({
          posyandu_id: String(c.posyandu_id||''),
          nik: c.nik||'',
          nama_lengkap: c.nama_lengkap||'',
          nama_panggilan: c.nama_panggilan||'',
          tempat_lahir: c.tempat_lahir||'',
          tanggal_lahir: c.tanggal_lahir ? c.tanggal_lahir.substring(0,10) : '',
          jenis_kelamin: c.jenis_kelamin||'L',
          alamat: c.alamat||'',
          nomor_kk: c.nomor_kk||'',
          status: c.status||'active',
        })
        if (c.parents?.length) {
          setParents(c.parents.map((p:any)=>({
            parent_id: p.id,
            nama_lengkap: p.nama_lengkap,
            relationship: p.pivot?.relationship || 'Ayah',
            is_primary_contact: !!p.pivot?.is_primary_contact,
            nik: p.nik||'',
            nomor_telepon: p.nomor_telepon||'',
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
    setLoading(true)
    try {
      const payload:any = { ...form, posyandu_id: parseInt(form.posyandu_id), parents: parents.length? parents.map(p=>({
        parent_id: p.parent_id || undefined,
        nama_lengkap: p.nama_lengkap,
        nik: p.nik || null,
        relationship: p.relationship,
        is_primary_contact: !!p.is_primary_contact,
        nomor_telepon: p.nomor_telepon || null,
        alamat: p.alamat || null,
        tempat_lahir: p.tempat_lahir || null,
        tanggal_lahir: p.tanggal_lahir || null,
        jenis_kelamin: p.jenis_kelamin || null,
        pekerjaan: p.pekerjaan || null,
      })) : undefined }
      if (mode==='create') {
        await api.post('/children', payload)
        toast.show('Data anak berhasil ditambahkan.')
      } else {
        await api.put(`/children/${id}`, {
          posyandu_id: parseInt(form.posyandu_id),
          nik: form.nik || null,
          nama_lengkap: form.nama_lengkap,
          nama_panggilan: form.nama_panggilan || null,
          tempat_lahir: form.tempat_lahir,
          tanggal_lahir: form.tanggal_lahir,
          jenis_kelamin: form.jenis_kelamin,
          alamat: form.alamat,
          nomor_kk: form.nomor_kk||null,
          status: form.status,
        })
        // handle parents via attach separately if needed
        for (const p of parents) {
          if (!p.parent_id) {
            await api.post(`/children/${id}/parents`, p).catch(()=>{})
          }
        }
        toast.show('Data anak berhasil diperbarui.')
      }
      nav('/children')
    } catch (err:any) {
      const msg = err.response?.data?.message || err.response?.data?.errors && JSON.stringify(err.response.data.errors) || 'Terjadi kesalahan'
      toast.show(msg, 'error')
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
              <label className="text-sm font-medium">Nama Lengkap *</label>
              <input required value={form.nama_lengkap} onChange={e=>setForm({...form, nama_lengkap:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 focus:ring-2 focus:ring-teal-500 outline-none" placeholder="Nama lengkap anak" />
            </div>
            <div>
              <label className="text-sm font-medium">NIK</label>
              <input value={form.nik} onChange={e=>setForm({...form, nik:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" placeholder="NIK (opsional)" />
            </div>
            <div>
              <label className="text-sm font-medium">Nama Panggilan</label>
              <input value={form.nama_panggilan} onChange={e=>setForm({...form, nama_panggilan:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="text-sm font-medium">Tempat Lahir *</label>
              <input required value={form.tempat_lahir} onChange={e=>setForm({...form, tempat_lahir:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="text-sm font-medium">Tanggal Lahir *</label>
              <input required type="date" value={form.tanggal_lahir} onChange={e=>setForm({...form, tanggal_lahir:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="text-sm font-medium">Jenis Kelamin *</label>
              <select value={form.jenis_kelamin} onChange={e=>setForm({...form, jenis_kelamin:e.target.value as any})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                <option value="L">Laki-laki</option>
                <option value="P">Perempuan</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium">Posyandu *</label>
              <select required value={form.posyandu_id} onChange={e=>setForm({...form, posyandu_id:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                <option value="">Pilih Posyandu</option>
                {posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu} ({p.kode_posyandu})</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium">Alamat *</label>
              <textarea required value={form.alamat} onChange={e=>setForm({...form, alamat:e.target.value})} rows={3} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" placeholder="Alamat lengkap" />
            </div>
            <div>
              <label className="text-sm font-medium">Nomor KK</label>
              <input value={form.nomor_kk} onChange={e=>setForm({...form, nomor_kk:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200" />
            </div>
            <div>
              <label className="text-sm font-medium">Status</label>
              <select value={form.status} onChange={e=>setForm({...form, status:e.target.value})} className="mt-1 w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
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
                    <label className="text-xs font-medium">Pilih dari data existing (opsional)</label>
                    <select value={p.parent_id||''} onChange={e=>{
                      const val = e.target.value ? parseInt(e.target.value) : ''
                      if (val) {
                        const ex = existingParents.find((x:any)=>x.id===val)
                        if (ex) updateParent(idx, { parent_id: val, nama_lengkap: ex.nama_lengkap, nik: ex.nik, nomor_telepon: ex.nomor_telepon })
                        else updateParent(idx, { parent_id: val })
                      } else updateParent(idx, { parent_id: '', })
                    }} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
                      <option value="">-- Buat baru --</option>
                      {existingParents.map((ex:any)=><option key={ex.id} value={ex.id}>{ex.nama_lengkap} - {ex.nik||'-'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">Nama Lengkap *</label>
                    <input required value={p.nama_lengkap} onChange={e=>updateParent(idx,{nama_lengkap:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" placeholder="Nama orang tua" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">Hubungan *</label>
                    <select value={p.relationship} onChange={e=>updateParent(idx,{relationship:e.target.value as any})} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-sm">
                      <option value="Ayah">Ayah</option><option value="Ibu">Ibu</option><option value="Wali">Wali</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-medium">NIK</label>
                    <input value={p.nik||''} onChange={e=>updateParent(idx,{nik:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                  </div>
                  <div>
                    <label className="text-xs font-medium">No Telepon</label>
                    <input value={p.nomor_telepon||''} onChange={e=>updateParent(idx,{nomor_telepon:e.target.value})} className="mt-1 w-full px-3 py-2 rounded-xl border border-slate-200 text-sm" />
                  </div>
                  <div className="flex items-center gap-2">
                    <input type="checkbox" checked={!!p.is_primary_contact} onChange={e=>updateParent(idx,{is_primary_contact:e.target.checked})} />
                    <span className="text-xs">Kontak utama</span>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="flex justify-end gap-3">
          <button type="button" onClick={()=>nav('/children')} className="px-6 py-2.5 rounded-xl border border-slate-200 text-slate-700">Batal</button>
          <button disabled={loading} className="px-8 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700 disabled:opacity-50 flex items-center gap-2">
            {loading && <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"/>}
            {mode==='create' ? 'Simpan' : 'Perbarui'}
          </button>
        </div>
      </form>
    </div>
  )
}
