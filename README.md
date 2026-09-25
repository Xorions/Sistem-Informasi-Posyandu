# POSYANDU DIGITAL

Aplikasi web **Posyandu Digital** untuk membantu kader & administrator mengelola pendataan anak, orang tua, multi-posyandu, pemeriksaan pertumbuhan (BB/TB/PB/LK/LiLA), analisis, edukasi, imunisasi, tindak lanjut, jadwal, dashboard & laporan.

Konsep: `DATA → PEMERIKSAAN → ANALISIS → EDUKASI → TINDAK LANJUT`

> Status: **Backend 95% done, Frontend baru selesai rebuild React** – siap development lanjutan.

---

## 1. Struktur Project

```
Project kapita selekta/
├── backend/   # Laravel 11 + Sanctum + PostgreSQL (MySQL compatible via config)
│   ├── app/
│   │   ├── Http/Controllers/Api   # 13 controller + Policies
│   │   ├── Models                 # 12 model + soft delete
│   │   ├── Services               # GrowthAnalysisService, NutritionRecommendationService, AuditLogService
│   │   └── Http/Requests          # FormRequest validation
│   ├── database/migrations       # 9 migration (posyandu, children, parents, examinations/growth_records, growth_standards, educations, immunizations/followups/schedules, audit_logs, users+role)
│   ├── database/seeders          # PosyanduSeeder, UserSeeder, EducationSeeder, ChildParentSeeder, ExaminationSeeder
│   └── routes/api.php            # REST API lengkap
└── frontend/  # React 19 + Vite 8 + Tailwind 3 + React Router 7 + Axios + Recharts
    ├── src/
    │   ├── lib/api.ts            # axios + bearer token interceptor
    │   ├── context/AuthContext.tsx
    │   ├── components/Layout.tsx  # Sidebar per spec 50 + RBAC menu
    │   ├── components/ui/         # Card, Badge, Modal, Toast, ConfirmDeleteModal
    │   └── pages/
    │       ├── Login.tsx
    │       ├── Dashboard.tsx      # filter Posyandu, BarChart + LineChart
    │       ├── children/List, Form, Detail (tabs Profil/Ortu/Pemeriksaan/Pertumbuhan/Analisis/Imunisasi/TindakLanjut)
    │       ├── Parents.tsx, Posyandu.tsx, Examinations.tsx (LiLA WAJIB), Edukasi.tsx, EdukasiPublic.tsx
    │       ├── Immunizations.tsx, FollowUps.tsx, Schedules.tsx, Reports.tsx (CSV/Excel/PDF), Users.tsx, AuditLogs.tsx
    └── vite.config.ts            # proxy /api → 8000
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
- Seeder: 3 Posyandu (Melati A/Mawar B/Anggrek C), 7 user, 8 edukasi, 10 anak, 5 ortu, 65 pemeriksaan + growth_records dengan LiLA.
- `growth_standards` siap untuk diisi standar resmi (abstraksi, bukan threshold medis sembarangan).

---

## 7. Demo Account

Semua password: `password123` (documented, jangan dipakai di production)

| Role | Email | Posyandu |
|------|-------|----------|
| SUPER_ADMIN | superadmin@example.test | semua |
| ADMIN_POSYANDU | admin@example.test | A+B+C |
| ADMIN_POSYANDU | admin.a@example.test | A |
| KADER | kader@example.test | A |
| KADER | kader.b@example.test | B |
| KADER | kader.c@example.test | C |
| ORANG_TUA | orangtua@example.test | A |

---

## 8. API Overview

Base: `/api`

**Auth:** `POST /login`, `POST /logout`, `GET /user`, `POST /forgot-password`, `POST /reset-password`<br>
**Dashboard:** `GET /dashboard?posyandu_id=`<br>
**Posyandu:** `apiResource posyandu` + `POST /posyandu/{id}/assign-user`<br>
**Children:** `apiResource children` + `GET /children/trashed`, `POST /children/{id}/restore`, `POST /children/{child}/parents`<br>
**Parents:** `apiResource parents`<br>
**Examinations:** `apiResource examinations` + `GET /children/{child}/examinations` + `GET /children/{child}/growth-chart`<br>
**Analysis:** `GET /children/{child}/analysis` + `/history` + `/{examinationId}` (via GrowthAnalysisService)<br>
**Education:** `GET /edukasi` (public), `GET /educations` (auth), CRUD + publish/unpublish, `GET /education-categories`<br>
**Immunizations/FollowUps/Schedules:** `apiResource` masing-masing<br>
**Reports:** `GET /reports/{anak|pemeriksaan|pertumbuhan|imunisasi|follow-up|statistik}?export=csv|excel|pdf`<br>
**Users/Audit:** `apiResource users`, `GET /audit-logs`

Semua response konsisten: `{success, message, data, meta, errors}`<br>
Error handling frontend menampilkan `Data tidak dapat dimuat. Silakan coba kembali.` tanpa stack trace.

---

## 9. Role & Permission (RBAC)

- `SUPER_ADMIN`, `ADMIN_POSYANDU`, `KADER`, `ORANG_TUA`
- Backend: Policies (`ChildPolicy`, `ExaminationPolicy`, `EducationPolicy`, `PosyanduPolicy`, `FollowUpPolicy`) + `EnsureRole` middleware + `user->canAccessPosyandu()`.
- Frontend: Sidebar menu difilter per role, `RoleGuard` untuk route terproteksi.
- **Data Isolation WAJIB** sudah dites: `kader A` tidak bisa `GET /children/{id}` milik posyandu B (403).

---

## 10. Fitur Utama yang Sudah Jadi

- [x] Auth Sanctum, RBAC, multi-posyandu, data isolation
- [x] Children CRUD (create/read/update/delete soft, restore, trashed, attachParent), validation, pagination 10/25/50/100, search debounce, Posyandu filter
- [x] Parents CRUD + pivot `child_parent` (Ayah/Ibu/Wali, is_primary_contact)
- [x] Examinations + `growth_records` (weight, height, length, head_circumference, **arm_circumference LiLA WAJIB**) dalam transaction
- [x] Riwayat pemeriksaan, Grafik Recharts (4 metric, switchable), GrowthAnalysisService + NutritionRecommendationService (label: Sesuai/Perlu Perhatian/Lebih Lanjut/Konsultasi – tanpa diagnosis)
- [x] `growth_standards` table abstraksi
- [x] Edukasi: kategori seed, CRUD, publish/unpublish, slug, sanitasi HTML, public route `/edukasi` & `/edukasi/{slug}`
- [x] Imunisasi, FollowUp (pending/in_progress/completed/cancelled), Schedule per-posyandu
- [x] Dashboard nyata (anak terdaftar, pemeriksaan bulan ini, follow-up pending, perlu pemantauan, chart 6 bulan, growth trend) + filter Posyandu
- [x] Laporan + export CSV/Excel/PDF (permission-aware)
- [x] AuditLog (CREATE/UPDATE/DELETE/LOGIN/LOGOUT/RESTORE, tanpa password)
- [x] Responsive mobile-first (pemeriksaan form), Tailwind cards/tables/modals/toast/skeleton/empty states, confirm modal, pagination
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

Backend Feature tests perlu dijalankan dengan DB testing (sudah ada `phpunit.xml`). Fokus per spec 63: isolation Posyandu A vs B.
```bash
cd backend; php artisan test
# atau: vendor/bin/phpunit --testsuite=Feature
```

Frontend belum ada test suite otomatis, verifikasi manual via UI.

Security checklist per spec 65 sudah diimplementasikan di Policies & audit.

---

## 13. Catatan Lanjutan / TODO jika mau dilanjutkan

- Frontend: tambah search debounce di Parents/Edukasi, test e2e, code splitting (saat ini chunk 788KB – bisa di-split).
- Backend: seed `growth_standards` dengan sumber resmi (Kemenkes/WHO) jika sudah dipilih pengelola.
- Tambah Notifikasi parent portal & advanced analytics (P2).
- Perbaiki README backend default (saat ini masih Laravel boilerplate) – sudah diganti di root README ini.

---

## 14. Lisensi

MIT (Laravel). Data dummy, jangan gunakan data pribadi nyata.
