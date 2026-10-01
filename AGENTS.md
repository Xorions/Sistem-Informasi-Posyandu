# AGENTS.md

Catatan untuk AI assistant (dan untuk manusia yang lain) yang mengerjakan project ini.
Baca file ini dulu sebelumNg|ReZero ngoprek kode.

## Apa ini

Aplikasi web **Posyandu Terpadu** untuk managesdata anak, orang tua, kader, dan
ibu hamil di empat posyandu: **Cut Nyak Dien, Kartika, Kartini, Raden Intan**.

Alur data utama:

```
DATA -> PEMERIKSAAN -> ANALISIS -> EDUKASI -> TINDAK LANJUT
KIA (IbuHamil + PemeriksaanBumil) berjalan berdampingan
```

## Menjalankan

```powershell
# satu perintah, menyalakan backend + frontend sekaligus
cd frontend; npm run dev

# backend saja  -> http://127.0.0.1:8000
cd backend; php artisan serve --host=127.0.0.1 --port=8000

# frontend saja -> http://localhost:5173   (WAJIB localhost, bukan 127.0.0.1)
cd frontend; npm run dev:web

# isi ulang data demo
cd backend; php artisan migrate:fresh --seed

# build produksi lalu salin ke backend/public
cd frontend; npm run build:prod
```

Akun demo, password semuanya `password123`:

| Role | Email |
|------|-------|
| ADMIN | `admin@example.test` |
| ADMIN | `admin.cutnyakdien@example.test` |
| KADER | `kader@example.test` |
| KADER | `kader.kartika@example.test` |
| KADER | `kader.kartini@example.test` |
| KADER | `kader.radenintan@example.test` |
| ORANG_TUA | `orangtua@example.test` |

Jumlah anak hasil seeding: 14 / 15 / 17 / 15 = **61 anak** di keempat posyandu.

## Stack

- **Backend:** PHP 8.3, Laravel 11, Sanctum, PostgreSQL 18, DomPDF, Maatwebsite Excel
- **Frontend:** React 19, Vite 8, Tailwind 3, React Router 7, Axios, Recharts
- **Testing:** PHPUnit + feature test Laravel (belum ada test frontend)

## Aturan arsitektur yang WAJIB dijaga

### 1. Tiga role saja

`ADMIN`, `KADER`, `ORANG_TUA`. Enum ada di `backend/app/Enums/Role.php`, kolomnya
`users.role`. Role lama `SUPER_ADMIN` dan `ADMIN_POSYANDU` sudah dihapus.

Jangan menambah role baru tanpa mengubah: enum, migration `users.role`, seluruh
Policy, `rbac.ts`, dan test.

### 2. Orang tua hanya melihat anaknya sendiri

Ini aturan inti yang paling sering dilanggar. Penegakannya di **tiga lapis**, dan
layer pertama yang paling penting karena tidak bisa dilewati dari UI:

1. **Query scope** - `Model::forUser($user)` pada `Child`, `Examination`, `FollowUp`,
   `Immunization`, `IbuHamil`, `PemeriksaanBumil`, `Kader`, `ParentModel`.
   Selalu panggil di awal method `index()`.
2. **Policy** - `ChildPolicy`, `ExaminationPolicy`, `IbuHamilPolicy`, dan lainnya
   menolak akses per-objek.
3. **FormRequest** - `authorize()` mengembalikan `! $this->user()?->isOrangTua()`
   untuk setiap request tulis.

Pengaitnya adalah kolom **`users.parent_id`**. Tanpa itu tidak ada cara tahu anak
mana yang milik sebuah akun orang tua.

> Kalau menambah modul baru, jangan lupa: `scopeForUser()`, Policy, daniel
> `authorize()` di FormRequest-nya.

### 3. Nama tabel tunggal + `protected $table`

Nama tabel di project ini **tunggal** dan tidak mengikuti konvensi plural Eloquent.
Model yang terkait harus menyebutkannya eksplisit:

```php
protected $table = 'kader';           // bukan 'kaders'
protected $table = 'ibu_hamil';
protected $table = 'pemeriksaan_bumil';
protected $table = 'posyandu';
```

Lupa ini akan menghasilkan `relation "kaders" does not exist` saat seeding.

### 4. SQL Postgres, bukan MySQL

`ilike` dan `to_char()` dipakai di banyak controller. jangan menulis `LIKE` /
`DATE_FORMAT` — database project ini PostgreSQL.

### 5. Mengubah kolom `enum` di Postgres

Laravel mengompilasi `enum()` menjadi `varchar + CHECK constraint`, dan
`Illuminate` **tidak mendukung** penambahan CHECK saat `change()` di PostgreSQL.
Harus pakai SQL langsung. Contoh lengkap ada di
`database/migrations/2026_10_01_100000_consolidate_role_to_three.php`.

### 6. Satu sumber kebenaran di frontend

Jangan tulis path atau daftar role secara manual.

| Kebutuhan | Sumber tunggal |
|-----------|----------------|
| Path rute | `frontend/src/app/routes.tsx` (`ROUTES`) |
| Izin akses | `frontend/src/shared/lib/rbac.ts` (`can(role, permission)`) |
| Env / kunci localStorage | `frontend/src/shared/lib/config.ts` (`CONFIG`) |
| Bentuk data | `frontend/src/shared/types/index.ts` |

Sidebar (`Layout.tsx`) dan router (`app/App.tsx`) sama-sama pakai `rbac.ts`.
Halaman baru wajib pakai `can(role, permission)`, bukan `user.role === '...'`.

### 7. Nama field mengikuti database

`shared/types/index.ts` memakai nama kolom asli (`nama_lengkap`, `posyandu_id`,
`vaccine_name`, `tanggal_periksa`), bukan istilah lokal. Kalau ada perubahan
kolom di backend, update file ini di waktu yang sama.

## Jebakan yang sudah pernah kejadian

**1. `php artisan test` menghapus data development.**
`backend/phpunit.xml` harus diarahkan ke database `posyandu_digital_test`.
Kalau baris `<env name="DB_DATABASE" .../>` di-comment atau dihapus, test akan
menjalankan `RefreshDatabase` terhadap database dev dan menghapus seluruh isinya.
Sudah pernah kejadian sekali - jangan dibalik.

**2. Dua port, dua aplikasi berbeda.**
- `localhost:5173` (Vite dev) selalu kode terbaru.
- `127.0.0.1:8000` (Laravel) menyajikan `backend/public/assets` + `app.blade.php`.

Karena nama berkas hasil build mengandung hash, `app.blade.php` harus selalu
diperbarui setiap kali build. Jalankan **`npm run build:prod`** (bukan `npm run
build`), karena perintah itu memanggil `scripts/sync-public.mjs` yang menyalin
`dist` ke `backend/public` dan menulis ulang referensi hash di blade.

Kalau `:8000` menampilkan tampilan lama sementara `:5173` benar, hampir pasti
build produksi yang belum di-sync.

**3. Folder project sudah dipindah ke root.**
Historically project berada di `Posyandu Terpadu/`, sekarang isinya langsung di
root repository (`backend/`, `frontend/`, `docs/`). Jangan cari path lama.

## Test

```bash
cd backend; php artisan test
```

`tests/Feature/RoleAndScopeTest.php` mengunci aturan role dan cakupan data.
**Wajib dijalankan setiap kali menyentuh Policy, scope `forUser()`, atau validasi
role.** Test ini yang menangkap regresi "orang tua bisa lihat anak orang lain".

Verifikasi tambahan yang berguna sebelum menyatakan selesai: panggil setiap
endpoint yang dipakai tiap halaman untuk ketiga role, dan pastikan yang 403
memang hanya yang aturan RBAC-nya.

---

# Backlog / Saran perbaikan

Daftar di bawah ini **sengaja tidak dikerjakan** - semua fiturnya sudah berjalan
dengan benar dan terverifikasi. Ini murni item yang bisa dikerjakan kalau nanti
waktu longgar. Tidak perlu dijelaskan ulang dari awal; cukup cek daftar ini.

## Prioritas rendah - Rapikan kode

### 1. Halaman lama masih pakai `api.get` langsung dengan `any`

**Ini saran yang paling sering aku ingatin.** Halaman-halaman ini masih
menulis pemanggilan axios mentah dan menyimpan state bertipe `any`:

| Halaman | Masalah |
|---------|---------|
| `features/pertumbuhan/pages/Pertumbuhan.tsx` | 4 `useState<any>`, 3 panggilan `api.get` |
| `features/children/pages/List.tsx` | masih `any` |
| `features/children/pages/Form.tsx` | masih `any` |
| `features/children/pages/Detail.tsx` | masih `any` |
| `features/analisis/pages/Analisis.tsx` | masih `any` |
| `features/reports/pages/Reports.tsx` | masih `any` |
| `features/examinations/pages/Examinations.tsx` | masih `any` |
| `features/follow-ups/pages/FollowUps.tsx` | masih `any` |
| `features/parents/pages/Parents.tsx` | masih `any` |
| `features/posyandu/pages/Posyandu.tsx` | masih `any` |
| `features/audit-logs/pages/AuditLogs.tsx` | masih `any` |

Halaman yang **sudah** rapi (pola yang harus ditirukan): `features/kader/`,
`features/bumil/`, `features/immunizations/`, `features/schedules/`,
`features/users/`, `features/edukasi/`, `features/dashboard/`,
`features/auth/`.

Cara membetulkan: ganti `useState<any[]>` dengan tipe dari `shared/types`,
lalu ganti `api.get('/path')` dengan helper bertipe di `shared/lib/api.ts`
(`apiChildren.list()`, `apiReports.get()`, dan seterusnya).

**Kenapa ini penting dan bukan sekadar estetika:** `any` mematikan pemeriksaan
tipe, sehingga salah ketik nama kolom tidak akan ketahuan saat `npm run build`.
Beberapa halaman lama juga masih memakai pola
`r.data.data?.data || r.data.data || []` untuk membaca amplop respons - kalau
backend mengubah bentuk respons, halamannya **diam-diam jadi kosong tanpa pesan
error**. Semua halaman ini sekarang sudah diverifikasi berfungsi, jadi ini murni
pemeliharaan, bukan perbaikan bug.

### 2. `Reports.tsx` masih menampilkan `JSON.stringify`

Hasil laporan dirender sebagai teks JSON mentah di dalam `<pre>`, bukan tabel.
Layak diganti jadi tabel yang bisa dibaca manusia.

### 3. Duplikasi komponen form

Beberapa halaman lama masih menulis `<input className="px-3 py-2.5 rounded-xl
border border-slate-200">` manual, sementara `shared/components/ui/field.tsx`
sudah menyediakan `Input`, `Select`, `Textarea`, `Button`, `EmptyState`.
Halaman baru memakai komponen bersama itu.

### 4. `frontend/dist` ikut ter-commit

Build produksi tidak perlu ada di repo; `backend/public/assets` yang dipakai
Laravel. Pertimbangkan menghapusnya dari version control.

## Prioritas lebih rendah - Fitur

### 5. Seed `growth_standards` dengan standar resmi

Tabel `growth_standards` masih diisi median pendekatan internal, dan kolom
`source`-nya menulis "ganti dengan standar resmi". Should dipakai dataKemenkes
atau WHO sebelum dipakai untuk keputusan klinis. Perhatikan: `GrowthAnalysisService`
memakai абсолют deviasi terhadap nilai referensi, jadi referensi yang tidak
akurat akan menghasilkan label keliru.

### 6. Notifikasi orang tua

Orang tua baru bisa melihat data secara pasif. Belum ada pengingat jadwal
posyandu maupunengingat imunisasi yang akan jatuh tempo.

### 7. Code splitting

Bundle produksi sekitar **850 KB** (240 KB gzip), sebagian besar dari Recharts.
Bisa diperkecil dengan `React.lazy` per rute.

### 8. Test frontend

Belum ada test suite otomatis (Jest/Playwright). Saat ini verifikasi frontend
harus manual lewat browser.

### 9. Export PDF tanpa view khusus

`ReportController::exportPdf()` selalu memakai view `reports.generic`, bukan
layout PDF per jenis laporan.

## Tidak dikerjakan dan disengaja

- **Backend ditulis khusus PostgreSQL.** Kalau nanti harus jalan di MySQL,
  `ilike` dan `to_char()` di beberapa controller harus diganti.
- **`Posyandu Terpadu - Copy/`** adalah backup lokal lama, sengaja tidak masuk
  repo dan sudah masuk `.gitignore`. Jangan dihapus tanpa pastikan dulu.
