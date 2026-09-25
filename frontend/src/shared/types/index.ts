// Central types – single source of truth, biar konsisten frontend ↔ backend API
export type Role = 'SUPER_ADMIN' | 'ADMIN_POSYANDU' | 'KADER' | 'ORANG_TUA'

export type User = {
  id: number
  name: string
  email: string
  role: Role
  phone?: string
  posyandus?: { id: number; nama_posyandu: string; kode_posyandu: string }[]
}

export type Posyandu = {
  id: number
  kode_posyandu: string
  nama_posyandu: string
  alamat: string
  status: 'active' | 'inactive'
}

export type Child = {
  id: number
  posyandu_id: number
  nik?: string
  nama_lengkap: string
  nama_panggilan?: string
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: 'L' | 'P'
  alamat: string
  nomor_kk?: string
  status: string
  posyandu?: Posyandu
  parents?: any[]
}

export type ApiMeta = {
  current_page: number
  last_page: number
  total: number
  per_page: number
}

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
  meta?: ApiMeta
  errors?: Record<string, string[]>
}
