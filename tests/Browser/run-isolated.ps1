# Run from a fresh pwsh process after building the frontend.
$ErrorActionPreference = 'Stop'
$root = (Resolve-Path (Join-Path $PSScriptRoot '../..')).Path
$database = Join-Path ([IO.Path]::GetTempPath()) ('aina-g11-' + [Guid]::NewGuid().ToString('N') + '.sqlite')
$session = 'g11-' + [Guid]::NewGuid().ToString('N')
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()

$env:APP_ENV = 'testing'
$env:APP_DEBUG = 'false'
$env:APP_CONFIG_CACHE = "$database.config"
$env:APP_URL = "http://127.0.0.1:$port"
$env:APP_KEY = 'base64:' + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
$env:DB_CONNECTION = 'sqlite'
$env:DB_DATABASE = $database
$env:DB_URL = ''
$env:SESSION_DRIVER = 'database'
$env:SESSION_SECURE_COOKIE = 'false'
$env:SESSION_DOMAIN = ''
$env:CACHE_STORE = 'array'
$env:MAIL_MAILER = 'array'
$env:QUEUE_CONNECTION = 'sync'

Push-Location $root
try {
    [IO.File]::WriteAllBytes($database, [byte[]]@())
    php tests/Browser/seed-isolated.php
    if ($LASTEXITCODE -ne 0) { throw 'G11 fixture setup failed' }

    $router = Join-Path $root 'vendor/laravel/framework/src/Illuminate/Foundation/resources/server.php'
    $processOptions = @{}
    if ($IsWindows) { $processOptions.WindowStyle = 'Hidden' }
    $server = Start-Process php -ArgumentList '-S', "127.0.0.1:$port", "`"$router`"" -WorkingDirectory (Join-Path $root 'public') -PassThru @processOptions
    $ready = $false
    for ($attempt = 0; $attempt -lt 20 -and !$server.HasExited; $attempt++) {
        try {
            $ready = (Invoke-WebRequest "$env:APP_URL/login" -TimeoutSec 2).StatusCode -eq 200
            if ($ready) { break }
        } catch {
            Start-Sleep -Milliseconds 250
        }
    }
    if (!$ready) { throw 'G11 loopback server failed readiness check' }

    playwright-cli "-s=$session" open "$env:APP_URL/login" --browser chrome
    if ($LASTEXITCODE -ne 0) { throw 'G11 browser failed to start' }
    foreach ($script in @('lead-server-save.js', 'analytics-recovery.js', 'transaction-filter-recovery.js', 'transaction-stage-save.js', 'transaction-pagination.js', 'narrow-viewport-reflow.js')) {
        playwright-cli "-s=$session" run-code --filename "tests/Browser/$script"
        if ($LASTEXITCODE -ne 0) { throw "G11 browser regression failed: $script" }
    }
} finally {
    if ($server) {
        playwright-cli "-s=$session" close | Out-Null
        if (!$server.HasExited) { Stop-Process -Id $server.Id }
    }
    Remove-Item -LiteralPath $database -ErrorAction SilentlyContinue
    Pop-Location
}
