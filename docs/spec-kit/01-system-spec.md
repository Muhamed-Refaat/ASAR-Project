# System Specification

## 1. Objective

Build a four-wheel-drive differential-steering robot using an ESP32 and Arduino Mega 2560 with the following split of responsibilities:

- ESP32: WiFi, Blynk IoT v2, user input handling, UART master, and telemetry presentation.
- Mega 2560: motor control, encoder processing, ultrasonic sensing, buzzer, status LED, and command execution.

The system shall allow a user to drive the robot from the Blynk app and view live feedback for wheel RPM and obstacle distances.
The system shall also expose filtered MPU-6050 IMU telemetry for higher-layer control logic on ESP32/app layers.

## 2. System Context

Inputs:

- Blynk joystick X and Y values.
- Blynk stop and horn button events.
- Encoder pulse streams from left and right driven wheels.
- Four ultrasonic distance readings.
- MPU-6050 accelerometer and gyroscope raw samples.
- UART messages exchanged between both boards.

Outputs:

- Left and right motor PWM and direction signals.
- Buzzer activation.
- Status LED indication.
- Blynk display updates for RPM and distances.
- UART acknowledgements and telemetry frames.

## 3. Functional Requirements

### 3.1 ESP32 Requirements

- The ESP32 shall initialize WiFi and Blynk before entering its run-ready state.
- The ESP32 shall act as the UART master and issue `START` to the Mega before normal control traffic.
- The ESP32 shall parse Blynk joystick inputs into differential left and right speed commands.
- The ESP32 shall clamp commanded wheel speeds to the signed range `-255..255`.
- The ESP32 shall send UART commands terminated by `\n` only.
- The ESP32 shall parse `RDY`, `RPM`, `DIST`, and `ERR` messages from the Mega.
- The ESP32 shall parse and forward `MPU:ax:ay:az:gx:gy:gz` telemetry from the Mega.
- The ESP32 shall publish valid telemetry to Blynk virtual pins V4 through V9.
- The ESP32 shall send `STOP` when the user presses the stop button.
- The ESP32 shall send `HORN` when the horn button is pressed.

### 3.2 Mega Requirements

- The Mega shall remain idle until it receives `START` over UART2.
- The Mega shall initialize all controlled peripherals before replying with `RDY`.
- The Mega shall accept discrete movement commands and raw differential speed commands.
- The Mega shall convert signed speed commands into motor direction and PWM output for the left and right sides.
- The Mega shall stop all motors immediately when `STOP` is received.
- The Mega shall drive the buzzer when `HORN` is received.
- The Mega shall measure left, front, right, and rear ultrasonic distances and report them in a rotating non-blocking loop.
- The Mega shall read MPU-6050 over I2C and emit filtered telemetry with vibration-aware thresholding.
- The Mega shall activate a warning pattern on the buzzer and status LED when any ultrasonic reading is below a configurable close-distance threshold.
- The Mega shall compute left and right RPM values from encoder pulses and report them periodically.
- The Mega shall accept MPU control/configuration commands (`MPU_ON`, `MPU_OFF`, `MPU_REQ`, `MPU_CFG`).
- The Mega shall emit `ERR` frames when it detects malformed commands or internal failures that can be surfaced upstream.

## 4. Motion Behavior

### 4.1 Differential Drive Mapping

- Positive signed speed means forward wheel motion.
- Negative signed speed means reverse wheel motion.
- Equal left and right speeds produce straight-line motion.
- A lower left-side speed than right-side speed produces a left turn.
- A lower right-side speed than left-side speed produces a right turn.
- Zero speed on both sides produces a full stop.

### 4.2 Input Translation Rules

- Blynk joystick Y shall represent forward and reverse intent.
- Blynk joystick X shall represent steering bias.
- The ESP32 shall combine X and Y into left and right values using a differential mix algorithm.
- The mix result shall be normalized so neither side exceeds the allowed PWM range.
- A small deadband should be applied around joystick center to prevent drift.

## 5. State Machines

### 5.1 ESP32 State Model

States:

1. `OFF`
2. `INITIALIZATION`
3. `IDLE`
4. `RUNNING`

Required behavior:

- On boot, the ESP32 enters `INITIALIZATION`.
- After WiFi, Blynk, and UART setup complete, the ESP32 enters `IDLE`.
- When the user starts the system or the control flow requires activation, the ESP32 sends `START` and waits for `RDY`.
- After `RDY`, the ESP32 enters `RUNNING` and begins continuous command and telemetry handling.
- On stop condition or recoverable communication issue, the ESP32 returns to `IDLE`.

### 5.2 Mega State Model

States:

1. `OFF`
2. `IDLE`
3. `INITIALIZATION`
4. `RUNNING`

Required behavior:

- On boot, the Mega enters `IDLE` and waits for `START`.
- Upon receiving `START`, the Mega enters `INITIALIZATION`, configures hardware, then transmits `RDY`.
- After sending `RDY`, the Mega enters `RUNNING`.
- On `STOP`, the Mega stops motion but remains ready for new commands unless an explicit higher-level idle flow is implemented.
- On fatal internal failure, the Mega shall stop motors and report an `ERR` frame.

## 6. Telemetry Requirements

- RPM telemetry shall include left and right side values.
- Distance telemetry shall include front, right, rear, and left distances in centimeters.
- MPU telemetry shall include six signed values in order `ax, ay, az, gx, gy, gz`.
- Telemetry frames shall be parseable without relying on timing assumptions.
- Invalid telemetry frames shall be ignored by the ESP32 without crashing or blocking the control loop.

## 6.1 Obstacle Warning Threshold

- A close-obstacle threshold shall be configurable in Mega firmware (default target: 25 cm).
- A distance reading of zero shall be treated as no-echo and shall not trigger warning by itself.
- If any valid sensor reading is less than or equal to the threshold, the Mega shall pulse the buzzer and blink the status LED as a warning.
- Warning behavior shall clear automatically when all valid distances are above threshold.

## 7. Non-Functional Requirements

- The control loop shall avoid long blocking delays during normal operation.
- UART parsing shall be resilient to partial lines and malformed payloads.
- The Mega shall favor safe-stop behavior when command parsing fails.
- Pin assignments shall remain consistent with the documented hardware map.
- The codebase shall keep protocol definitions synchronized across both firmware files.

## 8. Implementation Targets

- `esp/esp.ino` shall implement Blynk integration, joystick translation, UART transmit and receive handling, and telemetry publishing.
- `mega/mega.ino` shall implement command parsing, motor driver control, encoder handling, ultrasonic polling, buzzer and LED control, and telemetry transmission.
- `tst/motor_tst.ino` shall remain an isolated motor validation sketch and shall not be coupled to the UART protocol.