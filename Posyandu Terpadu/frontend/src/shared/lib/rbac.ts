import type { Role } from '@/shared/types'

/**
 * Izin aplikasi per role, mengikuti App\Enums\Role dan policy di backend.
 *
 * `Permission` sengaja dibuat dari resourceful, bukan dari nama aksi, agar
 * halaman cukup memeriksa satu izin, bukan daftar role yang berulang.
 */
export type Permission =
  | 'view-dashboard'
  | 'view-anak'
  | 'manage-anak'
  | 'view-orang-tua'
  | 'manage-orang-tua'
  | 'view-posyandu'
  | 'manage-posyandu'
  | 'view-kader'
  | 'manage-kader'
  | 'view-pemeriksaan'
  | 'manage-pemeriksaan'
  | 'view-imunisasi'
  | 'manage-imunisasi'
  | 'view-ibu-hamil'
  | 'manage-ibu-hamil'
  | 'view-followup'
  | 'manage-followup'
  | 'view-jadwal'
  | 'manage-jadwal'
  | 'view-edukasi'
  | 'manage-edukasi'
  | 'view-laporan'
  | 'manage-pengguna'
  | 'view-audit-log'

const ADMIN_PERMS: Permission[] = [
  'view-dashboard',
  'view-anak',
  'manage-anak',
  'view-orang-tua',
  'manage-orang-tua',
  'view-posyandu',
  'manage-posyandu',
  'view-kader',
  'manage-kader',
  'view-pemeriksaan',
  'manage-pemeriksaan',
  'view-imunisasi',
  'manage-imunisasi',
  'view-ibu-hamil',
  'manage-ibu-hamil',
  'view-followup',
  'manage-followup',
  'view-jadwal',
  'manage-jadwal',
  'view-edukasi',
  'manage-edukasi',
  'view-laporan',
  'manage-pengguna',
  'view-audit-log',
]

const KADER_PERMS: Permission[] = [
  'view-dashboard',
  'view-anak',
  'manage-anak',
  'view-orang-tua',
  'manage-orang-tua',
  'view-posyandu',
  'view-kader',
  'view-pemeriksaan',
  'manage-pemeriksaan',
  'view-imunisasi',
  'manage-imunisasi',
  'view-ibu-hamil',
  'manage-ibu-hamil',
  'view-followup',
  'manage-followup',
  'view-jadwal',
  'manage-jadwal',
  'view-edukasi',
  'view-laporan',
]

/** Orang tua hanya boleh membaca data anak dan jadwalnya sendiri. */
const ORANG_TUA_PERMS: Permission[] = [
  'view-dashboard',
  'view-anak',
  'view-pemeriksaan',
  'view-imunisasi',
  'view-jadwal',
  'view-edukasi',
]

export const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  ADMIN: ADMIN_PERMS,
  KADER: KADER_PERMS,
  ORANG_TUA: ORANG_TUA_PERMS,
}

export function can(role: Role | null | undefined, permission: Permission): boolean {
  if (!role) return false

  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false
}

export function canAny(role: Role | null | undefined, permissions: Permission[]): boolean {
  return permissions.some((p) => can(role, p))
}