<?php

namespace App\Console\Commands;

use App\Enums\UserRole;
use App\Models\Dealer;
use App\Models\Invitation;
use App\Models\User;
use App\Notifications\InvitationCreated;
use Illuminate\Console\Command;
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
        {--username= : Owner username (up to 12 letters or digits)}
        {--force : Confirm the production invitation without an interactive prompt}';

    protected $description = 'Email a one-time activation invitation for the first Admin without setting a password';

    public function handle(): int
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
            $result = DB::transaction(function () use ($input): int {
                if (DB::connection()->getDriverName() === 'pgsql') {
                    DB::select('SELECT pg_advisory_xact_lock(734129601)');
                }

                if (Invitation::query()->where('role', UserRole::Admin)
                    ->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now())->exists()
                    || User::query()->where('role', UserRole::Admin)->exists()) {
                    $this->error('An Admin or active Admin invitation already exists.');

                    return self::FAILURE;
                }

                if (User::query()->where('email', $input['email'])->orWhere('username', $input['username'])->exists()
                    || Invitation::query()->whereNull('accepted_at')->whereNull('revoked_at')->where('expires_at', '>', now())
                        ->where(fn ($query) => $query->where('email', $input['email'])->orWhere('username', $input['username']))->exists()) {
                    $this->error('The owner email or username is already in use.');

                    return self::FAILURE;
                }

                $dealer = Dealer::query()->first();
                if ($dealer !== null && (Dealer::query()->count() !== 1 || $dealer->name !== $input['dealer'] || ! $dealer->is_active)) {
                    $this->error('The existing dealer must be the single active dealer with the supplied name.');

                    return self::FAILURE;
                }

                $dealer ??= Dealer::query()->create([
                    'public_id' => (string) Str::uuid(),
                    'name' => $input['dealer'],
                    'timezone' => 'Asia/Jakarta',
                    'is_active' => true,
                ]);
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
        } catch (Throwable) {
            // Transport exceptions can include credentials or the activation link.
            $this->error('Invitation creation or delivery failed; no bootstrap data was committed. Correct the configuration and retry.');

            return self::FAILURE;
        }

        if ($result === self::SUCCESS) {
            $this->info('Admin activation invitation sent. The owner must set their password using the email link within seven days.');
        }

        return $result;
    }
}
