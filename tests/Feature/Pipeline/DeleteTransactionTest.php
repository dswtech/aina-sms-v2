<?php

use App\Enums\PipelineStage;
use App\Models\AuditLog;
use App\Models\Customer;
use App\Models\CustomerActivity;
use App\Models\DealComment;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\FollowUp;
use App\Models\StageHistory;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Services\StageAchievements;
use App\Services\TargetHistory;
use App\Services\TeamPerformance;
use App\Services\TransactionReports;
use App\Support\ReportingPeriod;
use Carbon\CarbonImmutable;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->travelTo(CarbonImmutable::parse('2026-11-25 10:00', 'Asia/Jakarta'));
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->supervisor, $this->sales] as $user) {
        TeamMembership::create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role, 'started_at' => now()->subYear()]);
    }
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id, 'name' => 'Budi Ganda']);
    $this->customer->assignTo($this->sales);
    $this->deal = deletableDeal($this, 'lead');
});

function deletableDeal($t, string $stage, ?CarbonImmutable $createdAt = null): DealTransaction
{
    $deal = DealTransaction::create(['dealer_id' => $t->dealer->id, 'team_id' => $t->team->id, 'customer_id' => $t->customer->id,
        'sales_id' => $t->sales->id, 'vehicle_model' => 'Avanza', 'current_stage' => $stage, 'financing_type' => 'cash']);
    if ($createdAt !== null) {
        $deal->forceFill(['created_at' => $createdAt->utc()])->save();
    }

    return $deal;
}

it('lets Admin and the team Supervisor delete a transaction', function (string $role) {
    $this->actingAs($this->$role)->getJson(route('transactions.show', $this->deal))->assertJsonPath('can_delete', true);
    $this->delete(route('transactions.destroy', $this->deal), ['reason' => 'Double input'])
        ->assertRedirect()->assertSessionHasNoErrors();

    expect(DealTransaction::query()->whereKey($this->deal->id)->exists())->toBeFalse()
        ->and(DealTransaction::withTrashed()->whereKey($this->deal->id)->exists())->toBeTrue();

    $log = AuditLog::query()->where('action', 'transaction.deleted')->sole();
    expect($log->actor_id)->toBe($this->$role->id)
        ->and($log->subject_public_id)->toBe($this->customer->public_id)
        ->and($log->metadata['context'])->toBe(['transaction_public_id' => $this->deal->public_id, 'reason' => 'Double input']);

    $this->deleteJson(route('transactions.destroy', $this->deal), ['reason' => 'Lagi'])->assertNotFound();
})->with(['admin', 'supervisor']);

it('refuses everyone else', function () {
    $otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    TeamMembership::create(['team_id' => $otherTeam->id, 'user_id' => $otherSupervisor->id, 'role' => $otherSupervisor->role, 'started_at' => now()->subYear()]);
    $actors = [
        $this->sales,
        $otherSupervisor,
        User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]),
        User::factory()->admin()->create(['dealer_id' => Dealer::factory()->create()->id]),
    ];

    foreach ($actors as $actor) {
        $this->actingAs($actor)->deleteJson(route('transactions.destroy', $this->deal), ['reason' => 'Double input'])->assertForbidden();
    }
    $this->actingAs($this->sales)->getJson(route('transactions.show', $this->deal))->assertJsonPath('can_delete', false);
    expect($this->deal->fresh()->trashed())->toBeFalse()->and(AuditLog::query()->count())->toBe(0);
});

it('requires a reason', function (?string $reason) {
    $this->actingAs($this->admin)->deleteJson(route('transactions.destroy', $this->deal), ['reason' => $reason])
        ->assertUnprocessable()->assertJsonValidationErrors('reason');
    expect($this->deal->fresh()->trashed())->toBeFalse();
})->with([null, '   ', fn () => str_repeat('a', 2001)]);

it('deletes any stage but only a transaction created in the current Jakarta month', function (string $stage) {
    $start = CarbonImmutable::parse('2026-11-01 00:00', 'Asia/Jakarta');
    $thisMonth = deletableDeal($this, $stage, $start);
    $lastMonth = deletableDeal($this, $stage, $start->subSecond());

    $this->actingAs($this->supervisor)->getJson(route('transactions.show', $lastMonth))->assertJsonPath('can_delete', false);
    $this->deleteJson(route('transactions.destroy', $lastMonth), ['reason' => 'Double input'])->assertForbidden();
    $this->delete(route('transactions.destroy', $thisMonth), ['reason' => 'Double input'])->assertRedirect();

    expect($lastMonth->fresh()->trashed())->toBeFalse()->and($thisMonth->fresh()->trashed())->toBeTrue();
})->with(['lead', 'spk', 'do', 'lost']);

it('drops a deleted DO from lists, exports and every report', function () {
    $do = deletableDeal($this, 'do');
    foreach (['lead', 'prospect', 'spk', 'do'] as $stage) {
        StageHistory::create(['deal_transaction_id' => $do->id, 'to_stage' => $stage, 'actor_id' => $this->sales->id, 'created_at' => now(),
            ...($stage === 'do' ? ['po_confirmed' => true, 'dp_confirmed' => true, 'unit_confirmed' => true] : [])]);
    }
    $this->deal->update(['vehicle_model' => 'Innova']);
    $this->actingAs($this->supervisor);
    $figures = fn (): array => [
        'achievement' => app(StageAchievements::class)->bySales($this->supervisor, new ReportingPeriod('2026-11'))['totals']['do'],
        'history' => collect(app(TargetHistory::class)->build($this->supervisor, '2026-11', '2026-11'))->toJson(),
        'performance' => collect(app(TeamPerformance::class)->build($this->supervisor, '2026-11'))->toJson(),
        'financing' => collect(app(TransactionReports::class)->financing($this->supervisor, '2026-11', '2026-11', 'do'))->toJson(),
        'prospects' => collect(app(TransactionReports::class)->financing($this->supervisor, '2026-11', '2026-11', 'prospect'))->toJson(),
        'area' => app(TransactionReports::class)->mappingArea($this->supervisor, '2026-11', '2026-11')['unverified'] + app(TransactionReports::class)->mappingArea($this->supervisor, '2026-11', '2026-11')['total'],
        'csv' => $this->get(route('transactions.export'))->streamedContent(),
    ];
    $before = $figures();
    $this->delete(route('transactions.destroy', $do), ['reason' => 'Double input'])->assertRedirect();
    $after = $figures();

    expect($before['achievement'])->toBe(1)->and($after['achievement'])->toBe(0)
        ->and($before['area'])->toBe(1)->and($after['area'])->toBe(0)
        ->and($before['csv'])->toContain('Avanza')->and($after['csv'])->not->toContain('Avanza')->toContain('Innova');
    foreach (['history', 'performance', 'financing', 'prospects'] as $report) {
        expect($after[$report])->not->toBe($before[$report], $report);
    }
    $this->get(route('transactions.index', ['date_from' => '', 'date_to' => '']))
        ->assertInertia(fn (Assert $p) => $p->where('transactions.total', 1));
});

it('keeps the record behind a deleted transaction and cancels only its pending follow-ups', function () {
    $other = deletableDeal($this, 'prospect');
    $history = StageHistory::create(['deal_transaction_id' => $this->deal->id, 'to_stage' => 'lead', 'actor_id' => $this->sales->id, 'created_at' => now()]);
    $comment = DealComment::create(['deal_transaction_id' => $this->deal->id, 'user_id' => $this->supervisor->id, 'body' => 'Tolong cek', 'stage_at_creation' => PipelineStage::Lead]);
    $activity = CustomerActivity::create(['customer_id' => $this->customer->id, 'deal_transaction_id' => $this->deal->id, 'user_id' => $this->sales->id, 'type' => 'call', 'notes' => 'Telepon', 'occurred_at' => now()]);
    $plan = fn (?DealTransaction $deal): FollowUp => $this->customer->scheduleFollowUp($this->sales, $this->sales, now()->addDay(), 'Hubungi', $deal);
    [$pending, $otherPending, $loose] = [$plan($this->deal), $plan($other), $plan(null)];

    $this->actingAs($this->supervisor)->delete(route('transactions.destroy', $this->deal), ['reason' => 'Double input'])->assertRedirect();

    expect($history->fresh())->not->toBeNull()->and($activity->fresh()->deal_transaction_id)->toBe($this->deal->id)
        ->and($pending->fresh()->status)->toBe('cancelled')->and($pending->fresh()->cancel_reason)->toBe('Transaksi dihapus')
        ->and($otherPending->fresh()->status)->toBe('pending')->and($loose->fresh()->status)->toBe('pending');

    // The author is still inside the five-minute edit window, so only the missing deal can refuse this.
    $this->patchJson(route('comments.update', $comment), ['body' => 'Diubah'])->assertForbidden();
    $this->getJson(route('transactions.show', $this->deal))->assertNotFound();
    $this->get(route('transactions.coaching', $this->deal))->assertNotFound();
    expect($comment->fresh()->body)->toBe('Tolong cek');
});

it('keeps a customer whose only transaction was deleted', function () {
    $this->actingAs($this->admin)->delete(route('transactions.destroy', $this->deal), ['reason' => 'Double input'])->assertRedirect();

    $this->get(route('customers.index'))->assertInertia(fn (Assert $p) => $p
        ->where('customers.data.0.name', 'Budi Ganda')->where('customers.data.0.active_deal', null));
    $this->getJson(route('customers.history', $this->customer))->assertOk()->assertJsonPath('transactions', []);
});

it('refuses deletion while an Admin views the app as a Supervisor', function () {
    $this->actingAs($this->admin)->post("/users/{$this->supervisor->public_id}/impersonate")->assertRedirect('/dashboard');
    $this->delete(route('transactions.destroy', $this->deal), ['reason' => 'Double input']);

    expect($this->deal->fresh()->trashed())->toBeFalse();
});
