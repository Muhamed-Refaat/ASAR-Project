// ultrasonic_tst.ino — Standalone 4-sensor ultrasonic test for Mega 2560.
// Purpose: verify that every ultrasonic sensor returns a valid distance reading
//          with no motor, encoder, or ESP32 dependency.
//
// Usage: open Serial Monitor at 115200.
//        Readings are printed every REPORT_INTERVAL_MS milliseconds.
//        Place an obstacle at a known distance from each sensor face
//        and confirm the reported value matches (±5 cm is acceptable).
//
// Serial commands:
//   1  — report Left  sensor only
//   2  — report Front sensor only
//   3  — report Right sensor only
//   4  — report Rear  sensor only
//   a  — report all sensors (default)

// ── Pin definitions (matches mega.ino / copilot-instructions.md) ─────────────
constexpr uint8_t TRIG_PINS[4] = {28, 22, 24, 26};  // L F R B
constexpr uint8_t ECHO_PINS[4] = {29, 23, 25, 27};

constexpr uint16_t PULSE_TIMEOUT_US   = 25000; // ≈4.3 m max range cutoff
constexpr unsigned long REPORT_INTERVAL_MS = 400;

static const char* SENSOR_LABELS[4] = {"Left ", "Front", "Right", "Rear "};

// ── Distance measurement ──────────────────────────────────────────────────────

uint16_t measureCm(uint8_t idx) {
    const uint8_t trig = TRIG_PINS[idx];
    const uint8_t echo = ECHO_PINS[idx];

    digitalWrite(trig, LOW);
    delayMicroseconds(2);
    digitalWrite(trig, HIGH);
    delayMicroseconds(10);
    digitalWrite(trig, LOW);

    const unsigned long duration = pulseIn(echo, HIGH, PULSE_TIMEOUT_US);
    if (duration == 0) {
        return 0; // timeout / no echo
    }
    return static_cast<uint16_t>(duration / 58UL);
}

// ── State ─────────────────────────────────────────────────────────────────────

uint8_t activeFilter = 0xFF; // 0xFF = all, 0-3 = single sensor index
unsigned long lastReportAt = 0;
String cmdBuf;

// ── Output helpers ────────────────────────────────────────────────────────────

void printSensor(uint8_t idx) {
    const uint16_t cm = measureCm(idx);
    Serial.print("[US] ");
    Serial.print(SENSOR_LABELS[idx]);
    Serial.print(": ");
    if (cm == 0) {
        Serial.println("NO ECHO (> range or wiring fault)");
    } else {
        Serial.print(cm);
        Serial.println(" cm");
    }
}

void printAll() {
    Serial.println("──────────────────────");
    for (uint8_t i = 0; i < 4; ++i) {
        printSensor(i);
    }
}

// ── Command parser ────────────────────────────────────────────────────────────

void handleCommand(const String& cmd) {
    if (cmd == "1") {
        activeFilter = 0; Serial.println("[US] Showing Left only");
    } else if (cmd == "2") {
        activeFilter = 1; Serial.println("[US] Showing Front only");
    } else if (cmd == "3") {
        activeFilter = 2; Serial.println("[US] Showing Right only");
    } else if (cmd == "4") {
        activeFilter = 3; Serial.println("[US] Showing Rear only");
    } else if (cmd == "a") {
        activeFilter = 0xFF; Serial.println("[US] Showing all sensors");
    } else {
        Serial.print("[US] Unknown command: ");
        Serial.println(cmd);
    }
}

void readSerial() {
    while (Serial.available() > 0) {
        const char c = static_cast<char>(Serial.read());
        if (c == '\r') { continue; }
        if (c == '\n') {
            if (cmdBuf.length() > 0) {
                handleCommand(cmdBuf);
                cmdBuf = "";
            }
            return;
        }
        if (cmdBuf.length() < 8) { cmdBuf += c; }
    }
}

// ── Arduino entry points ──────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);

    for (uint8_t i = 0; i < 4; ++i) {
        pinMode(TRIG_PINS[i], OUTPUT);
        pinMode(ECHO_PINS[i], INPUT);
        digitalWrite(TRIG_PINS[i], LOW);
    }

    Serial.println();
    Serial.println("=== Ultrasonic Sensor Test ===");
    Serial.println("Commands: a=all  1=Left  2=Front  3=Right  4=Rear");
    Serial.println("Readings print every 400 ms.");
    lastReportAt = millis();
}

void loop() {
    readSerial();

    const unsigned long now = millis();
    if (now - lastReportAt >= REPORT_INTERVAL_MS) {
        lastReportAt = now;
        if (activeFilter == 0xFF) {
            printAll();
        } else {
            printSensor(activeFilter);
        }
    }
}
