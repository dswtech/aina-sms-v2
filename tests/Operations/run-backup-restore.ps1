# Run in a fresh pwsh process. Only synthetic data in a new temporary cluster.
$ErrorActionPreference = 'Stop'
$tempRoot = [IO.Path]::TrimEndingDirectorySeparator((Resolve-Path ([IO.Path]::GetTempPath())).Path)
$cluster = Join-Path $tempRoot ('aina-restore-' + [Guid]::NewGuid().ToString('N'))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$started = $false

function Invoke-Checked([string] $Command, [string[]] $Arguments) {
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

Push-Location (Join-Path $PSScriptRoot '../..')
try {
    Invoke-Checked initdb @('-D', $cluster, '-U', 'restore_runner', '-A', 'trust', '--no-locale', '--encoding=UTF8')
    Invoke-Checked pg_ctl @('-D', $cluster, '-l', (Join-Path $cluster 'server.log'), '-o', "-h 127.0.0.1 -p $port", '-w', 'start')
    $started = $true
    $env:APP_ENV = 'testing'
    $env:APP_DEBUG = 'false'
    $env:APP_CONFIG_CACHE = Join-Path $cluster 'no-app-cache.php'
    $env:APP_KEY = 'base64:' + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $env:DB_CONNECTION = 'pgsql'
    $env:DB_HOST = '127.0.0.1'
    $env:DB_PORT = $port
    $env:DB_URL = ''
    $env:DB_USERNAME = 'restore_runner'
    $env:DB_PASSWORD = ''
    $env:MAIL_MAILER = 'array'
    $env:QUEUE_CONNECTION = 'sync'
    $env:SESSION_DRIVER = 'array'
    $env:CACHE_STORE = 'array'
    $client = @('-h', '127.0.0.1', '-p', "$port", '-U', 'restore_runner')
    $env:DB_DATABASE = 'aina_restore_source'
    Invoke-Checked createdb ($client + $env:DB_DATABASE)
    Invoke-Checked php @('tests/Operations/restore-fixture.php', 'seed')
    $before = Invoke-Checked php @('tests/Operations/restore-fixture.php', 'fingerprint')
    $dump = Join-Path $cluster 'synthetic.dump'
    $backupWatch = [Diagnostics.Stopwatch]::StartNew()
    Invoke-Checked pg_dump ($client + @('-Fc', '-f', $dump, $env:DB_DATABASE))
    $backupWatch.Stop()
    if ((Get-Item -LiteralPath $dump).Length -eq 0) { throw 'Backup is empty' }
    $archive = Invoke-Checked pg_restore @('--list', $dump)
    if (!$archive) { throw 'Archive list is empty' }
    $env:DB_DATABASE = 'aina_restore_target'
    Invoke-Checked createdb ($client + $env:DB_DATABASE)
    $restoreWatch = [Diagnostics.Stopwatch]::StartNew()
    Invoke-Checked pg_restore ($client + @('--exit-on-error', '--single-transaction', '-d', $env:DB_DATABASE, $dump))
    $restoreWatch.Stop()
    $after = Invoke-Checked php @('tests/Operations/restore-fixture.php', 'fingerprint')
    if (($before -join "`n") -cne ($after -join "`n")) { throw 'Restored table contents or sequence values differ' }
    foreach ($role in @('admin', 'branchManager', 'supervisor', 'sales')) {
        Invoke-Checked php @('tests/Operations/restore-fixture.php', 'smoke', $role)
    }
    Invoke-Checked php @('artisan', 'migrate:status', '--no-ansi')
    $summary = $after -join "`n" | ConvertFrom-Json -AsHashtable
    [ordered]@{
        backupBytes = (Get-Item -LiteralPath $dump).Length
        backupMilliseconds = $backupWatch.ElapsedMilliseconds
        restoreMilliseconds = $restoreWatch.ElapsedMilliseconds
        tablesMatched = $summary.Count - 1
        users = $summary.users.count
        customers = $summary.customers.count
        transactions = $summary.deal_transactions.count
        fingerprintAndSequences = 'identical'
        smokeRoles = 4
    } | ConvertTo-Json
} finally {
    try {
        if ($started) { Invoke-Checked pg_ctl @('-D', $cluster, '-m', 'fast', '-w', 'stop') }
        if (Test-Path -LiteralPath $cluster) {
            $resolved = (Resolve-Path -LiteralPath $cluster).Path
            if ($resolved -eq $cluster -and (Split-Path -Parent $resolved) -eq $tempRoot -and (Split-Path -Leaf $resolved) -match '^aina-restore-[a-f0-9]{32}$') {
                Remove-Item -LiteralPath $resolved -Recurse -Force
            }
        }
    } finally { Pop-Location }
}
