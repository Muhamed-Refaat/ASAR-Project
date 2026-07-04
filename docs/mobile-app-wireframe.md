# Mobile App Wireframe UI/UX Design

## 1. Purpose

This document defines a low-fidelity mobile UI/UX wireframe for the robot control application.

The design is based on the current system constraints:

- Blynk IoT v2 mobile app is the user-facing interface.
- Primary control is a joystick using V0 and V1.
- Quick actions are `STOP` on V2 and `HORN` on V3.
- Live telemetry shows left/right RPM and left/front/right/rear distances on V4-V9.
- The app should prioritize safe driving, fast control access, and readable telemetry.

## 2. Design Goals

- Keep the drive controls reachable with one hand.
- Make emergency stop the most visually prominent action.
- Show robot status before the user starts driving.
- Present telemetry in a layout that matches the physical robot orientation.
- Reduce user confusion by grouping controls, status, and sensor data into distinct zones.

## 3. Primary User Flow

1. User opens the app.
2. User checks connection and robot readiness.
3. User uses the joystick to drive the robot.
4. User taps `STOP` immediately if unsafe behavior is observed.
5. User monitors RPM and ultrasonic distance cards while driving.
6. User taps `HORN` only as a quick auxiliary action.

## 4. Information Architecture

Recommended mobile structure:

1. Main Control Screen
2. Optional Diagnostics Screen

The Main Control Screen should contain all essential driving actions and telemetry.
The Optional Diagnostics Screen can duplicate telemetry in a denser layout if needed, but the robot must remain operable from the first screen alone.

## 5. Main Control Screen Wireframe

Portrait mobile layout:

```text
+--------------------------------------------------+
| ROBOT CONTROL                                    |
| WiFi: Connected   Mega: RDY   Mode: Running      |
+--------------------------------------------------+
| STATUS                                           |
| [ System Ready ]                                 |
| Last event: Telemetry received 0.2s ago          |
+--------------------------------------------------+
| QUICK ACTIONS                                    |
| [ STOP ]                         [ HORN ]         |
+--------------------------------------------------+
| DRIVE CONTROL                                    |
|                                                  |
|             +--------------------+               |
|             |                    |               |
|             |      JOYSTICK      |               |
|             |       V0/V1        |               |
|             |                    |               |
|             +--------------------+               |
|                                                  |
|  Left Cmd:  -120              Right Cmd:  160    |
+--------------------------------------------------+
| RPM TELEMETRY                                    |
| [ Left RPM  ]                  [ Right RPM ]     |
| [   V4      ]                  [    V5     ]     |
+--------------------------------------------------+
| DISTANCE AWARENESS                               |
|                    [ Front ]                     |
|                    [  V6   ]                     |
|                                                  |
|     [ Left ]                        [ Right ]    |
|     [  V9  ]                        [  V7   ]    |
|                                                  |
|                    [ Rear  ]                     |
|                    [  V8   ]                     |
+--------------------------------------------------+
| FOOTER                                           |
| Tip: keep front distance above safe threshold.   |
+--------------------------------------------------+
```

## 6. Alternate State Wireframes

### 6.1 Disconnected or Boot State

```text
+--------------------------------------------------+
| ROBOT CONTROL                                    |
| WiFi: Connecting   Mega: Waiting   Mode: Idle    |
+--------------------------------------------------+
| STATUS                                           |
| [ Not Ready ]                                    |
| Action: wait for WiFi and RDY handshake          |
+--------------------------------------------------+
| QUICK ACTIONS                                    |
| [ STOP ] disabled                [ HORN ] off    |
+--------------------------------------------------+
| DRIVE CONTROL                                    |
| [ joystick locked until ready ]                  |
+--------------------------------------------------+
| TELEMETRY                                        |
| RPM: -- / --                                     |
| DIST: -- / -- / -- / --                          |
+--------------------------------------------------+
```

### 6.2 Safety Alert State

```text
+--------------------------------------------------+
| ROBOT CONTROL                                    |
| WiFi: Connected   Mega: RDY   Mode: Alert        |
+--------------------------------------------------+
| STATUS                                           |
| [ OBSTACLE TOO CLOSE ]                           |
| Front distance below safe threshold              |
+--------------------------------------------------+
| QUICK ACTIONS                                    |
| [ STOP ] large and highlighted   [ HORN ]        |
+--------------------------------------------------+
| DRIVE CONTROL                                    |
| Joystick remains visible but user attention      |
| is pulled to the stop action and alert card.     |
+--------------------------------------------------+
```

## 7. UX Layout Rationale

### 7.1 Header

- The header gives immediate confirmation that the app, ESP32, and Mega are synchronized.
- `WiFi`, `Mega`, and `Mode` should always be visible because they explain why controls may be locked.

### 7.2 Status Section

- A single large status chip is easier to scan than multiple small labels.
- Short status text should be used, such as `System Ready`, `Waiting for RDY`, or `UART Error`.

### 7.3 Quick Actions

- `STOP` must be placed above the joystick, not below it.
- `STOP` should be larger than `HORN` and visually dominant.
- `HORN` should remain accessible but secondary.

### 7.4 Drive Control

- The joystick is the primary interaction element and should occupy the center of the screen.
- Live left/right command feedback helps the user understand differential steering behavior.
- If command values are not implemented in Blynk, this row can be replaced with `Turn Left`, `Straight`, `Turn Right`, or `Reverse` state text.

### 7.5 Telemetry Section

- RPM cards should appear before the distance map because drive feedback is directly tied to movement.
- Distance cards should mimic the robot's physical orientation: front at top, rear at bottom, left/right on the sides.
- This orientation reduces the mental conversion the user has to make while driving.

## 8. Recommended Blynk Widget Mapping

| UI Element | Blynk Widget Type | Virtual Pin | Notes |
|---|---|---|---|
| Joystick | Joystick | V0 and V1 | X for steering, Y for throttle |
| Stop button | Button | V2 | Use momentary or push behavior for immediate stop |
| Horn button | Button | V3 | Trigger buzzer |
| Left RPM | Value Display or Labeled Value | V4 | Numeric telemetry |
| Right RPM | Value Display or Labeled Value | V5 | Numeric telemetry |
| Front distance | Value Display | V6 | cm |
| Right distance | Value Display | V7 | cm |
| Rear distance | Value Display | V8 | cm |
| Left distance | Value Display | V9 | cm |

## 9. Recommended Screen Zones for Blynk Implementation

Suggested vertical order inside the Blynk mobile dashboard:

1. Connection/status row
2. System status card
3. Stop and horn buttons
4. Joystick
5. Left/right RPM row
6. Four distance widgets arranged as a directional map

If Blynk grid constraints make the exact layout difficult, keep this priority:

1. `STOP` must remain near the top.
2. Joystick must remain central and large.
3. Distance widgets must preserve directional meaning.

## 10. Mobile UX Notes

- Use short labels only. Avoid long sentences inside widgets.
- Favor high contrast for status and stop controls.
- Avoid placing critical controls at the very bottom edge where they are easier to mis-tap.
- Keep the main screen usable without scrolling on a typical phone if possible.
- Show placeholder values like `--` when telemetry is not yet available.
- If the app supports color states, use simple semantics:
  - green for ready
  - yellow for waiting or caution
  - red for stop, error, or obstacle alert

## 11. Recommended Copy

Use concise labels such as:

- `System Ready`
- `Waiting for Robot`
- `UART Error`
- `Obstacle Ahead`
- `Left RPM`
- `Right RPM`
- `Front cm`
- `Rear cm`
- `Left cm`
- `Right cm`

## 12. Suggested Future Enhancements

These are optional and are not required by the current firmware protocol:

- Add a `Start` control if the runtime flow requires explicit arming from the app.
- Add a battery widget when power telemetry becomes available.
- Add a compact event log for `RDY`, `ERR`, and last command state.
- Add a speed limiter slider for indoor testing.

## 13. Deliverable Summary

This wireframe defines a single-screen mobile control experience optimized for:

- safe emergency stopping
- central joystick driving
- immediate visibility of readiness state
- readable RPM feedback
- directionally meaningful obstacle distance display

The design is intentionally low-fidelity so it can be implemented directly in Blynk before visual styling decisions are finalized.