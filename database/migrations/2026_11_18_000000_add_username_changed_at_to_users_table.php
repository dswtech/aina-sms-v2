<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Set once a user has used their single self-service username change (ADR-009).
        Schema::table('users', function (Blueprint $table) {
            $table->timestampTz('username_changed_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('username_changed_at');
        });
    }
};
