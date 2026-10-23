# Repository Guidelines

## Project Structure

- `esp/esp.ino` is the ESP32 WiFi/WebSocket gateway; `mega/mega.ino` controls motors and sensors on the Arduino Mega.
- `tst/` contains standalone hardware test sketches. `docs/` holds system plans and technical references.
- `MobileAPP/src/` contains the React and TypeScript controller UI; `MobileAPP/backend/` contains the Node.js WebSocket relay; `MobileAPP/android/` is the Capacitor Android project.
- Read `INSTRUCTIONS.md` for board setup and upload steps. There is no root-level package or build orchestration.

## Build, Test, and Development

Run mobile commands from `MobileAPP/`:

- `npm ci` installs the locked dependencies.
- `npm run dev` starts the Vite development server; `npm run build` creates the production web build.
- `npm run lint` runs TypeScript checking (`tsc --noEmit`).
- For the relay, run `npm ci` and `npm run dev` from `MobileAPP/backend/` (`npm start` runs it without watch mode).
- Compile and upload `esp/esp.ino`, `mega/mega.ino`, or a selected `tst/` sketch with Arduino IDE and the matching board profile. Android packaging uses `npx cap sync android` after the web build.

## Coding Style and Naming

Match nearby code: use two-space indentation, PascalCase React component filenames and exports, camelCase functions and variables, and uppercase names for firmware constants. No formatter is configured; `npm run lint` is the available TypeScript check. Keep ESP32-to-Mega commands and telemetry parsing synchronized in both firmware sketches. Firmware loops should remain non-blocking; schedule recurring work with `millis()` and preserve the emergency `STOP` behavior.

## Testing and Validation

There is no automated test suite or firmware CLI configured. Run the mobile TypeScript check and production build for app changes. For firmware or hardware changes, compile for the target board, use the relevant sketch in `tst/`, and verify the UART `START`/`RDY` handshake and affected controls or telemetry on hardware. For UI changes, exercise the affected screen in the browser and Android app when relevant.

## Commits and Pull Requests

Recent commits commonly use scoped prefixes such as `feat(firmware): ...`, `fix(app): ...`, and `docs: ...`. Keep subjects short and describe the change. Pull requests should summarize behavior and affected components, report checks and hardware validation performed, and include screenshots for visible UI changes. Call out protocol, pin, or configuration changes explicitly.

## Configuration and Safety

Use the `.env.example` files as templates for local settings; do not commit credentials, device secrets, or private network details. Keep motor-stop behavior safe and update relevant documentation when protocol commands, pin assignments, or interfaces change.
