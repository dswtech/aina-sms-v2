<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('deal_transactions', function (Blueprint $table) {
            $table->string('vehicle_color', 50)->nullable()->after('vehicle_model');
            $table->string('vehicle_ownership', 16)->nullable()->after('vehicle_color');
        });
    }

    public function down(): void
    {
        Schema::table('deal_transactions', function (Blueprint $table) {
            $table->dropColumn(['vehicle_color', 'vehicle_ownership']);
        });
    }
};
