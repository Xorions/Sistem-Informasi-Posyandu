<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('children', function (Blueprint $table) {
            $table->id();
            $table->foreignId('posyandu_id')->constrained('posyandu')->cascadeOnDelete();
            $table->string('nik')->nullable()->unique();
            $table->string('nama_lengkap');
            $table->string('nama_panggilan')->nullable();
            $table->string('tempat_lahir');
            $table->date('tanggal_lahir');
            $table->enum('jenis_kelamin', ['L', 'P']);
            $table->text('alamat');
            $table->string('nomor_kk')->nullable();
            $table->enum('status', ['active', 'inactive'])->default('active');
            $table->timestamps();
            $table->softDeletes();
            $table->index('posyandu_id');
            $table->index('nama_lengkap');
            $table->index('tanggal_lahir');
            $table->index('nik');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('children');
    }
};
