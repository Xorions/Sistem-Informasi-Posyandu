<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Tabel kader/petugas posyandu.
 *
 * Dipisah dari tabel `users` karena kader punya data kepribadian (NIK, NIK
 * tanpa "-" 16 digit, pendidikan, tanggal mulai tugas) yang tidak relevan
 * untuk akun login, dan satu kader bisa punya atau tidak punya akun.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('kader', function (Blueprint $table) {
            $table->id();
            $table->foreignId('posyandu_id')->constrained('posyandu')->cascadeOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->string('nama_kader');
            $table->string('nik_kader', 20)->nullable()->unique();
            $table->string('no_hp', 20)->nullable();
            $table->string('jabatan')->nullable();
            $table->string('pendidikan')->nullable();
            $table->string('alamat')->nullable();
            $table->date('tanggal_mulai_tugas')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();

            $table->index('posyandu_id');
            $table->index('status');
            $table->index('user_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('kader');
    }
};