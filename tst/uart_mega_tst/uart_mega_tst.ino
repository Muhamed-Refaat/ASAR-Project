// uart_mega_tst.ino — Standalone UART loopback / echo test for Mega 2560.
// Purpose: verify that Serial2 (the ESP32 link) is wired correctly and that
//          bytes arrive and depart at the expected baud rate before running
//          the full firmware stack.
//
// This sketch runs in two modes selected by a compile-time flag:
//   ECHO_MODE  (default) — every byte received on Serial2 is echoed back
//                          on Serial2 and mirrored to USB Serial.
//   PING_MODE            — Mega transmits a periodic PING\n and waits for
//                          PONG\n from the remote device (useful when the
//                          ESP32 is running uart_esp_tst).
//
// Change the value below to switch modes.
#define ECHO_MODE  1
#define PING_MODE  2
#define UART_TEST_MODE  PING_MODE

// ── Configuration ─────────────────────────────────────────────────────────────
constexpr unsigned long UART_BAUD        = 115200;
constexpr size_t        LINE_BUF_MAX     = 128;
constexpr unsigned long PING_INTERVAL_MS = 1000; // PING_MODE only

// ── State ─────────────────────────────────────────────────────────────────────
String rxLine;
bool   rxOverflow       = false;
unsigned long pingsSent = 0;
unsigned long pongsReceived = 0;
unsigned long lastPingAt    = 0;
unsigned long rxByteCount   = 0;
unsigned long txByteCount   = 0;

// ── Echo helpers ──────────────────────────────────────────────────────────────

void echoLine(const String& line) {
    // Mirror to USB Serial for inspection
    Serial.print("[ECHO RX] ");
    Serial.println(line);

    // Echo back over Serial2
    Serial2.println(line);
    txByteCount += line.length() + 2; // +2 for \r\n from println
}

// ── Ping-Pong helpers ─────────────────────────────────────────────────────────

void sendPing() {
    Serial2.println("PING");
    txByteCount += 6;
    pingsSent++;
    Serial.print("[PING] Sent #");
    Serial.println(pingsSent);
}

void handlePongLine(const String& line) {
    if (line == "PONG") {
        pongsReceived++;
        Serial.print("[PONG] Received #");
        Serial.print(pongsReceived);
        Serial.print("  /  Sent: ");
        Serial.println(pingsSent);
    } else {
        Serial.print("[PING] Unexpected response: ");
        Serial.println(line);
    }
}

// ── UART2 line reader ─────────────────────────────────────────────────────────

void readSerial2() {
    while (Serial2.available() > 0) {
        const char c = static_cast<char>(Serial2.read());
        rxByteCount++;

        if (c == '\r') { continue; }

        if (c == '\n') {
            if (rxOverflow) {
                Serial.println("[ERR] RX line too long — discarded");
                rxOverflow = false;
                rxLine = "";
                continue;
            }
            if (rxLine.length() > 0) {
#if UART_TEST_MODE == ECHO_MODE
                echoLine(rxLine);
#else
                handlePongLine(rxLine);
#endif
                rxLine = "";
            }
            continue;
        }

        if (rxOverflow) { continue; }

        if (rxLine.length() < LINE_BUF_MAX) {
            rxLine += c;
        } else {
            rxOverflow = true;
        }
    }
}

// ── USB Serial → Serial2 bridge (for manual command injection) ───────────────

String usbBuf;

void bridgeUsbToSerial2() {
    while (Serial.available() > 0) {
        const char c = static_cast<char>(Serial.read());
        if (c == '\r') { continue; }
        if (c == '\n') {
            if (usbBuf.length() > 0) {
                Serial2.println(usbBuf);
                txByteCount += usbBuf.length() + 2;
                Serial.print("[TX via USB] ");
                Serial.println(usbBuf);
                usbBuf = "";
            }
            return;
        }
        if (usbBuf.length() < LINE_BUF_MAX) { usbBuf += c; }
    }
}

// ── Stats report ──────────────────────────────────────────────────────────────

void printStats() {
    Serial.print("[STATS] RX bytes: ");
    Serial.print(rxByteCount);
    Serial.print("  TX bytes: ");
    Serial.println(txByteCount);
#if UART_TEST_MODE == PING_MODE
    Serial.print("[STATS] Pings sent: ");
    Serial.print(pingsSent);
    Serial.print("  Pongs received: ");
    Serial.println(pongsReceived);
#endif
}

// ── Arduino entry points ──────────────────────────────────────────────────────

void setup() {
    Serial.begin(UART_BAUD);
    Serial2.begin(UART_BAUD);
    delay(200);

    Serial.println();
    Serial.println("=== UART Mega Test ===");
#if UART_TEST_MODE == ECHO_MODE
    Serial.println("Mode: ECHO — every line received on Serial2 is echoed back.");
    Serial.println("Tip: type into this monitor to inject lines into Serial2.");
#else
    Serial.println("Mode: PING — sending PING every 1 s, expecting PONG from remote.");
#endif
    Serial.print("Baud: ");
    Serial.println(UART_BAUD);
}

void loop() {
    readSerial2();
    bridgeUsbToSerial2();

#if UART_TEST_MODE == PING_MODE
    const unsigned long now = millis();
    if (now - lastPingAt >= PING_INTERVAL_MS) {
        lastPingAt = now;
        sendPing();
    }
#endif
}
