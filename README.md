# POSYANDU TERPADU

Aplikasi web **Posyandu Terpadu** untuk membantu kader & administrator mengelola pendataan anak, orang tua, kader, empat posyandu, pemeriksaan pertumbuhan (BB/TB/PB/LK/LiLA), analisis, edukasi, imunisasi dan vitamin, ibu hamil, tindak lanjut, jadwal, dashboard & laporan.

Konsep: `DATA -> PEMERIKSAAN -> ANALISIS -> EDUKASI -> TINDAK LANJUT`

> Role: `ADMIN`, `KADER`, `ORANG_TUA`. Akun orang tua hanya dapat melihat data anaknya sendiri.

---

## 1. Struktur Project

```
Project kapita selekta/
  backend/                    # Laravel 11 + Sanctum + PostgreSQL
    app/
      Http/Controllers/Api/    # controller per modul + Policy di app/Policies
      Http/Resources/          # JsonResource untuk tiap entitas
      Http/Requests/           # FormRequest validation
      Models/                  # User, Posyandu, Kader, Child, ParentModel, IbuHamil, ...
      Policies/                # ChildPolicy, KaderPolicy, IbuHamilPolicy, ...
      Services/                # GrowthAnalysis, NutritionRecommendation, AuditLog
    database/migrations/       #users+role, posyandu, children, parents, growth, education,
                                # immunization, audit, konsolidasi-role, kader, KIA
    database/seeders/          # Posyandu, User, Kader, Education, ChildParent, OrangTua,
                                # IbuHamil, Examination
    routes/api.php             # REST API lengkap
  frontend/                    # React 19 + Vite 8 + Tailwind 3 + React Router 7 + Recharts
    src/
      app/                     # App.tsx (rute + penjaga izin), routes.tsx (daftar path)
      features/<modul>/pages/  # Login, Dashboard, children, bumil, kader, immunizations, ...
      shared/
        lib/                   # api.ts (endpoint per modul), config.ts, rbac.ts, utils.ts
        types/                 # bentuk JSON sesuai kolom database
        components/            # Layout (sidebar RBAC) + ui/ (Card, Badge, Modal, Toast, Field)
    vite.config.ts             # proxy /api ke 8000
```

---

## 2. Tech Stack

**Backend:** PHP 8.3, Laravel 11, Sanctum, PostgreSQL 18 (ganti ke MySQL tinggal ubah .env), DomPDF + Maatwebsite Excel, Intervention Image<br>
**Frontend:** React 19, Vite 8, Tailwind CSS 3, React Router 7, Axios 1.20, Recharts 3.10<br>
**Dev:** Migrations, Seeders, FormRequest, API Resources, Policies, Service Layer

---

## 3. Requirement

- PHP 8.2+, Composer, Node 22+, PostgreSQL (atau MySQL), Git

---

## 4. Installation

### Backend
```bash
cd backend
composer install
copy .env.example .env   # sesuaikan DB_CONNECTION=pgsql (atau mysql)
# edit .env: DB_DATABASE=posyandu_digital, DB_USERNAME=postgres, DB_PASSWORD=
php artisan key:generate
php artisan migrate --seed   # sudah ada migration + seeder lengkap
php artisan serve --host=127.0.0.1 --port=8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev    # http://127.0.0.1:5173  (proxy /api → :8000)
npm run build  # production build → dist/
```

---

## 5. Environment

`.env.example` backend (sudah ada `SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173` + `FRONTEND_URL`):

```env
APP_NAME=PosyanduDigital
APP_ENV=local
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=posyandu_digital
DB_USERNAME=postgres
DB_PASSWORD=

SANCTUM_STATEFUL_DOMAINS=localhost:5173,127.0.0.1:5173
FRONTEND_URL=http://localhost:5173
```

Jangan commit `.env` asli.

---

## 6. Database Setup

- Migrations sudah include indexing per spec 59, softDeletes, transaction.
- Seeder menghasilkan:

| Posyandu | Jumlah anak |
|----------|-------------|
| PSY001 Cut Nyak Dien | 14 |
| PSY002 Kartika | 15 |
| PSY003 Kartini | 17 |
| PSY004 Raden Intan | 15 |
| **Total** | **61** |

  Anak dikelompokkan dalam keluarga dua bersaudara di posyandu yang sama, dengan 64 orang tua/wali.
  Dilengkapi 8 kader, 8 artikel edukasi, 4 ibu hamil beserta 12 hasil pemeriksaan,
  348 catatan vaksin, 92 catatan vitamin, 8 jadwal kegiatan, dan 177 pemeriksaan
  dengan `growth_records` yang selalu mengisi LiLA.
- `growth_standards` siap untuk diisi standar resmi (abstraksi, bukan threshold medis sembarangan).

---

## 7. Demo Account

Semua password: `password123` (documented, jangan dipakai di production)

| Role | Email | Posyandu |
|------|-------|----------|
| ADMIN | admin@example.test | keempat posyandu |
| ADMIN | admin.cutnyakdien@example.test | Cut Nyak Dien |
| KADER | kader@example.test | Cut Nyak Dien |
| KADER | kader.kartika@example.test | Kartika |
| KADER | kader.kartini@example.test | Kartini |
| KADER | kader.radenintan@example.test | Raden Intan |
| ORANG_TUA | orangtua@example.test | posyandu anaknya sendiri |

> Akun orang tua tertaut ke satu profil orang tua (`users.parent_id`) dan hanya melihat anaknya sendiri.

## 8. API Overview

Base: `/api`

**Auth:** `POST /login`, `POST /logout`, `GET /user`, `POST /forgot-password`, `POST /reset-password`<br>
**Dashboard:** `GET /dashboard?posyandu_id=`<br>
**Posyandu:** `apiResource posyandu` + `POST /posyandu/{id}/assign-user`<br>
**Kader:** `apiResource kader`<br>
**Children:** `apiResource children` + `GET /children/trashed`, `POST /children/{id}/restore`, `POST /children/{child}/parents`<br>
**Parents:** `apiResource parents`<br>
**Examinations:** `apiResource examinations` + `GET /children/{child}/examinations` + `GET /children/{child}/growth-chart`<br>
**Analysis:** `GET /children/{child}/analysis` + `/history` + `/{examinationId}` (via GrowthAnalysisService)<br>
**Imunisasi & Vitamin:** `apiResource immunizations`, difilter `?jenis=VAKSIN|VITAMIN`<br>
**FollowUps/Schedules:** `apiResource` masing-masing<br>
**Ibu Hamil (KIA):** `apiResource ibu-hamil` + `GET /ibu-hamil/{id}/pemeriksaan` + `apiResource pemeriksaan-bumil`<br>
**Education:** `GET /edukasi` (public), `GET /educations` (auth), CRUD + publish/unpublish, `GET /education-categories`<br>
**Reports:** `GET /reports/{anak|pemeriksaan|pertumbuhan|imunisasi|follow-up|bumil|statistik}?export=csv|excel|pdf`<br>
**Users/Audit:** `apiResource users`, `GET /audit-logs`

Semua response konsisten: `{success, message, data, meta, errors}`<br>
Error handling frontend menampilkan `Data tidak dapat dimuat. Silakan coba kembali.` tanpa stack trace.

---

## 9. Role & Permission (RBAC)

- Tiga role: `ADMIN`, `KADER`, `ORANG_TUA` (enum `App\Enums\Role`, kolom `users.role`).
- Backend: Policies (`ChildPolicy`, `ExaminationPolicy`, `EducationPolicy`, `PosyanduPolicy`, `FollowUpPolicy`, `KaderPolicy`, `IbuHamilPolicy`, `PemeriksaanBumilPolicy`) + query scope `forUser()` + `user->canAccessPosyandu()`.
- Frontend: `shared/lib/rbac.ts` sebagai daftar izin, dipakai sidebar (`Layout`) dan penjaga rute (`RequirePermission` di `app/App.tsx`).
- **Data Isolation** ditegakkan di lapisan query, bukan hanya UI: `kader A` tidak bisa `GET /children/{id}` milik posyandu B (403), dan `orang tua` tidak bisa melihat anak milik orang lain meskipun satu posyandu (403).

---

## 10. Fitur Utama yang Sudah Jadi

- [x] Auth Sanctum, RBAC 3 role (`ADMIN`, `KADER`, `ORANG_TUA`), empat posyandu, data isolation
- [x] **Akun orang tua hanya melihat anaknya sendiri** ditegakkan di query (`Child::forUser()`) + `ChildPolicy::view()` + `users.parent_id`
- [x] **Data Kader**: tabel `kader` (NIK, no HP, jabatan, pendidikan, tanggal mulai tugas) tertaut ke posyandu dan opsional ke akun login
- [x] **Imunisasi & Vitamin**: satu tabel dengan kolom `jenis` (VAKSIN/VITAMIN) + `batch`, filter di UI dan API
- [x] **KIA Ibu Hamil**: tabel `ibu_hamil` (HPHT, HPL, trimester, tinggi fundus) + `pemeriksaan_bumil` (tensi, LILA, denyut jantung janin), usia kehamilan dihitung dari HPHT
- [x] Empat posyandu: Cut Nyak Dien, Kartika, Kartini, Raden Intan
- [x] Children CRUD (create/read/update/delete soft, restore, trashed, attachParent), validation, pagination 10/25/50/100, search debounce, Posyandu filter
- [x] Parents CRUD + pivot `child_parent` (Ayah/Ibu/Wali, is_primary_contact)
- [x] Examinations + `growth_records` (weight, height, length, head_circumference, **arm_circumference LiLA WAJIB**) dalam transaction
- [x] Riwayat pemeriksaan, Grafik Recharts (4 metric, switchable), GrowthAnalysisService + NutritionRecommendationService (label: Sesuai/Perlu Perhatian/Lebih Lanjut/Konsultasi - tanpa diagnosis)
- [x] `growth_standards` table abstraksi
- [x] Edukasi: kategori seed, CRUD, publish/unpublish, slug, sanitasi HTML, public route `/edukasi` & `/edukasi/{slug}`
- [x] FollowUp (pending/in_progress/completed/cancelled), Schedule per-posyandu
- [x] Dashboard nyata + Dashboard terpisah untuk orang tua, filter Posyandu
- [x] Laporan + export CSV/Excel/PDF (permission-aware), termasuk laporan ibu hamil
- [x] AuditLog (CREATE/UPDATE/DELETE/LOGIN/LOGOUT/RESTORE, tanpa password)
- [x] Sidebar RBAC dari `shared/lib/rbac.ts`, penjaga rute berbasis izin, komponen `Field/Input/Select/Button/EmptyState`
- [x] Security: validation, file upload validation, XSS sanitasi, password hash, SoftDeletes

---

## 11. Cara Menjalankan Development

```bash
# Terminal 1
cd backend; php artisan serve --host=127.0.0.1 --port=8000

# Terminal 2
cd frontend; npm run dev
# Buka http://127.0.0.1:5173
# Login dengan akun demo di atas
```

Build production:
```bash
cd frontend; npm run build
cd backend; php artisan config:cache; php artisan route:cache
```

---

## 12. Testing

`tests/Feature/RoleAndScopeTest.php` mengunci aturan yang diminta:
jumlah role, isolasi posyandu untuk kader, pembatasan anak milik orang tua,
hak tulis orang tua, modul kader/KIA, dan pemisahan vaksin vs vitamin.

```bash
cd backend; php artisan test
# atau: vendor/bin/phpunit --testsuite=Feature
```

Frontend belum ada test suite otomatis, verifikasi manual via UI.

Security checklist per spec 65 sudah diimplementasikan di Policies & audit.

---

## 13. Catatan Lanjutan

- Backend masih memakai `ilike` dan `to_char()` sehingga khusus PostgreSQL. Perlu penyesuaian bila harus jalan di MySQL.
- Seed `growth_standards` dengan sumber resmi (Kemenkes/WHO) sesuai catatan di ExaminationSeeder.
- Halaman lama (Analisis, children/Detail, children/Form, Reports, AuditLogs, FollowUps, Examinations, Parents, Posyandu, Pertumbuhan) masih memanggil `api.get/post` langsung, belum lewat endpoint bertipe di `shared/lib/api.ts`.
- Frontend: code splitting (bundle sekarang sekitar 850KB), notifikasi orang tua, advanced analytics.

---

> Catatan untuk pengelola project dan assistant AI: lihat [AGENTS.md](AGENTS.md).
> Isinya berisi aturan arsitektur, jebakan yang pernah kejadian, dan daftar perbaikan yang sengaja ditunda.

## 14. Lisensi

MIT (Laravel). Data dummy, jangan gunakan data pribadi nyata.
