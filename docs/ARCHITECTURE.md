# Architecture – Posyandu Digital

```
React (Vite, Tailwind, Recharts)
  ↓ REST API (axios bearer)
Laravel 11 (Sanctum, Policies, Services)
  ↓ Eloquent
PostgreSQL (MySQL compatible)
```

## Backend Layers
```
Controller (tipis)
  ↓
FormRequest (validation)
  ↓
Service (GrowthAnalysisService, NutritionRecommendationService, AuditLogService)
  ↓
Model (relations, casts, scopes)
  ↓
DB (migrations indexed, transactions, softDeletes)
```

## Frontend Layers
```
App (BrowserRouter + Providers)
  ↓
Layout (Sidebar RBAC)
  ↓
Features (per-domain pages)
  ↓
Shared (ui, lib/api, hooks, types)
```

## Multi-Posyandu
`posyandu` + `user_posyandu` pivot. `User::posyanduIds()` + `canAccessPosyandu()` dipakai di tiap Controller + Policy untuk isolation.

## Data Flow Posyandu
```
DATA (Child + Parent)
  ↓
PEMERIKSAAN (Examination + GrowthRecord: weight/height/length/head/arm LiLA)
  ↓
ANALISIS (GrowthAnalysisService → label, growth_standards)
  ↓
EDUKASI (Education, publish)
  ↓
TINDAK LANJUT (FollowUp, Immunization, Schedule)
  ↓
DASHBOARD & LAPORAN (aggregation per posyandu)
```

## Deployment
- Dev: `backend:8000` + `frontend:5173` (vite proxy)
- Prod demo: `frontend/dist` → `backend/public` + `resources/views/app.blade.php` + `routes/web.php` fallback → single `php artisan serve :8000` → `ngrok http 8000`

## Security
- Sanctum token, Hash password, Policies, Gates, audit log, no password in response, sanitasi HTML, file validation, transaction, softDelete.

## Docs
- `backend/README.md` – API & setup
- `frontend/README.md` – feature structure
- Root `README.md` – overview & demo accounts
