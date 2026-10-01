import { cn, statusColor } from '@/shared/lib/utils'

export function Badge({ label, className }: { label: string; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border',
        statusColor(label),
        className,
      )}
    >
      {label}
    </span>
  )
}

/**
 * Warna status seragam untuk seluruh modul.
 *
 * Kunci di sini mengikuti nilai enum kolom `status` di backend, bukan label
 * UI, sehingga halaman cukup mengirim nilai mentah dari API.
 */
const STATUS_CLASS: Record<string, string> = {
  // status umum
  active: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  inactive: 'bg-slate-100 text-slate-600 border-slate-200',

  // tindak lanjut & jadwal
  pending: 'bg-amber-50 text-amber-700 border-amber-200',
  in_progress: 'bg-blue-50 text-blue-700 border-blue-200',
  completed: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  cancelled: 'bg-red-50 text-red-700 border-red-200',
  scheduled: 'bg-blue-50 text-blue-700 border-blue-200',

  // imunisasi
  sudah: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  belum: 'bg-amber-50 text-amber-700 border-amber-200',
  terjadwal: 'bg-blue-50 text-blue-700 border-blue-200',

  // edukasi
  published: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  draft: 'bg-slate-100 text-slate-600 border-slate-200',
  archived: 'bg-orange-50 text-orange-700 border-orange-200',

  // pemeriksaan ibu hamil
  normal: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  perlu_perhatian: 'bg-amber-50 text-amber-700 border-amber-200',
  danger: 'bg-red-50 text-red-700 border-red-200',

  // pemeriksaan anak
  voided: 'bg-slate-100 text-slate-600 border-slate-200',
}

export function StatusBadge({ status }: { status: string }) {
  const cls = STATUS_CLASS[status] || 'bg-slate-100 text-slate-700 border-slate-200'

  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium border ${cls}`}>
      {status}
    </span>
  )
}