import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage, apiPemeriksaanBumil } from '@/shared/lib/api'
import { ROUTES } from '@/app/routes'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Badge } from '@/shared/components/ui/badge'
import { Button, EmptyState, ErrorState, Field, Input, Select, Spinner } from '@/shared/components/ui/field'
import {
  EMPTY_PAGE_META,
  STATUS_BUMIL_LABEL,
  type ApiMeta,
  type PemeriksaanBumil,
  type StatusBumil,
} from '@/shared/types'

const STATUS_OPTIONS: StatusBumil[] = ['normal', 'perlu_perhatian', 'danger']

function statusClass(status: StatusBumil): string {
  if (status === 'normal') return 'bg-emerald-50 text-emerald-700 border border-emerald-100'
  if (status === 'perlu_perhatian') return 'bg-amber-50 text-amber-700 border border-amber-100'
  return 'bg-red-50 text-red-700 border border-red-100'
}

export default function PemeriksaanBumilPage() {
  const [rows, setRows] = useState<PemeriksaanBumil[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [meta, setMeta] = useState<ApiMeta>(EMPTY_PAGE_META)

  const [statusFilter, setStatusFilter] = useState('')
  const [from, setFrom] = useState('')
  const [to, setTo] = useState('')
  const [page, setPage] = useState(1)

  const load = useCallback(async () => {
    try {
      setError(null)
      const { data, meta } = await apiPemeriksaanBumil.list({
        status: statusFilter || undefined,
        from: from || undefined,
        to: to || undefined,
        page,
        per_page: 20,
      })

      setRows(data)
      setMeta(meta ?? EMPTY_PAGE_META)
    } catch (err) {
      setError(apiErrorMessage(err, 'Data pemeriksaan bumil tidak dapat dimuat.'))
    } finally {
      setLoading(false)
    }
  }, [statusFilter, from, to, page])

  useEffect(() => {
    void load()
  }, [load])

  const resetPage = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v)
    setPage(1)
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader
          title="Pemeriksaan Ibu Hamil"
          subtitle="Rekap hasil pemeriksaan kehamilan seluruh posyandu. Entry diklik dari halaman detail ibu hamil."
        />
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Dari tanggal">
              <Input type="date" value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
            </Field>
            <Field label="Sampai tanggal">
              <Input type="date" value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
            </Field>
            <Field label="Status">
              <Select value={statusFilter} onChange={(e) => resetPage(setStatusFilter)(e.target.value)}>
                <option value="">Semua status</option>
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {STATUS_BUMIL_LABEL[s]}
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
            <EmptyState title="Belum ada pemeriksaan" description="Belum ada hasil pemeriksaan ibu hamil pada rentang ini." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400 border-b border-slate-100">
                    <th className="py-3 pr-3 font-semibold">Tanggal</th>
                    <th className="py-3 pr-3 font-semibold">Nama Ibu</th>
                    <th className="py-3 pr-3 font-semibold">Usia Kehamilan</th>
                    <th className="py-3 pr-3 font-semibold">BB</th>
                    <th className="py-3 pr-3 font-semibold">Tensi</th>
                    <th className="py-3 pr-3 font-semibold">LILA</th>
                    <th className="py-3 pr-3 font-semibold">Status</th>
                    <th className="py-3 font-semibold" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((p) => (
                    <tr key={p.id} className="border-b border-slate-50 last:border-0">
                      <td className="py-3 pr-3 text-slate-600">{p.tanggal_periksa}</td>
                      <td className="py-3 pr-3 font-medium text-slate-800">{p.nama_ibu || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{p.usia_kehamilan} minggu</td>
                      <td className="py-3 pr-3 text-slate-600">{p.berat_badan ? `${p.berat_badan} kg` : '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">{p.tekanan_darah || '-'}</td>
                      <td className="py-3 pr-3 text-slate-600">
                        {p.lingkar_lengan_atas ? `${p.lingkar_lengan_atas} cm` : '-'}
                      </td>
                      <td className="py-3 pr-3">
                        <Badge label={STATUS_BUMIL_LABEL[p.status]} className={statusClass(p.status)} />
                      </td>
                      <td className="py-3 text-right">
                        <Link
                          to={ROUTES.bumil(p.ibu_hamil_id)}
                          className="text-teal-600 hover:text-teal-800 text-xs font-medium"
                        >
                          Detail
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && !error && meta.last_page > 1 && (
            <div className="flex items-center justify-between pt-4 text-xs text-slate-500">
              <span>
                Halaman {meta.current_page} dari {meta.last_page} ({meta.total} pemeriksaan)
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
    </div>
  )
}