---
name: autopilot-debug
description: "Autopilot debug loop for the ESP32+Mega 4WD robot with the custom MobileAPP stack. Use when: flashing firmware to both boards from CMD, capturing dual serial monitor output to log files, looping until expected serial output is seen, and injecting WebSocket commands (direct or relay) via browser DevTools. Triggers: 'debug robot', 'flash and test', 'serial loop', 'autopilot debug', 'mobile app inject', 'ws inject'."
argument-hint: "[expected output pattern e.g. 'RDY,DIST:,RPM:'] [ESP32 port e.g. COM6] [Mega port e.g. COM5]"
---

# Autopilot Debug — ESP32 + Mega Robot

## What This Skill Does

Automates the full debug loop:
1. **Compile + upload** both sketches (Mega and ESP32) from the command line
2. **Capture serial output** from both USB COM ports simultaneously into timestamped log files
3. **Loop** until all expected output patterns appear in the combined log
4. **Inject MobileAPP-compatible WebSocket commands** via browser DevTools console to trigger robot behaviours without touching the phone UI
5. **Report** pass/fail and log file paths

---

## When to Use

- Debugging a firmware change and need to verify the expected serial handshake or telemetry
- Reflashing both boards and watching for `RDY`, `RPM:`, `DIST:` in one command
- Testing MobileAPP command flow (direct `ws://ESP32_IP:81` or relay `ws://localhost:3001/ws`) without UI interaction
- Validating `START`/`RDY` handshake loop or motor commands

---

## Prerequisites

- `arduino-cli` installed and in PATH (`arduino-cli version` should work)
- Board packages installed:
  ```
  arduino-cli core install arduino:avr
  arduino-cli core install esp32:esp32
  ```
- Python + pyserial installed (for serial capture fallback):
  ```
  pip install pyserial
  ```
- Both boards connected via USB; Serial Monitor closed in Arduino IDE / any other terminal

---

## Step-by-Step Procedure

### Step 1 — Identify COM Ports

In PowerShell or CMD:
```powershell
# List connected serial devices
Get-PnpDevice -Class Ports | Where-Object Status -eq 'OK' | Select-Object FriendlyName
```
Or in Device Manager → Ports (COM & LPT).

Defaults used by this skill:
- **ESP32** → `COM6` (erase flash helper already configured for this)
- **Mega 2560** → `COM5` (adjust if different)

---

### Step 2 — (Optional) Erase ESP32 Flash

Only needed when changing partition layout or after a flash corruption:
```bat
erase_flash_com6.bat COM6
```

---

### Step 3 — Flash Both Boards

Run the compile + upload script:
```bat
gemini\skills\autopilot-debug\scripts\flash_all.bat COM5 COM6
```
Arguments: `[MEGA_PORT] [ESP32_PORT]`

Build and upload logs land in `logs\flash_mega.log` and `logs\flash_esp32.log`.

> See [flash_all.bat](./scripts/flash_all.bat)

---

### Step 4 — Start Dual Serial Capture + Debug Loop

Run from a **PowerShell** terminal (not CMD — uses PS jobs):
```powershell
.\gemini\skills\autopilot-debug\scripts\serial_monitor.ps1 `
    -Esp32Port COM6 `
    -MegaPort COM5 `
    -ExpectedPatterns @("RDY","DIST:","RPM:") `
    -MaxIterations 40 `
    -IterationSec 3
```

**Parameters:**

| Parameter | Default | Meaning |
|-----------|---------|---------|
| `-Esp32Port` | `COM6` | ESP32 USB serial port |
| `-MegaPort` | `COM5` | Mega USB serial port |
| `-Baud` | `115200` | Baud rate for both boards |
| `-ExpectedPatterns` | `@("RDY")` | All strings that must appear in logs |
| `-MaxIterations` | `60` | Max poll cycles before giving up |
| `-IterationSec` | `3` | Seconds between polls |
| `-LogDir` | `.\logs` | Where to write log files |

The script exits `[PASS]` when every pattern from `-ExpectedPatterns` is found.

> See [serial_monitor.ps1](./scripts/serial_monitor.ps1)

---

### Step 5 — Inject MobileAPP Commands via Browser DevTools
Open any page in Chrome/Edge, then press **F12** → **Console** tab.

For **direct mode** (app talks to ESP32 directly):
```js
const ws = new WebSocket('ws://192.168.1.100:81');
ws.onmessage = (e) => console.log('[RX]', e.data);
ws.onopen = () => {
  ws.send('START\n');
  ws.send('SPD:180:180\n');
  setTimeout(() => ws.send('STOP\n'), 1500);
};
```

For **relay mode** (mobile backend running on localhost):
```js
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onmessage = (e) => console.log('[RX]', e.data);
ws.onopen = () => {
  ws.send('START\n');
  ws.send('HORN\n');
};
```

See [mobileapp-websocket-devtools.md](./references/mobileapp-websocket-devtools.md) for MobileAPP WebSocket command snippets and troubleshooting.

---

### Step 6 — Full Autopilot Loop (Combined)

This is the end-to-end sequence the agent runs when given a desired output:

```
1. flash_all.bat             → compile + upload both boards
2. serial_monitor.ps1        → start dual capture + loop
     if patterns not found after N iterations:
  → inject a WS command sequence (`START`, `SPD`, `STOP`, `HORN`)
       → wait IterationSec, re-check logs
3. Report PASS/FAIL + log locations
```

When the agent is driving this loop, it will:
- Ask you once for COM ports and desired output patterns if not supplied
- Run Steps 2–5 autonomously
- Show you the last 6 lines of live serial output every cycle
- Stop as soon as all patterns match

---

## Common Expected Pattern Sets

| Scenario | `-ExpectedPatterns` |
|----------|---------------------|
| Startup only | `@("RDY")` |
| Full handshake | `@("RDY","RUNNING")` |
| Telemetry live | `@("RDY","DIST:","RPM:")` |
| Error-free run | `@("RDY","DIST:")` — then manually check no `ERR:` lines |
| MobileAPP reconnect re-handshake | `@("START","RDY")` |

---

## Known Integration Notes (MobileAPP)

### Note 1 — Duplicate START is expected
If app/relay reconnects, client code may send `START` again. Mega should re-acknowledge while running without resetting drive state.

### Note 2 — Telemetry source of truth
Only ESP32 should publish telemetry to app clients; app must treat `RPM:` and `DIST:` frames as authoritative and ignore stale local values.

### Note 3 — Expected command set
Validated command path for this skill: `START`, `STOP`, `HORN`, and `SPD:left:right`.

### Note 4 — Relay leadership guard
When using relay mode, only the leader client is allowed to send drive commands. Observer commands should be blocked by backend and visible in backend logs.

```
logs/
  flash_mega.log          arduino-cli compile+upload output for Mega
  flash_esp32.log         arduino-cli compile+upload output for ESP32
  esp32_YYYYMMDD_HHmmss.log   ESP32 serial output (timestamped per run)
  mega_YYYYMMDD_HHmmss.log    Mega serial output (timestamped per run)
  combined_YYYYMMDD_HHmmss.log  merged output used for pattern matching
```

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `arduino-cli: not found` | Install from https://arduino.github.io/arduino-cli/ and add to PATH |
| `board not found` | Run `arduino-cli core install esp32:esp32` and `arduino-cli core install arduino:avr` |
| Upload fails — port busy | Close Arduino IDE Serial Monitor and any other serial terminal |
| Serial job captures nothing | Confirm board reset after upload; some boards need the port re-opened |
| WebSocket cannot connect | Verify ESP32 IP and that port `81` is reachable from the client network |
| Relay mode stuck disconnected | Start `MobileAPP/backend` server and confirm `/api/status` reports `esp32_connected=true` |
| Patterns never matched | Check baud rates and that ESP32 WiFi credentials are set in `esp/esp.ino` |
