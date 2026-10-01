<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->enum('role', ['SUPER_ADMIN', 'ADMIN_POSYANDU', 'KADER', 'ORANG_TUA'])->default('KADER')->after('password');
            $table->string('phone')->nullable()->after('email');
            $table->boolean('is_active')->default(true)->after('role');
            $table->softDeletes()->after('remember_token');
            $table->index('role');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['role', 'phone', 'is_active', 'deleted_at']);
        });
    }
};
