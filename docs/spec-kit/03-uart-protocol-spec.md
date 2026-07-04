# UART Protocol Specification

This document now tracks two interfaces:
- MobileAPP <-> ESP32 over WebSocket (ASCII lines)
- ESP32 <-> Mega over UART2 (ASCII lines)

## 1. Transport

- Medium: UART2 between ESP32 and Mega 2560.
- Framing: ASCII text, one message per line.
- Terminator: newline character `\n`.
- Ownership: ESP32 is the command master, Mega is the command executor.

### 1.1 MobileAPP Transport

- Medium: WebSocket between MobileAPP (direct) or relay backend and ESP32.
- Default endpoint: `ws://<esp32_ip>:81`.
- Framing: ASCII text, one message per line.
- Terminator: newline character `\n`.
- Ownership: MobileAPP sends control commands; ESP32 validates and bridges commands to Mega.

## 2. General Message Rules

- Commands and feedback messages are case-sensitive and uppercase.
- Fields are separated by `:`.
- Messages shall not contain extra spaces.
- Receivers shall buffer input until `\n` is received.
- Receivers shall reject malformed frames without undefined behavior.

## 2A. MobileAPP to ESP32 Commands

| Message | Meaning | Payload |
|---|---|---|
| `START` | Request Mega handshake/start sequence | None |
| `STOP` | Stop all motors | None |
| `HORN` | Trigger horn action | None |
| `FWD:speed` | Forward scalar command | `speed` in `0..255` |
| `BCK:speed` | Backward scalar command | `speed` in `0..255` |
| `LEFT:speed` | Left turn scalar command | `speed` in `0..255` |
| `RIGHT:speed` | Right turn scalar command | `speed` in `0..255` |
| `SPD:left:right` | Differential command | `left` and `right` in `-255..255` |
| `AUTO_ON` | Enable onboard autonomous obstacle avoidance | None |
| `AUTO_OFF` | Disable autonomous mode and return to manual control | None |
| `AUTO_CFG:cruise:turn:min:caution:reverse:reverseMs:turnMs:bias` | Configure autonomous behavior parameters | Signed integers with validated ranges |
| `MPU_ON` | Enable periodic MPU telemetry from Mega | None |
| `MPU_OFF` | Disable periodic MPU telemetry from Mega | None |
| `MPU_REQ` | Request an immediate MPU telemetry sample | None |
| `MPU_CFG:accelThr:gyroThr:alphaPct:reportMs` | Configure MPU threshold/filter/report settings on Mega | Integer fields with validated ranges |

## 2B. ESP32 to MobileAPP Feedback

| Message | Meaning |
|---|---|
| `RDY` | Mega is initialized and ready |
| `RPM:left:right` | Forwarded RPM telemetry |
| `DIST:L:F:R:B` | Forwarded distance telemetry |
| `ERR:code` | ESP32 or Mega error |
| `AUTO_STAT:enabled:phase:cmdL:cmdR:front:left:right:risk` | Autonomous mode status telemetry |
| `AUTO_EVT:event` | Autonomous state transition or reason event |
| `MPU:ax:ay:az:gx:gy:gz` | Forwarded filtered MPU telemetry |

## 3. ESP32 to Mega Commands

### 3.1 Handshake

| Message | Meaning | Payload |
|---|---|---|
| `START` | Request subsystem initialization and readiness | None |

### 3.2 Motion Commands

| Message | Meaning | Payload |
|---|---|---|
| `FWD:speed` | Drive both sides forward | `speed` in `0..255` |
| `BCK:speed` | Drive both sides backward | `speed` in `0..255` |
| `LEFT:speed` | Turn left using a predefined turn behavior | `speed` in `0..255` |
| `RIGHT:speed` | Turn right using a predefined turn behavior | `speed` in `0..255` |
| `STOP` | Stop all motors | None |
| `SPD:left:right` | Raw differential control | `left` and `right` in `-255..255` |
| `AUTO_ON` | Enable onboard autonomous obstacle avoidance | None |
| `AUTO_OFF` | Disable autonomous mode and stop autonomous actuation | None |
| `AUTO_CFG:cruise:turn:min:caution:reverse:reverseMs:turnMs:bias` | Configure autonomous behavior parameters | Signed integer fields |
| `MPU_ON` | Enable periodic MPU telemetry | None |
| `MPU_OFF` | Disable periodic MPU telemetry | None |
| `MPU_REQ` | Request immediate MPU sample | None |
| `MPU_CFG:accelThr:gyroThr:alphaPct:reportMs` | Configure MPU filtering and report cadence | Integer fields |

### 3.3 Auxiliary Commands

| Message | Meaning | Payload |
|---|---|---|
| `HORN` | Trigger buzzer action | None |

## 4. Mega to ESP32 Feedback

| Message | Meaning | Payload |
|---|---|---|
| `RDY` | Mega is initialized and ready | None |
| `RPM:left:right` | Current measured wheel RPM | Signed integer values |
| `DIST:L:F:R:B` | Distances in centimeters | Left, Front, Right, Rear |
| `ERR:code` | Error indicator | Short error code or token |
| `AUTO_STAT:enabled:phase:cmdL:cmdR:front:left:right:risk` | Autonomous mode status telemetry | Enabled flag, state label, commanded speeds, distances, risk |
| `AUTO_EVT:event` | Autonomous state transition event | Event token |
| `MPU:ax:ay:az:gx:gy:gz` | Filtered IMU telemetry (accelerometer + gyroscope raw units) | 6 signed integers |

## 5. Parsing Rules

### 5.1 ESP32 Parser Requirements

- The ESP32 shall ignore empty lines.
- The ESP32 shall treat `RDY` as a state transition event.
- The ESP32 shall parse `RPM` and `DIST` only when field counts match the message type.
- The ESP32 shall parse `MPU` only when exactly 6 signed integer fields are present.
- The ESP32 shall reject unknown prefixes without crashing.
- The ESP32 shall surface `ERR` conditions through logging and safe control behavior.

### 5.2 Mega Parser Requirements

- The Mega shall ignore empty lines.
- The Mega shall handle `START`, `STOP`, and `HORN` as zero-payload commands.
- The Mega shall handle `MPU_ON`, `MPU_OFF`, and `MPU_REQ` as MPU-control commands.
- The Mega shall validate numeric ranges for all speed payloads.
- The Mega shall reject malformed `SPD` frames if they do not contain exactly two numeric payload fields.
- The Mega shall reject malformed `MPU_CFG` frames if they do not contain exactly four numeric payload fields in range.
- The Mega shall stop motion or refuse the command when payload validation fails.

## 6. Recommended Error Codes

The following `ERR` codes are recommended for consistent debugging:

| Code | Meaning |
|---|---|
| `BAD_CMD` | Unknown command prefix |
| `BAD_ARG` | Invalid payload or wrong field count |
| `BAD_RANGE` | Numeric payload out of allowed range |
| `NOT_READY` | Command received before initialization |
| `SENSOR` | Sensor subsystem failure |
| `MPU_READ` | MPU read transaction failure |

## 7. Handshake Sequence

1. ESP32 boots and configures UART.
2. ESP32 reaches run-ready state.
3. ESP32 transmits `START\n`.
4. Mega initializes motors, sensors, buzzer, LED, and encoder logic.
5. Mega transmits `RDY\n`.
6. ESP32 begins normal command streaming and feedback parsing.

## 8. Timing and Robustness Guidance

- UART receive logic should be non-blocking.
- Messages should be short enough to fit within small line buffers on both boards.
- Telemetry transmission should be periodic but should not starve command handling.
- Both boards should tolerate partial serial delivery until newline termination.

## 9. Compatibility Rule

- Any change to message names, field counts, value ranges, or semantics must be applied to both firmware files and then reflected in this specification in the same edit session.