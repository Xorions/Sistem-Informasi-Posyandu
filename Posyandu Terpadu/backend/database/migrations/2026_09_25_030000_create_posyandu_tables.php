<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('posyandu', function (Blueprint $table) {
            $table->id();
            $table->string('kode_posyandu')->unique();
            $table->string('nama_posyandu');
            $table->string('alamat');
            $table->string('desa_kelurahan')->nullable();
            $table->string('kecamatan')->nullable();
            $table->string('kabupaten_kota')->nullable();
            $table->string('provinsi')->nullable();
            $table->string('nama_ketua')->nullable();
            $table->string('nomor_telepon')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
            $table->index('status');
            $table->index('kode_posyandu');
        });
        Schema::create('user_posyandu', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('posyandu_id')->constrained('posyandu')->cascadeOnDelete();
            $table->timestamps();
            $table->unique(['user_id', 'posyandu_id']);
            $table->index('user_id');
            $table->index('posyandu_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('user_posyandu');
        Schema::dropIfExists('posyandu');
    }
};
