param(
    [ValidateSet('pilot', 'capacity')]
    [string] $Profile = 'pilot',
    [ValidateSet('128M', '512M')]
    [string] $MemoryLimit = '512M',
    [switch] $BenchmarkOnly,
    [switch] $SkipBenchmark
)

$ErrorActionPreference = 'Stop'
$tempRoot = [IO.Path]::TrimEndingDirectorySeparator((Resolve-Path ([IO.Path]::GetTempPath())).Path)
$cluster = Join-Path $tempRoot ('aina-g13-' + [Guid]::NewGuid().ToString('N'))
$listener = [Net.Sockets.TcpListener]::new([Net.IPAddress]::Loopback, 0)
$listener.Start()
$port = $listener.LocalEndpoint.Port
$listener.Stop()
$started = $false

function Invoke-Checked([string] $Command, [string[]] $Arguments) {
    if ($Command -eq 'pg_ctl') {
        # Wait for pg_ctl itself; -Wait also waits for its long-lived server process on Windows.
        $quoted = $Arguments | ForEach-Object { '"' + $_.Replace('"', '\"') + '"' }
        $pgProcess = Start-Process -FilePath (Get-Command pg_ctl).Source -ArgumentList $quoted -WindowStyle Hidden -PassThru -RedirectStandardOutput (Join-Path $cluster 'pg-ctl.out') -RedirectStandardError (Join-Path $cluster 'pg-ctl.err')
        if (!$pgProcess.WaitForExit(30000)) { throw "pg_ctl timed out" }
        if ($pgProcess.ExitCode -ne 0) { throw "pg_ctl failed: $(Get-Content (Join-Path $cluster 'pg-ctl.err') -Raw)" }
        return
    }
    & $Command @Arguments
    if ($LASTEXITCODE -ne 0) { throw "$Command failed with exit code $LASTEXITCODE" }
}

Push-Location (Join-Path $PSScriptRoot '../..')
try {
    Invoke-Checked initdb @('-D', $cluster, '-U', 'g13_runner', '-A', 'trust', '--no-locale', '--encoding=UTF8')
    Invoke-Checked pg_ctl @('-D', $cluster, '-l', (Join-Path $cluster 'server.log'), '-o', "-h 127.0.0.1 -p $port", '-w', 'start')
    $started = $true
    $env:APP_ENV = 'testing'
    $env:APP_DEBUG = 'false'
    $env:INERTIA_DEVTOOLS_ENABLED = 'false'
    $env:APP_CONFIG_CACHE = Join-Path $cluster 'no-app-cache.php'
    $env:APP_KEY = 'base64:' + [Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
    $env:DB_CONNECTION = 'pgsql'
    $env:DB_HOST = '127.0.0.1'
    $env:DB_PORT = $port
    $env:DB_URL = ''
    $env:DB_USERNAME = 'g13_runner'
    $env:DB_PASSWORD = ''
    $env:MAIL_MAILER = 'array'
    $env:QUEUE_CONNECTION = 'sync'
    $env:SESSION_DRIVER = 'array'
    $env:CACHE_STORE = 'array'
    $env:G13_BENCHMARK_PROFILE = $Profile
    $client = @('-h', '127.0.0.1', '-p', "$port", '-U', 'g13_runner')

    if (!$BenchmarkOnly) {
        $env:DB_DATABASE = 'aina_g13_suite'
        Invoke-Checked createdb ($client + $env:DB_DATABASE)
        Invoke-Checked psql ($client + @('-X', '-d', $env:DB_DATABASE, '-Atc', 'select version(), current_database()'))
        Invoke-Checked php @('vendor/bin/pest', '--compact')

        $env:DB_DATABASE = 'aina_g13_concurrency'
        Invoke-Checked createdb ($client + $env:DB_DATABASE)
        Invoke-Checked php @('vendor/bin/pest', 'tests/Performance/PostgresImportConcurrencyTest.php', '--compact')
    }

    if (!$SkipBenchmark) {
        $env:DB_DATABASE = 'aina_g13_benchmark'
        Invoke-Checked createdb ($client + $env:DB_DATABASE)
        Invoke-Checked php @('-d', "memory_limit=$MemoryLimit", 'vendor/bin/pest', 'tests/Performance/PostgresVolumeTest.php', '--compact')
    }
} finally {
    try {
        if ($started) {
            Invoke-Checked pg_ctl @('-D', $cluster, '-m', 'fast', '-w', 'stop')
        }
        if (Test-Path -LiteralPath $cluster) {
            $resolved = (Resolve-Path -LiteralPath $cluster).Path
            if ($resolved -eq $cluster -and (Split-Path -Parent $resolved) -eq $tempRoot -and (Split-Path -Leaf $resolved) -match '^aina-g13-[a-f0-9]{32}$') {
                Remove-Item -LiteralPath $resolved -Recurse -Force
            }
        }
    } finally {
        Pop-Location
    }
}
