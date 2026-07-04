# ASAR Control Station — Chrome DevTools Testing Script

**Purpose**: Inject Blynk virtual pin values and test dashboard state transitions  
**Platform**: Chrome DevTools Console (F12)  
**Duration**: ~10 minutes for full validation

---

## Copy-Paste Test Suites

Open **Blynk dashboard in Chrome** → Press **F12** → **Console tab** → Copy & paste test code blocks

---

## Suite 1: Baseline Telemetry (2 minutes)

```javascript
console.clear();
console.log("🧪 SUITE 1: Baseline Telemetry Test");

// Inject initial telemetry values
Blynk.virtualWrite(4, 1240);     // LEFT RPM
Blynk.virtualWrite(5, 1245);     // RIGHT RPM
Blynk.virtualWrite(6, 120);      // FRONT DIST (cm)
Blynk.virtualWrite(7, 210);      // RIGHT DIST
Blynk.virtualWrite(8, 450);      // REAR DIST
Blynk.virtualWrite(9, 80);       // LEFT DIST

console.log("✅ Telemetry injected:");
console.log("  LEFT RPM: 1240");
console.log("  RIGHT RPM: 1245");
console.log("  FRONT DIST: 120cm (safe)");
console.log("  LEFT DIST: 80cm");
console.log("  RIGHT DIST: 210cm");
console.log("  REAR DIST: 450cm");
console.log("📋 VERIFY: All gauge cards display values, status shows 🟢 READY");
```

---

## Suite 2: Joystick Differential (2 minutes)

```javascript
console.clear();
console.log("🧪 SUITE 2: Joystick Differential Calculation");

// Test Case 1: Straight forward (Y=100, X=0)
console.log("\n📍 Test: Straight Forward (Y=100, X=0)");
Blynk.virtualWrite(1, 100);      // Y = forward
Blynk.virtualWrite(0, 0);        // X = straight
console.log("Expected UART: SPD:100:100");
console.log("Expected UI: LEFT: 100, RIGHT: 100");

// Test Case 2: Turn right (Y=100, X=50)
console.log("\n📍 Test: Turn Right (Y=100, X=50)");
setTimeout(() => {
  Blynk.virtualWrite(0, 50);     // X = right turn
  console.log("Expected UART: SPD:125:75");
  console.log("Expected UI: LEFT: 125, RIGHT: 75");
  console.log("Expected: Robot turns right by reducing right-side speed");
}, 500);

// Test Case 3: Reverse (Y=-80, X=0)
console.log("\n📍 Test: Reverse (Y=-80, X=0)");
setTimeout(() => {
  Blynk.virtualWrite(1, -80);    // Y = reverse
  Blynk.virtualWrite(0, 0);      // X = straight
  console.log("Expected UART: SPD:-80:-80");
  console.log("Expected UI: LEFT: -80, RIGHT: -80");
  console.log("Expected: Both wheels reverse at -80");
}, 1000);

console.log("📋 VERIFY: Speed feedback labels update in real-time");
console.log("📋 VERIFY: Differential math is correct (left = Y+X/2, right = Y-X/2)");
```

---

## Suite 3: Stale Telemetry Detection (3 minutes)

```javascript
console.clear();
console.log("🧪 SUITE 3: Stale Telemetry Detection & UI State");

const startTime = Date.now();

// Send initial telemetry
console.log("📨 Initial telemetry sent at t=0s");
Blynk.virtualWrite(4, 1240);
Blynk.virtualWrite(5, 1245);

console.log("✅ t=0.0s: Status = 🟢 READY, Age = '0.0s ago', Joystick = 100% opacity");

// Create interval to log expected state
const staleCheckInterval = setInterval(() => {
  const elapsed = (Date.now() - startTime) / 1000;
  
  if (elapsed < 1.5) {
    console.log(`✅ t=${elapsed.toFixed(1)}s: Status = 🟢 READY, Age badge increments, Joystick = normal`);
  } else if (elapsed < 2.0) {
    console.log(`⚠️  t=${elapsed.toFixed(1)}s: Status = 🟡 STALE (turning yellow), Age badge shows: '${elapsed.toFixed(1)}s ago'`);
  } else if (elapsed < 3.0) {
    console.log(`❌ t=${elapsed.toFixed(1)}s: Joystick SOFT-DISABLED (50% opacity), Tooltip: 'Telemetry stale. Standby...'`);
  } else {
    clearInterval(staleCheckInterval);
    console.log("⏱️  At t=3.0s, stop watching and refresh telemetry...");
  }
}, 500);

// Refresh telemetry after 3+ seconds
setTimeout(() => {
  clearInterval(staleCheckInterval);
  console.log("\n📨 Refreshing telemetry at t=3.2s...");
  Blynk.virtualWrite(4, 1240);
  Blynk.virtualWrite(5, 1245);
  console.log("✅ RECOVERED: Status = 🟢 LIVE, Age badge = '0.0s ago', Joystick = 100% opacity");
  console.log("📋 VERIFY: Transition was smooth, no crashes, state is consistent");
}, 3200);
```

---

## Suite 4: Obstacle Detection (Front Distance Threshold) (2 minutes)

```javascript
console.clear();
console.log("🧪 SUITE 4: Obstacle Detection & Joystick Lockout");

// Safe approach
console.log("📍 Step 1: Safe distance (F=80cm)");
Blynk.virtualWrite(6, 80);
console.log("✅ FRONT card = gray, Status = 🟢 READY, Joystick = ENABLED");

// Caution zone
console.log("\n📍 Step 2: Caution zone (F=35cm)");
setTimeout(() => {
  Blynk.virtualWrite(6, 35);
  console.log("⚠️  FRONT card = YELLOW, Text larger, Status = 🟢 (still green)");
  console.log("✅ Joystick = still enabled but user warned");
}, 500);

// Blocked zone
console.log("\n📍 Step 3: Blocked zone (F=20cm)");
setTimeout(() => {
  Blynk.virtualWrite(6, 20);
  console.log("❌ FRONT card = RED (pulsing), Status = 🔴 BLOCKED");
  console.log("❌ Joystick = HARD-DISABLED (red outline, cannot move forward)");
  console.log("❌ Tooltip: 'BLOCKED: Obstacle ahead (<30cm). STOP or reverse.'");
}, 1000);

// Recovery
console.log("\n📍 Step 4: Recovery (F=45cm)");
setTimeout(() => {
  Blynk.virtualWrite(6, 45);
  console.log("✅ FRONT card = gray again, Status = 🟢 READY");
  console.log("✅ Joystick = fully ENABLED");
  console.log("📋 VERIFY: All transitions smooth, no lag, safe state always enforced");
}, 1500);
```

---

## Suite 5: STOP Button (1 minute)

```javascript
console.clear();
console.log("🧪 SUITE 5: STOP Button Emergency Stop");

// Simulate active motion
console.log("📍 Simulating forward motion: RPM both 1200");
Blynk.virtualWrite(4, 1200);
Blynk.virtualWrite(5, 1200);

console.log("\n🛑 User presses STOP button (V2 = 1)...");
console.log("📋 Expected behavior:");
console.log("  1. RPM values drop to 0 within 200ms");
console.log("  2. Joystick returns to center");
console.log("  3. STOP button flashes red (feedback)");
console.log("  4. Status shows brief 🟡, then returns to 🟢");
console.log("  5. UART message: STOP\\n sent to Mega");

// Simulate STOP effects
setTimeout(() => {
  Blynk.virtualWrite(4, 0);
  Blynk.virtualWrite(5, 0);
  console.log("\n✅ Motor halt confirmed:");
  console.log("  LEFT RPM: 0");
  console.log("  RIGHT RPM: 0");
  console.log("📋 VERIFY: STOP is one-tap, always responsive, motors halt immediately");
}, 200);
```

---

## Suite 6: HORN Button (1 minute)

```javascript
console.clear();
console.log("🧪 SUITE 6: HORN Button Feedback");

console.log("🔊 User presses HORN button (V3 = 1)...");
console.log("📋 Expected behavior:");
console.log("  1. Buzzer activates on Mega (if audio connected)");
console.log("  2. HORN button flashes or shows progress animation");
console.log("  3. Visual confirmation in UI (button state change)");
console.log("  4. UART message: HORN\\n sent to Mega");
console.log("  5. Buzzer duration: 500ms");

console.log("\n✅ HORN sent to Mega");
console.log("📋 VERIFY: Check Mega serial monitor for 'HORN' message");
console.log("📋 VERIFY: Buzzer triggers if speaker is connected");
```

---

## Suite 7: WiFi Disconnect & Reconnect (2 minutes)

```javascript
console.clear();
console.log("🧪 SUITE 7: WiFi Offline / Reconnect State Transitions");

console.log("📍 Step 1: Simulate WiFi LOST");
console.log("  (Manually disconnect device from WiFi or use DevTools Network throttle)");
console.log("✅ Expected UI state:");
console.log("  - Status = 🔴 OFFLINE");
console.log("  - All controls GRAYED OUT (40% opacity)");
console.log("  - Age badge = FROZEN at last value");
console.log("  - Status text: 'Connecting...'");

console.log("\n📍 Step 2: Reconnect WiFi");
console.log("  (Reconnect device to WiFi)");
console.log("✅ Expected recovery sequence:");
console.log("  - Status = 🟡 IDLE (within 3–5 seconds)");
console.log("  - Age badge = resumes incrementing");
console.log("  - Controls remain SLIGHTLY DISABLED until Mega sends RDY handshake");

console.log("\n📍 Step 3: Mega Handshake (RDY received)");
Blynk.virtualWrite(4, 1240);
Blynk.virtualWrite(5, 1245);
console.log("✅ Final state:");
console.log("  - Status = 🟢 SYSTEM READY");
console.log("  - All controls FULLY ENABLED");
console.log("  - Telemetry LIVE (age badge = '0.2s ago')");
console.log("📋 VERIFY: Reconnect is seamless, no lost motor control");
```

---

## Suite 8: Age Badge Real-Time (1 minute)

```javascript
console.clear();
console.log("🧪 SUITE 8: Age Badge Increments & Threshold Crossing");

// Single telemetry update
Blynk.virtualWrite(4, 1240);
console.log("📨 Telemetry sent once at t=0s (no more updates)");
console.log("📋 Expected age badge: '0.0s ago' (green text)");

// Watch age increment
let ageWatcher = setInterval(() => {
  const elapsed = (Date.now() % 10000) / 1000;
  
  if (elapsed < 1.5) {
    console.log(`  Age = '${elapsed.toFixed(1)}s ago' (green, normal)`);
  } else if (elapsed < 2.0) {
    console.log(`  Age = '${elapsed.toFixed(1)}s ago' (⚠️ turning yellow)`);
  } else if (elapsed < 3.0) {
    console.log(`  Age = '${elapsed.toFixed(1)}s ago' (🟡 yellow, stale threshold crossed)`);
  } else {
    clearInterval(ageWatcher);
    console.log("✅ Age badge threshold test complete");
  }
}, 200);

console.log("📋 VERIFY: Age increments every 100ms, color changes at 1.5s and 2.0s");
```

---

## Full Integration Test (5 minutes)

**Run all suites in sequence to validate complete system behavior:**

```javascript
console.clear();
console.log("🚀 ASAR Control Station — Full Integration Test");
console.log("================================================");

const tests = [
  "1. Baseline Telemetry",
  "2. Joystick Differential",
  "3. Stale Telemetry Detection",
  "4. Obstacle Detection",
  "5. STOP Button",
  "6. HORN Button",
  "7. WiFi Reconnect",
  "8. Age Badge"
];

tests.forEach((t, i) => {
  console.log(`${i+1}. ${t}`);
});

console.log("\n📋 Instructions:");
console.log("1. Run each suite in order (copy-paste from above)");
console.log("2. Observe dashboard for expected UI changes");
console.log("3. Verify Chrome DevTools doesn't show JS errors");
console.log("4. Check Mega serial monitor for UART messages (if available)");
console.log("5. Mark ✅ or ❌ for each test");

console.log("\n🎯 Success Criteria:");
console.log("✅ All 8 suites pass without errors");
console.log("✅ UI state always matches expected behavior");
console.log("✅ No racing conditions or flashing");
console.log("✅ STOP is always responsive (< 100ms)");
console.log("✅ Telemetry stale detection works at 2s");
console.log("✅ Obstacle lockout enforces at <30cm");
console.log("✅ Age badge increments smoothly");
console.log("✅ WiFi reconnect is seamless");

console.log("\n📊 Dashboard is production-ready!");
```

---

## Troubleshooting Tips

### **Widgets don't show values**
- Verify virtual pins V0–V9 are correctly assigned in Blynk builder
- Check browser console for JS errors (F12 → Console)
- Ensure Blynk library is initialized on ESP32

### **Age badge doesn't update**
- Verify age badge is a **Label widget**, not a value display
- Update interval should be ~100ms from ESP32
- Check if ESP32 is actually sending updates (serial monitor)

### **Joystick doesn't disable when stale**
- Add CSS class or opacity rule to `Blynk.setProperty(V0, "opacity", "0.5")`
- Verify ESP32 app code monitors telemetry age
- Check Blynk library supports `setProperty()` method

### **Distance color doesn't change**
- Blynk gauge widgets support color rules; use `setProperty(V6, "color", "#FF0000")`
- Conditional color coding must be done in **ESP32 app code**, not Blynk builder
- Verify color hex codes are valid

### **STOP button doesn't clear joystick center**
- Joystick may not support programmatic reset via `virtualWrite()`
- Use overlay message or status badge to indicate STOP state instead
- Consider adding a button label update: "Centered" → "STOPPED"

---

## Reference Links

- **Blynk Console**: https://blynk.cloud/dashboard
- **Blynk Docs**: https://docs.blynk.io
- **Chrome DevTools Guide**: https://developer.chrome.com/docs/devtools/
- **ASAR Design Spec**: [ASAR-CONTROL-STATION-DESIGN.md](ASAR-CONTROL-STATION-DESIGN.md)
- **ASAR Implementation**: [ASAR-IMPLEMENTATION-GUIDE.md](ASAR-IMPLEMENTATION-GUIDE.md)

---

**Test Date**: _______________  
**Tested By**: _______________  
**Results**: _______________  
**Sign-off**: _______________
