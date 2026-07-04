---
name: autopilot-flash
description: "Compile and upload firmware to both ESP32 and Mega 2560. Triggers: 'flash robot', 'upload firmware', 'flash all'."
---

# Autopilot Flash — Firmware Deployment

## Overview
Automates the compilation and flashing of both boards.

## Usage
Run the flash script from the command line:

```powershell
.github\GeminiSkills\autopilot-debug\scripts\flash_all.bat COM5 COM6
```

## Troubleshooting
- Ensure all serial monitors are closed.
- Check COM port assignments in Device Manager.
- Verify `arduino-cli` is in PATH.
