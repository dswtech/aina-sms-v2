<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('follow_ups', function (Blueprint $table) {
            $table->foreignId('completed_activity_id')->nullable()->after('completed_at')
                ->constrained('customer_activities')->nullOnDelete();
            $table->string('cancel_reason', 500)->nullable()->after('completed_activity_id');
        });
    }

    public function down(): void
    {
        Schema::table('follow_ups', function (Blueprint $table) {
            $table->dropConstrainedForeignId('completed_activity_id');
            $table->dropColumn('cancel_reason');
        });
    }
};
