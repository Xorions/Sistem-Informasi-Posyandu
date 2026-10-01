<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tautkan akun login ber-role ORANG_TUA ke baris tabel `parents`.
 *
 * Tanpa ini tidak ada cara menentukan anak mana yang milik akun tersebut,
 * sehingga pembatasan "orang tua hanya melihat anaknya sendiri" tidak dapat
 * ditegakkan. Satu akun mewakili satu orang tua; kolom dibiarkan nullable
 * untuk role ADMIN dan KADER yang memang tidak punya anak terdaftar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('parent_id')
                ->nullable()
                ->after('role')
                ->constrained('parents')
                ->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parent_id');
        });
    }
};