# Spec Kit

This folder contains the implementation-ready specification set for the ESP32 + Mega 4WD robot.

The kit is organized so firmware work can be executed without re-deciding interfaces:

- `01-system-spec.md` defines product behavior, states, and functional requirements.
- `02-hardware-interface-spec.md` defines board ownership, pins, and electrical integration constraints.
- `03-uart-protocol-spec.md` defines the UART contract between the ESP32 and Mega.
- `04-firmware-implementation-plan.md` breaks the work into concrete implementation tasks.
- `05-validation-and-acceptance.md` defines the tests and acceptance criteria.

Recommended usage order:

1. Confirm the system and hardware specs.
2. Implement the UART contract on both boards in the same edit session.
3. Build the firmware modules in the order defined by the implementation plan.
4. Validate against the acceptance checklist before field testing.

Cross-board rule:

- Any protocol change must be updated in both `esp/esp.ino` and `mega/mega.ino` together.

Document maintenance rule:

- If command formats, pin assignments, state transitions, or telemetry payloads change, update the relevant spec files in this folder in the same session.