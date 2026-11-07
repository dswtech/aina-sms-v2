<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;

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

        $direct = $settings['database_url'] ?? null;
        if (config('database.default') === 'pgsql' && is_string($direct) && $direct !== '') {
            $current = parse_url((string) config('database.connections.pgsql.url'));
            $target = parse_url($direct);
            if (! is_array($current) || ! is_array($target)
                || str_replace('-pooler.', '.', $current['host'] ?? '') !== ($target['host'] ?? '')
                || ($current['path'] ?? '') !== ($target['path'] ?? '')
                || ($current['user'] ?? '') !== ($target['user'] ?? '')) {
                $this->error('Preview bootstrap: direct database target mismatch; no invitation attempted.');

                return self::FAILURE;
            }
            // Administrative bootstrap uses the same database without transaction pooling.
            config(['database.connections.pgsql.url' => $direct]);
            DB::purge('pgsql');
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
