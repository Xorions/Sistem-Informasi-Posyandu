<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('growth_standards', function (Blueprint $table) {
            $table->id();
            $table->string('indicator');
            $table->enum('gender', ['L', 'P', 'ALL']);
            $table->integer('age_min');
            $table->integer('age_max');
            $table->string('reference_type');
            $table->decimal('reference_value', 8, 2);
            $table->string('source')->nullable();
            $table->string('version')->default('1.0');
            $table->timestamps();
            $table->index(['indicator', 'gender', 'age_min', 'age_max']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('growth_standards');
    }
};
