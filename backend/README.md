# Backend – Posyandu Digital (Laravel 11)

> API-first, RBAC, multi-Posyandu, audit log. Logic tidak ada di Controller – semua lewat `Request → Service → Model`.

## Stack
PHP 8.3, Laravel 11, Sanctum, PostgreSQL (MySQL ready), DomPDF, Maatwebsite Excel

## Struktur Profesional
```
app/
  Enums/Role.php                 # SUPER_ADMIN, ADMIN_POSYANDU, KADER, ORANG_TUA
  Http/
    Controllers/Api/             # 14 controllers – tipis, delegasi ke Service
    Requests/                    # StoreChildRequest, UpdateChildRequest, dll – FormRequest validation
    Resources/                   # ChildResource, ExaminationResource – konsisten {success,data,meta}
    Middleware/EnsureRole.php
  Models/                        # 12 models + SoftDeletes + casts + relations
    User::posyanduIds(), canAccessPosyandu()
    Child, ParentModel, Posyandu, Examination, GrowthRecord, GrowthStandard, Education, Immunization, FollowUp, Schedule, AuditLog
  Policies/                      # ChildPolicy, ExaminationPolicy, EducationPolicy, PosyanduPolicy, FollowUpPolicy
  Services/
    GrowthAnalysisService.php    # indikator weight/height/head/arm → label Sesuai/Perlu Perhatian/...
    NutritionRecommendationService.php  # rule-based, edukasi
    AuditLogService.php
  Exports/GenericExport.php
database/
  migrations/ 9 files (indexed, softDeletes, foreignId)
  seeders/ PosyanduSeeder, UserSeeder, EducationSeeder, ChildParentSeeder, ExaminationSeeder
routes/
  api.php                        # REST, middleware auth:sanctum, isolation per posyandu
  web.php                        # SPA fallback → resources/views/app.blade.php (frontend build)
```

## Prinsip
- **Controller → Request Validation → Service → Model → DB** (no business logic di Controller)
- **Data Isolation WAJIB**: `User::canAccessPosyandu()` cek tiap query. Test: kader A 403 saat akses anak B.
- **Transaction**: `DB::transaction()` untuk `examination + growth_record + audit_log`
- **SoftDelete**: children, parents, posyandu, educations. Examination pakai `voided` + `void_reason`
- **AuditLog**: `action, module, record_id, old/new, ip, user_agent` – tidak simpan password
- **Response konsisten**: `{success, message, data, meta, errors}`

## Setup
```bash
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed
php artisan serve --host=0.0.0.0 --port=8000
```

## .env
Lihat `.env.example` – default `pgsql` (ganti `mysql` tinggal ubah `DB_CONNECTION`)

## Demo Accounts
Semua pass `password123` – `database/seeders/UserSeeder.php`

## Testing
```bash
php artisan test
vendor/bin/phpunit
```

## API Docs
Lihat `routes/api.php` – 30+ endpoints. Public: `GET /api/edukasi`, Auth: `POST /api/login`

## Keamanan
Policies + Gates + middleware, validation FormRequest, sanitasi HTML edukasi, file upload `jpg/jpeg/png/webp` max 2MB, password `Hash`, no SQL trace ke frontend.

## Frontend Build Integration
`frontend/dist` → `public/assets` + `resources/views/app.blade.php` → `routes/web.php` SPA fallback. Jadi 1 `ngrok http 8000` cukup.
