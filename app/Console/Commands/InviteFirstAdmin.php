<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationCreated;
use App\Services\TransactionMasters;
use App\Services\UsernameReservations;
use App\Support\UsernameGenerator;
use Illuminate\Console\Command;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Notification;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Throwable;

class InviteFirstAdmin extends Command
{
    protected $signature = 'app:invite-first-admin
        {--dealer= : Dealer name}
        {--name= : Owner name}
        {--email= : Owner email}
        {--username= : Owner username (6–12 letters or digits, starting with a letter)}
        {--force : Confirm the production invitation without an interactive prompt}';

    protected $description = 'Email a one-time activation invitation for the first Admin without setting a password';

    public function handle(UsernameReservations $usernames): int
    {
        $input = [
            'dealer' => trim((string) $this->option('dealer')),
            'name' => trim((string) $this->option('name')),
            'email' => Str::lower(trim((string) $this->option('email'))),
            'username' => Str::lower(trim((string) $this->option('username'))),
        ];

        if (Validator::make($input, [
            'dealer' => ['required', 'string', 'max:255'],
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'max:255'],
            'username' => ['required', 'regex:/^[a-zA-Z0-9]{1,12}$/'],
        ])->fails()) {
            $this->error('Supply a dealer name, owner name, valid email, and username of 1–12 letters or digits.');

            return self::FAILURE;
        }

        $transport = config('mail.mailers.'.config('mail.default').'.transport');
        if (! app()->environment('testing') && ! in_array($transport, ['smtp', 'sendmail', 'ses', 'ses-v2', 'postmark', 'resend', 'mailgun'], true)) {
            $this->error('Configure a delivering mail transport before creating the invitation.');

            return self::FAILURE;
        }

        if (app()->environment('production') && ! $this->option('force')
            && ! $this->confirm('Send the first Admin invitation to the specified owner?')) {
            return self::FAILURE;
        }

        try {
            $result = DB::transaction(function () use ($input, $usernames): int {
                if (DB::connection()->getDriverName() === 'pgsql') {
                    DB::select('SELECT pg_advisory_xact_lock(734129601)');
                }

                if (Invitation::query()->where('role', UserRole::Admin)
                    ->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now())->exists()
                    || User::query()->where('role', UserRole::Admin)->exists()) {
                    $this->error('An Admin or active Admin invitation already exists.');

                    return self::FAILURE;
                }

                // Checked only once an invitation will be created, so reruns after bootstrap keep their old outcome.
                if (! preg_match('/^[a-z][a-z0-9]{5,11}$/', $input['username']) || UsernameGenerator::isBanned($input['username'])) {
                    $this->error('The username must start with a letter, have 6–12 letters or digits, and contain no reserved word.');

                    return self::FAILURE;
                }

                // A rerun after expiry supersedes the expired bootstrap invitation and reuses its name.
                $expired = Invitation::query()->whereNull('invited_by_id')->where('username', $input['username'])
                    ->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '<=', now());
                $supersedes = $expired->exists();

                if (User::query()->where('email', $input['email'])->orWhere('username', $input['username'])->exists()
                    || Invitation::query()->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now())
                        ->where('email', $input['email'])->exists()
                    || (! $supersedes && $usernames->taken($input['username']))) {
                    $this->error('The owner email or username is already in use.');

                    return self::FAILURE;
                }

                $dealer = Dealer::query()->first();
                if ($dealer !== null && (Dealer::query()->count() !== 1 || $dealer->name !== $input['dealer'] || ! $dealer->is_active)) {
                    $this->error('The existing dealer must be the single active dealer with the supplied name.');

                    return self::FAILURE;
                }

                if ($dealer === null) {
                    $dealer = Dealer::query()->create([
                        'public_id' => (string) Str::uuid(),
                        'name' => $input['dealer'],
                        'timezone' => 'Asia/Jakarta',
                        'is_active' => true,
                    ]);
                    TransactionMasters::initializeVehicles((int) $dealer->getKey());
                }
                if ($supersedes) {
                    $expired->update(['revoked_at' => now()]);
                    $usernames->release($input['username']);
                }

                if (! $usernames->hold($input['username'])) {
                    $this->error('The owner email or username is already in use.');

                    return self::FAILURE;
                }

                $token = Str::random(64);
                $invitation = Invitation::query()->create([
                    'public_id' => (string) Str::uuid(),
                    'dealer_id' => $dealer->getKey(),
                    'team_id' => null,
                    'invited_by_id' => null,
                    'name' => $input['name'],
                    'email' => $input['email'],
                    'username' => $input['username'],
                    'role' => UserRole::Admin,
                    'token_hash' => hash('sha256', $token),
                    'expires_at' => now()->addDays(7),
                ]);

                // Keep the bootstrap lock until delivery; a failure rolls back and permits a safe rerun.
                Notification::route('mail', [$invitation->email => $invitation->name])
                    ->notify(new InvitationCreated($invitation, $token));

                return self::SUCCESS;
            });
        } catch (Throwable $exception) {
            // Transport exceptions can include credentials or the activation link.
            $this->error('Invitation creation or delivery failed; no bootstrap data was committed. Correct the configuration and retry.');
            if (preg_match('/got code ["\x27]?([245]\d{2})/', $exception->getMessage(), $match)) {
                $this->line('Bootstrap diagnostic: SMTP status '.$match[1]);
            } else {
                $this->line('Bootstrap diagnostic: '.get_class($exception));
                if (preg_match('/^[A-Z0-9]{5}$/D', (string) $exception->getCode())) {
                    $this->line('Bootstrap diagnostic: error code '.$exception->getCode());
                }
                if ($exception instanceof QueryException) {
                    foreach (['users', 'invitations', 'dealers'] as $table) {
                        if (str_contains($exception->getSql(), '"'.$table.'"')) {
                            $this->line('Bootstrap diagnostic: database table '.$table);
                        }
                    }
                }
            }

            return self::FAILURE;
        }

        if ($result === self::SUCCESS) {
            $this->info('Admin activation invitation sent. The owner must set their password using the email link within seven days.');
        }

        return $result;
    }
}
