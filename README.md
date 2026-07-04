# ESP32 + Mega 4WD Robot

A 4-wheel-drive differential-steering robot using:

- ESP32 (DOIT DEVKIT V1) as the WiFi + app + UART master
- Arduino Mega 2560 as the low-level motor/sensor controller (motors, ultrasonics, encoders, MPU-6050)
- Blynk IoT v2 mobile app as the user interface

The ESP32 receives user commands from Blynk, translates control inputs, and sends UART commands to the Mega. The Mega executes movement, reads sensors/encoders, and sends feedback back to ESP32.

## Project Structure

- `esp/esp.ino` - ESP32 firmware (Blynk + UART master)
- `mega/mega.ino` - Mega firmware (motors, encoders, ultrasonics, buzzer, LED)
- `tst/motor_tst.ino` - isolated motor-driver test sketch for Mega
- `docs/` - design and specification documents
- `build/` - generated Arduino build artifacts

## System Architecture

### ESP32 Responsibilities

- Connect to WiFi and Blynk IoT v2
- Read joystick/buttons from virtual pins
- Map joystick X/Y to differential drive values
- Send newline-terminated UART ASCII commands to Mega
- Parse Mega feedback (`RDY`, `RPM`, `DIST`, `ERR`)
- Push RPM and distance data to Blynk display widgets

### Mega Responsibilities

- Initialize and control 2x L298N drivers for 4WD motors
- Handle encoder interrupts and compute RPM
- Read 4 ultrasonic sensors
- Read MPU-6050 IMU over I2C and apply vibration-aware filtering/thresholding
- Control buzzer and status LED
- Execute UART commands received from ESP32
- Send periodic feedback/status over UART

## Hardware Pin Map

### ESP32 (DOIT DEVKIT V1)

- UART2 RX (from Mega TX2): GPIO 16
- UART2 TX (to Mega RX2): GPIO 17

### Arduino Mega 2560

- UART2 TX (to ESP32 RX2): 16
- UART2 RX (from ESP32 TX2): 17

Ultrasonic sensors:
- Left TRIG/ECHO: 28 / 29
- Front TRIG/ECHO: 22 / 23
- Right TRIG/ECHO: 24 / 25
- Rear TRIG/ECHO: 26 / 27

Indicators:
- Buzzer: 30
- Status LED: 31

L298N #1 (left side motors):
- IN1/IN2/IN3/IN4: 32 / 33 / 34 / 35
- ENA/ENB (PWM): 5 / 6

L298N #2 (right side motors):
- IN1/IN2/IN3/IN4: 36 / 37 / 38 / 39
- ENA/ENB (PWM): 8 / 9

Encoders:
- Front-left A/B: 18 / 19
- Front-right A/B: 2 / 3

I2C / IMU:
- MPU-6050 SDA: 20
- MPU-6050 SCL: 21
- MPU-6050 I2C address: 0x68

## UART Protocol

Messages are ASCII and newline-terminated.

General form:
- `COMMAND:VALUE\n`

ESP32 -> Mega commands:
- `START\n`
- `FWD:speed\n` (0-255)
- `BCK:speed\n` (0-255)
- `LEFT:speed\n`
- `RIGHT:speed\n`
- `STOP\n`
- `HORN\n`
- `SPD:left:right\n` (signed -255..255)
- `MPU_ON\n` (enable periodic MPU telemetry)
- `MPU_OFF\n` (disable periodic MPU telemetry)
- `MPU_REQ\n` (request immediate MPU sample)
- `MPU_CFG:accelThr:gyroThr:alphaPct:reportMs\n`

Mega -> ESP32 feedback:
- `RDY\n`
- `RPM:left:right\n`
- `DIST:L:F:R:B\n` (cm)
- `MPU:ax:ay:az:gx:gy:gz\n` (raw signed IMU values after filtering/thresholding)
- `ERR:code\n`

MPU configuration semantics:
- `accelThr`: threshold for accel axis change suppression (recommended start: 1200)
- `gyroThr`: threshold for gyro axis change suppression (recommended start: 180)
- `alphaPct`: low-pass filter blend percent (5..95, recommended start: 25)
- `reportMs`: telemetry period in ms (50..1000, recommended start: 220)

The Mega applies a low-pass filter first and then uses threshold-based change suppression per axis to reduce vibration noise from bottom-mounted MPU placement.

Motor direction convention:
- positive speed means forward for all wheels

## Blynk Virtual Pin Map

- V0: Joystick X (App -> ESP32)
- V1: Joystick Y (App -> ESP32)
- V2: STOP button (App -> ESP32)
- V3: Horn button (App -> ESP32)
- V4: Left RPM display (ESP32 -> App)
- V5: Right RPM display (ESP32 -> App)
- V6: Left distance (ESP32 -> App)
- V7: Front distance (ESP32 -> App)
- V8: Right distance (ESP32 -> App)
- V9: Rear distance (ESP32 -> App)

## Firmware State Flow

ESP32:
- Power on -> Initialization -> Idle -> Running -> Idle

Mega:
- Power on -> Idle -> Initialization -> Running -> Idle

Handshake:
1. ESP32 sends `START`
2. Mega initializes subsystems
3. Mega replies `RDY`
4. ESP32 begins normal control loop

## Getting Started

## 1) Requirements

- Arduino IDE 2.x
- ESP32 board package installed in Arduino IDE
- Blynk IoT account + template/device setup
- USB cable(s) for programming both boards

## 2) Configure ESP32 firmware

Open `esp/esp.ino` and set your project-specific values, such as:
- Blynk template/device/auth values
- WiFi SSID/password
- Serial baud and any app mapping options

## 3) Upload Mega firmware

1. Open `mega/mega.ino`
2. Select board: Arduino Mega 2560
3. Select correct COM port
4. Upload

## 4) Upload ESP32 firmware

1. Open `esp/esp.ino`
2. Select board: DOIT ESP32 DEVKIT V1 (or equivalent)
3. Select correct COM port
4. Upload

## 5) Wire UART between boards

- ESP32 GPIO17 (TX2) -> Mega RX2 (17)
- ESP32 GPIO16 (RX2) <- Mega TX2 (16)
- Common GND between both boards

## 6) Validate startup

- Mega waits for `START`
- ESP32 sends `START` after app/system initialization
- Mega responds `RDY`
- Motion and telemetry begin in Running state

MPU validation quick check:
- Send `MPU_REQ` and verify one `MPU:...` line returns.
- Keep robot stationary and ensure readings are stable (small vibration should be suppressed).
- Tune thresholds with `MPU_CFG` if needed for your chassis vibration profile.

## Motor Test Sketch

Use `tst/motor_tst.ino` to test motors/L298N in isolation (without UART and ESP32).

Recommended order:
1. Validate each wheel direction and PWM response using `tst/motor_tst.ino`
2. Upload full `mega/mega.ino`
3. Bring up ESP32 + Blynk integration

## Development Rules

- Keep UART command changes synchronized in both `esp/esp.ino` and `mega/mega.ino`
- Update docs when protocol, pin assignments, or interfaces change
- Check pin conflicts before assigning new pins
- Keep movement convention consistent (positive = forward)

## Troubleshooting

- No movement:
  - verify L298N EN pins are on PWM-capable pins
  - verify motor power rail and common ground
  - verify `START`/`RDY` handshake on Serial monitor
- No telemetry in Blynk:
  - verify virtual pin mapping and auth/template values
  - confirm Mega is sending `RPM` and `DIST` messages
- Wrong turn direction:
  - check left/right motor polarity and command mapping

## License

No license file is currently defined in this repository.
