<?php

use App\Models\User;
use App\Notifications\DealCommentCreated;
use App\Notifications\ReleaseAnnounced;
use Illuminate\Console\Scheduling\Schedule;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

uses(RefreshDatabase::class);

it('deletes uploaded import CSVs older than 30 days and keeps newer ones', function () {
    $this->travelTo('2026-11-28 10:00:00');
    Storage::fake('local');
    $disk = Storage::disk('local');
    $disk->put('imports/old.csv', 'name,phone');
    $disk->put('imports/edge.csv', 'name,phone');
    $disk->put('imports/new.csv', 'name,phone');
    touch($disk->path('imports/old.csv'), now()->subDays(31)->getTimestamp());
    touch($disk->path('imports/edge.csv'), now()->subDays(29)->getTimestamp());

    $this->artisan('data:prune')->assertSuccessful();

    $disk->assertMissing('imports/old.csv');
    $disk->assertExists('imports/edge.csv');
    $disk->assertExists('imports/new.csv');
});

it('deletes notifications older than 90 days, read or not, but keeps coaching email still to be sent', function () {
    $this->travelTo('2026-11-28 10:00:00');
    $user = User::factory()->create();
    $notify = function (string $type, array $data, int $daysAgo, bool $read = false) use ($user): string {
        $id = (string) Str::uuid();
        $user->notifications()->create(['id' => $id, 'type' => $type, 'data' => $data,
            'read_at' => $read ? now() : null, 'created_at' => now()->subDays($daysAgo), 'updated_at' => now()->subDays($daysAgo)]);

        return $id;
    };
    $oldRead = $notify(ReleaseAnnounced::class, ['version' => '1.0.0'], 91, read: true);
    $oldUnread = $notify(ReleaseAnnounced::class, ['version' => '1.0.1'], 91);
    $oldSent = $notify(DealCommentCreated::class, ['comment_id' => 1, 'email_status' => 'sent'], 91, read: true);
    $oldPending = $notify(DealCommentCreated::class, ['comment_id' => 2, 'email_status' => 'pending'], 91);
    $oldQueued = $notify(DealCommentCreated::class, ['comment_id' => 3, 'email_status' => 'queued'], 91);
    $recent = $notify(ReleaseAnnounced::class, ['version' => '1.1.0'], 89, read: true);

    $this->artisan('data:prune')->assertSuccessful();

    expect($user->notifications()->pluck('id')->sort()->values()->all())
        ->toBe(collect([$oldPending, $oldQueued, $recent])->sort()->values()->all())
        ->and([$oldRead, $oldUnread, $oldSent])->each->not->toBeIn($user->notifications()->pluck('id')->all());
});

it('is scheduled daily', function () {
    $events = collect(app(Schedule::class)->events())
        ->filter(fn ($event): bool => str_contains((string) $event->command, 'data:prune'));

    expect($events)->toHaveCount(1)->and($events->first()->expression)->toBe('15 1 * * *');
});
