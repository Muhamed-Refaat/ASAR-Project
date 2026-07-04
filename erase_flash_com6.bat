@echo off
setlocal

set "PORT=%~1"
if "%PORT%"=="" set "PORT=COM6"
set "CHIP=esp32"
set "BAUD=460800"

echo [ESP32] Erasing flash on %PORT%...

where esptool >nul 2>nul
if %errorlevel%==0 (
  esptool --chip %CHIP% --port %PORT% --baud %BAUD% erase-flash
) else (
  python -m esptool --chip %CHIP% --port %PORT% --baud %BAUD% erase-flash
)

if errorlevel 1 (
  echo.
  echo [ERROR] Flash erase failed.
  echo - Check USB cable and board power.
  echo - Confirm port is %PORT%.
  echo - Close Serial Monitor / any app using %PORT% ^(Arduino IDE, VS Code serial tools, terminal loggers^).
  echo - Install esptool: pip install esptool
  exit /b 1
)

echo.
echo [OK] Flash erase completed on %PORT%.
exit /b 0
