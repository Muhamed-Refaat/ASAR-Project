@echo off
setlocal enabledelayedexpansion

:: ============================================================
:: flash_all.bat — Compile and upload ESP32 + Mega firmware
:: Usage: flash_all.bat [MEGA_PORT] [ESP32_PORT]
:: Defaults: MEGA_PORT=COM5   ESP32_PORT=COM6
:: ============================================================

set "MEGA_PORT=%~1"
set "ESP32_PORT=%~2"
if "%MEGA_PORT%"==""  set "MEGA_PORT=COM5"
if "%ESP32_PORT%"=="" set "ESP32_PORT=COM6"

set "MEGA_FQBN=arduino:avr:mega"
set "ESP32_FQBN=esp32:esp32:esp32doit-devkit-v1"
set "BAUD=460800"

:: Resolve workspace root (4 levels up: scripts\ -> autopilot-debug\ -> .gemini\ -> root)
set "SCRIPT_DIR=%~dp0"
pushd "%SCRIPT_DIR%..\..\..\"
set "ROOT=%CD%"
popd

set "ARDUINO_CLI_CMD="

:: 1) Prefer arduino-cli from PATH
where arduino-cli >nul 2>nul
if %errorlevel%==0 (
  set "ARDUINO_CLI_CMD=arduino-cli"
)

:: 2) Fallback to Arduino IDE bundled CLI
if not defined ARDUINO_CLI_CMD (
  set "ARDUINO_CLI_IDE=%LOCALAPPDATA%\Programs\Arduino IDE\resources\app\lib\backend\resources\arduino-cli.exe"
  if exist "!ARDUINO_CLI_IDE!" (
    set "ARDUINO_CLI_CMD=!ARDUINO_CLI_IDE!"
  )
)

set "ESP_SKETCH=%ROOT%\esp"
set "MEGA_SKETCH=%ROOT%\mega"
set "LOG_DIR=%ROOT%\logs"
if not exist "%LOG_DIR%" mkdir "%LOG_DIR%"

set "MEGA_LOG=%LOG_DIR%\flash_mega.log"
set "ESP32_LOG=%LOG_DIR%\flash_esp32.log"

echo.
echo [FLASH] Workspace : %ROOT%
echo [FLASH] Mega  sketch : %MEGA_SKETCH%
echo [FLASH] ESP32 sketch : %ESP_SKETCH%
echo [FLASH] Mega  port   : %MEGA_PORT%
echo [FLASH] ESP32 port   : %ESP32_PORT%
echo.

:: ---- Verify arduino-cli ----
if not defined ARDUINO_CLI_CMD (
  echo [ERROR] arduino-cli not found. Install from https://arduino.github.io/arduino-cli/
  exit /b 1
)

echo [FLASH] arduino-cli : %ARDUINO_CLI_CMD%

if exist "%MEGA_LOG%" (
  del /f /q "%MEGA_LOG%" >nul 2>nul
)

if exist "%ESP32_LOG%" (
  del /f /q "%ESP32_LOG%" >nul 2>nul
)

:: ===========================================================
:: 1. COMPILE MEGA
:: ===========================================================
echo [1/4] Compiling Mega firmware...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; & '%ARDUINO_CLI_CMD%' compile --fqbn '%MEGA_FQBN%' '%MEGA_SKETCH%' 2>&1 | Tee-Object -FilePath '%MEGA_LOG%'; exit $LASTEXITCODE"
if errorlevel 1 (
  echo.
  echo [ERROR] Mega compile failed. See %MEGA_LOG%
  exit /b 1
)
echo [OK] Mega compiled.

:: ===========================================================
:: 2. UPLOAD MEGA
:: ===========================================================
set "MEGA_ATTEMPT=1"
:mega_upload_retry
echo [2/4] Uploading to Mega on %MEGA_PORT%... (attempt !MEGA_ATTEMPT!/2)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; & '%ARDUINO_CLI_CMD%' upload -p '%MEGA_PORT%' --fqbn '%MEGA_FQBN%' '%MEGA_SKETCH%' 2>&1 | Tee-Object -FilePath '%MEGA_LOG%' -Append; exit $LASTEXITCODE"
if errorlevel 1 (
  if !MEGA_ATTEMPT! LSS 2 (
    echo [WARN] Mega upload attempt !MEGA_ATTEMPT! failed. Retrying in 2 seconds...
    set /a MEGA_ATTEMPT+=1
    timeout /t 2 /nobreak >nul
    goto mega_upload_retry
  )
  echo.
  echo [ERROR] Mega upload failed after !MEGA_ATTEMPT! attempts. See %MEGA_LOG%
  exit /b 1
)
echo [OK] Mega uploaded to %MEGA_PORT%.

:: ===========================================================
:: 3. COMPILE ESP32
:: ===========================================================
echo [3/4] Compiling ESP32 firmware...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; & '%ARDUINO_CLI_CMD%' compile --fqbn '%ESP32_FQBN%' '%ESP_SKETCH%' 2>&1 | Tee-Object -FilePath '%ESP32_LOG%'; exit $LASTEXITCODE"
if errorlevel 1 (
  echo.
  echo [ERROR] ESP32 compile failed. See %ESP32_LOG%
  exit /b 1
)
echo [OK] ESP32 compiled.

:: ===========================================================
:: 4. UPLOAD ESP32
:: ===========================================================
set "ESP32_ATTEMPT=1"
:esp32_upload_retry
echo [4/4] Uploading to ESP32 on %ESP32_PORT% at %BAUD%... (attempt !ESP32_ATTEMPT!/2)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ErrorActionPreference='Stop'; & '%ARDUINO_CLI_CMD%' upload -p '%ESP32_PORT%' --fqbn '%ESP32_FQBN%' --upload-property 'upload.speed=%BAUD%' '%ESP_SKETCH%' 2>&1 | Tee-Object -FilePath '%ESP32_LOG%' -Append; exit $LASTEXITCODE"
if errorlevel 1 (
  if !ESP32_ATTEMPT! LSS 2 (
    echo [WARN] ESP32 upload attempt !ESP32_ATTEMPT! failed. Retrying in 2 seconds...
    set /a ESP32_ATTEMPT+=1
    timeout /t 2 /nobreak >nul
    goto esp32_upload_retry
  )
  echo.
  echo [ERROR] ESP32 upload failed after !ESP32_ATTEMPT! attempts. See %ESP32_LOG%
  exit /b 1
)
echo [OK] ESP32 uploaded to %ESP32_PORT%.

echo.
echo [FLASH COMPLETE] Both boards programmed successfully.
exit /b 0
