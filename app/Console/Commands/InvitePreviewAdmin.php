<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;

class InvitePreviewAdmin extends Command
{
    protected $signature = 'app:invite-preview-admin';

    protected $description = 'Run an explicitly enabled, time-limited first Admin invitation on the pilot preview';

    public function handle(): int
    {
        $settings = config('deployment.preview_invitation');
        $remaining = (int) $settings['expires_at'] - now()->getTimestamp();

        if ($settings['enabled'] !== true || $settings['environment'] !== 'preview'
            || $settings['branch'] !== 'codex/vercel-pilot-deployment'
            || $remaining <= 0 || $remaining > 900) {
            return self::SUCCESS;
        }

        // The existing command serializes bootstrap and rolls back if SMTP fails.
        $status = Artisan::call('app:invite-first-admin', [
            '--dealer' => $settings['dealer'],
            '--name' => $settings['name'],
            '--email' => $settings['email'],
            '--username' => $settings['username'],
            '--force' => true,
            '--no-interaction' => true,
        ]);

        // Bootstrap output contains only validated, fixed messages and safe diagnostics.
        $this->output->write(Artisan::output());

        $this->line($status === self::SUCCESS
            ? 'Preview bootstrap: Admin invitation accepted by SMTP.'
            : 'Preview bootstrap: no invitation sent; an Admin/invitation exists or delivery failed.');

        return $status;
    }
}
