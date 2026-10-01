import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { apiEducations } from '@/shared/lib/api'
import { CONFIG } from '@/shared/lib/config'
import { Card, CardContent, CardHeader } from '@/shared/components/ui/card'
import { Spinner } from '@/shared/components/ui/field'
import { ROUTES } from '@/app/routes'
import type { Education } from '@/shared/types'

function PublicHeader() {
  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10">
      <div className="max-w-5xl mx-auto px-4 py-4 flex justify-between items-center">
        <Link to={ROUTES.edukasiPublic} className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-teal-600 flex items-center justify-center text-white font-bold">
            P
          </div>
          <span className="font-bold text-slate-800">{CONFIG.APP_NAME}</span>
        </Link>
        <Link
          to={ROUTES.login}
          className="px-4 py-2 rounded-xl bg-teal-600 text-white text-sm font-medium hover:bg-teal-700"
        >
          Login
        </Link>
      </div>
    </header>
  )
}

export default function EdukasiPublic() {
  const [rows, setRows] = useState<Education[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    void (async () => {
      try {
        const { data } = await apiEducations.publicList({ per_page: 50 })
        setRows(data)
      } catch {
        // Halaman publik harus tetap terbuka walau API gagal.
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      <main className="max-w-5xl mx-auto px-4 py-8 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edukasi Publik</h1>
          <p className="text-sm text-slate-500 mt-1">
            Informasi kesehatan ibu dan anak untuk warga, tanpa perlu login.
          </p>
        </div>

        {loading ? (
          <Spinner />
        ) : rows.length === 0 ? (
          <Card>
            <CardContent className="text-center py-10 text-slate-500">
              Belum ada konten publik yang dipublikasikan.
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            {rows.map((e) => (
              <Card key={e.id}>
                <CardHeader title={e.title} subtitle={e.category?.name} />
                <CardContent>
                  <div
                    className="prose prose-sm text-slate-600 line-clamp-4"
                    dangerouslySetInnerHTML={{ __html: e.content }}
                  />
                  <Link
                    to={ROUTES.edukasiDetail(e.slug)}
                    className="inline-block mt-3 text-sm text-teal-600 hover:underline font-medium"
                  >
                    Baca selengkapnya →
                  </Link>
                  {e.source && <p className="text-xs text-slate-400 mt-2">Sumber: {e.source}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}

export function EdukasiPublicDetail() {
  const { slug = '' } = useParams()
  const [item, setItem] = useState<Education | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!slug) return

    setLoading(true)

    void (async () => {
      try {
        setItem(await apiEducations.detail(slug))
      } catch {
        setItem(null)
      } finally {
        setLoading(false)
      }
    })()
  }, [slug])

  if (loading) return <Spinner label="Memuat artikel..." />

  if (!item) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="font-medium text-slate-800">Artikel tidak ditemukan</p>
          <Link to={ROUTES.edukasiPublic} className="inline-block mt-4 text-teal-600 hover:underline text-sm">
            Kembali ke Edukasi Publik
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <PublicHeader />

      <article className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
          {item.category?.name && (
            <p className="text-xs font-semibold text-teal-600 uppercase tracking-wide">
              {item.category.name}
            </p>
          )}
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-2">{item.title}</h1>
          {item.published_at && (
            <p className="text-xs text-slate-400 mt-2">
              Dipublikasikan {new Date(item.published_at).toLocaleDateString('id-ID')}
            </p>
          )}

          <div
            className="prose prose-sm text-slate-700 mt-6 max-w-none"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />

          {item.source && (
            <p className="text-xs text-slate-500 mt-6 border-t border-slate-100 pt-3">
              Sumber: {item.source}
              {item.source_url && (
                <a href={item.source_url} className="text-teal-600 underline ml-1">
                  {item.source_url}
                </a>
              )}
            </p>
          )}
        </div>
      </article>
    </div>
  )
}