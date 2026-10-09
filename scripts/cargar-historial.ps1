# Carga un Excel de cosecha y lo mezcla al historial fijo.
# Uso: deja el .xlsx en historial-in\ y corre:
#   powershell -File scripts\cargar-historial.ps1
# O pasa la ruta:
#   powershell -File scripts\cargar-historial.ps1 -Path "C:\ruta\SEMANA.xlsx"
param(
  [string]$Path = ''
)
$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $PSScriptRoot
$inDir = Join-Path $root 'historial-in'
$tmp = Join-Path $root '.tmp-semana'
$unzip = Join-Path $tmp 'unzip'
$outJs = Join-Path $root 'js\historial-data.js'
$jsonPath = Join-Path $root 'js\historial.json'
Add-Type -AssemblyName System.IO.Compression.FileSystem

New-Item -ItemType Directory -Force -Path $inDir, $tmp | Out-Null

function Bloque-DeCarpeta([string]$full) {
  $name = Split-Path -Leaf (Split-Path -Parent $full)
  if ($name -match '(?i)^licapa\s*(ii|2)\b') { return 'ii' }
  if ($name -match '(?i)^licapa\s*(i|1)\b') { return 'i' }
  return ''
}

function Read-ZipText($zip, [string]$name) {
  $entry = $zip.GetEntry($name)
  if (-not $entry) { return $null }
  $reader = New-Object IO.StreamReader($entry.Open())
  try { return $reader.ReadToEnd() } finally { $reader.Close() }
}

$xlsx = $null
if ($Path -and (Test-Path -LiteralPath $Path)) {
  $xlsx = Get-Item -LiteralPath $Path
} else {
  $xlsx = Get-ChildItem -LiteralPath $inDir -Recurse -File -ErrorAction SilentlyContinue |
    Where-Object { $_.Extension -match '^\.(xlsx|xlsm)$' -and $_.Name -notlike '~$*' } |
    Sort-Object LastWriteTime -Descending |
    Select-Object -First 1
}
if (-not $xlsx) {
  Write-Host 'Pon el Excel en historial-in\Licapa I o historial-in\Licapa II.'
  exit 1
}
$bloqueExcel = Bloque-DeCarpeta $xlsx.FullName

Write-Host ('Excel: ' + $xlsx.FullName + $(if ($bloqueExcel) { ' · Licapa ' + $bloqueExcel.ToUpper() } else { '' }))
$zip = [IO.Compression.ZipFile]::OpenRead($xlsx.FullName)
$wbXml = Read-ZipText $zip 'xl/workbook.xml'
$relsXml = Read-ZipText $zip 'xl/_rels/workbook.xml.rels'
$sheetIds = [regex]::Matches($wbXml, '<sheet\b[^>]*r:id="(?<id>[^"]+)"')
if (-not $sheetIds.Count) {
  $zip.Dispose()
  Write-Host 'No hay hojas en el Excel.'
  exit 1
}
$lastId = $sheetIds[$sheetIds.Count - 1].Groups['id'].Value
$rel = [regex]::Match($relsXml, 'Id="' + [regex]::Escape($lastId) + '"[^>]*Target="(?<t>[^"]+)"')
if (-not $rel.Success) {
  $rel = [regex]::Match($relsXml, 'Target="(?<t>[^"]+)"[^>]*Id="' + [regex]::Escape($lastId) + '"')
}
$target = ($rel.Groups['t'].Value -replace '\\', '/')
if ($target -match '^\.\./') { $target = $target -replace '^\.\./', '' }
if ($target -and $target -notmatch '^xl/') { $target = 'xl/' + $target.TrimStart('/') }
if (-not $target) { $target = 'xl/worksheets/sheet' + $sheetIds.Count + '.xml' }
Write-Host ('Solo última hoja: ' + $target + ' de ' + $sheetIds.Count + ' (automático · día más reciente del Excel)')
$sheetXml = Read-ZipText $zip $target
$ssXml = Read-ZipText $zip 'xl/sharedStrings.xml'
$zip.Dispose()
if (-not $sheetXml) {
  Write-Host 'No pude leer la última hoja.'
  exit 1
}
$ss = @()
if ($ssXml) {
  $ssHits = [regex]::Matches($ssXml, '<t[^>]*>(?<t>[\s\S]*?)</t>')
  $ss = New-Object string[] $ssHits.Count
  for ($i = 0; $i -lt $ssHits.Count; $i++) {
    $ss[$i] = [System.Net.WebUtility]::HtmlDecode($ssHits[$i].Groups['t'].Value)
  }
}

$people = @{}
$daySet = @{}

# Solo la última hoja (día más reciente). El resto ya está fijo.
if ($sheetXml) {
  Write-Host ('Hoja ' + $target + ' ...')
  $rows = $sheetXml.Split([string[]]@('<row '), [StringSplitOptions]::None)
  $n = 0
  foreach ($chunk in $rows) {
    if ($chunk -notmatch '^r="(?<rn>\d+)"') { continue }
    $rn = [int]$Matches['rn']
    if ($rn -lt 2) { continue }
    $ci = ''
    $fecha = ''
    $grupo = ''
    $ape = ''
    $nom = ''
    $huerto = ''
    $variedad = ''
    foreach ($m in [regex]::Matches($chunk, '<c r="(?<r>[A-Z]+)(?<row>\d+)"(?<a>[^>]*)>(?<inner>[\s\S]*?)</c>')) {
      $col = $m.Groups['r'].Value
      $inner = $m.Groups['inner'].Value
      $isS = $m.Groups['a'].Value.Contains('t="s"')
      $val = ''
      if ($inner -match '<v>(?<v>[^<]*)</v>') { $val = $Matches['v'] }
      $txt = $val
      if ($isS) {
        $idx = 0
        if ([int]::TryParse($val, [ref]$idx) -and $idx -ge 0 -and $idx -lt $ss.Count) { $txt = $ss[$idx] } else { $txt = '' }
      }
      switch ($col) {
        'B' { if ($txt) { $huerto = $txt.Trim() } }
        'E' { if ($txt) { $variedad = $txt.Trim() } }
        'F' { $grupo = $txt }
        'G' {
          if (-not $ci) {
            $d = ($txt -replace '\D', '')
            if ($d.Length -ge 7) { $ci = $d }
          }
        }
        'H' {
          $d = ($txt -replace '\D', '')
          if ($d.Length -ge 7) { $ci = $d }
        }
        'I' { $ape = $txt }
        'J' { $nom = $txt }
        'K' {
          $serial = 0.0
          if ([double]::TryParse($val, [Globalization.NumberStyles]::Float, [Globalization.CultureInfo]::InvariantCulture, [ref]$serial) -and $serial -gt 40000) {
            $fecha = [DateTime]::FromOADate($serial).ToString('yyyy-MM-dd')
          }
        }
      }
    }
    if (-not $ci -or -not $fecha) { continue }
    if ($ci.Length -gt 9) { $ci = $ci.Substring(0, 9) }
    $daySet[$fecha] = 1
    if (-not $people.ContainsKey($ci)) {
      $people[$ci] = @{ n = (($ape, $nom) | Where-Object { $_ }) -join ' '; x = @{} }
    } elseif (-not $people[$ci].n -and ($ape -or $nom)) {
      $people[$ci].n = (($ape, $nom) | Where-Object { $_ }) -join ' '
    }
    $lic = ([string]$grupo) -replace '(?i)^grupo\s+', ''
    if (-not $people[$ci].x.ContainsKey($fecha)) {
      $people[$ci].x[$fecha] = @{ c = 0; g = $lic; h = ''; v = ''; b = $bloqueExcel }
    }
    $people[$ci].x[$fecha].c += 1
    if ($lic) { $people[$ci].x[$fecha].g = $lic }
    if ($huerto) { $people[$ci].x[$fecha].h = $huerto }
    if ($variedad) { $people[$ci].x[$fecha].v = $variedad }
    if ($bloqueExcel) { $people[$ci].x[$fecha].b = $bloqueExcel }
    $n++
  }
  Write-Host ('  filas utiles=' + $n)
}

$newDias = @($daySet.Keys | Sort-Object)
if (-not $newDias.Count) {
  Write-Host 'No leí fechas en ese Excel. Revisa que tenga CI y fecha.'
  exit 1
}
Write-Host ('Fechas nuevas/chancadas: ' + ($newDias -join ', ') + ' · personas=' + $people.Count)

# Mezcla con el snapshot actual (no borra días viejos)
$merged = @{}
$oldDias = @()
if (Test-Path $jsonPath) {
  $old = Get-Content -Raw -Encoding UTF8 $jsonPath | ConvertFrom-Json
  $oldDias = @($old.dias)
  $props = $old.personas.PSObject.Properties
  foreach ($prop in $props) {
    $dni = $prop.Name
    $src = $prop.Value
    $x = @{}
    foreach ($dp in $src.dias.PSObject.Properties) {
      $day = $dp.Value
      $b = [string]$day.bloque
      if (-not $b) { $b = 'i' }
      $x[$dp.Name] = @{
        c = [int]$day.jarras
        g = [string]$day.lic
        j = [string]$day.jefe
        h = [string]$day.huerto
        v = [string]$day.variedad
        b = $b
      }
    }
    $merged[$dni] = @{ n = [string]$src.nombre; x = $x }
  }
}

foreach ($kv in $people.GetEnumerator()) {
  $dni = $kv.Key
  if (-not $merged.ContainsKey($dni)) {
    $merged[$dni] = @{ n = $kv.Value.n; x = @{} }
  } elseif ($kv.Value.n -and ($merged[$dni].n -match 'S/N|^\(|^\d+$' -or -not $merged[$dni].n)) {
    $merged[$dni].n = $kv.Value.n
  }
  foreach ($dk in $kv.Value.x.Keys) {
    $merged[$dni].x[$dk] = $kv.Value.x[$dk]
  }
}

$dias = @($oldDias + $newDias | Select-Object -Unique | Sort-Object)
$isoWeek = {
  param($iso)
  $d = [DateTime]::ParseExact($iso, 'yyyy-MM-dd', $null)
  $cal = [Globalization.CultureInfo]::InvariantCulture.Calendar
  return $cal.GetWeekOfYear($d, [Globalization.CalendarWeekRule]::FirstFourDayWeek, [DayOfWeek]::Monday)
}
$maxW = 0
foreach ($f in $dias) {
  $w = & $isoWeek $f
  if ($w -gt $maxW) { $maxW = $w }
}

$sb = New-Object System.Text.StringBuilder
[void]$sb.AppendLine('window.QB=window.QB||{};')
[void]$sb.Append('QB.historialData={bloque:"i",semanaActual:' + $maxW + ',dias:')
$diasJson = ($dias | ForEach-Object { '"' + $_ + '"' }) -join ','
[void]$sb.Append('[' + $diasJson + '],p:{')
$firstP = $true
foreach ($kv in $merged.GetEnumerator()) {
  if (-not $firstP) { [void]$sb.Append(',') }
  $firstP = $false
  $nEsc = ($kv.Value.n -replace '\\', '\\' -replace '"', '\"')
  [void]$sb.Append('"' + $kv.Key + '":{n:"' + $nEsc + '",x:{')
  $firstD = $true
  foreach ($dk in ($kv.Value.x.Keys | Sort-Object)) {
    if (-not $firstD) { [void]$sb.Append(',') }
    $firstD = $false
    $rec = $kv.Value.x[$dk]
    $gEsc = ([string]$rec.g -replace '\\', '\\' -replace '"', '\"')
    $jEsc = ([string]$rec.j -replace '\\', '\\' -replace '"', '\"')
    $hEsc = ([string]$rec.h -replace '\\', '\\' -replace '"', '\"')
    $vEsc = ([string]$rec.v -replace '\\', '\\' -replace '"', '\"')
    $bEsc = ([string]$rec.b -replace '\\', '\\' -replace '"', '\"')
    if ($hEsc -or $vEsc -or $bEsc) {
      [void]$sb.Append('"' + $dk + '":[' + $rec.c + ',"' + $gEsc + '","' + $jEsc + '","' + $hEsc + '","' + $vEsc + '","' + $bEsc + '"]')
    } else {
      [void]$sb.Append('"' + $dk + '":[' + $rec.c + ',"' + $gEsc + '"]')
    }
  }
  [void]$sb.Append('}}')
}
[void]$sb.Append('}};')
[IO.File]::WriteAllText($outJs, $sb.ToString(), (New-Object System.Text.UTF8Encoding $false))
Write-Host ('dias totales=' + ($dias -join ', '))
Write-Host ('OK ' + $outJs)

& (Join-Path $PSScriptRoot 'freeze-historial.ps1')

# Sube caché PWA
$cfg = Join-Path $root 'js\config.js'
$html = Join-Path $root 'index.html'
$sw = Join-Path $root 'service-worker.js'
$cfgTxt = [IO.File]::ReadAllText($cfg)
if ($cfgTxt -match "appVersion:\s*'m(\d+)'") {
  $next = 'm' + ([int]$Matches[1] + 1)
  $prev = 'm' + $Matches[1]
  foreach ($f in @($cfg, $html, $sw)) {
    $t = [IO.File]::ReadAllText($f)
    [IO.File]::WriteAllText($f, ($t -replace [regex]::Escape($prev), $next), (New-Object System.Text.UTF8Encoding $false))
  }
  Write-Host ('cache ' + $prev + ' -> ' + $next)
}

Write-Host 'Listo. Recarga la app.'
