import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api, apiErrorMessage } from "@/shared/lib/api"
import { Card, CardContent } from "@/shared/components/ui/card"
import { StatusBadge } from "@/shared/components/ui/badge"
import { Modal } from "@/shared/components/ui/modal"
import { TableSkeleton } from "@/shared/components/ui/Skeleton"
import { ConfirmDeleteModal } from "@/shared/components/ui/modal"
import { useToast } from "@/shared/components/ui/toast"
import { useDebounce } from "@/shared/hooks/useDebounce"
import { formatDate, ageFromDob } from "@/shared/lib/utils"
import { useAuth } from '@/features/auth/AuthContext'
import { can } from '@/shared/lib/rbac'

export default function ChildrenList() {
  const toast = useToast()
  // Orang tua hanya melihat anaknya, tanpa tombol ubah atau hapus.
  const { user, role } = useAuth()
  const canManage = can(role, 'manage-anak')
  const isKader = user?.role === 'KADER'

  // Ambil ID dan nama posyandu dinamis dari data auth user
  const kaderPosyanduId = user?.posyandu_id ? String(user.posyandu_id) : (user?.posyandus?.[0]?.id ? String(user.posyandus[0].id) : '')
  const kaderPosyanduNama = user?.posyandu?.nama_posyandu || user?.posyandus?.[0]?.nama_posyandu || ''

  const [data, setData] = useState<any[]>([])
  const [meta, setMeta] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const debounced = useDebounce(search, 500)
  const [posyanduId, setPosyanduId] = useState<string>(isKader ? kaderPosyanduId : '')
  const [posyandus, setPosyandus] = useState<any[]>([])
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(10)
  const [deleteId, setDeleteId] = useState<number | null>(null)
  const [selectedChild, setSelectedChild] = useState<any | null>(null)
  const [deleting, setDeleting] = useState(false)

  // Sinkronisasi otomatis saat user login selesai dimuat
  useEffect(() => {
    if (isKader && kaderPosyanduId) {
      setPosyanduId(kaderPosyanduId)
    }
  }, [isKader, kaderPosyanduId])

  const fetch = async () => {
    setLoading(true)
    try {
      const activePosyanduFilter = isKader ? (kaderPosyanduId || undefined) : (posyanduId || undefined)
      const res = await api.get('/children', { params: { search: debounced || undefined, posyandu_id: activePosyanduFilter, page, per_page: perPage } })
      setData(res.data.data)
      setMeta(res.data.meta)
    } catch (err: any) {
      toast.show(apiErrorMessage(err, 'Data tidak dapat dimuat. Silakan coba kembali.'), 'error')
    } finally { setLoading(false) }
  }

  useEffect(() => { fetch() }, [debounced, posyanduId, kaderPosyanduId, page, perPage])
  useEffect(() => {
    if (!isKader) {
      api.get('/posyandu', { params: { per_page: 100 } })
        .then(r => setPosyandus(r.data.data?.data || r.data.data || []))
        .catch(() => {})
    }
  }, [isKader])

  const handleDelete = async () => {
    if (!deleteId) return
    setDeleting(true)
    try {
      await api.delete(`/children/${deleteId}`)
      toast.show('Data anak berhasil dihapus.')
      setDeleteId(null)
      fetch()
    } catch (e: any) { toast.show(apiErrorMessage(e, 'Gagal menghapus data anak.'), 'error') }
    finally { setDeleting(false) }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Data Anak</h1>
          <p className="text-sm text-slate-500">Kelola data anak per Posyandu • Terisolasi sesuai akses</p>
        </div>
        {canManage && (
          <Link to="/children/create" className="px-5 py-2.5 rounded-xl bg-teal-600 text-white font-medium hover:bg-teal-700">+ Tambah Anak</Link>
        )}
      </div>

      <Card>
        <CardContent className="flex flex-col sm:flex-row sm:flex-wrap gap-5">
          <input value={search} onChange={e=>{setSearch(e.target.value); setPage(1)}} placeholder="Cari nama, NIK, tempat lahir..." className="w-full flex-1 min-w-0 sm:min-w-[220px] px-3 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500" />
          <select
            value={isKader ? kaderPosyanduId : posyanduId}
            onChange={e => {
              if (!isKader) {
                setPosyanduId(e.target.value)
                setPage(1)
              }
            }}
            disabled={isKader}
            className={`w-full sm:w-auto px-3 py-2.5 rounded-xl border border-slate-200 bg-white ${
              isKader ? 'bg-slate-100 cursor-not-allowed opacity-80 text-slate-700 font-medium' : ''
            }`}
          >
            {!isKader && <option value="">Semua Posyandu</option>}
            {isKader ? (
              <option value={kaderPosyanduId}>
                {kaderPosyanduNama || 'Memuat Posyandu...'}
              </option>
            ) : (
              posyandus.map((p: any) => (
                <option key={p.id} value={p.id}>
                  {p.nama_posyandu}
                </option>
              ))
            )}
          </select>
          <select value={perPage} onChange={e=>setPerPage(parseInt(e.target.value))} className="w-full sm:w-auto px-3 py-2.5 rounded-xl border border-slate-200 bg-white">
            <option value={10}>10</option><option value={25}>25</option><option value={50}>50</option><option value={100}>100</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        {loading ? (
          <TableSkeleton rows={5} cols={5} />
        ) : data.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-slate-600 font-medium">Belum ada data anak.</p>
            {canManage && (
              <Link to="/children/create" className="inline-block mt-3 px-4 py-2 rounded-xl bg-teal-600 text-white text-sm">+ Tambah Anak</Link>
            )}
          </div>
        ) : (
          <>
          <div className="hidden md:block overflow-x-auto w-full">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-slate-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="text-left px-5 py-4">Nama</th>
                  <th className="text-left px-5 py-4">Jenis Kelamin</th>
                  <th className="text-left px-5 py-4">Posyandu</th>
                  <th className="text-left px-5 py-4">Status</th>
                  <th className="text-right px-5 py-4">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {data.map((c:any)=>(
                  <tr key={c.id} className="hover:bg-slate-50">
                    <td className="px-5 py-4">
                      <Link to={`/children/${c.id}`} className="font-medium text-slate-900 hover:text-teal-600">{c.nama_lengkap}</Link>
                      <p className="text-xs text-slate-500 mt-1">{ageFromDob(c.tanggal_lahir)}</p>
                    </td>
                    <td className="px-5 py-4"><span className={`px-2 py-1 rounded-full text-xs font-medium ${c.jenis_kelamin==='L'?'bg-sky-100 text-sky-700':'bg-pink-100 text-pink-700'}`}>{c.jenis_kelamin==='L'?'Laki-laki':'Perempuan'}</span></td>
                    <td className="px-5 py-4 text-slate-600">{c.posyandu?.nama_posyandu || '-'}</td>
                    <td className="px-5 py-4"><StatusBadge status={c.status} /></td>
                    <td className="px-5 py-4">
                      <div className="flex flex-wrap justify-end gap-2">
                        <button onClick={() => setSelectedChild(c)} className="px-3 py-2 rounded-lg border border-slate-200 text-xs font-medium hover:bg-slate-50">Lihat Detail</button>
                        {canManage && <>
                        <Link to={`/children/${c.id}/edit`} className="px-3 py-2 rounded-lg bg-white border border-slate-200 text-xs hover:bg-slate-50">Edit</Link>
                        <button onClick={()=>setDeleteId(c.id)} className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs hover:bg-red-100">Hapus</button>
                        </>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="block md:hidden space-y-5 mt-4">
            {data.map((c: any) => (
              <Card key={c.id}>
                <div className="p-5 border-b border-slate-100 flex justify-between items-start gap-3">
                  <div>
                    <Link to={`/children/${c.id}`} className="font-semibold text-slate-900 hover:text-teal-600">{c.nama_lengkap}</Link>
                    <p className="mt-1 text-xs text-slate-500">{ageFromDob(c.tanggal_lahir)}</p>
                  </div>
                  <StatusBadge status={c.status} />
                </div>
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-xs text-slate-500">Jenis Kelamin</p>
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${c.jenis_kelamin === 'L' ? 'bg-sky-100 text-sky-700' : 'bg-pink-100 text-pink-700'}`}>
                      {c.jenis_kelamin === 'L' ? 'L' : 'P'}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500">Posyandu</p>
                    <p className="text-slate-700">{c.posyandu?.nama_posyandu || '-'}</p>
                  </div>
                </div>
                <div className="px-5 pb-5 space-y-2">
                  <button onClick={() => setSelectedChild(c)} className="w-full px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Lihat Detail</button>
                  {canManage && (
                    <div className="flex gap-2">
                      <Link to={`/children/${c.id}/edit`} className="flex-1 text-center px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium text-slate-700 hover:bg-slate-50">Ubah</Link>
                      <button onClick={() => setDeleteId(c.id)} className="flex-1 px-4 py-2 rounded-xl border border-red-200 bg-red-50 text-sm font-medium text-red-700 hover:bg-red-100">Hapus</button>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
          </>
        )}
        {meta && (
          <div className="flex flex-wrap justify-between items-center gap-4 px-6 py-5 border-t">
            <p className="text-xs text-slate-500">Total {meta.total} • Halaman {meta.current_page}/{meta.last_page}</p>
            <div className="flex gap-2">
              <button disabled={page<=1} onClick={()=>setPage(p=>p-1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Sebelumnya</button>
              <button disabled={page>=meta.last_page} onClick={()=>setPage(p=>p+1)} className="px-3 py-1.5 rounded-lg border border-slate-200 text-sm disabled:opacity-50">Selanjutnya</button>
            </div>
          </div>
        )}
      </Card>

      <ConfirmDeleteModal open={!!deleteId} onClose={()=>setDeleteId(null)} onConfirm={handleDelete} loading={deleting} />
      <Modal open={!!selectedChild} onClose={() => setSelectedChild(null)} title="Detail Anak">
        {selectedChild && (
          <div className="space-y-5">
            <div>
              <h4 className="text-lg font-semibold text-slate-900">{selectedChild.nama_lengkap}</h4>
              <p className="text-sm text-slate-500 mt-1">{selectedChild.posyandu?.nama_posyandu || 'Posyandu belum ditentukan'}</p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <div><p className="text-xs text-slate-500">NIK</p><p className="mt-1 text-slate-800 break-all">{selectedChild.nik || '-'}</p></div>
              <div><p className="text-xs text-slate-500">Tempat, tanggal lahir</p><p className="mt-1 text-slate-800">{selectedChild.tempat_lahir || '-'}, {formatDate(selectedChild.tanggal_lahir)}</p></div>
              <div><p className="text-xs text-slate-500">Orang tua/wali</p><p className="mt-1 text-slate-800">{selectedChild.parents?.length ? selectedChild.parents.map((parent: any) => parent.nama_lengkap).join(', ') : '-'}</p></div>
              <div className="sm:col-span-2"><p className="text-xs text-slate-500">Alamat</p><p className="mt-1 text-slate-800">{selectedChild.alamat || '-'}</p></div>
            </div>
            <Link to={`/children/${selectedChild.id}`} className="inline-flex px-4 py-2.5 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700">Buka Profil Anak</Link>
          </div>
        )}
      </Modal>
    </div>
  )
}
