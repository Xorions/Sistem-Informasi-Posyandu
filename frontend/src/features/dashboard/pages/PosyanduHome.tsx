import React from 'react'
import { BookOpen, Syringe, Apple, MessageCircleQuestion, ChevronRight, Calendar, Clock, MapPin, TrendingUp, Bell, HeartHandshake } from 'lucide-react'

export default function PosyanduHome() {
  return (
    <div className="max-w-md mx-auto min-h-screen bg-slate-50 text-slate-800 flex flex-col antialiased shadow-xl relative">
      {/* Header */}
      <header className="bg-teal-600 text-white p-5 rounded-b-3xl shadow-sm">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-teal-100 flex items-center justify-center text-teal-700 font-bold text-lg border-2 border-white">
              S
            </div>
            <div>
              <p className="text-sm text-teal-100">Selamat pagi,</p>
              <h1 className="font-bold text-lg leading-tight">Bunda Sari</h1>
            </div>
          </div>
          <button className="w-10 h-10 rounded-full bg-teal-500/50 flex items-center justify-center relative">
            <Bell size={20} />
            <span className="absolute top-2 right-2 w-2.5 h-2.5 bg-amber-400 rounded-full border-2 border-teal-600"></span>
          </button>
        </div>
        <p className="mt-4 text-sm text-teal-50">Yuk cek tumbuh kembang Arka hari ini.</p>
      </header>

      <main className="flex-1 p-4 space-y-5 -mt-2">
        {/* Kartu E-KMS */}
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-100">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                <TrendingUp size={18} />
              </div>
              <h2 className="font-bold text-slate-700">E-KMS Arka</h2>
            </div>
            <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold uppercase tracking-wider rounded-full">
              Normal
            </span>
          </div>
          <p className="text-sm text-slate-600 mb-4">
            Tumbuh kembang Arka di jalur tepat. Berat 9.8 kg, Tinggi 75.5 cm.
          </p>
          <button className="w-full py-2.5 bg-slate-50 hover:bg-slate-100 text-teal-700 text-sm font-semibold rounded-xl flex items-center justify-center gap-1 transition">
            Lihat Detail Grafik <ChevronRight size={16} />
          </button>
        </div>

        {/* Banner Jadwal */}
        <div className="bg-amber-50 rounded-2xl p-5 border border-amber-100 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 text-amber-200/50">
            <Calendar size={100} />
          </div>
          <div className="relative z-10">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 bg-amber-200 text-amber-800 text-[10px] font-bold uppercase rounded-md">
                Pengingat
              </span>
            </div>
            <h3 className="font-bold text-amber-900 mb-1">Posyandu Melati</h3>
            <div className="space-y-1 mb-4">
              <p className="text-xs text-amber-800 flex items-center gap-1.5">
                <Calendar size={14} /> Sabtu, 24 Okt 2026
              </p>
              <p className="text-xs text-amber-800 flex items-center gap-1.5">
                <Clock size={14} /> 08:00 - Selesai
              </p>
              <p className="text-xs text-amber-800 flex items-center gap-1.5">
                <MapPin size={14} /> Balai RW 05
              </p>
            </div>
            <p className="text-xs text-amber-700 mb-4 font-medium">
              Bawa KIA dan buku imunisasi ya, Bun.
            </p>
            <button className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-xs font-bold rounded-xl shadow-sm transition">
              Lihat Jadwal
            </button>
          </div>
        </div>

        {/* Menu Aksi Cepat */}
        <div>
          <h3 className="font-bold text-slate-800 mb-3 px-1">Akses Cepat</h3>
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-teal-200 transition group">
              <div className="w-12 h-12 rounded-full bg-blue-50 text-blue-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <BookOpen size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-700">Buku KIA</span>
            </button>
            <button className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-teal-200 transition group">
              <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Syringe size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-700">Imunisasi</span>
            </button>
            <button className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-teal-200 transition group">
              <div className="w-12 h-12 rounded-full bg-emerald-50 text-emerald-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Apple size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-700">Artikel Gizi</span>
            </button>
            <button className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center gap-3 hover:border-teal-200 transition group">
              <div className="w-12 h-12 rounded-full bg-purple-50 text-purple-500 flex items-center justify-center group-hover:scale-110 transition-transform">
                <MessageCircleQuestion size={24} />
              </div>
              <span className="text-xs font-semibold text-slate-700">Tanya Kader</span>
            </button>
          </div>
        </div>
      </main>
    </div>
  )
}
