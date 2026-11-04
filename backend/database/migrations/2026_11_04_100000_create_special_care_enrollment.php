<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel pendaftaran penanganan khusus (PMT Pemulihan / intervensi stunting).
 *
 * Satu anak bisa punya beberapa enrollment (riwayat), tapi hanya satu
 * yang berstatus candidate/active per track pada satu waktu.
 *
 * Nama tabel tunggal sesuai konvensi project (AGENTS.md poin 3).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('special_care_enrollment', function (Blueprint $table) {
            $table->id();
            $table->foreignId('child_id')->constrained('children')->cascadeOnDelete();
            $table->foreignId('posyandu_id')->constrained('posyandu')->cascadeOnDelete();

            // Track & Status
            $table->string('track', 20); // wasting, stunting, both
            $table->string('status', 20)->default('candidate'); // candidate, active, graduated, cancelled
            $table->boolean('perlu_rujukan')->default(false);

            // Pemicu Masuk
            $table->text('alasan_masuk');
            $table->foreignId('entry_examination_id')->nullable()->constrained('examinations')->nullOnDelete();
            $table->date('entry_date')->nullable(); // tanggal disetujui aktif

            // Pemicu Keluar / Selesai
            $table->date('exit_date')->nullable();
            $table->text('alasan_keluar')->nullable();
            $table->foreignId('exit_examination_id')->nullable()->constrained('examinations')->nullOnDelete();

            // Verifikasi & Catatan
            $table->foreignId('confirmed_by')->nullable()->constrained('users')->nullOnDelete();
            $table->text('notes')->nullable();
            $table->timestamps();

            // Index performa
            $table->index(['posyandu_id', 'status']);
            $table->index(['child_id', 'status']);
            $table->index(['track', 'status']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('special_care_enrollment');
    }
};
