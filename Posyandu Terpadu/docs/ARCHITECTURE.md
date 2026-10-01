# Arsitektur - Posyandu Terpadu

```
React 19 (Vite, Tailwind, Recharts)
  -> REST API (axios + bearer token)
Laravel 11 (Sanctum, Policies, Services)
  -> Eloquent
PostgreSQL 18
```

## Layer Backend

```
Controller (tipis: validasi akses, orkestrasi)
  ->
FormRequest (validasi input)
  ->
Service (GrowthAnalysisService, NutritionRecommendationService, AuditLogService)
  ->
Model (relasi, casts, query scope forUser)
  ->
DB (migration terindeks, transaction, softDeletes)
```

## Layer Frontend

```
app/App.tsx (BrowserRouter, Protected, RequirePermission)
  ->
shared/components/layout/Layout.tsx (sidebar dari shared/lib/rbac.ts)
  ->
features/<modul>/pages/*
  ->
shared/ (components/ui, lib/api.ts, lib/rbac.ts, lib/config.ts, types, hooks)
```

Aturan pemisahan:

- `app/routes.tsx` adalah satu-satunya sumber path. Sidebar dan router mengimpor dari sini.
- `shared/lib/rbac.ts` adalah satu-satunya sumber izin. Sidebar memakai `can(role, permission)`,
  router memakai `RequirePermission`.
- `shared/lib/api.ts` meng-exposed endpoint per modul dengan tipe balik dari `shared/types`.
- `shared/types/index.ts` mengikuti nama kolom di database, bukan istilah lokal.

## Role dan Cakupan Data

Tiga role: `ADMIN`, `KADER`, `ORANG_TUA` (`app/Enums/Role.php`, kolom `users.role`).

| Role | Cakupan |
|------|---------|
| ADMIN | Seluruh posyandu, seluruh modul termasuk master data |
| KADER | Data operasional di posyandu yang ditugaskan lewat pivot `user_posyandu` |
| ORANG_TUA | Hanya anak yang tertaut dengan profilnya lewat `users.parent_id` |

LapisanOntrol):

1. **Query scope** - `Child/Examination/FollowUp/Immunization/IbuHamil/Kader::forUser($user)`
   menyembunyikan baris di luar cakupan, sehingga filter frontend tidak bisa dilewati.
2. **Policy** - `ChildPolicy`, `ExaminationPolicy`, `KaderPolicy`, `IbuHamilPolicy`, dan lainnya
   menolak akses per-objek (misalnya `GET /children/{id}` milik orang lain).
3. **FormRequest** - `authorize()` menolak orang tua untuk setiap request tulis.

Tujo forgettingposyandu berbasis `User::posyanduIds()` plus `canAccessPosyandu()`, yang secara
otomatis membaca cakupan anak untuk role `ORANG_TUA`.

## Empat Posyandu

`PSY001` Cut Nyak Dien, `PSY002` Kartika, `PSY003` Kartini, `PSY004` Raden Intan.

## Alur Data

```
DATA (Child + ParentModel + Kader)
  ->
PEMERIKSAAN (Examination + GrowthRecord: weight/height/length/head/arm LiLA)
  ->
ANALISIS (GrowthAnalysisService, growth_standards)
  ->
EDUKASI (Education, publish)
  ->
TINDAK LANJUT (FollowUp, Immunization+VITAMIN, Schedule)
  ->
DASHBOARD & LAPORAN (agregasi per posyandu)

KIA (IbuHamil + PemeriksaanBumil) berjalan berdampingan dengan alur anak
  ->
KESEHATAN IBU (usia kehamilan dari HPHT, tensi, LILA, denyut jantung janin)
```

## Deployment

- Dev: `backend:8000` + `frontend:5173` (proxy Vite meneruskan `/api`)
- Build: `frontend/npm run build` menghasilkan `frontend/dist`, dapat dilayani lewat
  `backend/resources/views/app.blade.php` dan fallback `routes/web.php` pada satu port.

## Keamanan

- Token Sanctum, password di-hash, akun nonaktif ditolak saat login.
- Policy + query scope berlapis, audit log tidak pernah menyimpan password.
- Sanitasi HTML pada konten edukasi, validasi upload gambar, transaction untuk datarelated.
- SoftDeletes pada anak, orang tua, posyandu, kader, ibu hamil, dan edukasi.

## Dokumentasi

- `README.md` - ringkasan, akun demo, daftar endpoint
- `backend/README.md` - catatan backend
- `frontend/README.md` - struktur feature frontend
- `tests/Feature/RoleAndScopeTest.php` - pengunci aturan role dan cakupan data