# serial_monitor.ps1 — Dual serial capture + debug loop
param(
    [string]   $Esp32Port        = "COM6",
    [string]   $MegaPort         = "COM5",
    [int]      $Baud             = 115200,
    [string[]] $ExpectedPatterns = @("RDY"),
    [int]      $MaxIterations    = 60,
    [int]      $IterationSec     = 3,
    [string]   $LogDir           = $null
)

# ---- Resolve paths ----
$ScriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$WorkspaceRoot = (Resolve-Path (Join-Path $ScriptDir "..\..\..\")).Path
if (-not $LogDir) { $LogDir = Join-Path $WorkspaceRoot "logs" }
if (-not (Test-Path $LogDir)) { New-Item -ItemType Directory -Path $LogDir | Out-Null }

$Timestamp   = (Get-Date -Format "yyyyMMdd_HHmmss")
$Esp32Log    = Join-Path $LogDir "esp32_$Timestamp.log"
$MegaLog     = Join-Path $LogDir "mega_$Timestamp.log"
$CombinedLog = Join-Path $LogDir "combined_$Timestamp.log"

Write-Host ""
Write-Host "[MONITOR] ESP32 port : $Esp32Port  ->  $Esp32Log"
Write-Host "[MONITOR] Mega  port : $MegaPort  ->  $MegaLog"
Write-Host "[MONITOR] Expected   : $($ExpectedPatterns -join ', ')"
Write-Host ""

# ---- Helper: open a serial port reader job ----
function Start-SerialJob {
    param([string]$Port, [int]$BaudRate, [string]$OutFile)
    $job = Start-Job -ScriptBlock {
        param($p, $b, $f)
        try {
            $serial = New-Object System.IO.Ports.SerialPort $p, $b, 'None', 8, 'One'
            $serial.ReadTimeout = 500
            $serial.Open()
            $writer = [System.IO.StreamWriter]::new($f, $true)
            while ($true) {
                try {
                    $line = $serial.ReadLine()
                    $entry = "$(Get-Date -Format 'HH:mm:ss.fff') [$p] $line"
                    $writer.WriteLine($entry)
                    $writer.Flush()
                } catch [System.TimeoutException] {
                    # no data yet
                } catch {
                    break
                }
            }
            $writer.Close()
            $serial.Close()
        } catch {
            "$(Get-Date -Format 'HH:mm:ss') [ERROR] $($_.Exception.Message)" |
                Out-File -FilePath $f -Append
        }
    } -ArgumentList $Port, $BaudRate, $OutFile
    return $job
}

# ---- Start capture jobs ----
Write-Host "[START] Opening serial ports..."
$jobEsp  = Start-SerialJob -Port $Esp32Port -BaudRate $Baud -OutFile $Esp32Log
$jobMega = Start-SerialJob -Port $MegaPort  -BaudRate $Baud -OutFile $MegaLog
Start-Sleep -Seconds 1

# ---- Debug loop ----
$iteration   = 0
$allFound    = $false
$foundStatus = @{}
if ($ExpectedPatterns.Count -eq 1 -and $ExpectedPatterns[0] -match ',') {
    $ExpectedPatterns = $ExpectedPatterns[0] -split ','
}
foreach ($pat in $ExpectedPatterns) { $foundStatus[$pat] = $false }

while ($iteration -lt $MaxIterations -and -not $allFound) {
    $iteration++
    Start-Sleep -Seconds $IterationSec

    $espLines  = if (Test-Path $Esp32Log) { @(Get-Content $Esp32Log) } else { @() }
    $megaLines = if (Test-Path $MegaLog)  { @(Get-Content $MegaLog)  } else { @() }
    [string[]]$allLines = $espLines + $megaLines
    $allLines | Set-Content $CombinedLog

    $recent = $allLines | Select-Object -Last 6
    foreach ($line in $recent) { Write-Host "  $line" }

    foreach ($pat in $ExpectedPatterns) {
        if (-not $foundStatus[$pat]) {
            foreach ($ln in $allLines) {
                if (($ln -replace '\r','') -match $pat) { 
                    $foundStatus[$pat] = $true
                    Write-Host "[MATCH] Pattern found: '$pat'"
                    break 
                }
            }
        }
    }

    $pendingCount = ($foundStatus.Values | Where-Object { $_ -eq $false }).Count
    Write-Host "[LOOP $iteration/$MaxIterations] $(60 - $pendingCount)/$($ExpectedPatterns.Count) patterns matched"
    $allFound = ($pendingCount -eq 0)
}

# ---- Stop jobs ----
Write-Host "[STOP] Stopping serial capture..."
Stop-Job  $jobEsp  -ErrorAction SilentlyContinue
Stop-Job  $jobMega -ErrorAction SilentlyContinue

if ($allFound) {
    Write-Host "[PASS] All patterns found." -ForegroundColor Green
    exit 0
} else {
    Write-Host "[FAIL] Loop ended." -ForegroundColor Red
    exit 1
}
