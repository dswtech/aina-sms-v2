<?php

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use App\Services\UsernameReservations;
use App\Support\UsernameExhausted;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Str;

beforeEach(function () {
    Notification::fake();
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
});

function invite(array $overrides = [], array $headers = [])
{
    return test()->actingAs(test()->admin)->post(route('invitations.store'), array_merge([
        'name' => 'Siti Rahmawati',
        'email' => Str::random(8).'@example.test',
        'role' => UserRole::Sales->value,
        'team_id' => test()->team->id,
    ], $overrides), $headers);
}

function reservedNames(): array
{
    return DB::table('username_reservations')->orderBy('username')->pluck('username')->all();
}

it('generates and reserves a username when an invitation is created', function () {
    invite()->assertRedirect()->assertSessionHasNoErrors();

    $invitation = Invitation::query()->sole();
    expect($invitation->username)->toMatch('/^[a-z][a-z0-9]{5,11}$/')
        ->and(reservedNames())->toBe([$invitation->username]);
});

it('gives two invitations for the same name different usernames', function () {
    invite()->assertSessionHasNoErrors();
    invite()->assertSessionHasNoErrors();

    $usernames = Invitation::query()->pluck('username');
    expect($usernames->unique())->toHaveCount(2)
        ->and(reservedNames())->toBe($usernames->sort()->values()->all());
});

it('rejects a name without Latin letters before reserving anything', function () {
    invite(['name' => '山田 太郎 123'])->assertSessionHasErrors('name');

    expect(Invitation::query()->count())->toBe(0)
        ->and(reservedNames())->toBe([]);
});

it('treats accounts, pending invitations without a hold, and holds as taken', function () {
    User::factory()->create(['username' => 'existing']);
    Invitation::factory()->create(['username' => 'pendingold']);
    Invitation::factory()->create(['username' => 'revokedname', 'revoked_at' => now()]);
    DB::table('username_reservations')->insert(['username' => 'heldname']);
    $usernames = app(UsernameReservations::class);

    expect($usernames->taken('existing'))->toBeTrue()
        ->and($usernames->taken('pendingold'))->toBeTrue()
        ->and($usernames->taken('heldname'))->toBeTrue()
        ->and($usernames->taken('revokedname'))->toBeFalse();
});

it('leaves no hold behind when the creating transaction rolls back', function () {
    try {
        DB::transaction(function () {
            app(UsernameReservations::class)->reserve('Siti Rahmawati');
            throw new RuntimeException('account creation failed');
        });
    } catch (RuntimeException) {
    }

    expect(reservedNames())->toBe([]);
});

it('releases the hold when the invitation is accepted, revoked, or its team is deactivated', function () {
    $plainToken = Str::random(64);
    $accepted = Invitation::factory()->create(['dealer_id' => $this->dealer->id, 'team_id' => $this->team->id,
        'role' => UserRole::Sales, 'username' => 'acceptme', 'token_hash' => hash('sha256', $plainToken)]);
    $revoked = Invitation::factory()->create(['dealer_id' => $this->dealer->id, 'username' => 'revokeme']);
    $otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    Invitation::factory()->create(['dealer_id' => $this->dealer->id, 'team_id' => $otherTeam->id,
        'role' => UserRole::Sales, 'username' => 'teamgone']);
    DB::table('username_reservations')->insert([['username' => 'acceptme'], ['username' => 'revokeme'], ['username' => 'teamgone']]);

    $this->post(route('invitations.accept', $plainToken), [
        'password' => 'StrongPassword123!', 'password_confirmation' => 'StrongPassword123!',
    ])->assertRedirect(route('login'));
    expect(reservedNames())->toBe(['revokeme', 'teamgone'])
        ->and($accepted->fresh()->accepted_at)->not->toBeNull();

    $this->actingAs($this->admin)->patch(route('invitations.revoke', $revoked))->assertRedirect();
    expect(reservedNames())->toBe(['teamgone']);

    $this->actingAs($this->admin)->patch(route('teams.update', $otherTeam), ['name' => $otherTeam->name, 'is_active' => false])
        ->assertRedirect();
    expect(reservedNames())->toBe([]);
});

it('reports exhaustion as a form error for Inertia and 409 otherwise', function () {
    // "Al Bo" can only become boal or albo plus two digits: hold all 200 to exhaust every attempt.
    $rows = [];
    foreach (['boal', 'albo'] as $letters) {
        foreach (range(0, 99) as $number) {
            $rows[] = ['username' => $letters.str_pad((string) $number, 2, '0', STR_PAD_LEFT)];
        }
    }
    DB::table('username_reservations')->insert($rows);

    invite(['name' => 'Al Bo'], ['X-Inertia' => 'true'])
        ->assertRedirect()
        ->assertSessionHasErrors(['name' => UsernameExhausted::MESSAGE]);

    invite(['name' => 'Al Bo'])->assertStatus(409);

    expect(Invitation::query()->count())->toBe(0)
        ->and(DB::table('username_reservations')->count())->toBe(200);
});
