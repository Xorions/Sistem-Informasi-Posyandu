# Features

Tiap feature punya folder `pages/` dan boleh menambah `components/` atau `hooks/`
bila modulnya makin besar. Tujuannya domain tetap terisolasi.

- `auth` - Login dan AuthContext (token, user, role, posyandus, profil orang tua, kader)
- `dashboard` - Statistik dan grafik; tampilan berbeda untuk operator dan orang tua
- `children` - List, Form, Detail (7 tab)
- `parents` - CRUD orang tua/wali
- `posyandu` - CRUD posyandu
- `kader` - CRUD kader/petugas posyandu
- `examinations` - Input BB/TB/PB/LK/LiLA
- `pertumbuhan` - Grafik pertumbuhan
- `analisis` - Hasil analisis pertumbuhan dan rekomendasi
- `edukasi` - CRUD konten dan halaman publik
- `immunizations` - Imunisasi dan Vitamin (filter jenis)
- `bumil` - Ibu Hamil, detail dengan riwayat pemeriksaan, rekap Pemeriksaan Bumil
- `follow-ups` - Tindak lanjut
- `schedules` - Jadwal kegiatan posyandu
- `reports` - Laporan dan export
- `users` - Manajemen akun
- `audit-logs` - Riwayat audit

## Aturan

- Import antar feature memakai alias `@/features/<modul>/...`.
- Komponen yang dipakai lintas feature wajib masuk ke `src/shared/`.
- Pengaturan akses memakai `can(role, permission)` dari `shared/lib/rbac.ts`,
  bukan daftar role yang ditulis manual.
- Path rute selalu dari `ROUTES` di `src/app/routes.tsx`.