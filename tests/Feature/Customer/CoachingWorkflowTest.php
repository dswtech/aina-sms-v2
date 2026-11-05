<?php

use App\Enums\PipelineStage;
use App\Jobs\SendCoachingEmail;
use App\Models\Customer;
use App\Models\DealComment;
use App\Models\Dealer;
use App\Models\DealTransaction;
use App\Models\Team;
use App\Models\TeamMembership;
use App\Models\User;
use App\Notifications\DealCommentCreated;
use Illuminate\Notifications\ChannelManager;
use Illuminate\Notifications\Channels\DatabaseChannel;
use Illuminate\Notifications\Channels\MailChannel;
use Illuminate\Queue\WorkerOptions;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Queue;
use Inertia\Testing\AssertableInertia as Assert;

beforeEach(function () {
    $this->withoutVite();
    Queue::fake();
    $this->dealer = Dealer::factory()->create();
    $this->team = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->otherTeam = Team::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->sales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSales = User::factory()->sales()->create(['dealer_id' => $this->dealer->id]);
    $this->supervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->otherSupervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $this->admin = User::factory()->admin()->create(['dealer_id' => $this->dealer->id]);
    $this->manager = User::factory()->branchManager()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$this->sales, $this->otherSales, $this->supervisor] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => $user->role]);
    }
    TeamMembership::factory()->create(['team_id' => $this->otherTeam->id, 'user_id' => $this->otherSupervisor->id, 'role' => 'supervisor']);
    $this->customer = Customer::factory()->create(['dealer_id' => $this->dealer->id]);
    $this->customer->assignTo($this->sales);
    $this->deal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Model QA', 'current_stage' => PipelineStage::Prospect,
    ]);
});

it('allows only the assigned sales and team supervisors to write coaching', function () {
    $foreignSales = User::factory()->sales()->create();
    foreach ([$this->admin, $this->manager, $this->otherSales, $this->otherSupervisor, $foreignSales] as $actor) {
        $this->actingAs($actor)->postJson(route('deals.comments.store', $this->deal), ['body' => 'Tidak boleh'])
            ->assertForbidden();
    }
    expect($this->deal->comments()->count())->toBe(0);
    expect(DB::table('notifications')->count())->toBe(0);
    Queue::assertNothingPushed();

    foreach ([$this->sales, $this->supervisor] as $actor) {
        $this->actingAs($actor)->post(route('deals.comments.store', $this->deal), ['body' => 'Komentar sah'])->assertRedirect();
    }
    expect($this->deal->comments()->count())->toBe(2);
});

it('authorizes coaching before inspecting submitted parent ids', function () {
    $this->actingAs($this->otherSales)->postJson(route('deals.comments.store', $this->deal), [
        'body' => '', 'parent_id' => 987654,
    ])->assertForbidden();
    expect(DealComment::count())->toBe(0);
});

it('rejects replies to replies and foreign or missing parents without side effects', function () {
    $root = $this->deal->comments()->create(['user_id' => $this->sales->id, 'body' => 'Awal']);
    $reply = $this->deal->comments()->create(['user_id' => $this->supervisor->id, 'body' => 'Balas', 'parent_id' => $root->id]);
    $foreignDeal = DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->otherSales->id, 'vehicle_model' => 'Model Lain',
    ]);
    $foreign = $foreignDeal->comments()->create(['user_id' => $this->otherSales->id, 'body' => 'Rahasia lain']);
    foreach ([$reply->id, $foreign->id, 987654, 0, -1] as $parentId) {
        $this->actingAs($this->sales)->postJson(route('deals.comments.store', $this->deal), [
            'body' => 'Percobaan', 'parent_id' => $parentId,
        ])->assertUnprocessable()->assertJsonValidationErrors('parent_id');
    }
    expect(DealComment::count())->toBe(3);
    expect(DB::table('notifications')->count())->toBe(0);
    Queue::assertNothingPushed();
});

it('captures the server stage for roots and replies and preserves it after stage changes and edits', function () {
    $this->actingAs($this->sales)->post(route('deals.comments.store', $this->deal), [
        'body' => 'Komentar awal', 'stage_at_creation' => 'lost',
    ])->assertRedirect();
    $root = $this->deal->comments()->sole();
    expect($root->stage_at_creation)->toBe(PipelineStage::Prospect);
    $this->deal->transitionTo(PipelineStage::HotProspect, $this->sales);
    $this->actingAs($this->supervisor)->post(route('deals.comments.store', $this->deal), [
        'body' => 'Balasan', 'parent_id' => $root->id,
    ])->assertRedirect();
    $reply = $this->deal->comments()->whereNotNull('parent_id')->sole();
    expect($reply->stage_at_creation)->toBe(PipelineStage::HotProspect);
    $this->actingAs($this->sales)->patch(route('comments.update', $root), [
        'body' => 'Koreksi', 'stage_at_creation' => 'delivery', 'parent_id' => $reply->id,
    ])->assertRedirect();
    expect($root->fresh()->stage_at_creation)->toBe(PipelineStage::Prospect)
        ->and($root->fresh()->parent_id)->toBeNull()
        ->and($root->revisions()->sole()->old_body)->toBe('Komentar awal');
});

it('keeps legacy snapshots unknown and lets admins read without write capabilities', function () {
    $legacy = $this->deal->comments()->create(['user_id' => $this->admin->id, 'body' => 'Riwayat lama']);
    $this->actingAs($this->admin)->get(route('customers.index'))->assertInertia(fn (Assert $page) => $page
        ->where('customers.data.0.active_deal.can_comment', false)
        ->where('customers.data.0.active_deal.comments.0.stage_at_creation', null)
        ->where('customers.data.0.active_deal.comments.0.can_edit', false));
    $this->actingAs($this->admin)->patchJson(route('comments.update', $legacy), ['body' => 'Tidak boleh'])
        ->assertForbidden();
    expect($legacy->fresh()->body)->toBe('Riwayat lama');
    $this->actingAs($this->admin)->get(route('transactions.coaching', $this->deal))
        ->assertInertia(fn (Assert $page) => $page
            ->component('transactions/coaching')
            ->where('transaction.can_comment', false)
            ->where('transaction.comments.0.can_edit', false)
            ->missing('transaction.customer'));
    $this->actingAs($this->manager)->get(route('transactions.coaching', $this->deal))->assertForbidden();
    $this->actingAs(User::factory()->sales()->create())->get(route('transactions.coaching', $this->deal))->assertForbidden();
    $this->post(route('logout'));
    $this->get(route('transactions.coaching', $this->deal))->assertRedirect(route('login'));
});

it('persists metadata-only in-app notifications and queues email only for other authorized participants', function () {
    $this->actingAs($this->supervisor)->post(route('deals.comments.store', $this->deal), [
        'body' => 'BODY-RAHASIA-COACHING',
    ])->assertRedirect();
    expect(DB::table('notifications')->count())->toBe(1);
    $notification = $this->sales->notifications()->sole();
    expect($notification->data)->toHaveKeys(['title', 'message', 'url'])
        ->and(json_encode($notification->data))->not->toContain('BODY-RAHASIA-COACHING')
        ->and($notification->read_at)->toBeNull();
    Queue::assertPushed(SendCoachingEmail::class, function ($job) {
        return $this->sales->notifications()->whereKey($job->notificationId)->exists()
            && ! str_contains(serialize($job), 'BODY-RAHASIA-COACHING');
    });
    Queue::assertPushed(SendCoachingEmail::class, 1);
    $this->actingAs($this->otherSales)->patch(route('notifications.read', $notification))->assertForbidden();
    $this->actingAs($this->sales)->patch(route('notifications.read', $notification))->assertRedirect();
    expect($notification->fresh()->read_at)->not->toBeNull();
});

it('opens the exact authorized transaction from its notification even when a newer deal exists', function () {
    $this->deal->comments()->create(['user_id' => $this->supervisor->id, 'body' => 'Deal pertama']);
    DealTransaction::create([
        'dealer_id' => $this->dealer->id, 'customer_id' => $this->customer->id,
        'sales_id' => $this->sales->id, 'vehicle_model' => 'Deal terbaru',
    ]);
    $this->customer->assignTo($this->otherSales);
    $this->actingAs($this->sales)->get(route('transactions.coaching', $this->deal))
        ->assertInertia(fn (Assert $page) => $page
            ->component('transactions/coaching')
            ->where('transaction.public_id', $this->deal->public_id)
            ->where('transaction.comments.0.body', 'Deal pertama')
            ->missing('transaction.customer')
            ->missing('transaction.phone')
            ->missing('transaction.notes'));
    $this->actingAs($this->otherSales)->get(route('transactions.coaching', $this->deal))->assertForbidden();
});

it('does not expose another sales coaching through a shared customer profile', function () {
    $this->deal->update(['sales_id' => $this->otherSales->id]);
    $this->deal->comments()->create(['user_id' => $this->otherSales->id, 'body' => 'Tidak untuk S1']);
    $this->actingAs($this->sales)->get(route('customers.index'))->assertInertia(fn (Assert $page) => $page
        ->where('customers.data.0.active_deal', null));
});

it('notifies active team supervisors for a sales comment without notifying unrelated roles or the author', function () {
    $secondSupervisor = User::factory()->supervisor()->create(['dealer_id' => $this->dealer->id]);
    $inactiveSupervisor = User::factory()->supervisor()->inactive()->create(['dealer_id' => $this->dealer->id]);
    foreach ([$secondSupervisor, $inactiveSupervisor] as $user) {
        TeamMembership::factory()->create(['team_id' => $this->team->id, 'user_id' => $user->id, 'role' => 'supervisor']);
    }
    $this->actingAs($this->sales)->post(route('deals.comments.store', $this->deal), ['body' => 'Hasil follow-up'])->assertRedirect();
    expect(DB::table('notifications')->pluck('notifiable_id')->map(fn ($id) => (int) $id)->all())
        ->toEqualCanonicalizing([$this->supervisor->id, $secondSupervisor->id]);
    Queue::assertPushed(SendCoachingEmail::class, 2);
});

it('enforces edit ownership and the five minute boundary without changing snapshots', function (int $seconds, bool $allowed) {
    $this->freezeTime();
    $comment = $this->deal->comments()->create([
        'user_id' => $this->sales->id, 'body' => 'Awal', 'stage_at_creation' => PipelineStage::Prospect,
    ]);
    $this->actingAs($this->supervisor)->patchJson(route('comments.update', $comment), ['body' => 'Bukan penulis'])->assertForbidden();
    $this->travel($seconds)->seconds();
    $response = $this->actingAs($this->sales)->patchJson(route('comments.update', $comment), ['body' => 'Koreksi']);
    $allowed ? $response->assertRedirect() : $response->assertForbidden();
    expect($comment->fresh()->stage_at_creation)->toBe(PipelineStage::Prospect)
        ->and($comment->revisions()->count())->toBe($allowed ? 1 : 0)
        ->and($comment->fresh()->body)->toBe($allowed ? 'Koreksi' : 'Awal');
})->with([[299, true], [300, false], [301, false]]);

it('rechecks notification authorization after recipient access changes before queued delivery', function (string $change) {
    $author = $change === 'team' ? $this->sales : $this->supervisor;
    $recipient = $change === 'team' ? $this->supervisor : $this->sales;
    $this->actingAs($author)->post(route('deals.comments.store', $this->deal), ['body' => 'Tidak boleh bocor'])->assertRedirect();
    $job = Queue::pushed(SendCoachingEmail::class)->sole();
    $serialized = serialize($job);
    match ($change) {
        'inactive' => $recipient->update(['is_active' => false]),
        'role' => $recipient->update(['role' => 'admin']),
        'owner' => $this->deal->update(['sales_id' => $this->otherSales->id]),
        'dealer' => $recipient->update(['dealer_id' => Dealer::factory()->create()->id]),
        'team' => $recipient->activeTeamMemberships()->update(['ended_at' => now()]),
    };
    $mail = Mockery::mock(MailChannel::class);
    $mail->shouldNotReceive('send');
    $manager = app(ChannelManager::class);
    $manager->extend('mail', fn () => $mail);
    unserialize($serialized)->handle();
    expect($this->deal->comments()->count())->toBe(1);
})->with(['inactive', 'role', 'owner', 'dealer', 'team']);

it('rolls back the comment and in-app notifications together and never queues mail on rollback', function () {
    $database = Mockery::mock(DatabaseChannel::class);
    $database->shouldReceive('send')->once()->andThrow(new RuntimeException('Database unavailable'));
    app(ChannelManager::class)->extend('database', fn () => $database);
    $this->withoutExceptionHandling();
    expect(fn () => $this->actingAs($this->supervisor)->post(route('deals.comments.store', $this->deal), ['body' => 'Rollback']))
        ->toThrow(RuntimeException::class, 'Database unavailable');
    expect(DealComment::count())->toBe(0)->and(DB::table('notifications')->count())->toBe(0);
    Queue::assertNothingPushed();
});

it('queues only safe email metadata and retries a provider failure without undoing the comment or in-app notification', function () {
    config(['queue.default' => 'database', 'queue.connections.database.connection' => DB::getDefaultConnection()]);
    Queue::swap(Queue::getFacadeRoot()->queue);
    $mail = Mockery::mock(MailChannel::class);
    $mail->shouldReceive('send')->once()->ordered()->andThrow(new RuntimeException('Provider unavailable'));
    $mail->shouldReceive('send')->once()->ordered()->andReturnNull();
    app(ChannelManager::class)->extend('mail', fn () => $mail);
    $this->actingAs($this->supervisor)->post(route('deals.comments.store', $this->deal), ['body' => 'BODY-RAHASIA-EMAIL'])->assertRedirect();
    $queued = DB::table('jobs')->sole();
    expect($queued->payload)->not->toContain('BODY-RAHASIA-EMAIL');
    $job = unserialize(json_decode($queued->payload, true)['data']['command']);
    expect($job->tries)->toBe(3)->and($job->backoff)->toBe([30, 120]);
    $comment = $this->deal->comments()->sole();
    $notification = new DealCommentCreated($this->deal->id, $this->deal->public_id, $comment->id, $comment->user_id, $comment->stage_at_creation->value);
    $this->deal->transitionTo(PipelineStage::HotProspect, $this->sales);
    $rendered = (string) $notification->toMail($this->sales)->render();
    expect($rendered)->toContain('Prospect')->not->toContain('BODY-RAHASIA-EMAIL', 'Hot Prospect', $this->customer->phone);
    app('queue.worker')->runNextJob('database', 'default', new WorkerOptions);
    expect(DB::table('jobs')->sole()->attempts)->toBe(1)
        ->and($this->deal->comments()->count())->toBe(1)
        ->and($this->sales->notifications()->count())->toBe(1);
    $this->travel(31)->seconds();
    app('queue.worker')->runNextJob('database', 'default', new WorkerOptions);
    expect(DB::table('jobs')->count())->toBe(0)
        ->and(DB::table('failed_jobs')->count())->toBe(0)
        ->and($this->deal->comments()->count())->toBe(1)
        ->and($this->sales->notifications()->count())->toBe(1);
});

it('retains a pending email intent when enqueue fails and recovers it on the next dispatch pass', function () {
    $fakeQueue = Queue::getFacadeRoot();
    Queue::shouldReceive('connection')->andThrow(new RuntimeException('Queue unavailable'));
    $this->actingAs($this->supervisor)->post(route('deals.comments.store', $this->deal), ['body' => 'Tetap tersimpan'])->assertRedirect();
    expect($this->deal->comments()->count())->toBe(1);
    $notification = $this->sales->notifications()->sole();
    expect($notification->data['email_status'] ?? null)->toBe('pending');
    Queue::swap($fakeQueue);
    $this->artisan('coaching:queue-emails')->assertSuccessful();
    expect($notification->fresh()->data['email_status'])->toBe('queued');
    $this->artisan('coaching:queue-emails')->assertSuccessful();
    Queue::assertPushed(SendCoachingEmail::class, 1);
});

it('records exhausted delivery and permits an explicit retry while ignoring a completed replay', function () {
    $this->actingAs($this->supervisor)->post(route('deals.comments.store', $this->deal), ['body' => 'Retry terkontrol'])->assertRedirect();
    $job = Queue::pushed(SendCoachingEmail::class)->sole();
    $record = $this->sales->notifications()->sole();
    $job->failed(new RuntimeException('Provider unavailable'));
    expect($record->fresh()->data['email_status'])->toBe('failed');
    $mail = Mockery::mock(MailChannel::class);
    $mail->shouldReceive('send')->once()->andReturnNull();
    app(ChannelManager::class)->extend('mail', fn () => $mail);
    $job->handle();
    expect($record->fresh()->data['email_status'])->toBe('sent');
    $job->handle();
});
