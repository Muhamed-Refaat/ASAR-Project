// MPU-6050 only validation sketch for Arduino Mega 2560.
// Purpose: test IMU readings with vibration-aware filtering and thresholds
// without motors/ultrasonics/UART protocol dependencies.

#include <Wire.h>

constexpr uint8_t MPU_ADDR = 0x68;
constexpr uint8_t MPU_REG_PWR_MGMT_1 = 0x6B;
constexpr uint8_t MPU_REG_DATA_START = 0x3B;

constexpr unsigned long SERIAL_BAUD = 115200;

// Defaults aligned with mega/mega.ino MPU behavior.
uint16_t accelThreshold = 1200;
uint16_t gyroThreshold = 180;
uint8_t filterAlphaPct = 25;      // 5..95
uint16_t reportIntervalMs = 220;  // 50..1000

bool mpuPresent = false;
bool filterPrimed = false;
unsigned long lastReportAt = 0;

int16_t rawAx = 0;
int16_t rawAy = 0;
int16_t rawAz = 0;
int16_t rawGx = 0;
int16_t rawGy = 0;
int16_t rawGz = 0;

int16_t stableAx = 0;
int16_t stableAy = 0;
int16_t stableAz = 0;
int16_t stableGx = 0;
int16_t stableGy = 0;
int16_t stableGz = 0;

int32_t filtAxQ4 = 0;
int32_t filtAyQ4 = 0;
int32_t filtAzQ4 = 0;
int32_t filtGxQ4 = 0;
int32_t filtGyQ4 = 0;
int32_t filtGzQ4 = 0;

String rxLine;

bool initMpu() {
  Wire.begin();

  Wire.beginTransmission(MPU_ADDR);
  Wire.write(MPU_REG_PWR_MGMT_1);
  Wire.write(0);
  const uint8_t err = Wire.endTransmission(true);

  if (err != 0) {
    Serial.print("ERR:MPU_INIT:");
    Serial.println(err);
    return false;
  }

  delay(20);
  Serial.println("ACK:MPU_READY");
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

  rawAx = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  rawAy = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  rawAz = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  const int16_t tmp = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  (void)tmp;
  rawGx = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  rawGy = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  rawGz = static_cast<int16_t>((Wire.read() << 8) | Wire.read());
  return true;
}

int16_t applyAxisFilter(int16_t raw, int32_t& filtQ4, int16_t& stableValue, uint16_t threshold) {
  if (!filterPrimed) {
    filtQ4 = static_cast<int32_t>(raw) << 4;
    stableValue = raw;
    return raw;
  }

  const int32_t rawQ4 = static_cast<int32_t>(raw) << 4;
  const int32_t deltaQ4 = rawQ4 - filtQ4;
  filtQ4 += (deltaQ4 * static_cast<int32_t>(filterAlphaPct)) / 100;

  const int16_t filtered = static_cast<int16_t>(filtQ4 >> 4);
  if (abs(filtered - stableValue) <= static_cast<int>(threshold)) {
    return stableValue;
  }

  stableValue = filtered;
  return stableValue;
}

void printHelp() {
  Serial.println("Commands:");
  Serial.println("  HELP");
  Serial.println("  READ                -> force one read + print");
  Serial.println("  CFG:a:g:alpha:ms    -> set accelThr, gyroThr, alphaPct, reportMs");
  Serial.println("  SHOW                -> print active configuration");
}

void printConfig() {
  Serial.print("CFG:");
  Serial.print(accelThreshold);
  Serial.print(':');
  Serial.print(gyroThreshold);
  Serial.print(':');
  Serial.print(filterAlphaPct);
  Serial.print(':');
  Serial.println(reportIntervalMs);
}

bool parseCfg(const String& line, uint16_t& a, uint16_t& g, uint8_t& alpha, uint16_t& ms) {
  if (!line.startsWith("CFG:")) {
    return false;
  }

  int start = 4;
  int values[4] = {0, 0, 0, 0};
  for (int i = 0; i < 4; ++i) {
    int sep = line.indexOf(':', start);
    String token;
    if (sep >= 0) {
      token = line.substring(start, sep);
      start = sep + 1;
    } else {
      token = line.substring(start);
    }

    if (token.length() == 0) {
      return false;
    }

    values[i] = token.toInt();
    if (sep < 0 && i < 3) {
      return false;
    }
  }

  if (values[0] < 50 || values[0] > 8000) return false;
  if (values[1] < 10 || values[1] > 4000) return false;
  if (values[2] < 5 || values[2] > 95) return false;
  if (values[3] < 50 || values[3] > 1000) return false;

  a = static_cast<uint16_t>(values[0]);
  g = static_cast<uint16_t>(values[1]);
  alpha = static_cast<uint8_t>(values[2]);
  ms = static_cast<uint16_t>(values[3]);
  return true;
}

void handleSerialCommands() {
  while (Serial.available() > 0) {
    const char c = static_cast<char>(Serial.read());
    if (c == '\r') continue;

    if (c == '\n') {
      rxLine.trim();
      if (rxLine.length() == 0) {
        rxLine = "";
        continue;
      }

      if (rxLine == "HELP") {
        printHelp();
      } else if (rxLine == "SHOW") {
        printConfig();
      } else if (rxLine == "READ") {
        lastReportAt = 0;
      } else {
        uint16_t a = 0;
        uint16_t g = 0;
        uint8_t alpha = 0;
        uint16_t ms = 0;
        if (parseCfg(rxLine, a, g, alpha, ms)) {
          accelThreshold = a;
          gyroThreshold = g;
          filterAlphaPct = alpha;
          reportIntervalMs = ms;
          Serial.println("ACK:CFG");
          printConfig();
        } else {
          Serial.println("ERR:BAD_CMD");
        }
      }

      rxLine = "";
      continue;
    }

    if (rxLine.length() < 80) {
      rxLine += c;
    }
  }
}

void sampleAndPrint() {
  if (!readMpuRaw()) {
    Serial.println("ERR:MPU_READ");
    return;
  }

  const int16_t ax = applyAxisFilter(rawAx, filtAxQ4, stableAx, accelThreshold);
  const int16_t ay = applyAxisFilter(rawAy, filtAyQ4, stableAy, accelThreshold);
  const int16_t az = applyAxisFilter(rawAz, filtAzQ4, stableAz, accelThreshold);
  const int16_t gx = applyAxisFilter(rawGx, filtGxQ4, stableGx, gyroThreshold);
  const int16_t gy = applyAxisFilter(rawGy, filtGyQ4, stableGy, gyroThreshold);
  const int16_t gz = applyAxisFilter(rawGz, filtGzQ4, stableGz, gyroThreshold);

  filterPrimed = true;

  Serial.print("RAW:");
  Serial.print(rawAx); Serial.print(':');
  Serial.print(rawAy); Serial.print(':');
  Serial.print(rawAz); Serial.print(':');
  Serial.print(rawGx); Serial.print(':');
  Serial.print(rawGy); Serial.print(':');
  Serial.println(rawGz);

  Serial.print("MPU:");
  Serial.print(ax); Serial.print(':');
  Serial.print(ay); Serial.print(':');
  Serial.print(az); Serial.print(':');
  Serial.print(gx); Serial.print(':');
  Serial.print(gy); Serial.print(':');
  Serial.println(gz);
}

void setup() {
  Serial.begin(SERIAL_BAUD);
  while (!Serial) {
    ;
  }

  Serial.println("MPU-only test sketch booting...");
  mpuPresent = initMpu();
  if (!mpuPresent) {
    Serial.println("ERR:MPU_NOT_FOUND");
  }

  printConfig();
  printHelp();
}

void loop() {
  handleSerialCommands();

  if (!mpuPresent) {
    delay(300);
    return;
  }

  const unsigned long now = millis();
  if (now - lastReportAt >= reportIntervalMs) {
    lastReportAt = now;
    sampleAndPrint();
  }
}
