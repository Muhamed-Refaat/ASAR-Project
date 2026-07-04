// encoder_tst.ino — Standalone encoder / RPM test for Mega 2560.
// Purpose: verify that both encoder channels trigger their ISRs correctly and
//          that the computed RPM is plausible before integrating into mega.ino.
//          No motor commands are issued; rotate wheels by hand or under a
//          separate motor driver to confirm readings.
//
// Usage: open Serial Monitor at 115200.
//        Spin each wheel and observe the live tick count and RPM.
//
// Serial commands:
//   r  — reset all tick counters to zero
//   p  — print raw tick snapshot now (in addition to periodic reports)

// ── Pin definitions (matches mega.ino / copilot-instructions.md) ─────────────
constexpr uint8_t ENC_LEFT_A  = 18;
constexpr uint8_t ENC_LEFT_B  = 19;
constexpr uint8_t ENC_RIGHT_A = 2;
constexpr uint8_t ENC_RIGHT_B = 3;

// Number of encoder pulses per full wheel revolution.
// Adjust this constant to match your actual encoder disc.
constexpr float PULSES_PER_REV = 20.0f;

// How often RPM is computed and reported.
constexpr unsigned long RPM_INTERVAL_MS = 500;

// ── Volatile ISR state ────────────────────────────────────────────────────────

volatile long leftTicks  = 0;
volatile long rightTicks = 0;

// ── ISRs ─────────────────────────────────────────────────────────────────────
// Both ISRs use quadrature direction detection via the companion B channel.

void isrLeftA() {
    const bool a = digitalRead(ENC_LEFT_A);
    const bool b = digitalRead(ENC_LEFT_B);
    leftTicks += (a == b) ? 1 : -1;
}

void isrRightA() {
    const bool a = digitalRead(ENC_RIGHT_A);
    const bool b = digitalRead(ENC_RIGHT_B);
    rightTicks += (a == b) ? 1 : -1;
}

// ── State ─────────────────────────────────────────────────────────────────────

long prevLeftTicks  = 0;
long prevRightTicks = 0;
unsigned long lastRpmAt = 0;
String cmdBuf;

// ── Snapshot helper ───────────────────────────────────────────────────────────

void printRawTicks() {
    noInterrupts();
    const long lt = leftTicks;
    const long rt = rightTicks;
    interrupts();
    Serial.print("[ENC] Raw ticks — Left: ");
    Serial.print(lt);
    Serial.print("  Right: ");
    Serial.println(rt);
}

// ── RPM calculation and report ────────────────────────────────────────────────

void computeAndReportRpm() {
    const unsigned long now = millis();
    const unsigned long elapsed = now - lastRpmAt;
    if (elapsed < RPM_INTERVAL_MS) { return; }
    lastRpmAt = now;

    noInterrupts();
    const long curLeft  = leftTicks;
    const long curRight = rightTicks;
    interrupts();

    const long dLeft  = curLeft  - prevLeftTicks;
    const long dRight = curRight - prevRightTicks;
    prevLeftTicks  = curLeft;
    prevRightTicks = curRight;

    const float minutes = static_cast<float>(elapsed) / 60000.0f;
    const float rpmLeft  = (minutes > 0.0f) ? (dLeft  / PULSES_PER_REV) / minutes : 0.0f;
    const float rpmRight = (minutes > 0.0f) ? (dRight / PULSES_PER_REV) / minutes : 0.0f;

    Serial.print("[RPM] Left: ");
    Serial.print(rpmLeft,  1);
    Serial.print("  Right: ");
    Serial.print(rpmRight, 1);
    Serial.print("  | ticks delta  L:");
    Serial.print(dLeft);
    Serial.print("  R:");
    Serial.println(dRight);
}

// ── Command parser ────────────────────────────────────────────────────────────

void handleCommand(const String& cmd) {
    if (cmd == "r") {
        noInterrupts();
        leftTicks = 0; rightTicks = 0;
        interrupts();
        prevLeftTicks = 0; prevRightTicks = 0;
        Serial.println("[ENC] Tick counters reset.");
    } else if (cmd == "p") {
        printRawTicks();
    } else {
        Serial.print("[ENC] Unknown command: ");
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

    pinMode(ENC_LEFT_A,  INPUT_PULLUP);
    pinMode(ENC_LEFT_B,  INPUT_PULLUP);
    pinMode(ENC_RIGHT_A, INPUT_PULLUP);
    pinMode(ENC_RIGHT_B, INPUT_PULLUP);

    attachInterrupt(digitalPinToInterrupt(ENC_LEFT_A),  isrLeftA,  CHANGE);
    attachInterrupt(digitalPinToInterrupt(ENC_RIGHT_A), isrRightA, CHANGE);

    lastRpmAt = millis();

    Serial.println();
    Serial.println("=== Encoder / RPM Test ===");
    Serial.print("PULSES_PER_REV = ");
    Serial.println(PULSES_PER_REV);
    Serial.println("Commands: r=reset-ticks  p=print-raw-ticks");
    Serial.println("RPM reports every 500 ms. Spin wheels to observe.");
}

void loop() {
    readSerial();
    computeAndReportRpm();
}
