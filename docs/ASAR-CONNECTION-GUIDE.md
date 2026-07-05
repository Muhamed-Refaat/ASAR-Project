# ASAR 4WD Robot — Step-by-Step Connection Guide

This guide describes how to configure, establish, and troubleshoot communication links between the **MobileAPP Client** and the **ASAR 4WD Robotic Platform** under various network conditions.

---

## Communication Architecture Overview

The ASAR system supports two connection modes to handle local and remote scenarios:

```
Direct Mode (Same Network):
+----------------------+                     +---------------------+
|  Mobile Client (App)  | <--- WebSocket ---> |    Onboard ESP32    |
| (ws://<esp32_ip>:81) |      (Port 81)      | (UART Gateway/WiFi) |
+----------------------+                     +---------------------+

Relay Mode (Same or Different Networks):
+----------------------+                     +----------------------+                     +---------------------+
|  Mobile Client (App)  | <--- WebSocket ---> | Local/Remote Relay   | <--- WebSocket ---> |    Onboard ESP32    |
| (ws://<relay_ip>/ws) |     (Port 3001)     | Server (Node.js/ws)  |      (Port 81)      | (UART Gateway/WiFi) |
+----------------------+                     +----------------------+                     +---------------------+
```

---

## SITUATION 1: Mobile App and Robot on the SAME Wi-Fi Network

When your computer/phone and the robot share the same Wi-Fi subnet (e.g., connected to your local home router), you can connect via **Direct Mode** or **Relay Mode**.

### Option A: Direct Mode (Direct Client-to-Robot Link)
*Best for: Minimum latency, standalone testing without running a backend server.*

#### Step 1: Align Subnets (One-time Setup)
The ESP32 uses a static IP of `192.168.1.100`. Your computer must be on the `192.168.1.x` subnet.
1. Determine your computer's IP address (e.g., run `ipconfig` on Windows).
2. If your computer is on a different subnet (like `192.168.100.x`):
   * Log into your Wi-Fi router's admin gateway (usually `http://192.168.100.1` or `http://192.168.1.1`).
   * Navigate to **LAN Setup** and change the router's IP to **`192.168.1.1`**. This shifts your network to the `192.168.1.x` subnet.
   * Alternatively, modify `esp/esp.ino` to use DHCP or configure it to use your current subnet (e.g., `192.168.100.100`) and flash it.

#### Step 2: Open the Mobile App
1. Open your web browser and navigate to the frontend:
   `http://localhost:3000` (or `http://<your-machine-ip>:3000` if loading on a physical phone).

#### Step 3: Enter Connection Settings
1. Navigate to the **Config** tab (bottom right of the navigation bar).
2. In the **Direct ESP32** panel, set the URL to:
   👉 **`ws://192.168.1.100:81`**
3. Click the **Connect Direct** button.
4. Go to the **Drive** tab. The status indicator should turn green and display **Connected / System Ready**.

---

### Option B: Local Relay Mode (Collaborative Control)
*Best for: Multi-client monitoring, enabling Leader/Observer roles on the same network.*

#### Step 1: Configure the Backend Relay
1. Open `MobileAPP/backend/config.json` on your PC and configure it to target your physical ESP32's IP:
   ```json
   {
     "esp32_ip": "192.168.1.100"
   }
   ```

#### Step 2: Run the Relay Server
1. Open a terminal inside `MobileAPP/backend` and start the server:
   ```bash
   cd MobileAPP/backend
   npm run dev
   ```
2. The console will print:
   ```text
   [2026-07-04T00:00:00.000Z] === ASAR Robot Relay Backend ===
   [2026-07-04T00:00:00.000Z] Local relay WS  : ws://localhost:3001/ws
   [2026-07-04T00:00:00.000Z] ESP32 target    : ws://192.168.1.100:81
   [2026-07-04T00:00:00.000Z] Connecting to ESP32...
   [2026-07-04T00:00:00.000Z] ESP32 connected at ws://192.168.1.100:81
   ```

#### Step 3: Open and Connect the App
1. Open `http://localhost:3000` in your web browser.
2. Go to the **Config** tab.
3. In the **Relay Backend** panel, write:
   👉 **`ws://localhost:3001/ws`**
4. Click **Connect Relay**.
5. The interface will connect to your local relay. The first tab to connect will be assigned the **Leader** (full control), and subsequent tabs will open in **Observer Mode** (telemetry only).

---

## SITUATION 2: Mobile App and Robot on DIFFERENT Networks

When your mobile controller (e.g., using cellular data or a different Wi-Fi network) needs to control the robot over the internet, you **must** use **Relay Mode with Public Tunneling**.

### Step 1: Keep the Relay PC and Robot on the Same Wi-Fi
The physical ESP32 cannot handle internet-scale TCP handshake latency. Therefore, the **Relay Server (your PC) must remain on the same local Wi-Fi as the robot**, while acting as a gateway to the outside world.

### Step 2: Create a Public Proxy Tunnel (using ngrok)
To allow clients from the internet to connect to your local relay on port `3001`, expose the port publicly:
1. Open a terminal and run `ngrok` (install it from https://ngrok.com if not already installed):
   ```bash
   ngrok http 3001
   ```
2. Locate the generated **Forwarding HTTPS URL** in the ngrok output, which looks like:
   `https://abcd-123-45-67.ngrok-free.app`

### Step 3: Bind the Tunnel to the Relay Server
Inform the relay server of its new public address:
1. Open `MobileAPP/backend/.env` and set the public URL variable:
   ```env
   PORT=3001
   ESP32_IP=192.168.1.100
   PUBLIC_URL=https://abcd-123-45-67.ngrok-free.app
   ```
2. Run (or restart) the backend relay:
   ```bash
   cd MobileAPP/backend
   npm run dev
   ```

### Step 4: Connect the Mobile App from Anywhere
1. On your cellular phone or remote computer, load the mobile application:
   `http://<your-pc-ip>:3000` (or host it publicly).
2. Go to the **Config** tab.
3. In the **Relay Backend** panel, change the protocol from `https` to `wss` (secure WebSocket) and target your public ngrok route:
   👉 **`wss://abcd-123-45-67.ngrok-free.app/ws`**
4. Click **Connect Relay**.
5. Your remote device is now transmitting control frames and streaming live telemetry over the internet securely!

---

## SPECIAL SITUATION: Testing Without Hardware (Simulation Mode)

If the robot is turned off, or if you cannot install USB serial drivers due to administrative restrictions:

#### Step 1: Enable Simulator
1. Open `MobileAPP/backend/config.json` and set the target IP to `"simulate"`:
   ```json
   {
     "esp32_ip": "simulate"
   }
   ```
2. Restart your backend server (`npm run dev`).
3. The server will start generating realistic, simulated physics and virtual telemetry (radars, RPM meters).

#### Step 2: Connect the App
1. Navigate to the **Config** tab.
2. In the **Relay Backend** input box, write:
   👉 **`ws://localhost:3001/ws`**
3. Click **Connect Relay**.
4. Click **START** on the Dashboard. You can now test and explore all dashboard capabilities virtually.

---

## Troubleshooting Guide

### 1. Connection connects but drops immediately
* **Cause**: Another WebSocket connection is already active on the same port, or the ESP32 socket crashed.
* **Fix**: Power cycle your ESP32. Ensure all other terminal instances (or Chrome F12 injection tabs) are closed.

### 2. Leader vs Observer Locks
* **Symptom**: "Observer Mode — controls disabled" is visible, and the joystick is locked.
* **Cause**: Another browser tab or client connected to the relay first and claimed "Leader" status.
* **Fix**: Click the **Claim Control** button on your dashboard to force-reassign leadership to your active viewport.

### 3. Mixed Content / Security Errors
* **Symptom**: Connection fails on physical Android devices.
* **Cause**: Android blocks plain `ws://` connections under modern WebView guidelines unless explicit exceptions are made.
* **Fix**: Ensure `allowMixedContent: true` is enabled in `capacitor.config.ts`. Alternatively, use secure tunneling (`wss://` via ngrok) to force encrypted transport.
