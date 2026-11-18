<?php

use App\Models\User;
use App\Notifications\ReleaseAnnounced;
use Illuminate\Notifications\DatabaseNotification;

function releaseEntry(string $version, bool $notify = true): array
{
    return ['version' => $version, 'date' => '2026-11-18', 'notify' => $notify, 'summary' => 'Ringkasan '.$version, 'items' => ['Satu poin.']];
}

function releaseNotesFor(User $user, string $version): int
{
    return $user->notifications()->where('type', ReleaseAnnounced::class)->get()
        ->filter(fn (DatabaseNotification $n): bool => $n->data['version'] === $version)->count();
}

beforeEach(function () {
    $this->active = [
        User::factory()->sales()->create(), User::factory()->supervisor()->create(),
        User::factory()->branchManager()->create(), User::factory()->admin()->create(),
    ];
    $this->inactive = User::factory()->sales()->inactive()->create();
});

it('notifies every active user of the current release once', function () {
    config(['releases' => [releaseEntry('9.9.9')]]);

    $this->artisan('release:announce')->assertSuccessful();
    foreach ($this->active as $user) {
        expect(releaseNotesFor($user, '9.9.9'))->toBe(1);
    }
    expect($this->inactive->notifications()->count())->toBe(0);

    $this->artisan('release:announce')->assertSuccessful();
    foreach ($this->active as $user) {
        expect(releaseNotesFor($user, '9.9.9'))->toBe(1);
    }
});

it('sends nothing for an entry that does not notify', function () {
    config(['releases' => [releaseEntry('9.9.9', notify: false)]]);

    $this->artisan('release:announce')->assertSuccessful();

    expect(DatabaseNotification::count())->toBe(0);
});

it('announces a newer version on top of an earlier one', function () {
    config(['releases' => [releaseEntry('9.9.9')]]);
    $this->artisan('release:announce')->assertSuccessful();

    config(['releases' => [releaseEntry('9.9.10'), releaseEntry('9.9.9')]]);
    $this->artisan('release:announce')->assertSuccessful();

    foreach ($this->active as $user) {
        expect(releaseNotesFor($user, '9.9.9'))->toBe(1)->and(releaseNotesFor($user, '9.9.10'))->toBe(1);
    }
});
