<?php

use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
});

it('renders the create page with masters, sources and no assignable Sales for Sales', function () {
    $this->actingAs($this->sales)->get('/transactions/create')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('transactions/create')
        ->has('regions', 5)->has('districts', 106)->has('leasings', 8)
        ->where('sources.0.value', 'walk_in')
        ->where('assignableSales', []));
    $this->actingAs(User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]))->get('/transactions/create')->assertForbidden();
});

it('offers Admin the dealer Sales and shows only active leasing', function () {
    $admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->where('code', 'acc')->update(['is_active' => false]);
    $this->actingAs($admin)->get('/transactions/create')->assertInertia(fn (Assert $p) => $p
        ->has('assignableSales', 1)->has('leasings', 7));
});

it('stores a new customer lead with area, financing and social account through the shared service', function () {
    $this->actingAs($this->sales)->post('/transactions', [
        'name' => 'Rina', 'phone' => '081234567890', 'social_media_account' => '@rina',
        'vehicle_model' => 'Avanza', 'source' => 'digital_ad', 'source_channel' => 'instagram', 'notes' => 'Ingin test drive',
        'expected_closing_month' => '2026-12',
        'area' => ['region_code' => '32.73', 'district_code' => '32.73.05'],
        'financing' => ['type' => 'credit', 'leasing_id' => 'other', 'other_name' => 'Leasing X'],
    ])->assertRedirect('/transactions');

    $deal = DealTransaction::query()->firstOrFail();
    expect($deal->customer->social_media_account)->toBe('@rina')
        ->and($deal->source_channel)->toBe('instagram')
        ->and($deal->district_code)->toBe('32.73.05')
        ->and($deal->financing_other_name)->toBe('Leasing X')
        ->and($deal->notes)->toBe('Ingin test drive')
        ->and($deal->stageHistories()->count())->toBe(1);
});

it('keeps everything unwritten when validation fails', function () {
    $this->actingAs($this->sales)->post('/transactions', [
        'name' => 'Rina', 'phone' => '081234567890', 'vehicle_model' => 'Avanza', 'source' => 'digital_ad',
    ])->assertSessionHasErrors('source_channel');
    $this->assertDatabaseCount('customers', 0);
    $this->assertDatabaseCount('deal_transactions', 0);
});

it('searches only customers the actor may use, requires an active assignment and paginates', function () {
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $mine = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Sari Dewi', 'social_media_account' => '@sari']);
    $mine->assignTo($this->sales);
    Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Sari Tanpa Sales']);
    $theirs = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Sari Orang Lain']);
    $theirs->assignTo($other);

    $this->actingAs($this->sales)->getJson('/transactions/customer-search?q=sari')->assertOk()
        ->assertJsonCount(1, 'data')
        ->assertJsonPath('data.0.public_id', $mine->public_id)
        ->assertJsonPath('data.0.social_media_account', '@sari')
        ->assertJsonPath('data.0.assigned_sales.name', $this->sales->name)
        ->assertJsonStructure(['current_page', 'last_page', 'total']);
    $this->getJson('/transactions/customer-search?q=')->assertOk()->assertJsonCount(1, 'data');
    $this->getJson('/transactions/customer-search?q[]=x')->assertUnprocessable();
});

it('creates a repeat transaction for an existing customer without touching identity or assignment', function () {
    $customer = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Sari Dewi', 'social_media_account' => '@sari']);
    $customer->assignTo($this->sales);
    $this->actingAs($this->sales)->post('/transactions', [
        'existing_customer_id' => $customer->public_id, 'name' => 'Diubah', 'phone' => $customer->phone,
        'vehicle_model' => 'Creta', 'source' => 'walk_in',
    ])->assertRedirect('/transactions');
    expect($customer->fresh()->name)->toBe('Sari Dewi')->and($customer->fresh()->social_media_account)->toBe('@sari')
        ->and(DealTransaction::count())->toBe(1);
});

it('shows a detail payload only for visible transactions, with locking flag after DO', function () {
    $customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $customer->assignTo($this->sales);
    $deal = DealTransaction::create(['dealer_id' => $this->dealer->id, 'customer_id' => $customer->id, 'sales_id' => $this->sales->id,
        'vehicle_model' => 'Creta', 'notes' => 'Catatan', 'estimated_value' => 250000000]);
    $this->actingAs($this->sales)->getJson("/transactions/{$deal->public_id}")->assertOk()
        ->assertJsonPath('public_id', $deal->public_id)->assertJsonPath('notes', 'Catatan')
        ->assertJsonPath('estimated_value', 250000000)->assertJsonPath('can_edit_metadata', true)
        ->assertJsonStructure(['created_at', 'progress_at', 'area', 'financing', 'customer' => ['name', 'phone', 'social_media_account'], 'supervisors', 'history']);
    $stranger = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($stranger)->getJson("/transactions/{$deal->public_id}")->assertForbidden();
});

it('preselects an accessible customer with an active assignment from the customer query', function () {
    $mine = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Sari Dewi', 'social_media_account' => '@sari']);
    $mine->assignTo($this->sales);
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $theirs = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $theirs->assignTo($other);
    $unassigned = Customer::factory()->create(['dealer_id' => $this->dealer->id]);

    $this->actingAs($this->sales)->get('/transactions/create?customer='.$mine->public_id)->assertInertia(fn (Assert $p) => $p
        ->where('preselected.public_id', $mine->public_id)->where('preselected.social_media_account', '@sari')
        ->where('preselected.assigned_sales.name', $this->sales->name));
    foreach ([$theirs->public_id, $unassigned->public_id, 'not-a-uuid'] as $id) {
        $this->get('/transactions/create?customer='.$id)->assertInertia(fn (Assert $p) => $p->where('preselected', null));
    }
});

it('narrows customer search by name or partial phone instead of returning everyone', function () {
    $sari = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Sari Dewi', 'phone' => '081234567890']);
    $budi = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Budi Santoso', 'phone' => '081998877665']);
    foreach ([$sari, $budi] as $customer) {
        $customer->assignTo($this->sales);
    }
    $found = fn (string $q) => collect($this->actingAs($this->sales)->getJson('/transactions/customer-search?q='.urlencode($q))->json('data'))->pluck('name')->all();

    expect($found('sari'))->toBe(['Sari Dewi'])
        ->and($found('08123'))->toBe(['Sari Dewi'])
        ->and($found('998877'))->toBe(['Budi Santoso'])
        ->and($found('zzz'))->toBe([])
        // Digits inside a word search must not pull in phones that merely contain them.
        ->and($found('Sari 7890'))->toBe([])
        ->and($found('+62 812-3456'))->toBe(['Sari Dewi']);
});
