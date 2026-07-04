# ASAR Control Station — Visual Layout Reference

**Visual Guide for Building Dashboard in Blynk**

---

## Mobile Portrait Layout (Primary)

```
┌──────────────────────────────────┐
│           STATUS BAR             │ (Zone A: Fixed, always visible)
│  ASAR Control Station  🔗 ✓      │
│  🟢 SYSTEM READY | 0.2s ago      │
│  ▓▓▓▓░ WiFi (Good)               │
├──────────────────────────────────┤
│                                  │
│     CRITICAL CONTROLS            │ (Zone B: Primary interaction)
│  ┌─────────────┐ ┌─────────────┐│
│  │  🛑 STOP    │ │  🔊 HORN    ││
│  │   (RED)     │ │  (DARK)     ││
│  └─────────────┘ └─────────────┘│
│                                  │
│   DRIVE VECTOR CONTROL           │
│                                  │
│        ╭─────────────╮           │
│        │             │           │
│        │   (Joystick │           │
│        │    Control) │           │
│        │     240px   │           │
│        │             │           │
│        ╰─────────────╯           │
│                                  │
│   LEFT CMD: -120  RIGHT CMD: 160 │
│                                  │
│  ⚠️ F:1.2m | L:0.8m | R:2.1m   │
│  ⚠️ B:4.5m                      │
│                                  │
├──────────────────────────────────┤
│                                  │
│   TELEMETRY (Scrollable)         │ (Zone C: Secondary info)
│                                  │
│   ┌────────────────────────────┐ │
│   │ LEFT RPM                   │ │
│   │ 1,240 rev/min   ████████░░ │ │
│   │ Last: 0.2s ago  [LIVE] 🟢  │ │
│   └────────────────────────────┘ │
│                                  │
│   ┌────────────────────────────┐ │
│   │ RIGHT RPM                  │ │
│   │ 1,245 rev/min   ████████░░ │ │
│   │ Last: 0.2s ago  [LIVE] 🟢  │ │
│   └────────────────────────────┘ │
│                                  │
│   ┌────────────────────────────┐ │
│   │ FRONT DISTANCE AWARENESS   │ │
│   │                            │ │
│   │     ┌──────────┐           │ │
│   │  L──┃    RC    ┃──R        │ │
│   │ 0.8m│   ▲ 1.2m│2.1m       │ │
│   │     │ B: 4.5m │           │ │
│   │     └──────────┘           │ │
│   │   Last: 0.2s ago [LIVE] 🟢 │ │
│   └────────────────────────────┘ │
│                                  │
│   ┌────────────────────────────┐ │
│   │ SYSTEM HEALTH              │ │
│   │ WiFi: ▓▓▓▓░ (Good)         │ │
│   │ Mega Link: ✓ Active        │ │
│   │ Last UART: 0.1s ago        │ │
│   └────────────────────────────┘ │
│                                  │
└──────────────────────────────────┘
```

---

## Widget Sizing & Spacing

### **Recommended Dimensions**

```
┌─ Header (Status Bar)
│  Height: 80px (fixed)
│  └─ Title: 20px bold
│  └─ Status: 14px normal
│  └─ Age: 12px gray
│
├─ Control Zone
│  Height: 320px (scrollable start)
│  │
│  ├─ Buttons Row
│  │  Height: 100px
│  │  ├─ STOP: 160×80px (left)
│  │  └─ HORN: 160×80px (right)
│  │  Spacing: 10px between buttons
│  │
│  ├─ Joystick Section
│  │  Height: 260px
│  │  └─ Joystick: 240×240px (centered)
│  │  Padding: 10px all sides
│  │
│  └─ Speed Feedback
│     Height: 40px
│     ├─ LEFT: 80px
│     ├─ SPACE: 20px
│     └─ RIGHT: 80px
│
│  └─ Distance Quick-Ref
│     Height: 30px
│     Layout: F | L | R | B (4 columns)
│
├─ Telemetry Zone (Scrollable)
│  │
│  ├─ RPM Cards (2 cards)
│  │  Each: 320×140px
│  │  Margin: 10px
│  │
│  ├─ Distance Cards (4 cards or 1 diagram)
│  │  Each: 320×140px
│  │  Margin: 10px
│  │
│  └─ Health Card (optional)
│     320×120px
│     Margin: 10px
│
└─ Total Mobile Viewport: 360px width (iPhone SE / Android base)
```

---

## Color Palette

### **Status Badge Colors**
```
🟢 Green   = #00FF00 (System Ready, Live Data)
🟡 Yellow  = #FFD700 (Stale Telemetry, Caution)
🔴 Red     = #FF0000 (Blocked, Offline, Error)
⚪ Gray    = #CCCCCC (Informational, Disabled)
```

### **Button Colors**
```
🛑 STOP    = #FF4444 (Bright Red)
🔊 HORN    = #333333 (Dark Gray)
```

### **Gauge Colors (RPM & Distance)**
```
Green   → 0–800 rev/min (safe RPM)
Yellow  → 800–2000 rev/min (normal operation)
Red     → 2000+ rev/min (high load)

Distance:
Red     = <30cm (obstacle, dangerous)
Yellow  = 30–40cm (caution zone)
Gray    = >40cm (safe)
```

### **Background**
```
Dark Theme (#1a1a1a)
Text Light (#FFFFFF)
Border/Divider (#333333)
```

---

## State Indicator Examples

### **Connected & Ready** (Normal State)
```
┌──────────────────────────────────┐
│ ASAR Control Station  🔗 ✓       │
│ 🟢 SYSTEM READY | 0.2s ago       │
│ ▓▓▓▓░ WiFi (Good)                │
└──────────────────────────────────┘
```

### **Telemetry Stale** (Warning State)
```
┌──────────────────────────────────┐
│ ASAR Control Station  🔗 ✓       │
│ 🟡 STALE — Reconnecting... | 2.1s│
│ ⚠️ No telemetry received          │
└──────────────────────────────────┘
```

### **Obstacle Detected** (Blocked State)
```
┌──────────────────────────────────┐
│ ASAR Control Station  🔗 ✓       │
│ 🔴 BLOCKED: Obstacle Ahead <30cm │
│ Last update: 0.2s ago            │
└──────────────────────────────────┘
```

### **Offline** (Disconnected State)
```
┌──────────────────────────────────┐
│ ASAR Control Station  🔗 ✗       │
│ 🔴 OFFLINE — Reconnecting...     │
│ Waiting for WiFi connection...   │
└──────────────────────────────────┘
```

---

## Joystick Interaction Zones

```
         FORWARD
           ↑
           │
     ┌──────────────┐
     │   (0, 100)   │
     │              │
  L  │    Joystick  │   R
  E  │   240×240px  │   I
  F  │   Deadband   │   G
  T  │      10%     │   H
     │              │   T
     │   (0, 0)     │
     └──────────────┘
           │
          ↓
       REVERSE

X-axis (Steering):
  Left  = Reduce right-side speed (turn left)
  Right = Reduce left-side speed (turn right)
  Center = Straight line motion

Y-axis (Speed):
  Forward = Positive speed (fwd wheels)
  Reverse = Negative speed (reverse wheels)
  Center = Stop
```

---

## Responsive Breakpoints

### **Small Phone (360px width)**
```
Buttons: 160×80px (side-by-side)
Joystick: 240×240px (fits with margin)
Labels: Single line, small font
Cards: Full width 320px
```

### **Medium Phone (420px width)**
```
Buttons: 180×90px (side-by-side, more space)
Joystick: 260×260px (larger, better for touch)
Labels: Can split to 2 lines if needed
Cards: Full width 380px
```

### **Large Phone (480px width) / Tablet (600+px)**
```
Buttons: 200×100px (side-by-side)
Joystick: 300×300px (larger, easier control)
Labels: Can use descriptive text
Cards: 2 columns side-by-side (possible)
Distance diagram: More spacing
```

---

## Distance Diagram Options

### **Option A: Spatial Orientation (Recommended)**
```
        FRONT (V6)
         1.2m

  LEFT          RIGHT
  (V9)          (V7)
  0.8m    RC    2.1m
        ▲ (robot symbol)

        REAR (V8)
        4.5m
```

### **Option B: List Format (Simpler)**
```
Distance Awareness
─────────────────
Front:  1.2m ▓▓▓▓░
Left:   0.8m ▓░░░░
Right:  2.1m ▓▓▓▓▓
Rear:   4.5m ▓▓▓▓░
```

### **Option C: Gauge Grid (Most Visual)**
```
┌─ LEFT        ┌─ FRONT
│  0.8m        │  1.2m ⚠️
│ ▓░░░░        │ ▓▓▓▓░
└─ RIGHT       └─ REAR
   2.1m           4.5m
 ▓▓▓▓▓        ▓▓▓▓░
```

---

## Disabled State Appearance

### **Soft Disable (Telemetry Stale)**
```
Joystick: 50% opacity (half-transparent)
Overlay: Tooltip "Telemetry stale. Standby..."
Color: Status badge yellow 🟡
Action: Can still use, but warned
```

### **Hard Disable (Obstacle Locked)**
```
Joystick: Red outline, 30% opacity
Overlay: "BLOCKED: Obstacle ahead <30cm"
Blocked: Forward motion prevented
Allowed: STOP, Reverse, Horn
Status: 🔴 Red indicator
```

### **Fully Disabled (Offline)**
```
All controls: 40% opacity, grayed
Joystick: No cursor response
Buttons: Still visible but unresponsive
Status: 🔴 OFFLINE
Message: "Reconnecting to Blynk..."
```

---

## Typography & Font Sizing

```
Title:           20px bold (#FFFFFF)
Status Badge:    16px bold (#00FF00 or #FFD700 or #FF0000)
Subtitle:        14px normal (#CCCCCC)
Label:           12px normal (#FFFFFF)
Value (Large):   24px bold (#FFFFFF)
Value (Small):   14px normal (#FFFFFF)
Tooltip:         11px normal (#FFFFFF) on dark overlay
Footer:          10px gray (#999999)
```

---

## Animation & Transition Timing

```
State Changes:     200–300ms (smooth fade)
Color Changes:     200–300ms (alert gradual)
Gauge Movement:    Smooth continuous (not step)
Button Press:      50ms flash (visual feedback)
Status Badge:      Instant change (critical info)
Age Badge:         Instant number update (every 100ms)
Obstacle Warning:  200ms pulse (red blink)
Stale Indicator:   300ms fade yellow→normal cycle
```

---

## Safety Visual Indicators

### **Stale Data** (After 1.5–2.0 seconds)
```
Age Badge: Color shift from green to yellow
Joystick: Opacity 100% → 50% transition (fade)
Status:   Text change with emoji (🟢 → 🟡)
Tooltip:  "Telemetry stale. Standby..."
```

### **Obstacle Danger** (Front Distance <30cm)
```
Distance Card: Background shifts to RED (#FF0000)
Distance Value: Larger font, bold
Status Badge: Instant 🔴 BLOCKED
Joystick: Red outline border (visual frame)
Tooltip: "BLOCKED: Obstacle ahead. STOP or reverse."
```

### **WiFi Loss**
```
WiFi Icon: Green (connected) → Red (disconnected)
Status Badge: 🟢 → 🔴 transition
All Controls: Fade to 40% opacity
Status Text: "OFFLINE — Reconnecting..."
```

---

## Accessibility Notes

### **Touch Targets**
- Minimum 60×60px for all buttons
- STOP button extra-large (160×80px)
- Joystick easily thumb-reachable when held

### **Color Contrast**
- Red (#FF0000) on black background: WCAG AAA compliant
- Yellow (#FFD700) on black: WCAG AA compliant
- White text on dark: WCAG AAA compliant

### **Text Readability**
- Minimum 12px font for all text
- Bold for critical labels (RPM, Status)
- Clear contrast for all colors

### **One-Hand Operation**
- STOP button in top-left (reachable with thumb)
- Joystick centered (both hands for stability)
- Bottom controls not required (scrollable)

---

## Example Widget Configurations

### **STOP Button**
```
Virtual Pin:      V2 (Input)
Type:             Button (Momentary)
Label:            "🛑 STOP"
Size:             160×80 px
Color:            #FF4444 (Red)
Text Color:       #FFFFFF (White)
Text Size:        18px bold
Position:         Top-left (pinned)
Haptic Feedback:  Enabled
Sound Feedback:   "stop.mp3" (optional)
```

### **Joystick**
```
Virtual Pins:     V0 (X), V1 (Y)
Type:             Joystick XY
Label:            "DRIVE VECTOR CONTROL"
Size:             240×240 px
Deadband:         10%
Range:            ±100 (or ±255)
Color Scheme:     Cyan outline, blue knob
Center Snap:      Enabled
Feedback:         Show current X/Y values
```

### **RPM Gauge**
```
Virtual Pin:      V4 (Output, Left) / V5 (Right)
Type:             Gauge + Value Label
Min:              0
Max:              3000
Units:            "rev/min"
Display:          Large numeric + gauge bar
Color:            Green (0–800) → Yellow → Red (2000+)
Update Rate:      ~200ms
Show Needle:      Yes
Smooth Animation: Enabled
```

### **Distance Gauge**
```
Virtual Pin:      V6 (Front) / V7, V8, V9 (L, R, B)
Type:             Gauge + Value Label
Min:              0
Max:              400
Units:            "cm" or "m"
Display:          Large numeric + gauge bar
Color Logic:      Red if <30, Yellow if 30–40, Gray >40
Update Rate:      ~500ms
Show Needle:      Yes
Conditional Color: Enabled (change in app code)
```

---

**This reference is for Blynk builder implementation. Use alongside ASAR-IMPLEMENTATION-GUIDE.md for step-by-step widget creation.**
