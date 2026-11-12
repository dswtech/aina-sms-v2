<?php

use App\Enums\PipelineStage;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->freezeTime();
    Queue::fake();
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->replacement = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->supervisor, $this->sales, $this->replacement] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($this->sales, $this->supervisor);
    $this->deal = DealTransaction::create([
        'region_code' => '32.17', 'district_code' => '32.17.08',
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'team_id' => $this->team->id,
        'vehicle_model' => 'G09', 'current_stage' => PipelineStage::Prospect,
    ]);
});

it('reassigns within the supervisor team without moving transaction ownership or destroying history', function () {
    $original = $this->customer->activeAssignment;
    $this->actingAs($this->supervisor)->patch(route('customers.reassign', $this->customer), [
        'sales_id' => $this->replacement->id, 'notes' => 'Cakupan kerja',
    ])->assertRedirect()->assertSessionHasNoErrors();
    expect($original->fresh()->ended_at)->not->toBeNull()
        ->and($this->customer->fresh()->assignments()->count())->toBe(2)
        ->and($this->customer->fresh()->activeAssignment->sales_id)->toBe($this->replacement->id)
        ->and($this->customer->fresh()->activeAssignment->assigned_by_id)->toBe($this->supervisor->id)
        ->and($this->customer->fresh()->activeAssignment->notes)->toBe('Cakupan kerja')
        ->and($this->deal->fresh()->sales_id)->toBe($this->sales->id);
});

it('rejects reassignment from a customer outside the supervisor scope without side effects', function (bool $createdByActor) {
    $outsider = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    if ($createdByActor) {
        $this->customer->update(['created_by_id' => $this->supervisor->id]);
    }
    $this->customer->assignTo($outsider);
    $before = DB::table('customer_assignments')->orderBy('id')->get()->toJson();
    $this->actingAs($this->supervisor)->patchJson(route('customers.reassign', $this->customer), [
        'sales_id' => $this->replacement->id,
    ])->assertForbidden();
    expect(DB::table('customer_assignments')->orderBy('id')->get()->toJson())->toBe($before);
})->with([false, true]);

it('rejects invalid reassignment recipients without changing assignments', function (string $kind) {
    $recipient = match ($kind) {
        'outside-team' => User::factory()->sales()->create(['dealer_id' => $this->dealer->id]),
        'foreign' => User::factory()->sales()->create(),
        'inactive' => tap($this->replacement)->update(['is_active' => false]),
        'wrong-role' => $this->supervisor,
    };
    $before = DB::table('customer_assignments')->orderBy('id')->get()->toJson();
    $response = $this->actingAs($this->supervisor)->patchJson(route('customers.reassign', $this->customer), ['sales_id' => $recipient->id]);
    expect($response->status())->toBeIn([403, 404, 422]);
    expect(DB::table('customer_assignments')->orderBy('id')->get()->toJson())->toBe($before);
})->with(['outside-team', 'foreign', 'inactive', 'wrong-role']);

it('revokes supervisor reads and writes on the next request after placement changes', function (string $change) {
    $comment = $this->deal->comments()->create(['user_id' => $this->supervisor->id, 'body' => 'Rahasia G09']);
    $this->actingAs($this->supervisor)->get(route('transactions.coaching', $this->deal))->assertOk();
    if ($change === 'membership') {
        $this->supervisor->activeTeamMemberships()->update(['ended_at' => now()]);
    } else {
        $this->team->update(['is_active' => false]);
    }
    $this->getJson(route('transactions.coaching', $this->deal))->assertForbidden();
    $this->get('/customers')->assertInertia(fn (Assert $p) => $p->where('assignableSales', [])->has('customers.data', 0));
    $this->get('/transactions')->assertInertia(fn (Assert $p) => $p->where('assignableSales', [])->has('transactions.data', 0));
    $this->getJson(route('customers.history', $this->customer))->assertForbidden();
    $this->postJson(route('deals.comments.store', $this->deal), ['body' => 'Tidak sah'])->assertForbidden();
    $this->patchJson(route('comments.update', $comment), ['body' => 'Tidak sah'])->assertForbidden();
    $this->patchJson(route('customers.reassign', $this->customer), ['sales_id' => $this->replacement->id])->assertForbidden();
    expect($comment->fresh()->body)->toBe('Rahasia G09')
        ->and($comment->revisions()->count())->toBe(0)
        ->and($this->deal->comments()->count())->toBe(1)
        ->and($this->customer->fresh()->assignments()->count())->toBe(1);
    Queue::assertNothingPushed();
})->with(['membership', 'inactive-team']);

it('keeps customer and transaction permissions distinct after customer reassignment in the same session', function () {
    $this->actingAs($this->sales)->getJson(route('customers.history', $this->customer))->assertOk();
    $this->customer->assignTo($this->replacement, $this->supervisor);
    $this->getJson(route('customers.history', $this->customer))->assertForbidden();
    $this->get(route('transactions.coaching', $this->deal))->assertOk();
    $this->actingAs($this->replacement)->getJson(route('customers.history', $this->customer))->assertOk();
    $this->getJson(route('transactions.coaching', $this->deal))->assertForbidden();
});

it('revokes coaching after transaction ownership changes without accepting a new edit', function () {
    $comment = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Asli']);
    $this->actingAs($this->sales)->get(route('transactions.coaching', $this->deal))->assertOk();
    $this->deal->update(['sales_id' => $this->replacement->id]);
    $this->getJson(route('transactions.coaching', $this->deal))->assertForbidden();
    $this->postJson(route('deals.comments.store', $this->deal), ['body' => 'Tidak sah'])->assertForbidden();
    $this->patchJson(route('comments.update', $comment), ['body' => 'Tidak sah'])->assertForbidden();
    expect($comment->fresh()->body)->toBe('Asli')->and($comment->revisions()->count())->toBe(0);
    Queue::assertNothingPushed();
});

it('logs out an account deactivated between requests', function () {
    $this->actingAs($this->sales)->get('/customers')->assertOk();
    $this->sales->update(['is_active' => false]);
    $this->post(route('deals.comments.store', $this->deal), ['body' => 'Tidak sah'])->assertRedirect(route('login'));
    $this->assertGuest();
    expect($this->deal->comments()->count())->toBe(0);
    Queue::assertNothingPushed();
});

it('rejects coaching reads and edits across roles teams and dealers', function (string $kind) {
    $comment = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Rahasia G09']);
    $actor = match ($kind) {
        'manager' => User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]),
        'other-sales' => $this->replacement,
        'other-supervisor' => User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]),
        'foreign-admin' => User::factory()->admin()->create(),
    };
    $this->actingAs($actor)->getJson(route('transactions.coaching', $this->deal))->assertForbidden()->assertDontSee('Rahasia G09');
    $this->patchJson(route('comments.update', $comment), ['body' => 'Tidak sah'])->assertForbidden();
    expect($comment->fresh()->body)->toBe('Rahasia G09')->and($comment->revisions()->count())->toBe(0);
})->with(['manager', 'other-sales', 'other-supervisor', 'foreign-admin']);

it('never deletes comments or revisions through HTTP for any dealer role', function (string $role) {
    $comment = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Asli']);
    $this->actingAs($this->sales)->patch(route('comments.update', $comment), ['body' => 'Koreksi'])->assertRedirect();
    $actor = User::factory()->role(UserRole::from($role))->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($actor)->deleteJson(route('comments.update', $comment))->assertMethodNotAllowed();
    expect($comment->fresh()->body)->toBe('Koreksi')->and($comment->revisions()->count())->toBe(1);
})->with(['sales', 'supervisor', 'admin', 'branch_manager']);

it('retains inactive-team history for admin while rejecting new transactions and ordinary Delivery edits', function () {
    $this->deal->update(['current_stage' => PipelineStage::Spk]);
    $this->deal->transitionTo(PipelineStage::Do, $this->sales, options: [
        'po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true,
    ]);
    $this->deal->transitionTo(PipelineStage::Delivery, $this->sales);
    $history = $this->deal->stageHistories()->get()->toJson();
    $this->team->update(['is_active' => false]);
    $admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->actingAs($admin)->getJson(route('customers.history', $this->customer))->assertOk();
    $this->postJson(route('transactions.store'), ['existing_customer_id' => $this->customer->public_id, 'name' => $this->customer->name, 'phone' => $this->customer->phone, 'vehicle_model' => 'Baru', 'source' => 'walk_in'])->assertUnprocessable();
    foreach ([$admin, $this->sales, $this->supervisor] as $actor) {
        $this->actingAs($actor)->patchJson(route('transactions.stage', $this->deal), ['to_stage' => 'prospect'])->assertForbidden();
    }
    expect(DealTransaction::count())->toBe(1)
        ->and($this->deal->fresh()->current_stage)->toBe(PipelineStage::Delivery)
        ->and($this->deal->stageHistories()->get()->toJson())->toBe($history);
});
