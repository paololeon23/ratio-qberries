# Convierte data/Produccion_Licapa_copy.xlsx -> data/produccion_agg.json
# Mismo layout que la app demo (fecha + CI + grupo + variedad + lote).
param(
  [string]$ExcelPath = (Join-Path $PSScriptRoot '..\data\Produccion_Licapa_copy.xlsx'),
  [string]$OutJson = (Join-Path $PSScriptRoot '..\data\produccion_agg.json'),
  [string]$VersionFile = (Join-Path $PSScriptRoot '..\data\.data-version.json')
)

$ErrorActionPreference = 'Stop'

function Write-Log([string]$Msg) {
  $ts = Get-Date -Format 'HH:mm:ss'
  Write-Host "  [$ts] $Msg"
}

function Normalize-Ci($v) {
  if ($null -eq $v -or $v -eq '') { return '' }
  if ($v -is [double] -or $v -is [decimal] -or $v -is [int64] -or $v -is [int]) {
    return ([long][double]$v).ToString()
  }
  $s = [string]$v
  return $s.Trim() -replace '\.0+$', ''
}

function Convert-ExcelDate($v) {
  if ($null -eq $v -or $v -eq '') { return '' }
  if ($v -is [double] -or $v -is [decimal] -or $v -is [int]) {
    try {
      $d = [datetime]::FromOADate([double]$v)
      return $d.ToString('yyyy-MM-dd')
    } catch { }
  }
  if ($v -is [datetime]) {
    return $v.ToString('yyyy-MM-dd')
  }
  $s = ([string]$v).Trim()
  if ($s -match '^(\d{1,2})/(\d{1,2})/(\d{4})') {
    return ('{0}-{1}-{2}' -f $Matches[3], $Matches[2].PadLeft(2, '0'), $Matches[1].PadLeft(2, '0'))
  }
  if ($s -match '^(\d{4})-(\d{2})-(\d{2})') {
    return $Matches[0]
  }
  return $s
}

function Get-CellNum($v) {
  if ($null -eq $v -or $v -eq '') { return 0.0 }
  if ($v -is [double] -or $v -is [decimal] -or $v -is [int]) { return [double]$v }
  $n = 0.0
  $ok = [double]::TryParse(([string]$v).Replace(',', '.'), [ref]$n)
  if ($ok) { return $n }
  return 0.0
}

function Parse-LoteParts([string]$lote) {
  $lote = ([string]$lote).Trim()
  if ($lote -match 'L(\d+)\s*-\s*T(\d+)\s*-\s*M(\d+)') {
    return @{
      loteNum = $Matches[1]
      turno   = "T$($Matches[2])"
      modulo  = "M$($Matches[3])"
    }
  }
  if ($lote -match 'T(\d+).*M(\d+)') {
    return @{
      loteNum = ''
      turno   = "T$($Matches[1])"
      modulo  = "M$($Matches[2])"
    }
  }
  return @{ loteNum = ''; turno = ''; modulo = '' }
}

function Get-ColMap($headerRow, $colCount) {
  $map = @{}
  for ($c = 0; $c -lt $colCount; $c++) {
    $name = ([string]$headerRow[$c]).Trim()
    if ($name) { $map[$name] = $c }
  }
  return $map
}

function Escape-Json([string]$s) {
  if ($null -eq $s) { return '""' }
  $s = [string]$s
  $s = $s -replace '\\', '\\\\'
  $s = $s -replace '"', '\"'
  $s = $s -replace "`r", '\r' -replace "`n", '\n' -replace "`t", '\t'
  return '"' + $s + '"'
}

if (-not (Test-Path -LiteralPath $ExcelPath)) {
  Write-Log "Excel no encontrado: $ExcelPath"
  exit 1
}

Write-Log "Leyendo Excel..."
$excel = $null
$wb = $null
$tempXlsx = $null
try {
  # Copia temporal: evita archivo bloqueado y lee lo último guardado en disco
  $tempXlsx = Join-Path $env:TEMP ("qb-licapa-" + [guid]::NewGuid().ToString('N') + ".xlsx")
  Copy-Item -LiteralPath $ExcelPath -Destination $tempXlsx -Force

  $excel = New-Object -ComObject Excel.Application
  $excel.Visible = $false
  $excel.DisplayAlerts = $false
  $excel.ScreenUpdating = $false
  $excel.AskToUpdateLinks = $false
  try { $excel.EnableEvents = $false } catch {}

  $wb = $excel.Workbooks.Open($tempXlsx, 0, $true)
  $sh = $wb.Sheets.Item(1)
  $data = $sh.UsedRange.Value2

  if (-not $data) {
    throw 'Hoja vacia'
  }

  $rLo = $data.GetLowerBound(0)
  $rHi = $data.GetUpperBound(0)
  $cLo = $data.GetLowerBound(1)
  $cHi = $data.GetUpperBound(1)
  Write-Log "Filas: $($rHi - $rLo + 1) · Columnas: $($cHi - $cLo + 1) · bounds $rLo..$rHi x $cLo..$cHi"

  $headers = @()
  for ($c = $cLo; $c -le $cHi; $c++) { $headers += [string]$data[$rLo, $c] }
  $col = Get-ColMap $headers ($headers.Count)

  foreach ($need in @('CI', 'C', 'Fecha', 'Grupo', 'Variedad', 'Lote', 'Apellido', 'Nombre')) {
    if (-not $col.ContainsKey($need)) {
      throw "Falta columna: $need"
    }
  }

  $byKey = @{}
  $skipped = 0

  for ($r = ($rLo + 1); $r -le $rHi; $r++) {
    $ci = Normalize-Ci $data[$r, ($cLo + $col['CI'])]
    if (-not $ci) { $skipped++; continue }

    $fecha = Convert-ExcelDate $data[$r, ($cLo + $col['Fecha'])]
    if (-not $fecha) { $skipped++; continue }

    $grupo = ([string]$data[$r, ($cLo + $col['Grupo'])]).Trim()
    $variedad = ([string]$data[$r, ($cLo + $col['Variedad'])]).Trim()
    $lote = ([string]$data[$r, ($cLo + $col['Lote'])]).Trim()
    $nombre = ([string]$data[$r, ($cLo + $col['Nombre'])]).Trim()
    $apellido = ([string]$data[$r, ($cLo + $col['Apellido'])]).Trim()
    $cVal = Get-CellNum $data[$r, ($cLo + $col['C'])]

    $key = "$fecha|$ci|$grupo|$variedad|$lote"
    if (-not $byKey.ContainsKey($key)) {
      $parts = Parse-LoteParts $lote
      $byKey[$key] = [ordered]@{
        fecha    = $fecha
        ci       = $ci
        grupo    = $grupo
        variedad = $variedad
        apellido = $apellido
        nombre   = $nombre
        lote     = $lote
        loteNum  = $parts.loteNum
        modulo   = $parts.modulo
        turno    = $parts.turno
        c        = 0.0
        filas    = 0
      }
    }

    $row = $byKey[$key]
    $row.c += $cVal
    $row.filas += 1
    if ((-not $row.nombre -or $row.nombre -eq 'S/N') -and $nombre -and $nombre -ne 'S/N') {
      $row.nombre = $nombre
    }
    if ((-not $row.apellido -or $row.apellido.StartsWith('(')) -and $apellido -and -not $apellido.StartsWith('(')) {
      $row.apellido = $apellido
    }
  }

  $rows = @($byKey.Values | ForEach-Object {
    $_.c = [Math]::Round($_.c, 2)
    $_
  } | Sort-Object -Property @{ Expression = { -$_.c } }, fecha, ci)

  Write-Log "Agregado: $($rows.Count) filas (omitidas $skipped)"

  # No pisar data buena con vacío (evita pérdida)
  if ($rows.Count -eq 0) {
    throw "Sync sin filas útiles (omitidas $skipped). No se sobrescribe JSON."
  }

  $utf8 = New-Object System.Text.UTF8Encoding $false
  $tmpJson = "$OutJson.tmp"
  $sw = New-Object System.IO.StreamWriter($tmpJson, $false, $utf8)
  $sw.Write('[')
  for ($i = 0; $i -lt $rows.Count; $i++) {
    if ($i -gt 0) { $sw.Write(',') }
    $o = $rows[$i]
    $sw.Write(
      ('{{"fecha":{0},"ci":{1},"grupo":{2},"variedad":{3},"apellido":{4},"nombre":{5},"lote":{6},"loteNum":{7},"modulo":{8},"turno":{9},"c":{10},"filas":{11}}}' -f
        (Escape-Json $o.fecha),
        (Escape-Json $o.ci),
        (Escape-Json $o.grupo),
        (Escape-Json $o.variedad),
        (Escape-Json $o.apellido),
        (Escape-Json $o.nombre),
        (Escape-Json $o.lote),
        (Escape-Json $o.loteNum),
        (Escape-Json $o.modulo),
        (Escape-Json $o.turno),
        ([string]$o.c -replace ',', '.'),
        $o.filas)
    )
  }
  $sw.Write(']')
  $sw.Close()
  Move-Item -LiteralPath $tmpJson -Destination $OutJson -Force

  $excelTicks = $null
  try { $excelTicks = (Get-Item -LiteralPath $ExcelPath).LastWriteTimeUtc.Ticks } catch {}

  $version = @{
    version  = (Get-Date).ToUniversalTime().ToString('o')
    excelTicks = "$excelTicks"
    rows     = $rows.Count
    source   = [IO.Path]::GetFileName($ExcelPath)
    skipped  = $skipped
    syncedAt = (Get-Date).ToString('dd/MM/yyyy HH:mm:ss')
  } | ConvertTo-Json -Compress

  [IO.File]::WriteAllText($VersionFile, $version, $utf8)
  Write-Log "OK -> produccion_agg.json ($($rows.Count) filas)"
}
finally {
  if ($wb) { $wb.Close($false) | Out-Null }
  if ($excel) {
    $excel.Quit() | Out-Null
    [System.Runtime.Interopservices.Marshal]::ReleaseComObject($excel) | Out-Null
  }
  if ($tempXlsx -and (Test-Path -LiteralPath $tempXlsx)) {
    Remove-Item -LiteralPath $tempXlsx -Force -ErrorAction SilentlyContinue
  }
  [GC]::Collect()
  [GC]::WaitForPendingFinalizers()
}
