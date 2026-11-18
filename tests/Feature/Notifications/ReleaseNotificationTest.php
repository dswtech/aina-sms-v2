<?php

use App\Models\User;
use App\Notifications\ReleaseAnnounced;
use App\Notifications\StagnantDealsSummary;
use Illuminate\Support\Facades\DB;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    $this->users = [
        'sales' => User::factory()->sales()->create(),
        'supervisor' => User::factory()->supervisor()->create(),
        'branch manager' => User::factory()->branchManager()->create(),
        'admin' => User::factory()->admin()->create(),
    ];
});

it('shows a release notification in the bell and history of every role', function () {
    foreach ($this->users as $user) {
        $user->notify(new ReleaseAnnounced('1.3.1', 'Ringkasan'));

        $this->actingAs($user)->get(route('notifications.index'))->assertInertia(fn (Assert $page) => $page
            ->has('history', 1)
            ->where('history.0.data.kind', 'release')
            ->where('history.0.data.title', 'Versi baru: v1.3.1')
            ->where('history.0.data.message', 'Ringkasan')
            ->where('history.0.data.url', '/rilis')
            ->has('notifications', 1)->where('notificationsUnreadCount', 1));
    }
});

it('keeps coaching notifications away from admin while showing releases', function () {
    $admin = $this->users['admin'];
    $admin->notify(new StagnantDealsSummary(2));
    $admin->notify(new ReleaseAnnounced('1.3.1', 'Ringkasan'));

    $this->actingAs($admin)->get(route('notifications.index'))
        ->assertInertia(fn (Assert $page) => $page->has('history', 1)->where('history.0.data.kind', 'release'));
});

it('lets a branch manager mark a release notification read but nobody else', function () {
    $manager = $this->users['branch manager'];
    $manager->notify(new ReleaseAnnounced('1.3.1', 'Ringkasan'));
    $id = $manager->notifications()->value('id');

    $this->actingAs($this->users['sales'])->patch(route('notifications.read', $id))->assertForbidden();
    $this->actingAs($manager)->patch(route('notifications.read', $id))->assertRedirect();

    expect(DB::table('notifications')->where('id', $id)->value('read_at'))->not->toBeNull();
});
