<?php

namespace App\Support;

use App\Models\AuditLog;
use App\Models\Invitation;
use App\Models\Team;
use App\Models\User;
use Illuminate\Database\Eloquent\Model;

final class AuditRecorder
{
    /** @var array<int, string> */
    private const SENSITIVE_FIELDS = [
        'password',
        'password_confirmation',
        'current_password',
        'token',
        'token_hash',
        'plain_token',
        'remember_token',
        'two_factor_secret',
        'two_factor_recovery_codes',
    ];

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     * @param  array<string, mixed>  $context
     */
    public static function record(
        User $actor,
        string $action,
        User|Team|Invitation $subject,
        array $before = [],
        array $after = [],
        array $context = [],
    ): AuditLog {
        return AuditLog::query()->create([
            'dealer_id' => $subject->dealer_id,
            'actor_id' => $actor->id,
            'action' => $action,
            'subject_type' => self::subjectType($subject),
            'subject_public_id' => $subject->public_id,
            'metadata' => self::sanitize([
                'before' => $before,
                'after' => $after,
                'context' => $context,
            ]),
        ]);
    }

    private static function subjectType(Model $subject): string
    {
        return match ($subject::class) {
            User::class => 'user',
            Team::class => 'team',
            Invitation::class => 'invitation',
            default => 'unknown',
        };
    }

    /**
     * @param  array<array-key, mixed>  $values
     * @return array<array-key, mixed>
     */
    private static function sanitize(array $values): array
    {
        foreach ($values as $key => $value) {
            if (is_string($key) && in_array(strtolower($key), self::SENSITIVE_FIELDS, true)) {
                $values[$key] = '[REDACTED]';

                continue;
            }

            if (is_array($value)) {
                $values[$key] = self::sanitize($value);
            }
        }

        return $values;
    }
}
