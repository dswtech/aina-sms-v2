<?php

use App\Enums\ActivityType;
use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->dealer = Dealer::factory()->create();
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model lama',
        'current_stage' => PipelineStage::Delivery,
    ]);
    $this->url = '/customers/'.$this->customer->public_id.'/history';
});

it('lists all readable transactions and selects an older closed transaction explicitly', function () {
    $new = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model baru',
    ]);
    $this->actingAs($this->sales)->getJson($this->url)->assertOk()
        ->assertJsonCount(2, 'transactions')->assertJsonPath('selected_transaction.public_id', $new->public_id);
    $this->getJson($this->url.'?transaction='.$this->deal->public_id)->assertOk()
        ->assertJsonPath('selected_transaction.public_id', $this->deal->public_id)
        ->assertJsonPath('selected_transaction.is_closed', true);
});

it('paginates all relationship activities and excludes activities of unreadable transactions', function () {
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $hidden = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $other->id, 'vehicle_model' => 'Rahasia',
    ]);
    for ($i = 0; $i < 23; $i++) {
        $this->customer->logActivity($this->sales, ActivityType::Note, 'Catatan '.$i);
    }
    $this->customer->logActivity($other, ActivityType::Note, 'Catatan rahasia', $hidden);
    $this->actingAs($this->sales)->getJson($this->url)->assertOk()
        ->assertJsonCount(1, 'transactions')->assertJsonCount(20, 'activities.data')
        ->assertJsonPath('activities.total', 23)->assertDontSee('Rahasia')->assertDontSee('Catatan rahasia');
    $this->getJson($this->url.'?activity_page=2')->assertOk()->assertJsonCount(3, 'activities.data');
    $this->getJson($this->url.'?transaction='.$hidden->public_id)->assertForbidden();
    $this->get(route('customers.index'))->assertOk()->assertDontSee('Catatan rahasia');
});

it('merges stages activities comments and replies chronologically with stable pagination', function () {
    $this->travelTo(now()->startOfDay());
    $root = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Comment first']);
    $this->travel(1)->minutes();
    $this->deal->stageHistories()->create([
        'from_stage' => 'lead', 'to_stage' => 'prospect', 'actor_id' => $this->sales->id, 'created_at' => now(),
    ]);
    $this->customer->logActivity($this->sales, ActivityType::Call, 'Called', $this->deal);
    for ($i = 0; $i < 19; $i++) {
        $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Comment '.$i]);
    }
    $this->travel(1)->minutes();
    $reply = $this->deal->comments()->create(['user_id' => $this->sales->id, 'parent_id' => $root->id, 'body' => 'Last reply']);
    $first = $this->actingAs($this->sales)->getJson($this->url)->assertOk()->assertJsonPath('timeline.total', 23)
        ->assertJsonPath('timeline.data.0.body', 'Comment first')->json('timeline.data');
    $second = $this->getJson($this->url.'?timeline_page=2')->assertOk()->json('timeline.data');
    $events = collect([...$first, ...$second]);
    expect($events->pluck('key')->unique())->toHaveCount(23)
        ->and($events->where('kind', 'stage'))->toHaveCount(1)
        ->and($events->where('kind', 'activity'))->toHaveCount(1)
        ->and($events->last()['comment']['id'])->toBe($reply->id)
        ->and($events->last()['comment']['parent_body'])->toBe('Comment first');
    expect($this->getJson($this->url)->json('timeline.data'))->toBe($first);
});

it('exposes revision contents editor and time only to an authorized admin', function () {
    $comment = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Corrected']);
    $revision = $comment->revisions()->create(['edited_by_id' => $this->sales->id, 'old_body' => 'Before edit', 'edited_at' => now()]);
    $this->actingAs($this->sales)->getJson($this->url)->assertOk()
        ->assertJsonMissingPath('timeline.data.0.comment.revisions')->assertDontSee('Before edit');
    $this->actingAs($this->admin)->getJson($this->url)->assertOk()
        ->assertJsonPath('selected_transaction.can_comment', false)
        ->assertJsonPath('timeline.data.0.comment.can_edit', false)
        ->assertJsonPath('timeline.data.0.comment.revisions.0.old_body', 'Before edit')
        ->assertJsonPath('timeline.data.0.comment.revisions.0.editor_name', $this->sales->name)
        ->assertJsonPath('timeline.data.0.comment.revisions.0.edited_at', $revision->edited_at->toIso8601String());
});

it('rechecks access on every history page and rejects foreign customers and role changes', function () {
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $manager = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    $foreign = User::factory()->admin()->create();
    foreach ([$other, $manager, $foreign] as $actor) {
        $this->actingAs($actor)->getJson($this->url.'?activity_page=2')->assertForbidden();
    }
    $this->customer->assignTo($other);
    $this->actingAs($this->sales)->getJson($this->url)->assertForbidden();
    $this->sales->update(['is_active' => false]);
    $this->getJson($this->url)->assertRedirect(route('login'));
});

it('rejects missing mismatched transactions and invalid page parameters', function () {
    $otherCustomer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $otherDeal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $otherCustomer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Other customer',
    ]);
    $this->actingAs($this->sales)->getJson($this->url.'?transaction='.$otherDeal->public_id)->assertForbidden();
    $this->getJson($this->url.'?transaction=00000000-0000-4000-8000-000000000000')->assertForbidden();
    $this->getJson($this->url.'?timeline_page=-1')->assertUnprocessable();
});

it('uses the shared timeline on coaching without exposing customer relationship after reassignment', function () {
    $this->customer->logActivity($this->sales, ActivityType::Note, 'Relationship secret');
    $this->customer->logActivity($this->sales, ActivityType::Call, 'Transaction call', $this->deal);
    $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Coaching']);
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($other);
    $this->actingAs($this->sales)->get(route('transactions.coaching', $this->deal))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->has('timeline.data', 2)->missing('customer'))
        ->assertDontSee('Relationship secret')->assertDontSee($this->customer->phone);
});

it('never reveals a malformed legacy reply parent from another transaction', function () {
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $hidden = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $other->id, 'vehicle_model' => 'Hidden',
    ]);
    $root = $hidden->comments()->create(['user_id' => $other->id, 'body' => 'Hidden parent']);
    $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Legacy reply', 'parent_id' => $root->id]);
    $this->actingAs($this->sales)->getJson($this->url)->assertOk()
        ->assertJsonPath('timeline.data.0.comment.parent_id', null)->assertDontSee('Hidden parent');
});

it('revalidates selected transaction permissions when logging activities or scheduling follow ups', function () {
    $other = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $hidden = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $other->id, 'vehicle_model' => 'Hidden',
    ]);
    $foreign = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => Customer::factory()->create(['dealer_id' => $this->dealer->id])->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Other customer',
    ]);
    foreach ([$hidden, $foreign] as $deal) {
        $this->actingAs($this->sales)->postJson(route('customers.activities.store', $this->customer), [
            'deal_transaction_id' => $deal->id, 'type' => 'note', 'notes' => 'Must not save',
        ])->assertForbidden();
        $this->postJson(route('customers.follow-ups.store', $this->customer), [
            'deal_transaction_id' => $deal->id, 'scheduled_at' => now()->addDay()->toIso8601String(), 'plan_notes' => 'Must not save',
        ])->assertForbidden();
    }
    expect($this->customer->activities()->count())->toBe(0)->and($this->customer->followUps()->count())->toBe(0);
});

it('keeps supervisor history and revision reads inside the currently assigned team and dealer', function () {
    $team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $unassigned = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->sales, $supervisor] as $member) {
        TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $member->id, 'role' => $member->role]);
    }
    $comment = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Current body']);
    $comment->revisions()->create(['edited_by_id' => $this->sales->id, 'old_body' => 'Audit only', 'edited_at' => now()]);
    $this->actingAs($supervisor)->getJson($this->url)->assertOk()->assertDontSee('Audit only');
    $this->actingAs($unassigned)->getJson($this->url)->assertForbidden();
    $this->get(route('transactions.coaching', $this->deal))->assertForbidden();
    TeamMembership::where('user_id', $supervisor->id)->update(['ended_at' => now()]);
    $this->actingAs($supervisor)->getJson($this->url.'?timeline_page=2')->assertForbidden();
});

it('audits actual consecutive edits with original bodies editors and edit timestamps', function () {
    $this->travelTo(now()->startOfMinute());
    $comment = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Original']);
    $this->actingAs($this->sales)->patch(route('comments.update', $comment), ['body' => 'Second'])->assertRedirect();
    $firstAt = now()->toIso8601String();
    $this->travel(1)->minutes();
    $this->patch(route('comments.update', $comment), ['body' => 'Final'])->assertRedirect();
    $revisions = $this->actingAs($this->admin)->getJson($this->url)->assertOk()
        ->assertJsonPath('timeline.total', 1)->assertJsonPath('timeline.data.0.body', 'Final')
        ->json('timeline.data.0.comment.revisions');
    expect(array_column($revisions, 'old_body'))->toBe(['Original', 'Second'])
        ->and(array_column($revisions, 'editor_name'))->toBe([$this->sales->name, $this->sales->name])
        ->and(array_column($revisions, 'edited_at'))->toBe([$firstAt, now()->toIso8601String()]);
    $this->get(route('transactions.coaching', $this->deal))->assertOk()
        ->assertInertia(fn (Assert $page) => $page->where('timeline.data.0.comment.revisions.0.old_body', 'Original'));
});

it('does not duplicate unbounded legacy histories in the customer list or coaching props', function () {
    for ($i = 0; $i < 25; $i++) {
        $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Comment '.$i]);
    }
    $this->actingAs($this->sales)->get(route('customers.index'))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->missing('customers.data.0.active_deal.comments')->missing('customers.data.0.stage_history')
        ->missing('customers.data.0.recent_activities'));
    $this->get(route('transactions.coaching', $this->deal))->assertOk()->assertInertia(fn (Assert $page) => $page
        ->missing('transaction.comments')->has('timeline.data', 20)->where('timeline.total', 25));
});
