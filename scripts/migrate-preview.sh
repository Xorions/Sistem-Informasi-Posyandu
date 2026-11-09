#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# Script Migrasi Aman Preview Environment - Posyandu Terpadu
# DILARANG MENGGUNAKAN migrate:fresh ATAU migrate:reset
# ==============================================================================

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
BACKEND_DIR="${ROOT_DIR}/backend"

echo "==> [PREVIEW MIGRATE] Memulai inisialisasi koneksi database preview..."

# 1. Prioritas sumber koneksi remote:
#    a. Argumen CLI ke-1 ($1)
#    b. Environment variable DB_URL / DATABASE_URL
#    c. File .env.preview (root atau backend)
REMOTE_CONN="${1:-${DB_URL:-${DATABASE_URL:-}}}"

if [ -z "$REMOTE_CONN" ]; then
    if [ -f "${ROOT_DIR}/.env.preview" ]; then
        echo "==> Membaca konfigurasi dari ${ROOT_DIR}/.env.preview..."
        REMOTE_CONN=$(grep -E '^(DB_URL|DATABASE_URL)=' "${ROOT_DIR}/.env.preview" | head -n 1 | cut -d '=' -f2- | tr -d '"'"'" || echo "")
    elif [ -f "${BACKEND_DIR}/.env.preview" ]; then
        echo "==> Membaca konfigurasi dari ${BACKEND_DIR}/.env.preview..."
        REMOTE_CONN=$(grep -E '^(DB_URL|DATABASE_URL)=' "${BACKEND_DIR}/.env.preview" | head -n 1 | cut -d '=' -f2- | tr -d '"'"'" || echo "")
    fi
fi

# 2. Jika koneksi remote belum diberikan, tolak agar tidak keliru memigrasi database lokal
if [ -z "$REMOTE_CONN" ]; then
    echo "=================================================================" >&2
    echo "FATAL ERROR: Connection string remote PostgreSQL belum disediakan!" >&2
    echo "Script ini wajib mengarah ke remote preview database, bukan database lokal." >&2
    echo "" >&2
    echo "Cara menjalankan:" >&2
    echo "  bash scripts/migrate-preview.sh \"<connection-string>\"" >&2
    echo "atau:" >&2
    echo "  DB_URL=\"<connection-string>\" bash scripts/migrate-preview.sh" >&2
    echo "atau simpan ke file .env.preview:" >&2
    echo "  DB_URL=\"<connection-string>\"" >&2
    echo "=================================================================" >&2
    exit 1
fi

# PgBouncer transaction pooler membatalkan transaksi DDL/migrasi.
# Gunakan direct connection (hapus suffix -pooler) untuk migrasi DDL jika ada.
REMOTE_CONN=$(echo "$REMOTE_CONN" | sed -E 's/(-pooler)(\.[^/?]+)/\2/')

export DB_URL="$REMOTE_CONN"
export DATABASE_URL="$REMOTE_CONN"
export DB_CONNECTION="pgsql"
export DB_SSLMODE="require"

# 3. Ekstrak nama database untuk validasi keamanan
TARGET_DB=$(echo "$REMOTE_CONN" | sed -E 's/.*\/\/([^:]+:[^@]+@)?[^\/]+\/([^?]+).*/\2/')
TARGET_HOST=$(echo "$REMOTE_CONN" | sed -E 's/.*@([^:\/?]+).*/\1/')

echo "==> Target host: '${TARGET_HOST}'"
echo "==> Target database: '${TARGET_DB}'"

# 4. Validasi anti-production
LOWER_DB=$(echo "$TARGET_DB" | tr '[:upper:]' '[:lower:]')
LOWER_HOST=$(echo "$TARGET_HOST" | tr '[:upper:]' '[:lower:]')
if [[ "$LOWER_DB" =~ (prod|production) ]] || [[ "$LOWER_HOST" =~ (prod|production) ]]; then
    echo "=================================================================" >&2
    echo "FATAL ERROR: Target database '${TARGET_DB}' pada '${TARGET_HOST}'" >&2
    echo "terdeteksi sebagai PRODUCTION! Operasi DIBATALKAN demi keamanan data." >&2
    echo "=================================================================" >&2
    exit 1
fi

# 5. Cegah eksekusi ke localhost/127.0.0.1
if [[ "$TARGET_HOST" =~ (127\.0\.0\.1|localhost) ]]; then
    echo "=================================================================" >&2
    echo "FATAL ERROR: Target host terdeteksi sebagai database lokal (${TARGET_HOST})!" >&2
    echo "Script migrate-preview wajib diarahkan ke remote preview database." >&2
    echo "=================================================================" >&2
    exit 1
fi

echo "==> Validasi keamanan database lolos. Database remote bukan production."

# 6. Eksekusi migrasi dan seeding di direktori backend
cd "${BACKEND_DIR}"

echo "==> Menjalankan migrasi database (php artisan migrate --force)..."
php artisan migrate --force

echo "==> Menjalankan seeding akun preview (PreviewDatabaseSeeder)..."
php artisan db:seed --class="Database\\Seeders\\PreviewDatabaseSeeder" --force

echo "==> [PREVIEW MIGRATE] Selesai. Database remote preview siap digunakan."
