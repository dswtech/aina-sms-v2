<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Throwable;

class PrepareProduction extends Command
{
    protected $signature = 'app:prepare-production';

    protected $description = 'Initialize an explicitly authorized production release and invite its first Admin';

    public function handle(): int
    {
        $settings = config('deployment.production_setup');
        $remaining = (int) $settings['expires_at'] - now()->getTimestamp();
        if ($settings['enabled'] !== true || $settings['environment'] !== 'production'
            || $settings['branch'] !== 'main' || empty($settings['approved_commit'])
            || $settings['approved_commit'] !== $settings['source_commit']
            || $remaining <= 0 || $remaining > 900) {
            return self::SUCCESS;
        }

        $connection = DB::connection();
        $host = $connection->getConfig('host');
        if ($connection->getDriverName() !== 'pgsql' || empty($settings['expected_host'])
            || $host !== $settings['expected_host'] || str_contains((string) $host, '-pooler.')
            || empty($settings['expected_database']) || $connection->getDatabaseName() !== $settings['expected_database']
            || parse_url((string) config('app.url'), PHP_URL_SCHEME) !== 'https'
            || empty($settings['domain']) || parse_url((string) config('app.url'), PHP_URL_HOST) !== $settings['domain']) {
            $this->error('Production setup: database or domain target mismatch; no setup attempted.');

            return self::FAILURE;
        }

        $locked = false;
        try {
            $lock = $connection->selectOne('SELECT pg_try_advisory_lock(734129603) AS acquired');
            $locked = in_array($lock->acquired, [true, 1, 't', '1'], true);
            if (! $locked) {
                $this->error('Production setup: another operator is running.');

                return self::FAILURE;
            }

            $migrator = app('migrator');
            $repository = $migrator->getRepository();
            $ran = $repository->repositoryExists() ? $repository->getRan() : [];
            $pending = array_diff(array_keys($migrator->getMigrationFiles([database_path('migrations')])), $ran);
            if ($pending !== []) {
                $tables = $connection->select("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
                if (array_diff(array_map(fn ($table) => $table->tablename, $tables), ['migrations']) !== [] || $ran !== []) {
                    $this->error('Production setup: existing schema requires backup and operator review before migration.');

                    return self::FAILURE;
                }
                if (Artisan::call('migrate', ['--force' => true, '--no-interaction' => true]) !== self::SUCCESS) {
                    $this->error('Production setup: migration failed; invitation not attempted.');

                    return self::FAILURE;
                }
            }

            $this->line('Production setup: migrations complete.');
            $status = Artisan::call('app:invite-first-admin', [
                '--dealer' => $settings['dealer'], '--name' => $settings['name'],
                '--email' => $settings['email'], '--username' => $settings['username'],
                '--force' => true, '--no-interaction' => true,
            ]);
            $this->output->write(Artisan::output());

            return $status;
        } catch (Throwable $exception) {
            $this->error('Production setup failed; check safe diagnostics before retrying.');
            $this->line('Production setup diagnostic: '.get_class($exception));
            if (preg_match('/^[A-Z0-9]{5}$/D', (string) $exception->getCode())) {
                $this->line('Production setup diagnostic: error code '.$exception->getCode());
            }

            return self::FAILURE;
        } finally {
            if ($locked) {
                $connection->select('SELECT pg_advisory_unlock(734129603)');
            }
        }
    }
}
