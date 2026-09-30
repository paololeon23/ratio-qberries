# Vigila historial-in\ y carga sola la última hoja del Excel al cambiar.
# Uso (dejar corriendo en una terminal):
#   powershell -File scripts\watch-historial.ps1
param(
  [int]$Seconds = 8
)
$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$inDir = Join-Path $root 'historial-in'
$script = Join-Path $PSScriptRoot 'cargar-historial.ps1'
$stampFile = Join-Path $root '.tmp-semana\last-xlsx-stamp.txt'
New-Item -ItemType Directory -Force -Path (Split-Path $stampFile) | Out-Null

function Get-HistorialXlsx {
  Get-ChildItem -LiteralPath $inDir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '^\.(xlsx|xlsm)$' -and $_.Name -notlike '~$*' } |
    Sort-Object FullName
}

Write-Host 'Watch historial-in · Licapa I y Licapa II · Ctrl+C para salir'
Write-Host ('Cada ' + $Seconds + 's · solo la última hoja del Excel que cambió')

while ($true) {
  $prev = @{}
  if (Test-Path -LiteralPath $stampFile) {
    foreach ($line in [IO.File]::ReadAllLines($stampFile)) {
      if ($line) { $prev[$line] = $true }
    }
  }
  $next = New-Object System.Collections.Generic.List[string]
  foreach ($xlsx in @(Get-HistorialXlsx)) {
    $stamp = $xlsx.FullName + '|' + $xlsx.LastWriteTimeUtc.Ticks + '|' + $xlsx.Length
    [void]$next.Add($stamp)
    if (-not $prev.ContainsKey($stamp)) {
      Write-Host ''
      Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Cambio: ' + $xlsx.FullName)
      & $script -Path $xlsx.FullName
      Write-Host ('[' + (Get-Date -Format 'HH:mm:ss') + '] Listo. Esperando otro Excel…')
    }
  }
  [IO.File]::WriteAllLines($stampFile, $next)
  Start-Sleep -Seconds $Seconds
}
