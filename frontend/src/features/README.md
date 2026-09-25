# Features

Tiap feature punya `pages/` (dan bisa tambah `components/`, `hooks/` jika perlu). Ini biar domain terisolasi, gak campur.

- `auth` – Login, AuthContext (token + user + posyandus)
- `dashboard` – stats + charts
- `children` – List/Form/Detail (7 tabs)
- `parents` – CRUD
- `posyandu` – CRUD
- `examinations` – input BB/TB/PB/LK/LiLA
- `pertumbuhan` – grafik
- `analisis` – GrowthAnalysis
- `edukasi` – CRUD + public
- `immunizations`, `follow-ups`, `schedules`, `reports`, `users`, `audit-logs`

Legacy `src/pages/*` sekarang re-export ke sini, jadi kedua path work tanpa duplikasi logic.
