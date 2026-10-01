import type { Role } from '@/shared/types'

/**
 * Konfigurasi frontend.
 *
 * Seluruh nilai environment dibaca di satu tempat agar tidak ada lagi
 * baseURL atau kunci localStorage yang ditulis langsung di beberapa file.
 */

const env = import.meta.env

export const CONFIG = {
  /** Base URL API. Kosongkan untuk memakai proxy Vite saat development. */
  API_BASE_URL: (env.VITE_API_BASE_URL as string) || '/api',

  APP_NAME: (env.VITE_APP_NAME as string) || 'Posyandu Terpadu',
  APP_TAGLINE: 'Sistem Informasi Kesehatan Ibu & Anak',

  /** Kunci localStorage, harus sama dengan yang dipakai AuthContext. */
  TOKEN_KEY: 'posyandu_token',
  USER_KEY: 'posyandu_user',
} as const

/**
 * Nama keempat posyandu. Backup tampilan saja; sumber kebenaran tetap
 * tabel `posyandu` yang dikirim API.
 */
export const POSYANDU_NAMES = [
  'Posyandu Cut Nyak Dien',
  'Posyandu Kartika',
  'Posyandu Kartini',
  'Posyandu Raden Intan',
] as const

/** Kata sandi seluruh akun demo hasil seeding. */
export const DEMO_PASSWORD = 'password123'

/** Akun demo untuk ditampilkan di halaman login. */
export const DEMO_ACCOUNTS: { email: string; role: Role }[] = [
  { email: 'admin@example.test', role: 'ADMIN' },
  { email: 'kader@example.test', role: 'KADER' },
  { email: 'orangtua@example.test', role: 'ORANG_TUA' },
]