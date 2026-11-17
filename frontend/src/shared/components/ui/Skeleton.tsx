export function TableSkeleton({
  rows = 5,
  cols = 5,
  className = '',
}: {
  rows?: number
  cols?: number
  className?: string
}) {
  return (
    <div className={`border border-slate-200 shadow-sm rounded-2xl overflow-hidden bg-white animate-pulse ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              {Array.from({ length: cols }).map((_, idx) => (
                <th key={idx} className="px-5 py-3.5">
                  <div className="h-3.5 bg-slate-200 rounded w-20" />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {Array.from({ length: rows }).map((_, rIdx) => (
              <tr key={rIdx} className="border-b border-slate-50 last:border-0">
                {/* Kolom 1: Avatar + Teks */}
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
                    <div className="flex-1 min-w-[120px]">
                      <div className="h-4 bg-slate-200 rounded w-3/4" />
                      <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
                    </div>
                  </div>
                </td>
                {/* Kolom Sisa */}
                {Array.from({ length: cols - 1 }).map((_, cIdx) => (
                  <td key={cIdx} className="px-5 py-4">
                    {cIdx === cols - 2 ? (
                      <div className="h-6 bg-slate-100 rounded-full w-20" />
                    ) : cIdx === cols - 3 ? (
                      <div className="h-4 bg-slate-200 rounded w-24" />
                    ) : (
                      <div className="h-4 bg-slate-100 rounded w-28" />
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

export function CardSkeleton({
  count = 4,
  className = '',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4 animate-pulse ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div
          key={idx}
          className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3"
        >
          {/* Header Kartu: Avatar + Teks + Badge */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="h-4 bg-slate-200 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-1/2 mt-2" />
              </div>
            </div>
            <div className="h-6 bg-slate-100 rounded-full w-16 shrink-0" />
          </div>

          {/* Konten Tengah */}
          <div className="p-3 bg-slate-50 rounded-xl space-y-2">
            <div className="h-3.5 bg-slate-200 rounded w-2/3" />
            <div className="h-3 bg-slate-100 rounded w-5/6" />
          </div>

          {/* Footer Tombol / Aksi */}
          <div className="pt-2 flex items-center justify-between border-t border-slate-100">
            <div className="h-3 bg-slate-100 rounded w-20" />
            <div className="h-8 bg-slate-100 rounded-lg w-20" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({
  count = 5,
  className = '',
}: {
  count?: number
  className?: string
}) {
  return (
    <div className={`divide-y divide-slate-100 bg-white rounded-2xl border border-slate-200 shadow-sm animate-pulse overflow-hidden ${className}`}>
      {Array.from({ length: count }).map((_, idx) => (
        <div key={idx} className="flex items-center justify-between p-4">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className="w-10 h-10 rounded-full bg-slate-200 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3 bg-slate-100 rounded w-1/4 mt-2" />
            </div>
          </div>
          <div className="h-8 bg-slate-100 rounded-lg w-20 shrink-0" />
        </div>
      ))}
    </div>
  )
}

export function DashboardSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 animate-pulse ${className}`}>
      {/* Header Skeleton */}
      <div className="flex flex-wrap justify-between items-start gap-4">
        <div>
          <div className="h-8 bg-slate-200 rounded-lg w-48" />
          <div className="h-4 bg-slate-100 rounded w-64 mt-2" />
        </div>
        <div className="h-10 bg-slate-100 rounded-xl w-44" />
      </div>

      {/* 4 Primary KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="flex justify-between items-start gap-3">
              <div className="flex-1">
                <div className="h-3 bg-slate-200 rounded w-24" />
                <div className="h-8 bg-slate-200 rounded w-16 mt-2" />
                <div className="h-3 bg-slate-100 rounded w-36 mt-2" />
              </div>
              <div className="w-10 h-10 rounded-xl bg-slate-100 shrink-0" />
            </div>
          </div>
        ))}
      </div>

      {/* 6 Secondary Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {Array.from({ length: 6 }).map((_, idx) => (
          <div key={idx} className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm">
            <div className="h-2.5 bg-slate-200 rounded w-20" />
            <div className="h-7 bg-slate-200 rounded w-12 mt-2" />
          </div>
        ))}
      </div>

      {/* 2 Charts Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 2 }).map((_, idx) => (
          <div key={idx} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-100">
              <div className="h-5 bg-slate-200 rounded w-48" />
            </div>
            <div className="p-6 h-[240px] flex items-end gap-3 justify-between">
              {[40, 65, 30, 85, 55, 75, 45, 90, 60, 80].map((h, bIdx) => (
                <div
                  key={bIdx}
                  className="flex-1 bg-slate-100 rounded-t"
                  style={{ height: `${h}%` }}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function GrowthSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 animate-pulse ${className}`}>
      {/* Profile Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-36" />
            <div className="h-3 bg-slate-100 rounded w-48" />
          </div>
        </div>
        <div className="h-9 bg-slate-100 rounded-xl w-40" />
      </div>

      {/* Main Grid: Chart + Riwayat */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Chart Skeleton (2 cols) */}
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex justify-between">
            <div className="h-5 bg-slate-200 rounded w-40" />
            <div className="h-4 bg-slate-100 rounded w-28" />
          </div>
          <div className="p-6 h-[300px] flex items-end gap-3 justify-between">
            {[35, 50, 42, 60, 75, 68, 85, 92].map((h, i) => (
              <div key={i} className="flex-1 bg-slate-100 rounded-t" style={{ height: `${h}%` }} />
            ))}
          </div>
        </div>

        {/* Riwayat Singkat (1 col) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100">
            <div className="h-5 bg-slate-200 rounded w-32" />
          </div>
          <div className="p-6 space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="p-3 rounded-xl border border-slate-100 space-y-2">
                <div className="h-3 bg-slate-200 rounded w-1/3" />
                <div className="grid grid-cols-2 gap-2 mt-2">
                  <div className="h-3 bg-slate-100 rounded" />
                  <div className="h-3 bg-slate-100 rounded" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tabel Pertumbuhan */}
      <TableSkeleton rows={4} cols={5} />
    </div>
  )
}

export function AnalysisSkeleton({ className = '' }: { className?: string }) {
  return (
    <div className={`space-y-6 animate-pulse ${className}`}>
      {/* Profile Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-3 items-center">
          <div className="w-12 h-12 rounded-xl bg-slate-200 shrink-0" />
          <div className="space-y-2">
            <div className="h-4 bg-slate-200 rounded w-44" />
            <div className="h-3 bg-slate-100 rounded w-56" />
          </div>
        </div>
        <div className="h-9 bg-slate-100 rounded-xl w-36" />
      </div>

      {/* Banner Ringkasan Status */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
        <div className="h-6 bg-slate-200 rounded w-48" />
        <div className="h-4 bg-slate-100 rounded w-full" />
        <div className="h-3 bg-slate-100 rounded w-1/2" />
      </div>

      {/* 4 Kartu Indikator */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {['Berat Badan', 'Tinggi / Panjang', 'Lingkar Kepala', 'LiLA (Lingkar Lengan)'].map((label, idx) => (
          <div key={idx} className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm space-y-3">
            <div className="h-4 bg-slate-200 rounded w-36" />
            <div className="h-8 bg-slate-200 rounded w-24" />
            <div className="h-5 bg-slate-100 rounded-full w-28" />
            <div className="h-3 bg-slate-100 rounded w-3/4" />
            <div className="h-3 bg-slate-50 rounded w-1/2" />
          </div>
        ))}
      </div>

      {/* Rekomendasi Edukasi */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 space-y-1">
          <div className="h-5 bg-slate-200 rounded w-48" />
          <div className="h-3 bg-slate-100 rounded w-72" />
        </div>
        <div className="p-6 space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-xl border border-slate-100 space-y-2">
              <div className="h-4 bg-slate-200 rounded w-1/3" />
              <div className="h-3.5 bg-slate-100 rounded w-5/6" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
