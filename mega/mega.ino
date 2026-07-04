// Mega 2560 hardware interface implementation for ESP32-controlled 4WD platform.
// ESP32 is now controlled by the custom MobileAPP over WebSocket.

#include <Wire.h>

// UART2 link to ESP32
constexpr unsigned long UART_BAUD = 9600;
constexpr unsigned long USB_DEBUG_BAUD = 115200;
constexpr size_t UART_LINE_MAX = 96;

constexpr const char* CMD_START = "START";
constexpr const char* CMD_FWD_PREFIX = "FWD:";
constexpr const char* CMD_BCK_PREFIX = "BCK:";
constexpr const char* CMD_LEFT_PREFIX = "LEFT:";
constexpr const char* CMD_RIGHT_PREFIX = "RIGHT:";
constexpr const char* CMD_STOP = "STOP";
constexpr const char* CMD_HORN = "HORN";
constexpr const char* CMD_SPD_PREFIX = "SPD:";
constexpr const char* CMD_WSPD_PREFIX = "WSPD:";  // Individual wheel: WSPD:FL:RL:FR:RR
constexpr const char* CMD_MAX_SPD_PREFIX = "MAX_SPD:";
constexpr const char* CMD_AUTO_ON = "AUTO_ON";
constexpr const char* CMD_AUTO_OFF = "AUTO_OFF";
constexpr const char* CMD_AUTO_CFG_PREFIX = "AUTO_CFG:";
constexpr const char* CMD_ALIGN = "ALIGN";
constexpr const char* CMD_GOAL_PREFIX = "GOAL:";
constexpr const char* CMD_MPU_ON = "MPU_ON";
constexpr const char* CMD_MPU_OFF = "MPU_OFF";
constexpr const char* CMD_MPU_REQ = "MPU_REQ";
constexpr const char* CMD_MPU_CFG_PREFIX = "MPU_CFG:";
constexpr const char* CMD_WARN_DIST_PREFIX = "WARN_DIST:";
constexpr const char* CMD_DIAG_START = "DIAG_START";

constexpr const char* MSG_RDY = "RDY";
constexpr const char* MSG_RPM_PREFIX = "RPM:";
constexpr const char* MSG_DIST_PREFIX = "DIST:";
constexpr const char* MSG_ERR_PREFIX = "ERR:";
constexpr const char* MSG_ACK_PREFIX = "ACK:";
constexpr const char* MSG_AUTO_STAT_PREFIX = "AUTO_STAT:";
constexpr const char* MSG_AUTO_EVT_PREFIX = "AUTO_EVT:";
constexpr const char* MSG_MPU_PREFIX = "MPU:";

enum class AutoPhase : uint8_t {
  OFF = 0,
  CRUISE,
  AVOID_REVERSE,
  AVOID_TURN,
  RECOVER,
};

struct AutoPilotConfig {
  int16_t cruiseSpeed;
  int16_t turnSpeed;
  int16_t minFrontCm;
  int16_t cautionFrontCm;
  int16_t reverseSpeed;
  uint16_t reverseMs;
  uint16_t turnMs;
  int16_t sideBias;
};

enum class MegaState : uint8_t {
  OFF = 0,
  IDLE,
  INITIALIZATION,
  RUNNING,
};

// Ultrasonic sensors (Left, Front, Right, Rear)
constexpr uint8_t TRIG_PINS[4] = {28, 22, 24, 26};
constexpr uint8_t ECHO_PINS[4] = {29, 23, 25, 27};

// Buzzer and status LED
constexpr uint8_t BUZZER_PIN = 30;
constexpr uint8_t STATUS_LED_PIN = 31;

// L298N #1 (left side)
constexpr uint8_t L_IN1 = 32;
constexpr uint8_t L_IN2 = 33;
constexpr uint8_t L_IN3 = 34;
constexpr uint8_t L_IN4 = 35;
constexpr uint8_t L_ENA = 5;
constexpr uint8_t L_ENB = 6;

// L298N #2 (right side)
constexpr uint8_t R_IN1 = 36;
constexpr uint8_t R_IN2 = 37;
constexpr uint8_t R_IN3 = 38;
constexpr uint8_t R_IN4 = 39;
constexpr uint8_t R_ENA = 8;
constexpr uint8_t R_ENB = 9;

// Encoder channels
constexpr uint8_t ENC_LEFT_A = 18;
constexpr uint8_t ENC_LEFT_B = 19;
constexpr uint8_t ENC_RIGHT_A = 2;
constexpr uint8_t ENC_RIGHT_B = 3;

constexpr uint16_t ULTRASONIC_TIMEOUT_US = 12000;
constexpr unsigned long ULTRASONIC_SAMPLE_INTERVAL_MS = 40;
constexpr unsigned long RPM_REPORT_INTERVAL_MS = 500;
constexpr unsigned long DIST_REPORT_INTERVAL_MS = 200;
uint16_t warningDistanceCm = 25;
constexpr unsigned long WARNING_BLINK_MS = 160;
constexpr float ENCODER_PULSES_PER_REV = 20.0f;
constexpr float WHEEL_DIAMETER_MM = 65.0f;
constexpr float WHEEL_BASE_MM = 150.0f;
constexpr float MM_PER_TICK = (WHEEL_DIAMETER_MM * 3.14159f) / ENCODER_PULSES_PER_REV;
constexpr float PI_F = 3.14159f;

// MPU-6050 on Mega I2C pins: SDA=20, SCL=21
constexpr uint8_t MPU_ADDR = 0x68;
constexpr uint8_t MPU_REG_PWR_MGMT_1 = 0x6B;
constexpr uint8_t MPU_REG_DATA_START = 0x3B;
constexpr uint16_t MPU_MIN_REPORT_INTERVAL_MS = 50;
constexpr uint16_t MPU_MAX_REPORT_INTERVAL_MS = 1000;

volatile long leftTicks = 0;
volatile long rightTicks = 0;

// Odometry
float posX = 0.0f;
float posY = 0.0f;
float posTheta = 0.0f; // Radians
long lastLeftOdoTicks = 0;
long lastRightOdoTicks = 0;

// Goal
bool hasGoal = false;
float targetX = 0.0f;
float targetY = 0.0f;
float goalToleranceMm = 150.0f;

// ... (rest of variables)

void updateOdometry() {
  noInterrupts();
  long currentLeft = leftTicks;
  long currentRight = rightTicks;
  interrupts();

  long dL = currentLeft - lastLeftOdoTicks;
  long dR = currentRight - lastRightOdoTicks;
  lastLeftOdoTicks = currentLeft;
  lastRightOdoTicks = currentRight;

  float distL = static_cast<float>(dL) * MM_PER_TICK;
  float distR = static_cast<float>(dR) * MM_PER_TICK;
  float distCenter = (distL + distR) / 2.0f;
  float dTheta = (distR - distL) / WHEEL_BASE_MM;

  posX += distCenter * cos(posTheta + dTheta / 2.0f);
  posY += distCenter * sin(posTheta + dTheta / 2.0f);
  posTheta += dTheta;

  // Wrap theta -PI to PI
  while (posTheta > 3.14159f) posTheta -= 6.28318f;
  while (posTheta < -3.14159f) posTheta += 6.28318f;
}

// ... in loop, call updateOdometry() frequently

void handleGoalCommand(const String& line) {
  // GOAL:dist_m:angle_deg
  int firstColon = line.indexOf(':', 5);
  if (firstColon > 0) {
    float distM = line.substring(5, firstColon).toFloat();
    float angleDeg = line.substring(firstColon + 1).toFloat();
    
    float angleRad = angleDeg * 0.0174533f; // to radians
    
    // Set target relative to CURRENT position
    targetX = posX + (distM * 1000.0f) * cos(angleRad);
    targetY = posY + (distM * 1000.0f) * sin(angleRad);
    hasGoal = true;
    enableAutopilot();
    sendAutoEvent("GOAL_SET");
  }
}

// Maximum speed cap (0-255). Applied in setDrive() to both sides.
uint8_t maxSpeed = 255;

long lastLeftTicks = 0;
long lastRightTicks = 0;
float lastLeftRpm = 0.0f;
float lastRightRpm = 0.0f;

uint16_t distancesCm[4] = {0, 0, 0, 0};

MegaState state = MegaState::OFF;
String rxLine;
bool rxOverflow = false;
String rxUsbLine;
bool rxUsbOverflow = false;
uint32_t rxFrameCount = 0;

unsigned long lastUltrasonicAt = 0;
unsigned long lastRpmAt = 0;
unsigned long lastDistReportAt = 0;
unsigned long lastMpuReportAt = 0;
uint8_t ultrasonicIndex = 0;
unsigned long lastWarningBlinkAt = 0;
bool warningBlinkState = false;
bool obstacleWarningActive = false;

bool mpuPresent = false;
bool mpuStreamingEnabled = true;
bool mpuFilterPrimed = false;
bool mpuPendingReport = false;

uint16_t mpuAccelThreshold = 1200;
uint16_t mpuGyroThreshold = 180;
uint8_t mpuFilterAlphaPct = 25;
uint16_t mpuReportIntervalMs = 220;

int16_t mpuRawAx = 0;
int16_t mpuRawAy = 0;
int16_t mpuRawAz = 0;
int16_t mpuRawGx = 0;
int16_t mpuRawGy = 0;
int16_t mpuRawGz = 0;

int16_t mpuStableAx = 0;
int16_t mpuStableAy = 0;
int16_t mpuStableAz = 0;
int16_t mpuStableGx = 0;
int16_t mpuStableGy = 0;
int16_t mpuStableGz = 0;

int32_t mpuFiltAxQ4 = 0;
int32_t mpuFiltAyQ4 = 0;
int32_t mpuFiltAzQ4 = 0;
int32_t mpuFiltGxQ4 = 0;
int32_t mpuFiltGyQ4 = 0;
int32_t mpuFiltGzQ4 = 0;

AutoPilotConfig autoCfg = {140, 165, 30, 48, 120, 360, 500, 0};
bool autopilotEnabled = false;
bool alignRoutineActive = false;
bool straightLockActive = false;
int16_t straightLockSpeed = 0;
float straightLockBias = 0.0f;
unsigned long lastStabilityAt = 0;
constexpr unsigned long STABILITY_LOOP_MS = 30; // Faster stability loop

AutoPhase autoPhase = AutoPhase::OFF;
int8_t autoTurnDir = 1;
int16_t autoCmdLeft = 0;
int16_t autoCmdRight = 0;
uint8_t autoRisk = 0;
unsigned long autoPhaseStartedAt = 0;
unsigned long lastAutoStatAt = 0;
constexpr unsigned long AUTO_STAT_INTERVAL_MS = 220;

// --- Maneuver & Control ---
constexpr unsigned long RAMP_INTERVAL_MS = 20;  // 50Hz ramping
constexpr int16_t MIN_PWM = 70;                 // Min speed to overcome static friction
constexpr float RAMP_STEP = 4.0f;               // Reduced for smoother transition

struct MotorState {
  int16_t target;
  float current;
};

MotorState leftMotor = {0, 0.0f};
MotorState rightMotor = {0, 0.0f};
unsigned long lastRampAt = 0;

struct PID {
  float Kp, Ki, Kd;
  float integral;
  float lastError;
};

PID headingPid = {1.2f, 0.01f, 0.4f, 0.0f, 0.0f}; // Drastically reduced gains
long lastStabLeftTicks = 0;
long lastStabRightTicks = 0;

// --- Jitter Diagnostics ---
constexpr unsigned long JITTER_SAMPLE_MS = 20;
unsigned long lastJitterSampleAt = 0;
long prevLeftTicks = 0;
long prevRightTicks = 0;
float maxJitterL = 0;
float maxJitterR = 0;
bool jitterDiagEnabled = false;

constexpr uint8_t DIST_BUF_SIZE = 5;
uint16_t distBuffers[4][DIST_BUF_SIZE];
uint8_t distBufIdx[4] = {0, 0, 0, 0};
uint16_t frontZeroCount = 0;

void setState(MegaState nextState) {
  state = nextState;
}

bool isRunning() {
  return state == MegaState::RUNNING;
}

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

void setMotorSide(int16_t speed, bool isLeftSide) {
  const uint8_t in1 = isLeftSide ? L_IN1 : R_IN1;
  const uint8_t in2 = isLeftSide ? L_IN2 : R_IN2;
  const uint8_t in3 = isLeftSide ? L_IN3 : R_IN3;
  const uint8_t in4 = isLeftSide ? L_IN4 : R_IN4;
  const uint8_t ena = isLeftSide ? L_ENA : R_ENA;
  const uint8_t enb = isLeftSide ? L_ENB : R_ENB;

  // Apply minimum PWM to overcome friction on ceramic body
  if (speed != 0 && abs(speed) < MIN_PWM) {
    speed = (speed > 0) ? MIN_PWM : -MIN_PWM;
  }

  const int16_t clipped = constrain(speed, -255, 255);
  const uint8_t pwm = static_cast<uint8_t>(abs(clipped));
  const bool forward = clipped >= 0;

  digitalWrite(in1, forward ? HIGH : LOW);
  digitalWrite(in2, forward ? LOW : HIGH);
  digitalWrite(in3, forward ? HIGH : LOW);
  digitalWrite(in4, forward ? LOW : HIGH);

  analogWrite(ena, pwm);
  analogWrite(enb, pwm);
}

void applyRamping() {
  const unsigned long now = millis();
  if (now - lastRampAt < RAMP_INTERVAL_MS) return;
  lastRampAt = now;

  auto updateMotor = [](MotorState& m) {
    if (m.target != 0 && m.current == 0) {
      // Jump to MIN_PWM to overcome initial static friction on ceramic body
      m.current = (m.target > 0) ? MIN_PWM : -MIN_PWM;
    }

    float diff = m.target - m.current;
    if (abs(diff) < RAMP_STEP) {
      m.current = m.target;
    } else {
      m.current += (diff > 0) ? RAMP_STEP : -RAMP_STEP;
    }
  };

  updateMotor(leftMotor);
  updateMotor(rightMotor);

  setMotorSide(static_cast<int16_t>(leftMotor.current), true);
  setMotorSide(static_cast<int16_t>(rightMotor.current), false);
}

void setDrive(int16_t leftSpeed, int16_t rightSpeed) {
  const int16_t cap = static_cast<int16_t>(maxSpeed);
  leftMotor.target = constrain(leftSpeed, -cap, cap);
  rightMotor.target = constrain(rightSpeed, -cap, cap);
  
  // Straight lock detection
  if (leftSpeed != 0 && leftSpeed == rightSpeed) {
    if (!straightLockActive) {
      straightLockActive = true;
      straightLockSpeed = leftSpeed;
      straightLockBias = 0.0f;
      headingPid.integral = 0;
      headingPid.lastError = 0;
    }
  } else if (abs(leftSpeed - rightSpeed) > 15) {
    straightLockActive = false;
  }
}

void stopDrive() {
  leftMotor.target = 0;
  rightMotor.target = 0;
  straightLockActive = false;
  hasGoal = false;
}

bool initMpu() {
  Wire.begin();

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(MPU_REG_PWR_MGMT_1);
  Wire.write(0);
  const uint8_t err = Wire.endTransmission(true);

  if (err != 0) {
    Serial.print("[MEGA][ERR] MPU_INIT_FAIL err=");
    Serial.println(err);
    return false;
  }

  delay(20);
  Serial.println("[MEGA][MPU] READY");
  return true;
}

bool readMpuRaw() {
  Wire.beginTransmission(MPU_ADDR);
  Wire.write(MPU_REG_DATA_START);
  if (Wire.endTransmission(false) != 0) {
    return false;
  }

  const uint8_t requested = Wire.requestFrom(MPU_ADDR, static_cast<uint8_t>(14), static_cast<uint8_t>(true));
  if (requested != 14 || Wire.available() != 14) {
    return false;
  }

  mpuRawAx = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  mpuRawAy = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  mpuRawAz = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  const int16_t tmp = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  (void)tmp;
  mpuRawGx = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  mpuRawGy = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  mpuRawGz = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  return true;
}

int16_t applyMpuAxisFilter(int16_t raw, int32_t& filtQ4, int16_t& stableValue, uint16_t threshold) {
  if (!mpuFilterPrimed) {
    filtQ4 = static_cast<int32_t>(raw) << 4;
    stableValue = raw;
    return raw;
  }

  const int32_t rawQ4 = static_cast<int32_t>(raw) << 4;
  const int32_t deltaQ4 = rawQ4 - filtQ4;
  filtQ4 += (deltaQ4 * static_cast<int32_t>(mpuFilterAlphaPct)) / 100;

  const int16_t filtered = static_cast<int16_t>(filtQ4 >> 4);
  if (abs(filtered - stableValue) <= static_cast<int>(threshold)) {
    return stableValue;
  }

  stableValue = filtered;
  return stableValue;
}

void reportMpuNow() {
  if (!mpuPresent) {
    Serial2.println("ERR:SENSOR_MPU");
    return;
  }

  if (!readMpuRaw()) {
    Serial2.println("ERR:MPU_READ");
    return;
  }

  const int16_t ax = applyMpuAxisFilter(mpuRawAx, mpuFiltAxQ4, mpuStableAx, mpuAccelThreshold);
  const int16_t ay = applyMpuAxisFilter(mpuRawAy, mpuFiltAyQ4, mpuStableAy, mpuAccelThreshold);
  const int16_t az = applyMpuAxisFilter(mpuRawAz, mpuFiltAzQ4, mpuStableAz, mpuAccelThreshold);
  const int16_t gx = applyMpuAxisFilter(mpuRawGx, mpuFiltGxQ4, mpuStableGx, mpuGyroThreshold);
  const int16_t gy = applyMpuAxisFilter(mpuRawGy, mpuFiltGyQ4, mpuStableGy, mpuGyroThreshold);
  const int16_t gz = applyMpuAxisFilter(mpuRawGz, mpuFiltGzQ4, mpuStableGz, mpuGyroThreshold);

  mpuFilterPrimed = true;

  Serial2.print(MSG_MPU_PREFIX);
  Serial2.print(ax);
  Serial2.print(':');
  Serial2.print(ay);
  Serial2.print(':');
  Serial2.print(az);
  Serial2.print(':');
  Serial2.print(gx);
  Serial2.print(':');
  Serial2.print(gy);
  Serial2.print(':');
  Serial2.println(gz);
}

void updateMpu() {
  if (!isRunning() || !mpuPresent) {
    return;
  }

  const unsigned long now = millis();
  // Always read raw for stability loop even if streaming is off
  if (now - lastStabilityAt < 10) { // Throttle raw reads
    // read raw MPU in updateStability instead to ensure freshest data for control
  }

  if (mpuStreamingEnabled && (mpuPendingReport || now - lastMpuReportAt >= mpuReportIntervalMs)) {
    lastMpuReportAt = now;
    mpuPendingReport = false;
    reportMpuNow();
  }
}

uint16_t sampleDistanceCm(uint8_t idx) {
  digitalWrite(TRIG_PINS[idx], LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PINS[idx], HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PINS[idx], LOW);

  const unsigned long duration = pulseIn(ECHO_PINS[idx], HIGH, ULTRASONIC_TIMEOUT_US);
  if (duration == 0) {
    return 0; // Handled as 250 in clamp
  }
  return static_cast<uint16_t>(duration / 58UL);
}

void updateUltrasonic() {
  const unsigned long now = millis();
  if (now - lastUltrasonicAt < ULTRASONIC_SAMPLE_INTERVAL_MS) {
    return;
  }
  lastUltrasonicAt = now;

  uint16_t raw = sampleDistanceCm(ultrasonicIndex);
  
  if (ultrasonicIndex == 1) { // Front sensor
    if (raw == 0) {
      frontZeroCount++;
      if (frontZeroCount > 50) { // ~2 seconds of blindness
        Serial2.println("ERR:SENSOR_FRONT_BLIND");
      }
    } else {
      frontZeroCount = 0;
    }
  }

  if (raw == 0 || raw > 250) raw = 250;
  
  // Median filter over last 5 samples
  distBuffers[ultrasonicIndex][distBufIdx[ultrasonicIndex]] = raw;
  distBufIdx[ultrasonicIndex] = (distBufIdx[ultrasonicIndex] + 1) % DIST_BUF_SIZE;
  
  uint16_t temp[DIST_BUF_SIZE];
  for(int i=0; i<DIST_BUF_SIZE; i++) temp[i] = distBuffers[ultrasonicIndex][i];
  
  for(int i=0; i<DIST_BUF_SIZE-1; i++) {
    for(int j=i+1; j<DIST_BUF_SIZE; j++) {
      if(temp[i] > temp[j]) { uint16_t t = temp[i]; temp[i] = temp[j]; temp[j] = t; }
    }
  }
  
  uint16_t median = temp[DIST_BUF_SIZE/2];
  distancesCm[ultrasonicIndex] = (median >= 250) ? 0 : median;
  
  ultrasonicIndex = static_cast<uint8_t>((ultrasonicIndex + 1) % 4);
}

void updateJitter() {
  if (!isRunning() || !jitterDiagEnabled) return;
  
  const unsigned long now = millis();
  if (now - lastJitterSampleAt < JITTER_SAMPLE_MS) return;
  lastJitterSampleAt = now;

  noInterrupts();
  long curL = leftTicks;
  long curR = rightTicks;
  interrupts();

  long dL = curL - prevLeftTicks;
  long dR = curR - prevRightTicks;
  
  // Detect rapid changes in delta (acceleration jitter)
  static long lastDL = 0;
  static long lastDR = 0;
  
  float jitterL = abs(dL - lastDL);
  float jitterR = abs(dR - lastDR);
  
  if (jitterL > maxJitterL) maxJitterL = jitterL;
  if (jitterR > maxJitterR) maxJitterR = jitterR;
  
  lastDL = dL;
  lastDR = dR;
  prevLeftTicks = curL;
  prevRightTicks = curR;

  // Report high jitter events immediately
  if (jitterL > 8.0f || jitterR > 8.0f) {
    Serial2.print("ERR:JITTER_DETECT:");
    Serial2.print(jitterL);
    Serial2.print(":");
    Serial2.println(jitterR);
  }
}

void updateRpm() {
  if (!isRunning()) {
    return;
  }

  const unsigned long now = millis();
  const unsigned long elapsedMs = now - lastRpmAt;
  if (elapsedMs < RPM_REPORT_INTERVAL_MS) {
    return;
  }
  lastRpmAt = now;

  noInterrupts();
  const long currentLeftTicks = leftTicks;
  const long currentRightTicks = rightTicks;
  interrupts();

  const long dLeft = currentLeftTicks - lastLeftTicks;
  const long dRight = currentRightTicks - lastRightTicks;
  lastLeftTicks = currentLeftTicks;
  lastRightTicks = currentRightTicks;

  const float minutes = static_cast<float>(elapsedMs) / 60000.0f;
  if (minutes > 0.0f) {
    lastLeftRpm = (dLeft / ENCODER_PULSES_PER_REV) / minutes;
    lastRightRpm = (dRight / ENCODER_PULSES_PER_REV) / minutes;
  }

  // Spec §4 — RPM values are signed integers
  const String rpmMsg = String(MSG_RPM_PREFIX) + static_cast<int>(lastLeftRpm) + ":" + static_cast<int>(lastRightRpm);
  Serial2.println(rpmMsg);
  Serial.print("[MEGA][TX2] ");
  Serial.println(rpmMsg);
}

void maybeReportDistances() {
  if (!isRunning()) {
    return;
  }

  const unsigned long now = millis();
  if (now - lastDistReportAt < DIST_REPORT_INTERVAL_MS) {
    return;
  }
  lastDistReportAt = now;

  // DIST order follows the clockwise sensor layout: Left, Front, Right, Rear.
  const String distMsg = String(MSG_DIST_PREFIX) + distancesCm[0] + ":" + distancesCm[1] + ":" + distancesCm[2] + ":" + distancesCm[3];
  Serial2.println(distMsg);
  Serial.print("[MEGA][TX2] ");
  Serial.println(distMsg);
}

static bool isObstacleClose() {
  for (uint8_t i = 0; i < 4; ++i) {
    const uint16_t d = distancesCm[i];
    if (d > 0 && d <= warningDistanceCm) {
      return true;
    }
  }
  return false;
}

void updateObstacleWarning() {
  obstacleWarningActive = isRunning() && isObstacleClose();

  if (!obstacleWarningActive) {
    warningBlinkState = false;
    digitalWrite(STATUS_LED_PIN, isRunning() ? HIGH : LOW);
    return;
  }

  const unsigned long now = millis();
  if (now - lastWarningBlinkAt >= WARNING_BLINK_MS) {
    lastWarningBlinkAt = now;
    warningBlinkState = !warningBlinkState;
  }
  digitalWrite(STATUS_LED_PIN, warningBlinkState ? HIGH : LOW);
}

// --- Non-blocking buzzer ---
constexpr uint16_t HORN_DURATION_MS = 300;
static unsigned long hornOffAt = 0;
static bool hornActive = false;

void activateHorn() {
  digitalWrite(BUZZER_PIN, HIGH);
  hornActive = true;
  hornOffAt = millis() + HORN_DURATION_MS;
}

void tickBuzzer() {
  if (hornActive && millis() >= hornOffAt) {
    digitalWrite(BUZZER_PIN, LOW);
    hornActive = false;
  }

  const bool warningTone = obstacleWarningActive && warningBlinkState;
  digitalWrite(BUZZER_PIN, (hornActive || warningTone) ? HIGH : LOW);
}

bool parseInt16Strict(const String& text, int16_t& out) {
  if (text.length() == 0) {
    return false;
  }

  uint8_t idx = 0;
  bool negative = false;
  if (text[0] == '+' || text[0] == '-') {
    negative = (text[0] == '-');
    idx = 1;
    if (idx >= text.length()) {
      return false;
    }
  }

  long value = 0;
  for (; idx < text.length(); ++idx) {
    const char c = text[idx];
    if (c < '0' || c > '9') {
      return false;
    }
    value = (value * 10L) + static_cast<long>(c - '0');
    if (value > 32768L) {
      return false;
    }
  }

  if (negative) {
    value = -value;
  }
  if (value < -32768L || value > 32767L) {
    return false;
  }

  out = static_cast<int16_t>(value);
  return true;
}

bool parseSpeedValue(const String& line, uint8_t prefixLen, int16_t& outSpeed) {
  if (line.length() <= prefixLen) {
    return false;
  }
  return parseInt16Strict(line.substring(prefixLen), outSpeed);
}

const char* autoPhaseName(AutoPhase phase) {
  switch (phase) {
    case AutoPhase::OFF: return "OFF";
    case AutoPhase::CRUISE: return "CRUISE";
    case AutoPhase::AVOID_REVERSE: return "AVOID_REVERSE";
    case AutoPhase::AVOID_TURN: return "AVOID_TURN";
    case AutoPhase::RECOVER: return "RECOVER";
  }
  return "OFF";
}

void sendAutoEvent(const char* evt) {
  Serial2.print(MSG_AUTO_EVT_PREFIX);
  Serial2.println(evt);
  Serial.print("[MEGA][AUTO_EVT] ");
  Serial.println(evt);
}

void setAutoPhase(AutoPhase next) {
  if (autoPhase == next) {
    return;
  }
  autoPhase = next;
  autoPhaseStartedAt = millis();
}

void setAutoDrive(int16_t left, int16_t right) {
  autoCmdLeft = left;
  autoCmdRight = right;
  setDrive(left, right);
}

void disableAutopilot(const char* reason) {
  if (!autopilotEnabled && autoPhase == AutoPhase::OFF) {
    return;
  }
  autopilotEnabled = false;
  autoRisk = 0;
  autoCmdLeft = 0;
  autoCmdRight = 0;
  setAutoPhase(AutoPhase::OFF);
  if (reason != nullptr && reason[0] != '\0') {
    sendAutoEvent(reason);
  }
}

void enableAutopilot() {
  autopilotEnabled = true;
  autoRisk = 0;
  setAutoPhase(AutoPhase::CRUISE);
  sendAutoEvent("ENABLED");
}

void updateStability() {
  if (!isRunning() || !straightLockActive) {
    straightLockBias = 0.0f;
    headingPid.integral = 0;
    headingPid.lastError = 0;
    noInterrupts();
    lastStabLeftTicks = leftTicks;
    lastStabRightTicks = rightTicks;
    interrupts();
    return;
  }

  const unsigned long now = millis();
  if (now - lastStabilityAt < STABILITY_LOOP_MS) {
    return;
  }
  lastStabilityAt = now;

  float error = 0.0f;
  if (mpuPresent && readMpuRaw()) {
    // Gyro Z is yaw rate. scale 131 LSB/(deg/s) for ±250deg/s range
    error = static_cast<float>(mpuRawGz) / 131.0f;
    if (abs(error) < 2.5f) error = 0.0f; // High deadzone for air-testing
  } else {
    // Fallback to encoder-based stability using high-frequency baseline
    noInterrupts();
    long currentL = leftTicks;
    long currentR = rightTicks;
    interrupts();
    
    long dL = currentL - lastStabLeftTicks;
    long dR = currentR - lastStabRightTicks;
    lastStabLeftTicks = currentL;
    lastStabRightTicks = currentR;
    
    error = static_cast<float>(dL - dR) * 0.5f; 
    if (abs(error) < 4.0f) error = 0.0f; // Significant deadzone to prevent air-oscillations
  }

  headingPid.integral += error;
  headingPid.integral = constrain(headingPid.integral, -15.0f, 15.0f);
  float derivative = error - headingPid.lastError;
  headingPid.lastError = error;

  float correction = (headingPid.Kp * error) + (headingPid.Ki * headingPid.integral) + (headingPid.Kd * derivative);
  straightLockBias = constrain(correction, -25.0f, 25.0f); // Low max bias for safety
  
  // Directly adjust motor targets for the stability loop
  int16_t l = constrain(straightLockSpeed - static_cast<int16_t>(straightLockBias), -255, 255);
  int16_t r = constrain(straightLockSpeed + static_cast<int16_t>(straightLockBias), -255, 255);
  leftMotor.target = l;
  rightMotor.target = r;
}


void runAlignRoutine() {
  if (!alignRoutineActive) return;
  
  const uint16_t left = distancesCm[0];
  const uint16_t right = distancesCm[2];
  
  if (left == 0 || right == 0) {
    alignRoutineActive = false;
    stopDrive();
    sendAutoEvent("ALIGN_FAILED_NO_WALLS");
    return;
  }
  
  const int diff = static_cast<int>(left) - static_cast<int>(right);
  if (abs(diff) <= 2) {
    alignRoutineActive = false;
    stopDrive();
    sendAutoEvent("ALIGN_COMPLETE");
    return;
  }
  
  int16_t baseSpeed = 100;
  if (diff > 0) { // left > right: too far right, move left
    setMotorSide(baseSpeed / 2, true);
    setMotorSide(baseSpeed, false);
  } else {
    setMotorSide(baseSpeed, true);
    setMotorSide(baseSpeed / 2, false);
  }
}

uint16_t clampDistanceForRisk(uint16_t d) {
  if (d == 0) return 250;
  return d;
}

void reportAutopilotStatus() {
  const unsigned long now = millis();
  if (now - lastAutoStatAt < AUTO_STAT_INTERVAL_MS) {
    return;
  }
  lastAutoStatAt = now;

  Serial2.print(MSG_AUTO_STAT_PREFIX);
  Serial2.print(autopilotEnabled ? 1 : 0);
  Serial2.print(':');
  Serial2.print(autoPhaseName(autoPhase));
  Serial2.print(':');
  Serial2.print(autoCmdLeft);
  Serial2.print(':');
  Serial2.print(autoCmdRight);
  Serial2.print(':');
  Serial2.print(distancesCm[1]);
  Serial2.print(':');
  Serial2.print(distancesCm[0]);
  Serial2.print(':');
  Serial2.print(distancesCm[2]);
  Serial2.print(':');
  Serial2.println(autoRisk);
}

bool parseAutoConfig(const String& line, AutoPilotConfig& outCfg) {
  int16_t vals[8] = {0};
  int start = static_cast<int>(strlen(CMD_AUTO_CFG_PREFIX));

  for (int i = 0; i < 8; ++i) {
    int sep = line.indexOf(':', start);
    String token;
    if (sep >= 0) {
      token = line.substring(start, sep);
      start = sep + 1;
    } else {
      token = line.substring(start);
    }

    if (!parseInt16Strict(token, vals[i])) {
      return false;
    }

    if (sep < 0 && i < 7) {
      return false;
    }
  }

  if (line.indexOf(':', start) >= 0) {
    return false;
  }

  if (vals[0] < 60 || vals[0] > 220) return false;
  if (vals[1] < 90 || vals[1] > 255) return false;
  if (vals[2] < 10 || vals[2] > 80) return false;
  if (vals[3] < vals[2] + 4 || vals[3] > 140) return false;
  if (vals[4] < 70 || vals[4] > 200) return false;
  if (vals[5] < 120 || vals[5] > 1500) return false;
  if (vals[6] < 120 || vals[6] > 1800) return false;
  if (vals[7] < -100 || vals[7] > 100) return false;

  outCfg.cruiseSpeed = vals[0];
  outCfg.turnSpeed = vals[1];
  outCfg.minFrontCm = vals[2];
  outCfg.cautionFrontCm = vals[3];
  outCfg.reverseSpeed = vals[4];
  outCfg.reverseMs = static_cast<uint16_t>(vals[5]);
  outCfg.turnMs = static_cast<uint16_t>(vals[6]);
  outCfg.sideBias = vals[7];
  return true;
}

void runAutopilot() {
  if (!isRunning() || !autopilotEnabled) {
    return;
  }

  const unsigned long now = millis();
  const uint16_t front = (distancesCm[1] == 0) ? 250 : distancesCm[1];
  const uint16_t left = (distancesCm[0] == 0) ? 250 : distancesCm[0];
  const uint16_t right = (distancesCm[2] == 0) ? 250 : distancesCm[2];

  // Priority 1: High-risk obstacle detection
  if (front < autoCfg.minFrontCm && autoPhase == AutoPhase::CRUISE) {
    setAutoPhase(AutoPhase::AVOID_REVERSE);
    sendAutoEvent("OBSTACLE_FRONT");
  }

  if (autoPhase == AutoPhase::AVOID_REVERSE) {
    if (now - autoPhaseStartedAt < autoCfg.reverseMs) {
      leftMotor.target = -autoCfg.reverseSpeed;
      rightMotor.target = -autoCfg.reverseSpeed;
      return;
    }
    autoTurnDir = (left >= right) ? 1 : -1;
    setAutoPhase(AutoPhase::AVOID_TURN);
    sendAutoEvent(autoTurnDir > 0 ? "AVOID_TURN_LEFT" : "AVOID_TURN_RIGHT");
  }

  if (autoPhase == AutoPhase::AVOID_TURN) {
    if (now - autoPhaseStartedAt < autoCfg.turnMs) {
      int16_t ts = autoCfg.turnSpeed;
      if (autoTurnDir > 0) { leftMotor.target = -ts; rightMotor.target = ts; }
      else { leftMotor.target = ts; rightMotor.target = -ts; }
      return;
    }
    setAutoPhase(AutoPhase::RECOVER);
    sendAutoEvent("RECOVER");
  }

  if (autoPhase == AutoPhase::RECOVER) {
    if (now - autoPhaseStartedAt < 500) {
      leftMotor.target = autoCfg.cruiseSpeed;
      rightMotor.target = autoCfg.cruiseSpeed;
      return;
    }
    setAutoPhase(AutoPhase::CRUISE);
  }

  if (autoPhase == AutoPhase::CRUISE) {
    if (hasGoal) {
      float dx = targetX - posX;
      float dy = targetY - posY;
      float dist = sqrt(dx * dx + dy * dy);

      if (dist < goalToleranceMm) {
        hasGoal = false;
        disableAutopilot("GOAL_REACHED");
        stopDrive();
        return;
      }

      float targetTheta = atan2(dy, dx);
      float errorTheta = targetTheta - posTheta;
      while (errorTheta > PI_F) errorTheta -= 2*PI_F;
      while (errorTheta < -PI_F) errorTheta += 2*PI_F;

      if (abs(errorTheta) > 0.45f) { // ~25 degrees
        // Rotate in place to align with goal
        int16_t ts = autoCfg.turnSpeed;
        if (errorTheta > 0) { leftMotor.target = -ts; rightMotor.target = ts; }
        else { leftMotor.target = ts; rightMotor.target = -ts; }
      } else {
        // Drive towards goal with P-correction on heading
        int16_t cs = autoCfg.cruiseSpeed;
        // Slow down when close
        if (dist < 400.0f) cs = map(static_cast<long>(dist), 0, 400, MIN_PWM + 20, autoCfg.cruiseSpeed);
        // Reduce speed if obstacles are in caution range
        if (front < autoCfg.cautionFrontCm) cs = cs / 2;

        int correction = static_cast<int>(errorTheta * 180.0f);
        leftMotor.target = constrain(cs - correction, -255, 255);
        rightMotor.target = constrain(cs + correction, -255, 255);
      }
    } else {
      // Free cruise with wall follow/avoid
      int turn = 0;
      if (left < 40 || right < 40) {
        turn = (left < right) ? 25 : -25;
      }
      leftMotor.target = autoCfg.cruiseSpeed + turn;
      rightMotor.target = autoCfg.cruiseSpeed - turn;
    }
  }
}

void startSession() {
  setState(MegaState::INITIALIZATION);
  stopDrive();
  leftMotor.current = 0;
  rightMotor.current = 0;
  noInterrupts();
  lastStabLeftTicks = leftTicks;
  lastStabRightTicks = rightTicks;
  interrupts();
  
  // Initialize ultrasonic buffers to 'clear' (250cm) to avoid false-blocked state on start
  for(int s=0; s<4; s++) {
    for(int b=0; b<DIST_BUF_SIZE; b++) distBuffers[s][b] = 250;
    distancesCm[s] = 0;
  }
  
  disableAutopilot("SESSION_START");

  noInterrupts();
  leftTicks = 0;
  rightTicks = 0;
  interrupts();

  lastLeftTicks = 0;
  lastRightTicks = 0;
  lastLeftRpm = 0.0f;
  lastRightRpm = 0.0f;

  const unsigned long now = millis();
  lastUltrasonicAt = now;
  lastRpmAt = now;
  lastDistReportAt = now;
  lastMpuReportAt = now;
  lastWarningBlinkAt = now;
  warningBlinkState = false;
  obstacleWarningActive = false;
  mpuFilterPrimed = false;
  mpuPendingReport = false;
  digitalWrite(STATUS_LED_PIN, HIGH);

  Serial2.println(MSG_RDY);
  Serial2.println("ACK:START");
  Serial.println("[MEGA][ACK] START");
  setState(MegaState::RUNNING);
}

void stopSession() {
  stopDrive();
  disableAutopilot("SESSION_STOP");
  hornActive = false;
  obstacleWarningActive = false;
  warningBlinkState = false;
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);
  setState(MegaState::IDLE);
  Serial2.println("ACK:STOP");
  Serial.println("[MEGA][ACK] STOP");
}

bool parseMpuConfig(const String& line, uint16_t& accelThr, uint16_t& gyroThr, uint8_t& alphaPct, uint16_t& reportMs) {
  int16_t vals[4] = {0};
  int start = static_cast<int>(strlen(CMD_MPU_CFG_PREFIX));

  for (int i = 0; i < 4; ++i) {
    int sep = line.indexOf(':', start);
    String token;
    if (sep >= 0) {
      token = line.substring(start, sep);
      start = sep + 1;
    } else {
      token = line.substring(start);
    }

    if (!parseInt16Strict(token, vals[i])) {
      return false;
    }

    if (sep < 0 && i < 3) {
      return false;
    }
  }

  if (vals[0] < 50 || vals[0] > 8000) return false;
  if (vals[1] < 10 || vals[1] > 4000) return false;
  if (vals[2] < 5 || vals[2] > 95) return false;
  if (vals[3] < MPU_MIN_REPORT_INTERVAL_MS || vals[3] > MPU_MAX_REPORT_INTERVAL_MS) return false;

  accelThr = static_cast<uint16_t>(vals[0]);
  gyroThr = static_cast<uint16_t>(vals[1]);
  alphaPct = static_cast<uint8_t>(vals[2]);
  reportMs = static_cast<uint16_t>(vals[3]);
  return true;
}

void runDiagnostics() {
  Serial.println("[MEGA][DIAG] Running Subsystems Self-Diagnostics...");

  // 1. Signaling starting
  activateHorn(); // Double beep
  delay(100);
  activateHorn();

  // 2. MPU-6050 Check
  bool mpuOk = false;
  Wire.beginTransmission(0x68);
  byte error = Wire.endTransmission();
  if (error == 0) {
    mpuOk = true;
  }

  // 3. Ultrasonic Sensors Check (Left, Front, Right, Back)
  bool lUsOk = false, fUsOk = false, rUsOk = false, bUsOk = false;
  uint16_t dL = readUltrasonic(TRIG_PINS[0], ECHO_PINS[0]); delay(30);
  uint16_t dF = readUltrasonic(TRIG_PINS[1], ECHO_PINS[1]); delay(30);
  uint16_t dR = readUltrasonic(TRIG_PINS[2], ECHO_PINS[2]); delay(30);
  uint16_t dB = readUltrasonic(TRIG_PINS[3], ECHO_PINS[3]); delay(30);

  if (dL > 0 && dL < 400) lUsOk = true;
  if (dF > 0 && dF < 400) fUsOk = true;
  if (dR > 0 && dR < 400) rUsOk = true;
  if (dB > 0 && dB < 400) bUsOk = true;

  // 4. Motors and Encoders Check (Wiggle Test)
  bool lMotOk = false, rMotOk = false;
  bool lEncOk = false, rEncOk = false;

  long startLeftTicks = leftTicks;
  setLeftMotors(90);
  delay(180);
  setLeftMotors(0);
  delay(50);
  long diffL = abs(leftTicks - startLeftTicks);
  if (diffL > 0) {
    lMotOk = true;
    lEncOk = true;
  }

  long startRightTicks = rightTicks;
  setRightMotors(90);
  delay(180);
  setRightMotors(0);
  delay(50);
  long diffR = abs(rightTicks - startRightTicks);
  if (diffR > 0) {
    rMotOk = true;
    rEncOk = true;
  }

  // 5. Build and transmit status payload
  String result = "DIAG_RESULT:";
  result += mpuOk ? "IMU=OK" : "IMU=FAIL";
  result += lUsOk ? ":L_US=OK" : ":L_US=FAIL";
  result += fUsOk ? ":F_US=OK" : ":F_US=FAIL";
  result += rUsOk ? ":R_US=OK" : ":R_US=FAIL";
  result += bUsOk ? ":B_US=OK" : ":B_US=FAIL";
  result += lMotOk ? ":L_MOT=OK" : ":L_MOT=FAIL";
  result += rMotOk ? ":R_MOT=OK" : ":R_MOT=FAIL";
  result += lEncOk ? ":L_ENC=OK" : ":L_ENC=FAIL";
  result += rEncOk ? ":R_ENC=OK" : ":R_ENC=FAIL";

  Serial2.println(result);
  Serial.print("[MEGA][DIAG] Result sent: ");
  Serial.println(result);
}

void handleCommand(const String& line) {
  Serial.print("[MEGA][RX2][CMD] ");
  Serial.println(line);

  if (line == CMD_START) {
    if (isRunning()) {
      // Already running: re-acknowledge without resetting motors or state.
      // Prevents app/relay reconnects from stopping motors via ESP32 re-sending START.
      Serial2.println(MSG_RDY);
      Serial2.println("ACK:START");
      Serial.println("[MEGA][ACK] START (already running — no reset)");
    } else {
      startSession();
    }
    return;
  }

  if (line == CMD_DIAG_START) {
    runDiagnostics();
    return;
  }

  if (line == CMD_ALIGN) {
    if (!isRunning()) {
      Serial2.println("ERR:NOT_READY");
      return;
    }
    alignRoutineActive = true;
    disableAutopilot("ALIGN_START");
    sendAutoEvent("ALIGN_START");
    return;
  }

  if (line == CMD_MPU_ON) {
    if (!isRunning()) {
      Serial2.println("ERR:NOT_READY");
      return;
    }
    if (!mpuPresent) {
      Serial2.println("ERR:SENSOR_MPU");
      return;
    }
    mpuStreamingEnabled = true;
    Serial2.println("ACK:MPU_ON");
    return;
  }

  if (line == CMD_MPU_OFF) {
    mpuStreamingEnabled = false;
    Serial2.println("ACK:MPU_OFF");
    return;
  }

  if (line == CMD_MPU_REQ) {
    if (!isRunning()) {
      Serial2.println("ERR:NOT_READY");
      return;
    }
    if (!mpuPresent) {
      Serial2.println("ERR:SENSOR_MPU");
      return;
    }
    mpuPendingReport = true;
    Serial2.println("ACK:MPU_REQ");
    return;
  }

  if (line.startsWith(CMD_MPU_CFG_PREFIX)) {
    uint16_t newAccelThr = 0;
    uint16_t newGyroThr = 0;
    uint8_t newAlphaPct = 0;
    uint16_t newReportMs = 0;
    if (!parseMpuConfig(line, newAccelThr, newGyroThr, newAlphaPct, newReportMs)) {
      Serial2.println("ERR:BAD_ARG");
      return;
    }

    mpuAccelThreshold = newAccelThr;
    mpuGyroThreshold = newGyroThr;
    mpuFilterAlphaPct = newAlphaPct;
    mpuReportIntervalMs = newReportMs;

    Serial2.print("ACK:MPU_CFG:");
    Serial2.print(mpuAccelThreshold);
    Serial2.print(':');
    Serial2.print(mpuGyroThreshold);
    Serial2.print(':');
    Serial2.print(mpuFilterAlphaPct);
    Serial2.print(':');
    Serial2.println(mpuReportIntervalMs);
    return;
  }

  if (line.startsWith(CMD_GOAL_PREFIX)) {
    if (!isRunning()) {
      Serial2.println("ERR:NOT_READY");
      return;
    }
    // GOAL:dist_m:angle_deg
    int firstColon = line.indexOf(':', 5);
    if (firstColon > 0) {
      float distM = line.substring(5, firstColon).toFloat();
      float angleDeg = line.substring(firstColon + 1).toFloat();
      float angleRad = angleDeg * 0.0174533f;
      targetX = posX + (distM * 1000.0f) * cos(angleRad);
      targetY = posY + (distM * 1000.0f) * sin(angleRad);
      hasGoal = true;
      enableAutopilot();
      Serial2.println("ACK:GOAL");
      return;
    }
    Serial2.println("ERR:BAD_ARG");
    return;
  }

  if (line == CMD_STOP) {
    alignRoutineActive = false;
    hasGoal = false;
    disableAutopilot("MANUAL_OVERRIDE");
    stopDrive();
    if (isRunning()) {
      Serial2.println("ACK:STOP");
      Serial.println("[MEGA][ACK] STOP");
    }
    Serial.println("[MEGA][ACT] STOP_DRIVE");
    return;
  }

  if (line.startsWith(CMD_MAX_SPD_PREFIX)) {
    int16_t spd = 0;
    if (!parseSpeedValue(line, strlen(CMD_MAX_SPD_PREFIX), spd) || spd < 0 || spd > 255) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG MAX_SPD");
      return;
    }
    maxSpeed = static_cast<uint8_t>(spd);
    Serial2.print("ACK:MAX_SPD:");
    Serial2.println(maxSpeed);
    Serial.print("[MEGA][ACK] MAX_SPD:");
    Serial.println(maxSpeed);
    return;
  }

  if (line.startsWith(CMD_WARN_DIST_PREFIX)) {
    int16_t dist = 0;
    if (!parseInt16Strict(line.substring(strlen(CMD_WARN_DIST_PREFIX)), dist) || dist < 10 || dist > 150) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG WARN_DIST");
      return;
    }
    warningDistanceCm = static_cast<uint16_t>(dist);
    Serial2.print("ACK:WARN_DIST:");
    Serial2.println(warningDistanceCm);
    Serial.print("[MEGA][ACK] WARN_DIST:");
    Serial.println(warningDistanceCm);
    return;
  }

  if (line == CMD_AUTO_ON) {
    if (!isRunning()) {
      Serial2.println("ERR:NOT_READY");
      return;
    }
    enableAutopilot();
    Serial2.println("ACK:AUTO_ON");
    return;
  }

  if (line == CMD_AUTO_OFF) {
    disableAutopilot("DISABLED");
    stopDrive();
    Serial2.println("ACK:AUTO_OFF");
    return;
  }

  if (line.startsWith(CMD_AUTO_CFG_PREFIX)) {
    AutoPilotConfig parsed;
    if (!parseAutoConfig(line, parsed)) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG AUTO_CFG");
      return;
    }
    autoCfg = parsed;
    Serial2.print("ACK:AUTO_CFG:");
    Serial2.print(autoCfg.cruiseSpeed);
    Serial2.print(':');
    Serial2.print(autoCfg.turnSpeed);
    Serial2.print(':');
    Serial2.print(autoCfg.minFrontCm);
    Serial2.print(':');
    Serial2.print(autoCfg.cautionFrontCm);
    Serial2.print(':');
    Serial2.print(autoCfg.reverseSpeed);
    Serial2.print(':');
    Serial2.print(autoCfg.reverseMs);
    Serial2.print(':');
    Serial2.print(autoCfg.turnMs);
    Serial2.print(':');
    Serial2.println(autoCfg.sideBias);
    return;
  }

  if (line == CMD_HORN) {
    if (!isRunning()) {
      Serial2.println("ERR:NOT_READY");
      return;
    }
    activateHorn();
    Serial2.println("ACK:HORN");
    Serial.println("[MEGA][ACK] HORN");
    Serial.println("[MEGA][ACT] HORN");
    return;
  }

  if (line == "JITTER_ON") {
    jitterDiagEnabled = true;
    maxJitterL = 0;
    maxJitterR = 0;
    Serial2.println("ACK:JITTER_ON");
    return;
  }

  if (line == "JITTER_OFF") {
    jitterDiagEnabled = false;
    Serial2.print("ACK:JITTER_OFF:");
    Serial2.print(maxJitterL);
    Serial2.print(":");
    Serial2.println(maxJitterR);
    return;
  }

  if (!isRunning()) {
    Serial2.println("ERR:NOT_READY");
    Serial.println("[MEGA][ERR] NOT_READY");
    return;
  }

  int16_t s = 0;
  if (line.startsWith(CMD_FWD_PREFIX)) {
    disableAutopilot("MANUAL_OVERRIDE");
    if (!parseSpeedValue(line, 4, s)) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG FWD");
      return;
    }
    if (s < 0 || s > 255) { Serial2.println("ERR:BAD_RANGE"); Serial.println("[MEGA][ERR] BAD_RANGE FWD"); return; }
    setDrive(s, s);
    Serial.print("[MEGA][ACT] FWD ");
    Serial.println(s);
    return;
  }

  if (line.startsWith(CMD_BCK_PREFIX)) {
    disableAutopilot("MANUAL_OVERRIDE");
    if (!parseSpeedValue(line, 4, s)) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG BCK");
      return;
    }
    if (s < 0 || s > 255) { Serial2.println("ERR:BAD_RANGE"); Serial.println("[MEGA][ERR] BAD_RANGE BCK"); return; }
    setDrive(-s, -s);
    Serial.print("[MEGA][ACT] BCK ");
    Serial.println(s);
    return;
  }

  if (line.startsWith(CMD_LEFT_PREFIX)) {
    disableAutopilot("MANUAL_OVERRIDE");
    if (!parseSpeedValue(line, 5, s)) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG LEFT");
      return;
    }
    if (s < 0 || s > 255) { Serial2.println("ERR:BAD_RANGE"); Serial.println("[MEGA][ERR] BAD_RANGE LEFT"); return; }
    setDrive(-s, s);
    Serial.print("[MEGA][ACT] LEFT ");
    Serial.println(s);
    return;
  }

  if (line.startsWith(CMD_RIGHT_PREFIX)) {
    disableAutopilot("MANUAL_OVERRIDE");
    if (!parseSpeedValue(line, 6, s)) {
      Serial2.println("ERR:BAD_ARG");
      Serial.println("[MEGA][ERR] BAD_ARG RIGHT");
      return;
    }
    if (s < 0 || s > 255) { Serial2.println("ERR:BAD_RANGE"); Serial.println("[MEGA][ERR] BAD_RANGE RIGHT"); return; }
    setDrive(s, -s);
    Serial.print("[MEGA][ACT] RIGHT ");
    Serial.println(s);
    return;
  }

  if (line.startsWith(CMD_SPD_PREFIX)) {
    disableAutopilot("MANUAL_OVERRIDE");
    const int firstColon = line.indexOf(':', 4);
    if (firstColon > 0) {
      int16_t left = 0;
      int16_t right = 0;
      if (!parseInt16Strict(line.substring(4, firstColon), left) ||
          !parseInt16Strict(line.substring(firstColon + 1), right)) {
        Serial2.println("ERR:BAD_ARG");
        Serial.println("[MEGA][ERR] BAD_ARG SPD");
        return;
      }
      if (left < -255 || left > 255 || right < -255 || right > 255) {
        Serial2.println("ERR:BAD_RANGE");
        Serial.println("[MEGA][ERR] BAD_RANGE SPD");
        return;
      }
      setDrive(left, right);
      Serial2.print(MSG_ACK_PREFIX);
      Serial2.print("SPD:");
      Serial2.print(left);
      Serial2.print(':');
      Serial2.println(right);
      Serial.print("[MEGA][ACK] SPD:");
      Serial.print(left);
      Serial.print(':');
      Serial.println(right);
      Serial.print("[MEGA][ACT] SPD:");
      Serial.print(left);
      Serial.print(':');
      Serial.println(right);
      return;
    }
    Serial2.println("ERR:BAD_ARG");
    Serial.println("[MEGA][ERR] BAD_ARG SPD_FORMAT");
    return;
  }

  // --- Per-wheel speed control: WSPD:FL:RL:FR:RR (signed -255..255 each) ---
  // FL = front-left,  RL = rear-left  → left L298N (ENA controls FL, ENB controls RL)
  // FR = front-right, RR = rear-right → right L298N (ENA controls FR, ENB controls RR)
  if (line.startsWith(CMD_WSPD_PREFIX)) {
    disableAutopilot("MANUAL_OVERRIDE");
    // Parse four colon-separated signed integers after "WSPD:"
    const String body = line.substring(5);
    int c1 = body.indexOf(':');
    if (c1 < 0) { Serial2.println("ERR:BAD_ARG"); return; }
    int c2 = body.indexOf(':', c1 + 1);
    if (c2 < 0) { Serial2.println("ERR:BAD_ARG"); return; }
    int c3 = body.indexOf(':', c2 + 1);
    if (c3 < 0) { Serial2.println("ERR:BAD_ARG"); return; }
    int16_t fl = 0, rl = 0, fr = 0, rr = 0;
    if (!parseInt16Strict(body.substring(0, c1), fl) ||
        !parseInt16Strict(body.substring(c1 + 1, c2), rl) ||
        !parseInt16Strict(body.substring(c2 + 1, c3), fr) ||
        !parseInt16Strict(body.substring(c3 + 1), rr)) {
      Serial2.println("ERR:BAD_ARG"); Serial.println("[MEGA][ERR] BAD_ARG WSPD"); return;
    }
    const int16_t cap = static_cast<int16_t>(maxSpeed);
    fl = constrain(fl, -cap, cap);
    rl = constrain(rl, -cap, cap);
    fr = constrain(fr, -cap, cap);
    rr = constrain(rr, -cap, cap);
    // Apply directly (bypass ramping — individual wheel control is explicit)
    auto applyOne = [](uint8_t in1, uint8_t in2, uint8_t in3, uint8_t in4, uint8_t ena, uint8_t enb,
                       int16_t front, int16_t rear) {
      const int16_t cf = constrain(front, -255, 255);
      const bool fFwd = cf >= 0;
      digitalWrite(in1, fFwd ? HIGH : LOW);
      digitalWrite(in2, fFwd ? LOW  : HIGH);
      analogWrite(ena, static_cast<uint8_t>(abs(cf)));
      const int16_t cr = constrain(rear, -255, 255);
      const bool rFwd = cr >= 0;
      digitalWrite(in3, rFwd ? HIGH : LOW);
      digitalWrite(in4, rFwd ? LOW  : HIGH);
      analogWrite(enb, static_cast<uint8_t>(abs(cr)));
    };
    applyOne(L_IN1, L_IN2, L_IN3, L_IN4, L_ENA, L_ENB, fl, rl);
    applyOne(R_IN1, R_IN2, R_IN3, R_IN4, R_ENA, R_ENB, fr, rr);
    // Keep MotorState in sync so ramping loop does not override us immediately
    leftMotor.current  = static_cast<float>((fl + rl) / 2);
    leftMotor.target   = leftMotor.current;
    rightMotor.current = static_cast<float>((fr + rr) / 2);
    rightMotor.target  = rightMotor.current;
    Serial2.print(MSG_ACK_PREFIX);
    Serial2.print("WSPD:"); Serial2.print(fl); Serial2.print(':');
    Serial2.print(rl); Serial2.print(':'); Serial2.print(fr); Serial2.print(':'); Serial2.println(rr);
    Serial.print("[MEGA][ACK] WSPD:"); Serial.print(fl); Serial.print(':');
    Serial.print(rl); Serial.print(':'); Serial.print(fr); Serial.print(':'); Serial.println(rr);
    return;
  }

  Serial2.print(MSG_ERR_PREFIX);
  Serial2.print("BAD_CMD:");
  Serial2.println(line);
  Serial.print("[MEGA][ERR] BAD_CMD: ");
  Serial.println(line);
}

void readUartCommands() {
  // 1. Read from Serial2 (ESP32)
  while (Serial2.available() > 0) {
    const char c = static_cast<char>(Serial2.read());
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      if (rxOverflow) {
        Serial2.println("ERR:LINE_TOO_LONG");
        Serial.println("[MEGA][ERR] LINE_TOO_LONG");
        rxOverflow = false;
        rxLine = "";
        continue;
      }

      if (rxLine.length() > 0) {
        rxFrameCount++;
        Serial.print("[MEGA][RX2][RAW #");
        Serial.print(rxFrameCount);
        Serial.print("] ");
        Serial.println(rxLine);
        handleCommand(rxLine);
        rxLine = "";
      }
      continue;
    }

    if (rxOverflow) {
      continue;
    }

    if (rxLine.length() < UART_LINE_MAX) {
      rxLine += c;
    } else {
      rxOverflow = true;
    }
  }

  // 2. Read from Serial (USB Port)
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r') {
      continue;
    }
    if (c == '\n') {
      if (rxUsbOverflow) {
        Serial.println("[MEGA][ERR] LINE_TOO_LONG (USB)");
        rxUsbOverflow = false;
        rxUsbLine = "";
        continue;
      }

      if (rxUsbLine.length() > 0) {
        rxFrameCount++;
        Serial.print("[MEGA][USB][RAW #");
        Serial.print(rxFrameCount);
        Serial.print("] ");
        Serial.println(rxUsbLine);
        handleCommand(rxUsbLine);
        rxUsbLine = "";
      }
      continue;
    }

    if (rxUsbOverflow) {
      continue;
    }

    if (rxUsbLine.length() < UART_LINE_MAX) {
      rxUsbLine += c;
    } else {
      rxUsbOverflow = true;
    }
  }
}

void setupPins() {
  for (uint8_t i = 0; i < 4; ++i) {
    pinMode(TRIG_PINS[i], OUTPUT);
    pinMode(ECHO_PINS[i], INPUT);
    digitalWrite(TRIG_PINS[i], LOW);
  }

  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(STATUS_LED_PIN, OUTPUT);
  digitalWrite(BUZZER_PIN, LOW);
  digitalWrite(STATUS_LED_PIN, LOW);

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

  pinMode(ENC_LEFT_A, INPUT_PULLUP);
  pinMode(ENC_LEFT_B, INPUT_PULLUP);
  pinMode(ENC_RIGHT_A, INPUT_PULLUP);
  pinMode(ENC_RIGHT_B, INPUT_PULLUP);

  attachInterrupt(digitalPinToInterrupt(ENC_LEFT_A), isrLeftA, CHANGE);
  attachInterrupt(digitalPinToInterrupt(ENC_RIGHT_A), isrRightA, CHANGE);
}

void setup() {
  setState(MegaState::INITIALIZATION);
  Serial.begin(USB_DEBUG_BAUD);
  Serial2.begin(UART_BAUD);
  setupPins();
  mpuPresent = initMpu();
  if (!mpuPresent) {
    Serial2.println("ERR:SENSOR_MPU");
  }
  setState(MegaState::IDLE);
}

void loop() {
  readUartCommands();
  updateOdometry();

  if (isRunning()) {
    updateUltrasonic();
    if (alignRoutineActive) {
      runAlignRoutine();
    } else {
      runAutopilot();
      updateStability();
    }
    applyRamping(); // Apply motor ramps every loop
    updateRpm();
    updateJitter(); // Diagnostic: Check for jitter in movement
    maybeReportDistances();
    updateMpu();
    reportAutopilotStatus();
    updateObstacleWarning();
  } else {
    disableAutopilot("IDLE");
    alignRoutineActive = false;
    obstacleWarningActive = false;
    warningBlinkState = false;
    digitalWrite(STATUS_LED_PIN, LOW);
  }

  tickBuzzer();
}
