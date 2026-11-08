<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\User;
use App\Services\TransactionMasters;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Symfony\Component\HttpKernel\Exception\HttpException;

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'notes' => 'Catatan hubungan']);
    $this->customer->assignTo($this->sales, $this->sales);
});

function foundationDeal($test, array $attributes = []): DealTransaction
{
    return DealTransaction::create([
        'dealer_id' => $test->dealer->id, 'customer_id' => $test->customer->id,
        'sales_id' => $test->sales->id, 'vehicle_model' => 'Avanza',
        'current_stage' => PipelineStage::Spk, ...$attributes,
    ]);
}

it('rejects DO without complete area at the domain boundary', function () {
    $deal = foundationDeal($this);
    expect(fn () => $deal->transitionTo(PipelineStage::Do, $this->sales, options: [
        'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
    ]))->toThrow(ValidationException::class);
    expect($deal->fresh()->current_stage)->toBe(PipelineStage::Spk);
    $this->assertDatabaseCount('stage_histories', 0);
});

it('validates area parents and digital channels before any customer write', function (array $extra, string $error) {
    $this->actingAs($this->sales)->postJson(route('customers.store'), [
        'name' => 'Pelanggan baru', 'phone' => '081234567890',
        'vehicle_model' => 'Avanza', 'source' => 'walk_in', ...$extra,
    ])->assertUnprocessable()->assertJsonValidationErrors($error);
    $this->assertDatabaseCount('customers', 1);
    $this->assertDatabaseCount('deal_transactions', 0);
})->with([
    'mismatch' => [['area' => ['region_code' => '32.73', 'district_code' => '32.17.08']], 'area.district_code'],
    'partial' => [['area' => ['region_code' => '32.17']], 'area.district_code'],
    'other city missing' => [['area' => ['region_code' => 'other']], 'area.other_city'],
    'digital missing' => [['source' => 'digital_ad'], 'source_channel'],
    'digital unknown' => [['source' => 'digital_ad', 'source_channel' => 'unknown'], 'source_channel'],
    'social too long' => [['social_media_account' => str_repeat('x', 256)], 'social_media_account'],
]);

it('keeps transaction notes separate and stores optional social account atomically', function () {
    $this->actingAs($this->sales)->post(route('customers.store'), [
        'name' => 'Pelanggan baru', 'phone' => '081234567891', 'vehicle_model' => 'Avanza',
        'source' => 'digital_ad', 'source_channel' => 'instagram',
        'social_media_account' => '@pelanggan', 'notes' => 'Catatan transaksi',
    ])->assertRedirect()->assertSessionHasNoErrors();
    $customer = Customer::query()->where('phone', '+6281234567891')->sole();
    $deal = $customer->transactions()->sole();
    expect($customer->social_media_account)->toBe('@pelanggan')
        ->and($customer->notes)->toBeNull()
        ->and($deal->notes)->toBe('Catatan transaksi')
        ->and($deal->source_channel)->toBe('instagram')
        ->and($deal->progress_at->equalTo($deal->created_at))->toBeTrue();
    expect($deal->stageHistories()->sole()->to_stage)->toBe(PipelineStage::Lead);
});

it('serializes metadata edits with DO and freezes snapshots until cancellation and redo', function () {
    $admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $masters = app(TransactionMasters::class);
    $masters->setFoa($admin, ['32.17.08']);
    $leasing = DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->where('code', 'acc')->sole();
    $deal = foundationDeal($this);
    $path = '/transactions/'.$deal->public_id;
    $this->actingAs($this->sales)->patch($path, [
        'area' => ['region_code' => '32.17', 'district_code' => '32.17.08'],
        'financing' => ['type' => 'credit', 'leasing_id' => $leasing->id],
    ])->assertRedirect()->assertSessionHasNoErrors();
    $checklist = ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true];
    $original = $deal->transitionTo(PipelineStage::Do, $this->sales, options: $checklist);
    expect($original->area_snapshot['is_foa'])->toBeTrue()
        ->and($original->financing_snapshot['leasing_name'])->toBe('ACC');
    $masters->setFoa($admin, []);
    $masters->updateLeasing($admin, $leasing->id, ['name' => 'ACC Baru', 'is_monitored' => false]);
    expect($original->fresh()->area_snapshot['is_foa'])->toBeTrue()
        ->and($original->fresh()->financing_snapshot['leasing_name'])->toBe('ACC');
    $this->patchJson($path, ['notes' => 'Dikunci'])->assertForbidden();
    $this->actingAs($admin)->post(route('transactions.cancel-do', $deal), [
        'reason' => 'Koreksi', 'do_event_id' => $original->id,
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($deal->fresh()->progress_at->equalTo($deal->stageHistories()->latest('id')->first()->created_at))->toBeTrue();
    $redo = $deal->transitionTo(PipelineStage::Do, $this->sales, options: $checklist);
    expect($redo->area_snapshot['is_foa'])->toBeFalse()
        ->and($redo->financing_snapshot['is_monitored'])->toBeFalse()
        ->and($deal->stageHistories()->realizedDo()->count())->toBe(1);
    $delivery = $deal->transitionTo(PipelineStage::Delivery, $this->sales);
    expect($delivery->area_snapshot)->toBeNull()
        ->and($redo->fresh()->area_snapshot)->toBe($redo->area_snapshot);
});

it('accepts Kota Lain without district and clears irrelevant metadata without moving progress', function () {
    $deal = foundationDeal($this, ['source' => 'digital_ad', 'source_channel' => 'facebook']);
    $progress = $deal->progress_at->toIso8601String();
    $this->travel(2)->days();
    $this->actingAs($this->sales)->patch('/transactions/'.$deal->public_id, [
        'source' => 'walk_in', 'source_channel' => 'instagram', 'notes' => 'Umum',
        'area' => ['region_code' => 'other', 'district_code' => '32.17.08', 'other_city' => 'Jakarta'],
        'financing' => ['type' => 'cash', 'leasing_id' => 999, 'other_name' => 'Stale'],
    ])->assertRedirect()->assertSessionHasNoErrors();
    $deal->refresh();
    expect($deal->source_channel)->toBeNull()->and($deal->district_code)->toBeNull()
        ->and($deal->leasing_id)->toBeNull()->and($deal->financing_other_name)->toBeNull()
        ->and($deal->progress_at->toIso8601String())->toBe($progress);
    $event = $deal->transitionTo(PipelineStage::Do, $this->sales, options: [
        'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
    ]);
    expect($event->area_snapshot['other_city'])->toBe('Jakarta')
        ->and($event->area_snapshot['is_foa'])->toBeFalse();
});

it('starts with 106 official districts and eight dealer lenders without demo FOA', function () {
    expect(DB::table('area_districts')->count())->toBe(106)
        ->and(DB::table('area_regions')->count())->toBe(5)
        ->and(DB::table('dealer_foa_districts')->count())->toBe(0)
        ->and(DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->count())->toBe(8);
});

it('rejects foreign or inactive lenders and requires a name for Kredit Lain', function () {
    $deal = foundationDeal($this);
    $other = Dealer::factory()->create();
    $foreignId = DB::table('leasing_companies')->where('dealer_id', $other->id)->value('id');
    $inactiveId = DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->value('id');
    DB::table('leasing_companies')->where('id', $inactiveId)->update(['is_active' => false]);
    foreach ([$foreignId, $inactiveId, ['bad']] as $id) {
        $this->actingAs($this->sales)->patchJson('/transactions/'.$deal->public_id, [
            'financing' => ['type' => 'credit', 'leasing_id' => $id],
        ])->assertUnprocessable()->assertJsonValidationErrors('financing.leasing_id');
    }
    $this->patchJson('/transactions/'.$deal->public_id, ['financing' => ['type' => 'credit', 'leasing_id' => 'other']])
        ->assertUnprocessable()->assertJsonValidationErrors('financing.other_name');
});

it('denies metadata and master changes outside operational permissions', function () {
    $deal = foundationDeal($this);
    foreach ([User::factory()->sales()->create(['dealer_id' => $this->dealer->id]),
        User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]),
        User::factory()->admin()->create()] as $actor) {
        $this->actingAs($actor)->patchJson('/transactions/'.$deal->public_id, ['notes' => 'Tidak boleh'])->assertForbidden();
    }
    expect(fn () => app(TransactionMasters::class)->setFoa($this->sales, ['32.17.08']))
        ->toThrow(HttpException::class);
});

it('preserves an existing inactive lender when editing only transaction notes', function () {
    $id = DB::table('leasing_companies')->where('dealer_id', $this->dealer->id)->value('id');
    $deal = foundationDeal($this, ['financing_type' => 'credit', 'leasing_id' => $id]);
    DB::table('leasing_companies')->where('id', $id)->update(['is_active' => false]);
    $this->actingAs($this->sales)->patch('/transactions/'.$deal->public_id, ['notes' => 'Catatan baru'])
        ->assertRedirect()->assertSessionHasNoErrors();
    expect($deal->fresh()->leasing_id)->toBe($id)->and($deal->fresh()->notes)->toBe('Catatan baru');
});
