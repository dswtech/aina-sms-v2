<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('vehicle_types', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->string('name', 100);
            $table->boolean('is_active')->default(true);
            $table->unique(['dealer_id', 'name']);
        });
        Schema::create('vehicle_models', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->foreignId('vehicle_type_id')->constrained('vehicle_types')->restrictOnDelete();
            $table->string('name');
            $table->unsignedBigInteger('price_min')->nullable();
            $table->unsignedBigInteger('price_max')->nullable();
            $table->boolean('is_active')->default(true);
            $table->unique(['dealer_id', 'name']);
        });
        // The vehicle is only mandatory when a deal reaches SPK, so earlier stages may leave it empty.
        Schema::table('deal_transactions', function (Blueprint $table): void {
            $table->string('vehicle_model')->nullable()->change();
        });
    }

    public function down(): void
    {
        DB::table('deal_transactions')->whereNull('vehicle_model')->update(['vehicle_model' => 'Belum dipilih']);
        Schema::table('deal_transactions', function (Blueprint $table): void {
            $table->string('vehicle_model')->nullable(false)->change();
        });
        Schema::dropIfExists('vehicle_models');
        Schema::dropIfExists('vehicle_types');
    }
};
