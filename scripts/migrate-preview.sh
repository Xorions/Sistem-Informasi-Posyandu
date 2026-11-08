#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Migrasi Aman Preview Environment - Posyandu Terpadu
# DILARANG MENGGUNAKAN migrate:fresh ATAU migrate:reset
# ==============================================================================

echo "==> [PREVIEW MIGRATE] Memulai validasi target database..."

# Resolve database name from DB_DATABASE or DB_URL / DATABASE_URL
TARGET_DB="${DB_DATABASE:-}"
if [ -z "$TARGET_DB" ]; then
    DB_CONN_URL="${DATABASE_URL:-${DB_URL:-}}"
    if [ -n "$DB_CONN_URL" ]; then
        # Parse db name from postgres url: postgres://user:pass@host:port/dbname?sslmode=...
        TARGET_DB=$(echo "$DB_CONN_URL" | sed -E 's/.*\/\/([^:]+:[^@]+@)?[^\/]+\/([^?]+).*/\2/')
    fi
fi

# Fallback check via php artisan if still empty
if [ -z "$TARGET_DB" ]; then
    TARGET_DB=$(php -r "require __DIR__ . '/../backend/vendor/autoload.php'; \$app = require_once __DIR__ . '/../backend/bootstrap/app.php'; \$kernel = \$app->make(Illuminate\Contracts\Console\Kernel::class); \$kernel->bootstrap(); echo config('database.connections.pgsql.database');" 2>/dev/null || echo "")
fi

echo "==> Target database: '${TARGET_DB}'"

# Safety check: Reject any database containing 'prod' or 'production'
LOWER_DB=$(echo "$TARGET_DB" | tr '[:upper:]' '[:lower:]')
if [[ "$LOWER_DB" =~ (prod|production) ]]; then
    echo "=================================================================" >&2
    echo "FATAL ERROR: Target database '${TARGET_DB}' terdeteksi sebagai PRODUCTION!" >&2
    echo "Operasi migrasi preview DIBATALKAN untuk mencegah kerusakan data." >&2
    echo "=================================================================" >&2
    exit 1
fi

echo "==> Validasi keamanan database lolos. Database bukan production."

# Change directory to backend
cd "$(dirname "$0")/../backend"

echo "==> Menjalankan migrasi database aman (php artisan migrate --force)..."
php artisan migrate --force

echo "==> Menjalankan seeding akun preview (hanya jika data admin belum ada)..."
php artisan db:seed --class="Database\\Seeders\\PreviewDatabaseSeeder" --force

echo "==> [PREVIEW MIGRATE] Migrasi dan inisialisasi preview selesai dengan aman."
