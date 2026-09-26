import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { api } from "@/shared/lib/api"
import { useAuth } from "@/features/auth/AuthContext"
import EducationSection from "../components/EducationSection"

type EducationItem = {
  id: number
  title: string
  slug: string
  content: string
  excerpt?: string
  thumbnail?: string
  source?: string
  category?: { id: number; name: string }
  published_at?: string
}

type ScheduleItem = {
  id: number
  title: string
  date: string
  start_time?: string
  end_time?: string
  location?: string
  description?: string
  posyandu?: { nama_posyandu: string }
}

export default function Beranda() {
  const { user } = useAuth()
  const [educations, setEducations] = useState<EducationItem[]>([])
  const [categories, setCategories] = useState<{ id: number; name: string }[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [schedules, setSchedules] = useState<ScheduleItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true)
      try {
        const [eduRes, catRes, schRes] = await Promise.all([
          api.get('/edukasi', { params: { per_page: 8, category_id: selectedCategory || undefined } }),
          api.get('/edukasi/categories'),
          api.get('/schedules', { params: { per_page: 4 } }),
        ])

        const eduList = eduRes.data?.data?.data || eduRes.data?.data || []
        setEducations(Array.isArray(eduList) ? eduList : [])

        const catList = catRes.data?.data || []
        setCategories(Array.isArray(catList) ? catList : [])

        const schList = schRes.data?.data?.data || schRes.data?.data || []
        setSchedules(Array.isArray(schList) ? schList : [])
      } catch (err) {
        console.error('Failed to load Beranda data', err)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedCategory])

  const stripHtml = (html: string) => {
    const tmp = document.createElement('DIV')
    tmp.innerHTML = html
    return tmp.textContent || tmp.innerText || ''
  }

  return (
    <div className="space-y-8">
      {/* Header Sambutan */}
      <div className="bg-gradient-to-r from-teal-700 via-teal-600 to-emerald-600 rounded-3xl p-6 lg:p-8 text-white shadow-sm">
        <div className="max-w-2xl">
          <span className="inline-block px-3 py-1 bg-white/20 backdrop-blur-sm rounded-full text-xs font-semibold mb-3 tracking-wide">
            Pusat Informasi & Edukasi Kesehatan
          </span>
          <h1 className="text-2xl lg:text-3xl font-bold leading-tight">
            Selamat Datang, {user?.name || 'Ibu / Bapak'} 👋
          </h1>
          <p className="text-sm lg:text-base text-teal-50 mt-2 leading-relaxed">
            Dapatkan informasi terpercaya seputar pencegahan stunting, pemenuhan gizi balita, dan jadwal kegiatan Posyandu untuk mendukung tumbuh kembang optimal si kecil.
          </p>

          <div className="flex flex-wrap gap-3 mt-6">
            <Link
              to="/examinations"
              className="px-4 py-2.5 bg-white text-teal-800 font-semibold text-sm rounded-xl hover:bg-teal-50 transition shadow-sm"
            >
              📋 Riwayat Pemeriksaan
            </Link>
            <Link
              to="/pertumbuhan"
              className="px-4 py-2.5 bg-teal-800/60 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl transition backdrop-blur-sm"
            >
              🌱 Pantau Tumbuh Kembang
            </Link>
            <Link
              to="/analisis"
              className="px-4 py-2.5 bg-teal-800/60 hover:bg-teal-800 text-white font-semibold text-sm rounded-xl transition backdrop-blur-sm"
            >
              🔬 Analisis Gizi
            </Link>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center text-slate-400 text-sm">Memuat data...</div>
      ) : (
        <EducationSection educations={educations} schedules={schedules} />
      )}
    </div>
  )
}
