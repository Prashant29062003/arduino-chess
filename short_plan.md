# 📝 Plan Summary: Move Validation & LED Feedback

This plan outlines the implementation of a deterministic process for validating physical chess moves (detected by an Arduino) on the server, and providing immediate LED feedback to the player via a serial response.

### 1. 🎯 Core Goals

* **Server is Authoritative:** All moves are validated by the backend (`chess.js`).
* **Reliable Feedback:** Arduino receives a compact, single-line JSON result (`ok` or `invalid`).
* **Clear UX:** **Green** = Accepted, **Red** = Invalid, **Amber** = Timeout/Error.

---

### 2. 🏗️ High-Level Architecture & Protocol

The system operates in a chain:
**Arduino (Sensors) $\rightarrow$ Serial $\rightarrow$ Serial Bridge (Node) $\rightarrow$ Backend (Express + `chess.js`)**

The response follows the reverse path:
**Backend (HTTP Response) $\rightarrow$ Serial Bridge $\rightarrow$ Serial $\rightarrow$ Arduino (LEDs)**

#### Key Message Formats

| Step | Sender $\rightarrow$ Receiver | Format | Example Status |
| :--- | :--- | :--- | :--- |
| **Move** | Bridge $\rightarrow$ Backend | `POST /white/move` | `{"from": "e2", "to": "e4"}` |
| **Result** | Backend $\rightarrow$ Bridge | `HTTP 200/400 JSON` | Success or `{"error": "Invalid move"}` |
| **Feedback** | Bridge $\rightarrow$ Arduino | **Single-line JSON** | `{"type":"move_result", "status":"ok"}` |

---

### 3. 🌉 Bridge Implementation (`serial-bridge.js`)

The Bridge is the central logic hub responsible for:
* **Move Pairing:** Combining raw `removed` and `placed` serial events (within a `PAIR_WINDOW_MS`) into a candidate move `{from, to}`.
* **Backend Communication:** Posting the move to the correct endpoint (`/white/move` or `/black/move`).
* **Response Forwarding:** Translating the verbose HTTP response from the backend into the **compact, single-line JSON `move_result`** and writing it back to the Arduino via Serial.
* **Resilience:** Adding **retries** for transient network errors and a fallback to report `status: 'error'` to the Arduino after timeout.

---

### 4. 🤖 Arduino Implementation (State Machine)

The Arduino will use a state machine to manage the move detection and feedback:

| State | Event | Action/Transition |
| :--- | :--- | :--- |
| **IDLE** | Piece `removed` | $\rightarrow$ **WAIT\_FOR\_PLACED**, store `fromSquare`. |
| **WAIT\_FOR\_PLACED** | Piece `placed` (on different square) | Send move to Bridge, $\rightarrow$ **WAIT\_FOR\_REPLY**, start 5–7s timeout. |
| **WAIT\_FOR\_PLACED** | Timeout (30s) / Piece `placed` (same square) | Cancel move, **Flash Amber**, $\rightarrow$ **IDLE**. |
| **WAIT\_FOR\_REPLY** | Serial Reply: `status: 'ok'` | **Blink GREEN (2x)**, $\rightarrow$ **IDLE**. |
| **WAIT\_FOR\_REPLY** | Serial Reply: `status: 'invalid'` | **Blink RED (3x)**, $\rightarrow$ **IDLE**. |
| **WAIT\_FOR\_REPLY** | Reply Timeout (5–7s) | **Blink AMBER**, $\rightarrow$ **IDLE** (prompt player to retry). |

---

### 5. 🛡️ Security & Testing

* **Security:** Implement an optional `x-api-key` header for public deployments.
* **Testing:** Use **Unit Tests** for `chess.js` logic and a **Local Simulator** (`simulate-arduino.js`) to test end-to-end communication and serial response handling before moving to the physical hardware.

---

### 6. ⏭️ Next Steps (Priority High)

1.  Patch the Bridge to send back the `move_result` JSON over Serial with retry logic.
2.  Add an Arduino example sketch (`feedback_example.ino`) to parse the serial JSON reply and control the LEDs (Green, Red, Amber).

The plan is ready for implementation. Do you confirm the plan and wish to proceed with the code patches using the suggested LED pins (GREEN=10, RED=11)?

## What Code to Copy to Another Laptop?

**Scenario 1: Run Simulator (no hardware, just testing moves)**

Copy only:
```
backend/
  ├── package.json
  ├── package-lock.json
  ├── simulate-arduino.js
  └── (run npm install on new laptop)
```

Command on new laptop:
```bash
cd backend
npm install
node simulate-arduino.js --host https://arduino-chess.onrender.com --removed D7 --placed D6 --execute
```

Result: Opens browser to `https://arduino-chess.vercel.app` and sees board update.

---

**Scenario 2: Connect Physical Arduino (with hardware)**

Copy:
```
backend/
  ├── package.json
  ├── package-lock.json
  ├── serial-bridge.js
  └── (run npm install on new laptop)

arduino/
  └── shatranjbot.ino (for reference only; code stays flashed on board)
```

Command on new laptop:
```bash
cd backend
npm install
node serial-bridge.js --port COM3 --baud 9600 --host https://arduino-chess.onrender.com
```

Result: Reads Arduino USB → POSTs to backend → browser shows updates.

---

**Scenario 3: Run Everything Locally (offline demo)**

Copy entire `backend/` and `frontend/` folders, then:

```bash
# Terminal 1: Start backend
cd backend && npm install && node server.js

# Terminal 2: Start frontend
cd frontend && npm install && npm run dev
```

Result: Backend on `http://localhost:4000`, frontend on `http://localhost:5173`. Works offline.

---

**Recommended for teacher demo:** Use Scenario 1 (Simulator only).
- Copy `backend/` folder (~10-50 MB with node_modules, or ~100 KB without).
- Run `npm install`.
- Run the simulator command.
- No need to copy frontend — it's already on Vercel.

---

## Using serial-bridge on the same laptop

Short recommended workflow for your described setup (frontend/backend online, Arduino local)

- If using UNO/Nano/legacy Arduino: use serial-bridge on the same laptop; it's easiest. Run:
    - `node serial-bridge.js --port COM3 --baud 9600 --host https://arduino-chess.onrender.com`
- If using ESP32: deploy the backend and set api_key, then flash ESP32 with the HTTP example pointing to https://arduino-chess.onrender.com with the API key.
- Verify by running simulator first to be sure backend and frontend work before connecting hardware:
    - `node simulate-arduino.js --host https://arduino-chess.onrender.com --removed D7 --placed D6 --execute`