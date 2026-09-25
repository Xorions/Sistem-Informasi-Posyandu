<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parents', function (Blueprint $table) {
            $table->id();
            $table->string('nik')->nullable()->unique();
            $table->string('nama_lengkap');
            $table->string('tempat_lahir')->nullable();
            $table->date('tanggal_lahir')->nullable();
            $table->enum('jenis_kelamin', ['L', 'P'])->nullable();
            $table->text('alamat')->nullable();
            $table->string('nomor_telepon')->nullable();
            $table->string('pekerjaan')->nullable();
            $table->timestamps();
            $table->softDeletes();
            $table->index('nik');
            $table->index('nama_lengkap');
        });
        Schema::create('child_parent', function (Blueprint $table) {
            $table->id();
            $table->foreignId('child_id')->constrained('children')->cascadeOnDelete();
            $table->foreignId('parent_id')->constrained('parents')->cascadeOnDelete();
            $table->enum('relationship', ['Ayah', 'Ibu', 'Wali']);
            $table->boolean('is_primary_contact')->default(false);
            $table->timestamps();
            $table->unique(['child_id', 'parent_id']);
            $table->index('child_id');
            $table->index('parent_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('child_parent');
        Schema::dropIfExists('parents');
    }
};
