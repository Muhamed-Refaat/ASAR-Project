// motor_only_tst.ino
// Mega-only motor validation sketch (no UART, no ESP, no sensors).
// Use Serial Monitor at 115200 and send a command key + Enter:
// f = forward, b = backward, l = left arc, r = right arc
// e = north-east arc, q = north-west arc, c = south-east arc, z = south-west arc
// o = rotate in place, s = stop
// 0..9 = set base speed (0=>0, 9=>225)

constexpr uint8_t L_IN1 = 32;
constexpr uint8_t L_IN2 = 33;
constexpr uint8_t L_IN3 = 34;
constexpr uint8_t L_IN4 = 35;
constexpr uint8_t L_ENA = 5;
constexpr uint8_t L_ENB = 6;

constexpr uint8_t R_IN1 = 36;
constexpr uint8_t R_IN2 = 37;
constexpr uint8_t R_IN3 = 38;
constexpr uint8_t R_IN4 = 39;
constexpr uint8_t R_ENA = 8;
constexpr uint8_t R_ENB = 9;

static int baseSpeed = 150;

void setMotorSide(int16_t speed, bool left) {
  const uint8_t in1 = left ? L_IN1 : R_IN1;
  const uint8_t in2 = left ? L_IN2 : R_IN2;
  const uint8_t in3 = left ? L_IN3 : R_IN3;
  const uint8_t in4 = left ? L_IN4 : R_IN4;
  const uint8_t ena = left ? L_ENA : R_ENA;
  const uint8_t enb = left ? L_ENB : R_ENB;

  const int16_t clipped = constrain(speed, -255, 255);
  const uint8_t pwm = static_cast<uint8_t>(abs(clipped));
  const bool forward = (clipped >= 0);

  digitalWrite(in1, forward ? HIGH : LOW);
  digitalWrite(in2, forward ? LOW : HIGH);
  digitalWrite(in3, forward ? HIGH : LOW);
  digitalWrite(in4, forward ? LOW : HIGH);
  analogWrite(ena, pwm);
  analogWrite(enb, pwm);
}

void setDrive(int16_t leftSpeed, int16_t rightSpeed) {
  setMotorSide(leftSpeed, true);
  setMotorSide(rightSpeed, false);
}

void stopDrive() {
  setDrive(0, 0);
}

void printHelp() {
  Serial.println("\n=== Motor Only Test ===");
  Serial.println("f b l r e q c z o s");
  Serial.println("0..9 set speed");
  Serial.print("Base speed: ");
  Serial.println(baseSpeed);
}

void setupPins() {
  pinMode(L_IN1, OUTPUT);
  pinMode(L_IN2, OUTPUT);
  pinMode(L_IN3, OUTPUT);
  pinMode(L_IN4, OUTPUT);
  pinMode(R_IN1, OUTPUT);
  pinMode(R_IN2, OUTPUT);
  pinMode(R_IN3, OUTPUT);
  pinMode(R_IN4, OUTPUT);
  pinMode(L_ENA, OUTPUT);
  pinMode(L_ENB, OUTPUT);
  pinMode(R_ENA, OUTPUT);
  pinMode(R_ENB, OUTPUT);
  stopDrive();
}

void setup() {
  Serial.begin(115200);
  setupPins();
  delay(120);
  printHelp();
}

void loop() {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r' || c == '\n' || c == ' ') {
      continue;
    }

    if (c >= '0' && c <= '9') {
      baseSpeed = (c - '0') * 25;
      Serial.print("Speed set to ");
      Serial.println(baseSpeed);
      continue;
    }

    switch (c) {
      case 'f': setDrive(baseSpeed, baseSpeed); break;
      case 'b': setDrive(-baseSpeed, -baseSpeed); break;
      case 'l': setDrive(baseSpeed / 2, baseSpeed); break;
      case 'r': setDrive(baseSpeed, baseSpeed / 2); break;
      case 'e': setDrive(baseSpeed, (baseSpeed * 2) / 3); break;
      case 'q': setDrive((baseSpeed * 2) / 3, baseSpeed); break;
      case 'c': setDrive(-baseSpeed, -(baseSpeed * 2) / 3); break;
      case 'z': setDrive(-(baseSpeed * 2) / 3, -baseSpeed); break;
      case 'o': setDrive(baseSpeed, -baseSpeed); break;
      case 's': stopDrive(); break;
      case 'h': printHelp(); break;
      default:
        Serial.print("Unknown key: ");
        Serial.println(c);
        Serial.println("Press h for help.");
        break;
    }
  }
}
