<?php

use App\Models\Dealer;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

pest()->extend(TestCase::class)
    ->use(RefreshDatabase::class)
    ->in('Feature');

/**
 * Tests written before the vehicle master post free-text models; this gives every Dealer
 * created in the test those names as active master models so the form rule accepts them.
 */
function legacyVehicleMaster(): void
{
    Dealer::created(function (Dealer $dealer): void {
        $type = DB::table('vehicle_types')->insertGetId(['dealer_id' => $dealer->id, 'name' => 'Uji']);
        foreach (['Model QA', 'Model baru', 'Avanza', 'Creta', 'Stargazer', 'Stargazer Prime', 'Creta IVT', 'Ioniq 5', 'Repeat order', 'Invalid'] as $name) {
            DB::table('vehicle_models')->insert(['dealer_id' => $dealer->id, 'vehicle_type_id' => $type, 'name' => $name]);
        }
    });
}
