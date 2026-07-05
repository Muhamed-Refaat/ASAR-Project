const fs = require('fs');
const path = require('path');
const http = require('http');
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const { WebSocketServer } = WebSocket;
const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');

try {
  require('dotenv').config();
} catch (_error) {
  // dotenv is optional.
}

const PORT = Number(process.env.PORT || 3001);
const CONFIG_PATH = path.join(__dirname, 'config.json');

// PUBLIC_URL can be set via env or configured at runtime via POST /api/tunnel
// e.g. "https://abcd1234.ngrok-free.app" — clients use this to reach the relay remotely
let publicUrl = process.env.PUBLIC_URL || null;

const DEFAULT_CONFIG = { esp32_ip: '192.168.1.1' };

const startedAt = Date.now();
const app = express();
const server = http.createServer(app);
const appSocketServer = new WebSocketServer({ server, path: '/ws' });

let config = loadConfig();
let esp32Socket = null;
let esp32Connected = false;
let espReconnectTimer = null;
const appClients = new Set();
let megaPort = null;
let megaParser = null;

function log(message, meta) {
  const stamp = new Date().toISOString();
  if (meta !== undefined) {
    console.log(`[${stamp}] ${message}`, meta);
  } else {
    console.log(`[${stamp}] ${message}`);
  }
}

function loadConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    log('Created default config.json', DEFAULT_CONFIG);
    return { ...DEFAULT_CONFIG };
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    const ip = typeof parsed.esp32_ip === 'string' ? parsed.esp32_ip.trim() : '';
    if (!ip) throw new Error('Missing esp32_ip');
    return { esp32_ip: ip };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('Invalid config.json, resetting to defaults', errorMessage);
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(DEFAULT_CONFIG, null, 2));
    return { ...DEFAULT_CONFIG };
  }
}

function saveConfig(nextConfig) {
  config = { ...nextConfig };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  log('Saved config.json', config);
}

function broadcastToAppClients(message) {
  for (const client of appClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message);
    }
  }
}

function clearReconnectTimer() {
  if (espReconnectTimer) {
    clearTimeout(espReconnectTimer);
    espReconnectTimer = null;
  }
}

function scheduleEspReconnect() {
  clearReconnectTimer();
  espReconnectTimer = setTimeout(() => {
    connectToEsp32();
  }, 5000);
  log('Scheduled ESP32 reconnect in 5 seconds');
}

function setEsp32ConnectionState(nextState) {
  if (esp32Connected === nextState) return;
  esp32Connected = nextState;
  const eventMessage = JSON.stringify({
    type: nextState ? 'esp32_connected' : 'esp32_disconnected',
  });
  broadcastToAppClients(eventMessage);
  log(`Broadcasted ${nextState ? 'esp32_connected' : 'esp32_disconnected'} event`);
}

function closeEspSocket() {
  if (!esp32Socket) return;
  const socketToClose = esp32Socket;
  esp32Socket = null;

  socketToClose.on('error', () => {});
  try {
    if (socketToClose.readyState === WebSocket.CONNECTING) {
      socketToClose.terminate();
    } else if (
      socketToClose.readyState === WebSocket.OPEN ||
      socketToClose.readyState === WebSocket.CLOSING
    ) {
      socketToClose.close();
    }
  } catch (_error) {
    // Ignore close errors.
  }
}

// --- ESP32 Simulation State & Loop ---
let simulationInterval = null;
let simulatedLeftSpd = 0;
let simulatedRightSpd = 0;
let simulatedMaxSpd = 255;
let simulatedDistLeft = 80;
let simulatedDistFront = 120;
let simulatedDistRight = 95;
let simulatedDistRear = 150;
let simulatedRpmLeft = 0;
let simulatedRpmRight = 0;
let simulatedAutoPilot = false;

function stopSimulation() {
  if (simulationInterval) {
    clearInterval(simulationInterval);
    simulationInterval = null;
  }
}

function startSimulation() {
  log('Starting ESP32 Simulation Mode...');
  setEsp32ConnectionState(true);

  simulationInterval = setInterval(() => {
    if (megaPort && megaPort.isOpen) {
      // Direct physical Mega USB is active; mute mock frames to prevent conflict
      return;
    }

    let targetRpmLeft = simulatedLeftSpd * 5.2; 
    let targetRpmRight = simulatedRightSpd * 5.2;
    
    simulatedRpmLeft = simulatedRpmLeft * 0.7 + targetRpmLeft * 0.3 + (Math.random() - 0.5) * 5;
    simulatedRpmRight = simulatedRpmRight * 0.7 + targetRpmRight * 0.3 + (Math.random() - 0.5) * 5;
    if (Math.abs(simulatedRpmLeft) < 2) simulatedRpmLeft = 0;
    if (Math.abs(simulatedRpmRight) < 2) simulatedRpmRight = 0;

    let fwdSpeed = (simulatedLeftSpd + simulatedRightSpd) / 2;
    let turnSpeed = (simulatedLeftSpd - simulatedRightSpd) / 2;

    if (fwdSpeed > 10) {
      simulatedDistFront -= fwdSpeed * 0.05;
      simulatedDistRear += fwdSpeed * 0.03;
    } else if (fwdSpeed < -10) {
      simulatedDistFront += Math.abs(fwdSpeed) * 0.03;
      simulatedDistRear -= Math.abs(fwdSpeed) * 0.05;
    }

    if (turnSpeed > 10) {
      simulatedDistLeft += turnSpeed * 0.04;
      simulatedDistRight -= turnSpeed * 0.04;
    } else if (turnSpeed < -10) {
      simulatedDistLeft -= Math.abs(turnSpeed) * 0.04;
      simulatedDistRight += Math.abs(turnSpeed) * 0.04;
    }

    if (simulatedDistFront < 10) simulatedDistFront = 180 + Math.random() * 20;
    if (simulatedDistRear < 10) simulatedDistRear = 180 + Math.random() * 20;
    if (simulatedDistLeft < 10) simulatedDistLeft = 150 + Math.random() * 15;
    if (simulatedDistRight < 10) simulatedDistRight = 150 + Math.random() * 15;

    if (simulatedDistFront > 250) simulatedDistFront = 80 + Math.random() * 30;
    if (simulatedDistRear > 250) simulatedDistRear = 80 + Math.random() * 30;
    if (simulatedDistLeft > 250) simulatedDistLeft = 70 + Math.random() * 20;
    if (simulatedDistRight > 250) simulatedDistRight = 70 + Math.random() * 20;

    broadcastToAppClients(`RPM:${simulatedRpmLeft.toFixed(1)}:${simulatedRpmRight.toFixed(1)}\n`);
    broadcastToAppClients(`DIST:${simulatedDistLeft.toFixed(0)}:${simulatedDistFront.toFixed(0)}:${simulatedDistRight.toFixed(0)}:${simulatedDistRear.toFixed(0)}\n`);

    if (simulatedAutoPilot) {
      broadcastToAppClients(`AUTO_STAT:1:1:${simulatedLeftSpd.toFixed(0)}:${simulatedRightSpd.toFixed(0)}:0:0:0:0.2\n`);
    }
  }, 250);
}

function connectToEsp32() {
  clearReconnectTimer();
  closeEspSocket();
  stopSimulation();

  const ipLower = String(config.esp32_ip).toLowerCase().trim();
  if (ipLower === 'simulate' || ipLower === 'mock' || ipLower === 'localhost' || ipLower === '127.0.0.1') {
    startSimulation();
    return;
  }

  const esp32Url = `ws://${config.esp32_ip}:81`;
  log(`Connecting to ESP32 at ${esp32Url}`);

  esp32Socket = new WebSocket(esp32Url);

  esp32Socket.on('open', () => {
    setEsp32ConnectionState(true);
    log(`ESP32 connected at ${esp32Url}`);
  });

  esp32Socket.on('message', (data) => {
    const message = data.toString();
    log(`ESP32 -> APP: ${message.trim()}`);
    broadcastToAppClients(message);
  });

  esp32Socket.on('close', () => {
    log('ESP32 socket closed');
    setEsp32ConnectionState(false);
    esp32Socket = null;
    scheduleEspReconnect();
  });

  esp32Socket.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('ESP32 socket error', errorMessage);
  });
}

function connectToMegaSerial() {
  log('Attempting to connect to Arduino Mega on COM11...');
  try {
    megaPort = new SerialPort({
      path: 'COM11',
      baudRate: 115200,
      autoOpen: false
    });

    megaPort.open((err) => {
      if (err) {
        log(`Failed to open Mega serial port COM11: ${err.message}`);
        setTimeout(connectToMegaSerial, 5000);
        return;
      }

      log('Successfully connected directly to Arduino Mega on COM11 via USB!');
      setTimeout(() => {
        sendToMegaSerial('START');
      }, 1500);
    });

    megaParser = megaPort.pipe(new ReadlineParser({ delimiter: '\r\n' }));

    megaParser.on('data', (data) => {
      const line = data.toString().trim();
      if (line.includes('DIST:')) {
        const idx = line.indexOf('DIST:');
        const frame = line.substring(idx).trim();
        broadcastToAppClients(frame + '\n');
      } else if (line.includes('RPM:')) {
        const idx = line.indexOf('RPM:');
        const frame = line.substring(idx).trim();
        broadcastToAppClients(frame + '\n');
      } else if (line.includes('ACK:')) {
        const idx = line.indexOf('ACK:');
        const frame = line.substring(idx).trim();
        broadcastToAppClients(frame + '\n');
      } else if (line.includes('[MEGA][MPU] READY')) {
        broadcastToAppClients('RDY\n');
      }
    });

    megaPort.on('close', () => {
      log('Mega serial port closed');
      megaPort = null;
      megaParser = null;
      setTimeout(connectToMegaSerial, 5000);
    });

    megaPort.on('error', (err) => {
      log(`Mega serial port error: ${err.message}`);
    });

  } catch (err) {
    log(`Serial initialization crash: ${err.message}`);
    setTimeout(connectToMegaSerial, 5000);
  }
}

function sendToMegaSerial(cmd) {
  if (megaPort && megaPort.isOpen) {
    megaPort.write(cmd + '\n', (err) => {
      if (err) log(`Error writing to Mega Serial: ${err.message}`);
    });
  }
}

// Leader/observer tracking
let leaderSocket = null;

function getRole(socket) {
  return socket === leaderSocket ? 'leader' : 'observer';
}

function promoteNextObserver() {
  for (const client of appClients) {
    if (client !== leaderSocket && client.readyState === WebSocket.OPEN) {
      leaderSocket = client;
      safeClientSend(client, JSON.stringify({ type: 'role', role: 'leader' }));
      log('Promoted observer to leader');
      return;
    }
  }
  leaderSocket = null;
  log('No observers to promote — no leader');
}

function safeClientSend(socket, message) {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(message);
  }
}

app.use(cors());
app.use(express.json());

// ─── REST API ────────────────────────────────────────────────────────────────

app.get('/api/status', (_req, res) => {
  res.json({
    esp32_ip: config.esp32_ip,
    esp32_connected: esp32Connected,
    app_clients_count: appClients.size,
    leader_present: leaderSocket !== null,
    uptime_ms: Date.now() - startedAt,
    public_url: publicUrl,
    relay_ws_local: `ws://localhost:${PORT}/ws`,
    relay_ws_public: publicUrl ? `${publicUrl.replace(/^http/, 'ws')}/ws` : null,
  });
});

app.get('/api/config', (_req, res) => {
  res.json(config);
});

app.post('/api/config', (req, res) => {
  const nextIp = typeof req.body?.esp32_ip === 'string' ? req.body.esp32_ip.trim() : '';
  if (!nextIp) {
    return res.status(400).json({ error: 'esp32_ip is required' });
  }
  saveConfig({ esp32_ip: nextIp });
  connectToEsp32();
  return res.json({ esp32_ip: config.esp32_ip });
});

// GET  /api/tunnel          – returns current public URL info
// POST /api/tunnel          – sets public URL (body: { "public_url": "https://..." })
//
// Usage with ngrok:
//   1. Run: ngrok http 3001
//   2. Copy the https URL (e.g. https://abcd1234.ngrok-free.app)
//   3. POST to /api/tunnel or set PUBLIC_URL env var before starting
//   4. App clients connect via: wss://abcd1234.ngrok-free.app/ws
app.get('/api/tunnel', (_req, res) => {
  res.json({
    public_url: publicUrl,
    ws_url: publicUrl ? `${publicUrl.replace(/^http/, 'ws')}/ws` : null,
  });
});

app.post('/api/tunnel', (req, res) => {
  const url = typeof req.body?.public_url === 'string' ? req.body.public_url.trim() : '';
  if (!url) {
    publicUrl = null;
    log('Public tunnel URL cleared');
    return res.json({ public_url: null, ws_url: null });
  }
  publicUrl = url.replace(/\/$/, ''); // strip trailing slash
  log(`Public tunnel URL set to: ${publicUrl}`);
  return res.json({
    public_url: publicUrl,
    ws_url: `${publicUrl.replace(/^http/, 'ws')}/ws`,
  });
});

// ─── WebSocket Server ─────────────────────────────────────────────────────────

appSocketServer.on('connection', (socket, req) => {
  appClients.add(socket);

  const isFirstClient = leaderSocket === null;
  if (isFirstClient) {
    leaderSocket = socket;
  }
  const role = getRole(socket);
  log(`App WS client connected as ${role} (${appClients.size} total) from ${req.socket.remoteAddress}`);

  socket.send(JSON.stringify({ type: esp32Connected ? 'esp32_connected' : 'esp32_disconnected' }));
  socket.send(JSON.stringify({ type: 'role', role }));

  socket.on('message', (data) => {
    const message = data.toString();

    if (message.trimStart().startsWith('{')) {
      let obj;
      try {
        obj = JSON.parse(message);
      } catch {
        // Not valid JSON — fall through to command routing.
      }

      if (obj && obj.type === 'claim_leader') {
        if (socket !== leaderSocket) {
          const prev = leaderSocket;
          leaderSocket = socket;
          safeClientSend(socket, JSON.stringify({ type: 'role', role: 'leader' }));
          if (prev) {
            safeClientSend(prev, JSON.stringify({ type: 'role', role: 'observer' }));
          }
          log(`Leadership claimed by new client (${appClients.size} total)`);
        } else {
          safeClientSend(socket, JSON.stringify({ type: 'role', role: 'leader' }));
        }
        return;
      }
    }

    if (socket !== leaderSocket) {
      log(`OBSERVER blocked: ${message.trim()}`);
      socket.send(JSON.stringify({ type: 'not_leader' }));
      return;
    }

    log(`LEADER -> ESP32: ${message.trim()}`);
    // Directly transmit control messages to the physical Arduino Mega over USB if connected!
    if (megaPort && megaPort.isOpen) {
      sendToMegaSerial(message.trim());
    }

    const ipLower = String(config.esp32_ip).toLowerCase().trim();
    if (ipLower === 'simulate' || ipLower === 'mock' || ipLower === 'localhost' || ipLower === '127.0.0.1') {
      const line = message.trim();
      if (line === 'START') {
        broadcastToAppClients('RDY\n');
      } else if (line === 'STOP') {
        simulatedLeftSpd = 0;
        simulatedRightSpd = 0;
        broadcastToAppClients('ACK:STOP\n');
      } else if (line === 'HORN') {
        broadcastToAppClients('ACK:HORN\n');
      } else if (line.startsWith('SPD:')) {
        const parts = line.split(':');
        const left = parseInt(parts[1]) || 0;
        const right = parseInt(parts[2]) || 0;
        simulatedLeftSpd = left;
        simulatedRightSpd = right;
        broadcastToAppClients(`ACK:SPD:${left}:${right}\n`);
      } else if (line.startsWith('MAX_SPD:')) {
        const val = parseInt(line.split(':')[1]) || 255;
        simulatedMaxSpd = val;
        broadcastToAppClients(`ACK:MAX_SPD:${val}\n`);
      } else if (line === 'AUTO_ON') {
        simulatedAutoPilot = true;
        broadcastToAppClients('ACK:AUTO_ON\n');
      } else if (line === 'AUTO_OFF') {
        simulatedAutoPilot = false;
        broadcastToAppClients('ACK:AUTO_OFF\n');
      }
    } else if (esp32Socket && esp32Socket.readyState === WebSocket.OPEN) {
      esp32Socket.send(message);
    } else {
      // If we don't have a physical Mega connection and no active ESP32 socket
      if (!megaPort || !megaPort.isOpen) {
        socket.send(JSON.stringify({ type: 'esp32_disconnected' }));
      }
    }
  });

  socket.on('close', () => {
    const wasLeader = socket === leaderSocket;
    appClients.delete(socket);
    if (wasLeader) {
      leaderSocket = null;
      log(`Leader disconnected (${appClients.size} remaining) — promoting next observer`);
      promoteNextObserver();
    } else {
      log(`Observer disconnected (${appClients.size} remaining)`);
    }
  });

  socket.on('error', (error) => {
    const errorMessage = error instanceof Error ? error.message : String(error);
    log('App WS client error', errorMessage);
  });
});

// ─── Startup ──────────────────────────────────────────────────────────────────

server.listen(PORT, () => {
  log(`=== ASAR Robot Relay Backend ===`);
  log(`Local relay WS  : ws://localhost:${PORT}/ws`);
  if (publicUrl) {
    log(`Public relay WS : ${publicUrl.replace(/^http/, 'ws')}/ws`);
  } else {
    log(`Public URL      : not set — run 'ngrok http ${PORT}', then POST { public_url: "https://..." } to /api/tunnel`);
  }
  log(`ESP32 target    : ws://${config.esp32_ip}:81`);
  log(`================================`);
  connectToEsp32();
  connectToMegaSerial();
});

process.on('SIGINT', () => {
  log('Received SIGINT, shutting down');
  clearReconnectTimer();
  closeEspSocket();
  stopSimulation();
  if (megaPort && megaPort.isOpen) {
    megaPort.close();
  }

  for (const socket of appClients) {
    socket.close();
  }

  server.close(() => {
    process.exit(0);
  });
});
