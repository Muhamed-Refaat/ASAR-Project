# MobileAPP WebSocket DevTools Guide

## Connection Endpoints

| Endpoint | Purpose |
|-------|-------|
| `ws://<esp32_ip>:81` | Direct app-to-ESP32 control channel |
| `ws://localhost:3001/ws` | Relay backend app socket (for leadership + fanout) |
| `http://localhost:3001/api/status` | Relay status endpoint |
| `http://localhost:3001/api/dummy/ultrasonic` | Temporary dummy ultrasonic API |

---

## Step-by-Step: Open Console and Inject

1. Open any browser tab (or the local MobileAPP page) in Chrome or Edge.
2. Press **F12** (or Ctrl+Shift+I) -> go to the **Console** tab.
3. Paste one of the snippets below and press Enter.
4. Use the helper methods to send commands and inspect telemetry frames.

> WebSocket connections do not require CORS handling like HTTP `fetch`, but network reachability must be valid.

---

## Quick Reference - Direct ESP32 WebSocket

```js
const ws = new WebSocket('ws://192.168.1.100:81');
ws.onopen = () => console.log('open');
ws.onmessage = (e) => console.log('[RX]', e.data);

const send = (line) => ws.send(line.endsWith('\n') ? line : line + '\n');

// Handshake + motion
send('START');
send('SPD:160:160');
setTimeout(() => send('STOP'), 1200);

// Horn
send('HORN');
```

---

## Relay Mode Snippet

```js
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onopen = () => {
  ws.send('START\n');
  ws.send('SPD:180:-180\n');
  setTimeout(() => ws.send('STOP\n'), 800);
};
ws.onmessage = (e) => console.log('[RELAY RX]', e.data);

// Take control in relay mode if this client is observer.
ws.send(JSON.stringify({ type: 'claim_leader' }));
```

---

## Command Set

| Direction | Frame |
|---|---|
| App -> ESP32 | `START`, `STOP`, `HORN`, `FWD:s`, `BCK:s`, `LEFT:s`, `RIGHT:s`, `SPD:l:r` |
| ESP32 -> App | `RDY`, `RPM:l:r`, `DIST:L:F:R:B`, `ERR:code`, `ACK:MAX_SPD:val` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| WS closes immediately | Verify ESP32 and client are on the same network and port `81` is reachable |
| Relay returns `not_leader` | Send `{ "type": "claim_leader" }` before motion commands |
| Telemetry reads `0` or empty | ESP32 not connected to WiFi, or Mega not sending RPM/DIST |
| `ERR:NOT_READY` spam | Send `START` first and wait for `RDY` before drive commands |
