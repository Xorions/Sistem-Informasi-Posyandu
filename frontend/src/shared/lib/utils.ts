import { apiValidationErrors } from './api'
export { apiValidationErrors }

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

/**
 * Memeriksa apakah suatu nilai merupakan string yang mengandung karakter asterisk (*)
 * yang menandakan data PII tersamar dari backend (mis. 3201********0001).
 */
export function isMasked(value: unknown): boolean {
  return typeof value === 'string' && value.includes('*')
}

/**
 * Memvalidasi apakah NIK baru yang diinputkan pengguna valid:
 * Jika diisi, harus tepat 16 digit angka dan tidak mengandung asterisk (*).
 */
export function isValidNik(value?: string | null): boolean {
  if (!value || !value.trim()) return true
  return /^\d{16}$/.test(value.trim())
}

export const PHONE_INDONESIA_REGEX = /^(\+62|62|0)8[1-9][0-9]{6,11}$/

/**
 * Memvalidasi apakah nomor telepon valid sesuai format Indonesia:
 * Awalan +628, 628, atau 08 diikuti 7-12 digit angka.
 * Jika kosong / tidak diisi, dianggap valid (field bersifat opsional).
 */
export function isValidPhone(value?: string | null): boolean {
  if (!value || !value.trim()) return true
  return PHONE_INDONESIA_REGEX.test(value.trim())
}

/**
 * Mengonversi input numerik form: string kosong / whitespace dikirim sebagai null,
 * bukan string kosong ataupun NaN, agar sesuai aturan validasi backend (nullable|numeric).
 */
export function parseNumeric(value: unknown): number | null {
  if (value === '' || value === null || value === undefined) return null
  if (typeof value === 'number') return isNaN(value) ? null : value
  if (typeof value === 'string') {
    const trimmed = value.trim()
    if (!trimmed) return null
    const parsed = Number(trimmed)
    return isNaN(parsed) ? null : parsed
  }
  return null
}

/**
 * Membangun payload yang hanya menyertakan field yang telah diubah pengguna (dirty),
 * serta memastikan field yang bernilai masked (*) atau dibiarkan kosong karena sebelumnya tersamar
 * TIDAK ikut dikirim kembali ke server.
 */
export function buildDirtyPayload<T extends Record<string, any>>(
  current: T,
  initial: T,
  maskedFields: Record<string, string | boolean> = {}
): Partial<T> {
  const dirty: Partial<T> = {}

  for (const key of Object.keys(current) as (keyof T)[]) {
    const val = current[key]
    const init = initial[key]

    // Jangan pernah kirim nilai yang mengandung tanda bintang (tersamar)
    if (isMasked(val)) {
      continue
    }

    // Jika field ini sebelumnya tersamar dan di form dibiarkan kosong (user tidak berniat mengganti), jangan kirim
    if (maskedFields[key as string] && (val === '' || val === null || val === undefined)) {
      continue
    }

    // Hanya kirim field yang bernilai berbeda dari data awal
    if (val !== init) {
      dirty[key] = val
    }
  }

  return dirty
}

/**
 * Menghapus seluruh tag HTML untuk menghasilkan teks murni.
 * Cocok untuk preview / ringkasan artikel tanpa risiko XSS dan tag terpotong.
 */
export function stripHtml(html?: string | null): string {
  if (!html) return ''
  return html.replace(/<[^>]*>?/gm, '').trim()
}

/**
 * Sanitasi HTML ringan sisi klien berbasis DOMParser tanpa dependensi eksternal.
 * Menghapus elemen berbahaya (script, iframe, object, embed, style),
 * menghapus event handler inline (on*), dan URL pseudo-protokol (javascript:, data:).
 */
export function sanitizeHtml(html?: string | null): string {
  if (!html) return ''
  if (typeof window === 'undefined' || typeof DOMParser === 'undefined') {
    return stripHtml(html)
  }

  try {
    const parser = new DOMParser()
    const doc = parser.parseFromString(html, 'text/html')

    const dangerous = doc.querySelectorAll('script, iframe, object, embed, style, link, meta')
    dangerous.forEach((el) => el.remove())

    const all = doc.querySelectorAll('*')
    all.forEach((el) => {
      const attrs = Array.from(el.attributes)
      for (const attr of attrs) {
        const name = attr.name.toLowerCase()
        const val = attr.value.trim().toLowerCase()
        if (name.startsWith('on') || val.startsWith('javascript:') || val.startsWith('data:text/html')) {
          el.removeAttribute(attr.name)
        }
      }
    })

    return doc.body.innerHTML
  } catch {
    return stripHtml(html)
  }
}
