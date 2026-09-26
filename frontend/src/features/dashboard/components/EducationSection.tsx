import React, { useState } from 'react'
import { Link } from 'react-router-dom'

type EducationItem = {
  id: number
  title: string
  slug: string
  category?: { id: number; name: string }
  published_at?: string
}

type ScheduleItem = {
  id: number
  title: string
  date: string
  start_time?: string
  location?: string
  posyandu?: { nama_posyandu: string }
}

interface EducationSectionProps {
  educations: EducationItem[]
  schedules: ScheduleItem[]
}

export default function EducationSection({ educations, schedules }: EducationSectionProps) {
  const [activeFilter, setActiveFilter] = useState('Semua')
  const filters = ['Semua', 'Stunting & Tumbuh Kembang', 'MPASI & Gizi', 'Tips Bunda']

  // Format tanggal ramah (contoh: "26 Sep 2026")
  const formatFriendlyDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  // Format waktu ramah (contoh: "08.00 Pagi")
  const formatFriendlyTime = (timeStr?: string) => {
    if (!timeStr) return ''
    const [hour, minute] = timeStr.split(':')
    const h = parseInt(hour, 10)
    const period = h < 12 ? 'Pagi' : h < 15 ? 'Siang' : h < 18 ? 'Sore' : 'Malam'
    return `${hour}.${minute} ${period}`
  }

  // Format tanggal jadwal (contoh: "Kamis, 1 Okt 2026")
  const formatScheduleDate = (dateStr?: string) => {
    if (!dateStr) return ''
    const d = new Date(dateStr)
    return d.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' })
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Kolom Kiri: Edukasi */}
      <div className="lg:col-span-2 space-y-6">
        
        {/* 1. Kategori Filter (Disederhanakan) */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          {filters.map((f) => (
            <button
              key={f}
              onClick={() => setActiveFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors ${
                activeFilter === f
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 2. Sorotan Pencegahan Stunting (Korsel Horizontal) */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 px-1">Sorotan Pencegahan Stunting</h3>
          <div className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scrollbar-hide">
            
            {/* Kartu Sorotan 1 */}
            <div className="min-w-[280px] sm:min-w-[320px] bg-amber-50 border border-amber-100 rounded-2xl p-5 snap-start shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-amber-600 text-lg">⚠️</span>
                <h4 className="font-bold text-amber-900">Ciri Anak Berisiko Stunting</h4>
              </div>
              <ul className="space-y-2">
                <li className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="text-amber-500 font-bold">✓</span>
                  <span>Berat tidak naik 2 bulan</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="text-amber-500 font-bold">✓</span>
                  <span>Tinggi di bawah garis normal</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-amber-800">
                  <span className="text-amber-500 font-bold">✓</span>
                  <span>Anak sering sakit</span>
                </li>
              </ul>
            </div>

            {/* Kartu Sorotan 2 */}
            <div className="min-w-[280px] sm:min-w-[320px] bg-emerald-50 border border-emerald-100 rounded-2xl p-5 snap-start shrink-0">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">🥚🐟🥩</span>
                <h4 className="font-bold text-emerald-900">Senjata Cegah Stunting!</h4>
              </div>
              <p className="text-sm text-emerald-800 font-medium leading-relaxed">
                Wajib ada Protein Hewani di setiap porsi!
              </p>
              <p className="text-xs text-emerald-700 mt-2">
                Telur, ikan, ayam, atau daging sangat penting untuk pertumbuhan otak dan tinggi badan si kecil.
              </p>
            </div>

          </div>
        </div>

        {/* 3. Grid Artikel (Mengutamakan Visual) */}
        <div className="space-y-3">
          <h3 className="font-bold text-slate-800 px-1">Artikel Terbaru</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {educations.length > 0 ? (
              educations.map((item) => (
                <Link 
                  key={item.id} 
                  to={`/edukasi/${item.slug}`}
                  className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden group flex flex-col"
                >
                  {/* Tempat Gambar */}
                  <div className="bg-slate-100 h-32 w-full flex items-center justify-center text-slate-300 group-hover:bg-slate-200 transition-colors">
                    <svg className="w-8 h-8 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  
                  {/* Konten Teks */}
                  <div className="p-4 flex flex-col flex-1">
                    <span className="inline-block px-2.5 py-1 bg-teal-50 text-teal-700 text-[10px] font-bold uppercase tracking-wider rounded-md w-fit mb-2">
                      {item.category?.name || 'Kesehatan'}
                    </span>
                    <h4 className="font-bold text-slate-900 text-sm leading-snug mb-3 group-hover:text-teal-600 transition-colors line-clamp-2">
                      {item.title}
                    </h4>
                    <div className="mt-auto text-[11px] text-slate-400 font-medium">
                      {formatFriendlyDate(item.published_at)}
                    </div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="col-span-full py-10 text-center text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
                Belum ada artikel untuk kategori ini.
              </div>
            )}
          </div>
        </div>

      </div>

      {/* 4. Bagian Jadwal Posyandu (Sidebar Kanan) */}
      <div className="space-y-4">
        <h3 className="font-bold text-slate-800 px-1">Jadwal Terdekat</h3>
        
        <div className="space-y-3">
          {schedules.length > 0 ? (
            schedules.map((sch, idx) => {
              // Sorot jadwal pertama (terdekat)
              const isNearest = idx === 0;
              
              return (
                <div 
                  key={sch.id} 
                  className={`p-4 rounded-2xl border transition-colors ${
                    isNearest 
                      ? 'bg-teal-50 border-teal-200 shadow-sm' 
                      : 'bg-white border-slate-100 hover:border-teal-100'
                  }`}
                >
                  {isNearest && (
                    <span className="inline-block px-2 py-0.5 bg-teal-600 text-white text-[10px] font-bold uppercase tracking-wider rounded-md mb-2">
                      Paling Dekat
                    </span>
                  )}
                  <h4 className="font-bold text-slate-900 text-sm mb-3">{sch.title}</h4>
                  
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <span className="text-sm">📅</span>
                      <span className="font-medium">{formatScheduleDate(sch.date)}</span>
                    </div>
                    
                    {sch.start_time && (
                      <div className="flex items-center gap-2 text-sm text-slate-600">
                        <span className="text-sm">⏰</span>
                        <span>{formatFriendlyTime(sch.start_time)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="py-8 text-center text-slate-400 text-sm bg-white rounded-2xl border border-dashed border-slate-200">
              Belum ada jadwal posyandu.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
