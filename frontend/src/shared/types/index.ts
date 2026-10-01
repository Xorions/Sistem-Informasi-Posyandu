// Bentuk data frontend <-> backend API.
//
// Seluruh nama field di file ini mengikuti JSON yang benar-benar dikirim
// Laravel (snake_case, sesuai nama kolom di migration), bukan istilah lokal
// seperti `id_anak` atau `jenis_vaksin_vitamin`.

/** Tiga role aplikasi, sama dengan enum App\Enums\Role di backend. */
export type Role = 'ADMIN' | 'KADER' | 'ORANG_TUA'

export const ROLES: Role[] = ['ADMIN', 'KADER', 'ORANG_TUA']

export const ROLE_LABEL: Record<Role, string> = {
  ADMIN: 'Admin',
  KADER: 'Kader',
  ORANG_TUA: 'Orang Tua',
}

export const ROLE_DESCRIPTION: Record<Role, string> = {
  ADMIN: 'Akses penuh keempat posyandu, kelola kader, pengguna, dan laporan.',
  KADER: 'Kelola data posyandu yang ditugaskan: anak, pemeriksaan, imunisasi, ibu hamil.',
  ORANG_TUA: 'Hanya melihat data anak sendiri: profil, pertumbuhan, imunisasi, dan jadwal.',
}

export type Status = 'active' | 'inactive'

export type Posyandu = {
  id: number
  kode_posyandu: string
  nama_posyandu: string
  alamat: string
  desa_kelurahan?: string | null
  kecamatan?: string | null
  kabupaten_kota?: string | null
  provinsi?: string | null
  nama_ketua?: string | null
  nomor_telepon?: string | null
  status: Status
  /** Dikembalikan oleh PosyanduController@show */
  children_count?: number
}

/** Bentuk ringkas posyandu yang ikut di payload autentikasi. */
export type PosyanduRef = Pick<Posyandu, 'id' | 'nama_posyandu' | 'kode_posyandu'>

export type OrangTua = {
  id: number
  nik?: string | null
  nama_lengkap: string
  tempat_lahir?: string | null
  tanggal_lahir?: string | null
  jenis_kelamin?: 'L' | 'P' | null
  alamat?: string | null
  nomor_telepon?: string | null
  pekerjaan?: string | null
  /** Hanya pada ParentResource */
  children_count?: number
  pivot?: {
    relationship: 'Ayah' | 'Ibu' | 'Wali'
    is_primary_contact: boolean
  }
}

export type Child = {
  id: number
  posyandu_id: number
  nik?: string | null
  nama_lengkap: string
  nama_panggilan?: string | null
  tempat_lahir: string
  tanggal_lahir: string
  jenis_kelamin: 'L' | 'P'
  alamat: string
  nomor_kk?: string | null
  status: Status
  umur_bulan?: number | null
  umur_tahun?: number | null
  posyandu?: Posyandu
  parents?: OrangTua[]
  /** Dikembalikan oleh ChildController@index */
  examinations_count?: number
}

export type Kader = {
  id: number
  posyandu_id: number
  user_id?: number | null
  nama_kader: string
  nik_kader?: string | null
  no_hp?: string | null
  jabatan?: string | null
  pendidikan?: string | null
  alamat?: string | null
  tanggal_mulai_tugas?: string | null
  status: Status
  posyandu?: Posyandu
  user?: {
    id: number
    name: string
    email: string
    role: Role
  } | null
}

/** Profil kader yang ikut di payload autentikasi (ringkas). */
export type KaderRef = Pick<Kader, 'id' | 'nama_kader' | 'nik_kader' | 'jabatan' | 'posyandu_id'>

/** Profil orang tua yang ikut di payload autentikasi (ringkas). */
export type OrangTuaRef = Pick<OrangTua, 'id' | 'nama_lengkap' | 'nik' | 'nomor_telepon'>

export type User = {
  id: number
  name: string
  email: string
  role: Role
  phone?: string | null
  is_active?: boolean
  posyandus?: PosyanduRef[]
  parent?: OrangTuaRef | null
  kader?: KaderRef | null
}

export type GrowthRecord = {
  id?: number
  weight?: number | null
  height?: number | null
  length?: number | null
  head_circumference?: number | null
  arm_circumference?: number | null
}

export type ExaminationStatus = 'active' | 'voided'

export type Examination = {
  id: number
  child_id: number
  posyandu_id: number
  examination_date: string
  examiner_id?: number | null
  notes?: string | null
  status: ExaminationStatus
  void_reason?: string | null
  child?: Child
  posyandu?: Posyandu
  examiner?: User
  growth_record?: GrowthRecord | null
}

export type ImunisasiStatus = 'sudah' | 'belum' | 'terjadwal'

export type JenisPemberian = 'VAKSIN' | 'VITAMIN'

export const JENIS_PEMBERIAN_LABEL: Record<JenisPemberian, string> = {
  VAKSIN: 'Vaksin',
  VITAMIN: 'Vitamin',
}

/**
 * Riwayat pemberian vaksin atau vitamin.
 *
 * Nama kolom mengikuti tabel `immunizations`: `vaccine_name` untuk nama
 * pemberian, `vaccination_date` untuk tanggal, `notes` untuk keterangan.
 */
export type Imunisasi = {
  id: number
  child_id: number
  jenis: JenisPemberian
  jenis_label: string
  vaccine_name: string
  batch?: string | null
  vaccination_date?: string | null
  status: ImunisasiStatus
  notes?: string | null
  recorded_by?: number | null
  nama_anak?: string | null
  child?: Child
}

/** Alias sesuai istilah tester. */
export type ImunisasiVitamin = Imunisasi

export type FollowUpStatus = 'pending' | 'in_progress' | 'completed' | 'cancelled'

export type FollowUp = {
  id: number
  child_id: number
  posyandu_id: number
  examination_id?: number | null
  type: string
  status: FollowUpStatus
  follow_up_date?: string | null
  notes?: string | null
  handled_by?: number | null
  child?: Child
  posyandu?: Posyandu
  handler?: User
}

export type ScheduleStatus = 'scheduled' | 'completed' | 'cancelled'

/**
 * Jadwal kegiatan posyandu.
 *
 * Sesuai tabel `schedules`: `title` untuk agenda, `date` untuk tanggal
 * kegiatan, `start_time`/`end_time` untuk jam mulai dan selesai.
 */
export type Jadwal = {
  id: number
  posyandu_id: number
  title: string
  date: string
  start_time?: string | null
  end_time?: string | null
  location?: string | null
  description?: string | null
  status: ScheduleStatus
  posyandu?: Posyandu
}

/** Alias sesuai istilah tester. */
export type Schedule = Jadwal

export type StatusBumil = 'normal' | 'perlu_perhatian' | 'danger'

export const STATUS_BUMIL_LABEL: Record<StatusBumil, string> = {
  normal: 'Normal',
  perlu_perhatian: 'Perlu Perhatian',
  danger: 'Perlu Tindakan Segera',
}

export type IbuHamil = {
  id: number
  parent_id: number
  posyandu_id: number
  nama_ibu?: string | null
  nik?: string | null
  nomor_telepon?: string | null
  alamat?: string | null
  orang_tua?: OrangTua | null
  posyandu?: Posyandu
  hpht?: string | null
  tanggal_perkiraan_lahir: string
  usia_kehamilan: number
  trimester: 1 | 2 | 3
  sudah_diperiksa: boolean
  jarak_kehamilan?: number | null
  jumlah_anak_lahir?: number | null
  tinggi_funds?: number | null
  berat_badan?: number | null
  golongan_darah?: string | null
  riwayat_penyakit?: string | null
  status: Status
  pemeriksaan_terakhir?: PemeriksaanBumil | null
}

export type PemeriksaanBumil = {
  id: number
  ibu_hamil_id: number
  examiner_id?: number | null
  nama_pemeriksa?: string | null
  nama_ibu?: string | null
  tanggal_periksa: string
  usia_kehamilan: number
  berat_badan?: number | null
  tinggi_badan?: number | null
  /** Disimpan sebagai teks "120/80" */
  tekanan_darah?: string | null
  lingkar_lengan_atas?: number | null
  tinggi_funds?: number | null
  denyut_jantung_janin?: number | null
  posisi_janin?: string | null
  keluhan?: string | null
  catatan?: string | null
  status: StatusBumil
}

export type EducationCategory = {
  id: number
  name: string
  slug: string
  description?: string | null
  educations_count?: number
}

export type EducationStatus = 'draft' | 'published' | 'archived'

export type Education = {
  id: number
  category_id: number
  title: string
  slug: string
  thumbnail?: string | null
  content: string
  source?: string | null
  source_url?: string | null
  status: EducationStatus
  author_id?: number | null
  published_at?: string | null
  category?: EducationCategory
  author?: User
}

export type AuditLog = {
  id: number
  user_id?: number | null
  action: string
  module: string
  record_id?: number | null
  old_values?: Record<string, unknown> | null
  new_values?: Record<string, unknown> | null
  ip_address?: string | null
  user_agent?: string | null
  created_at: string
  user?: User
}

export type ApiMeta = {
  current_page: number
  last_page: number
  total: number
  per_page: number
  from?: number
  to?: number
}

/** Nilai meta saat endpoint belum pernah dipanggil. */
export const EMPTY_PAGE_META: ApiMeta = {
  current_page: 1,
  last_page: 1,
  total: 0,
  per_page: 10,
}

export type ApiResponse<T> = {
  success: boolean
  message?: string
  data: T
  meta?: ApiMeta
  errors?: Record<string, string[]>
}

export type Option = { value: string | number; label: string }