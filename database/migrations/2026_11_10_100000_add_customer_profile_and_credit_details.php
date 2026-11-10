<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table): void {
            $table->string('gender', 1)->nullable();
            $table->date('birth_date')->nullable();
            $table->string('occupation', 32)->nullable();
            $table->string('region_code', 16)->nullable();
            $table->string('district_code', 16)->nullable();
            $table->string('other_city')->nullable();
            $table->foreign(['district_code', 'region_code'])->references(['code', 'region_code'])->on('area_districts')->restrictOnDelete();
        });
        Schema::table('deal_transactions', function (Blueprint $table): void {
            $table->unsignedSmallInteger('tenor_months')->nullable();
            $table->string('insurance_type', 16)->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('deal_transactions', fn (Blueprint $table) => $table->dropColumn(['tenor_months', 'insurance_type']));
        Schema::table('customers', function (Blueprint $table): void {
            $table->dropForeign(['district_code', 'region_code']);
            $table->dropColumn(['gender', 'birth_date', 'occupation', 'region_code', 'district_code', 'other_city']);
        });
    }
};
