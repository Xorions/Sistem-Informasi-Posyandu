<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Pisahkan data vaksin dan vitamin dalam satu tabel `immunizations`.
 *
 * Tester meminta tabel "imunisasi_vitamin" agar pencatatan medis lebih rapi.
 * Alih-alih membuat tabel baru yang akan menggandakan data dan endpoint,
 * tabel `immunizations` yang sudah ada diperluas dengan kolom `jenis`,
 * sehingga satu anak bisa punya riwayat vaksin maupun vitamin.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->enum('jenis', ['VAKSIN', 'VITAMIN'])->default('VAKSIN')->after('child_id');
            $table->string('batch')->nullable()->after('vaccine_name');
        });
    }

    public function down(): void
    {
        Schema::table('immunizations', function (Blueprint $table) {
            $table->dropColumn(['jenis', 'batch']);
        });
    }
};