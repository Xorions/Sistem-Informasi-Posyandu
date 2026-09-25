import axios from 'axios'

export const api = axios.create({
  baseURL: '/api',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json',
  },
  withCredentials: false,
})

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('posyandu_token')
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
      if (!url.includes('/login')) {
        localStorage.removeItem('posyandu_token')
        localStorage.removeItem('posyandu_user')
        if (window.location.pathname !== '/login') {
          window.location.href = '/login'
        }
      }
    }
    return Promise.reject(err)
  }
)

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
  meta?: {
    current_page: number
    last_page: number
    total: number
    per_page: number
  }
  errors?: Record<string, string[]>
}
