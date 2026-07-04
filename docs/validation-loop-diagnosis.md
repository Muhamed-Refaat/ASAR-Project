# Validation Loop Diagnosis (Blynk -> ESP -> Mega)

This procedure isolates where motor control fails.

## Firmware Requirement

Flash latest:
- esp/esp.ino
- mega/mega.ino

Both now include validation logs:
- ESP prints `[ESP][BLYNK]`, `[ESP][TX]`, `[ESP][RX]`, `[ESP][ACK]`, `[ESP][VAL]`
- Mega sends `ACK:*` lines over UART2 and also prints local USB logs.

## Step 1: Verify Blynk -> ESP

Open ESP Serial Monitor at 115200 and press any button in app.

Expected:
- `[ESP][BLYNK] Vx=1` when pressed
- `[ESP][BLYNK] Vx=0` when released (for push mode)

If not seen:
- Wrong virtual pin mapping in Blynk widget.
- Wrong datastream type attached to widget.
- Device/template mismatch in app.

## Step 2: Verify ESP -> Mega START handshake

After boot, expect:
- `[ESP][TX] START`
- `[ESP][RX] RDY`
- `[ESP][STATE] RUNNING`
- `[ESP][ACK] START`

If START appears but RDY does not:
- UART wiring or shared GND issue is root cause.
- Mega not running correct sketch.
- RX/TX lines swapped physically.

## Step 3: Verify command transport and execution

Press Forward (V0).

Expected sequence:
- `[ESP][BLYNK] V0=1`
- `[ESP][TX] SPD:180:180`
- `[ESP][ACK] SPD:180:180`

If TX appears but no ACK:
- ESP -> Mega UART path broken.

If ACK appears but motor does not rotate:
- Not a Blynk issue.
- Root cause is hardware motor path (L298N EN/IN wiring, motor supply, or polarity).

## Step 4: Verify stop behavior

Press Stop (V9).

Expected:
- `[ESP][BLYNK] V9=1`
- `[ESP][TX] STOP`
- `[ESP][ACK] STOP`

Stop is one-shot in firmware and should not latch permanently.

## Step 5: Read health snapshot

ESP prints every second:
- `[ESP][VAL] st=... blynk=... tx=... rx=... ack=... err=... lastCmd='...'`

Interpretation:
- `blynk=0` -> cloud/app link issue.
- `tx increases, rx/ack static` -> UART return path issue.
- `ack increases, motor still dead` -> motor driver/power path issue.
