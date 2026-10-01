<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel Kesehatan Ibu dan Anak (KIA):ibu hamil dan pemeriksaan rutinnya.
 *
 * `ibu_hamil` menautkan ke tabel `parents` sehingga data ibu tetap satu
 * sumber kebenaran bersama data orang tua/wali pada modul anak.
 * Usia kehamilan tidak disimpan, melainkan dihitung dari HPHT (hari pertama
 * haid terakhir) atau HPL, mengikuti cara perhitungan klinis.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('ibu_hamil', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parent_id')->constrained('parents')->cascadeOnDelete();
            $table->foreignId('posyandu_id')->constrained('posyandu')->cascadeOnDelete();
            $table->date('hpht')->nullable();
            $table->date('tanggal_perkiraan_lahir');
            $table->unsignedTinyInteger('jarak_kehamilan')->nullable();
            $table->unsignedTinyInteger('jumlah_anak_lahir')->nullable();
            $table->decimal('tinggi_funds', 5, 1)->nullable();
            $table->decimal('berat_badan', 5, 1)->nullable();
            $table->string('golongan_darah', 5)->nullable();
            $table->text('riwayat_penyakit')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('posyandu_id');
            $table->index('parent_id');
            $table->index('status');
            $table->index('tanggal_perkiraan_lahir');
        });

        Schema::create('pemeriksaan_bumil', function (Blueprint $table) {
            $table->id();
            $table->foreignId('ibu_hamil_id')->constrained('ibu_hamil')->cascadeOnDelete();
            $table->foreignId('examiner_id')->nullable()->constrained('users')->nullOnDelete();
            $table->date('tanggal_periksa');
            $table->unsignedTinyInteger('usia_kehamilan');
            $table->decimal('berat_badan', 5, 1)->nullable();
            $table->decimal('tinggi_badan', 5, 1)->nullable();
            $table->string('tekanan_darah', 10)->nullable();
            $table->decimal('lingkar_lengan_atas', 5, 1)->nullable();
            $table->decimal('tinggi_funds', 5, 1)->nullable();
            $table->unsignedSmallInteger('denyut_jantung_janin')->nullable();
            $table->string('posisi_janin')->nullable();
            $table->text('keluhan')->nullable();
            $table->text('catatan')->nullable();
            $table->enum('status', ['normal', 'perlu_perhatian', 'danger'])->default('normal');
            $table->timestamps();

            $table->index('ibu_hamil_id');
            $table->index('tanggal_periksa');
            $table->index('status');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('pemeriksaan_bumil');
        Schema::dropIfExists('ibu_hamil');
    }
};