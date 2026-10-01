# Frontend - Posyandu Terpadu (React 19)

> Feature-based, type-safe, mobile-first. Seluruh panggilan API terkumpul di
> `shared/lib/api.ts` dan penentuan akses di `shared/lib/rbac.ts`.

## Stack

React 19, Vite 8, Tailwind 3, React Router 7, Axios, Recharts

## Struktur

```
src/
  app/
    App.tsx            # BrowserRouter + Protected + RequirePermission
    routes.tsx         # ROUTES: satu-satunya sumber path
  features/
    auth/              # Login + AuthContext (token, user, role, posyandus, parent, kader)
    dashboard/         # Dashboard operator + Dashboard khusus orang tua
    children/          # List (search debounce, pagination), Form, Detail (7 tab)
    parents/           # CRUD orang tua/wali
    posyandu/          # CRUD posyandu
    kader/             # CRUD kader/petugas (filter posyandu, tautan akun login)
    examinations/      # Form pemeriksaan BB/TB/PB/LK/LiLA (mobile-first)
    pertumbuhan/       # Grafik pertumbuhan per anak
    analisis/          # Hasil GrowthAnalysis + rekomendasi + riwayat
    edukasi/           # CRUD + halaman publik (slug, publish)
    immunizations/     # Imunisasi & Vitamin, filter jenis
    bumil/             # Ibu Hamil, detail + riwayat pemeriksaan, rekap Pemeriksaan Bumil
    follow-ups/
    schedules/
    reports/           # Laporan + export CSV/Excel/PDF
    users/             # Manajemen akun, tautan profil untuk role ORANG_TUA
    audit-logs/
  shared/
    components/
      layout/Layout.tsx  # Sidebar dari NAV_SECTIONS + can()
      ui/                # card, badge, modal, toast, field (Input/Select/Button/EmptyState/...)
    lib/
      api.ts           # axios bearer + 401 interceptor + endpoint per modul bertipe
      config.ts        # APP_NAME, API_BASE_URL, TOKEN_KEY, USER_KEY, akun demo
      rbac.ts          # Permission + ROLE_PERMISSIONS + can()
      utils.ts         # cn, formatDate, statusColor
    hooks/useDebounce.ts
    types/index.ts     # bentuk JSON sesuai kolom database
  main.tsx             # entry, mount ./app/App
  index.css            # Tailwind base
```

Folder lama `src/pages`, `src/lib`, `src/context`, `src/components`, dan `src/App.tsx`
sudah dihapus; semua import memakai `@/features/*` dan `@/shared/*`.

## Alias

`@/* -> src/*` lewat `tsconfig.json` dan `resolve.alias` di `vite.config.ts`.

## Setup

```bash
npm install
npm run dev    # http://127.0.0.1:5173 (proxy /api ke :8000)
npm run build  # menghasilkan dist/, bisa disalin ke backend/public untuk demo 1 port
```

## Prinsip

- **Tanpa mock data** - semua dari API.
- **Tanpa basis data di localStorage** - hanya token dan data user.
- **Single source untuk path dan izin** - `app/routes.tsx` dan `shared/lib/rbac.ts`.
- **Tipe mengikuti backend** - `shared/types/index.ts` memakai nama kolom asli.
- **Akses divalidasi berlapis** - UI menyembunyikan menu, tetapi penolakan sebenarnya
  berasal dari backend (query scope + Policy).
- **Search debounce 400-500ms**, pagination, serta state loading/empty/error.

## Build Integration

`npm run build` -> salin `dist/` ke `backend/public`, dilayani oleh
`backend/resources/views/app.blade.php` dengan fallback SPA di `backend/routes/web.php`.

## Testing

`npm run build` harus sukses (menjalankan `tsc` lebih dulu). Belum ada Jest -
verifikasi manual lewat UI dan API.

## Env

Tidak perlu env untuk development karena memakai path relatif `/api`.
Opsional: `VITE_API_BASE_URL` dan `VITE_APP_NAME`, dibaca di `shared/lib/config.ts`.