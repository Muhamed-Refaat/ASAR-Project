# ASAR 4WD Robot Controller — Developer Guide

This file provides comprehensive guidelines, architectural designs, commands, and conventions for the **ASAR 4WD Robot Controller** workspace.

---

## 1. Project Overview

The **ASAR 4WD Robot Controller** is a real-time mobile and web-based interface designed to remotely monitor and control a 4-wheel drive (4WD) robotic platform. The workspace contains two distinct layers:
1. **Frontend (Vite + React + Capacitor v6)**: A responsive, modern frontend configured for both web browsers and native Android devices. It displays real-time telemetry, renders live charts, handles visual distance alerts, and transmits steering inputs (via a canvas-based Joystick, touch buttons, or individual wheel controllers).
2. **Backend (Node.js Relay Server)**: A WebSocket proxy relay designed to bridge network communication between the frontend client(s) and the physical ESP32 onboard controller, while managing collaborative multi-client authorization (Leader/Observer states).

---

## 2. System Architecture & Topology

The application supports two distinct operational communication topologies:

### A. Direct Connection Mode
```
+------------------+                    +-----------------+
|   Mobile Client  | <--- WebSocket --->|  Physical ESP32  |
|  (Direct Mode)   |    (port 81)       | (Robot Gateway) |
+------------------+                    +-----------------+
```
*   **Avenue**: Connects directly to the robot's local ESP32 IP Address (configured in settings, e.g., `ws://192.168.1.100:81`).
*   **Use Case**: Ideal for low-latency, localized control when the phone and robot reside on the same WLAN.

### B. Relay Connection Mode
```
+--------------------+                 +---------------------+                 +-----------------+
|   Mobile Client    |                 | Node.js Relay Server|                 |  Physical ESP32  |
| (Leader/Observer)  | <-- WebSockets->| (configures esp32_ip| <---WebSocket ->| (Robot Gateway) |
|   (port 3000/3001) |                 |   via port 3001/ws) |    (port 81)    |                 |
+--------------------+                 +---------------------+                 +-----------------+
```
*   **Avenue**: Mobile clients connect to the backend server (e.g. `ws://localhost:3001/ws` or a public ngrok tunnel).
*   **Role Management & Concurrent Clients**:
    *   **Single-Leader, Multi-Observer Topology**: The relay tracks connected clients. The first client to connect is designated as the `leader`, while all subsequent clients are `observers`.
    *   **Authority Isolation**: Only the `leader` can transmit steering, configuration, or operational commands (`SPD`, `STOP`, `MAX_SPD`) to the ESP32. Observers receive real-time telemetry updates (RPM, distance, autopilot status) but their control inputs are blocked (the relay replies with `{ "type": "not_leader" }`).
    *   **Failover**: If the active leader disconnects, the backend automatically promotes the next observer in line to `leader` status.
    *   **Leadership Acquisition**: Observers can manually claim leadership by sending a JSON payload `{ "type": "claim_leader" }`.

---

## 3. Directory Structure

```
C:\Users\mrefaata\MyProjects\ASAR-Project\MobileAPP\
├── .env.example              # Core environment configuration template
├── package.json              # Main project/frontend package definition
├── capacitor.config.ts       # Capacitor wrapper configuration for Android
├── vite.config.ts            # Vite bundler, DevServer, and asset settings
├── index.html                # Entry point HTML document
├── src/                      # Frontend Application Source Code
│   ├── main.tsx              # Application bootstrapper
│   ├── App.tsx               # Primary layout, routing, and controller page
│   ├── index.css             # TailwindCSS v4 stylesheet
│   ├── components/           # Subsystem UI Panels and Display Cards
│   │   ├── Header.tsx                 # Diagnostic and state header
│   │   ├── MasterStatus.tsx           # Real-time state indicator card
│   │   ├── BottomNav.tsx              # Workspace tab navigator (Drive, Auto, Data, Config)
│   │   ├── ConnectionSettings.tsx     # Direct/Relay settings, maximum speed, IP adjustments
│   │   ├── DistanceAwareness.tsx      # Real-time 4-direction collision avoidance radar
│   │   ├── AutoPilotPanel.tsx         # Semi-autonomous driving configuration and feedback
│   │   ├── DataDashboard.tsx          # Real-time line-charts for RPM, Distance, and Risk
│   │   ├── JoystickControl.tsx        # HTML Canvas-based touch steer joystick
│   │   ├── ButtonControl.tsx          # Multi-button step driving control interface
│   │   └── IndividualWheelControl.tsx # Individual wheel/side motor speed overrides
│   └── lib/                  # Network Hooks and Helpers
│       ├── useRobotConnection.ts      # Main custom hook managing WebSocket socket states
│       └── utils.ts                   # Tailwind utility helpers (clsx/tailwind-merge integration)
├── backend/                  # Node.js Internet Relay Server
│   ├── .env.example          # Backend port and default ESP32 configurations
│   ├── package.json          # Express + WS dependencies
│   ├── server.js             # Relay service entry, REST API, and WebSocket server
│   ├── config.json           # Local storage for target ESP32 configuration (IP address)
│   └── ws_inject_rotate.js   # Testing utility executing direct motor rotation scripts
└── android/                  # Native Android Capacitor wrapper project
```

---

## 4. Environment Variables

### A. Frontend Root Environment (`.env.local`)
Create a `.env.local` in the root directory to store variables.
```env
# AI Studio automatically injects this at runtime
GEMINI_API_KEY="your-gemini-api-key"
# Used for external app endpoints and self-referential hooks
APP_URL="http://localhost:3000"
```

### B. Relay Backend Environment (`backend/.env`)
Create a `.env` file within the `backend/` directory.
```env
PORT=3001
# IP address of the robot's physical ESP32 gateway
ESP32_IP=192.168.1.100
# Optional public tunnel URL (allows clients to reach the relay via an internet gateway)
# PUBLIC_URL=https://your-tunnel-subdomain.ngrok-free.app
```

---

## 5. Setup & Operational Commands

### A. Installation
1.  **Install Frontend dependencies** (at root):
    ```bash
    npm install
    ```
2.  **Install Backend dependencies** (inside `/backend`):
    ```bash
    cd backend
    npm install
    ```

### B. Running & Local Development
*   **Run Frontend (Vite on port 3000)**:
    ```bash
    npm run dev
    ```
    *Starts the frontend in dev-mode, binding to host `0.0.0.0` so mobile devices connected to the same local network can access the web application at `http://<your-machine-ip>:3000`.*
*   **Run Backend Relay (Express + WS on port 3001)**:
    ```bash
    cd backend
    npm run dev
    ```
    *Launches Node.js with hot-reloading (`--watch`). Starts the relay API, bridges with local ESP32 IP, and binds WebSocket clients to `/ws`.*
*   **Type Checking / Linting**:
    ```bash
    npm run lint
    ```
*   **Build Production Static Assets**:
    ```bash
    npm run build
    ```
*   **Clean workspace builds**:
    ```bash
    npm run clean
    ```

### C. Native Android Integration (Capacitor)
1.  **Build Frontend assets**:
    ```bash
    npm run build
    ```
2.  **Synchronize assets and configuration to the Android wrapper project**:
    ```bash
    npx cap sync android
    ```
3.  **Open the android project in Android Studio to compile/run on an Emulator or Device**:
    ```bash
    npx cap open android
    ```

---

## 6. Public Tunneling (Remote Control Setup)

To control the robot when client devices do not share a local network with the relay server, deploy a public proxy tunnel:

### Using ngrok
1.  **Expose the relay port (3001)**:
    ```bash
    ngrok http 3001
    ```
2.  **Locate the generated HTTPS URL** (e.g., `https://abcd1234.ngrok-free.app`).
3.  **Configure the Relay Server**:
    *   Set the `PUBLIC_URL` variable inside `backend/.env` before booting up the server.
    *   Alternatively, issue a POST request to configure the tunnel dynamically while the server is active:
        ```bash
        curl -X POST http://localhost:3001/api/tunnel -H "Content-Type: application/json" -d "{\"public_url\":\"https://abcd1234.ngrok-free.app\"}"
        ```
4.  **Connect clients**:
    Configure the application connection mode to **Relay**, pointing the address to:
    `wss://abcd1234.ngrok-free.app/ws`

---

## 7. Communication Protocol Specifications

The system operates over a lightweight, line-buffered raw string protocol for hardware efficiency, accompanied by secondary JSON payloads for application control.

### A. Upstream Messages (Client -> Robot/Relay)

| Raw Message | Format | Description |
| :--- | :--- | :--- |
| `START\n` | - | Initiates telemetry broadcasts and status loops from the microcontroller. |
| `STOP\n` | - | Instructs the motor controllers to immediately cease all current/thrust. |
| `SPD:left:right\n` | `SPD:<int_speed>:<int_speed>` | Drives left and right motor banks. Speeds range from `-255` (full reverse) to `255` (full forward). |
| `MAX_SPD:val\n` | `MAX_SPD:<int_limit>` | Modifies the physical motor speed limit. Value ranges from `0` to `255`. |

*   **JSON Upstream Message (Relay Only)**:
    ```json
    { "type": "claim_leader" }
    ```
    *Claims administrative control over the proxy connection, designating the sender as the sole active commander.*

### B. Downstream Messages (Robot/Relay -> Client)

| Raw Message | Format | Description |
| :--- | :--- | :--- |
| `RDY` | - | Signals that the physical robotic hardware and sub-controllers are online and fully operational. |
| `RPM:left:right` | `RPM:<float_rpm>:<float_rpm>` | Provides rotational velocity telemetry from active motor encoders. |
| `DIST:l:f:r:b` | `DIST:<float>:<float>:<float>:<float>` | Returns current obstacle distances in centimeters for Left, Front, Right, and Back sensors. |
| `ERR:message` | `ERR:<text>` | Reports an active controller fault (e.g., driver timeouts, communication losses). |
| `ACK:MAX_SPD:val` | `ACK:MAX_SPD:<int>` | Sent by the controller to acknowledge that the maximum speed throttle was set to `val`. |
| `AUTO_STAT:...` | `AUTO_STAT:<enabled>:<phase>:<cmdL>:<cmdR>:<x>:<y>:<heading>:<risk>` | Telemetry regarding autopilot states, calculated vector coordinates, and target trajectory risks. |
| `AUTO_EVT:event` | `AUTO_EVT:<text>` | Log entry detailing autopilot decisions or environmental state transitions. |

*   **JSON Downstream Messages (Relay Server Status Updates)**:
    *   `{ "type": "esp32_connected" }`: Signals that the relay has successfully bound its connection to the ESP32.
    *   `{ "type": "esp32_disconnected" }`: Signals that the connection between the relay and ESP32 has collapsed.
    *   `{ "type": "role", "role": "leader"\|"observer" }`: Confirms the current socket authority context to the mobile application.
    *   `{ "type": "not_leader" }`: Sent to an observer if they attempt to write drive commands.

---

## 8. Coding Standards & Conventions

*   **Type Safety**: Ensure strict TypeScript usage throughout the client application. Avoid `any` type declarations. Define structures (e.g. `RobotEvent`, `RobotEventLevel`, `ActiveTab`) explicitly in relevant modules.
*   **State Integrity**: Consolidate network socket loops, automatic reconnection logic, denoising algorithms, and stream buffers into individual hooks (like `src/lib/useRobotConnection.ts`). Avoid spawning secondary WebSocket instances or leaking dangling event listeners in layouts.
*   **Capacitor Native Compatibility**: Keep Android mixed content rules (`allowMixedContent: true`) enabled inside `capacitor.config.ts`. This permits local, non-SSL WebSocket connections (`ws://`) to function on modern Android platforms without triggers from security frameworks.
*   **UI/UX Aesthetic Guidelines**:
    *   Follow dark, high-contrast, modern terminal visual guidelines. Keep backgrounds deep/subdued (`bg-surface`, `#0b1326`), with vibrant primary interactive overlays (`text-primary`, `bg-primary`, neon accents).
    *   Enforce instant physical states feedback via smooth visual animations (`motion` package) and state banners.
    *   Ensure telemetry indicators and visual warnings (e.g. collision radar panels) react instantly to incoming stream items with custom safety thresholds.
*   **Telemetry Logging Limits**: Keep arrays bounded. Use the custom slicing functions (e.g., `MAX_HISTORY = 20`, `LOG_LIMIT = 80`) inside state hook buffers to prevent memory bloating from persistent high-frequency WebSocket streams.
