<?php

use App\Enums\ActivityType;
use App\Enums\UserRole;
use App\Models\Customer;
use App\Models\Dealer;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use Carbon\CarbonImmutable;
use Inertia\Testing\AssertableInertia as Assert;

function calendarMember(Team $team, User $user, UserRole $role): void
{
    TeamMembership::create(['team_id' => $team->id, 'user_id' => $user->id, 'role' => $role, 'started_at' => now()]);
}

function calendarCustomer(User $sales, string $name): Customer
{
    $customer = Customer::factory()->create(['dealer_id' => $sales->dealer_id, 'name' => $name]);
    $customer->assignTo($sales);

    return $customer;
}

function calendarFixture(): array
{
    $dealer = Dealer::factory()->create();
    [$teamA, $teamB, $teamC] = Team::factory()->count(3)->sequence(['name' => 'Tim A'], ['name' => 'Tim B'], ['name' => 'Tim C'])->create(['dealer_id' => $dealer->id]);
    $supervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $dealer->id]);
    $a = User::factory()->sales()->create(['dealer_id' => $dealer->id, 'name' => 'Ani']);
    $b = User::factory()->sales()->create(['dealer_id' => $dealer->id, 'name' => 'Bima']);
    $c = User::factory()->sales()->create(['dealer_id' => $dealer->id, 'name' => 'Citra']);
    calendarMember($teamA, $supervisor, UserRole::Supervisor);
    calendarMember($teamB, $supervisor, UserRole::Supervisor);
    calendarMember($teamC, $otherSupervisor, UserRole::Supervisor);
    calendarMember($teamA, $a, UserRole::Sales);
    calendarMember($teamB, $b, UserRole::Sales);
    calendarMember($teamC, $c, UserRole::Sales);

    return compact('dealer', 'teamA', 'teamB', 'teamC', 'supervisor', 'otherSupervisor', 'a', 'b', 'c');
}

beforeEach(function () {
    $this->withoutVite();
    // 14 Nov 2026 11:20 WIB.
    $this->travelTo(CarbonImmutable::parse('2026-11-14 04:20:00', 'UTC'));
});

it('shows a sales person only their own plans and real activities within the Jakarta month', function () {
    $f = calendarFixture();
    $budi = calendarCustomer($f['a'], 'Budi');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-10 02:00:00', 'UTC'), 'Kirim simulasi');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-20 03:30:00', 'UTC'), 'Test drive');
    // 30 Nov 23:30 WIB is inside November; 1 Dec 00:00 WIB and 31 Oct 23:59 WIB are not.
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-30 16:30:00', 'UTC'), 'Akhir bulan');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-30 17:00:00', 'UTC'), 'Bulan depan');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-10-31 16:59:59', 'UTC'), 'Bulan lalu');
    $budi->logActivity($f['a'], ActivityType::Visit, 'Kunjungan rumah', null, CarbonImmutable::parse('2026-11-12 03:00:00', 'UTC'));
    $budi->logActivity($f['a'], ActivityType::StageChange, 'Sistem', null, CarbonImmutable::parse('2026-11-12 04:00:00', 'UTC'));
    calendarCustomer($f['b'], 'Dewi')->scheduleFollowUp($f['b'], $f['b'], CarbonImmutable::parse('2026-11-11 02:00:00', 'UTC'), 'Orang lain');

    $this->actingAs($f['a'])->get('/kalender')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->component('calendar/index')
        ->where('view', 'month')->where('date', '2026-11-14')->where('today', '2026-11-14')->where('now', '11:20')
        ->where('rows', null)->where('teams', [])
        ->has('items', 4)
        ->where('items.0', [
            'id' => 'plan-1', 'kind' => 'plan', 'type' => 'plan', 'type_label' => 'Rencana', 'user_id' => $f['a']->id,
            'date' => '2026-11-10', 'time' => '09:00', 'customer' => 'Budi', 'customer_id' => $budi->public_id, 'notes' => 'Kirim simulasi', 'overdue' => true,
            'status' => 'pending', 'follow_up_id' => 1,
        ])
        ->where('items.1.kind', 'done')->where('items.1.type', 'visit')->where('items.1.type_label', 'Kunjungan')
        ->where('items.1.date', '2026-11-12')->where('items.1.time', '10:00')->where('items.1.overdue', false)
        ->where('items.2.notes', 'Test drive')->where('items.2.overdue', false)
        ->where('items.3.date', '2026-11-30')->where('items.3.time', '23:30'));
});

it('limits the day view to one Jakarta calendar day', function () {
    $f = calendarFixture();
    $budi = calendarCustomer($f['a'], 'Budi');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-13 16:59:59', 'UTC'), 'Kemarin');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-13 17:00:00', 'UTC'), 'Awal hari');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-14 16:59:59', 'UTC'), 'Akhir hari');
    $budi->scheduleFollowUp($f['a'], $f['a'], CarbonImmutable::parse('2026-11-14 17:00:00', 'UTC'), 'Besok');

    $this->actingAs($f['a'])->get('/kalender?view=day&date=2026-11-14')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('view', 'day')
        ->where('items', fn ($items) => collect($items)->pluck('notes')->all() === ['Awal hari', 'Akhir hari']));
});

it('gives a supervisor rows and items for the sales of the teams they supervise only', function () {
    $f = calendarFixture();
    foreach (['a', 'b', 'c'] as $key) {
        calendarCustomer($f[$key], 'Pelanggan '.$key)
            ->logActivity($f[$key], ActivityType::Call, 'Telepon '.$key, null, CarbonImmutable::parse('2026-11-05 03:00:00', 'UTC'));
    }
    $f['supervisor']->refresh();

    $this->actingAs($f['supervisor'])->get('/kalender')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('teams', [
            ['id' => $f['teamA']->public_id, 'name' => 'Tim A', 'count' => 1],
            ['id' => $f['teamB']->public_id, 'name' => 'Tim B', 'count' => 1],
        ])
        ->where('team', null)
        ->where('rows', [
            ['id' => $f['a']->id, 'name' => 'Ani', 'team' => 'Tim A'],
            ['id' => $f['b']->id, 'name' => 'Bima', 'team' => 'Tim B'],
        ])
        ->where('items', fn ($items) => collect($items)->pluck('notes')->sort()->values()->all() === ['Telepon a', 'Telepon b']));

    $this->get('/kalender?team='.$f['teamB']->public_id)->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('team', $f['teamB']->public_id)
        ->has('teams', 2)
        ->where('rows', [['id' => $f['b']->id, 'name' => 'Bima', 'team' => 'Tim B']])
        ->where('items', fn ($items) => collect($items)->pluck('notes')->all() === ['Telepon b']));

    $this->get('/kalender?team='.$f['teamC']->public_id)->assertNotFound();
});

it('hides inactive and departed sales from the supervisor grid', function () {
    $f = calendarFixture();
    $f['b']->update(['is_active' => false]);
    TeamMembership::where('user_id', $f['a']->id)->update(['ended_at' => now()]);

    $this->actingAs($f['supervisor'])->get('/kalender')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('rows', [])->where('items', [])
        ->where('teams.0.count', 0)->where('teams.1.count', 0));
});

it('rejects invalid calendar parameters', function () {
    $f = calendarFixture();
    $this->actingAs($f['a'])->get('/kalender?view=week')->assertSessionHasErrors('view');
    $this->get('/kalender?date=2026-13-01')->assertSessionHasErrors('date');
});
