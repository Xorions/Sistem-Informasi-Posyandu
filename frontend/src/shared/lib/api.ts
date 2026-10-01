import axios from 'axios'
import { CONFIG } from './config'
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

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      const url = err.config?.url || ''

      // Jangan putuskan sesi saat aplikasi sendiri sedang memeriksa login.
      if (!url.includes('/login')) {
        localStorage.removeItem(CONFIG.TOKEN_KEY)
        localStorage.removeItem(CONFIG.USER_KEY)

        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }

    return Promise.reject(err)
  }
)

type Envelope<T> = { data: { data: T; meta?: ApiMeta } }

const unwrap = <T>(res: Envelope<T>): T => res.data.data

const unwrapWithMeta = <T>(res: Envelope<T>): { data: T; meta?: ApiMeta } => ({
  data: res.data.data,
  meta: res.data.meta,
})

/**
 * Ambil pesan error yang layak ditampilkan ke pengguna.
 * Backend memakai envelope { success, message, errors }.
 */
export function apiErrorMessage(err: unknown, fallback = 'Terjadi kesalahan. Silakan coba kembali.'): string {
  const e = err as {
    response?: { data?: { message?: string; errors?: Record<string, string[] | string> } }
    message?: string
  }

  const errors = e?.response?.data?.errors

  if (errors) {
    const first = Object.values(errors)[0]

    if (Array.isArray(first)) return first[0]
    if (typeof first === 'string') return first
  }

  return e?.response?.data?.message || e?.message || fallback
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
  create: (body: unknown) => api.post('/parents', body).then(unwrap<OrangTua>),
  update: (id: number | string, body: unknown) => api.put(`/parents/${id}`, body).then(unwrap<OrangTua>),
  remove: (id: number | string) => api.delete(`/parents/${id}`).then(unwrap<null>),
}

export const apiPosyandu = {
  list: (params?: Record<string, unknown>) =>
    api.get('/posyandu', { params }).then(unwrapWithMeta<Posyandu[]>),
  create: (body: unknown) => api.post('/posyandu', body).then(unwrap<Posyandu>),
  update: (id: number | string, body: unknown) => api.put(`/posyandu/${id}`, body).then(unwrap<Posyandu>),
  remove: (id: number | string) => api.delete(`/posyandu/${id}`).then(unwrap<null>),
}

export const apiKader = {
  list: (params?: Record<string, unknown>) => api.get('/kader', { params }).then(unwrapWithMeta<Kader[]>),
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