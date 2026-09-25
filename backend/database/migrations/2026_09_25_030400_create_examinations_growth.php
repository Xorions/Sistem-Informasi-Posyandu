<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('examinations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('child_id')->constrained('children')->cascadeOnDelete();
            $table->foreignId('posyandu_id')->constrained('posyandu')->cascadeOnDelete();
            $table->date('examination_date');
            $table->foreignId('examiner_id')->constrained('users')->cascadeOnDelete();
            $table->text('notes')->nullable();
            $table->enum('status', ['active', 'voided'])->default('active');
            $table->text('void_reason')->nullable();
            $table->timestamps();
            $table->index('child_id');
            $table->index('posyandu_id');
            $table->index('examination_date');
        });
        Schema::create('growth_records', function (Blueprint $table) {
            $table->id();
            $table->foreignId('examination_id')->constrained('examinations')->cascadeOnDelete();
            $table->decimal('weight', 5, 2)->nullable();
            $table->decimal('height', 5, 2)->nullable();
            $table->decimal('length', 5, 2)->nullable();
            $table->decimal('head_circumference', 5, 2)->nullable();
            $table->decimal('arm_circumference', 5, 2)->nullable();
            $table->timestamps();
            $table->index('examination_id');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('growth_records');
        Schema::dropIfExists('examinations');
    }
};
