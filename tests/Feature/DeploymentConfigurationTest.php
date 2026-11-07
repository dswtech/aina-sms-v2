<?php

use Symfony\Component\Process\Process;

it('honors forwarded HTTPS only when trusted proxies are configured', function (string $proxies, bool $secure) {
    $code = <<<'PHP'
    require 'vendor/autoload.php';
    $app = require 'bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    $request = Illuminate\Http\Request::create('http://pilot.example.test/login', 'GET', server: [
        'REMOTE_ADDR' => '127.0.0.1',
        'HTTP_X_FORWARDED_PROTO' => 'https',
    ]);
    $response = $app->make(Illuminate\Contracts\Http\Kernel::class)->handle($request);
    echo json_encode([
        'status' => $response->getStatusCode(),
        'secure' => $request->isSecure(),
        'hsts' => $response->headers->has('Strict-Transport-Security'),
    ], JSON_THROW_ON_ERROR);
    PHP;
    $process = new Process([PHP_BINARY, '-r', $code], base_path(), [
        'APP_ENV' => 'testing',
        'APP_DEBUG' => 'false',
        'APP_CONFIG_CACHE' => sys_get_temp_dir().'/aina-no-proxy-config-'.bin2hex(random_bytes(8)).'.php',
        'APP_KEY' => 'base64:'.base64_encode(random_bytes(32)),
        'SESSION_DRIVER' => 'array',
        'CACHE_STORE' => 'array',
        'DB_CONNECTION' => 'sqlite',
        'DB_DATABASE' => ':memory:',
        'DB_URL' => '',
        'TRUSTED_PROXIES' => $proxies,
    ]);
    $process->mustRun();
    $result = json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR);
    expect($result)->toBe(['status' => 200, 'secure' => $secure, 'hsts' => $secure]);
})->with([
    'Vercel ingress' => ['*', true],
    'untrusted forwarding' => ['', false],
]);

it('uses deployment environment settings for SMTP timeout and SSR', function () {
    $code = <<<'PHP'
    require 'vendor/autoload.php';
    $app = require 'bootstrap/app.php';
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo json_encode([config('mail.mailers.smtp.timeout'), config('inertia.ssr.enabled')], JSON_THROW_ON_ERROR);
    PHP;
    $process = new Process([PHP_BINARY, '-r', $code], base_path(), [
        'APP_ENV' => 'testing',
        'APP_CONFIG_CACHE' => sys_get_temp_dir().'/aina-no-deploy-config-'.bin2hex(random_bytes(8)).'.php',
        'MAIL_TIMEOUT' => '15',
        'INERTIA_SSR_ENABLED' => 'false',
    ]);
    $process->mustRun();
    expect(json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR))->toBe([15, false]);
});

it('uses the Neon integration URL when no explicit Laravel URL is configured', function () {
    $code = <<<'PHP'
    require 'vendor/autoload.php';
    $app = require 'bootstrap/app.php';
    $app->useEnvironmentPath(sys_get_temp_dir().'/aina-no-env-'.bin2hex(random_bytes(8)));
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo json_encode(config('database.connections.pgsql.url'), JSON_THROW_ON_ERROR);
    PHP;
    $url = 'postgresql://demo:dummy@database.example.test/pilot?sslmode=require';
    $process = new Process([PHP_BINARY, '-r', $code], base_path(), [
        'APP_ENV' => 'testing',
        'APP_CONFIG_CACHE' => sys_get_temp_dir().'/aina-no-db-config-'.bin2hex(random_bytes(8)).'.php',
        'DB_URL' => false,
        'DATABASE_URL_UNPOOLED' => false,
        'DATABASE_URL' => $url,
    ]);
    $process->mustRun();
    expect(json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR))->toBe($url);
});

it('resolves the direct Neon host for transactions while retaining an explicit DB URL override', function (bool $explicit) {
    $code = <<<'PHP'
    require 'vendor/autoload.php';
    $app = require 'bootstrap/app.php';
    $app->useEnvironmentPath(sys_get_temp_dir().'/aina-no-env-'.bin2hex(random_bytes(8)));
    $app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
    echo json_encode(Illuminate\Support\Facades\DB::connection('pgsql')->getConfig('host'), JSON_THROW_ON_ERROR);
    PHP;
    $process = new Process([PHP_BINARY, '-r', $code], base_path(), [
        'APP_ENV' => 'testing',
        'APP_CONFIG_CACHE' => sys_get_temp_dir().'/aina-direct-config-'.bin2hex(random_bytes(8)).'.php',
        'DB_URL' => $explicit ? 'postgresql://demo:dummy@explicit.example.test/pilot?sslmode=require' : false,
        'DATABASE_URL_UNPOOLED' => 'postgresql://demo:dummy@direct.example.test/pilot?sslmode=require',
        'DATABASE_URL' => 'postgresql://demo:dummy@pooled.example.test/pilot?sslmode=require',
    ]);
    $process->mustRun();
    expect(json_decode($process->getOutput(), true, flags: JSON_THROW_ON_ERROR))
        ->toBe($explicit ? 'explicit.example.test' : 'direct.example.test');
})->with([false, true]);
