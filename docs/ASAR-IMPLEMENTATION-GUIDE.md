# ASAR Control Station — Implementation Guide for Blynk Builder

**Date**: May 13, 2026  
**Version**: 1.0 — Ready for Blynk Builder Implementation  
**Target**: Create a state-of-the-art mobile dashboard for the ESP32+Mega 4WD robot

---

## Quick Start: Widget Checklist

This checklist shows **exactly which widgets to add** to your Blynk project in the correct order.

### **Status Bar Section** (Top, Fixed Height)

| # | Widget Name | Virtual Pin | Type | Config Notes |
|---|---|---|---|---|
| 1 | Dashboard Title | – | Text/Label | Text: "ASAR Control Station" |
| 2 | System Status | – | Label | Dynamic: Shows "🟢 SYSTEM READY" / "🟡 STALE" / "🔴 BLOCKED" |
| 3 | WiFi Indicator | – | Icon/LED | Dynamic: Green (connected), Red (offline) |
| 4 | Age Badge | – | Label | Dynamic: "Last update: 0.2s ago" |

---

### **Control Section** (Primary Interaction Zone)

| # | Widget Name | Virtual Pin | Type | Size | Color | Config Notes |
|---|---|---|---|---|---|---|
| 5 | **STOP Button** | V2 | Button (Momentary) | 160×80 px | Red (#FF4444) | Text: "🛑 STOP" — Always visible, one-tap |
| 6 | **HORN Button** | V3 | Button (Momentary) | 160×80 px | Dark (#333333) | Text: "🔊 HORN" — Below STOP |
| 7 | **Drive Vector (Joystick)** | V0 (X), V1 (Y) | Joystick (XY) | 240×240 px | Cyan outline, blue fill | Deadband: 10%, Centered, ±100 range |
| 8 | **Left Speed Display** | – | Label | 80 px wide | Gray | Dynamic text: "LEFT: -120" (updates with joystick) |
| 9 | **Right Speed Display** | – | Label | 80 px wide | Gray | Dynamic text: "RIGHT: 160" (updates with joystick) |

---

### **Quick Reference Distance Row** (Secondary Control Feedback)

| # | Widget Name | Virtual Pin | Type | Display Format | Color Logic |
|---|---|---|---|---|---|
| 10 | Distance Row Label | – | Text | "⚠️ DISTANCE AWARENESS" | Gray |
| 11 | Front Dist Quick Ref | V6 (linked) | Label | "F: 1.2m" | Red if <30cm; Yellow if 30-40; Gray if >40 |
| 12 | Left Dist Quick Ref | V9 (linked) | Label | "L: 0.8m" | Gray (informational) |
| 13 | Right Dist Quick Ref | V7 (linked) | Label | "R: 2.1m" | Gray (informational) |
| 14 | Rear Dist Quick Ref | V8 (linked) | Label | "B: 4.5m" | Gray (informational) |

---

### **Telemetry Section** (Scrollable, Below Primary Controls)

#### **RPM Cards** (2 cards, side-by-side or stacked)

| # | Widget Name | Virtual Pin | Type | Range | Color | Update Rate | Notes |
|---|---|---|---|---|---|---|---|
| 15 | **LEFT RPM Card** | V4 | Gauge + Value | 0–3000 rev/min | Green→Yellow→Red gradient | ~200ms | Shows numeric + gauge bar |
| 16 | **RIGHT RPM Card** | V5 | Gauge + Value | 0–3000 rev/min | Green→Yellow→Red gradient | ~200ms | Shows numeric + gauge bar |

#### **Distance Awareness Card** (Spatial Diagram)

| # | Widget Name | Virtual Pins | Type | Display | Notes |
|---|---|---|---|---|---|
| 17 | **Distance Diagram** | V6, V7, V8, V9 | Custom or Grid | Spatial L/F/R/B layout with robot symbol in center | Shows all 4 ultrasonic readings in physical orientation |
| 18 | **Front Dist (Main)** | V6 | Gauge + Value | "1.2 m" | Red background if <30cm; yellow if 30–40; normal if >40 |
| 19 | **Right Dist (Main)** | V7 | Gauge + Value | "2.1 m" | Gray (informational) |
| 20 | **Rear Dist (Main)** | V8 | Gauge + Value | "4.5 m" | Gray (informational) |
| 21 | **Left Dist (Main)** | V9 | Gauge + Value | "0.8 m" | Gray (informational) |

#### **System Health Card** (Optional but Recommended)

| # | Widget Name | Virtual Pins | Type | Display | Notes |
|---|---|---|---|---|---|
| 22 | **WiFi Signal Display** | – | Label | "WiFi: ▓▓▓▓░ (Good)" | Dynamic based on connection strength |
| 23 | **Mega Link Status** | – | LED/Icon | Green: Connected, Red: Offline | Indicates UART handshake status |
| 24 | **Last UART Update** | – | Label | "Last UART: 0.1s ago" | Timestamp of last telemetry reception |

---

## Step-by-Step Implementation in Blynk Builder

### **Phase 1: Create Dashboard Structure** (5 minutes)

1. Open Blynk Console → Navigate to **Dashboards**
2. Click **"+ Create Dashboard"** → Name it **"ASAR Control Station"**
3. Select **Mobile Layout** (portrait)
4. Choose **Dark Theme** (recommended for outdoor visibility)

### **Phase 2: Add Status Bar** (5 minutes)

1. Add **Text/Label widget** at the very top
   - Text: "ASAR Control Station"
   - Font: Bold, 20px, white
   - No virtual pin (static)

2. Add **Status LED or Icon widget** (right side of title)
   - Virtual Pin: None (manual update from ESP32 logic)
   - Dynamic text showing: "🟢 SYSTEM READY" / "🟡 STALE" / "🔴 BLOCKED"

3. Add **Age Badge Label** (below title)
   - Virtual Pin: None (ESP32 app code updates this label)
   - Text: "Last update: 0.2s ago"
   - Font: 12px gray

### **Phase 3: Add Control Widgets** (10 minutes)

1. **Add STOP Button**
   - Virtual Pin: **V2**
   - Type: Button (Momentary)
   - Label: "🛑 STOP"
   - Size: 160×80 px (large, thumb-friendly)
   - Color: Red (#FF4444)
   - Text color: White
   - Position: Top-left, always visible

2. **Add HORN Button**
   - Virtual Pin: **V3**
   - Type: Button (Momentary)
   - Label: "🔊 HORN"
   - Size: 160×80 px
   - Color: Dark gray (#333333)
   - Text color: White
   - Position: Below STOP button

3. **Add Joystick (Drive Vector Control)**
   - Virtual Pin: **V0** (X-axis: steering) and **V1** (Y-axis: forward/reverse)
   - Type: Joystick XY
   - Size: 240×240 px (centered, dominates middle area)
   - Deadband: 10%
   - Range: ±100 (or ±255, depending on Blynk version)
   - Color: Cyan outline, blue knob
   - Position: Center of screen

4. **Add Speed Feedback Labels** (below joystick)
   - Create two **Label widgets** side-by-side
   - Left: "LEFT CMD: -120" (dynamic)
   - Right: "RIGHT CMD: 160" (dynamic)
   - Font: Bold, 14px, gray
   - Update from ESP32 app code (not from Mega; shows user intent)

5. **Add Quick-Ref Distance Row**
   - Create **4 small Labels** in a row below the speed feedback
   - Example: "F: 1.2m | L: 0.8m | R: 2.1m | B: 4.5m"
   - Font: 12px
   - Color logic: Front distance (V6) turns **red if <30cm**, else **gray**

### **Phase 4: Add Telemetry Cards** (Scrollable Section, 10 minutes)

1. **RPM Gauge Cards**
   - **Left RPM (V4)**
     - Type: Gauge + Value label
     - Min: 0, Max: 3000, Units: "rev/min"
     - Color: Green (0–800) → Yellow (800–2000) → Red (2000+)
     - Display: Large numeric value + gauge bar
   
   - **Right RPM (V5)**
     - Same config as Left RPM

2. **Distance Gauge Cards**
   - **Front Distance (V6)**
     - Type: Gauge + Value label
     - Min: 0, Max: 400, Units: "cm" (or "m" with decimal)
     - Color: **Red if value <30**, **Yellow if 30–40**, **Gray if >40**
     - Display: Large numeric + obstacle warning text if <30
   
   - **Left Distance (V9)**
     - Type: Gauge + Value label
     - Min: 0, Max: 400, Units: "cm"
     - Color: Gray
   
   - **Right Distance (V7)**
     - Type: Gauge + Value label
     - Min: 0, Max: 400, Units: "cm"
     - Color: Gray
   
   - **Rear Distance (V8)**
     - Type: Gauge + Value label
     - Min: 0, Max: 400, Units: "cm"
     - Color: Gray

3. **Optional System Health Card**
   - Add a **Text/Label widget** showing:
     ```
     WiFi: ▓▓▓▓░ (Good)
     Mega Link: ✓ Active
     Last UART: 0.1s ago
     ```
   - Update dynamically from ESP32 app code

### **Phase 5: Layout & Spacing** (5 minutes)

**Mobile Portrait Layout Order (top to bottom)**:
```
┌────────────────────────────┐
│ ASAR Control Station  🔗 ✓  │ ← Status bar (Zone A)
│ 🟢 SYSTEM READY | 0.2s ago  │
├────────────────────────────┤
│  🛑 STOP    🔊 HORN        │ ← Critical controls (Zone B)
├────────────────────────────┤
│                            │
│     [Joystick Here]        │ ← Primary control
│                            │
│   LEFT: -120  RIGHT: 160   │ ← Speed feedback
├────────────────────────────┤
│ ⚠️ F:1.2m | L:0.8m |...   │ ← Quick-ref distances
├────────────────────────────┤
│  LEFT RPM                  │ ← Telemetry cards (scrollable)
│  1,240 rev/min ████████░░  │
│  Last: 0.2s ago [LIVE]     │
├────────────────────────────┤
│  RIGHT RPM                 │
│  1,245 rev/min ████████░░  │
│  Last: 0.2s ago [LIVE]     │
├────────────────────────────┤
│  FRONT DISTANCE            │
│  1.2 m (Red if <30cm)      │
├────────────────────────────┤
│  (More distance cards...)  │
└────────────────────────────┘
```

**Responsive Design Rules**:
- STOP button always top-left (fixed position if possible)
- Joystick always centered and thumb-reachable
- Telemetry section: scrollable, no fixed height
- On larger phones (6"+), cards can be side-by-side
- On tablets: Consider landscape mode (future enhancement)

---

## Dynamic Updates from ESP32 App Code

Once widgets are placed, the **ESP32 firmware** must send values and update labels dynamically:

### **ESP32 Must Update These (Every 50–200ms)**:
```
Blynk.virtualWrite(V0, joystickX);      // Joystick X (steering)
Blynk.virtualWrite(V1, joystickY);      // Joystick Y (fwd/back)
Blynk.virtualWrite(V4, leftRPM);        // Left RPM (from Mega)
Blynk.virtualWrite(V5, rightRPM);       // Right RPM (from Mega)
Blynk.virtualWrite(V6, frontDist);      // Front distance (from Mega)
Blynk.virtualWrite(V7, rightDist);      // Right distance (from Mega)
Blynk.virtualWrite(V8, rearDist);       // Rear distance (from Mega)
Blynk.virtualWrite(V9, leftDist);       // Left distance (from Mega)
```

### **ESP32 App Code Must Also Update (Dynamic Labels)**:
```cpp
// Update status badge (called periodically)
if (telemetryAge > 2000) {
  setProperty(V0, "color", "#FF4444");  // Red border on joystick
  blynk.setProperty(V_STATUS_BADGE, "text", "🟡 STALE — Reconnecting...");
} else {
  setProperty(V0, "color", "#00FF00");  // Green border on joystick
  blynk.setProperty(V_STATUS_BADGE, "text", "🟢 SYSTEM READY");
}

// Update age badge
int ageSeconds = (millis() - lastTelemetryTime) / 1000;
blynk.setProperty(V_AGE_BADGE, "text", String(ageSeconds) + "s ago");

// Update speed feedback (from joystick input)
blynk.setProperty(V_LEFT_CMD_LABEL, "text", "LEFT: " + String(leftMotorSpeed));
blynk.setProperty(V_RIGHT_CMD_LABEL, "text", "RIGHT: " + String(rightMotorSpeed));

// Color-code front distance
if (frontDist < 30) {
  setProperty(V6, "color", "#FF0000");  // Red
  blynk.setProperty(V6, "text", "⚠️ BLOCKED");
} else if (frontDist < 40) {
  setProperty(V6, "color", "#FFFF00");  // Yellow
  blynk.setProperty(V6, "text", "⚠️ CAUTION");
} else {
  setProperty(V6, "color", "#CCCCCC");  // Gray
  blynk.setProperty(V6, "text", "");
}
```

---

## Chrome DevTools Verification Guide

Once you've built the dashboard in Blynk, use **Chrome DevTools** to inject virtual pin values and verify behavior.

### **Open DevTools & Blynk Console**

1. Open the Blynk dashboard in **Chrome** (not mobile app)
2. Press **F12** to open **Chrome DevTools**
3. Click **Console** tab
4. You should see Blynk debug messages

### **Test Case 1: Verify Widget Connections (Baseline)**

```javascript
// Check if Blynk is initialized
console.log(Blynk);

// Simulate receiving data from Mega (inject telemetry)
Blynk.virtualWrite(4, 1240);     // LEFT RPM = 1240
Blynk.virtualWrite(5, 1245);     // RIGHT RPM = 1245
Blynk.virtualWrite(6, 120);      // FRONT DIST = 120cm
Blynk.virtualWrite(7, 210);      // RIGHT DIST = 210cm
Blynk.virtualWrite(8, 450);      // REAR DIST = 450cm
Blynk.virtualWrite(9, 80);       // LEFT DIST = 80cm
```

**Expected Result**:
- All telemetry cards update with values
- RPM gauges show ~1240 rev/min
- Distance values display correctly
- Status badge shows 🟢 "SYSTEM READY"

---

### **Test Case 2: Joystick Differential Calculation**

```javascript
// Simulate forward motion (joystick at center-top)
// Y=100 (forward), X=0 (straight)
// Expected: left=100, right=100

Blynk.virtualWrite(1, 100);      // Y = forward
Blynk.virtualWrite(0, 0);        // X = straight
// Verify ESP32 sends: SPD:100:100\n to Mega
console.log("Expected UART: SPD:100:100");

// Simulate right turn (Y=100, X=50)
// Expected: left=150, right=75
Blynk.virtualWrite(0, 50);       // X = turn right
console.log("Expected UART: SPD:125:75");  // (Y + X/2) : (Y - X/2)
```

**Expected Result**:
- Speed feedback labels update: "LEFT: 125", "RIGHT: 75"
- ESP32 sends differential speeds to Mega
- Confirm in serial monitor (if accessible)

---

### **Test Case 3: Stale Telemetry Detection**

```javascript
// Send initial telemetry
Blynk.virtualWrite(4, 1240);
Blynk.virtualWrite(5, 1245);
console.log("Telemetry sent at:", new Date().toLocaleTimeString());

// Wait 2+ seconds WITHOUT sending updates
// Expected: Age badge changes, status goes yellow, joystick dims to 50% opacity

// After 2 seconds, refresh data
setTimeout(() => {
  Blynk.virtualWrite(4, 1250);
  Blynk.virtualWrite(5, 1250);
  console.log("Telemetry refreshed at:", new Date().toLocaleTimeString());
  // Expected: Badge returns to green [LIVE], joystick returns to full opacity
}, 2100);
```

**Expected Behavior**:
- **0–1.5s**: Status green 🟢, age badge shows "0.1s ago", joystick 100% opacity
- **1.5–2.0s**: Status yellow 🟡 "STALE", age badge shows "1.8s ago"
- **2.0+s**: Joystick dims to 50% opacity (soft lockout); shows tooltip "Telemetry stale"
- **After refresh**: Immediately returns to green with fresh age badge

---

### **Test Case 4: Obstacle Detection (Front Distance <30cm)**

```javascript
// Safe approach
Blynk.virtualWrite(6, 80);       // FRONT DIST = 80cm
// Expected: Gray text, no warning

// Caution zone
Blynk.virtualWrite(6, 35);       // FRONT DIST = 35cm
// Expected: FRONT DIST card turns yellow (#FFD700), text slightly larger

// Blocked zone
Blynk.virtualWrite(6, 20);       // FRONT DIST = 20cm
// Expected: FRONT DIST card turns RED (#FF0000), pulsing
// Joystick becomes hard-disabled (red outline, cannot accept forward command)
// Status badge: 🔴 "BLOCKED: Obstacle ahead (<30cm)"

// Recovery
Blynk.virtualWrite(6, 45);       // FRONT DIST = 45cm (> 40cm recovery threshold)
// Expected: Status returns to green, joystick re-enabled, card returns to gray
```

**Expected Result**:
- Color-coding works correctly based on distance thresholds
- Joystick disable/enable transitions are smooth
- Status message is clear and actionable

---

### **Test Case 5: STOP Button Behavior**

```javascript
// Simulate motion
Blynk.virtualWrite(4, 1240);
Blynk.virtualWrite(5, 1200);

// User clicks STOP button (trigger V2 press event)
// Expected behavior:
// 1. RPM values drop to 0 within 500ms
// 2. Joystick visually centers (if possible to reset)
// 3. Status flashes red briefly, then returns to 🟢
// 4. Verify UART: STOP\n sent to Mega
// 5. Motor should stop immediately on Mega side

// Verify via console
Blynk.virtualWrite(4, 0);        // LEFT RPM = 0
Blynk.virtualWrite(5, 0);        // RIGHT RPM = 0
console.log("STOP command verified: motors halted");
```

---

### **Test Case 6: HORN Button**

```javascript
// Press HORN button (V3)
// Expected:
// 1. Buzzer activates on Mega for 500ms
// 2. Visual feedback: HORN button flashes or shows progress ring
// 3. Verify UART: HORN\n sent to Mega
// 4. Audio feedback (if speaker connected to Mega)

// Simulate in DevTools
console.log("HORN pressed - verify audio + UART in Mega serial monitor");
```

---

### **Test Case 7: WiFi Disconnect / Reconnect**

```javascript
// Simulate disconnect (Blynk console loses connection)
// Expected:
// 1. All controls gray out (disabled)
// 2. Status: 🔴 "OFFLINE — Reconnecting..."
// 3. Age badge frozen at last value
// 4. Joystick locked

// Simulate reconnect
// Expected:
// 1. Status: 🟢 "IDLE" (waiting for START)
// 2. Age badge updates: "0.2s ago"
// 3. Controls remain slightly disabled until Mega sends RDY

// After START handshake succeeds
// Expected:
// 1. Status: 🟢 "SYSTEM READY"
// 2. All controls fully enabled
// 3. Telemetry flowing
```

---

### **Test Case 8: Age Badge Real-Time Increment**

```javascript
// Send one telemetry update
Blynk.virtualWrite(4, 1240);
// Age badge should show: "Last: 0.0s ago"

// Let timer run (do NOT send more updates)
// Expected increments:
// 0.0s → 0.1s → 0.2s → 0.5s → 1.0s → 1.5s → 1.8s → 2.0s (turns yellow)

// Verify in DevTools
setInterval(() => {
  console.log("Age badge should show:", Math.floor(Date.now() / 100) / 10, "s ago");
}, 100);
```

---

## Final Validation Checklist

Before declaring the dashboard complete, verify:

- [ ] **STOP button** always visible, one-tap, high contrast red
- [ ] **Joystick** centered, thumb-friendly, ±100 range
- [ ] **RPM gauges** update every 200ms, smooth animation
- [ ] **Distance cards** color-code red (<30), yellow (30–40), gray (>40)
- [ ] **Age badge** increments every 100ms, updates correctly
- [ ] **Status badge** transitions: 🟢 → 🟡 → 🔴 with clear reasons
- [ ] **Telemetry fresh/stale** detection works at 2-second threshold
- [ ] **Obstacle lockout** disables joystick when front <30cm
- [ ] **Speed feedback** shows real-time left/right differential
- [ ] **Mobile layout** passes one-hand thumb-reach test
- [ ] **No ambiguous** disabled states; all reasons visible
- [ ] **UART protocol** messages match firmware contract (no new commands)

---

## Deployment Checklist

Once all tests pass:

1. **Export Dashboard JSON** from Blynk builder (Settings → Export)
2. **Commit to repo**: Save JSON to `docs/blynk-asar-dashboard.json`
3. **Document in README**: Add reference to ASAR-CONTROL-STATION-DESIGN.md
4. **Firmware sync**: Verify ESP32 parses V0–V9 correctly
5. **Test end-to-end**: Hardware → ESP32 → Blynk → Mobile view → Hardware feedback loop
6. **Production ready**: Tag release with dashboard version

---

## Reference

- **Design Spec**: [ASAR-CONTROL-STATION-DESIGN.md](ASAR-CONTROL-STATION-DESIGN.md)
- **Firmware Spec**: [03-uart-protocol-spec.md](spec-kit/03-uart-protocol-spec.md)
- **Project Instructions**: [copilot-instructions.md](../.github/copilot-instructions.md)
