# ASAR Project - Setup and Development Instructions

This document provides step-by-step instructions for configuring, flashing, compiling, running, and extending the ASAR Project.

---

## 1. Prerequisites

Before starting, ensure you have the following installed on your development machine:
1. **Arduino IDE 2.x** (or VS Code with Arduino extension / PlatformIO).
2. **Node.js (v18+)** and **npm** (for building and running the mobile app).
3. USB data cables for programming the ESP32 and Arduino Mega 2560.

---

## 2. Arduino Environment Setup

### Install Boards in Arduino IDE
1. Go to **File > Preferences**.
2. Add the Espressif ESP32 package URL to the *Additional Boards Manager URLs* field:
   `https://dl.espressif.com/dl/package_esp32_index.json`
3. Open **Tools > Board > Boards Manager...**, search for **esp32** by *Espressif Systems*, and click **Install**.

### Install Required Arduino Libraries
Open **Tools > Manage Libraries...** and install:
* **WebSockets** by *Markus Sattler* (used for the websocket communication on ESP32).

---

## 3. Uploading Firmware

### Step A: Arduino Mega Firmware (`mega`)
1. Connect the Arduino Mega 2560 to your PC using a USB cable.
2. Open the file [mega/mega.ino](file:///C:/Users/Mohamed%20Allam/Documents/Arduino/ASAR-Project/mega/mega.ino) in Arduino IDE.
3. Select the board: **Tools > Board > Arduino AVR Boards > Arduino Mega or Mega 2560**.
4. Select the matching COM port: **Tools > Port**.
5. Click **Upload** (arrow icon).

### Step B: ESP32 Firmware (`esp`)
1. Connect the ESP32 to your PC using a USB cable.
2. Open [esp/esp.ino](file:///C:/Users/Mohamed%20Allam/Documents/Arduino/ASAR-Project/esp/esp.ino) in Arduino IDE.
3. Update the WiFi configuration lines to match your local router's SSID and password:
   ```cpp
   static const char WIFI_SSID[] = "Refaat Allam";
   static const char WIFI_PASS[] = "Allam12345e";
   ```
4. Select the board: **Tools > Board > esp32 > DOIT ESP32 DEVKIT V1** (or similar ESP32 Dev Module).
5. Select the matching COM port: **Tools > Port**.
6. Click **Upload**. If upload fails or hangs, press and hold the **BOOT** button on the ESP32 while it says "Connecting..." until the upload starts.

---

## 4. Mobile Application Setup (`MobileAPP`)

The frontend application controls the robot and displays real-time telemetry.

### Step 1: Install Dependencies
Open a terminal in the [MobileAPP](file:///C:/Users/Mohamed%20Allam/Documents/Arduino/ASAR-Project/MobileAPP) folder and run:
```bash
npm install
```

### Step 2: Configure WebSocket Endpoint
1. Find the ESP32's IP address by opening the Arduino Serial Monitor (baud rate `115200`) while the ESP32 boots. It will print its IP (e.g., `192.168.1.15`).
2. Rename/configure your environment file or configure the application to connect to the WebSocket URL: `ws://<ESP32_IP>:81`.

### Step 3: Run Development Server
To launch the app in a local web browser, run:
```bash
npm run dev
```

### Step 4: Build for Android (Capacitor)
If you wish to run the app natively on an Android device:
```bash
# Build the web project
npm run build

# Synchronize assets and plugin binaries with the Android project
npx cap sync android

# Open in Android Studio to run on physical device or emulator
npx cap open android
```

---

## 5. Testing and Validation

1. **Hardware Verification**:
   * Use [tst/motor_tst.ino](file:///C:/Users/Mohamed%20Allam/Documents/Arduino/ASAR-Project/tst/motor_tst.ino) to verify motor wiring and polarities.
   * If a wheel runs in the wrong direction, reverse the polarity of its physical wiring on the L298N terminal.
2. **UART Loop Handshake**:
   * Power on both boards and wire `ESP32 GPIO 17 -> Mega RX2 (17)` and `ESP32 GPIO 16 -> Mega TX2 (16)` with a common Ground (`GND`).
   * Verify the serial output on ESP32 (baud rate `115200`). You should see it sending `START` and receiving `RDY`.
   * The status LED (`Pin 31` on Mega) will indicate the current operating state.

---

## 6. Developer Guidelines

* **Synchronization**: Any modifications to the communication commands or telemetry reports MUST be updated in both `esp.ino` and `mega.ino` to prevent parsing or framing errors.
* **Non-Blocking Logic**: Do NOT use `delay()` in either `esp.ino` or `mega.ino`. Instead, use `millis()` timing loops to schedule telemetry intervals, LED blinking, and serial communications.
* **Safety First**: Keep the `STOP` message handler unmodified to ensure the emergency stop remains functional.
