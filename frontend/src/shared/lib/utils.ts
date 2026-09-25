export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ')
}

export function formatDate(dateStr?: string | null) {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })
}

export function formatDateShort(dateStr?: string) {
  if (!dateStr) return '-'
  return new Date(dateStr).toLocaleDateString('id-ID')
}

export function ageFromDob(dob?: string) {
  if (!dob) return '-'
  const birth = new Date(dob)
  const now = new Date()
  let months = (now.getFullYear() - birth.getFullYear()) * 12 + (now.getMonth() - birth.getMonth())
  if (now.getDate() < birth.getDate()) months--
  if (months < 12) return `${months} bulan`
  const years = Math.floor(months / 12)
  const rem = months % 12
  return rem ? `${years} th ${rem} bln` : `${years} tahun`
}

export function statusColor(label: string) {
  const l = label?.toLowerCase() || ''
  if (l.includes('sesuai')) return 'bg-emerald-100 text-emerald-700 border-emerald-200'
  if (l.includes('perlu perhatian')) return 'bg-amber-100 text-amber-700 border-amber-200'
  if (l.includes('lebih lanjut')) return 'bg-orange-100 text-orange-700 border-orange-200'
  if (l.includes('konsultasi') || l.includes('tindak')) return 'bg-red-100 text-red-700 border-red-200'
  return 'bg-slate-100 text-slate-700 border-slate-200'
}
