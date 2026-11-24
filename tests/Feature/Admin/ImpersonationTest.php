<?php

use App\Models\AuditLog;
use App\Models\Dealer;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Inertia\Testing\AssertableInertia as Assert;

uses(RefreshDatabase::class);

beforeEach(function () {
    $this->dealer = Dealer::factory()->create();
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
});

function startImpersonating($test, User $admin, User $target): void
{
    $test->actingAs($admin)->post("/users/{$target->public_id}/impersonate")->assertRedirect('/dashboard');
}

it('lets Admin view the app as a sales user and audits it', function () {
    startImpersonating($this, $this->admin, $this->sales);

    expect(auth()->id())->toBe($this->sales->id)
        ->and(session('impersonator_id'))->toBe($this->admin->id)
        ->and(AuditLog::where('action', 'impersonation.started')
            ->where('actor_id', $this->admin->id)
            ->where('subject_public_id', $this->sales->public_id)->exists())->toBeTrue();

    $this->get('/dashboard')->assertOk()->assertInertia(fn (Assert $p) => $p
        ->where('auth.user.role', 'sales')
        ->where('auth.impersonator.name', $this->admin->name));
});

it('returns to Admin on stop and audits it', function () {
    startImpersonating($this, $this->admin, $this->sales);

    $this->post('/impersonation/stop')->assertRedirect('/users');

    expect(auth()->id())->toBe($this->admin->id)
        ->and(session()->has('impersonator_id'))->toBeFalse()
        ->and(AuditLog::where('action', 'impersonation.stopped')
            ->where('actor_id', $this->admin->id)
            ->where('subject_public_id', $this->sales->public_id)->exists())->toBeTrue();

    $this->get('/dashboard')->assertInertia(fn (Assert $p) => $p->where('auth.impersonator', null));
});

it('refuses forbidden targets', function () {
    $targets = [
        User::factory()->admin()->create(['dealer_id' => $this->dealer->id]),
        User::factory()->sales()->inactive()->create(['dealer_id' => $this->dealer->id]),
        User::factory()->sales()->create(['dealer_id' => Dealer::factory()->create()->id]),
        $this->admin,
    ];

    foreach ($targets as $target) {
        $this->actingAs($this->admin)->post("/users/{$target->public_id}/impersonate")->assertForbidden();
        expect(auth()->id())->toBe($this->admin->id);
    }

    expect(AuditLog::where('action', 'impersonation.started')->count())->toBe(0);
});

it('logs out fully when the admin is no longer an active admin', function (array $change) {
    startImpersonating($this, $this->admin, $this->sales);
    $this->admin->update($change);

    $this->post('/impersonation/stop')->assertRedirect('/login');

    $this->assertGuest();
})->with([
    'deactivated' => [['is_active' => false]],
    'demoted' => [['role' => 'sales']],
]);

it('ignores stop without an impersonation session', function () {
    $this->actingAs($this->sales)->post('/impersonation/stop')->assertRedirect('/dashboard');

    expect(auth()->id())->toBe($this->sales->id)
        ->and(AuditLog::where('action', 'impersonation.stopped')->count())->toBe(0);
});

it('marks impersonable rows on the users page', function () {
    $otherAdmin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $inactive = User::factory()->sales()->inactive()->create(['dealer_id' => $this->dealer->id]);

    $this->actingAs($this->admin)->get('/users')->assertOk()->assertInertia(function (Assert $p) use ($otherAdmin, $inactive) {
        $rows = collect($p->toArray()['props']['users'])->keyBy('id');

        expect($rows[$this->sales->public_id]['can_impersonate'])->toBeTrue()
            ->and($rows[$this->admin->public_id]['can_impersonate'])->toBeFalse()
            ->and($rows[$otherAdmin->public_id]['can_impersonate'])->toBeFalse()
            ->and($rows[$inactive->public_id]['can_impersonate'])->toBeFalse();
    });
});
