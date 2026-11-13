<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // One row per username held by a pending invitation; the unique index arbitrates races.
        Schema::create('username_reservations', function (Blueprint $table) {
            $table->id();
            $table->string('username', 12)->unique();
            $table->timestampsTz();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('username_reservations');
    }
};
