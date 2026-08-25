# Ingesta rápida TSV/CSV (pegar desde Excel) -> data/produccion_agg.json
# Columnas esperadas: Etiqueta Huerto Lote H Variedad Grupo DNI CI Apellido Nombre Fecha Hora P T Q F C FP
param(
  [string]$Text = '',
  [string]$InFile = '',
  [switch]$FromClipboard,
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
  return ($s.Trim() -replace '\.0+$', '')
}

function Convert-ExcelDate($v) {
  if ($null -eq $v -or $v -eq '') { return '' }
  if ($v -is [double] -or $v -is [decimal] -or $v -is [int]) {
    try { return ([datetime]::FromOADate([double]$v)).ToString('yyyy-MM-dd') } catch {}
  }
  if ($v -is [datetime]) { return $v.ToString('yyyy-MM-dd') }
  $s = ([string]$v).Trim()
  if ($s -match '^(\d{1,2})/(\d{1,2})/(\d{4})') {
    return ('{0}-{1}-{2}' -f $Matches[3], $Matches[2].PadLeft(2, '0'), $Matches[1].PadLeft(2, '0'))
  }
  if ($s -match '^(\d{4})-(\d{2})-(\d{2})') { return $Matches[0] }
  return $s
}

function Get-CellNum($v) {
  if ($null -eq $v -or $v -eq '') { return 0.0 }
  if ($v -is [double] -or $v -is [decimal] -or $v -is [int]) { return [double]$v }
  $n = 0.0
  if ([double]::TryParse(([string]$v).Replace(',', '.'), [ref]$n)) { return $n }
  return 0.0
}

function Parse-LoteParts([string]$lote) {
  $lote = ([string]$lote).Trim()
  if ($lote -match 'L(\d+)\s*-\s*T(\d+)\s*-\s*M(\d+)') {
    return @{ loteNum = $Matches[1]; turno = "T$($Matches[2])"; modulo = "M$($Matches[3])" }
  }
  if ($lote -match 'T(\d+).*M(\d+)') {
    return @{ loteNum = ''; turno = "T$($Matches[1])"; modulo = "M$($Matches[2])" }
  }
  return @{ loteNum = ''; turno = ''; modulo = '' }
}

function Escape-Json([string]$s) {
  if ($null -eq $s) { return '""' }
  $s = [string]$s
  $s = $s -replace '\\', '\\\\'
  $s = $s -replace '"', '\"'
  $s = $s -replace "`r", '\r' -replace "`n", '\n' -replace "`t", '\t'
  return '"' + $s + '"'
}

function Resolve-Col([hashtable]$map, [string[]]$names) {
  foreach ($n in $names) {
    if ($map.ContainsKey($n)) { return $map[$n] }
  }
  return $null
}

if ($FromClipboard) {
  Add-Type -AssemblyName System.Windows.Forms | Out-Null
  $Text = [System.Windows.Forms.Clipboard]::GetText()
}
if ($InFile -and (Test-Path -LiteralPath $InFile)) {
  $Text = [IO.File]::ReadAllText($InFile, [Text.Encoding]::UTF8)
}
if (-not $Text -or -not $Text.Trim()) {
  throw 'No hay texto para ingerir. Copia filas de Excel (con encabezado) y vuelve a intentar.'
}

$Text = $Text -replace "`r`n", "`n" -replace "`r", "`n"
$lines = @($Text.Split("`n") | Where-Object { $_.Trim() -ne '' })
if ($lines.Count -lt 2) { throw 'Faltan filas. Pega encabezado + datos.' }

# Detectar separador: tab (Excel) o ;
$sep = "`t"
if ($lines[0].IndexOf("`t") -lt 0) {
  if ($lines[0].IndexOf(';') -ge 0) { $sep = ';' }
  elseif ($lines[0].IndexOf(',') -ge 0) { $sep = ',' }
}

$headers = @($lines[0].Split($sep) | ForEach-Object { $_.Trim().Trim('"') })
$col = @{}
for ($i = 0; $i -lt $headers.Count; $i++) {
  if ($headers[$i]) { $col[$headers[$i]] = $i }
}

$idxCi = Resolve-Col $col @('CI', 'Ci', 'ci', 'DNI', 'Dni', 'dni')
$idxC = Resolve-Col $col @('C', 'c', 'Jarras', 'jarras')
$idxFecha = Resolve-Col $col @('Fecha', 'fecha', 'FECHA')
$idxGrupo = Resolve-Col $col @('Grupo', 'grupo', 'LIC')
$idxVar = Resolve-Col $col @('Variedad', 'variedad')
$idxLote = Resolve-Col $col @('Lote', 'lote')
$idxNom = Resolve-Col $col @('Nombre', 'nombre')
$idxApe = Resolve-Col $col @('Apellido', 'apellido')

if ($null -eq $idxCi) { throw 'Falta columna CI o DNI' }
if ($null -eq $idxC) { throw 'Falta columna C (jarras)' }
if ($null -eq $idxFecha) { throw 'Falta columna Fecha' }

Write-Log ("Columnas OK · filas pegadas: {0}" -f ($lines.Count - 1))

$byKey = @{}
$skipped = 0
for ($r = 1; $r -lt $lines.Count; $r++) {
  $cells = $lines[$r].Split($sep)
  $get = {
    param($idx)
    if ($null -eq $idx -or $idx -ge $cells.Count) { return '' }
    return $cells[$idx].Trim().Trim('"')
  }

  $ci = Normalize-Ci (& $get $idxCi)
  if (-not $ci) { $skipped++; continue }
  $fecha = Convert-ExcelDate (& $get $idxFecha)
  if (-not $fecha) { $skipped++; continue }

  $grupo = if ($null -ne $idxGrupo) { (& $get $idxGrupo) } else { '' }
  $variedad = if ($null -ne $idxVar) { (& $get $idxVar) } else { '' }
  $lote = if ($null -ne $idxLote) { (& $get $idxLote) } else { '' }
  $nombre = if ($null -ne $idxNom) { (& $get $idxNom) } else { '' }
  $apellido = if ($null -ne $idxApe) { (& $get $idxApe) } else { '' }
  $cVal = Get-CellNum (& $get $idxC)

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
}

$rows = @($byKey.Values | ForEach-Object {
  $_.c = [Math]::Round($_.c, 2)
  $_
} | Sort-Object -Property @{ Expression = { -$_.c } }, fecha, ci)

if ($rows.Count -eq 0) {
  throw "Pegado sin filas útiles (omitidas $skipped). No se sobrescribe JSON."
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

$version = @{
  version    = (Get-Date).ToUniversalTime().ToString('o')
  excelTicks = "paste-$([DateTime]::UtcNow.Ticks)"
  rows       = $rows.Count
  source     = 'paste-tsv'
  skipped    = $skipped
  syncedAt   = (Get-Date).ToString('dd/MM/yyyy HH:mm:ss')
} | ConvertTo-Json -Compress

[IO.File]::WriteAllText($VersionFile, $version, $utf8)
Write-Log "OK -> produccion_agg.json ($($rows.Count) filas agregadas, omitidas $skipped)"
Write-Output $version
