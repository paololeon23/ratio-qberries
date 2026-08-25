# Servidor local Q Berries + sync automático desde Excel (variable / rápido)
$ErrorActionPreference = 'Stop'
$Port = 8787
$Root = $PSScriptRoot
$SyncScript = Join-Path $Root 'scripts\sync-excel.ps1'
$IngestScript = Join-Path $Root 'scripts\ingest-tsv.ps1'
$ExcelPath = Join-Path $Root 'data\Produccion_Licapa_copy.xlsx'
$VersionFile = Join-Path $Root 'data\.data-version.json'
$AggJson = Join-Path $Root 'data\produccion_agg.json'
$script:SyncBusy = $false
$script:LastSyncedTicks = $null
$script:LastSyncedStamp = $null

function Get-MimeType([string]$Path) {
  switch -Regex ([IO.Path]::GetExtension($Path)) {
    '\.html$' { return 'text/html; charset=utf-8' }
    '\.css$' { return 'text/css; charset=utf-8' }
    '\.js$' { return 'application/javascript; charset=utf-8' }
    '\.json$' { return 'application/json; charset=utf-8' }
    '\.webmanifest$' { return 'application/manifest+json; charset=utf-8' }
    '\.png$' { return 'image/png' }
    '\.jpg$' { return 'image/jpeg' }
    '\.svg$' { return 'image/svg+xml' }
    default { return 'application/octet-stream' }
  }
}

function Get-ExcelStamp {
  if (-not (Test-Path -LiteralPath $ExcelPath)) { return $null }
  try {
    $it = Get-Item -LiteralPath $ExcelPath
    return "$($it.LastWriteTimeUtc.Ticks)|$($it.Length)"
  } catch {
    return $null
  }
}

function Get-ExcelTicks {
  $stamp = Get-ExcelStamp
  if (-not $stamp) { return $null }
  return ($stamp -split '\|')[0]
}

function Invoke-DataSync {
  param(
    [string]$Reason = 'manual',
    [switch]$WaitBusy
  )
  if ($script:SyncBusy) {
    if (-not $WaitBusy) { return $false }
    $waited = 0
    while ($script:SyncBusy -and $waited -lt 25000) {
      Start-Sleep -Milliseconds 150
      $waited += 150
    }
    if ($script:SyncBusy) { return $false }
  }
  if (-not (Test-Path -LiteralPath $SyncScript)) {
    Write-Host "  [sync] Script no encontrado" -ForegroundColor Yellow
    return $false
  }
  if (-not (Test-Path -LiteralPath $ExcelPath)) {
    Write-Host "  [sync] Pon tu Excel en data/Produccion_Licapa_copy.xlsx" -ForegroundColor Yellow
    return $false
  }
  $script:SyncBusy = $true
  try {
    Write-Host "  [sync] Actualizando ($Reason)..." -ForegroundColor Cyan
    & $SyncScript -ExcelPath $ExcelPath
    if ($LASTEXITCODE -and $LASTEXITCODE -ne 0) { throw "sync exit $LASTEXITCODE" }
    $script:LastSyncedStamp = Get-ExcelStamp
    $script:LastSyncedTicks = Get-ExcelTicks
    Write-Host "  [sync] Listo · la app se refresca sola" -ForegroundColor Green
    return $true
  } catch {
    Write-Host "  [sync] Error (se conserva data anterior): $($_.Exception.Message)" -ForegroundColor Red
    return $false
  } finally {
    $script:SyncBusy = $false
  }
}

function Start-ExcelPoller {
  if (-not (Test-Path -LiteralPath $ExcelPath)) {
    Write-Host "  Excel no encontrado aún · coloca Produccion_Licapa_copy.xlsx en data/" -ForegroundColor Yellow
    return
  }
  $script:LastSyncedStamp = Get-ExcelStamp
  $script:LastSyncedTicks = Get-ExcelTicks

  # Poll rápido: mtime + tamaño (preciso si Excel guarda/reemplaza)
  Start-Job -Name 'QB-ExcelPoll' -ScriptBlock {
    param($Excel, $SyncScript)
    $last = $null
    try {
      if (Test-Path -LiteralPath $Excel) {
        $it = Get-Item -LiteralPath $Excel
        $last = "$($it.LastWriteTimeUtc.Ticks)|$($it.Length)"
      }
    } catch {}

    while ($true) {
      Start-Sleep -Milliseconds 400
      try {
        if (-not (Test-Path -LiteralPath $Excel)) { continue }
        $it = Get-Item -LiteralPath $Excel
        $t = "$($it.LastWriteTimeUtc.Ticks)|$($it.Length)"
        if ($null -eq $last) {
          $last = $t
          continue
        }
        if ($t -eq $last) { continue }

        # Debounce: Excel escribe en 2-3 pasos al guardar
        Start-Sleep -Milliseconds 280
        if (-not (Test-Path -LiteralPath $Excel)) { continue }
        $it2 = Get-Item -LiteralPath $Excel
        $t2 = "$($it2.LastWriteTimeUtc.Ticks)|$($it2.Length)"
        if ($t2 -eq $last) { continue }

        $last = $t2
        & $SyncScript -ExcelPath $Excel
      } catch {
        # bloqueado un momento: reintenta
      }
    }
  } -ArgumentList $ExcelPath, $SyncScript | Out-Null

  Write-Host "  Auto-detect Excel ON (~0.4 s) · guarda y llega solo" -ForegroundColor DarkGray
}

function Send-Bytes($res, [byte[]]$bytes, [string]$type, [int]$code) {
  $res.StatusCode = $code
  $res.ContentType = $type
  $res.ContentLength64 = $bytes.Length
  $res.Headers['Cache-Control'] = 'no-store, no-cache, must-revalidate'
  $res.OutputStream.Write($bytes, 0, $bytes.Length)
}

$listener = New-Object System.Net.HttpListener
$listener.Prefixes.Add("http://127.0.0.1:$Port/")
$listener.Start()

$url = "http://127.0.0.1:$Port/"
Write-Host ""
Write-Host "  Q Berries · Reportes" -ForegroundColor Green
Write-Host "  Abre: $url" -ForegroundColor Cyan
Write-Host "  Fuente: data/Produccion_Licapa_copy.xlsx" -ForegroundColor DarkGray
Write-Host "  Auto: guarda Excel → la app se actualiza sola (GET cada ~0.4s)" -ForegroundColor DarkGray
Write-Host "  Ctrl+C para detener" -ForegroundColor DarkGray
Write-Host ""

Start-ExcelPoller
Invoke-DataSync -Reason 'inicio' | Out-Null
Start-Process $url

try {
  while ($listener.IsListening) {
    $ctx = $listener.GetContext()
    $req = $ctx.Request
    $res = $ctx.Response

    try {
      $raw = [Uri]::UnescapeDataString($req.Url.AbsolutePath)

      if ($raw -eq '/api/data-version') {
        # Cada GET revisa Excel: si cambió, sincroniza ya (rápido y preciso)
        $stamp = Get-ExcelStamp
        $forceSync = $false
        try {
          $forceSync = ($req.Url.Query -match '(^|&)sync=1(&|$)')
        } catch {}
        if ($forceSync -or ($stamp -and $script:LastSyncedStamp -and ($stamp -ne $script:LastSyncedStamp) -and -not $script:SyncBusy)) {
          Invoke-DataSync -Reason $(if ($forceSync) { 'sync=1' } else { 'poll-api' }) -WaitBusy:$forceSync | Out-Null
        } elseif ($stamp -and -not $script:LastSyncedStamp -and -not $script:SyncBusy) {
          Invoke-DataSync -Reason 'first-stamp' | Out-Null
        }
        if (Test-Path -LiteralPath $VersionFile) {
          Send-Bytes $res ([IO.File]::ReadAllBytes($VersionFile)) 'application/json; charset=utf-8' 200
        } else {
          Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes('{"version":"0","rows":0}')) 'application/json; charset=utf-8' 200
        }
        continue
      }

      if ($raw -eq '/api/sync-now') {
        Invoke-DataSync -Reason 'botón actualizar' -WaitBusy | Out-Null
        if (Test-Path -LiteralPath $VersionFile) {
          Send-Bytes $res ([IO.File]::ReadAllBytes($VersionFile)) 'application/json; charset=utf-8' 200
        } else {
          Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes('{"ok":false}')) 'application/json; charset=utf-8' 500
        }
        continue
      }

      if ($raw -eq '/api/paste') {
        # Body = texto pegado de Excel (TSV con encabezado)
        $reader = New-Object IO.StreamReader($req.InputStream, [Text.Encoding]::UTF8)
        $body = $reader.ReadToEnd()
        $reader.Close()
        if (-not $body -or -not $body.Trim()) {
          Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes('{"ok":false,"error":"Sin datos pegados"}')) 'application/json; charset=utf-8' 400
          continue
        }
        try {
          $tmp = Join-Path $env:TEMP ("qb-paste-" + [guid]::NewGuid().ToString('N') + ".tsv")
          [IO.File]::WriteAllText($tmp, $body, [Text.UTF8Encoding]::new($false))
          $out = & $IngestScript -InFile $tmp -OutJson $AggJson -VersionFile $VersionFile 2>&1 | Out-String
          Remove-Item -LiteralPath $tmp -Force -ErrorAction SilentlyContinue
          if (-not (Test-Path -LiteralPath $VersionFile)) { throw 'No se generó versión' }
          $ver = [IO.File]::ReadAllText($VersionFile, [Text.Encoding]::UTF8)
          Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes($ver)) 'application/json; charset=utf-8' 200
        } catch {
          $msg = $_.Exception.Message -replace '"', "'"
          Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes(('{0}"ok":false,"error":"{1}"{2}' -f '{', $msg, '}'))) 'application/json; charset=utf-8' 500
        }
        continue
      }

      if ($raw -eq '/') { $raw = '/index.html' }
      $rel = $raw.TrimStart('/').Replace('/', [IO.Path]::DirectorySeparatorChar)
      $file = [IO.Path]::GetFullPath((Join-Path $Root $rel))

      if (-not $file.StartsWith($Root, [StringComparison]::OrdinalIgnoreCase)) {
        $res.StatusCode = 403
        $res.Close()
        continue
      }

      if (Test-Path -LiteralPath $file -PathType Leaf) {
        Send-Bytes $res ([IO.File]::ReadAllBytes($file)) (Get-MimeType $file) 200
      } else {
        Send-Bytes $res ([Text.Encoding]::UTF8.GetBytes('404 Not Found')) 'text/plain; charset=utf-8' 404
      }
    } catch {
      $res.StatusCode = 500
    } finally {
      $res.Close()
    }
  }
} finally {
  Get-Job -Name 'QB-ExcelPoll' -ErrorAction SilentlyContinue | Stop-Job -PassThru | Remove-Job -Force -ErrorAction SilentlyContinue
  $listener.Stop()
}
