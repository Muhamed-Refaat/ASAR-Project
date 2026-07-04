---
name: autopilot-validate
description: "Automated end-to-end validation for the ESP32+Mega Robot platform. Triggers: 'validate robot', 'system check', 'telemetry test', 'full validation loop'."
---

# Autopilot Validate — Full System Verification

## Overview

This skill automates the validation loop:
1. **Flash Firmware**: Compiles and uploads to both Mega and ESP32.
2. **Start Backend**: Launches the relay server (if needed).
3. **Start Frontend**: Launches the MobileAPP in the browser.
4. **Monitor Hardware**: Captures serial output to verify `DIST:` and `RPM:` frames.
5. **Verify UI**: Uses Chrome DevTools to confirm telemetry is rendered correctly.

---

## Step 1 — Flash and Initial Check

Run the combined flash and monitor script to ensure hardware is reporting telemetry:

```powershell
# Flash both boards
gemini\skills\autopilot-debug\scripts\flash_all.bat COM5 COM6

# Start monitoring for telemetry patterns
.\gemini\skills\autopilot-debug\scripts\serial_monitor.ps1 `
    -Esp32Port COM6 `
    -MegaPort COM5 `
    -ExpectedPatterns @("RDY","DIST:","RPM:") `
    -MaxIterations 20 `
    -IterationSec 3
```

---

## Step 2 — Launch App Stack

In separate terminals:

```powershell
# Terminal 1: Backend
cd MobileAPP/backend
npm install
npm run dev

# Terminal 2: Frontend
cd MobileAPP
npm install
npm run dev
```

Open `http://localhost:3000` in Chrome.

---

## Step 3 — Automated UI Verification

Press **F12** and paste this into the **Console** to verify the UI reflects hardware state:

```js
(async () => {
  console.log('[VALIDATE] Starting UI sync check...');
  
  // 1. Check connection
  const statusText = document.getElementById('status-text')?.innerText;
  console.log('[VALIDATE] Current Status:', statusText);
  if (!statusText.includes('System Ready')) {
    console.warn('[WARN] System not ready. Ensure START handshake completed.');
  }

  // 2. Verify Distance Awareness
  const distFront = document.getElementById('dist-front')?.innerText;
  const distLeft = document.getElementById('dist-left')?.innerText;
  const distRight = document.getElementById('dist-right')?.innerText;
  const distRear = document.getElementById('dist-rear')?.innerText;

  console.log('[VALIDATE] Front:', distFront);
  console.log('[VALIDATE] Left:', distLeft);
  console.log('[VALIDATE] Right:', distRight);
  console.log('[VALIDATE] Rear:', distRear);

  if ([distFront, distLeft, distRight, distRear].every(d => d === '---')) {
    console.error('[FAIL] All distances are empty (---). Check sensor wiring or DIST: frames.');
  } else {
    console.log('[PASS] Telemetry data detected in UI.');
  }

  // 3. Test Horn (Functional validation)
  console.log('[VALIDATE] Triggering Horn...');
  document.getElementById('horn-btn')?.click();
})();
```

---

## Step 4 — Expected Behavior Checklist

| Component | Expected Behavior |
|-----------|-------------------|
| **Master Status** | Should show "SYSTEM READY" in green. |
| **Distance Awareness** | Numbers should update in `cm` (e.g., `24cm`) or `m` (e.g., `1.25m`). |
| **RPM Balance** | Should show values when motors are moving. |
| **Serial Logs** | `logs/combined_*.log` should contain regular `DIST:L:F:R:B` frames. |

---

## Troubleshooting Loop

If validation fails:
1. **Check Serial**: If `serial_monitor` doesn't see `DIST:`, the Mega code or hardware is failing.
2. **Check WebSocket**: Inspect DevTools Network tab for `ws://` traffic.
3. **Check Logic**: Ensure `useRobotConnection.ts` is parsing frames correctly.
4. **Fix and Repeat**: Apply fix, run Step 1 again.
