import React, { useState } from 'react'
import { ChevronDown, CheckCircle } from 'lucide-react'

export interface IndicatorDetail {
  value?: number | string
  label?: string
  status?: string
  message?: string
  deviation_percent?: number | string
  reference?: number | string
  source?: string
  plausible_min?: number | string
  plausible_max?: number | string
}

export interface GrowthAnalysisProps {
  indicators?: {
    weight?: IndicatorDetail
    height?: IndicatorDetail
    head_circumference?: IndicatorDetail
    arm_circumference?: IndicatorDetail
    [key: string]: IndicatorDetail | undefined
  }
  recommendations?: Array<{
    title?: string
    content?: string
    priority?: string
  }>
}

type MetricKey = 'weight' | 'height' | 'head_circumference' | 'arm_circumference'

interface MetricConfig {
  key: MetricKey
  title: string
  unit: string
  defaultVal: number | string
  defaultLabel: string
  defaultMessage: string
  defaultDeviation: string
  defaultSource: string
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    key: 'weight',
    title: 'Berat Badan',
    unit: 'kg',
    defaultVal: 20,
    defaultLabel: 'Sesuai Pemantauan',
    defaultMessage: 'Berat badan dalam rentang pemantauan. Lanjutkan pemantauan rutin.',
    defaultDeviation: 'Deviasi: 8.7% dari referensi 21.90',
    defaultSource: 'Sumber: Internal median approximation',
  },
  {
    key: 'height',
    title: 'Tinggi / Panjang',
    unit: 'cm',
    defaultVal: 110,
    defaultLabel: 'Sesuai Pemantauan',
    defaultMessage: 'Tinggi badan sesuai usia pemantauan. Pertahankan asupan kalsium & gizi makro.',
    defaultDeviation: 'Deviasi: 2.1% dari referensi 108.50',
    defaultSource: 'Sumber: Standar Antropometri Kemenkes',
  },
  {
    key: 'head_circumference',
    title: 'Lingkar Kepala',
    unit: 'cm',
    defaultVal: 49.5,
    defaultLabel: 'Normal',
    defaultMessage: 'Ukuran lingkar kepala normal menandakan pertumbuhan volume otak baik.',
    defaultDeviation: 'Deviasi: 1.0% dari referensi 49.00',
    defaultSource: 'Sumber: Nelhaus curve approximation',
  },
  {
    key: 'arm_circumference',
    title: 'LiLA (Lingkar Lengan Atas)',
    unit: 'cm',
    defaultVal: 15.2,
    defaultLabel: 'Gizi Baik',
    defaultMessage: 'Pita LiLA berada di ambang hijau, tidak ada indikasi KEK balita.',
    defaultDeviation: 'Deviasi: 3.4% dari referensi 14.70',
    defaultSource: 'Sumber: Ambang Batas Wasting Kemenkes',
  },
]

export const GrowthAnalysis: React.FC<GrowthAnalysisProps> = ({
  indicators = {},
  recommendations = [],
}) => {
  // Accordion state per key: { weight: false, height: false, ... }
  const [expanded, setExpanded] = useState<Record<MetricKey, boolean>>({
    weight: false,
    height: false,
    head_circumference: false,
    arm_circumference: false,
  })

  const toggleExpand = (key: MetricKey) => {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }))
  }

  // Format default recommendations if none supplied
  const defaultRecommendations = [
    'Pertahankan asupan nutrisi seimbang',
    'Lanjutkan pemberian protein hewani (telur, ikan, ayam, susu)',
    'Bawa kembali ke Posyandu bulan depan untuk pemantauan rutin',
  ]

  const recList =
    recommendations.length > 0
      ? recommendations.map(r => r.content || r.title || '')
      : defaultRecommendations

  return (
    <div className="space-y-6">
      {/* 1. Kartu Ringkasan Utama (Overview Card) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6 divide-y md:divide-y-0 md:divide-x divide-slate-100">
          {METRIC_CONFIGS.map((cfg, idx) => {
            const ind = indicators[cfg.key]
            const isExpanded = expanded[cfg.key]

            const displayVal = ind?.value !== undefined ? ind.value : cfg.defaultVal
            const displayLabel = ind?.label || ind?.status || cfg.defaultLabel
            const displayMessage = ind?.message || cfg.defaultMessage
            const displayDeviation =
              ind?.deviation_percent !== undefined && ind?.reference !== undefined
                ? `Deviasi: ${ind.deviation_percent}% dari referensi ${ind.reference}`
                : cfg.defaultDeviation
            const displaySource = ind?.source
              ? `Sumber: ${ind.source}`
              : cfg.defaultSource

            return (
              <div
                key={cfg.key}
                className={`flex flex-col justify-between ${
                  idx !== 0 ? 'pt-6 md:pt-0 md:pl-6' : ''
                }`}
              >
                <div>
                  {/* Judul Metrik */}
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-2">
                    {cfg.title}
                  </p>

                  {/* Angka Utama & Satuan */}
                  <div className="flex items-baseline gap-1.5 mb-2.5">
                    <span className="text-3xl font-extrabold text-slate-800 tracking-tight">
                      {displayVal}
                    </span>
                    <span className="text-sm font-semibold text-slate-500">
                      {cfg.unit}
                    </span>
                  </div>

                  {/* Badge Status Pastel */}
                  <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-100/80">
                    {displayLabel}
                  </span>
                </div>

                {/* 2. Interaksi Detail Tersembunyi (Accordion/Expand) */}
                <div className="mt-4 pt-3 border-t border-slate-50">
                  <button
                    type="button"
                    onClick={() => toggleExpand(cfg.key)}
                    className="flex items-center gap-1.5 text-xs font-medium text-teal-600 hover:text-teal-700 transition group focus:outline-none"
                    aria-expanded={isExpanded}
                  >
                    <span>{isExpanded ? 'Tutup Detail' : 'Lihat Detail'}</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-teal-500 group-hover:text-teal-700 transition-transform duration-200 ${
                        isExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>

                  {/* Detail Panel */}
                  {isExpanded && (
                    <div className="mt-3 p-3 bg-slate-50/80 rounded-xl space-y-1.5 text-left border border-slate-100">
                      <p className="text-xs text-slate-700 leading-relaxed font-normal">
                        {displayMessage}
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono">
                        {displayDeviation}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {displaySource}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* 3. Kartu Rekomendasi Edukasi (Di Bawah Ringkasan) */}
      <div className="bg-blue-50/40 rounded-2xl border border-blue-100/80 p-6 shadow-sm">
        <h3 className="text-base font-bold text-slate-800 mb-1">
          Rekomendasi Edukasi (rule-based)
        </h3>
        <p className="text-xs text-slate-500 mb-4">
          Panduan gizi & pemantauan untuk mendukung tumbuh kembang optimal si kecil
        </p>

        <ul className="space-y-3">
          {recList.map((point, i) => (
            <li key={i} className="flex items-start gap-3">
              <CheckCircle className="w-5 h-5 text-blue-500 shrink-0 mt-0.5" />
              <span className="text-sm text-slate-700 leading-snug">
                {point}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export default GrowthAnalysis
