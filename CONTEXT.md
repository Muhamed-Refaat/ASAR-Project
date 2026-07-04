# ASAR Project - System Context

This document outlines the architecture, hardware configuration, and communication protocols for the Autonomous & Semi-Autonomous Robot (ASAR) Project.

---

## 1. System Overview

ASAR is a 4-wheel-drive differential-steering robot system comprised of three primary layers:
1. **Frontend / Mobile Application (`MobileAPP`)**: A cross-platform application built using Vite, TypeScript, and Capacitor. It communicates over a WebSocket connection to command the robot and display telemetry in real-time.
2. **Communications Master (`esp`)**: Powered by an ESP32 (DOIT DEVKIT V1). It handles connection to the local WiFi network, runs a WebSocket server, maps client inputs to motor commands, and relays telemetry/feedback.
3. **Hardware Controller (`mega`)**: Powered by an Arduino Mega 2560. It handles low-level hardware control, including the L298N motor drivers, wheel encoder interrupts, ultrasonic distance sensors, buzzer, status indicator LED, and MPU-6050 IMU filtering/telemetry.

```mermaid
graph TD
    App[Mobile App / WebSocket Client] <-->|WiFi / WS Port 81| ESP32[ESP32 master]
    ESP32 <-->|UART2 9600 Baud| Mega[Arduino Mega 2560]
    Mega -->|PWM & GPIO| Motors[4WD Motors / 2x L298N]
    Mega <--|Interrupts| Encoders[Left/Right Encoders]
    Mega <--|I2C| MPU[MPU-6050 IMU]
    Mega <--|PulseIn| Ultrasonics[4x Ultrasonic Sensors]
    Mega -->|GPIO| Indicators[Buzzer & Status LED]
```

---

## 2. Hardware Mapping

### ESP32 DOIT DEVKIT V1
* **UART2 RX** (From Mega TX2): `GPIO 16`
* **UART2 TX** (To Mega RX2): `GPIO 17`

### Arduino Mega 2560
* **UART2 TX** (To ESP32 RX2): `Pin 16`
* **UART2 RX** (From ESP32 TX2): `Pin 17`

#### Sensor & Indicator Pins
* **Ultrasonic Sensors**:
  * **Left**: Trig = `Pin 28` | Echo = `Pin 29`
  * **Front**: Trig = `Pin 22` | Echo = `Pin 23`
  * **Right**: Trig = `Pin 24` | Echo = `Pin 25`
  * **Rear**: Trig = `Pin 26` | Echo = `Pin 27`
* **IMU (MPU-6050)**:
  * Connection: I2C Interface (`SDA = Pin 20`, `SCL = Pin 21`)
  * Address: `0x68`
* **Buzzer**: `Pin 30`
* **Status LED**: `Pin 31`

#### Motor Control (L298N H-Bridges)
* **Left Motors (L298N #1)**:
  * Inputs: IN1 = `Pin 32` | IN2 = `Pin 33` | IN3 = `Pin 34` | IN4 = `Pin 35`
  * Speed (PWM): ENA = `Pin 5` | ENB = `Pin 6`
* **Right Motors (L298N #2)**:
  * Inputs: IN1 = `Pin 36` | IN2 = `Pin 37` | IN3 = `Pin 38` | IN4 = `Pin 39`
  * Speed (PWM): ENA = `Pin 8` | ENB = `Pin 9`
* **Wheel Encoders**:
  * Left Encoder: Channel A = `Pin 18` (Interrupt) | Channel B = `Pin 19`
  * Right Encoder: Channel A = `Pin 2` (Interrupt) | Channel B = `Pin 3`

---

## 3. Communication Protocol (UART & WebSocket)

All messages are newline-terminated (`\n`) ASCII strings.

### Commands (App/ESP32 -> Mega)
| Command | Arguments | Description |
| :--- | :--- | :--- |
| `START` | None | Initiates subsystem check and transitions Mega to `RUNNING` |
| `STOP` | None | Emergency stops all motors immediately |
| `HORN` | None | Activates buzzer brief warning tone |
| `SPD:left:right` | `left`: -255..255<br>`right`: -255..255 | Sets direct wheel speeds (differential steering) |
| `MAX_SPD:val` | `val`: 0..255 | Configures maximum allowed speed limits |
| `MPU_ON` | None | Enables periodic MPU-6050 IMU telemetry |
| `MPU_OFF` | None | Disables periodic MPU-6050 IMU telemetry |
| `MPU_REQ` | None | Requests a single immediate MPU telemetry reading |
| `MPU_CFG:aThr:gThr:alpha:rep` | `aThr`: Accel change suppression threshold (e.g. 1200)<br>`gThr`: Gyro change suppression threshold (e.g. 180)<br>`alpha`: Low-pass filter percent (5..95)<br>`rep`: Report interval in milliseconds (50..1000) | Adjusts MPU-6050 vibration suppression and report rates |
| `AUTO_ON` | None | Activates autonomous obstacle-avoidance autopilot |
| `AUTO_OFF` | None | Deactivates autonomous obstacle-avoidance autopilot |
| `AUTO_CFG:cSpd:tSpd:minF:cautF:rSpd:rMs:tMs:bias` | Autonomous autopilot configuration parameter list | Configures autonomous speeds, thresholds, and timings |
| `ALIGN` | None | Request automated alignment sequence |
| `GOAL:leftDist:rightDist` | Target distances | Run towards a specific encoder goal |

### Telemetry & Feedback (Mega -> ESP32/App)
| Message Prefix | Arguments | Description |
| :--- | :--- | :--- |
| `RDY` | None | Transmitted when Mega setup completes and ready to receive commands |
| `RPM:left:right` | Left & Right calculated RPMs | Periodic wheel speed encoder reports |
| `DIST:left:front:right:rear` | Distances in centimeters | Periodic ultrasonic distance sensor sweeps |
| `MPU:ax:ay:az:gx:gy:gz` | Accelerometer & Gyro readings | Periodic/Requested IMU telemetry |
| `AUTO_STAT:phase` | Pilot phase | Current Autopilot status (`CRUISE`, `AVOID_REVERSE`, etc.) |
| `AUTO_EVT:event` | Action event | Autopilot decisions (e.g., turning left, backing up) |
| `ACK:cmd` | Command name | Command confirmation acknowledgement |
| `ERR:code` | Error ID (e.g. `NOT_READY`) | Error/Fault reporting |

---

## 4. Software State Machine

```
      ESP32                                     MEGA
  +------------+                           +------------+
  |    OFF     |                           |    OFF     |
  +-----+------+                           +-----+------+
        | (Power on)                             | (Power on)
        v                                        v
  +------------+                           +------------+
  |  INITIALIZE|                           |    IDLE    |
  +-----+------+                           +-----+------+
        |                                        |
        |---- Sends CMD_START periodic --------->| (Triggers self-checks)
        v                                        v
  +------------+                           +------------+
  |    IDLE    |<--- Receives MSG_RDY ------| INITIALIZE |
  +-----+------+                           +-----+------+
        |                                        |
        |---- Handshake verified -------------->| (Transitions automatically)
        v                                        v
  +------------+                           +------------+
  |  RUNNING   |                           |  RUNNING   |
  +------------+                           +------------+
```
