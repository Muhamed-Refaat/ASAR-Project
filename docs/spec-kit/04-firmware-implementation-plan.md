# Firmware Implementation Plan

## 1. Goal

Implement the full ESP32 and Mega firmware stack described by the system and protocol specifications.

## 2. Delivery Order

### Phase 1: Shared Foundations

1. Define protocol constants and message formats for both boards.
2. Define state enums and startup flow for both boards.
3. Add serial line buffering and newline-terminated parsing on both boards.

Deliverable:

- Both sketches can boot, exchange `START` and `RDY`, and log parseable UART traffic.

### Phase 2: Mega Motion Layer

1. Create pin definitions for all motors, sensors, buzzer, LED, and encoders.
2. Implement left-side and right-side motor helpers:
   - set direction
   - apply PWM
   - stop safely
3. Implement handlers for `FWD`, `BCK`, `LEFT`, `RIGHT`, `STOP`, `HORN`, and `SPD`.
4. Verify motor direction with the isolated test sketch before full integration.

Deliverable:

- The Mega can execute all motion and horn commands correctly from UART input.

### Phase 3: Mega Telemetry Layer

1. Add encoder interrupt service routines.
2. Add periodic RPM computation for left and right sides.
3. Add non-blocking ultrasonic polling across the four sensors.
4. Add MPU-6050 I2C readout with low-pass filtering and threshold-based vibration suppression.
5. Emit `RPM`, `DIST`, and `MPU` messages at stable intervals using the clockwise ultrasonic order (Left, Front, Right, Rear).
6. Emit `ERR` for parse and runtime faults that should be surfaced.

Deliverable:

- The Mega produces stable telemetry while still accepting commands responsively.

### Phase 4: ESP32 Control Layer

1. Configure WiFi and Blynk credentials.
2. Bind Blynk virtual pins for joystick and button input.
3. Implement joystick differential mixing with clamping and deadband.
4. Send motion frames over UART using the shared protocol.
5. Send `STOP` and `HORN` from button events.

Deliverable:

- The ESP32 can drive the Mega from the Blynk app.

### Phase 5: ESP32 Telemetry Layer

1. Parse `RDY`, `RPM`, `DIST`, and `ERR` messages.
2. Parse `MPU` frames and forward them to upper layers.
3. Update Blynk displays V4 through V9 from parsed telemetry.
4. Add minimal serial logging for bring-up and troubleshooting.

Deliverable:

- The mobile app displays live RPM and distance data from the Mega.

## 3. Suggested Firmware Structure

### 3.1 ESP32 File Structure

Suggested internal sections for `esp/esp.ino`:

1. Includes and configuration constants.
2. Blynk and WiFi credentials.
3. Protocol constants and state variables.
4. UART send and receive helpers.
5. Joystick mixing and command formatting helpers.
6. Blynk event handlers.
7. Feedback parsing and widget update functions.
8. `setup()` and `loop()`.

### 3.2 Mega File Structure

Suggested internal sections for `mega/mega.ino`:

1. Includes and pin definitions.
2. State variables and timing intervals.
3. Motor control helpers.
4. Encoder interrupt handlers and RPM calculation.
5. Ultrasonic trigger and sampling helpers.
6. MPU read/filter/threshold helpers.
7. UART receive buffer and command parser.
8. Telemetry transmit helpers.
9. `setup()` and `loop()`.

## 4. Design Constraints

- Avoid blocking delays in the main loop except where strictly required for short hardware timings.
- Keep all protocol strings identical across both boards.
- Keep safety behavior explicit: invalid commands should not result in undefined motion.
- Maintain the documented board responsibility split.

## 5. Definition of Done

- Both sketches compile for their target boards.
- `START` to `RDY` handshake works reliably after power-up.
- Blynk joystick input produces correct differential drive behavior.
- Stop and horn commands work from the app.
- RPM and distance telemetry are visible in the app.
- MPU telemetry is available to ESP32/app/relay layers and remains stable under expected chassis vibration.
- Docs remain aligned with the implemented protocol and pin usage.