# Project Context & Architecture — Sistem Informasi Posyandu

Dokumen ini mendokumentasikan **kondisi sistem saat ini**. Tidak memuat saran perbaikan.

Empat posyandu: Cut Nyak Dien, Kartika, Kartini, Raden Intan.
Alur data: `DATA -> PEMERIKSAAN -> ANALISIS -> EDUKASI -> TINDAK LANJUT`, dengan jalur KIA (`IbuHamil` + `PemeriksaanBumil`) berjalan berdampingan.

---

## 1. Tech Stack & Infrastructure

### Backend (`backend/composer.json`)

| Komponen                | Versi                                                         |
| ----------------------- | ------------------------------------------------------------- |
| PHP                     | `^8.2` (runtime dikembangkan di PHP 8.3)                      |
| Laravel Framework       | `^11.31`                                                      |
| Laravel Sanctum         | `^4.3`                                                        |
| barryvdh/laravel-dompdf | `^3.1`                                                        |
| maatwebsite/excel       | `^3.1`                                                        |
| intervention/image      | `^4.3`                                                        |
| Database                | PostgreSQL 18 (driver `pgsql`)                                |
| Dev                     | PHPUnit `^11.0.1`, Laravel Pint, Pail, Sail, Collision, Faker |

### Frontend (`frontend/package.json`)

| Komponen          | Versi                                                                                            |
| ----------------- | ------------------------------------------------------------------------------------------------ |
| React / React DOM | `^19.3.0`                                                                                        |
| React Router DOM  | `^7.18.4`                                                                                        |
| Vite              | `^8.3.0`                                                                                         |
| TypeScript        | `~6.0.2`                                                                                         |
| Tailwind CSS      | `^3.4.10`                                                                                        |
| Axios             | `^1.20.0`                                                                                        |
| Recharts          | `^3.10.1`                                                                                        |
| Dev               | `@vitejs/plugin-react ^6.1.1`, `concurrently ^10.0.5`, `autoprefixer ^10.6.1`, `postcss ^8.5.28` |

Tidak ada state library (Redux/Zustand/React Query) dan tidak ada framework test frontend.

### Topologi runtime

| Port             | Penyajian                                    | Sumber kode                         |
| ---------------- | -------------------------------------------- | ----------------------------------- |
| `localhost:5173` | Vite dev server (proxy `/api`)               | `frontend/src` langsung, HMR        |
| `127.0.0.1:8000` | Laravel (`routes/web.php` + `app.blade.php`) | `backend/public/assets` hasil build |

Perintah (`frontend/package.json`):

```text
npm run dev         concurrently  -> dev:api (php artisan serve) + dev:web (vite)
npm run dev:web     vite saja
npm run dev:api     cd ../backend && php artisan serve --host=127.0.0.1 --port=8000
npm run build       tsc && vite build
npm run build:prod  tsc && vite build && node scripts/sync-public.mjs
npm run lint        tsc --noEmit
npm run setup       npm install && npm --prefix ../backend install
```

`scripts/sync-public.mjs` menyalin `dist` ke `backend/public` dan menulis ulang referensi berkas ber-hash di `app.blade.php`.

Trust proxy: `bootstrap/app.php` set `trustProxies(at: '*')` dengan header `X-Forwarded-For/Host/Port/Proto/AWS-ELB`.

### Kredensial demo

Password semua akun: `password123`. Dikonstankan di `frontend/src/shared/lib/config.ts` (`DEMO_PASSWORD`) dan `DEMO_ACCOUNTS`.

| Role           | Email                                                                                                             |
| -------------- | ----------------------------------------------------------------------------------------------------------------- |
| ADMIN          | `admin@example.test`                                                                                              |
| ADMIN (cabang) | `admin.cutnyakdien@example.test`                                                                                  |
| KADER          | `kader@example.test`, `kader.kartika@example.test`, `kader.kartini@example.test`, `kader.radenintan@example.test` |
| ORANG_TUA      | `orangtua@example.test`                                                                                           |

Seeding: 14 / 15 / 17 / 15 = 61 anak.

---

## 2. Directory Architecture

### Backend

```text
backend/
  app/
    Enums/Role.php                     ADMIN | KADER | ORANG_TUA
    Exports/GenericExport.php          export Excel generik (CsvSanitizer)
    Http/
      Controllers/Api/                 endpoint REST per modul
      Middleware/EnsureRole.php        alias middleware `role:A,B`
      Requests/                        validasi + authorize() per aksi
      Resources/                       transformasi respons (UserResource, dll)
    Models/                            Eloquent + scopeForUser()
    Policies/                          otorisasi per objek
    Providers/
    Services/                          GrowthAnalysis, NutritionRecommendation,
                                       AuditLog, SpecialCareExitEvaluation
    Support/                           CsvSanitizer, HasPiiMasking, Mask, SqlHelper
  bootstrap/app.php                    routing, middleware alias, exception render
  config/special_care.php              ambang batas program special care
  database/migrations/                 19 migrasi
  database/seeders/
  routes/api.php                       seluruh API
  routes/web.php                       SPA catch-all
  tests/Feature/RoleAndScopeTest.php   kunci aturan role & cakupan
  phpunit.xml                          DB test terpisah
```

### Frontend

```text
frontend/
  scripts/sync-public.mjs              dist -> backend/public + rewrite blade
  src/
    main.tsx                           entry, mounting
    index.css                          Tailwind layers + utilitas global
    app/
      App.tsx                          router + guard `Protected` / `RequirePermission`
      routes.tsx                       ROUTES — sumber tunggal path
    features/<modul>/
      pages/                           komponen halaman
      components/                      komponen lokal modul
      (auth) AuthContext.tsx           state sesi
    shared/
      lib/
        api.ts                         instance axios + helper bertipe per modul
        config.ts                      CONFIG, POSYANDU_NAMES, DEMO_*
        rbac.ts                        daftar permission + can()
        utils.ts                       buildDirtyPayload, sanitizeHtml, stripHtml, dll
      types/index.ts                   tipe data (nama kolom DB asli)
      components/
        layout/Layout.tsx              sidebar + header + viewport lock
        ui/                            badge, card, field, modal, toast, Skeleton
      hooks/useDebounce.ts             satu-satunya hook bersama
```

Modul `features/`: `analisis`, `audit-logs`, `auth`, `bumil`, `children`, `dashboard`, `edukasi`, `examinations`, `follow-ups`, `immunizations`, `kader`, `parents`, `pertumbuhan`, `posyandu`, `reports`, `schedules`, `special-care`, `users`.

### Konvensi penamaan

- Tabel backend **tunggal** dan butuh `protected $table` eksplisit: `posyandu`, `kader`, `ibu_hamil`, `pemeriksaan_bumil`, `special_care_enrollment`, `parents`, `follow_ups`.
- Nama field di `shared/types/index.ts` mengikuti kolom DB (`nama_lengkap`, `posyandu_id`, `vaccine_name`, `tanggal_periksa`).
- Semua SQL pencarian memakai PostgreSQL: `ilike`, `to_char()`; wildcard user di-escape `SqlHelper::escapeLike()`.

---

## 3. Core Entities & Relations (Data Model)

19 migrasi. Entitas dan kunci relasi:

| Tabel                                               | Kolom kunci                                                                                                                      | Relasi                                                                                           |
| --------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `users`                                             | `id`, `email`, `password`, `role`, `phone`, `is_active`, `parent_id` FK→`parents.id`, softDeletes                                | `posyandus()` many-to-many via `user_posyandu`; `parent()`, `kader()`                            |
| `posyandu`                                          | `id`, `nama`, `alamat`, `is_active`                                                                                              | `users()` via pivot, `children()`, `kader()`                                                     |
| `user_posyandu`                                     | `user_id`, `posyandu_id`                                                                                                         | pivot penugasan admin/kader                                                                      |
| `kader`                                             | `id`, `user_id` FK, `posyandu_id` FK, `nik_kader`, `no_hp`                                                                       | `user()`, `posyandu()`                                                                           |
| `parents`                                           | `id`, `nama_lengkap`, `nik`, `nomor_kk`, `nomor_telepon`, `alamat`                                                               | `children()` many-to-many via `child_parent`; `users()`                                          |
| `children`                                          | `id`, `nama_lengkap`, `nik`, `tanggal_lahir`, `jenis_kelamin`, `posyandu_id` FK                                                  | `posyandu()`, `parents()` via `child_parent`, `examinations()`, `immunizations()`, `followUps()` |
| `child_parent`                                      | `child_id`, `parent_id`, `relationship` (Ayah/Ibu/Wali), `is_primary_contact`                                                    | pivot orang tua–anak                                                                             |
| `examinations`                                      | `id`, `child_id` FK, `tanggal_periksa`, `berat_badan`, `tinggi_badan`, `lingkar_kepala`, `lingkar_lengan`, `status` (`active`/…) | `child()`, `growthRecords()`, `analysis` (service, non-persist)                                  |
| `growth_records`                                    | `id`, `examination_id` FK, `weight`, `height`, `length`, `head_circumference`, `arm_circumference` `decimal(5,2)`                | `examination()`                                                                                  |
| `growth_standards`                                  | `id`, `indicator`, `gender` (L/P/ALL), `age_min`, `age_max`, `reference_type`, `reference_value`, `source`, `version`            | referensi analisis pertumbuhan                                                                   |
| `immunizations`                                     | `id`, `child_id` FK, `vaccine_name`, `jenis`, `tanggal_imunisasi`, `status` (`sudah`/`pending`)                                  | `child()`, `followUps()`                                                                         |
| `follow_ups`                                        | `id`, `child_id` FK, `examination_id` FK, `immunization_id` FK, `status`, `tanggal_tindak_lanjut`, `catatan`                     | `child()`, `examination()`, `immunization()`                                                     |
| `schedules`                                         | `id`, `posyandu_id` FK, `tanggal`, `jenis`, `status` (`scheduled`)                                                               | `posyandu()`                                                                                     |
| `education_categories`                              | `id`, `nama`, `slug`                                                                                                             | `educations()`                                                                                   |
| `educations`                                        | `id`, `education_category_id` FK, `judul`, `slug`, `konten`, `status` (`published`)                                              | kategori, dibaca publik                                                                          |
| `ibu_hamil`                                         | `id`, `parent_id` FK, `posyandu_id` FK, `nama_lengkap`, `nik`, `hpht`, `status`                                                  | `pemeriksaanBumil()`                                                                             |
| `pemeriksaan_bumil`                                 | `id`, `ibu_hamil_id` FK, `tanggal_periksa`, `usia_kehamilan`, `berat_badan`, `tekanan_darah`, `lila`                             | `ibuHamil()`                                                                                     |
| `special_care_enrollment`                           | `id`, `child_id` FK, `jenis` (wasting/stunting), `trigger_indicators` (json→array), `status`, `started_at`, `exit_evaluated_at`  | `child()`                                                                                        |
| `audit_logs`                                        | `id`, `user_id`, `action`, `module`, `old_values` json, `new_values` json, `ip_address(45)`, `user_agent`                        | `user()`                                                                                         |
| `schedules`/`personal_access_tokens`/`cache`/`jobs` | infrastruktur                                                                                                                    | —                                                                                                |

Aturan integritas yang ditegakkan di DB/FormRequest:

- `nik`, `nomor_kk`: tepat 16 digit.
- Nomor telepon: `regex:/^(\+62|62|0)8[1-9][0-9]{6,11}$/`.
- Antropometri: berat 1.5–35 kg; tinggi/panjang 40–130 cm; lingkar kepala 30–60 cm; LiLA 8–25 cm (wajib).
- Enum `users.role` dikompilasi jadi `varchar` + `CHECK`; perubahan enum butuh SQL mentah (lihat `2026_10_01_100000_consolidate_role_to_three.php`).

`Child` meng-append atribut `umur_bulan` dan `umur_tahun`. `examinations()` hanya mengembalikan `status = active`; `allExaminations()` tanpa filter.

---

## 4. API & State Management Pattern

### Kontrak respons

Amplop konsisten: `{ success, message, data }`; error validasi `422` menambah `errors`. Paginasi dibungkus `data.data` + `meta`.

Exception renderer global (`bootstrap/app.php`):

- `AuthenticationException` → `401 {success:false, message:'Unauthorized'}`
- `ValidationException` → `422 {success:false, message:'Validasi gagal', errors}`

### Autentikasi

- Sanctum **token-based**, token `posyandu-token`, dikirim sebagai `Authorization: Bearer <token>`. Tidak memakai cookie/SPA mode; axios `withCredentials: false`.
- `POST /api/login` → `{ data: { user, token } }`; token disimpan di localStorage (`posyandu_token`), user di `posyandu_user`.
- `GET /api/user` dipanggil ulang setiap aplikasi dimuat — state user di localStorage **tidak pernah dipercaya langsung**.
- `POST /api/logout` menghapus `currentAccessToken()`.
- Password reset Laravel: `/forgot-password`, `/reset-password`.
- `throttle:login` pada login/forgot/reset.
- Kegagalan login dicatat `AuditLogService::log('LOGIN_FAILED', 'auth', ...)`; akun `is_active = false` → `403`.

### Client HTTP (`frontend/src/shared/lib/api.ts`)

Satu instance axios untuk seluruh aplikasi. Tanggung jawab:

- Interceptor request: inject `Authorization` dari localStorage.
- Interceptor response: normalisasi error, pemetaan per status (`401`, `403`, `429`, `422`, `5xx`), sanitasi pesan server mentah.
- `isRawServerError()` menyaring kebocoran teknis (SQLSTATE, stack trace, nama exception, path file).
- Helper publik: `apiErrorMessage()`, `apiValidationErrors()`, `extractBlobErrorMessage()` (untuk unduhan PDF/Excel blob), `unwrap()` / `unwrapWithMeta()`.
- Modul bertipe: `apiAuth`, `apiChildren`, `apiParents`, `apiPosyandu`, `apiKader`, `apiExaminations`, `apiImunisasi`, `apiFollowUps`, `apiIbuHamil`, `apiPemeriksaanBumil`, `apiSchedules`, `apiEducations`, `apiUsers`, `apiAuditLogs`, `apiDashboard`, `apiReports`, `apiSpecialCare`.

Semua request HTTP di komponen wajib lewat helper tersebut.

### State management

Tanpa library. Pola: `useState` lokal per halaman + Context API untuk sesi.

- `AuthContext` (`features/auth/AuthContext.tsx`): `user`, `loading`, `login`, `logout`, `refresh`, `role`, `isAdmin`, `isKader`, `isOrangTua`.
- Data list/detail di-fetch per halaman via `useEffect` + `useDebounce` untuk pencarian.
- Pencegahan kirim ulang PII tersamar: `buildDirtyPayload()` di `shared/lib/utils.ts` hanya mengirim field yang benar-benar diedit pada PUT/PATCH.

### Routing frontend

`app/routes.tsx` (`ROUTES`) = sumber tunggal path. `app/App.tsx` membungkus rute dengan `Protected` (butuh login) dan `RequirePermission` (memanggil `can(role, permission)` dari `rbac.ts`).

### Endpoint publik

`GET /api/edukasi`, `/api/edukasi/categories`, `/api/edukasi/{slug}` — tanpa auth. Sisanya `auth:sanctum`; grup `reports` juga di belakang `role:ADMIN,KADER`.

### Service bisnis (backend)

| Service                            | Perilaku                                                                                                                                                                                                                                                                                         |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `GrowthAnalysisService`            | 4 label: Sesuai Pemantauan / Perlu Perhatian / Perlu Pemantauan Lebih Lanjut / Perlu Konsultasi Tenaga Kesehatan; ambang deviasi 15%/25%/35%; LiLA < 11.5 → konsultasi, < 12.5 → lanjut untuk usia ≥ 6 bulan; fallback rentang internal bila `growth_standards` kosong; eksplisit non-diagnostik |
| `NutritionRecommendationService`   | Saran per pita usia (<6 ASI, <12 MPASI, ≥12 gizi seimbang) + saran kondisional status + disclaimer wajib                                                                                                                                                                                         |
| `AuditLogService`                  | Sanitasi rekursif; redaksi `password`, `password_confirmation`, `current_password`, `token`, `remember_token`, `access_token`, `api_token`; masking `nik`, `nik_kader`, `nomor_kk` (Mask::nik) dan `nomor_telepon`, `no_hp`, `phone`, `telepon` (Mask::phone)                                    |
| `SpecialCareExitEvaluationService` | Config-driven (`config/special_care.php`): wasting `min_duration_days 90`, `consecutive_recoveries_required 2`, `recovery_lila_cm 12.5`, `exit_mode strict`; stunting `auto_exit false`; hanya mengusulkan, tidak mengubah data                                                                  |

---

## 5. UI/UX & Styling Conventions

### Palet & token

`tailwind.config.js` mendefinisikan `colors.primary` (500 `#0ea5e9`, 600 `#0284c7`, 700 `#0369a1`) dan `colors.posyandu` (teal `#0d9488`, green `#10b981`, orange `#f59e0b`, red `#ef4444`). Penggunaan nyata di halaman dominan kelas bawaan Tailwind: `teal-600/700` sebagai warna aksi, `slate-50/100/200` untuk latar dan border, `rounded-2xl`, `shadow-sm`.

### Viewport lock

`Layout.tsx` menggunakan satu scroll container:

```text
outer : flex h-screen w-full overflow-hidden bg-slate-50 overscroll-none
main  : flex-1 h-full overflow-y-auto overscroll-y-none relative p-6 md:p-8
```

Halaman auth/publik memakai `min-h-screen`. Hanya `<main>` yang scroll; sidebar dan header tetap.

### Layout

`shared/components/layout/Layout.tsx`: sidebar kiri (desktop tetap, mobile drawer + overlay), header dengan info user dan tombol logout. Menu didefinisikan `NAV_SECTIONS`; setiap item punya `permission` dan difilter lewat `can(role, permission)` — sama dengan sumber yang dipakai router.

### Komponen bersama (`shared/components/ui/`)

| Berkas         | Isi                                                                                     |
| -------------- | --------------------------------------------------------------------------------------- |
| `card.tsx`     | `Card`, `CardHeader`, `CardContent`                                                     |
| `badge.tsx`    | `Badge` (warna dari `statusColor`), `StatusBadge`                                       |
| `field.tsx`    | `Field`, `Input`, `Select`, `Textarea`, `Button`, `Spinner`, `EmptyState`, `ErrorState` |
| `modal.tsx`    | `Modal`, `ConfirmDeleteModal`                                                           |
| `toast.tsx`    | `ToastProvider`, `useToast`, `showToast` (success/error/info, auto-dismiss 3 detik)     |
| `Skeleton.tsx` | `TableSkeleton`, `CardSkeleton`, dan varian lain                                        |

`StatusBadge` memakai kunci **nilai enum backend** (`active`, `pending`, `scheduled`, `sudah`, `published`, `perlu_perhatian`, …), bukan label UI — halaman mengirim nilai mentah dari API.

`Button` default `type="button"` agar tidak men-submit form tanpa sengaja.

### Loading & state kosong

Setiap halaman list memakai `TableSkeleton`/`CardSkeleton` dengan `animate-pulse` selama fetch, `EmptyState` bila hasil kosong, `ErrorState` bila gagal, dan `AccessDeniedState` bila `can()` menolak.

### Tabel & grafik

Tabel HTML dengan wrapper `overflow-x-auto`; grafik memakai Recharts (komponen utama penyumbang ukuran bundle ≈ 850 KB / 240 KB gzip).

### Konten kaya

`dangerouslySetInnerHTML` hanya untuk konten artikel edukasi penuh setelah `sanitizeHtml()` (DOMParser). Preview/excerpt kartu memakai `stripHtml()`. Semua `target="_blank"` disertai `rel="noopener noreferrer"`.

---

## 6. Security & Permissions

### Role

Enum `App\Enums\Role`: `ADMIN`, `KADER`, `ORANG_TUA`. Kolom `users.role`. Helper: `values()`, `adminOnly()` → `['ADMIN']`, `operator()` → `['ADMIN','KADER']`.
Middleware `EnsureRole` (alias `role`) menolak dengan `403` bila role tidak cocok, `401` bila tanpa user.

### Penegakan tiga lapis

1. **Query scope** — `Model::forUser($user)` di `Child`, `Examination`, `FollowUp`, `Immunization`, `IbuHamil`, `PemeriksaanBumil`, `Kader`, `ParentModel`; dipanggil di awal setiap `index()`. `Schedule` tidak memiliki scope.
2. **Policy** — `ChildPolicy`, `ExaminationPolicy`, `FollowUpPolicy`, `IbuHamilPolicy`, `PemeriksaanBumilPolicy`, `KaderPolicy`, `ParentPolicy`, `PosyanduPolicy`, `EducationPolicy`, `SpecialCareEnrollmentPolicy`. (Tidak ada `ImmunizationPolicy`.)
3. **FormRequest** — `authorize()` mengembalikan `! $this->user()?->isOrangTua()` untuk setiap request tulis.

### Kunci kepemilikan & cakupan

- `users.parent_id` → `parents.id`: pengait anak milik akun ORANG_TUA; `User::ownsChild()` memakai pivot `child_parent`.
- `user_posyandu`: penugasan ADMIN cabang / KADER. `User::canAccessPosyandu(?int)` mengembalikan `true` untuk `null`.
- `User::isSuperAdmin()` = role ADMIN **dan** (tidak punya penugasan **atau** penugasan ≥ seluruh jumlah posyandu).
- `User::posyanduIds()` menyesuaikan role.

### Matriks kekuatan kebijakan

| Policy                                               | viewAny / view                                                   | create / update               | delete                                                                      |
| ---------------------------------------------------- | ---------------------------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `ChildPolicy`, `ExaminationPolicy`, `FollowUpPolicy` | admin, atau pemilik anak, atau `canAccessPosyandu`               | `operator()` + posyandu cocok | ADMIN saja                                                                  |
| `EducationPolicy`                                    | publik bila `published`                                          | operator                      | ADMIN                                                                       |
| `IbuHamilPolicy`                                     | orang tua ditolak di `viewAny`; `view` hanya `parent_id` sendiri | operator                      | ADMIN                                                                       |
| `KaderPolicy`                                        | `viewAny` bukan orang tua                                        | ADMIN                         | ADMIN                                                                       |
| `ParentPolicy`                                       | kader via irisan posyandu anak; tanpa anak → ditolak             | operator                      | ADMIN                                                                       |
| `PosyanduPolicy`                                     | semua role terbaca                                               | ADMIN                         | ADMIN                                                                       |
| `SpecialCareEnrollmentPolicy`                        | sesuai scope anak                                                | confirm/reject = `operator()` | exit dibatasi `config('special_care.exit_authorized_role')` default `ADMIN` |

### Perlindungan data

- **PII masking** — `App\Support\HasPiiMasking` pada model yang menampilkan PII: role non-admin melihat nilai tersamar (`3201********0001`) di endpoint list; detail (`show`) dan ADMIN melihat nilai penuh sesuai izin.
- **Masked round-trip** — nilai ber-asterisk tidak boleh dikirim balik; frontend memakai `buildDirtyPayload()`; FormRequest mempertahankan nilai lama bila field PII tidak disertakan saat update.
- **Audit log** — dilarang mengirim `$request->all()` mentah ke `AuditLogService::log()`; service membersihkan key sensitif dan menyamarkan PII (`nik`, `nomor_kk`, `nomor_telepon`, `no_hp`) secara rekursif.
- **Export CSV/Excel** — seluruh baris melewati `CsvSanitizer::sanitizeValue()` / `sanitizeRow()` untuk mencegah formula injection (`=`, `+`, `-`, `@`, `\t`, `\r`), sambil mempertahankan nilai numerik asli.
- **Pencarian** — semua input pengguna yang masuk ke `ilike '%keyword%'` dibungkus `SqlHelper::escapeLike()`.
- **Frontend** — `VITE_*` hanya untuk konfigurasi publik (`VITE_API_BASE_URL`); tidak ada secret di frontend.
- **Eskalasi error** — pesan teknis backend disaring `apiErrorMessage()` / `extractBlobErrorMessage()`.

### Batas akses per role (frontend)

`shared/lib/rbac.ts`: 26 permission. `can(role, permission)` dan `canAny()`.

- `ADMIN`: seluruh permission.
- `KADER`: seluruh permission kecuali `manage-posyandu`, `manage-kader`, `manage-edukasi`, `manage-pengguna`, `view-audit-log`.
- `ORANG_TUA`: 7 permission view-only (data anak, pemeriksaan, imunisasi, tindak lanjut, jadwal, edukasi, pertumbuhan).

Sidebar (`Layout.tsx`) dan router (`app/App.tsx`) membaca sumber yang sama; halaman wajib memakai `can(role, permission)`, bukan pembandingan `user.role === '...'`.

### Isolasi test

`backend/phpunit.xml` wajib mempertahankan `<env name="DB_DATABASE" ...>` menuju `posyandu_digital_test`; tanpa itu `RefreshDatabase` menghapus database development. `tests/Feature/RoleAndScopeTest.php` mengunci aturan role dan cakupan data.
