<?php

use App\Enums\UserRole;
use App\Models\AuditLog;
use App\Models\Dealer;
use App\Models\User;
use App\Support\AuditRecorder;

it('records actor action subject timestamp and redacted before after data', function () {
    $dealer = Dealer::factory()->create();
    $actor = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);
    $subject = User::factory()->create(['dealer_id' => $dealer->id]);

    AuditRecorder::record(
        actor: $actor,
        action: 'user.updated',
        subject: $subject,
        before: [
            'is_active' => true,
            'password' => 'before-secret',
            'nested' => ['token_hash' => 'token-secret'],
        ],
        after: [
            'is_active' => false,
            'password_confirmation' => 'after-secret',
        ],
        context: ['reason' => 'offboarding'],
    );

    $log = AuditLog::query()->sole();
    $encoded = json_encode($log->metadata, JSON_THROW_ON_ERROR);

    expect($log->dealer_id)->toBe($dealer->id)
        ->and($log->actor_id)->toBe($actor->id)
        ->and($log->action)->toBe('user.updated')
        ->and($log->subject_type)->toBe('user')
        ->and($log->subject_public_id)->toBe($subject->public_id)
        ->and($log->created_at)->not->toBeNull()
        ->and($log->metadata['before']['is_active'])->toBeTrue()
        ->and($log->metadata['after']['is_active'])->toBeFalse()
        ->and($log->metadata['context']['reason'])->toBe('offboarding')
        ->and($encoded)->not->toContain('before-secret')
        ->and($encoded)->not->toContain('token-secret')
        ->and($encoded)->not->toContain('after-secret')
        ->and($log->metadata['before']['password'])->toBe('[REDACTED]')
        ->and($log->metadata['before']['nested']['token_hash'])->toBe('[REDACTED]');
});

it('never persists common credential fields through context aliases', function (string $field) {
    $dealer = Dealer::factory()->create();
    $actor = User::factory()->role(UserRole::Admin)->create(['dealer_id' => $dealer->id]);

    AuditRecorder::record($actor, 'security.checked', $actor, context: [$field => 'do-not-store']);

    expect(json_encode(AuditLog::query()->sole()->metadata, JSON_THROW_ON_ERROR))
        ->not->toContain('do-not-store');
})->with([
    'password',
    'password_confirmation',
    'current_password',
    'token',
    'token_hash',
    'plain_token',
    'remember_token',
    'two_factor_secret',
    'two_factor_recovery_codes',
]);
