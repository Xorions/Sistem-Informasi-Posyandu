<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('special_care_enrollment', function (Blueprint $table) {
            $table->json('trigger_indicators')->nullable()->after('track');
        });
    }

    public function down(): void
    {
        Schema::table('special_care_enrollment', function (Blueprint $table) {
            $table->dropColumn('trigger_indicators');
        });
    }
};
