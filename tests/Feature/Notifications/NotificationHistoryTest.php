<?php

use App\Enums\PipelineStage;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\DealBecameStagnant;
use App\Notifications\DealCommentCreated;
use App\Notifications\DealStageChanged;
use App\Notifications\StagnantDealsSummary;
use Carbon\CarbonImmutable;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Inertia\Testing\AssertableInertia as Assert;

function historyNote(User $user, string $type, array $data, ?CarbonInterface $at = null, bool $read = false): string
{
    $id = (string) Str::uuid();
    $at = ($at ?? now())->copy()->utc();
    DB::table('notifications')->insert([
        'id' => $id, 'type' => $type, 'notifiable_type' => User::class, 'notifiable_id' => $user->id,
        'data' => json_encode($data), 'read_at' => $read ? $at : null, 'created_at' => $at, 'updated_at' => $at,
    ]);

    return $id;
}

beforeEach(function () {
    $this->withoutVite();
    $this->travelTo(CarbonImmutable::parse('2026-11-18 10:00', 'Asia/Jakarta'));
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->manager = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->sales, $this->supervisor] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model QA', 'current_stage' => PipelineStage::Prospect,
    ]);
    $this->stagnantData = fn () => ['kind' => 'stagnant', 'title' => 'T', 'message' => 'M', 'url' => '/x', 'deal_id' => $this->deal->id, 'activity_at' => 'a'];
    $this->stageData = fn () => ['kind' => 'stage_changed', 'title' => 'T', 'message' => 'M', 'url' => '/x', 'deal_id' => $this->deal->id];
    $this->summaryData = ['kind' => 'stagnant_summary', 'title' => 'T', 'message' => 'M', 'url' => '/y', 'count' => 2];
});

it('lists three days of read and unread notifications for sales', function () {
    $comment = $this->deal->comments()->create(['user_id' => $this->supervisor->id, 'body' => 'RAHASIA']);
    // Legacy comment row: no kind and an email_status.
    historyNote($this->sales, DealCommentCreated::class, ['title' => 'Komentar', 'message' => 'M', 'url' => '/c', 'comment_id' => $comment->id, 'email_status' => 'sent'], now()->subHours(3));
    historyNote($this->sales, DealBecameStagnant::class, ($this->stagnantData)(), now()->subHours(1), read: true);
    historyNote($this->sales, DealBecameStagnant::class, ($this->stagnantData)(), now()->subDays(2));

    $this->actingAs($this->sales)->get(route('notifications.index'))->assertInertia(fn (Assert $page) => $page
        ->component('notifications/index')
        ->has('history', 3)
        ->where('history.0.data.kind', 'stagnant')->where('history.0.read_at', fn ($value) => $value !== null)
        ->where('history.1.data.title', 'Komentar')->where('history.1.read_at', null)
        ->where('truncated', false)->where('limit', 200)
        ->missing('history.0.data.deal_id'));
});

it('excludes notifications older than the three day window', function () {
    // 00:00 Jakarta is 17:00 UTC the day before; created_at is stored in UTC.
    $start = CarbonImmutable::parse('2026-11-15 00:00', 'Asia/Jakarta')->utc();
    historyNote($this->supervisor, StagnantDealsSummary::class, $this->summaryData, $start);
    historyNote($this->supervisor, StagnantDealsSummary::class, $this->summaryData, $start->subSecond());

    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('history', 1));
});

it('hides deal notifications after access is revoked', function () {
    historyNote($this->supervisor, DealStageChanged::class, ($this->stageData)());
    historyNote($this->supervisor, StagnantDealsSummary::class, $this->summaryData);
    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('history', 2)->where('notificationsUnreadCount', 2));

    TeamMembership::query()->where('user_id', $this->sales->id)->update(['ended_at' => now()]);

    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('history', 1)->where('history.0.data.kind', 'stagnant_summary')
            ->has('notifications', 1)->where('notificationsUnreadCount', 1));
});

it('shows an empty list to admin and branch manager and redirects guests', function () {
    historyNote($this->admin, StagnantDealsSummary::class, $this->summaryData);
    historyNote($this->manager, StagnantDealsSummary::class, $this->summaryData);

    foreach ([$this->admin, $this->manager] as $user) {
        $this->actingAs($user)->get(route('notifications.index'))
            ->assertInertia(fn (Assert $page) => $page->component('notifications/index')->has('history', 0));
    }
    $this->post(route('logout'));
    $this->get(route('notifications.index'))->assertRedirect(route('login'));
});

it('caps history at 200 and flags truncation', function () {
    $rows = [];
    for ($i = 0; $i < 201; $i++) {
        $rows[] = [
            'id' => (string) Str::uuid(), 'type' => StagnantDealsSummary::class, 'notifiable_type' => User::class,
            'notifiable_id' => $this->supervisor->id, 'data' => json_encode($this->summaryData),
            'read_at' => null, 'created_at' => now()->utc()->subMinutes($i), 'updated_at' => now()->utc(),
        ];
    }
    DB::table('notifications')->insert($rows);

    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('history', 200)->where('truncated', true));
});

it('shares only unread notifications of every kind with the bell and marks them read', function () {
    $unread = historyNote($this->supervisor, DealStageChanged::class, ($this->stageData)());
    historyNote($this->supervisor, StagnantDealsSummary::class, $this->summaryData, read: true);

    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('notifications', 1)->where('notifications.0.id', $unread)
            ->where('notificationsUnreadCount', 1));

    $this->actingAs($this->sales)->patch(route('notifications.read', $unread))->assertForbidden();
    $this->actingAs($this->supervisor)->patch(route('notifications.read', $unread))->assertRedirect();

    expect(DB::table('notifications')->where('id', $unread)->value('read_at'))->not->toBeNull();
    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('notifications', 0)->where('notificationsUnreadCount', 0)->has('history', 2));
});

it('limits the bell to the history window', function () {
    historyNote($this->supervisor, StagnantDealsSummary::class, $this->summaryData, now()->subDays(5));
    historyNote($this->supervisor, StagnantDealsSummary::class, $this->summaryData, now()->subHour());

    $this->actingAs($this->supervisor)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('notifications', 1)->where('notificationsUnreadCount', 1)->has('history', 1));
});
