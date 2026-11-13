<?php

use App\Services\TransactionMasters;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        foreach (DB::table('dealers')->pluck('id') as $dealerId) {
            TransactionMasters::initializeVehicles((int) $dealerId);
        }
    }

    public function down(): void
    {
        // Once deployed the catalog belongs to Admin (edited prices, deals referencing it), so rollback keeps it.
    }
};
