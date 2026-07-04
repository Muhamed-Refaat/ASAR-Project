// uart_esp_tst.ino — Standalone UART test for ESP32 DOIT DEVKIT V1.
// Purpose: verify that Serial2 on the ESP32 (GPIO16 RX2, GPIO17 TX2) can
//          send and receive data over the physical link to the Mega before
//          the full firmware stack is deployed.
//
// Works as a pair with uart_mega_tst (PING_MODE on Mega), or standalone by
// echoing everything it sends back when the UART wires are looped back.
//
// Two modes — select with the flag below:
//   PING_MODE  (default) — ESP32 sends PING\n, expects PONG\n back.
//                          Pair with uart_mega_tst in PING_MODE on Mega.
//   ECHO_MODE            — Every line received on Serial2 is echoed back,
//                          same as the Mega test.  Useful for wire loopback.
#define PING_MODE  1
#define ECHO_MODE  2
#define UART_TEST_MODE  ECHO_MODE

// ── Pin / baud configuration ──────────────────────────────────────────────────
constexpr int  RX2_PIN            = 16;
constexpr int  TX2_PIN            = 17;
constexpr unsigned long UART_BAUD = 115200;
constexpr size_t LINE_BUF_MAX     = 128;
constexpr unsigned long PING_INTERVAL_MS = 1000;

// ── State ─────────────────────────────────────────────────────────────────────
String rxLine;
bool   rxOverflow        = false;
unsigned long pingsSent  = 0;
unsigned long pongsRx    = 0;
unsigned long lastPingAt = 0;
unsigned long rxBytes    = 0;
unsigned long txBytes    = 0;

// ── Echo / Ping-Pong helpers ──────────────────────────────────────────────────

void echoLine(const String& line) {
    Serial.print("[ECHO RX] "); Serial.println(line);
    Serial2.println(line);
    txBytes += line.length() + 2;
}

void sendPing() {
    Serial2.println("PING");
    txBytes += 6;
    pingsSent++;
    Serial.print("[PING] Sent #"); Serial.println(pingsSent);
}

void handleIncomingLine(const String& line) {
#if UART_TEST_MODE == ECHO_MODE
    echoLine(line);
#else
    if (line == "PONG") {
        pongsRx++;
        const unsigned long loss = pingsSent - pongsRx;
        Serial.print("[PONG] #"); Serial.print(pongsRx);
        Serial.print("  loss="); Serial.println(loss);
    } else if (line == "PING") {
        // Remote is also in PING mode — respond with PONG
        Serial2.println("PONG");
        txBytes += 6;
        Serial.print("[RX] PING from remote — replied PONG");
    } else {
        Serial.print("[RX] "); Serial.println(line);
    }
#endif
}

// ── UART2 reader ──────────────────────────────────────────────────────────────

void readSerial2() {
    while (Serial2.available() > 0) {
        const char c = static_cast<char>(Serial2.read());
        rxBytes++;
        if (c == '\r') { continue; }
        if (c == '\n') {
            if (rxOverflow) {
                Serial.println("[ERR] RX line overflow — discarded");
                rxOverflow = false;
                rxLine = "";
                continue;
            }
            if (rxLine.length() > 0) {
                handleIncomingLine(rxLine);
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

// ── USB Serial → Serial2 bridge ───────────────────────────────────────────────

String usbBuf;

void bridgeUsbToSerial2() {
    while (Serial.available() > 0) {
        const char c = static_cast<char>(Serial.read());
        if (c == '\r') { continue; }
        if (c == '\n') {
            if (usbBuf.length() > 0) {
                Serial2.println(usbBuf);
                txBytes += usbBuf.length() + 2;
                Serial.print("[TX] "); Serial.println(usbBuf);
                usbBuf = "";
            }
            return;
        }
        if (usbBuf.length() < LINE_BUF_MAX) { usbBuf += c; }
    }
}

// ── Arduino entry points ──────────────────────────────────────────────────────

void setup() {
    Serial.begin(UART_BAUD);
    Serial2.begin(UART_BAUD, SERIAL_8N1, RX2_PIN, TX2_PIN);
    delay(300);

    Serial.println();
    Serial.println("=== UART ESP32 Test ===");
    Serial.print("Serial2: RX=GPIO"); Serial.print(RX2_PIN);
    Serial.print("  TX=GPIO"); Serial.println(TX2_PIN);
    Serial.print("Baud: "); Serial.println(UART_BAUD);

#if UART_TEST_MODE == PING_MODE
    Serial.println("Mode: PING — sending PING every 1 s, expecting PONG from Mega.");
    Serial.println("Flash uart_mega_tst on the Mega in ECHO_MODE or PING_MODE.");
#else
    Serial.println("Mode: ECHO — echoing all lines received on Serial2.");
    Serial.println("Loop TX back to RX or pair with a sender on the Mega.");
#endif
    Serial.println("Type into this monitor to inject lines into Serial2.");
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
