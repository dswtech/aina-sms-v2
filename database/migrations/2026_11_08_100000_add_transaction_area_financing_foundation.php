<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('area_regions', function (Blueprint $table): void {
            $table->string('code', 16)->primary();
            $table->string('name');
        });
        Schema::create('area_districts', function (Blueprint $table): void {
            $table->string('code', 16)->primary();
            $table->string('region_code', 16);
            $table->string('name');
            $table->foreign('region_code')->references('code')->on('area_regions')->restrictOnDelete();
            $table->unique(['code', 'region_code']);
        });
        $json = file_get_contents(database_path('data/bandung-raya.json'));
        if ($json === false) {
            throw new RuntimeException('Official area master is missing.');
        }
        $master = json_decode($json, true, flags: JSON_THROW_ON_ERROR);
        DB::table('area_regions')->insert($master['regions']);
        DB::table('area_districts')->insert($master['districts']);
        Schema::create('dealer_foa_districts', function (Blueprint $table): void {
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->string('district_code', 16);
            $table->foreign('district_code')->references('code')->on('area_districts')->restrictOnDelete();
            $table->primary(['dealer_id', 'district_code']);
        });
        Schema::create('leasing_companies', function (Blueprint $table): void {
            $table->id();
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->string('code', 64);
            $table->string('name');
            $table->boolean('is_active')->default(true);
            $table->boolean('is_monitored')->default(true);
            $table->unique(['dealer_id', 'code']);
        });
        foreach (DB::table('dealers')->pluck('id') as $dealerId) {
            foreach (['maybank' => 'MayBank', 'muf' => 'Mandiri Utama Finance', 'acc' => 'ACC', 'taf' => 'TAF', 'mtf' => 'Mandiri Tunas Finance', 'bca' => 'BCA Finance', 'niaga' => 'Niaga Finance', 'adira' => 'Adira Finance'] as $code => $name) {
                DB::table('leasing_companies')->insert(['dealer_id' => $dealerId, 'code' => $code, 'name' => $name]);
            }
        }
        // Temporary owner default: Kabupaten Bandung Barat is FOA until Admin edits it.
        foreach (DB::table('dealers')->pluck('id') as $dealerId) {
            DB::statement(
                'INSERT INTO dealer_foa_districts (dealer_id, district_code) SELECT ?, code FROM area_districts WHERE region_code = ?',
                [$dealerId, '32.17'],
            );
        }
        Schema::table('customers', fn (Blueprint $table) => $table->string('social_media_account')->nullable());
        Schema::table('deal_transactions', function (Blueprint $table): void {
            $table->text('notes')->nullable();
            $table->enum('source_channel', ['facebook', 'instagram', 'tiktok', 'website', 'other'])->nullable();
            $table->string('region_code', 16)->nullable();
            $table->string('district_code', 16)->nullable();
            $table->string('other_city')->nullable();
            $table->enum('financing_type', ['cash', 'credit'])->nullable();
            $table->foreignId('leasing_id')->nullable()->constrained('leasing_companies')->restrictOnDelete();
            $table->string('financing_other_name')->nullable();
            $table->timestampTz('progress_at')->nullable();
            $table->foreign(['district_code', 'region_code'])->references(['code', 'region_code'])->on('area_districts')->restrictOnDelete();
            $table->index(['dealer_id', 'progress_at', 'id']);
        });
        Schema::table('stage_histories', function (Blueprint $table): void {
            $table->json('area_snapshot')->nullable();
            $table->json('financing_snapshot')->nullable();
        });
        // This is a timestamp projection, never a fabricated historical area/snapshot.
        DB::statement('UPDATE deal_transactions SET progress_at = COALESCE((SELECT MAX(created_at) FROM stage_histories WHERE deal_transaction_id = deal_transactions.id), created_at)');
    }

    public function down(): void
    {
        Schema::table('stage_histories', fn (Blueprint $table) => $table->dropColumn(['area_snapshot', 'financing_snapshot']));
        Schema::table('deal_transactions', function (Blueprint $table): void {
            $table->dropForeign(['district_code', 'region_code']);
            $table->dropForeign(['leasing_id']);
            $table->dropIndex(['dealer_id', 'progress_at', 'id']);
            $table->dropColumn(['notes', 'source_channel', 'region_code', 'district_code', 'other_city', 'financing_type', 'leasing_id', 'financing_other_name', 'progress_at']);
        });
        Schema::table('customers', fn (Blueprint $table) => $table->dropColumn('social_media_account'));
        Schema::dropIfExists('leasing_companies');
        Schema::dropIfExists('dealer_foa_districts');
        Schema::dropIfExists('area_districts');
        Schema::dropIfExists('area_regions');
    }
};
