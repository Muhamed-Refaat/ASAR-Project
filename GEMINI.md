# ASAR ESP32 + Mega 4WD Robot — Developer Guide & System Instructions

Welcome to the **ASAR 4WD Robotic Platform** instruction guide. This document serves as the primary technical blueprint and context-preservation manual for developers and AI agents operating within this workspace.

---

## 1. Project Overview & Architecture

The **ASAR (Autonomous/Semi-Autonomous Robot)** platform is a differential-steering 4-wheel drive robot. The system is split into two primary layers of hardware firmware and a dual-topology mobile controller application:

```
                  +-----------------------------------+
                  |      MobileAPP Client (React)     |
                  |  Direct (Port 81) or Relay (3001) |
                  +-----------------------------------+
                                    |
                                    v (WebSocket JSON/Raw)
                  +-----------------------------------+
                  |  ESP32 Gateway Firmware (Master)  |
                  |     WiFi / AP + WebSockets Server  |
                  +-----------------------------------+
                                    |
                                    v (UART2 ASCII, 9600 Baud, Pins 16/17)
                  +-----------------------------------+
                  |  Arduino Mega 2560 (Low-Level)    |
                  |  Motors, Encoders, Sensors, IMU   |
                  +-----------------------------------+
```

### A. Core Components

1. **ESP32 DOIT DEVKIT V1 (Communication Gateway & Master)**:
   - Hosts a local WiFi endpoint or connects to a local router.
   - Runs a WebSocket server (default port `81`) to receive drive vectors, configuration, and state directives.
   - Acts as the UART master. It parses WebSocket payloads, maps control vectors, transmits command strings over **UART2 (TX: GPIO 17, RX: GPIO 16)** to the Arduino Mega, and receives sensor telemetry to broadcast back to connected clients.

2. **Arduino Mega 2560 (Low-Level Device & Motor Controller)**:
   - Interfaces directly with **2x L298N Motor Drivers** to control 4 DC motors.
   - Processes wheel encoder interrupt lines to calculate rotational speed (RPM).
   - Drives **4x HC-SR04 Ultrasonic Sensors** (Left, Front, Right, Rear) for obstacle awareness and collision warning.
   - Reads **MPU-6050 IMU** over I2C (Address `0x68`) with active low-pass filtering and threshold change suppression to mitigate structural chassis vibration.
   - Operates a piezo **Buzzer** (Pin 30) and status **LED** (Pin 31) for localized safety signaling.
   - Executes UART directives from the ESP32 and runs the **AutoPilot** autonomous collision avoidance routine.

3. **MobileAPP (React Frontend + Capacitor v6 Native wrapper)**:
   - Responsive web and native Android control station dashboard built with **React (TypeScript), Vite, TailwindCSS, Lucide Icons, and Motion**.
   - Interfaces with the robot via touch Joystick, navigation buttons, or raw individual motor overrides.
   - Renders live telemetry widgets (gauges for RPM, distance awareness radars, and scrolling charts for trajectory risk evaluation).

4. **Relay Server (Node.js Proxy)**:
   - Written in Express & `ws`. Enables remote over-the-internet control (via ngrok tunnels) and enforces multi-client safety rules.

---

## 2. Directory Structure

The repository workspace is organized as follows:

```
C:\Users\mrefaata\MyProjects\ASAR-Project\
├── GEMINI.md                   # This instruction guide (Root master context)
├── INSTRUCTIONS.md             # Standard physical setup and Arduino upload steps
├── README.md                   # Legacy Blynk-oriented project hardware manual
├── esp/
│   └── esp.ino                 # ESP32 Communication Gateway firmware sketch
├── mega/
│   └── mega.ino                # Arduino Mega 2560 low-level control firmware
├── MobileAPP/                  # Web, Android, and Relay Server codebase
│   ├── package.json            # Vite + Capacitor dependencies & run scripts
│   ├── tsconfig.json           # TS strict compilation rules
│   ├── vite.config.ts          # Vite web server and CSS plugins
│   ├── capacitor.config.ts     # Android native configuration
│   ├── src/                    # React controller station source
│   │   ├── main.tsx            # App bundle boots
│   │   ├── App.tsx             # Master viewport layout, router tabs, and event loops
│   │   ├── index.css           # Tailwind v4 stylesheet (AetherForge style)
│   │   ├── components/         # Modular widget cards (Joystick, Radar, Charts, Status)
│   │   └── lib/                # Networking & custom React hooks (useRobotConnection.ts)
│   ├── backend/                # Express & WebSockets Relay Server
│   │   ├── server.js           # Multi-client Leader/Observer arbitration logic
│   │   └── config.json         # Static IP storage for the target ESP32 gateway
│   └── android/                # Compiled Capacitor wrapper project (Android Studio)
├── docs/                       # High-value system specifications and validation logs
│   ├── ASAR-CHROME-DEVTOOLS-TESTS.md  # F12 developer console injection test scripts
│   ├── ASAR-DEPLOYMENT-SUMMARY.md     # Build history and configuration checklists
│   ├── ASAR-IMPLEMENTATION-GUIDE.md   # Widget-by-widget Blynk interface details
│   ├── full-system-test-user-guide.md # Step-by-step physical validation instructions
│   └── validation-loop-diagnosis.md   # Loop isolation diagnostic checklist
├── tst/                        # Modular hardware unit verification sketches
│   ├── encoder_tst/            # Direct motor encoder pulse checking
│   ├── motor_only_tst/         # Direct drive polarity and driver health checks
│   ├── ultrasonic_tst/         # Isolated HC-SR04 feedback validation
│   └── mpu_only_tst/           # MPU-6050 vibration analysis tool
└── .agents/skills/             # Custom CLI automation and validation scripts
```

---

## 3. Operational Modes & Connection Topologies

The mobile client supports two distinct network paths to talk to the robotic platform:

### A. Direct Connection Mode (`ws://192.168.1.100:81`)
- **Avenue**: Client links directly to the local ESP32 Wi-Fi address (fixed to static `192.168.1.100`).
- **Benefits**: Ultra-low latency, localized control, no external relay required.
- **Constraints**: Client and Robot must reside on the same Wi-Fi subnet.

### B. Relay Connection Mode (`ws://<Relay_IP>:3001/ws`)
- **Avenue**: Clients connect to the Node.js Relay Server. The Relay Server handles communication to the ESP32.
- **Authority Rule**: **Single-Leader, Multi-Observer**.
  - The first client to connect (or any client sending a JSON `{ "type": "claim_leader" }`) becomes the **Leader**.
  - Subsequent connections are **Observers**.
  - Only the Leader can issue active steering and control commands (`SPD`, `STOP`, `MAX_SPD`).
  - Observers receive all telemetry streams (`RPM`, `DIST`, `AUTO_STAT`, `MPU`) but their inputs are rejected with a `{ "type": "not_leader" }` payload.
  - If the Leader disconnects, the Relay automatically promotes the next observer in line.

---

## 4. Hardware Configuration & Wiring Reference

### A. ESP32 Pinout (DOIT DEVKIT V1)
- **UART2 RX**: GPIO 16 (connected to Arduino Mega TX2 Pin 16)
- **UART2 TX**: GPIO 17 (connected to Arduino Mega RX2 Pin 17)
- **Power**: Common GND with Arduino Mega and L298N drivers.

### B. Arduino Mega 2560 Pinout
- **UART2 TX2**: Pin 16
- **UART2 RX2**: Pin 17
- **Buzzer**: Pin 30 (Active High)
- **Status LED**: Pin 31
- **Left Encoder A/B**: Pin 18 / Pin 19 (Interrupt pins)
- **Right Encoder A/B**: Pin 2 / Pin 3 (Interrupt pins)
- **Ultrasonic HC-SR04 Array**:
  - Left Trigger / Echo: Pin 28 / Pin 29
  - Front Trigger / Echo: Pin 22 / Pin 23
  - Right Trigger / Echo: Pin 24 / Pin 25
  - Rear Trigger / Echo: Pin 26 / Pin 27
- **L298N Motor Driver #1 (Left Bank Motors)**:
  - IN1 / IN2 / IN3 / IN4: Pin 32 / Pin 33 / Pin 34 / Pin 35
  - ENA / ENB (PWM speed lines): Pin 5 / Pin 6
- **L298N Motor Driver #2 (Right Bank Motors)**:
  - IN1 / IN2 / IN3 / IN4: Pin 36 / Pin 37 / Pin 38 / Pin 39
  - ENA / ENB (PWM speed lines): Pin 8 / Pin 9
- **I2C MPU-6050 IMU**:
  - SDA / SCL: Pin 20 / Pin 21 (0x68 Address)

---

## 5. Network & UART Communication Protocols

The ESP32 and Arduino Mega communicate via line-buffered, ASCII newline-terminated strings over UART2 (9600 baud).

### A. Downstream Commands (ESP32 -> Mega 2560)
- `START\n` — Initiates the UART session, boots subsystems, and commands the Mega to reply with `RDY`.
- `STOP\n` — Triggers an immediate emergency stop (ceases all motor output, non-latching).
- `HORN\n` — Triggers a momentary buzzer beep (0.3s).
- `SPD:left:right\n` — Drives left and right banks. (e.g. `SPD:150:-150` for in-place rotate). Ranges: `-255` to `255`.
- `WSPD:FL:RL:FR:RR\n` — Individual overrides for Front-Left, Rear-Left, Front-Right, Rear-Right wheels.
- `MAX_SPD:val\n` — Caps maximum PWM speed. (0 to 255).
- `MPU_ON\n` / `MPU_OFF\n` — Enables/disables MPU-6050 telemetry stream.
- `MPU_REQ\n` — Requests a single immediate IMU reading.
- `MPU_CFG:accelThr:gyroThr:alphaPct:reportMs\n` — Recalibrates MPU filters and reporting interval.
- `AUTO_ON\n` / `AUTO_OFF\n` — Enables/disables Semi-Autonomous Autopilot navigation.
- `AUTO_CFG:cruiseSpd:turnSpd:minFrontCm:cautionFrontCm:reverseSpd:reverseMs:turnMs:sideBias\n` — Configures autonomous navigation thresholds.

### B. Upstream Telemetry (Mega 2560 -> ESP32)
- `RDY\n` — Indicates initialization is complete and state is set to `RUNNING`.
- `RPM:left:right\n` — Raw wheel encoder RPM (float representation).
- `DIST:L:F:R:B\n` — Four-axis ultrasonic distance readings in centimeters.
- `ACK:command\n` — Acknowledges execution of the specific command parameter.
- `ERR:code\n` — Reports hardware or protocol errors.
- `MPU:ax:ay:az:gx:gy:gz\n` — Vibration-filtered IMU outputs.
- `AUTO_STAT:enabled:phase:cmdL:cmdR:x:y:heading:risk\n` — Full navigation and obstacle danger statistics.
- `AUTO_EVT:event_text\n` — Log of autonomous state transitions (e.g. obstacle detected, reversing).

---

## 6. Setup, Build, and Run Guidelines

### A. Arduino Firmware Upload (Manual)
1. **Mega Firmware (`mega/mega.ino`)**:
   - Board: **Tools > Board > Arduino AVR Boards > Arduino Mega or Mega 2560**
   - Upload via standard micro-USB cable.
2. **ESP32 Firmware (`esp/esp.ino`)**:
   - Edit the WiFi credentials at the top of `esp.ino` to match your local SSID.
   - Board: **Tools > Board > esp32 > DOIT ESP32 DEVKIT V1**
   - Press and hold the **BOOT** button on the ESP32 chip during compilation/uploading if the serial link hangs.

### B. MobileAPP Setup (Node.js & Vite)
1. **Frontend Installation & Run**:
   ```bash
   cd MobileAPP
   npm install
   npm run dev
   ```
   *Launches Vite on `http://localhost:3000` (mapped to `0.0.0.0` for local WLAN mobile debugging).*

2. **Backend Relay Run**:
   ```bash
   cd MobileAPP/backend
   npm install
   npm run dev
   ```
   *Starts the Node proxy on port `3001` with hot reload watch.*

3. **Capacitor Android Synchronization**:
   ```bash
   cd MobileAPP
   npm run build
   npx cap sync android
   npx cap open android
   ```
   *Compiles the production static bundle, pushes files to the Gradle project, and fires up Android Studio.*

---

## 7. Developer Validation & Testing Loops

To maintain the high structural integrity of the project, follow this validation pipeline after any code modification:

```
[Edit Code] ──> [npm run lint] ──> [Manual Hardware Upload] ──> [Full Handshake Verification]
```

### A. Handshake and Session Diagnostics (Serial Log Verification)
Open the ESP32 serial interface at `115200` baud. Watch for the log structure:
1. **Blynk / App Interaction**:
   - `[ESP][BLYNK] V0=1` or WebSockets frame input check.
2. **Handshake Verification**:
   - ESP transmits `START` -> Mega replies `RDY` -> ESP switches to `RUNNING`.
   - Logging format: `[ESP][TX] START` and `[ESP][RX] RDY`.
3. **Telemetry Streaming**:
   - Confirm `DIST` and `RPM` packets are parsed by the ESP32 and successfully encapsulated as JSON frames for WebSocket clients.

### B. Command Denoising & Non-Blocking Rules
1. **Absolute No-Delay Rule**: Never introduce `delay()` inside either `esp.ino` or `mega.ino`. All schedules, LED behaviors, sensor pings, and telemetry intervals must be orchestrated asynchronously via `millis()` timers.
2. **Slicing Hook Arrays**: When adding graphs or list buffers inside the custom React hooks (such as `useRobotConnection.ts`), always enforce memory limitations (e.g. `MAX_HISTORY = 20`, `LOG_LIMIT = 80`) to protect the client's thread from high-frequency telemetry crashes.

### C. F12 Chrome DevTools Simulation (For UI Testing)
If physical hardware is disconnected, copy the mock suites from `docs/ASAR-CHROME-DEVTOOLS-TESTS.md` directly into your browser console while inspecting the running Vite client. This simulates real-time differential calculation updates and tests collision radar states under visual hazard conditions.

---

## 8. Agent Behavioral Mandates

When operating inside this workspace, you must adhere strictly to these rules:
1. **Zero-Secret Commits**: Never stage or commit credentials, WiFi parameters, or private environment variables (`.env`).
2. **Maintain Topology Isolation**: Do not bypass or break the direct vs relay connectivity architecture inside `useRobotConnection.ts`.
3. **No Code Reversions**: Never revert any existing changes in the repository unless explicitly asked by the user or as part of a debug-and-rollback strategy for immediate compilation failures.
4. **Style Alignment**: Keep styles consistent with the dark retro-futuristic terminal aesthetic. Use Tailwind-compatible layout classes and preserve interactive motion feedbacks.
