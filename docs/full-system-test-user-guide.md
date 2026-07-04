# Full System Test User Guide (ESP32 + Mega 4WD)

This guide validates the complete robot system after motor-only test has passed.

## 1. Goal

Verify all subsystems together:
- Session control (`START`/`RDY` behavior)
- Blynk button control to motion
- Safety requirement: no active sensing/warning before session start
- Ultrasonic telemetry
- Obstacle warning buzzer + LED in RUNNING only

## 2. Preconditions

- Motor-only test passed with `tst/motor_only_tst/motor_only_tst.ino`.
- Correct firmware uploaded:
  - `mega/mega.ino` on Mega 2560
  - `esp/esp.ino` on ESP32
- Power wiring is complete and stable.
- Common GND between ESP32, Mega, and motor driver power ground.
- UART wiring is correct:
  - ESP32 TX2 (GPIO17) -> Mega RX2 (17)
  - ESP32 RX2 (GPIO16) <- Mega TX2 (16)

## 3. Blynk Dashboard Setup Check

Command buttons expected:
- V0 forward
- V1 right strafe
- V2 north-east
- V3 south-east
- V4 rotate
- V5 backward
- V6 left strafe
- V7 north-west
- V8 south-west
- V9 stop (one-shot action)

Telemetry expected:
- V20 left RPM
- V21 right RPM
- V22 left distance
- V23 front distance
- V24 right distance
- V25 rear distance

## 4. Safe Bring-Up Procedure

1. Lift wheels off the floor for first motion test.
2. Power Mega and ESP32.
3. Open Serial Monitor for ESP32 (115200).
4. Confirm ESP32 reaches Blynk connection.
5. Do not press any Blynk button yet.

Expected result before start:
- Motors do not rotate.
- Buzzer is OFF.
- Status LED warning pattern is OFF.
- No RUNNING telemetry updates expected from Mega.

## 5. Session Start and Handshake Test

1. Press any drive button in Blynk (for example V0 forward).
2. Watch ESP serial logs.

Expected result:
- ESP sends `START` until Mega replies `RDY`.
- ESP state changes to RUNNING after `RDY`.
- Drive command frames (`SPD:...`) appear after RUNNING.

If `RDY` never appears:
- Re-check UART pins and common ground.
- Re-check both boards are flashed with the latest sketches.

## 6. Motion Command Test

Keep wheels lifted.

1. Press and hold each directional button one at a time.
2. Observe wheel behavior.

Expected mapping:
- V0: forward
- V5: backward
- V1 and V6: differential arc/strafe-style behavior
- V4: in-place rotate behavior
- V2/V3/V7/V8: diagonal arc behaviors

Stop test:
1. Press V9 stop once.
2. Wheels must stop immediately.

## 7. Ultrasonic and Warning Logic Test

After RUNNING is confirmed:

1. Place object near one sensor (closer than threshold, default 25 cm).
2. Observe behavior.

Expected:
- Buzzer pulses.
- Status LED blinks.
- Distances on V22-V25 update in order: Left, Front, Right, Rear.

Clear condition:
1. Move object away from threshold.
2. Buzzer and LED warning should stop.

Critical requirement check:
- Power-cycle and repeat with no session start.
- Ultrasonic warning must NOT activate in IDLE.

## 8. Floor Test (After Lifted Test Passes)

1. Place robot on floor in open area.
2. Run short forward and backward movements.
3. Test immediate stop with V9.
4. Test obstacle warning while moving slowly.

Pass criteria:
- No uncontrolled motion.
- Stop response is immediate.
- Warning only active in RUNNING and with close obstacle.

## 9. Failure Triage

If motors still do not move:
- Check if STOP button in app is latched incorrectly; it should act as one-shot.
- Confirm RUNNING was reached (`RDY` seen).
- Verify L298N enable pins (5,6,8,9) and motor supply voltage.
- Verify Mega receives `SPD:left:right` frames.

If warning appears before session start:
- Confirm latest `mega/mega.ino` is flashed.
- Confirm board reset after upload.

## 10. Recommended Test Log Template

Record each run with:
- Date/time
- Firmware versions used
- Handshake pass/fail
- Motion pass/fail per button
- Stop pass/fail
- Distances mapping pass/fail
- Warning gating pass/fail (IDLE vs RUNNING)
