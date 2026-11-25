<?php

use App\Enums\PipelineStage;
use App\Models\AuditLog;
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
    Queue::fake();
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    foreach (['sales', 'otherSales'] as $name) {
        $this->{$name} = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    }
    foreach (['supervisor', 'secondSupervisor', 'otherSupervisor'] as $name) {
        $this->{$name} = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    }
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->manager = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    foreach ([[$this->team, 'sales'], [$this->team, 'supervisor'], [$this->team, 'secondSupervisor'], [$this->otherTeam, 'otherSales'], [$this->otherTeam, 'otherSupervisor']] as [$team, $name]) {
        TeamMembership::factory()->create(['team_id' => $team->id, 'user_id' => $this->{$name}->id, 'role' => $this->{$name}->role]);
    }
    $this->deal = coachingDeal($this->sales, 'Budi Santoso', 'Avanza G');
});

function coachingDeal(User $sales, string $customer, string $model, array $extra = []): DealTransaction
{
    $owner = Customer::factory()->create(['dealer_id' => $sales->dealer_id, 'name' => $customer]);
    $owner->assignTo($sales);

    return DealTransaction::create(['dealer_id' => $sales->dealer_id, 'customer_id' => $owner->id, 'sales_id' => $sales->id,
        'vehicle_model' => $model, 'current_stage' => PipelineStage::Prospect, ...$extra]);
}

function coachingSays(DealTransaction $deal, User $author, string $body): int
{
    return $deal->comments()->create(['user_id' => $author->id, 'body' => $body])->id;
}

/** @return array<string, mixed> */
function coachingProps(User $actor, string $query = ''): array
{
    return test()->actingAs($actor)->get('/coaching'.$query)->assertOk()->viewData('page')['props'];
}

/** @return list<string> */
function coachingNames(User $actor, string $query = ''): array
{
    return array_column(coachingProps($actor, $query)['conversations']['data'], 'customer_name');
}

it('gives the turn to the side that did not write the last comment', function () {
    coachingSays($this->deal, $this->supervisor, 'Sudah ditawarkan?');
    expect(coachingNames($this->sales))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->supervisor))->toBe([])
        ->and(coachingNames($this->supervisor, '?tab=sales'))->toBe(['Budi Santoso'])
        ->and(coachingProps($this->sales)['counts'])->toBe(['supervisor' => 0, 'sales' => 1]);

    coachingSays($this->deal, $this->sales, 'Sudah, minta tenor lain');
    expect(coachingNames($this->sales))->toBe([])
        ->and(coachingNames($this->supervisor))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->admin))->toBe(['Budi Santoso']);

    // Any supervisor of the team answers for the team.
    coachingSays($this->deal, $this->secondSupervisor, 'Coba leasing lain');
    expect(coachingNames($this->supervisor))->toBe([])->and(coachingNames($this->sales))->toBe(['Budi Santoso']);
});

it('keeps an unanswered conversation listed however old it is', function () {
    coachingSays($this->deal, $this->supervisor, 'Lama');
    $this->travel(30)->days();
    expect(coachingNames($this->sales))->toBe(['Budi Santoso']);
});

it('lists only conversations the actor may open and only deals that have comments', function () {
    coachingSays($this->deal, $this->supervisor, 'Rahasia tim satu');
    coachingDeal($this->sales, 'Tanpa Komentar', 'Rush');
    $foreign = coachingDeal($this->otherSales, 'Tim Lain', 'Calya');
    coachingSays($foreign, $this->otherSupervisor, 'Rahasia tim dua');
    $otherDealer = User::factory()->sales()->create();
    coachingSays(coachingDeal($otherDealer, 'Dealer Lain', 'Agya'), $otherDealer, 'Rahasia dealer lain');

    expect(coachingNames($this->sales))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->supervisor, '?tab=sales'))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->otherSupervisor, '?tab=sales'))->toBe(['Tim Lain'])
        ->and(coachingNames($this->admin, '?tab=sales'))->toEqualCanonicalizing(['Budi Santoso', 'Tim Lain'])
        ->and(coachingNames($this->admin, '?search=lain'))->toBe(['Tim Lain']);

    $this->actingAs($this->manager)->get('/coaching')->assertForbidden()->assertDontSee('Rahasia');
    $this->deal->delete();
    expect(coachingNames($this->sales))->toBe([]);
});

it('drops a conversation from the old sales and keeps its turn after reassignment', function () {
    coachingSays($this->deal, $this->sales, 'Pertanyaan');
    $next = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $next->id, 'role' => $next->role]);
    $this->deal->update(['sales_id' => $next->id]);
    expect(coachingNames($this->sales, '?tab=supervisor'))->toBe([])
        ->and(coachingNames($next, '?tab=supervisor'))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->supervisor))->toBe(['Budi Santoso']);
});

it('uses the highest comment id when two comments share a second', function () {
    $this->travelTo(now()->startOfSecond());
    coachingSays($this->deal, $this->supervisor, 'Pertama');
    coachingSays($this->deal, $this->sales, 'Kedua');
    expect(coachingNames($this->supervisor))->toBe(['Budi Santoso'])->and(coachingNames($this->sales))->toBe([]);
});

it('lets only a supervisor of the team close and reopen a conversation', function () {
    $last = coachingSays($this->deal, $this->sales, 'ISI-RAHASIA');
    $payload = ['closed' => true, 'last_comment_id' => $last];
    foreach ([$this->sales, $this->admin, $this->manager, $this->otherSupervisor] as $actor) {
        $this->actingAs($actor)->patchJson(route('transactions.coaching.update', $this->deal), $payload)->assertForbidden();
    }
    expect($this->deal->fresh()->coaching_closed_at)->toBeNull();

    $this->actingAs($this->supervisor)->patch(route('transactions.coaching.update', $this->deal), $payload)->assertRedirect();
    expect($this->deal->fresh()->coaching_closed_at)->not->toBeNull()
        ->and(coachingNames($this->supervisor))->toBe([])
        ->and(coachingNames($this->supervisor, '?tab=done'))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->sales, '?tab=done'))->toBe(['Budi Santoso']);

    $this->actingAs($this->secondSupervisor)->patch(route('transactions.coaching.update', $this->deal), ['closed' => false])->assertRedirect();
    expect($this->deal->fresh()->coaching_closed_at)->toBeNull()
        ->and(AuditLog::query()->whereIn('action', ['coaching.closed', 'coaching.reopened'])->orderBy('id')->pluck('action')->all())->toBe(['coaching.closed', 'coaching.reopened'])
        ->and(json_encode(AuditLog::query()->where('action', 'coaching.closed')->sole()->metadata))->not->toContain('ISI-RAHASIA');
});

it('refuses to close when a newer comment arrived and reopens on any new comment', function () {
    $seen = coachingSays($this->deal, $this->supervisor, 'Arahan');
    $newer = coachingSays($this->deal, $this->sales, 'Balasan baru');
    $url = route('transactions.coaching.update', $this->deal);
    $this->actingAs($this->supervisor)->patchJson($url, ['closed' => true, 'last_comment_id' => $seen])
        ->assertUnprocessable()->assertJsonValidationErrors('last_comment_id');
    $this->patchJson($url, ['closed' => true])->assertUnprocessable();
    expect($this->deal->fresh()->coaching_closed_at)->toBeNull();

    foreach ([$this->sales, $this->supervisor] as $author) {
        $this->deal->update(['coaching_closed_at' => now()]);
        $this->actingAs($author)->post(route('deals.comments.store', $this->deal), ['body' => 'Lanjut'])->assertRedirect();
        expect($this->deal->fresh()->coaching_closed_at)->toBeNull();
    }
    expect($newer)->toBeGreaterThan($seen);
});

it('never closes while an admin views the app as the supervisor', function () {
    $last = coachingSays($this->deal, $this->sales, 'Halo');
    $this->actingAs($this->admin)->post("/users/{$this->supervisor->public_id}/impersonate")->assertRedirect();
    $this->patch(route('transactions.coaching.update', $this->deal), ['closed' => true, 'last_comment_id' => $last]);
    expect($this->deal->fresh()->coaching_closed_at)->toBeNull();
});

it('searches customer and vehicle names across every status literally', function () {
    coachingSays($this->deal, $this->supervisor, 'A');
    $done = coachingDeal($this->sales, 'Dedi 100%', 'Innova_Z', ['coaching_closed_at' => now()]);
    coachingSays($done, $this->supervisor, 'B');
    expect(coachingNames($this->sales, '?search=BUDI'))->toBe(['Budi Santoso'])
        ->and(coachingNames($this->sales, '?search=innova'))->toBe(['Dedi 100%'])
        ->and(coachingNames($this->sales, '?search='.urlencode('%')))->toBe(['Dedi 100%'])
        ->and(coachingNames($this->sales, '?search=_'))->toBe(['Dedi 100%'])
        ->and(coachingProps($this->sales, '?search=innova')['conversations']['data'][0]['status'])->toBe('done');
    $this->actingAs($this->sales)->get('/coaching?tab=salah')->assertSessionHasErrors('tab');
    $this->get('/coaching?search[]=x')->assertSessionHasErrors('search');
});

it('shows the deal and its financing without contact data', function () {
    $leasing = DB::table('leasing_companies')->insertGetId(['dealer_id' => $this->dealer->id, 'code' => 'uji', 'name' => 'Leasing Uji', 'is_active' => false]);
    $this->deal->update(['financing_type' => 'credit', 'leasing_id' => $leasing, 'tenor_months' => 48, 'insurance_type' => 'all_risk']);
    coachingSays($this->deal, $this->supervisor, 'Sudah ditawarkan?');
    $this->actingAs($this->sales)->get(route('transactions.coaching', $this->deal))->assertOk()
        ->assertDontSee($this->deal->customer->phone)
        ->assertInertia(fn (Assert $page) => $page->component('transactions/coaching')
            ->where('conversations.data.0.customer_name', 'Budi Santoso')
            ->where('conversations.data.0.financing.leasing_name', 'Leasing Uji')
            ->where('conversations.data.0.sales_name', $this->sales->name)
            ->where('conversations.data.0.author_name', $this->supervisor->name)
            ->where('conversations.data.0.excerpt', 'Sudah ditawarkan?')
            ->where('transaction.customer_name', 'Budi Santoso')
            ->where('transaction.financing.type', 'credit')
            ->where('transaction.financing.tenor_months', 48)
            ->where('transaction.closed', false)
            ->where('transaction.can_close', false)
            ->missing('transaction.phone'));
    $this->actingAs($this->supervisor)->get(route('transactions.coaching', $this->deal))
        ->assertInertia(fn (Assert $page) => $page->where('transaction.can_close', true));
});

it('opens a deal without comments and starts on the tab of the opened conversation', function () {
    $this->actingAs($this->sales)->get(route('transactions.coaching', $this->deal))
        ->assertInertia(fn (Assert $page) => $page->where('transaction.last_comment_id', null)->where('tab', 'sales')->has('timeline.data', 0));
    coachingSays($this->deal, $this->sales, 'Tanya');
    $this->get(route('transactions.coaching', $this->deal))->assertInertia(fn (Assert $page) => $page->where('tab', 'supervisor'));
    $this->get(route('transactions.coaching', $this->deal).'?tab=sales')->assertInertia(fn (Assert $page) => $page->where('tab', 'sales'));
    $this->get('/coaching')->assertInertia(fn (Assert $page) => $page->where('tab', 'sales')->where('transaction', null)->where('timeline', null));
});

it('pages the newest messages first and marks the reader and the author role', function () {
    foreach (range(1, 25) as $i) {
        coachingSays($this->deal, $i % 2 ? $this->sales : $this->supervisor, 'Pesan '.$i);
    }
    $this->actingAs($this->sales)->get(route('transactions.coaching', $this->deal))
        ->assertInertia(fn (Assert $page) => $page->has('timeline.data', 20)
            ->where('timeline.data.0.body', 'Pesan 25')->where('timeline.data.0.comment.is_mine', true)
            ->where('timeline.data.0.comment.author_role', 'sales')
            ->where('timeline.data.1.comment.is_mine', false)->where('timeline.data.1.comment.author_role', 'supervisor'));
    $this->getJson(route('transactions.feed', $this->deal).'?kind=all&page=2')->assertOk()
        ->assertJsonCount(5, 'data')->assertJsonPath('data.4.body', 'Pesan 1');
    $this->actingAs($this->otherSales)->getJson(route('transactions.feed', $this->deal).'?kind=all')->assertForbidden();
});

it('lists the newest conversation first without a query per row', function () {
    foreach (range(1, 22) as $i) {
        $this->travel(1)->minutes();
        coachingSays(coachingDeal($this->sales, 'Pelanggan '.$i, 'Rush'), $this->supervisor, 'Isi '.$i);
    }
    DB::enableQueryLog();
    $props = coachingProps($this->sales);
    $many = count(DB::getQueryLog());
    expect(array_column($props['conversations']['data'], 'customer_name'))->toHaveCount(20)
        ->and($props['conversations']['data'][0]['customer_name'])->toBe('Pelanggan 22')
        ->and($many)->toBeLessThan(25)
        ->and(coachingNames($this->sales, '?page=2'))->toBe(['Pelanggan 2', 'Pelanggan 1']);
});

it('starts finished deals with comments as closed when the column is added', function () {
    $migration = require database_path('migrations/2026_11_25_110000_add_coaching_closed_at_to_deal_transactions_table.php');
    $lost = coachingDeal($this->sales, 'Lost', 'Rush', ['current_stage' => 'lost']);
    $quiet = coachingDeal($this->sales, 'Lost tanpa komentar', 'Rush', ['current_stage' => 'lost']);
    coachingSays($lost, $this->supervisor, 'Catat alasan');
    coachingSays($this->deal, $this->supervisor, 'Masih jalan');
    $migration->down();
    $migration->up();
    expect($lost->fresh()->coaching_closed_at)->not->toBeNull()
        ->and($quiet->fresh()->coaching_closed_at)->toBeNull()
        ->and($this->deal->fresh()->coaching_closed_at)->toBeNull();
});
