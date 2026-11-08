<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

function listDeal(Dealer $dealer, User $sales, string $model, string $progress, array $extra = []): DealTransaction
{
    $customer = Customer::factory()->create(['dealer_id' => $dealer->id, 'name' => $extra['customer'] ?? 'Budi '.$model]);
    $customer->assignTo($sales);
    unset($extra['customer']);
    $deal = DealTransaction::create(['dealer_id' => $dealer->id, 'customer_id' => $customer->id, 'sales_id' => $sales->id,
        'vehicle_model' => $model, 'source' => 'walk_in', 'current_stage' => 'lead', ...$extra]);
    $deal->forceFill(['progress_at' => $progress])->save();

    return $deal;
}

it('filters and orders by progress date in Jakarta, newest first', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    listDeal($dealer, $sales, 'Before', '2026-10-31 16:59:59');
    listDeal($dealer, $sales, 'Start', '2026-10-31 17:00:00');
    listDeal($dealer, $sales, 'End', '2026-11-05 16:59:59');
    listDeal($dealer, $sales, 'After', '2026-11-05 17:00:00');

    $this->actingAs($sales)->get('/transactions?date_from=2026-11-01&date_to=2026-11-05')->assertInertia(fn (Assert $p) => $p
        ->where('transactions.data', fn ($rows): bool => collect($rows)->pluck('vehicle_model')->all() === ['End', 'Start']));
});

it('defaults to the Jakarta month start through today only when no date key is sent', function () {
    $this->travelTo('2026-11-08 10:00:00');
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    listDeal($dealer, $sales, 'Old', '2026-10-15 03:00:00');
    listDeal($dealer, $sales, 'New', '2026-11-03 03:00:00');

    $this->actingAs($sales)->get('/transactions')->assertInertia(fn (Assert $p) => $p
        ->where('filters.date_from', '2026-11-01')->where('filters.date_to', '2026-11-08')
        ->where('transactions.data', fn ($rows): bool => collect($rows)->pluck('vehicle_model')->all() === ['New']));
    $this->get('/transactions?date_from=&date_to=')->assertInertia(fn (Assert $p) => $p->has('transactions.data', 2));
});

it('serializes progress, area, financing, notes and every active supervisor of the deal team', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $team = Team::factory()->create(['dealer_id' => $dealer->id]);
    foreach ([['Zed', 'Z'], ['Andi', 'A']] as [$name]) {
        $spv = User::factory()->supervisor()->create(['dealer_id' => $dealer->id, 'name' => $name]);
        $team->memberships()->create(['user_id' => $spv->id, 'role' => 'supervisor', 'started_at' => now()]);
    }
    listDeal($dealer, $sales, 'Creta', '2026-11-03 03:00:00', [
        'team_id' => $team->id, 'notes' => 'Minta test drive', 'source' => 'digital_ad', 'source_channel' => 'tiktok',
        'region_code' => '32.73', 'district_code' => '32.73.05',
    ]);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)->get('/transactions?date_from=2026-11-01&date_to=2026-11-30')->assertInertia(fn (Assert $p) => $p
        ->where('transactions.data.0.notes', 'Minta test drive')
        ->where('transactions.data.0.source_channel', 'tiktok')
        ->where('transactions.data.0.progress_at', fn ($v): bool => str_starts_with((string) $v, '2026-11-03'))
        ->where('transactions.data.0.supervisors', fn ($v): bool => collect($v)->pluck('name')->all() === ['Andi', 'Zed'])
        ->where('transactions.data.0.area.district_code', '32.73.05')
        ->has('transactions.data.0.area.district_name')
        ->where('transactions.data.0.financing.type', null));
});

it('applies detail filters and rejects Sales or Supervisor filters outside the actor scope', function () {
    $dealer = Dealer::factory()->create();
    $mine = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $other = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    listDeal($dealer, $mine, 'A', '2026-11-03 03:00:00', ['customer' => 'Siti Aminah', 'region_code' => '32.73', 'district_code' => '32.73.05']);
    listDeal($dealer, $mine, 'B', '2026-11-03 03:00:00', ['customer' => 'Joko']);
    listDeal($dealer, $other, 'C', '2026-11-03 03:00:00', ['customer' => 'Siti Lain']);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $q = 'date_from=2026-11-01&date_to=2026-11-30';

    $names = fn ($url) => collect($this->actingAs($admin)->get($url)->viewData('page')['props']['transactions']['data'])->pluck('vehicle_model')->sort()->values()->all();
    expect($names("/transactions?$q&customer_name=siti"))->toBe(['A', 'C'])
        ->and($names("/transactions?$q&sales_id={$other->id}"))->toBe(['C'])
        ->and($names("/transactions?$q&district_code=32.73.05"))->toBe(['A'])
        ->and($names("/transactions?$q&region_code=32.73&district_code=32.73.05"))->toBe(['A']);
});

it('exports every filtered row as safe CSV without contact, address or coaching data', function () {
    $dealer = Dealer::factory()->create();
    $sales = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    foreach (range(1, 17) as $i) {
        listDeal($dealer, $sales, "Model $i", '2026-11-03 03:00:00', ['customer' => $i === 1 ? '=HYPERLINK("x")' : "Cust $i", 'notes' => $i === 1 ? '+cmd;x' : null]);
    }
    listDeal($dealer, $sales, 'Outside', '2026-09-03 03:00:00');
    $response = $this->actingAs($sales)->get('/transactions/export.csv?date_from=2026-11-01&date_to=2026-11-30&page=2');
    $response->assertOk()->assertHeader('content-type', 'text/csv; charset=UTF-8');
    $csv = $response->streamedContent();

    expect(str_starts_with($csv, "\xEF\xBB\xBF"))->toBeTrue()
        ->and(substr_count(trim($csv), "\n"))->toBe(17)
        ->and($csv)->toContain("'=HYPERLINK")->toContain("'+cmd")
        ->and($csv)->not->toContain('Outside')->not->toContain('phone')->not->toContain('Telepon');
});

it('keeps CSV export inside the same scope as the list', function () {
    $dealer = Dealer::factory()->create();
    $mine = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    $other = User::factory()->sales()->create(['dealer_id' => $dealer->id]);
    listDeal($dealer, $other, 'Secret', now()->toDateTimeString());
    $this->actingAs($mine)->get('/transactions/export.csv')->assertOk();
    expect($this->get('/transactions/export.csv')->streamedContent())->not->toContain('Secret');
    $this->actingAs(User::factory()->branchManager()->create(['dealer_id' => $dealer->id]))->get('/transactions/export.csv')->assertForbidden();
});

it('offers filter masters: supervisors to Admin only, plus regions and districts', function () {
    $dealer = Dealer::factory()->create();
    User::factory()->supervisor()->create(['dealer_id' => $dealer->id, 'name' => 'Spv Satu']);
    $admin = User::factory()->admin()->create(['dealer_id' => $dealer->id]);
    $spv = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);

    $this->actingAs($admin)->get('/transactions')->assertInertia(fn (Assert $p) => $p
        ->has('supervisorOptions', 2)->has('regions', 5)->has('districts', 106)->has('leasings', 8));
    $this->actingAs($spv)->get('/transactions')->assertInertia(fn (Assert $p) => $p->where('supervisorOptions', []));
});
