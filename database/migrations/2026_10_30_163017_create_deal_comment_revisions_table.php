<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('deal_comment_revisions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('deal_comment_id')->constrained('deal_comments')->cascadeOnDelete();
            $table->foreignId('edited_by_id')->constrained('users')->restrictOnDelete();
            $table->text('old_body');
            $table->timestampTz('edited_at');
            $table->timestampsTz();

            $table->index(['deal_comment_id', 'edited_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('deal_comment_revisions');
    }
};
