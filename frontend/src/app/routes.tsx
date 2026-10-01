/**
 * Definisi rute tunggal untuk aplikasi dan sidebar.
 *
 * Halaman dan Layout sama-sama mengimpor dari sini, sehingga tidak ada lagi
 * path yang ditulis dua kali dan bisa berbeda.
 */
export const ROUTES = {
  login: '/login',
  dashboard: '/',

  children: '/children',
  childCreate: '/children/create',
  childDetail: (id: number | string) => `/children/${id}`,
  childEdit: (id: number | string) => `/children/${id}/edit`,

  parents: '/parents',
  posyandu: '/posyandu',
  kader: '/kader',

  examinations: '/examinations',
  pertumbuhan: '/pertumbuhan',
  analisis: '/analisis',
  immunizations: '/immunizations',
  followUps: '/follow-ups',
  schedules: '/schedules',

  ibuHamil: '/ibu-hamil',
  bumil: (id: number | string) => `/ibu-hamil/${id}`,
  pemeriksaanBumil: '/pemeriksaan-bumil',

  edukasi: '/edukasi',
  edukasiPublic: '/edukasi-public',
  /** Detail artikel publik memakai slug dan berada di luar Layout. */
  edukasiDetail: (slug: string) => `/edukasi/${slug}`,

  reports: '/reports',
  users: '/users',
  auditLogs: '/audit-logs',
} as const