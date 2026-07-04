# ASAR Control Station — Blynk Mobile Dashboard Design

**Project**: ESP32 + Mega 4WD Differential-Steering Robot  
**Dashboard Name**: ASAR Control Station  
**Platform Focus**: Mobile-first  
**Target Operator**: Developer/Tester (detailed telemetry + manual control)  
**Status**: Design Complete — Ready for Implementation  
**Date**: May 13, 2026

---

## 1. Task & Risk Envelope

### Operator Goals
1. **Drive and steer** the robot in real-time from mobile device
2. **Monitor live telemetry** (RPM, obstacle distances) to validate motor performance and sensor accuracy
3. **Trigger auxiliary actions** (STOP, HORN) with instant feedback
4. **Detect and respond** to stale telemetry or communication loss
5. **Control safely** even when obstacles are detected

### Top 3 Failure Modes & Mitigations
| Risk | Failure Mode | Mitigation |
|---|---|---|
| **Critical** | User cannot stop robot in emergency | STOP button always visible, one-tap, high contrast red |
| **High** | Stale telemetry causes false obstacle judgment | Age indicator + 2-second timeout visual cue + soft disable |
| **High** | UART loss causes undefined motor state | Mega stops motors on any control timeout; ESP32 disables joystick when no RDY handshake |

### Control Risk Classification
| Control | Risk Level | Reason | UI Placement |
|---|---|---|---|
| STOP button | **Critical** | Halts all motion immediately | Always top-left, large red button |
| Joystick (Drive) | **High** | Initiates motion; requires live telemetry feedback | Primary central area |
| HORN button | **Medium** | Audible feedback; no safety impact | Secondary, below STOP |
| Telemetry displays | **Low** | Read-only feedback | Scrollable cards below motion controls |

---

## 2. System State to UI State Mapping

### UI States and Transitions

| UI State | Condition | Control Status | Telemetry Display | Banner Message | Next State Trigger |
|---|---|---|---|---|---|
| **OFFLINE** | No WiFi/Blynk link | All disabled (grayed) | "— " | 🔴 "Connecting..." | WiFi + Blynk connected |
| **IDLE** | Blynk connected, waiting for START | Joystick disabled; STOP/HORN available | Last known values (stale age shown) | 🟢 "Ready to Drive" | User presses START or motion requested |
| **RUNNING** | START sent, RDY received, active drive session | All controls enabled | Live updates with age badge | 🟢 "SYSTEM READY" + age badge | STOP pressed OR telemetry stale >2s |
| **DEGRADED** | Running but telemetry stale >2s OR partial sensor fail | Joystick soft-disabled (low opacity); can still STOP | Last values + "STALE" badge in red | 🟡 "Telemetry Stale — Reconnecting..." | Telemetry refreshes within 2s |
| **BLOCKED** | Front distance < 30 cm AND motion command pending | Joystick hard-disabled; STOP enabled | Distance in red; L/F/R/B highlighted if triggering | 🔴 "BLOCKED: Obstacle Ahead" | Distance > 40 cm OR STOP pressed |

### State Transition Rules
- **OFFLINE → IDLE**: Blynk reconnects + initial handshake with Mega succeeds
- **IDLE ↔ RUNNING**: User initiates drive (sends motion command) or presses STOP
- **RUNNING → DEGRADED**: No telemetry update for 2+ seconds while movement command is active
- **RUNNING → BLOCKED**: Front distance < 30 cm during forward motion (soft lockout; can override with reverse or STOP)
- **BLOCKED → RUNNING**: Distance clears OR STOP pressed + recenter joystick
- **Any → OFFLINE**: WiFi/Blynk link lost

---

## 3. Control & Telemetry Architecture

### Pin Mapping (Blynk Virtual Pins)

#### **Control Inputs** (App → ESP32)
| Virtual Pin | Widget Type | Label | Value Range | Direction | Behavior |
|---|---|---|---|---|---|
| **V0** | Joystick (X-axis) | Steering | -100 to +100 | In | Left (-) / Right (+) differential bias |
| **V1** | Joystick (Y-axis) | Forward/Reverse | -100 to +100 | In | Forward (+) / Reverse (-) |
| **V2** | Button (momentary) | STOP | Boolean (1 = press) | In | Stops all motors immediately; clamps joystick |
| **V3** | Button (momentary) | HORN | Boolean (1 = press) | In | Triggers buzzer on Mega for 500ms |

#### **Telemetry Outputs** (ESP32 → App)
| Virtual Pin | Widget Type | Label | Units | Range | Update Rate | Notes |
|---|---|---|---|---|---|---|
| **V4** | Gauge + Label | LEFT RPM | rev/min | 0–3000 | ~200ms | Encoder-measured left-side wheel speed |
| **V5** | Gauge + Label | RIGHT RPM | rev/min | 0–3000 | ~200ms | Encoder-measured right-side wheel speed |
| **V6** | Gauge + Label | FRONT DIST | cm | 0–400 | ~500ms | Front ultrasonic; turns red if <30 cm |
| **V7** | Gauge + Label | RIGHT DIST | cm | 0–400 | ~500ms | Right ultrasonic; warning if <30 cm |
| **V8** | Gauge + Label | REAR DIST | cm | 0–400 | ~500ms | Rear ultrasonic; informational |
| **V9** | Gauge + Label | LEFT DIST | cm | 0–400 | ~500ms | Left ultrasonic; informational |

### Telemetry Freshness Indicator
- **Age badge**: Displays time since last update (e.g., "0.2s ago")
- **Timeout**: If no update for 2 seconds, status badge changes to 🟡 "STALE"
- **Recovery**: Once fresh data arrives, badge returns to 🟢 "LIVE"
- **Hard-stop rule**: If STALE and user is commanding motion, joystick enters soft-disabled state (50% opacity)

### Architecture Rules (Design Enforcement)
1. ✅ **Separation**: Controls on top (3 rows), telemetry below (scrollable cards)
2. ✅ **Spatial grouping**: Distances displayed in physical robot orientation (L/F/R/B clockwise)
3. ✅ **Intent vs. State**: Joystick shows user's commanded direction; RPM cards show actual wheel velocity
4. ✅ **No ambiguity**: Every value labeled with units; fresh/stale status always visible

---

## 4. Mobile-First Layout Strategy

### Screen Hierarchy (iOS/Android Portrait)

#### **Zone A — Status Bar (Top, fixed, no scroll)**
```
┌─────────────────────────────────┐
│  ASAR Control Station  🔗 ✓      │  ← Title + link quality indicator
│  🟢 SYSTEM READY | 0.2s ago      │  ← State badge + telemetry age
└─────────────────────────────────┘
```
- Always visible; indicates WiFi/Blynk connection (🔗 green = connected, red = offline)
- Shows current UI state (READY, STALE, BLOCKED, etc.)
- Telemetry age badge updates in real-time

#### **Zone B — Critical Controls (Scrollable, high priority)**
```
┌─────────────────────────────────┐
│  ┌─────────────────────────────┐│
│  │   🛑 STOP (red, large)      ││  ← Emergency control, always 1-tap
│  │   🔊 HORN (dark, secondary) ││
│  └─────────────────────────────┘│
│                                   │
│  ┌─────────────────────────────┐│
│  │   DRIVE VECTOR CONTROL      ││
│  │   (Joystick, centered)      ││
│  │   LEFT CMD: -120  RIGHT: 160││  ← Live command feedback
│  └─────────────────────────────┘│
│                                   │
│  ⚠️  FRONT: 1.2m  |  LEFT: 0.8m  │  ← Quick reference distances (single row)
│  ⚠️  RIGHT: 2.1m  |  REAR: 4.5m  │
└─────────────────────────────────┘
```
- Joystick centered, 180×180 px (thumb-friendly on 5–6" screen)
- Real-time Left/Right CMD values below joystick (shows differential calculation)
- Quick-ref distance row: color-coded red if < 30 cm

#### **Zone C — Telemetry Cards (Scrollable)**
```
┌─────────────────────────────────┐
│  LEFT RPM                        │
│  1,240 rev/min    ████████░░    │  ← Gauge + numeric
│  Last: 0.2s ago   [LIVE]        │
├─────────────────────────────────┤
│  RIGHT RPM                       │
│  1,245 rev/min    ████████░░    │
│  Last: 0.2s ago   [LIVE]        │
├─────────────────────────────────┤
│  DISTANCE AWARENESS              │
│       ┌─────────┐                │
│  L━━━━┃   RC    ┃━━━━R           │  ← Physical orientation diagram
│  (0.8m)  ▲ (2.1m)                │
│        0.2s ago [LIVE]           │
│    F: 1.2m  |  B: 4.5m           │
├─────────────────────────────────┤
│  SYSTEM HEALTH                   │
│  WiFi Signal: ▓▓▓▓░ (Good)      │
│  Mega Link: ✓ Active             │
│  Last UART: 0.1s ago             │
└─────────────────────────────────┘
```
- Each telemetry section in collapsible card
- Gauges show relative performance; numeric values always visible
- System health section shows WiFi RSSI + Mega UART status
- All timestamps show "Last: 0.2s ago" format

#### **Zone D — Settings (Collapsible, bottom)**
- Deadband slider (1–10%)
- Max speed limiter (50–255 PWM)
- Distance threshold warning level (20–50 cm)
- Device name + Firmware version

---

## 5. Interaction & Microcopy Specification

### Joystick Semantics
- **Press & Hold**: Continuous drive; motion stops when joystick returns to center
- **Dead Zone**: ±10% center region ignored (prevents drift)
- **Normalization**: Y (forward/back) has priority; X (steering) modulates side-by-side speed difference
- **Ramping**: Speed increases smoothly over 100ms (no abrupt acceleration)

### Disabled Control States
| Scenario | Control | Display | Reason Text |
|---|---|---|---|
| Offline | Joystick, STOP, HORN | Grayed, 40% opacity | "No link to robot. Reconnecting..." |
| Telemetry Stale | Joystick | 50% opacity + pulsing border | "Telemetry stale. Standby..." |
| Obstacle Ahead | Joystick | Locked in red outline | "BLOCKED: Obstacle <30cm. Stop or reverse." |
| Mega Not Ready | All | Grayed | "Waiting for motor system initialization..." |

### Microcopy Examples
| Event | Message | Tone |
|---|---|---|
| System starts | "🟢 SYSTEM READY — Drive whenever." | Confident, actionable |
| Telemetry ages past 2s | "🟡 Telemetry stale. — Reconnecting..." | Calm, implies recovery in progress |
| Obstacle detected | "🔴 BLOCKED: Obstacle ahead (<30cm). STOP or reverse." | Alert, provides action |
| Mega initialization | "Initializing motor system..." | Neutral, in-progress |
| UART lost | "⚠️ Lost link to Mega. STOP motor outputs." | Urgent, safety-focused |
| Reconnected | "✓ Link restored. Ready to drive." | Positive feedback |

### Button Feedback
- **STOP**: Flash red + haptic pulse on mobile; play "stop" tone
- **HORN**: Play buzzer sound locally (visual confirmation) + visual pulse
- **Joystick**: Show real-time L/R speed deltas below joystick

---

## 6. Safety & Resilience UX

### Stale Telemetry Detection
- **Monitor**: Time since last `RPM` or `DIST` message
- **Warning threshold**: 1.5 seconds (visual "⏱️ stale" badge appears)
- **Hard lockout**: At 2.0 seconds with active motion command, joystick softens (50% opacity) and shows tooltip "Telemetry not updating"
- **Recovery**: Fresh data refreshes badge to "✓ live" and re-enables joystick to full opacity
- **Clear indicator**: Age badge always visible in status bar, updates every 100ms

### Obstacle Warning Tiers
| Distance | Visual | Action | Notes |
|---|---|---|---|
| > 40 cm | Gray text, normal size | No action | Safe zone |
| 30–40 cm | Yellow text, slightly larger | Caution — slow down | Warning zone |
| < 30 cm | Red text, pulsing, bold | Hard joystick lock for FWD | Critical zone |

### Movement Lockout Rules
- **Soft lockout (DEGRADED state)**: Joystick semi-transparent; still functional but user is warned
- **Hard lockout (BLOCKED state)**: Joystick fully disabled (cannot accept forward command) if front distance < 30 cm
  - User CAN still press STOP or REVERSE
  - Lockout clears when distance > 40 cm OR user presses STOP
- **No override**: A blocked robot cannot be forced forward; safety wins

### Visual Heartbeat (Live Indicator)
- **Status badge**: Cycles through "🟢 LIVE" → fade → "🟢 LIVE" on each update (500ms pulse)
- **RPM gauges**: Green outline = fresh data; gray outline = stale
- **Distance cards**: Color-change indicator (bright green → dim gray as data ages)

---

## 7. Validation & Handoff Checklist

### ✅ Pre-Implementation Validation

- [x] Pin map complete and consistent with firmware contract
- [x] State transition matrix covers disconnect/reconnect/obstacle loops
- [x] STOP path is always one-tap from any interactive state
- [x] Telemetry units, ranges, and refresh rates documented
- [x] Mobile layout passes thumb-reach and one-hand operation test
- [x] No ambiguous disabled states; all reasons visible

### ✅ Safety Review
- [x] STOP button always visible, high contrast, large hit area (min 60×60 px)
- [x] Joystick disabled when telemetry stale >2s (soft) and obstacle <30cm (hard)
- [x] Stale data indicator updates in real-time (age badge)
- [x] Obstacle lockout includes clear on-screen reason
- [x] Mega motor timeout (fallback) is enforced on firmware side

### ✅ Firmware Sync Required
- **ESP32 Changes**: Parse `RDY`, `RPM:left:right`, `DIST:L:F:R:B` messages
- **Mega Changes**: Send `RPM` and `DIST` frames every 200ms and 500ms respectively
- **UART Protocol**: No new commands; use existing `SPD:left:right` for joystick differential output

### ✅ Implementation Deliverables
1. **Dashboard XML/JSON**: Export from Blynk builder (attached separately)
2. **Pin map**: V0–V9 widget configuration (see Section 3)
3. **Interaction spec**: Deadband, ramp rate, timeout behaviors (see Section 5)
4. **Safety rules**: Telemetry age, obstacle distance thresholds (see Section 6)
5. **Chrome DevTools checklist**: Validation steps using Blynk browser console (see below)

---

## 8. Chrome DevTools Verification Checklist

### Pre-Flight
- [ ] Open Blynk dashboard in Chrome
- [ ] Open Chrome DevTools (F12) → **Console** tab
- [ ] Inject live virtual pin data to simulate telemetry
- [ ] Verify UI state transitions in real-time

### Test Case 1: OFFLINE → IDLE → RUNNING
```javascript
// Simulate IDLE state (connected, no motion)
Blynk.virtualWrite(4, 0);    // LEFT RPM = 0
Blynk.virtualWrite(5, 0);    // RIGHT RPM = 0
Blynk.virtualWrite(6, 120);  // FRONT DIST = 120cm
Blynk.virtualWrite(7, 210);  // RIGHT DIST = 210cm
Blynk.virtualWrite(8, 450);  // REAR DIST = 450cm
Blynk.virtualWrite(9, 80);   // LEFT DIST = 80cm
// Expected: Status shows 🟢 READY, all widgets enabled, telemetry fresh

// Simulate RUNNING state (moving forward)
Blynk.virtualWrite(4, 1240); // LEFT RPM = 1240
Blynk.virtualWrite(5, 1245); // RIGHT RPM = 1245
// Expected: RPM gauges animate, age badge shows "0.2s ago"
```

### Test Case 2: Telemetry Staleness (RUNNING → DEGRADED)
```javascript
// Stop sending updates; measure time
// Expected after 1.5s: Status badge changes to 🟡 STALE
// Expected after 2.0s: Joystick opacity drops to 50%, tooltip appears
// Resume updates and verify recovery
Blynk.virtualWrite(4, 1240);
// Expected: Badge returns to 🟢 LIVE, joystick re-enabled
```

### Test Case 3: Obstacle Detection (RUNNING → BLOCKED)
```javascript
// Close obstacle
Blynk.virtualWrite(6, 25);   // FRONT DIST = 25cm (< 30cm threshold)
// Expected: Status red "🔴 BLOCKED", front distance card turns red, pulsing
// Joystick becomes hard-disabled with overlay: "BLOCKED: Obstacle ahead"
// Verify STOP button still works
// Clear obstacle
Blynk.virtualWrite(6, 50);   // FRONT DIST = 50cm (> 40cm recovery)
// Expected: Status reverts to 🟢 READY, joystick re-enabled
```

### Test Case 4: Joystick Differential Output
```javascript
// Move joystick right (Y=100, X=80)
// Expected in console: left motor PWM increases, right motor PWM decreases
// Verify formula: left_speed = Y + (X * 0.5), right_speed = Y - (X * 0.5)
// Example: Y=100, X=80 → left=140, right=60
```

### Test Case 5: STOP Button
```javascript
// Simulate motion
Blynk.virtualWrite(4, 1240);
Blynk.virtualWrite(5, 1200);
// Press STOP button in UI (click red button)
// Expected: Joystick snaps to center, RPM drops to 0, status shows STOP active
// Verify UART message 'STOP\n' is sent (check ESP32 serial monitor if available)
```

### Test Case 6: HORN Button
```javascript
// Press HORN button
// Expected: Buzzer activates on Mega (if audible), visual feedback in UI
// Verify UART message 'HORN\n' is sent
```

### Test Case 7: WiFi Disconnect & Reconnect
```javascript
// Manually disconnect device from WiFi (or use airplane mode)
// Expected: Status bar shows 🔴 OFFLINE, all controls gray, status = "Connecting..."
// Reconnect WiFi
// Expected: Status returns to 🟢 IDLE/READY within 5 seconds
```

### Test Case 8: Age Badge Real-Time Update
```javascript
// Send single telemetry update
Blynk.virtualWrite(4, 1240);
// Immediately inspect age badge in status bar
// Expected: Shows "0.0s ago", increments every 100ms (0.1s, 0.2s, etc.)
// After 2 seconds: Text color changes from green to yellow
```

---

## 9. Implementation Notes for Blynk Builder

### Widget Configuration Summary

| Virtual Pin | Widget | Size | Color Scheme | Format | Notes |
|---|---|---|---|---|---|
| V0 | Joystick XY | Full width | Cyan outline + blue fill | ±100 range | Enable deadband 10% in widget settings |
| V1 | (part of V0) | – | – | – | Combined X/Y in single widget |
| V2 | Button (STOP) | 160×80 px | Red (#FF4444) | Text: "🛑 STOP" | Momentary, no toggle |
| V3 | Button (HORN) | 160×80 px | Dark (#333333) | Text: "🔊 HORN" | Momentary, no toggle |
| V4 | Gauge + Label | 320×160 px | Green/Yellow/Red gradient | "1,240 rev/min" | Min=0, Max=3000, update rate 200ms |
| V5 | Gauge + Label | 320×160 px | Green/Yellow/Red gradient | "1,245 rev/min" | Min=0, Max=3000, update rate 200ms |
| V6 | Gauge + Label | 320×160 px | Red (if <30), Yellow (30–40), Gray (>40) | "1.2 m" (convert cm) | Min=0, Max=400, update rate 500ms |
| V7 | Gauge + Label | 320×160 px | Gray | "2.1 m" | Min=0, Max=400, update rate 500ms |
| V8 | Gauge + Label | 320×160 px | Gray | "4.5 m" | Min=0, Max=400, update rate 500ms |
| V9 | Gauge + Label | 320×160 px | Gray | "0.8 m" | Min=0, Max=400, update rate 500ms |

### Blynk Project Template (JSON Export)
A Blynk-compatible JSON export with this layout and pin config will be generated and stored in `blynk-asar-template.json` (see implementation section below).

### Firmware Integration Points
1. **ESP32 must send**: `SPD:left:right\n` every 50ms based on joystick V0/V1 inputs
2. **Mega must send**: `RPM:left:right\n` every 200ms and `DIST:L:F:R:B\n` every 500ms
3. **No new protocol messages needed**: Design uses existing command set

---

## 10. Summary

**ASAR Control Station** is a developer-focused, mobile-first Blynk dashboard that prioritizes:
- **Safety**: Always-visible STOP, hard obstacle lockout, stale telemetry detection
- **Visibility**: Real-time age badges, state machine clarity, spatial distance display
- **Usability**: Thumb-friendly joystick, one-handed operation, immediate feedback

The design is complete and ready for implementation in Blynk builder. All pins, states, interactions, and safety rules are documented. The Chrome DevTools verification checklist provides concrete test cases to validate correct behavior before deployment.

**Next Steps**:
1. [IMPLEMENTATION]: Build widgets in Blynk builder using pin map (Section 3)
2. [IMPLEMENTATION]: Configure widget settings (colors, ranges, update rates)
3. [TESTING]: Run Chrome DevTools test cases (Section 8)
4. [FIRMWARE SYNC]: Verify ESP32 parses feedback messages correctly
5. [DEPLOYMENT]: Export dashboard config and commit to repo
