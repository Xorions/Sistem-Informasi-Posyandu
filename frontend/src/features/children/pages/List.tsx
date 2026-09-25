import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { Badge, StatusBadge } from "@/shared/components/ui/badge"
import { ConfirmDeleteModal } from "@/shared/components/ui/modal"
import { useToast } from "@/shared/components/ui/toast"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { formatDate, ageFromDob } from "@/shared/lib/utils"

export default function ChildrenList() {
  const toast = useToast()
  const [data, setData] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 500)
  const [posyanduId, setPosyanduId] = useState('')
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [deleting, setDeleting] = useState(false)

  const fetch = async () => {
    setLoading(true)
    try {
      const res = await api.get('/children', { params: { search: debounced || undefined, posyandu_id: posyanduId || undefined, page, per_page: perPage } })
      setData(res.data.data)
      setMeta(res.data.meta)
    } catch (err:any) {
      toast.show(err.response?.data?.message || 'Data tidak dapat dimuat. Silakan coba kembali.', 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debounced, posyanduId, page, perPage])
  useEffect(()=>{ api.get('/posyandu', { params: { per_page: 100 }}).then(r=>setPosyandus(r.data.data?.data || r.data.data || [])).catch(()=>{}) },[])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/children/${deleteId}`)
      toast.show('Data anak berhasil dihapus.')
      setDeleteId(null)
      fetch()
    } catch (e:any) { toast.show(e.response?.data?.message || 'Terjadi kesalahan.', 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Anak</h1>
          <p className="text-sm text-slate-500">Kelola data anak per Posyandu • Terisolasi sesuai akses</p>
        </div>
        <Link to="/children/create" className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700">+ Tambah Anak</Link>
      </div>

      <Card>
        <CardContent className="flex flex-wrap gap-3">
          <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} placeholder="Cari nama, NIK, tempat lahir..." className="flex-1 min-w-[220px] px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select value={posyanduId} onChange={e=>{setPosyanduId(e.target.value); setPage(1)}} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
            <option value="">Semua Posyandu</option>
            {posyandus.map((p:any)=><option key={p.id} value={p.id}>{p.nama_posyandu}</option>)}
          </select>
          <select value={perPage} onChange={e=>setPerPage(parseInt(e.target.value))} className="px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        {loading ? <div className="p-10 text-center text-slate-500">Memuat data anak...</div> :
         data.length===0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-600 font-medium">Belum ada data anak.</p>
            <Link to="/children/create" className="inline-block mt-3 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">+ Tambah Anak</Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-4 py-3">Nama</th>
                  <th className="text-left px-4 py-3">NIK</th>
                  <th className="text-left px-4 py-3">TTL</th>
                  <th className="text-left px-4 py-3">JK</th>
                  <th className="text-left px-4 py-3">Orang Tua</th>
                  <th className="text-left px-4 py-3">Posyandu</th>
                  <th className="text-left px-4 py-3">Status</th>
                  <th className="text-right px-4 py-3">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c:any)=>(
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <Link to={`/children/${c.id}`} className="font-medium text-slate-900 hover:text-teal-600">{c.nama_lengkap}</Link>
                      <p className="text-xs text-slate-500">{ageFromDob(c.tanggal_lahir)} • {formatDate(c.tanggal_lahir)}</p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{c.nik || '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.tempat_lahir}, {formatDate(c.tanggal_lahir)}</td>
                    <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.jenis_kelamin==='L'?'bg-sky-100 text-sky-700':'bg-pink-100 text-pink-700'}`}>{c.jenis_kelamin==='L'?'L':'P'}</span></td>
                    <td className="px-4 py-3 text-slate-600">{c.parents?.length ? c.parents.map((p:any)=>p.nama_lengkap).join(', ') : '-'}</td>
                    <td className="px-4 py-3 text-slate-600">{c.posyandu?.nama_posyandu || '-'}</td>
                    <td className="px-4 py-3"><StatusBadge status={c.status} /></td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <Link to={`/children/${c.id}`} className="px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs hover:bg-white">Lihat</Link>
                        <Link to={`/children/${c.id}/edit`} className="px-2.5 py-1.5 rounded-lg bg-white border border-slate-200 text-xs hover:bg-slate-50">Edit</Link>
                        <button onClick={()=>setDeleteId(c.id)} className="px-2.5 py-1.5 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs hover:bg-red-100">Hapus</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {meta && (
          <div className="flex flex-wrap justify-between items-center gap-3 px-6 py-4 border-t">
            <p className="text-xs text-slate-500">Total {meta.total} • Halaman {meta.current_page}/{meta.last_page}</p>
            <div className="flex gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Prev</button>
              <button disabled={page>=meta.last_page} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Next</button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDeleteModal open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete} loading={deleting} />
    </div>
  )
}
