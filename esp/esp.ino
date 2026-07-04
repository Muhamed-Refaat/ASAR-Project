// =============================================================
// esp/esp.ino - ESP32 DOIT DEVKIT V1 firmware
// Role: WiFi + WebSocket endpoint for custom MobileAPP,
//       UART master to Mega 2560
// UART2: RX2 = GPIO16, TX2 = GPIO17
// =============================================================

#include <WiFi.h>
#include <WebSocketsServer.h>

// --- WiFi credentials ---
static const char WIFI_SSID[] = "Refaat Allam";
static const char WIFI_PASS[] = "Allam12345e";

// --- Static IP Configuration ---
IPAddress local_IP(192, 168, 1, 100);
IPAddress gateway(192, 168, 1, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(192, 168, 1, 1);
IPAddress secondaryDNS(8, 8, 8, 8);

// --- ESP32 app socket ---
constexpr uint16_t APP_WS_PORT = 81;
WebSocketsServer appWs(APP_WS_PORT);

// --- UART2 to Mega ---
constexpr int UART2_RX_PIN = 16; // Restored to GPIO 16
constexpr int UART2_TX_PIN = 17;
constexpr unsigned long UART_BAUD = 9600;
constexpr size_t UART_LINE_MAX = 96;

// --- Protocol tokens (UART to Mega) ---
constexpr const char* CMD_START = "START";
constexpr const char* CMD_STOP = "STOP";
constexpr const char* CMD_HORN = "HORN";
constexpr const char* CMD_SPD_PREFIX = "SPD:";
constexpr const char* CMD_WSPD_PREFIX = "WSPD:";  // Individual wheel: WSPD:FL:RL:FR:RR
constexpr const char* CMD_MAX_SPD_PREFIX = "MAX_SPD:";
constexpr const char* CMD_AUTO_ON = "AUTO_ON";
constexpr const char* CMD_AUTO_OFF = "AUTO_OFF";
constexpr const char* CMD_AUTO_CFG_PREFIX = "AUTO_CFG:";
constexpr const char* CMD_ALIGN = "ALIGN";
constexpr const char* CMD_MPU_ON = "MPU_ON";
constexpr const char* CMD_MPU_OFF = "MPU_OFF";
constexpr const char* CMD_MPU_REQ = "MPU_REQ";
constexpr const char* CMD_MPU_CFG_PREFIX = "MPU_CFG:";
constexpr const char* CMD_WARN_DIST_PREFIX = "WARN_DIST:";
constexpr const char* CMD_DIAG_START = "DIAG_START";

// --- Protocol tokens (Mega feedback) ---
constexpr const char* MSG_RDY = "RDY";
constexpr const char* MSG_RPM_PREFIX = "RPM:";
constexpr const char* MSG_DIST_PREFIX = "DIST:";
constexpr const char* MSG_ERR_PREFIX = "ERR:";
constexpr const char* MSG_ACK_PREFIX = "ACK:";
constexpr const char* MSG_AUTO_STAT_PREFIX = "AUTO_STAT:";
constexpr const char* MSG_AUTO_EVT_PREFIX = "AUTO_EVT:";
constexpr const char* MSG_MPU_PREFIX = "MPU:";

// --- Timing ---
constexpr unsigned long START_RETRY_INTERVAL_MS = 3000;
constexpr unsigned long MEGA_SILENCE_TIMEOUT_MS = 6000;
constexpr unsigned long ASSUMED_RDY_TIMEOUT_MS = 15000;
constexpr unsigned long WIFI_RETRY_INTERVAL_MS = 5000;
constexpr bool ENABLE_STATE_LOG = false;

// =============================================================
// State machine
// =============================================================
enum class EspState : uint8_t {
  OFF = 0,
  INITIALIZATION,
  IDLE,
  RUNNING,
};

static EspState espState = EspState::OFF;
static bool appConnected = false;

static void setState(EspState next) {
  if (espState == next) return;
  espState = next;
  if (ENABLE_STATE_LOG && appConnected) {
    Serial.printf("[ESP][STATE] %s\n", (next == EspState::RUNNING) ? "RUNNING" : (next == EspState::IDLE) ? "IDLE" : "INIT");
  }
}

static bool isRunning() {
  return espState == EspState::RUNNING;
}

// =============================================================
// UART receive buffer
// =============================================================
static String megaLine;
static bool megaOverflow = false;

// =============================================================
// Cached telemetry and diagnostics
// =============================================================
static int lastRpmLeft = 0, lastRpmRight = 0;
static int lastDistLeft = 0, lastDistFront = 0, lastDistRight = 0, lastDistRear = 0;

static unsigned long lastStartMs = 0;
static unsigned long firstStartMs = 0;
static unsigned long lastMegaRxMs = 0;
static unsigned long lastWifiRetryMs = 0;

static uint32_t txLines = 0, rxLines = 0, errLines = 0;
static int pendingMaxSpeed = -1;
static bool ipLoggedAfterConnect = false;

static void printNetworkIdentity(const char* tag) {
  Serial.println();
  Serial.println(F("=================================================="));
  Serial.print(F("[DIRECT MODE] URL: ws://"));
  Serial.print(WiFi.localIP());
  Serial.print(':');
  Serial.println(APP_WS_PORT);
  Serial.print(F("[RELAY MODE]  IP:  "));
  Serial.println(WiFi.localIP());
  Serial.println(F("=================================================="));
  Serial.println();
}

// =============================================================
// Helpers
// =============================================================
static String normalizeMegaLine(const String& raw) {
  String out = "";
  for (size_t i = 0; i < raw.length(); ++i) {
    if (raw[i] >= 32 && raw[i] <= 126) out += raw[i];
  }
  out.trim();
  return out;
}

static void sendMega(const String& msg) {
  Serial2.println(msg);
  txLines++;
  if (appConnected) {
    Serial.print(F("[ESP][TX] "));
    Serial.println(msg);
  }
}

static void sendWsToClient(uint8_t clientId, const String& frame) {
  appWs.sendTXT(clientId, frame + "\n");
}

static void broadcastWs(const String& frame) {
  appWs.broadcastTXT(frame + "\n");
}

static bool parseIntToken(const String& token, int& out) {
  if (token.length() == 0) return false;
  out = token.toInt();
  return true;
}

static void handleMegaLine(const String& line) {
  const String normalized = normalizeMegaLine(line);
  if (normalized.length() == 0) return;

  lastMegaRxMs = millis();
  rxLines++;

  if (normalized == MSG_RDY || normalized.startsWith("ACK:START")) {
    setState(EspState::RUNNING);
    broadcastWs(MSG_RDY);
    if (pendingMaxSpeed >= 0) sendMega(String(CMD_MAX_SPD_PREFIX) + pendingMaxSpeed);
    return;
  }

  if (normalized.startsWith(MSG_DIST_PREFIX)) {
    int start = 5;
    int values[4] = {0, 0, 0, 0};
    bool ok = true;
    for (int i = 0; i < 4; ++i) {
      int sep = normalized.indexOf(':', start);
      String token = (sep >= 0) ? normalized.substring(start, sep) : normalized.substring(start);
      if (!parseIntToken(token, values[i])) { ok = false; break; }
      start = sep + 1;
    }
    if (ok) {
      lastDistLeft = values[0]; lastDistFront = values[1];
      lastDistRight = values[2]; lastDistRear = values[3];
    }
  }

  if (normalized.startsWith(MSG_ERR_PREFIX)) {
    errLines++;
    if (normalized.substring(4) == "NOT_READY") setState(EspState::IDLE);
  }

  broadcastWs(normalized);
}

static void readMegaUart() {
  while (Serial2.available() > 0) {
    const char c = static_cast<char>(Serial2.read());
    if (c == '\r') continue;
    if (c == '\n') {
      if (megaOverflow) { megaOverflow = false; megaLine = ""; continue; }
      if (megaLine.length() > 0) { handleMegaLine(megaLine); megaLine = ""; }
      continue;
    }
    if (megaOverflow) continue;
    if (megaLine.length() < UART_LINE_MAX) megaLine += c;
    else megaOverflow = true;
  }
}

static int lastSpdLeft = 0;
static int lastSpdRight = 0;

static void handleRobotCommandFromApp(const String& line, uint8_t clientId) {
  if (line == CMD_START) {
    if (!isRunning()) { setState(EspState::IDLE); firstStartMs = 0; }
    sendMega(CMD_START);
    sendWsToClient(clientId, "ACK:START_PENDING");
    return;
  }
  if (line == CMD_DIAG_START) {
    sendMega(line);

    bool wifiOk = (WiFi.status() == WL_CONNECTED);
    long rssi = WiFi.RSSI();
    uint32_t heap = ESP.getFreeHeap();

    String espDiagResult = "DIAG_ESP:";
    espDiagResult += wifiOk ? "WIFI=OK" : "WIFI=FAIL";
    espDiagResult += ":RSSI=";
    espDiagResult += String(rssi);
    espDiagResult += "dBm:HEAP=";
    espDiagResult += String(heap / 1024);
    espDiagResult += "KB";

    sendWsToClient(clientId, espDiagResult);
    return;
  }
  if (line.startsWith(CMD_MAX_SPD_PREFIX)) {
    int val = line.substring(8).toInt();
    if (val >= 0 && val <= 255) { pendingMaxSpeed = val; sendMega(line); }
    return;
  }
  if (line == CMD_MPU_ON || line == CMD_MPU_OFF || line == CMD_MPU_REQ || line.startsWith(CMD_MPU_CFG_PREFIX) || line.startsWith(CMD_AUTO_CFG_PREFIX) || line.startsWith(CMD_WARN_DIST_PREFIX)) {
    sendMega(line);
    return;
  }
  if (line.startsWith("GOAL:")) {
    sendMega(line);
    return;
  }
  if (line == CMD_STOP) {
    sendMega(CMD_STOP);
    sendWsToClient(clientId, "ACK:STOP");
    lastSpdLeft = 0;
    lastSpdRight = 0;
    return;
  }
  if (line.startsWith(CMD_WSPD_PREFIX)) {
    // Per-wheel command: relay directly to Mega, no throttling needed
    sendMega(line);
    return;
  }
  if (line.startsWith(CMD_SPD_PREFIX)) {
    int firstColon = line.indexOf(':', 4);
    if (firstColon > 0) {
      int left = line.substring(4, firstColon).toInt();
      int right = line.substring(firstColon + 1).toInt();
      if (left == 0 && right == 0) {
        sendMega(line);
        lastSpdLeft = 0;
        lastSpdRight = 0;
        return;
      }
      if (abs(left - lastSpdLeft) > 3 || abs(right - lastSpdRight) > 3) {
        sendMega(line);
        lastSpdLeft = left;
        lastSpdRight = right;
      }
      return;
    }
  }
  
  if (!isRunning()) {
    sendMega(CMD_START);
    sendMega(line);
    sendWsToClient(clientId, "ACK:QUEUED_WAITING_RDY");
    return;
  }
  sendMega(line);
}

static void onAppWsEvent(uint8_t clientId, WStype_t type, uint8_t* payload, size_t length) {
  if (type == WStype_CONNECTED) {
    appConnected = true;
    sendWsToClient(clientId, isRunning() ? MSG_RDY : "ACK:CONNECTED");
  } else if (type == WStype_TEXT) {
    String text = "";
    for (size_t i = 0; i < length; ++i) text += static_cast<char>(payload[i]);
    text.trim();
    if (text.length() > 0) handleRobotCommandFromApp(text, clientId);
  }
}

void setup() {
  Serial.begin(115200);
  delay(300);
  Serial2.begin(UART_BAUD, SERIAL_8N1, UART2_RX_PIN, UART2_TX_PIN);

  // DHCP mode is used automatically on Wi-Fi connection (WiFi.config bypassed)

  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASS);
  appWs.begin();
  appWs.onEvent(onAppWsEvent);
  setState(EspState::IDLE);
}

void loop() {
  appWs.loop();
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetryMs > WIFI_RETRY_INTERVAL_MS) {
    lastWifiRetryMs = millis();
    WiFi.begin(WIFI_SSID, WIFI_PASS);
    ipLoggedAfterConnect = false;
  } else if (WiFi.status() == WL_CONNECTED && !ipLoggedAfterConnect) {
    printNetworkIdentity("Connected");
    ipLoggedAfterConnect = true;
  }
  readMegaUart();
  if (isRunning() && lastMegaRxMs > 0 && millis() - lastMegaRxMs > MEGA_SILENCE_TIMEOUT_MS) setState(EspState::IDLE);
  
  if (espState == EspState::IDLE && millis() - lastStartMs >= START_RETRY_INTERVAL_MS) {
    if (firstStartMs == 0) firstStartMs = millis();
    lastStartMs = millis();
    sendMega(CMD_START);
    if (rxLines == 0 && millis() - firstStartMs > ASSUMED_RDY_TIMEOUT_MS) {
      setState(EspState::RUNNING);
      broadcastWs(MSG_RDY);
    }
  }
}
