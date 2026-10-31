<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->index(['dealer_id', 'created_at']);
            $table->index(['dealer_id', 'created_by_id']);
        });

        Schema::table('deal_transactions', function (Blueprint $table) {
            $table->index(['dealer_id', 'created_at']);
            $table->index(['dealer_id', 'updated_at']);
            $table->index(['sales_id', 'updated_at']);
            $table->index(['customer_id', 'created_at']);
        });

        Schema::table('stage_histories', function (Blueprint $table) {
            $table->index(['deal_transaction_id', 'to_stage', 'created_at']);
        });

        Schema::table('customer_activities', function (Blueprint $table) {
            $table->index(['user_id', 'occurred_at']);
        });

        Schema::table('deal_comments', function (Blueprint $table) {
            $table->index(['deal_transaction_id', 'parent_id', 'created_at']);
        });

        Schema::table('team_memberships', function (Blueprint $table) {
            $table->index(['team_id', 'user_id', 'ended_at']);
        });

        Schema::table('sales_targets', function (Blueprint $table) {
            $table->index(['user_id', 'period']);
        });

        Schema::table('csv_import_batches', function (Blueprint $table) {
            $table->index(['dealer_id', 'status', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::table('customers', function (Blueprint $table) {
            $table->dropIndex(['dealer_id', 'created_at']);
            $table->dropIndex(['dealer_id', 'created_by_id']);
        });

        Schema::table('deal_transactions', function (Blueprint $table) {
            $table->dropIndex(['dealer_id', 'created_at']);
            $table->dropIndex(['dealer_id', 'updated_at']);
            $table->dropIndex(['sales_id', 'updated_at']);
            $table->dropIndex(['customer_id', 'created_at']);
        });

        Schema::table('stage_histories', function (Blueprint $table) {
            $table->dropIndex(['deal_transaction_id', 'to_stage', 'created_at']);
        });

        Schema::table('customer_activities', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'occurred_at']);
        });

        Schema::table('deal_comments', function (Blueprint $table) {
            $table->dropIndex(['deal_transaction_id', 'parent_id', 'created_at']);
        });

        Schema::table('team_memberships', function (Blueprint $table) {
            $table->dropIndex(['team_id', 'user_id', 'ended_at']);
        });

        Schema::table('sales_targets', function (Blueprint $table) {
            $table->dropIndex(['user_id', 'period']);
        });

        Schema::table('csv_import_batches', function (Blueprint $table) {
            $table->dropIndex(['dealer_id', 'status', 'created_at']);
        });
    }
};
