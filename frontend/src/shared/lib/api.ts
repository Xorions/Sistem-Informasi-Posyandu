import axios from 'axios'
import { CONFIG } from './config'
import { showToast } from '../components/ui/toast'
import type {
  ApiMeta,
  AuditLog,
  Child,
  Education,
  EducationCategory,
  Examination,
  FollowUp,
  IbuHamil,
  Imunisasi,
  Jadwal,
  Kader,
  OrangTua,
  PemeriksaanBumil,
  Posyandu,
  User,
} from '../types'

export const api = axios.create({
  baseURL: CONFIG.API_BASE_URL,
  headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(CONFIG.TOKEN_KEY)

  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }

  return config
})

let isHandling401 = false

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status
    const url = err.config?.url || ''

    if (status === 401) {
      // Jika request login itu sendiri yang gagal (kredensial salah), jangan logout / redirect
      if (url.includes('/login')) {
        return Promise.reject(err)
      }

      localStorage.removeItem(CONFIG.TOKEN_KEY)
      localStorage.removeItem(CONFIG.USER_KEY)

      if (!isHandling401) {
        isHandling401 = true
        const currentPath = window.location.pathname + window.location.search

        if (currentPath && currentPath !== '/login') {
          sessionStorage.setItem('redirect_after_login', currentPath)
        }

        sessionStorage.setItem('session_expired_message', 'Sesi Anda berakhir. Silakan masuk kembali.')
        showToast('Sesi Anda berakhir. Silakan masuk kembali.', 'error')

        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }

        setTimeout(() => {
          isHandling401 = false
        }, 3000)
      }

      return Promise.reject(err)
    }

    if (status === 403) {
      showToast('Anda tidak memiliki akses ke data ini.', 'error')
      return Promise.reject(err)
    }

    if (status === 429) {
      const retryAfter =
        err.response?.headers?.['retry-after'] ||
        err.response?.headers?.['Retry-After']
      const msg = retryAfter
        ? `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`
        : 'Terlalu banyak percobaan. Coba lagi dalam beberapa saat.'
      showToast(msg, 'error')
      return Promise.reject(err)
    }

    if (status === 422) {
      // Diteruskan ke form untuk menampilkan validasi per-field
      return Promise.reject(err)
    }

    // 5xx atau network error
    if (!err.response || status >= 500) {
      showToast('Data tidak dapat dimuat. Silakan coba kembali.', 'error')
      return Promise.reject(err)
    }

    return Promise.reject(err)
  }
)

type Envelope<T> = { data: { data: T; meta?: ApiMeta } }

const unwrap = <T>(res: Envelope<T>): T => {
  const d = res.data?.data as unknown
  if (d && typeof d === 'object' && Array.isArray((d as Record<string, unknown>).data)) {
    return (d as Record<string, unknown>).data as T
  }
  return (d !== undefined ? d : res.data) as T
}

const unwrapWithMeta = <T>(res: Envelope<T>): { data: T; meta?: ApiMeta } => {
  const envelopeData = res.data?.data as unknown
  const isPaginator =
    envelopeData !== null &&
    typeof envelopeData === 'object' &&
    Array.isArray((envelopeData as Record<string, unknown>).data)

  const items = isPaginator
    ? (envelopeData as Record<string, unknown>).data
    : envelopeData

  const rawMeta = res.data?.meta
  const meta: ApiMeta | undefined =
    rawMeta ??
    (isPaginator
      ? {
          current_page: Number((envelopeData as Record<string, unknown>).current_page ?? 1),
          last_page: Number((envelopeData as Record<string, unknown>).last_page ?? 1),
          total: Number((envelopeData as Record<string, unknown>).total ?? 0),
          per_page: Number((envelopeData as Record<string, unknown>).per_page ?? 10),
        }
      : undefined)

  return {
    data: (items ?? []) as T,
    meta,
  }
}

function isRawServerError(text?: string | null): boolean {
  if (!text || typeof text !== 'string') return false
  return /sqlstate|syntax error|stack trace|trace:|exception|fatal error|call to undefined|uncaught error|at .*\(.*:\d+\)|vendor\/laravel|app\/http|database\/migrations/i.test(text)
}

/**
 * Ambil pesan error yang layak ditampilkan ke pengguna.
 * Backend memakai envelope { success, message, errors }.
 */
export function apiErrorMessage(err: unknown, fallback = 'Data tidak dapat dimuat. Silakan coba kembali.'): string {
  const e = err as {
    response?: {
      status?: number
      headers?: Record<string, string>
      data?: { message?: string; errors?: Record<string, string[] | string> }
    }
    message?: string
  }

  const status = e?.response?.status

  if (status === 429) {
    const retryAfter = e?.response?.headers?.['retry-after'] || e?.response?.headers?.['Retry-After']
    if (retryAfter) {
      return `Terlalu banyak percobaan. Coba lagi dalam ${retryAfter} detik.`
    }
    return 'Terlalu banyak percobaan. Coba lagi dalam beberapa saat.'
  }

  if (status === 403) {
    return 'Anda tidak memiliki akses ke data ini.'
  }

  if (status === 401) {
    return 'Sesi Anda berakhir. Silakan masuk kembali.'
  }

  if (!e?.response || (status && status >= 500)) {
    return fallback
  }

  const errors = e?.response?.data?.errors

  if (errors && typeof errors === 'object') {
    const first = Object.values(errors)[0]
    const errText = Array.isArray(first) && first.length > 0 ? String(first[0]) : (typeof first === 'string' ? first : '')
    if (errText && !isRawServerError(errText)) return errText
  }

  const msg = e?.response?.data?.message
  if (typeof msg === 'string' && msg.trim()) {
    if (isRawServerError(msg)) {
      return fallback
    }
    return msg
  }

  return fallback
}

/**
 * Parsing validasi error per field dari response 422.
 */
export function apiValidationErrors(err: unknown): Record<string, string> {
  const e = err as {
    response?: {
      status?: number
      data?: { errors?: Record<string, string[] | string> }
    }
  }

  const errors = e?.response?.data?.errors
  if (!errors || typeof errors !== 'object') return {}

  const result: Record<string, string> = {}
  for (const [key, val] of Object.entries(errors)) {
    if (Array.isArray(val) && val.length > 0) {
      result[key] = String(val[0])
    } else if (typeof val === 'string') {
      result[key] = val
    }
  }

  return result
}

/**
 * Ekstrak pesan error dari response yang dibungkus Blob (mis. Axios responseType: 'blob').
 * Menangani error 403, 422, 429, dan 500 dengan parsing payload JSON di dalam Blob.
 */
export async function extractBlobErrorMessage(err: unknown, fallback = 'Gagal memproses berkas ekspor.'): Promise<string> {
  const e = err as {
    response?: {
      status?: number
      headers?: Record<string, string>
      data?: Blob | { message?: string }
    }
    message?: string
  }

  const status = e?.response?.status

  if (status && status >= 500) {
    return 'Terjadi kesalahan pada server saat mengekspor data. Silakan coba beberapa saat lagi.'
  }

  if (e?.response?.data instanceof Blob) {
    try {
      const text = await e.response.data.text()
      const json = JSON.parse(text)
      if (json.message && typeof json.message === 'string' && !isRawServerError(json.message)) return json.message
      if (json.errors && typeof json.errors === 'object') {
        const first = Object.values(json.errors)[0]
        const errText = Array.isArray(first) && first.length > 0 ? String(first[0]) : (typeof first === 'string' ? first : '')
        if (errText && !isRawServerError(errText)) return errText
      }
      if (json.error && typeof json.error === 'string' && !isRawServerError(json.error)) return json.error
    } catch {
      // bukan format JSON, fallback ke status code
    }
  }

  if (status === 403) {
    return 'Akses ditolak: Anda tidak memiliki izin untuk mengekspor data ini (403 Forbidden).'
  }

  if (status === 422) {
    return 'Parameter filter laporan tidak valid untuk ekspor ini (422 Unprocessable).'
  }

  if (status === 429) {
    const retryAfter = e?.response?.headers?.['retry-after'] || e?.response?.headers?.['Retry-After']
    if (retryAfter) {
      return `Terlalu banyak permintaan ekspor. Silakan tunggu ${retryAfter} detik (429 Too Many Requests).`
    }
    return 'Terlalu banyak permintaan ekspor. Silakan tunggu beberapa saat (429 Too Many Requests).'
  }

  if (typeof e?.response?.data === 'object' && e?.response?.data !== null && 'message' in e.response.data) {
    const msg = String(e.response.data.message)
    if (!isRawServerError(msg)) return msg
  }

  if (e?.message && !e.message.includes('status code') && !isRawServerError(e.message)) {
    return e.message
  }

  return fallback
}

/**
 * Endpoint API, dikelompokkan per modul.
 *
 * Halaman cukup memanggil `apiKader.list(...)` tanpa menulis path berulang,
 * dan perubahan path cukup dilakukan di satu file.
 */
export const apiAuth = {
  login: (email: string, password: string) =>
    api.post('/login', { email, password }).then(unwrap<{ user: User; token: string }>),
  logout: () => api.post('/logout').then(unwrap<null>),
  me: () => api.get('/user').then(unwrap<User>),
}

export const apiChildren = {
  list: (params?: Record<string, unknown>) =>
    api.get('/children', { params }).then(unwrapWithMeta<Child[]>),
  get: (id: number | string) => api.get(`/children/${id}`).then(unwrap<Child>),
  create: (body: unknown) => api.post('/children', body).then(unwrap<Child>),
  update: (id: number | string, body: unknown) => api.put(`/children/${id}`, body).then(unwrap<Child>),
  remove: (id: number | string) => api.delete(`/children/${id}`).then(unwrap<null>),
  attachParent: (id: number | string, body: unknown) =>
    api.post(`/children/${id}/parents`, body).then(unwrap<Child>),
  examinations: (id: number | string, params?: Record<string, unknown>) =>
    api.get(`/children/${id}/examinations`, { params }).then(unwrapWithMeta<Examination[]>),
  growthChart: (id: number | string) =>
    api.get(`/children/${id}/growth-chart`).then(unwrap<Record<string, unknown>[]>),
  analysis: (id: number | string) =>
    api.get(`/children/${id}/analysis`).then(unwrap<Record<string, unknown>>),
  analysisHistory: (id: number | string) =>
    api.get(`/children/${id}/analysis/history`).then(unwrap<Record<string, unknown>[]>),
}

export const apiParents = {
  list: (params?: Record<string, unknown>) =>
    api.get('/parents', { params }).then(unwrapWithMeta<OrangTua[]>),
  get: (id: number | string) => api.get(`/parents/${id}`).then(unwrap<OrangTua>),
  create: (body: unknown) => api.post('/parents', body).then(unwrap<OrangTua>),
  update: (id: number | string, body: unknown) => api.put(`/parents/${id}`, body).then(unwrap<OrangTua>),
  remove: (id: number | string) => api.delete(`/parents/${id}`).then(unwrap<null>),
}

export const apiPosyandu = {
  list: (params?: Record<string, unknown>) =>
    api.get('/posyandu', { params }).then(unwrapWithMeta<Posyandu[]>),
  get: (id: number | string) => api.get(`/posyandu/${id}`).then(unwrap<Posyandu>),
  create: (body: unknown) => api.post('/posyandu', body).then(unwrap<Posyandu>),
  update: (id: number | string, body: unknown) => api.put(`/posyandu/${id}`, body).then(unwrap<Posyandu>),
  remove: (id: number | string) => api.delete(`/posyandu/${id}`).then(unwrap<null>),
}

export const apiKader = {
  list: (params?: Record<string, unknown>) => api.get('/kader', { params }).then(unwrapWithMeta<Kader[]>),
  get: (id: number | string) => api.get(`/kader/${id}`).then(unwrap<Kader>),
  create: (body: unknown) => api.post('/kader', body).then(unwrap<Kader>),
  update: (id: number | string, body: unknown) => api.put(`/kader/${id}`, body).then(unwrap<Kader>),
  remove: (id: number | string) => api.delete(`/kader/${id}`).then(unwrap<null>),
}

export const apiExaminations = {
  list: (params?: Record<string, unknown>) =>
    api.get('/examinations', { params }).then(unwrapWithMeta<Examination[]>),
  create: (body: unknown) => api.post('/examinations', body).then(unwrap<Examination>),
  remove: (id: number | string) => api.delete(`/examinations/${id}`).then(unwrap<null>),
}

export const apiImunisasi = {
  list: (params?: Record<string, unknown>) =>
    api.get('/immunizations', { params }).then(unwrapWithMeta<Imunisasi[]>),
  create: (body: unknown) => api.post('/immunizations', body).then(unwrap<Imunisasi>),
  update: (id: number | string, body: unknown) =>
    api.put(`/immunizations/${id}`, body).then(unwrap<Imunisasi>),
  remove: (id: number | string) => api.delete(`/immunizations/${id}`).then(unwrap<null>),
  forChild: (childId: number | string, params?: Record<string, unknown>) =>
    api.get(`/children/${childId}/immunizations`, { params }).then(unwrap<Imunisasi[]>),
}

export const apiFollowUps = {
  list: (params?: Record<string, unknown>) =>
    api.get('/follow-ups', { params }).then(unwrapWithMeta<FollowUp[]>),
  create: (body: unknown) => api.post('/follow-ups', body).then(unwrap<FollowUp>),
  update: (id: number | string, body: unknown) => api.put(`/follow-ups/${id}`, body).then(unwrap<FollowUp>),
  remove: (id: number | string) => api.delete(`/follow-ups/${id}`).then(unwrap<null>),
}

export const apiIbuHamil = {
  list: (params?: Record<string, unknown>) =>
    api.get('/ibu-hamil', { params }).then(unwrapWithMeta<IbuHamil[]>),
  get: (id: number | string) => api.get(`/ibu-hamil/${id}`).then(unwrap<IbuHamil>),
  create: (body: unknown) => api.post('/ibu-hamil', body).then(unwrap<IbuHamil>),
  update: (id: number | string, body: unknown) => api.put(`/ibu-hamil/${id}`, body).then(unwrap<IbuHamil>),
  remove: (id: number | string) => api.delete(`/ibu-hamil/${id}`).then(unwrap<null>),
  pemeriksaan: (id: number | string, params?: Record<string, unknown>) =>
    api.get(`/ibu-hamil/${id}/pemeriksaan`, { params }).then(unwrapWithMeta<PemeriksaanBumil[]>),
}

export const apiPemeriksaanBumil = {
  list: (params?: Record<string, unknown>) =>
    api.get('/pemeriksaan-bumil', { params }).then(unwrapWithMeta<PemeriksaanBumil[]>),
  create: (body: unknown) => api.post('/pemeriksaan-bumil', body).then(unwrap<PemeriksaanBumil>),
  update: (id: number | string, body: unknown) =>
    api.put(`/pemeriksaan-bumil/${id}`, body).then(unwrap<PemeriksaanBumil>),
  remove: (id: number | string) => api.delete(`/pemeriksaan-bumil/${id}`).then(unwrap<null>),
}

export const apiSchedules = {
  list: (params?: Record<string, unknown>) =>
    api.get('/schedules', { params }).then(unwrapWithMeta<Jadwal[]>),
  create: (body: unknown) => api.post('/schedules', body).then(unwrap<Jadwal>),
  update: (id: number | string, body: unknown) => api.put(`/schedules/${id}`, body).then(unwrap<Jadwal>),
  remove: (id: number | string) => api.delete(`/schedules/${id}`).then(unwrap<null>),
}

export const apiEducations = {
  list: (params?: Record<string, unknown>) =>
    api.get('/educations', { params }).then(unwrapWithMeta<Education[]>),
  publicList: (params?: Record<string, unknown>) =>
    api.get('/edukasi', { params }).then(unwrapWithMeta<Education[]>),
  detail: (slug: string) => api.get(`/edukasi/${slug}`).then(unwrap<Education>),
  categories: () => api.get('/education-categories').then(unwrap<EducationCategory[]>),
  publicCategories: () => api.get('/edukasi/categories').then(unwrap<EducationCategory[]>),
  create: (body: unknown) => api.post('/educations', body).then(unwrap<Education>),
  update: (id: number | string, body: unknown) => api.put(`/educations/${id}`, body).then(unwrap<Education>),
  remove: (id: number | string) => api.delete(`/educations/${id}`).then(unwrap<null>),
  publish: (id: number | string) => api.post(`/educations/${id}/publish`).then(unwrap<Education>),
  unpublish: (id: number | string) => api.post(`/educations/${id}/unpublish`).then(unwrap<Education>),
}

export const apiUsers = {
  list: (params?: Record<string, unknown>) => api.get('/users', { params }).then(unwrapWithMeta<User[]>),
  create: (body: unknown) => api.post('/users', body).then(unwrap<User>),
  update: (id: number | string, body: unknown) => api.put(`/users/${id}`, body).then(unwrap<User>),
  remove: (id: number | string) => api.delete(`/users/${id}`).then(unwrap<null>),
}

export const apiAuditLogs = {
  list: (params?: Record<string, unknown>) =>
    api.get('/audit-logs', { params }).then(unwrapWithMeta<AuditLog[]>),
}

export const apiDashboard = {
  summary: (params?: Record<string, unknown>) =>
    api.get('/dashboard', { params }).then(unwrap<Record<string, unknown>>),
}

export const apiReports = {
  get: (type: string, params?: Record<string, unknown>) =>
    api.get(`/reports/${type}`, { params }).then(unwrapWithMeta<unknown>),
  download: (type: string, params: Record<string, unknown>) =>
    api.get(`/reports/${type}`, { params, responseType: 'blob' }),
}