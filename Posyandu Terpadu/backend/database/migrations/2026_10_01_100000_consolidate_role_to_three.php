<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Konsolidasi role menjadi 3: ADMIN, KADER, ORANG_TUA.
 *
 * Role lama SUPER_ADMIN dan ADMIN_POSYANDU digabung menjadi ADMIN karena
 * keduanya memiliki cakupan akses yang sama di seluruh aplikasi.
 *
 * Catatan PostgreSQL: Laravel meng-compile enum() menjadi varchar + CHECK
 * constraint bernama {table}_{column}_check, dan Illuminate tidak mendukung
 * penambahan CHECK constraint saat melakukan change() pada kolom enum di
 * PostgreSQL. Karena itu kolom ini ditangani lewat SQL langsung.
 */
return new class extends Migration
{
    private const ROLES = "('ADMIN', 'KADER', 'ORANG_TUA')";

    private const LEGACY_ROLES = "('SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER', 'ORANG_TUA')";

    public function up(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
        }

        DB::table('users')
            ->whereIn('role', ['SUPER_ADMIN', 'ADMIN_POSYANDU'])
            ->update(['role' => 'ADMIN']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users ALTER COLUMN role TYPE varchar(255)');
            DB::statement('ALTER TABLE users ALTER COLUMN role SET NOT NULL');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'KADER'");
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN '.self::ROLES.')');

            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['ADMIN', 'KADER', 'ORANG_TUA'])->default('KADER')->change();
        });
    }

    public function down(): void
    {
        DB::table('users')->where('role', 'ADMIN')->update(['role' => 'SUPER_ADMIN']);

        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check');
            DB::statement('ALTER TABLE users ALTER COLUMN role TYPE varchar(255)');
            DB::statement('ALTER TABLE users ALTER COLUMN role SET NOT NULL');
            DB::statement("ALTER TABLE users ALTER COLUMN role SET DEFAULT 'KADER'");
            DB::statement('ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (role IN '.self::LEGACY_ROLES.')');

            return;
        }

        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER', 'ORANG_TUA'])->default('KADER')->change();
        });
    }
};