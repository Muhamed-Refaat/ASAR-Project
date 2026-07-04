# Validation and Acceptance

## 1. Purpose

Define a repeatable validation process that verifies firmware behavior, hardware integration, UART robustness, and mobile-control readiness for the ESP32 + Mega 4WD robot.

This document is implementation-ready and can be executed as a test runbook.

## 2. Validation Approach

Validation must run in layers so failures are isolated early:

1. Motor/driver subsystem in isolation (Mega test sketch).
2. UART command handling on Mega.
3. Mega telemetry generation under motion load.
4. ESP32 handshake and serial forwarding behavior.
5. End-to-end app control and telemetry rendering (after Blynk control layer is integrated).

Each later layer is blocked until all mandatory tests in the previous layer pass.

## 3. Test Environment and Tools

### 3.1 Required Hardware

- ESP32 DOIT DEVKIT V1.
- Arduino Mega 2560.
- 2 x L298N drivers wired per hardware spec.
- 4 ultrasonic sensors (Left, Front, Right, Rear).
- MPU-6050 IMU on Mega I2C bus.
- Encoder channels connected to Mega interrupt pins.
- Buzzer and status LED.
- Stable logic and motor power rails.

### 3.2 Required Software/Artifacts

- Mega firmware: mega/mega.ino.
- ESP32 firmware: esp/esp.ino.
- Motor isolation test: tst/motor_only_tst/motor_only_tst.ino.
- Protocol reference: docs/spec-kit/03-uart-protocol-spec.md.

### 3.3 Operator Setup

- Open two serial monitors:
	- ESP32 USB serial at 115200.
	- Mega USB serial or a UART sniffer if available.
- Keep robot wheels lifted during command bring-up.
- Keep STOP path available at all times (manual stop command and power cutoff).

## 4. Phase Gates and Exit Criteria

| Gate | Description | Exit Criteria |
|---|---|---|
| G1 | Motor subsystem isolated validation | T01 passes |
| G2 | UART command execution validation | T02 to T08 pass |
| G3 | Telemetry validation | T09 to T11C pass |
| G4 | Robustness and error handling | T12 to T14 pass |
| G5 | App end-to-end acceptance | T15 to T20 pass |

No gate may be skipped for acceptance sign-off.

## 5. Detailed Test Cases

### 5.1 Core Bring-Up and Motion Tests

| ID | Procedure | Pass Criteria |
|---|---|---|
| T01 | Flash tst/motor_tst.ino on Mega, command each wheel direction and stop in isolation. | All wheels rotate in expected direction and stop cleanly; no unintended cross-side movement. |
| T02 | Flash mega/mega.ino and esp/esp.ino. Power cycle both boards and observe startup logs. | ESP32 transmits START and Mega responds RDY within 3 s after both boards are ready. |
| T03 | Send STOP from ESP32 serial bridge after any motion command. | All motor PWM outputs become zero immediately and vehicle halts. |
| T04 | Send HORN command from ESP32 serial bridge. | Buzzer activates once per command and returns to idle state. |
| T05 | Send SPD:120:120. | Forward straight motion with no side inversion. |
| T06 | Send SPD:-120:-120. | Reverse straight motion with no side inversion. |
| T07 | Send SPD:80:180. | Left arc while moving forward; right side speed is visibly greater. |
| T08 | Send SPD:180:80. | Right arc while moving forward; left side speed is visibly greater. |

### 5.2 Telemetry Tests

| ID | Procedure | Pass Criteria |
|---|---|---|
| T09 | Spin left and right encoder wheels independently by hand and under powered motion. | RPM:left:right reports the correct side responding; sign and magnitude change with direction/speed. |
| T10 | Place obstacles at known distances in left/front/right/rear one side at a time. | DIST:L:F:R:B reflects correct sensor ordering and each active side tracks expected range (approximately plus or minus 5 cm for close-range checks). |
| T11 | Run motion commands while monitoring RPM and DIST messages. | Telemetry remains periodic and command response remains responsive (no visible control lockups). |
| T11A | Bring an obstacle to within threshold (for example 25 cm) of any ultrasonic sensor. | Buzzer pulses and status LED blinks while obstacle is inside threshold, and warning clears when obstacle is removed. |
| T11B | Send MPU_REQ while robot is stationary, then with mild wheel vibration, and observe MPU telemetry. | `MPU:ax:ay:az:gx:gy:gz` is returned and remains visibly more stable than raw vibration (small jitter suppressed). |
| T11C | Send MPU_CFG with tuned values and verify subsequent MPU stream. Example: `MPU_CFG:1400:220:30:200`. | Mega returns `ACK:MPU_CFG:...` and applies new thresholds/filter/report interval without reboot. |

### 5.3 Robustness and Negative Tests

| ID | Procedure | Pass Criteria |
|---|---|---|
| T12 | Send malformed frames (examples: SPD:10, SPD:10:abc, UNKNOWN, empty payload). | Mega emits ERR codes and does not enter unsafe motion. |
| T13 | Send over-length line greater than UART buffer and then a valid STOP command. | Mega reports line-too-long error, recovers parser state, and still executes following valid commands. |
| T14 | Issue motion command before START/RDY session is established. | Mega returns ERR:NOT_READY (or equivalent) and does not drive motors. |

### 5.4 App End-to-End Acceptance Tests

These tests are required once Blynk joystick/button handlers and telemetry widget updates are implemented in ESP32 firmware.

| ID | Procedure | Pass Criteria |
|---|---|---|
| T15 | Move joystick through center and small offsets. | Deadband prevents drift around center; no uncommanded creeping. |
| T16 | Full-range joystick forward/backward and left/right differential commands. | Motion intent from app matches on-robot behavior across full control range. |
| T17 | Press app STOP button during motion. | ESP32 sends STOP and robot halts immediately. |
| T18 | Press app Horn button repeatedly. | Each button press produces one horn action without lockup. |
| T19 | Observe V4-V9 widgets during movement and obstacle changes. | RPM and all four distances update correctly and remain mapped to the left/front/right/rear sensor order. |
| T20 | Verify upper-layer endpoint receives MPU telemetry while session is running. | `MPU:ax:ay:az:gx:gy:gz` frames arrive through ESP32 bridge and can be consumed by app/backend logic. |

## 6. Acceptance Criteria

Implementation is accepted only if:

- All mandatory tests T01 to T14 pass for firmware baseline acceptance.
- All tests T01 to T20 pass for full app-integrated acceptance.
- No test produces uncontrolled motion or requires power-cycle recovery.
- UART protocol behavior matches docs/spec-kit/03-uart-protocol-spec.md.
- Any protocol or pin changes are reflected across esp/esp.ino, mega/mega.ino, and docs.

## 7. Execution Log Template

Use this table for each validation run:

| Run Date | Firmware Revisions | Operator | Hardware Notes |
|---|---|---|---|
| YYYY-MM-DD | ESP32: <hash/tag>, Mega: <hash/tag> | <name> | <power, wiring, anomalies> |

| Test ID | Result (PASS/FAIL/BLOCKED) | Observations | Defect/Issue Link |
|---|---|---|---|
| T01 |  |  |  |
| T02 |  |  |  |
| T03 |  |  |  |
| T04 |  |  |  |
| T05 |  |  |  |
| T06 |  |  |  |
| T07 |  |  |  |
| T08 |  |  |  |
| T09 |  |  |  |
| T10 |  |  |  |
| T11 |  |  |  |
| T12 |  |  |  |
| T13 |  |  |  |
| T14 |  |  |  |
| T15 |  |  |  |
| T16 |  |  |  |
| T17 |  |  |  |
| T18 |  |  |  |
| T19 |  |  |  |

## 8. Regression Checklist After Protocol or Pin Changes

- Re-run T02 (handshake), T03 (STOP), and T12 (malformed frames).
- Re-run T05 to T08 for direction/sign convention confirmation.
- Re-run T09, T10, and T11B for telemetry ordering and correctness.
- If ESP32 parsing changes, re-run T11 and T19.
- Update docs/spec-kit/03-uart-protocol-spec.md and related spec-kit files in the same session.

## 9. Initial Implementation Status (May 2026)

- Available now: T01 to T14 are executable with current firmware baseline.
- Pending app integration: T15 to T19 require Blynk joystick/button/widget implementation on ESP32.