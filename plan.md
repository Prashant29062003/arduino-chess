# Plan: Move Validation & LED Feedback

Last updated: 2025-11-30

Purpose
-------
This document describes a clear, implementable plan for validating physical chess moves detected by the Arduino board, returning validation results to the board, and giving immediate LED feedback to the player. It covers message formats, bridge changes, Arduino behavior (state machine), UX choices, testing, security, and an implementation task list with priorities.

Goals
-----
- Server is authoritative: all moves are validated by the backend (`chess.js`).
- Arduino receives a short deterministic response after each attempted move indicating `ok` or `invalid` and (optionally) a reason.
- Bridge forwards raw Arduino events and move results reliably; supports retries, timeouts, and API-key protection.
- UX on the board is clear: green = accepted, red = invalid, amber/yellow = timeout/unknown.

High-level architecture
----------------------

Arduino (sensors) → Serial → Serial Bridge (Node) → Backend (Express + chess.js)
                         ← Serial (move_result)
Backend → WebSocket → Frontend (React)

Sequence diagram (simplified)
-----------------------------
1. Arduino: detects `removed` (fromSquare)
2. Arduino: detects `placed` (toSquare)
3. Arduino or Bridge: pair removed→placed into a candidate move `{from,to}`
4. Bridge: POST `/white/move` or `/black/move` (server decides endpoint based on turn or payload)
5. Backend: validate move with chess.js → respond `{ success | error }` and `fen`
6. Bridge: forward compact result to Arduino over Serial (single-line JSON)
7. Arduino: parse result and update LEDs / buzzer / display
8. Bridge: broadcast move/result to WebSocket clients (frontend)

Message formats and protocol
----------------------------

All serial messages are single-line terminated by `\n`. JSON is preferred for clarity.

1) Raw events from Arduino (sent to bridge):

  { "type": "removed", "square": "E2", "piece": "Pawn" }
  { "type": "placed",  "square": "E4", "piece": "Pawn" }

2) Bridge → Backend (HTTP):

  POST /white/move or /black/move
  { "from": "e2", "to": "e4" }

3) Backend → Bridge (HTTP response):

  // success (200)
  {
    "type": "move",
    "move": { "color":"w","from":"e2","to":"e4","san":"e4" },
    "fen": "...",
    "turn": "black",
    "in_check": false
  }

  // invalid (400)
  { "error": "Invalid move", "detail": "..." }

4) Bridge → Arduino (serial reply):

  // success
  { "type":"move_result", "status":"ok", "from":"E2", "to":"E4", "san":"e4" }

  // invalid
  { "type":"move_result", "status":"invalid", "reason":"Not white's turn" }

Implementation details — Bridge
--------------------------------

1) Location: `backend/serial-bridge.js` (existing)

2) Responsibilities:
  - Read lines from Serial → parse into events (removed/placed or JSON move)
  - Post raw events to `/arduino/event` for logging (optional)
  - Pair `removed` → `placed` into a candidate move using a `PAIR_WINDOW_MS` (default 10s)
  - Query backend `/health` to determine `turn` or accept explicit `color` in move JSON
  - POST move to `/white/move` or `/black/move`
  - On response, write a single-line JSON `move_result` back to Serial and broadcast via WebSocket
  - Add retry for transient network errors (1-2 retries) and a fallback to report `status: 'error'` to Arduino

3) Serial reply requirements:
  - Send only one line per move (terminated by `\n`)
  - Keep reply compact (small JSON) to reduce Serial parsing complexity
  - If Serial port isn't open or fails, log a warning and do not crash bridge

Implementation details — Arduino
--------------------------------

Behavioral model (state machine):

State: IDLE
  - On `removed` → go to WAIT_FOR_PLACED (store `fromSquare`) and optionally light a steady indicator (e.g., blue)

State: WAIT_FOR_PLACED
  - On `placed` → if `toSquare !== fromSquare` then send `removed`+`placed` events (or let bridge pair) and wait for serial response
  - If `placed == from` (user changed mind) → cancel candidate move and return to IDLE
  - If no `placed` within user timeout (e.g., 30s) → cancel candidate move, flash amber, return to IDLE

When waiting for Bridge reply:
  - Start a short reply timeout (e.g., 5–7s)
  - If `move_result.status == ok` → blink green (2x), optionally steady green short, update local state
  - If `move_result.status == invalid` → blink red (3x), display reason on UI or buzzer
  - If no reply in timeout → blink amber and optionally request the player to retry (send again) or check network

Hardware considerations and debouncing
-------------------------------------

- Debounce sensors for stable readings (e.g., require stable state for 50–200ms depending on sensor noise).
- When multiple sensors change within a short window, group events into a settling window (200–700ms) before deciding removed/placed order.
- Ensure Serial buffer is large enough and use a line-based parser (readStringUntil('\n') or ArduinoJson safe stream parsing).

UX patterns and options
----------------------

1) Minimal UX (recommended): LED feedback only
   - Green: accepted
   - Red: invalid
   - Amber: no response / network error

2) Rich UX (if hardware available): Add small OLED or 7-seg to show message (`OK`, `Invalid: turn`), and buzzer for error

3) Auto-reposition (advanced): Use servos/robotic arms — not part of the basic plan; requires precise mapping of squares and collision handling

Edge cases
----------

- Same-square placement (from === to): do not send move, treat as cancel
- Duplicate sensors flip: if two sensors change simultaneously, use settling window and pairing heuristics
- Turn mismatch: backend returns "Not white's turn" — show invalid and do not retry automatically
- Incomplete pairing: if removed event exists but user never places, cancel after timeout

Security
--------

- If exposing backend publicly, require `x-api-key` header from bridge/boards and enforce it in backend (`backend/.env` `API_KEY`).
- Do not accept arbitrary serial input on bridges exposed to untrusted systems — limit access to host machines.

Testing plan
------------

1) Unit tests on backend move endpoints (use `chess.js`) — verify legal/illegal moves
2) Local simulator tests:
   - Run `node simulate-arduino.js --removed D7 --placed D6 --execute` and verify bridge forwards and server accepts/rejects
   - Confirm bridge writes correct serial reply by reading the simulated serial output (or logging)
3) Hardware integration test (real board):
   - Hook Arduino to laptop and run `serial-bridge.js`
   - Place pieces: valid moves should blink green; invalid moves blink red
   - Test network failure: bring down backend and ensure Arduino shows amber after timeout

Implementation tasks (step-by-step)
----------------------------------

Priority: High

1. Create `plan.md` (this document) — ✅
2. Patch `backend/serial-bridge.js` to write `move_result` JSON back to serial (on success and on error). Add small retry logic for transient network errors. (Estimated: 30–90 min)
3. Add `arduino/feedback_example.ino` that shows a minimal state machine and LED control for `move_result` messages (green/red/amber). (Estimated: 20–60 min)

Priority: Medium

4. Add optional support for `x-api-key` in backend and update bridge and simulator to send this header. (Estimated: 30–60 min)
5. Improve bridge logging and add optional file-based persistence of lastArduinoEvent for debugging. (Estimated: 30–60 min)

Priority: Low / Future

6. Add small OLED text display example for Arduino
7. Add servo-controlled auto-return (robotic) example

Acceptance criteria
-------------------

- When a valid move is made on the physical board, the Arduino blinks green and frontend updates with the move.
- When an invalid move is attempted, Arduino blinks red and frontend displays the reason.
- When backend is unreachable, Arduino blinks amber after timeout and the bridge retries gracefully.

Deliverables
------------

- `plan.md` (this file)
- Patch to `backend/serial-bridge.js` to send back `move_result` on serial
- `arduino/feedback_example.ino` showing LED handling and serial parsing
- README updated with run+test steps (already done)

Next steps
----------
1. Confirm plan and desired LED pins (suggest defaults: GREEN=10, RED=11 for UNO; on ESP32 pick 2 & 4)
2. I will patch `backend/serial-bridge.js` to send `move_result` and demonstrate the exact single-line JSON shape
3. I will add `arduino/feedback_example.ino` to the repo

If you approve the plan and pin choices, I will proceed with the code patches in the repository.
