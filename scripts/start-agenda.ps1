param([string]$PostgresBin = "C:\Program Files\PostgreSQL\15\bin")
$ErrorActionPreference = "Stop"
$projectPath = Split-Path -Parent $PSScriptRoot
$localPath = Join-Path $projectPath ".agenda-local"
$pythonPath = Join-Path $projectPath ".venv\Scripts\python.exe"
$nodePath = "C:\Program Files\nodejs\node.exe"
Set-Location -LiteralPath $projectPath
if (!(Test-Path -LiteralPath $pythonPath)) { throw "Instala el entorno Python indicado en AGENDA_LOCAL.md" }
if (Test-Path -LiteralPath (Join-Path $localPath "postgres\PG_VERSION")) {
    & (Join-Path $PostgresBin "pg_ctl.exe") -D (Join-Path $localPath "postgres") status *> $null
    if ($LASTEXITCODE -ne 0) {
        & (Join-Path $PostgresBin "pg_ctl.exe") -D (Join-Path $localPath "postgres") -l (Join-Path $localPath "postgres.log") -o "-p 55432 -h 127.0.0.1" -w start
        if ($LASTEXITCODE -ne 0) { throw "No se pudo iniciar PostgreSQL." }
    }
}
& $pythonPath -m api.agenda.setup
if ($LASTEXITCODE -ne 0) { throw "Falló la inicialización de la agenda." }
function Port-Open([int]$Port) {
    $client = New-Object System.Net.Sockets.TcpClient
    try { $client.Connect("127.0.0.1",$Port); return $true } catch { return $false } finally { $client.Dispose() }
}
if (!(Port-Open 8000)) {
    Start-Process -FilePath $pythonPath -ArgumentList "-m uvicorn api.index:app --host 127.0.0.1 --port 8000 --no-access-log" -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localPath "api.log") -RedirectStandardError (Join-Path $localPath "api-error.log")
}
if (!(Port-Open 5173)) {
    Start-Process -FilePath $nodePath -ArgumentList "node_modules/vite/bin/vite.js --host 127.0.0.1 --port 5173 --strictPort" -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localPath "web.log") -RedirectStandardError (Join-Path $localPath "web-error.log")
}
$workerPidFile = Join-Path $localPath "worker.pid"
$workerRunning = $false
if (Test-Path -LiteralPath $workerPidFile) {
    $savedWorkerId = Get-Content -LiteralPath $workerPidFile
    $workerInfo = Get-CimInstance Win32_Process -Filter "ProcessId = $savedWorkerId" -ErrorAction SilentlyContinue
    $workerRunning = $workerInfo -and $workerInfo.CommandLine -like "*api.agenda.worker*"
}
if (!$workerRunning) {
    $workerHandle = Start-Process -FilePath $pythonPath -ArgumentList "-m api.agenda.worker" -WorkingDirectory $projectPath -WindowStyle Hidden -RedirectStandardOutput (Join-Path $localPath "worker.log") -RedirectStandardError (Join-Path $localPath "worker-error.log") -PassThru
    Set-Content -LiteralPath $workerPidFile -Value $workerHandle.Id
}
Write-Host "Reservas: http://localhost:5173/reservar"
Write-Host "Administración: http://localhost:5173/admin"
Write-Host "Contraseña local: .agenda-local/admin-access.txt"
Write-Host "Para procesar correos locales: .venv\Scripts\python.exe -m api.agenda.worker"
