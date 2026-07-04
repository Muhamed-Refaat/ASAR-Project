// blynk_esp_tst.ino
// Standalone ESP32 + Blynk mobile app validation sketch.
// Purpose:
// 1) Verify WiFi + Blynk connection.
// 2) Verify app controls on V0..V9 are received.
// 3) Verify telemetry widgets on V20..V25 update correctly.
//
// This test sketch does not require the Mega board.

#define BLYNK_TEMPLATE_ID   "TMPL26e3N-G_P"
#define BLYNK_TEMPLATE_NAME "Graduation Project"
#define BLYNK_AUTH_TOKEN    "X2NDFtjW3nsJ3ZvSmGIs7BDRG2QQRD1M"

#include <WiFi.h>
#include <BlynkSimpleEsp32.h>

static const char WIFI_SSID[] = "WE_B66E60";
static const char WIFI_PASS[] = "e48a22b3";

// Virtual pin mapping (aligned with main project):
// V0: Forward
// V1: Right Strafe
// V2: North East
// V3: South East
// V4: Rotate
// V5: Backward
// V6: Left Strafe
// V7: North West
// V8: South West
// V9: Stop
// V20: Left RPM display
// V21: Right RPM display
// V22: Left distance
// V23: Front distance
// V24: Right distance
// V25: Rear distance

BlynkTimer timer;

static bool cmdForward = false;
static bool cmdRightStrafe = false;
static bool cmdNorthEast = false;
static bool cmdSouthEast = false;
static bool cmdRotate = false;
static bool cmdBackward = false;
static bool cmdLeftStrafe = false;
static bool cmdNorthWest = false;
static bool cmdSouthWest = false;
static bool cmdStop = false;

static int simLeftRpm = 0;
static int simRightRpm = 0;
static int simDistL = 120;
static int simDistF = 100;
static int simDistR = 140;
static int simDistB = 110;
static int rpmStep = 15;
static int distStep = -3;

BLYNK_CONNECTED() {
  Serial.println("[BLYNK] Connected");
  Blynk.syncVirtual(V0, V1, V2, V3, V4, V5, V6, V7, V8, V9);
}

BLYNK_WRITE(V0) {
  cmdForward = (param.asInt() != 0);
  Serial.println(cmdForward ? "[APP] V0 Forward ON" : "[APP] V0 Forward OFF");
}

BLYNK_WRITE(V1) {
  cmdRightStrafe = (param.asInt() != 0);
  Serial.println(cmdRightStrafe ? "[APP] V1 Right Strafe ON" : "[APP] V1 Right Strafe OFF");
}

BLYNK_WRITE(V2) {
  cmdNorthEast = (param.asInt() != 0);
  Serial.println(cmdNorthEast ? "[APP] V2 North East ON" : "[APP] V2 North East OFF");
}

BLYNK_WRITE(V3) {
  cmdSouthEast = (param.asInt() != 0);
  Serial.println(cmdSouthEast ? "[APP] V3 South East ON" : "[APP] V3 South East OFF");
}

BLYNK_WRITE(V4) {
  cmdRotate = (param.asInt() != 0);
  Serial.println(cmdRotate ? "[APP] V4 Rotate ON" : "[APP] V4 Rotate OFF");
}

BLYNK_WRITE(V5) {
  cmdBackward = (param.asInt() != 0);
  Serial.println(cmdBackward ? "[APP] V5 Backward ON" : "[APP] V5 Backward OFF");
}

BLYNK_WRITE(V6) {
  cmdLeftStrafe = (param.asInt() != 0);
  Serial.println(cmdLeftStrafe ? "[APP] V6 Left Strafe ON" : "[APP] V6 Left Strafe OFF");
}

BLYNK_WRITE(V7) {
  cmdNorthWest = (param.asInt() != 0);
  Serial.println(cmdNorthWest ? "[APP] V7 North West ON" : "[APP] V7 North West OFF");
}

BLYNK_WRITE(V8) {
  cmdSouthWest = (param.asInt() != 0);
  Serial.println(cmdSouthWest ? "[APP] V8 South West ON" : "[APP] V8 South West OFF");
}

BLYNK_WRITE(V9) {
  cmdStop = (param.asInt() != 0);
  Serial.println(cmdStop ? "[APP] V9 Stop ON" : "[APP] V9 Stop OFF");
}

static void publishTelemetry() {
  // Simulated RPM ramp for widget validation.
  simLeftRpm += rpmStep;
  simRightRpm += rpmStep;
  if (simLeftRpm > 220 || simLeftRpm < -220) {
    rpmStep = -rpmStep;
  }

  // Simulated distances with bounce limits.
  simDistL += distStep;
  simDistF += distStep;
  simDistR += distStep;
  simDistB += distStep;
  if (simDistL < 20 || simDistL > 200) {
    distStep = -distStep;
  }

  Blynk.virtualWrite(V20, simLeftRpm);
  Blynk.virtualWrite(V21, simRightRpm);
  Blynk.virtualWrite(V22, simDistL);
  Blynk.virtualWrite(V23, simDistF);
  Blynk.virtualWrite(V24, simDistR);
  Blynk.virtualWrite(V25, simDistB);
}

static void publishStatus() {
  Serial.print("[STATUS] F="); Serial.print(cmdForward ? "1" : "0");
  Serial.print(" RS="); Serial.print(cmdRightStrafe ? "1" : "0");
  Serial.print(" NE="); Serial.print(cmdNorthEast ? "1" : "0");
  Serial.print(" SE="); Serial.print(cmdSouthEast ? "1" : "0");
  Serial.print(" ROT="); Serial.print(cmdRotate ? "1" : "0");
  Serial.print(" B="); Serial.print(cmdBackward ? "1" : "0");
  Serial.print(" LS="); Serial.print(cmdLeftStrafe ? "1" : "0");
  Serial.print(" NW="); Serial.print(cmdNorthWest ? "1" : "0");
  Serial.print(" SW="); Serial.print(cmdSouthWest ? "1" : "0");
  Serial.print(" STOP="); Serial.print(cmdStop ? "1" : "0");
  Serial.print(" RPM=");
  Serial.print(simLeftRpm);
  Serial.print(":");
  Serial.print(simRightRpm);
  Serial.print(" DIST(L:F:R:B)=");
  Serial.print(simDistL);
  Serial.print(":");
  Serial.print(simDistF);
  Serial.print(":");
  Serial.print(simDistR);
  Serial.print(":");
  Serial.println(simDistB);
}

void setup() {
  Serial.begin(115200);
  delay(100);

  Serial.println();
  Serial.println("=== ESP32 Blynk App Test ===");
  Serial.println("Upload this sketch to validate mobile controls and telemetry widgets.");

  Blynk.begin(BLYNK_AUTH_TOKEN, WIFI_SSID, WIFI_PASS);

  timer.setInterval(500L, publishTelemetry);
  timer.setInterval(1000L, publishStatus);
}

void loop() {
  Blynk.run();
  timer.run();
}
