---
name: autopilot-control
description: "Inject MobileAPP-compatible WebSocket commands to trigger robot behaviours. Triggers: 'inject commands', 'control robot', 'send spd', 'horn robot'."
---

# Autopilot Control — Command Injection

## Overview
Allows controlling the robot without using the MobileAPP UI by injecting WebSocket commands directly.

## Usage
Use the Chrome DevTools console to connect and send commands:

### Direct Mode (to ESP32)
```js
const ws = new WebSocket('ws://192.168.1.100:81');
ws.onopen = () => ws.send('START\nHORN\nSPD:180:180\n');
```

### Relay Mode (via Backend)
```js
const ws = new WebSocket('ws://localhost:3001/ws');
ws.onopen = () => {
  ws.send(JSON.stringify({ type: 'claim_leader' }));
  ws.send('START\nSPD:150:-150\n');
};
```

## Available Commands
- `START`, `STOP`, `HORN`
- `SPD:left:right` (e.g., `SPD:200:200`)
- `MAX_SPD:val` (e.g., `MAX_SPD:255`)
