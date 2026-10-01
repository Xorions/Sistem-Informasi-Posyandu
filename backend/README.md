# Backend - Posyandu Terpadu (Laravel 11)

> API-first, RBAC tiga role, empat posyandu, audit log. Logika bisnis tidak ditulis
> di Controller: alurnya `Request -> Service -> Model`.

## Stack

PHP 8.3, Laravel 11, Sanctum, PostgreSQL 18, DomPDF, Maatwebsite Excel, Intervention Image

## Struktur

```
app/
  Enums/Role.php                 # ADMIN, KADER, ORANG_TUA
  Http/
    Controller.php               # base controller dengan AuthorizesRequests
    Controllers/Api/             # satu controller per modul, tipis
    Requests/                    # FormRequest: validasi + authorize()
    Resources/                   # JsonResource per entitas
  Models/
    User        -> posyanduIds(), canAccessPosyandu(), ownsChild()
    Child       -> scopeForUser()   # pembatasan anak untuk orang tua
    Kader, IbuHamil, PemeriksaanBumil, Immunization, Posyandu, ParentModel,
    Examination, GrowthRecord, GrowthStandard, Education, FollowUp, Schedule, AuditLog
  Policies/                      # Child, Kader, IbuHamil, PemeriksaanBumil, Posyandu,
                                 # Examination, FollowUp, Education
  Services/                      # GrowthAnalysis, NutritionRecommendation, AuditLog
  Exports/GenericExport.php
database/
  migrations/                    # users+role, posyandu, children, parents, growth,
                                 # education, immunization, audit, konsolidasi-role,
                                 # kader, jenis imunisasi, KIA, users.parent_id
  seeders/                       # Posyandu, User, Kader, Education, ChildParent,
                                 # OrangTua, IbuHamil, Examination
routes/
  api.php                        # REST, auth:sanctum, isolation per role dan posyandu
  web.php                        # fallback SPA ke resources/views/app.blade.php
```

## Prinsip

- **Controller -> FormRequest -> Service -> Model -> DB**
- **Role**: tiga nilai.
  - `ADMIN` - akses penuh keempat posyandu, mengelola data master (posyandu, kader, pengguna, edukasi).
  - `KADER` - operasional anak, pemeriksaan, imunisasi, ibu hamil, tindak lanjut, jadwal pada posyandu yang ditugaskan.
  - `ORANG_TUA` - hanya membaca data anaknya sendiri, tidak dapat menulis.
- **Data Isolation berlapis**:
  1. query scope `Model::forUser($user)` menyembunyikan baris di luar cakupan,
  2. Policy menolak per objek,
  3. `FormRequest::authorize()` menolak request tulis dari orang tua.
- **Transaction** untuk `examination + growth_record` dan operasi audit berlapis.
- **SoftDelete** pada anak, orang tua, posyandu, kader, ibu hamil, edukasi.
  Pemeriksaan anak memakai `voided` + `void_reason`.
- **AuditLog** menyimpan `action, module, record_id, old_values, new_values, ip, user_agent`
  dan tidak pernah menyimpan password.
- **Response konsisten**: `{success, message, data, meta, errors}`.

## Catatan teknis

- Nama tabel memakai bentuk tunggal dan tidak mengikuti konvensi plural Eloquent, sehingga
  model terkait menyebutkannya eksplisit lewat `protected $table` (`posyandu`, `kader`,
  `ibu_hamil`, `pemeriksaan_bumil`, `follow_ups`, `parents`).
- Kolom `enum` di PostgreSQL dikompilasi Laravel menjadi `varchar + CHECK constraint`.
  Mengubah nilainya butuh SQL langsung; lihat `2026_10_01_100000_consolidate_role_to_three.php`.
- `ilike` dan `to_char()` adalah sintaks PostgreSQL. Untuk MySQL perlu penyesuaian.

## Setup

```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=127.0.0.1 --port=8000
```

## .env

Lihat `.env.example` - default `pgsql` (ganti ke `mysql` cukup ubah `DB_CONNECTION`).

## Akun Demo

Semua password `password123`, dibuat oleh `UserSeeder` dan `OrangTuaSeeder`:

| Role | Email |
|------|-------|
| ADMIN | admin@example.test |
| ADMIN | admin.cutnyakdien@example.test |
| KADER | kader@example.test |
| KADER | kader.kartika@example.test |
| KADER | kader.kartini@example.test |
| KADER | kader.radenintan@example.test |
| ORANG_TUA | orangtua@example.test |

Akun orang tua tertaut ke profil orang tua lewat `users.parent_id`, sehingga hanya
melihat anak-anaknya sendiri.

## Testing

```bash
php artisan test
vendor/bin/phpunit
```

`tests/Feature/RoleAndScopeTest.php` menguji aturan role, cakupan data, dan modul baru.

## API

Lihat `routes/api.php` - 90+ endpoint. Publik: `GET /api/edukasi`,
`GET /api/edukasi/{slug}`, `POST /api/login`.

## Keamanan

Policies + query scope, validasi FormRequest, sanitasi HTML konten edukasi, upload gambar
`jpg/jpeg/png/webp` maksimal 2MB, password di-hash, tidak ada stack trace ke frontend.

## Integrasi Build Frontend

`frontend/dist` disalin ke `public/assets`, dilayani oleh `resources/views/app.blade.php`,
dengan fallback SPA di `routes/web.php`. Satu `php artisan serve :8000` cukup.
