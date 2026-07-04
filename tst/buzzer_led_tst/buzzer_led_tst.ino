// buzzer_led_tst.ino — Standalone buzzer and status LED test for Mega 2560.
// Purpose: verify wiring and active-high drive of the buzzer (pin 30) and
//          the status LED (pin 31) with no motor or UART dependency.
//
// Usage: open Serial Monitor at 115200.
//        The sketch runs a short boot sequence then waits for commands.
//
// Serial commands:
//   b      — single short beep
//   bl     — LED on
//   bl0    — LED off
//   blink  — blink LED 5 times
//   morse  — beep LED + buzzer in SOS pattern (--- ··· ---)
//   a      — auto-sequence: cycles through every pattern once

// ── Pin definitions (matches mega.ino / copilot-instructions.md) ─────────────
constexpr uint8_t BUZZER_PIN     = 30;
constexpr uint8_t STATUS_LED_PIN = 31;

// ── Primitive helpers ─────────────────────────────────────────────────────────

void beep(uint16_t ms) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(ms);
    digitalWrite(BUZZER_PIN, LOW);
}

void ledOn()  { digitalWrite(STATUS_LED_PIN, HIGH); }
void ledOff() { digitalWrite(STATUS_LED_PIN, LOW);  }

void blinkLed(uint8_t times, uint16_t onMs = 150, uint16_t offMs = 150) {
    for (uint8_t i = 0; i < times; ++i) {
        ledOn();
        delay(onMs);
        ledOff();
        if (i < times - 1) { delay(offMs); }
    }
}

// SOS in Morse code: · · ·  — — —  · · ·
// dot = 80 ms, dash = 240 ms, between symbols = 80 ms, between letters = 240 ms
void sos() {
    Serial.println("[TEST] SOS pattern");
    // S: · · ·
    for (uint8_t i = 0; i < 3; ++i) {
        ledOn(); beep(80); ledOff(); delay(80);
    }
    delay(160);
    // O: — — —
    for (uint8_t i = 0; i < 3; ++i) {
        ledOn(); beep(240); ledOff(); delay(80);
    }
    delay(160);
    // S: · · ·
    for (uint8_t i = 0; i < 3; ++i) {
        ledOn(); beep(80); ledOff(); delay(80);
    }
}

// ── Auto-sequence ─────────────────────────────────────────────────────────────

void autoSequence() {
    Serial.println("[AUTO] Single beep");
    beep(120);
    delay(400);

    Serial.println("[AUTO] LED on 500 ms");
    ledOn();
    delay(500);
    ledOff();
    delay(200);

    Serial.println("[AUTO] Blink 5×");
    blinkLed(5);
    delay(300);

    Serial.println("[AUTO] Double beep");
    beep(80); delay(100); beep(80);
    delay(400);

    Serial.println("[AUTO] Long beep 600 ms");
    beep(600);
    delay(400);

    sos();
    delay(500);

    Serial.println("[AUTO] Done.");
}

// ── Command parser ────────────────────────────────────────────────────────────

String cmdBuf;

void handleCommand(const String& cmd) {
    if (cmd == "b") {
        beep(120);
        Serial.println("[TEST] Beep");
    } else if (cmd == "bl") {
        ledOn();
        Serial.println("[TEST] LED on");
    } else if (cmd == "bl0") {
        ledOff();
        Serial.println("[TEST] LED off");
    } else if (cmd == "blink") {
        blinkLed(5);
        Serial.println("[TEST] Blink x5 done");
    } else if (cmd == "morse") {
        sos();
    } else if (cmd == "a") {
        autoSequence();
    } else {
        Serial.print("[TEST] Unknown command: ");
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
        if (cmdBuf.length() < 16) { cmdBuf += c; }
    }
}

// ── Arduino entry points ──────────────────────────────────────────────────────

void setup() {
    Serial.begin(115200);

    pinMode(BUZZER_PIN,     OUTPUT);
    pinMode(STATUS_LED_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN,     LOW);
    digitalWrite(STATUS_LED_PIN, LOW);

    // Boot confirmation sequence: two short beeps + LED flash
    delay(200);
    beep(80); delay(100); beep(80);
    blinkLed(2, 200, 100);

    Serial.println();
    Serial.println("=== Buzzer + LED Test ===");
    Serial.println("Commands: a=auto  b=beep  bl=led-on  bl0=led-off");
    Serial.println("          blink=blink-5x  morse=SOS");
}

void loop() {
    readSerial();
}
