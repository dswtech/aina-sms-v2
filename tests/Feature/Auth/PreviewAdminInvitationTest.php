<?php

use App\Models\Invitation;
use Illuminate\Support\Facades\Notification;

function previewInvitationConfiguration(array $overrides = []): void
{
    config(['deployment.preview_invitation' => array_merge([
        'enabled' => true,
        'environment' => 'preview',
        'branch' => 'codex/vercel-pilot-deployment',
        'expires_at' => now()->addMinutes(10)->timestamp,
        'dealer' => 'Pilot Dealer',
        'name' => 'Pilot Owner',
        'email' => 'owner@example.test',
        'username' => 'pilotowner',
    ], $overrides)]);
}

it('sends the preview invitation through the existing bootstrap command only once', function () {
    Notification::fake();
    previewInvitationConfiguration();
    $this->artisan('app:invite-preview-admin')->assertSuccessful();
    expect(Invitation::query()->count())->toBe(1);
    $this->artisan('app:invite-preview-admin')->assertFailed();
    expect(Invitation::query()->count())->toBe(1);
});

it('refuses a direct bootstrap URL pointing at a different database', function () {
    Notification::fake();
    previewInvitationConfiguration(['database_url' => 'postgresql://dummy:dummy@ep-other.neon.tech/neondb']);
    $default = config('database.default');
    config(['database.default' => 'pgsql', 'database.connections.pgsql.url' => 'postgresql://dummy:dummy@ep-preview-pooler.neon.tech/neondb']);
    try {
        $this->artisan('app:invite-preview-admin')->expectsOutputToContain('direct database target mismatch')->assertFailed();
    } finally {
        config(['database.default' => $default]);
    }
    Notification::assertNothingSent();
});

it('does not access bootstrap when its preview window is not enabled', function (array $overrides) {
    Notification::fake();
    previewInvitationConfiguration($overrides);
    $this->artisan('app:invite-preview-admin')->assertSuccessful();
    expect(Invitation::query()->count())->toBe(0);
    Notification::assertNothingSent();
})->with([
    'disabled' => [['enabled' => false]],
    'production' => [['environment' => 'production']],
    'other branch' => [['branch' => 'main']],
    'expired' => [['expires_at' => 1]],
    'unbounded window' => [['expires_at' => PHP_INT_MAX]],
]);
