# Frontend – Posyandu Digital (React 19)

> Feature-based, type-safe, mobile-first. Logic API terpisah di `shared/lib/api`.

## Stack
React 19, Vite 8, Tailwind 3, React Router 7, Axios, Recharts

## Struktur Profesional (baru)
```
src/
  app/
    App.tsx            # Router + Protected + RoleGuard (single source)
    routes.tsx         # ROUTES const
  features/
    auth/              # Login + AuthContext (token + posyandus)
    dashboard/         # Dashboard + filter Posyandu + Bar/LineChart
    children/          # List (search debounce, pagination), Form (create/edit), Detail (7 tabs)
    parents/           # Parents CRUD
    posyandu/          # Posyandu CRUD
    examinations/      # Form pemeriksaan BB/TB/PB/LK/LiLA (mobile-first)
    pertumbuhan/       # Grafik pertumbuhan per anak
    analisis/          # GrowthAnalysis + recommendations + history
    edukasi/           # Edukasi CRUD + public (slug, publish)
    immunizations/
    follow-ups/
    schedules/
    reports/           # Laporan + export CSV/Excel/PDF
    users/
    audit-logs/
  shared/
    components/
      layout/Layout.tsx  # Sidebar RBAC
      ui/ card, badge, modal, toast
    lib/
      api.ts           # axios bearer + 401 interceptor
      utils.ts         # formatDate, age, statusColor, cn
    hooks/useDebounce.ts
    types/index.ts     # User, Child, Posyandu, ApiResponse
  assets/
  main.tsx             # entry – import App from app/App
  index.css            # Tailwind base
```

Legacy `src/pages/*`, `src/lib/*`, `src/context/*`, `src/components/*` sekarang **re-export** ke `features/*` / `shared/*` biar backward compat tanpa duplikasi logic.

## Alias
`@/* → src/*` via `tsconfig.json` + `vite.config.ts` `resolve.alias`.

## Setup
```bash
npm install
npm run dev    # http://127.0.0.1:5173 (proxy /api → :8000)
npm run build  # dist/ → copy ke backend/public untuk 1-port demo
```

## Prinsip
- **No mock data** – semua dari API, dashboard query DB nyata
- **No localStorage DB** – cuma token & preferensi UI
- **Search debounce 500ms**, pagination 10/25/50/100, empty/loading/skeleton states
- **RBAC di UI + backend**: sidebar filter `roles`, `RoleGuard`, tapi validasi tetap di Policies
- **Responsive**: mobile-first untuk pemeriksaan, Tailwind cards/tables/modals

## Build Integration
`npm run build` → `backend/public/assets` + `backend/resources/views/app.blade.php` + `backend/routes/web.php` fallback → `ngrok http 8000` 1 URL.

## Testing
`npm run build` harus sukses (saat ini 679 modules, 801kB). Belum ada Jest – verifikasi manual via UI + API.

## Env
`VITE_API_URL` tidak perlu untuk dev (relative `/api`). Untuk preview production set `baseURL` di `shared/lib/api.ts`.
