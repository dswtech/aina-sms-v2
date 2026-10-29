<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('dealers', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->string('name');
            $table->string('timezone', 64)->default('Asia/Jakarta');
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();
        });

        Schema::create('teams', function (Blueprint $table) {
            $table->id();
            $table->uuid('public_id')->unique();
            $table->foreignId('dealer_id')->constrained()->restrictOnDelete();
            $table->string('name');
            $table->boolean('is_active')->default(true)->index();
            $table->timestampsTz();

            $table->unique(['dealer_id', 'name']);
        });

        Schema::table('users', function (Blueprint $table) {
            $table->foreignId('dealer_id')
                ->nullable()
                ->after('id')
                ->constrained()
                ->nullOnDelete();
        });

        Schema::create('team_memberships', function (Blueprint $table) {
            $table->id();
            $table->foreignId('team_id')->constrained()->restrictOnDelete();
            $table->foreignId('user_id')->constrained()->restrictOnDelete();
            $table->string('role', 32);
            $table->foreignId('assigned_by_id')->nullable()->constrained('users')->nullOnDelete();
            $table->timestampTz('started_at');
            $table->timestampTz('ended_at')->nullable();
            $table->timestampsTz();

            $table->index(['team_id', 'ended_at']);
            $table->index(['user_id', 'ended_at']);
            $table->unique(['team_id', 'user_id', 'started_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('team_memberships');

        Schema::table('users', function (Blueprint $table) {
            $table->dropConstrainedForeignId('dealer_id');
        });

        Schema::dropIfExists('teams');
        Schema::dropIfExists('dealers');
    }
};
