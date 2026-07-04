# Hardware Interface Specification

## 1. Board Roles

### 1.1 ESP32 DOIT DEVKIT V1

Responsibilities:

- Connect to WiFi.
- Connect to Blynk IoT v2.
- Read user-facing control inputs.
- Transmit commands to the Mega over UART2.
- Receive and parse feedback from the Mega over UART2.

### 1.2 Arduino Mega 2560

Responsibilities:

- Generate all motor direction and PWM outputs.
- Read wheel encoder signals.
- Control the buzzer and status LED.
- Trigger and measure ultrasonic sensors.
- Read MPU-6050 IMU over I2C and report filtered telemetry.
- Execute UART commands from the ESP32.

## 2. Pin Assignments

### 2.1 ESP32 Pins

| Signal | Pin | Notes |
|---|---:|---|
| UART2 RX | GPIO 16 | Receives from Mega TX2 |
| UART2 TX | GPIO 17 | Sends to Mega RX2 |

### 2.2 Mega Pins

| Signal | Pin | Notes |
|---|---:|---|
| UART2 TX | 16 | Sends to ESP32 RX2 |
| UART2 RX | 17 | Receives from ESP32 TX2 |
| Left ultrasonic TRIG | 28 | Digital output |
| Left ultrasonic ECHO | 29 | Digital input |
| Front ultrasonic TRIG | 22 | Digital output |
| Front ultrasonic ECHO | 23 | Digital input |
| Right ultrasonic TRIG | 24 | Digital output |
| Right ultrasonic ECHO | 25 | Digital input |
| Rear ultrasonic TRIG | 26 | Digital output |
| Rear ultrasonic ECHO | 27 | Digital input |
| Buzzer | 30 | Digital output |
| Status LED | 31 | Digital output |
| Left driver IN1 | 32 | Direction control |
| Left driver IN2 | 33 | Direction control |
| Left driver IN3 | 34 | Direction control |
| Left driver IN4 | 35 | Direction control |
| Right driver IN1 | 36 | Direction control |
| Right driver IN2 | 37 | Direction control |
| Right driver IN3 | 38 | Direction control |
| Right driver IN4 | 39 | Direction control |
| Left driver ENA | 5 | PWM output |
| Left driver ENB | 6 | PWM output |
| Right driver ENA | 8 | PWM output |
| Right driver ENB | 9 | PWM output |
| Encoder left A | 18 | Interrupt-capable input |
| Encoder left B | 19 | Interrupt-capable input |
| Encoder right A | 2 | Interrupt-capable input |
| Encoder right B | 3 | Interrupt-capable input |
| I2C SDA (MPU-6050) | 20 | Hardware I2C SDA |
| I2C SCL (MPU-6050) | 21 | Hardware I2C SCL |

## 3. Wiring Constraints

- ESP32 TX2 shall connect to Mega RX2.
- ESP32 RX2 shall connect to Mega TX2.
- Both boards shall share a common ground.
- Motor power shall not be drawn from logic pins.
- Ultrasonic sensors shall be wired according to the documented orientation: left, front, right, rear.

## 4. Drive Train Model

- The robot is a four-wheel-drive platform.
- The left side is controlled by L298N #1.
- The right side is controlled by L298N #2.
- Steering is achieved by differential speed only.
- No mechanical steering linkage is assumed in firmware.

## 5. Electrical and Firmware Assumptions

- PWM outputs on the Mega shall use the documented enable pins only.
- Encoder inputs shall be attached using interrupts rather than polling-only logic.
- Ultrasonic reads should be scheduled to avoid long blocking intervals that disrupt control responsiveness.
- MPU reads should be scheduled in a non-blocking cadence and filtered to reduce motor-vibration artifacts.
- The buzzer and status LED shall default to an inactive state on startup.
- The buzzer and status LED shall be used for obstacle warning when any ultrasonic value is at or below the configured close-distance threshold.

## 6. Hardware Risks to Account For

- UART communication can fail if ground is not shared.
- Motor polarity can invert expected turn direction.
- Blocking ultrasonic measurement can degrade command responsiveness.
- Encoder noise can corrupt RPM estimates if counts are not debounced or handled consistently.

## 7. Required Verification

- Verify every pin assignment against the board wiring before upload.
- Verify left and right motor direction using `tst/motor_tst.ino` before integrating UART control.
- Verify each ultrasonic sensor reports on the expected side.
- Verify encoder counts increase consistently during forward wheel rotation.