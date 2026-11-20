<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\StageHistory;
use App\Models\User;
use App\Services\TransactionMasters;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
});

function patchDo($t, array $area): StageHistory
{
    $customer = Customer::factory()->create(['dealer_id' => $t->dealer->id]);
    $customer->assignTo($t->sales);
    $deal = DealTransaction::create(['dealer_id' => $t->dealer->id, 'customer_id' => $customer->id, 'sales_id' => $t->sales->id,
        'vehicle_model' => 'Avanza', 'current_stage' => PipelineStage::Spk, ...$area]);

    return $deal->transitionTo(PipelineStage::Do, $t->admin, 'Uji', [
        'vehicle_ownership' => 'first_buyer', 'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
    ]);
}

function runFoaPmaPatch(): void
{
    (require database_path('migrations/2026_11_21_100000_reset_foa_pma_and_resnapshot_do.php'))->up();
}

it('resets FOA to every Bandung Barat district, PMA to the seven regions, and recounts every DO snapshot', function () {
    $masters = app(TransactionMasters::class);
    // Admin settings that disagree with the owner's decision, captured into the DO snapshots.
    $masters->setFoa($this->admin, ['32.73.05']);
    $masters->setPma($this->admin, ['32.11']);
    $sumedang = DB::table('area_districts')->where('region_code', '32.11')->orderBy('code')->value('code');
    $kbb = patchDo($this, ['region_code' => '32.17', 'district_code' => '32.17.01']);
    $andir = patchDo($this, ['region_code' => '32.73', 'district_code' => '32.73.05']);
    $outside = patchDo($this, ['region_code' => '32.11', 'district_code' => $sumedang]);
    $other = patchDo($this, ['region_code' => 'other', 'other_city' => 'Jakarta']);
    $legacy = patchDo($this, ['region_code' => '32.17', 'district_code' => '32.17.02']);
    $legacy->forceFill(['area_snapshot' => null])->save();
    expect([$kbb->area_snapshot['is_foa'], $andir->area_snapshot['is_foa'], $outside->area_snapshot['is_pma']])->toBe([false, true, true]);
    $otherDealer = Dealer::factory()->create();
    DB::table('dealer_foa_districts')->where('dealer_id', $otherDealer->id)->delete();

    runFoaPmaPatch();
    runFoaPmaPatch(); // idempotent: a second run changes nothing

    $kbbDistricts = DB::table('area_districts')->where('region_code', '32.17')->orderBy('code')->pluck('code')->all();
    foreach ([$this->dealer->id, $otherDealer->id] as $dealerId) {
        expect(DB::table('dealer_foa_districts')->where('dealer_id', $dealerId)->orderBy('district_code')->pluck('district_code')->all())->toBe($kbbDistricts)
            ->and(DB::table('dealer_pma_regions')->where('dealer_id', $dealerId)->orderBy('region_code')->pluck('region_code')->all())
            ->toBe(['32.03', '32.04', '32.13', '32.14', '32.17', '32.73', '32.77']);
    }
    expect(count($kbbDistricts))->toBe(16);
    $flags = fn (StageHistory $h): array => [$h->fresh()->area_snapshot['is_foa'], $h->fresh()->area_snapshot['is_pma']];
    expect($flags($kbb))->toBe([true, true])
        ->and($flags($andir))->toBe([false, true])
        ->and($flags($outside))->toBe([false, false])
        ->and($flags($other))->toBe([false, false])
        ->and($legacy->fresh()->area_snapshot)->toBeNull()
        ->and($kbb->fresh()->area_snapshot['district_name'])->toBe($kbb->area_snapshot['district_name'])
        ->and($other->fresh()->area_snapshot['other_city'])->toBe('Jakarta')
        ->and($kbb->fresh()->financing_snapshot)->toBe($kbb->financing_snapshot);
});
