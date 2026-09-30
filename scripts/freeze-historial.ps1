$ErrorActionPreference = 'Stop'
$root = Split-Path -Parent $PSScriptRoot
$supPath = Join-Path $root 'js\supervisors.js'
$inJs = Join-Path $root 'js\historial-data.js'
$outJs = $inJs
$outJson = Join-Path $root 'js\historial.json'

function Lic-Key([string]$grupo) {
  if ($grupo -match '(?i)LIC\s*0*(\d{1,2})') {
    return 'LIC ' + $Matches[1].PadLeft(2, '0')
  }
  return ([string]$grupo).ToUpperInvariant()
}

Write-Host 'Padrón...'
$supTxt = [IO.File]::ReadAllText($supPath)
$rowRx = [regex]::new("\{[^{}]*nombre:\s*'(?<n>[^']+)'[^{}]*dni:\s*'(?<d>[^']+)'[^{}]*lic:\s*'(?<l>[^']+)'[^{}]*fecha:\s*'(?<f>[^']+)'[^{}]*\}")
$padron = @{}
foreach ($m in $rowRx.Matches($supTxt)) {
  $block = $m.Value
  if ($block -match 'activo\s*:\s*false') { continue }
  $fecha = $m.Groups['f'].Value
  $lic = Lic-Key $m.Groups['l'].Value
  if (-not $fecha -or -not $lic -or $lic -match 'NO TENGO') { continue }
  if (-not $padron.ContainsKey($fecha)) { $padron[$fecha] = @{} }
  $padron[$fecha][$lic] = $m.Groups['n'].Value
}
$soloDia = @{}
$jefesDiaPath = Join-Path $root 'js\jefes-dia.json'
if (Test-Path $jefesDiaPath) {
  $jd = Get-Content $jefesDiaPath -Raw -Encoding UTF8 | ConvertFrom-Json
  foreach ($prop in $jd.PSObject.Properties) {
    $fecha = [string]$prop.Name
    if ($fecha -notmatch '^\d{4}-\d{2}-\d{2}$') { continue }
    foreach ($r in @($prop.Value)) {
      $lic = Lic-Key ([string]$r.lic)
      if (-not $lic) { continue }
      if (-not $padron.ContainsKey($fecha)) { $padron[$fecha] = @{} }
      $padron[$fecha][$lic] = [string]$r.nombre
      if ($r.soloDia -ne $false) { $soloDia["$fecha|$lic"] = $true }
    }
  }
  Write-Host ('jefes-dia=' + $soloDia.Count)
}
$fechasPad = @($padron.Keys | Sort-Object -Descending)
Write-Host ('fechas padron=' + $fechasPad.Count)

function Jefe-De([string]$lic, [string]$fecha) {
  $key = Lic-Key $lic
  if (-not $key) { return '' }
  if ($padron.ContainsKey($fecha) -and $padron[$fecha].ContainsKey($key)) {
    return [string]$padron[$fecha][$key]
  }
  foreach ($fd in $fechasPad) {
    if ($fd -gt $fecha) { continue }
    if ($padron.ContainsKey($fd) -and $padron[$fd].ContainsKey($key)) {
      if ($soloDia.ContainsKey("$fd|$key")) { continue }
      return [string]$padron[$fd][$key]
    }
  }
  return ''
}

Write-Host 'Historial...'
$raw = [IO.File]::ReadAllText($inJs)
$json = $raw -replace '(?s)^window\.QB=window\.QB\|\|\{\};\s*QB\.historialData=', ''
$json = $json.Trim().TrimEnd(';')
$json = $json -replace 'semanaActual:', '"semanaActual":' -replace 'dias:', '"dias":' -replace ',p:', ',"p":'
$pack = $json | ConvertFrom-Json
$dias = @($pack.dias)
Write-Host ('dias=' + ($dias -join ', '))

$pJson = New-Object System.Text.StringBuilder
$jPretty = New-Object System.Text.StringBuilder
[void]$pJson.Append('{')
[void]$jPretty.AppendLine('{')
[void]$jPretty.AppendLine('  "semanaActual": ' + $pack.semanaActual + ',')
[void]$jPretty.AppendLine('  "fijo": true,')
[void]$jPretty.AppendLine('  "nota": "Snapshot del Excel semanal. El jefe y el LIC de cada dia quedan fijos; no se recalculan si cambia el padron.",')
$diasLit = ($dias | ForEach-Object { '"' + $_ + '"' }) -join ', '
[void]$jPretty.AppendLine('  "dias": [' + $diasLit + '],')
[void]$jPretty.AppendLine('  "personas": {')

$firstP = $true
$nOk = 0
$nJefe = 0
$props = $pack.p.PSObject.Properties
foreach ($prop in $props) {
  $dni = $prop.Name
  $src = $prop.Value
  $nombre = [string]$src.n
  $nEsc = ($nombre -replace '\\', '\\' -replace '"', '\"')
  if (-not $firstP) {
    [void]$pJson.Append(',')
    [void]$jPretty.AppendLine(',')
  }
  $firstP = $false
  [void]$pJson.Append('"' + $dni + '":{n:"' + $nEsc + '",x:{')
  [void]$jPretty.Append('    "' + $dni + '": {' + "`n" + '      "nombre": "' + $nEsc + '",' + "`n" + '      "dias": {')
  $firstD = $true
  $dayProps = $src.x.PSObject.Properties | Sort-Object Name
  foreach ($dp in $dayProps) {
    $fecha = $dp.Name
    $arr = @($dp.Value)
    $c = 0
    if ($arr.Count -gt 0) { $c = [int]$arr[0] }
    $lic = ''
    if ($arr.Count -gt 1) { $lic = [string]$arr[1] }
    $jefe = ''
    if ($arr.Count -gt 2 -and $arr[2]) { $jefe = [string]$arr[2] }
    $huerto = ''
    if ($arr.Count -gt 3) { $huerto = [string]$arr[3] }
    $variedad = ''
    if ($arr.Count -gt 4) { $variedad = [string]$arr[4] }
    $bloque = ''
    if ($arr.Count -gt 5) { $bloque = [string]$arr[5] }
    if (-not $bloque) { $bloque = 'i' }
    if (-not $jefe) { $jefe = Jefe-De $lic $fecha }
    if ($jefe) { $nJefe++ }
    $gEsc = ($lic -replace '\\', '\\' -replace '"', '\"')
    $jEsc = ($jefe -replace '\\', '\\' -replace '"', '\"')
    $hEsc = ($huerto -replace '\\', '\\' -replace '"', '\"')
    $vEsc = ($variedad -replace '\\', '\\' -replace '"', '\"')
    $bEsc = ($bloque -replace '\\', '\\' -replace '"', '\"')
    if (-not $firstD) {
      [void]$pJson.Append(',')
      [void]$jPretty.Append(',')
    }
    $firstD = $false
    [void]$pJson.Append('"' + $fecha + '":[' + $c + ',"' + $gEsc + '","' + $jEsc + '","' + $hEsc + '","' + $vEsc + '","' + $bEsc + '"]')
    [void]$jPretty.Append("`n" + '        "' + $fecha + '": { "jarras": ' + $c + ', "lic": "' + $gEsc + '", "jefe": "' + $jEsc + '", "huerto": "' + $hEsc + '", "variedad": "' + $vEsc + '", "bloque": "' + $bEsc + '" }')
  }
  [void]$pJson.Append('}}')
  [void]$jPretty.Append("`n" + '      }' + "`n" + '    }')
  $nOk++
}
[void]$pJson.Append('}')
[void]$jPretty.AppendLine('')
[void]$jPretty.AppendLine('  }')
[void]$jPretty.Append('}')

$js = "window.QB=window.QB||{};`nQB.historialData={bloque:`"i`",semanaActual:" + $pack.semanaActual + ",fijo:1,dias:[" + $diasLit + "],p:" + $pJson.ToString() + "};"
[IO.File]::WriteAllText($outJs, $js, (New-Object System.Text.UTF8Encoding $false))
[IO.File]::WriteAllText($outJson, $jPretty.ToString(), (New-Object System.Text.UTF8Encoding $false))
Write-Host ('personas=' + $nOk + ' dias-con-jefe=' + $nJefe)
Write-Host ('OK ' + $outJs + ' bytes=' + (Get-Item $outJs).Length)
Write-Host ('OK ' + $outJson + ' bytes=' + (Get-Item $outJson).Length)
