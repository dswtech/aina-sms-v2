<?php

use App\Models\AuditLog;
use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
});

it('renders area and leasing masters for Admin only', function () {
    $this->actingAs($this->admin)->get('/dealer-settings')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('dealer-settings/index')
        ->has('regions', 8)->has('districts', 185)->has('foa', 16)->where('pma', ['32.03', '32.04', '32.13', '32.14', '32.17', '32.73', '32.77'])->missing('leasings'));
    $this->get('/dealer-settings/leasing')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('dealer-settings/leasing')->has('leasings', 8)->missing('regions'));
    $this->get('/dealer-settings/vehicles')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('dealer-settings/vehicles')->has('vehicleTypes')->has('vehicleModels')->missing('leasings'));
    // The temporary default is every Kabupaten Bandung Barat district; Admin edits it afterwards.
    expect(DB::table('dealer_foa_districts')->where('dealer_id', $this->dealer->id)->where('district_code', 'not like', '32.17.%')->count())->toBe(0);
    foreach (['sales', 'supervisor', 'branchManager'] as $role) {
        $this->actingAs(User::factory()->{$role}()->create(['dealer_id' => $this->dealer->id]));
        foreach (['/dealer-settings', '/dealer-settings/leasing', '/dealer-settings/vehicles'] as $path) {
            $this->get($path)->assertForbidden();
        }
    }
});

it('stores the dealer FOA selection with audit and replaces it wholesale', function () {
    $this->actingAs($this->admin)->patch('/dealer-settings/area-foa', ['districts' => ['32.73.05', '32.73.03']])->assertRedirect();
    expect(DB::table('dealer_foa_districts')->where('dealer_id', $this->dealer->id)->pluck('district_code')->sort()->values()->all())->toBe(['32.73.03', '32.73.05']);

    $this->patch('/dealer-settings/area-foa', ['districts' => ['32.73.05']])->assertRedirect();
    expect(DB::table('dealer_foa_districts')->where('dealer_id', $this->dealer->id)->count())->toBe(1)
        ->and(AuditLog::where('action', 'dealer.foa_updated')->count())->toBe(2);
    $this->patch('/dealer-settings/area-foa', ['districts' => ['nope']])->assertSessionHasErrors('districts.0');
    $this->patch('/dealer-settings/area-foa', ['districts' => []])->assertRedirect();
    expect(DB::table('dealer_foa_districts')->where('dealer_id', $this->dealer->id)->count())->toBe(0);
});

it('seeds the default PMA regions for a new dealer', function () {
    expect(DB::table('dealer_pma_regions')->where('dealer_id', Dealer::factory()->create()->id)->orderBy('region_code')->pluck('region_code')->all())
        ->toBe(['32.03', '32.04', '32.13', '32.14', '32.17', '32.73', '32.77']);
});

it('stores the dealer PMA selection with audit and replaces it wholesale', function () {
    $this->actingAs($this->admin)->patch('/dealer-settings/area-pma', ['regions' => ['32.73', '32.11']])->assertRedirect();
    expect(DB::table('dealer_pma_regions')->where('dealer_id', $this->dealer->id)->orderBy('region_code')->pluck('region_code')->all())->toBe(['32.11', '32.73'])
        ->and(AuditLog::where('action', 'dealer.pma_updated')->count())->toBe(1);
    $this->patch('/dealer-settings/area-pma', ['regions' => ['99.99']])->assertSessionHasErrors('regions.0');
    $this->patch('/dealer-settings/area-pma', ['regions' => ['other']])->assertSessionHasErrors('regions.0');
    $this->patch('/dealer-settings/area-pma', ['regions' => []])->assertRedirect();
    expect(DB::table('dealer_pma_regions')->where('dealer_id', $this->dealer->id)->count())->toBe(0);
});

it('audits FOA and PMA selections as plain lists even with non-sequential keys', function () {
    $this->actingAs($this->admin)->patch('/dealer-settings/area-pma', ['regions' => [5 => '32.73', 9 => '32.11']])->assertRedirect();
    $this->patch('/dealer-settings/area-foa', ['districts' => [3 => '32.73.05']])->assertRedirect();
    expect(AuditLog::where('action', 'dealer.pma_updated')->sole()->metadata['after']['regions'])->toBe(['32.73', '32.11'])
        ->and(AuditLog::where('action', 'dealer.foa_updated')->sole()->metadata['after']['districts'])->toBe(['32.73.05']);
});

it('creates, renames, deactivates and un-monitors leasing, never crossing dealers', function () {
    $this->actingAs($this->admin)->post('/dealer-settings/leasing', ['name' => 'Leasing Baru'])->assertRedirect();
    $row = DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->where('name', 'Leasing Baru')->first();
    expect($row)->not->toBeNull()->and((bool) $row->is_active)->toBeTrue();
    $this->post('/dealer-settings/leasing', ['name' => 'leasing baru'])->assertSessionHasErrors('name');

    $this->patch("/dealer-settings/leasing/{$row->id}", ['is_active' => false, 'is_monitored' => false, 'name' => 'Leasing Ganti'])->assertRedirect();
    $after = DB::table('leasing_companies')->find($row->id);
    expect((bool) $after->is_active)->toBeFalse()->and((bool) $after->is_monitored)->toBeFalse()->and($after->name)->toBe('Leasing Ganti');

    $other = Dealer::factory()->create();
    $foreign = DB::table('leasing_companies')->where('dealer_id', $other->id)->value('id');
    $this->patch("/dealer-settings/leasing/{$foreign}", ['is_active' => false])->assertNotFound();
    expect(AuditLog::whereIn('action', ['dealer.leasing_created', 'dealer.leasing_updated'])->count())->toBe(2);
});

it('rejects master writes from non-Admin roles', function () {
    $sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($sales)->patch('/dealer-settings/area-foa', ['districts' => []])->assertForbidden();
    $this->patch('/dealer-settings/area-pma', ['regions' => []])->assertForbidden();
    $this->post('/dealer-settings/leasing', ['name' => 'X'])->assertForbidden();
});
