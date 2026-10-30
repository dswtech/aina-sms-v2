<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deal_comments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_transaction_id')->constrained('deal_transactions')->cascadeOnDelete();
            $table->foreignId('user_id')->constrained('users')->restrictOnDelete();
            $table->foreignId('parent_id')->nullable()->constrained('deal_comments')->cascadeOnDelete();
            $table->text('body');
            $table->timestampTz('edited_at')->nullable();
            $table->timestampsTz();

            $table->index(['deal_transaction_id', 'created_at']);
            $table->index(['parent_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_comments');
    }
};
