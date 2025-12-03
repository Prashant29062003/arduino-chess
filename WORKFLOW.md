# Demo Workflow — Arduino Chessboard Live

Short: A compact, teacher-friendly workflow with three demonstration modes (Quick Deployed, Local, Hardware). Each mode lists the exact commands and verification steps so you can run the demo without surprises.

---

## Understanding the Architecture (IMPORTANT)

**Where does each piece of code run?**

1. **Arduino Code** (`arduino/shatranjbot.ino` or your custom sketch)
   - Runs ON the Arduino board itself (flashed via Arduino IDE).
   - The Arduino reads physical sensors and prints tokens like `REMOVED:E2:Pawn` or `PLACED:E4:Pawn` to its serial port.
   - You flash this code **once** to the board; it stays there and runs automatically when the board powers on.
   - Do NOT run this in VS Code.

2. **Backend Code** (`backend/server.js`)
   - Runs on a server (either Render.com deployed OR locally on your laptop).
   - This is the authoritative game engine (uses chess.js for move validation).
   - To run locally: `node server.js` or `npm run dev` in VS Code terminal.
   - If deployed to Render, it runs on Render's servers (not your laptop).

3. **Frontend Code** (`frontend/src/App.jsx`, etc.)
   - Runs in the browser (either on Vercel deployed OR locally on your laptop).
   - This is the UI that displays the chessboard.
   - To run locally: `npm run dev` in VS Code terminal → opens on `http://localhost:5173`.
   - If deployed to Vercel, it runs on Vercel's servers (not your laptop).

4. **Simulator** (`backend/simulate-arduino.js`)
   - A testing tool that **simulates** Arduino events WITHOUT needing real hardware.
   - Runs in VS Code terminal: `node simulate-arduino.js --host ... --removed D7 --placed D6 --execute`.
   - You run this **multiple times** for testing different moves.
   - This is NOT the Arduino code — it's a helper script to test the backend without physical hardware.

5. **Serial Bridge** (`backend/serial-bridge.js`)
   - Bridges the physical Arduino to the backend.
   - Runs in VS Code terminal on your laptop (same machine as the Arduino via USB).
   - Reads tokens from Arduino serial port and POSTs them to the backend (local or deployed).
   - You run this **once per demo session** and keep it running.

**Simple Flow Diagram:**

```
Physical Scenario: Arduino on desk → USB to laptop
                        ↓
                  [serial-bridge.js]
                   (runs in VS Code)
                        ↓
                  [Deployed Backend]
                  (Render.com: always on)
                        ↓
                  [Deployed Frontend]
                  (Vercel: browser opens)
                        ↓
                   Teacher sees
                  board update in
                     real-time

Testing Scenario: No hardware needed
                        ↓
                [simulate-arduino.js]
                 (runs in VS Code)
                        ↓
                [Deployed Backend]
                (Render.com: always on)
                        ↓
                [Deployed Frontend]
                (Vercel: browser opens)
                        ↓
                  Teacher sees
                  board update in
                     real-time
```

---

## Common Questions Answered

**Q: Do I need to run `node simulate-arduino.js` every time?**
- A: Only for testing/demoing moves without physical hardware. If you have an Arduino connected, you use the serial-bridge instead (run once and leave it).

**Q: Do I need backend and frontend code locally if they're deployed to Render and Vercel?**
- A: **No, you don't need to run them locally** if they're already deployed. But you DO need the backend folder locally (in VS Code) to run the simulator or serial-bridge (they are Node scripts). You only run the backend locally if testing offline.

**Q: Which file do I edit the most?**
- Arduino code: edit once, flash once, runs forever on the board.
- Backend/Frontend: edit in VS Code, test locally or push to GitHub to auto-deploy.
- Simulator: run as-is; no edits needed (it's a pre-made testing tool).

**Q: So for the teacher demo, what do I actually run?**

1. **If using Arduino hardware:**
   - Flash the Arduino code to the board once (done before the demo).
   - On your laptop, run the serial-bridge: `node serial-bridge.js --port COM3 --baud 9600 --host https://arduino-chess.onrender.com`.
   - Open the browser to https://arduino-chess.vercel.app (deployed frontend).
   - Move pieces on the physical board; the bridge relays events to the backend; the frontend updates.
   - No simulator needed.

2. **If testing without Arduino (no hardware available):**
   - Run the simulator in VS Code: `node simulate-arduino.js --host https://arduino-chess.onrender.com --removed D7 --placed D6 --execute`.
   - Open the browser to https://arduino-chess.vercel.app (deployed frontend).
   - Run the simulator again for each test move.
   - Repeat as needed.

---

## Pre-Demo Checklist
- Install dependencies: `cd backend && npm install`, `cd frontend && npm install`
- Set environment variables:
  - For deployed test: `VITE_BACKEND_HTTP=https://arduino-chess.onrender.com`, `VITE_BACKEND_WS=wss://arduino-chess.onrender.com`
  - For local test: set `frontend/.env` with `http://localhost:4000` and `ws://localhost:4000`
- Verify backend health: `curl https://arduino-chess.onrender.com/health` (deployed) or `curl http://localhost:4000/health` (local)
- Confirm the frontend is pointed at the correct backend and has been (re)deployed if Vercel/Netlify envs changed.
- If using `API_KEY`, ensure the bridge/simulator includes `x-api-key` header.

---

## Mode A — Quick Deployed Demo (internet-based, fast)
When: You want a fast, minimal demo using the deployed services.
What it shows: Deployed frontend (Vercel) + deployed backend (Render). Move validation and instantaneous UI updates.

Commands:
```bash
# Health check
curl -sS https://arduino-chess.onrender.com/health | jq .

# Run simulator, execute move
cd backend
node simulate-arduino.js --host https://arduino-chess.onrender.com --removed D7 --placed D6 --piece Pawn --execute
```

Verification:
- Watch the simulator terminal: you should see `Posted event` lines then `Move response` JSON.
- Browser: open `https://arduino-chess.vercel.app/` and check the board updates.
- Browser Console: Look for `Connected to WebSocket` and `♟ Move received:` logs.

Talking points:
- “We validate moves on the server using chess.js; the UI reflects the server’s state in real time.”

---

## Mode B — Local Demo (no internet required)
When: You must demo offline or avoid network issues during class.
What it shows: Full stack running locally (backend, frontend), and WebSocket-based updates on the same machine.

Commands (start backend):
```bash
cd backend
# run the server locally
node server.js
# or - use the dev script
npm run dev
```

Commands (start frontend locally):
```bash
cd frontend
cat > .env <<EOF
VITE_BACKEND_HTTP=http://localhost:4000
VITE_BACKEND_WS=ws://localhost:4000
EOF
npm run dev
```

Run the simulator against local backend:
```bash
cd backend
node simulate-arduino.js --host http://localhost:4000 --removed D7 --placed D6 --piece Pawn --execute
```

Verification:
- Open the local frontend: `http://localhost:5173`, watch the move and status area update.
- Backend logs show incoming POSTs and `Move response`
- Use `wscat -c ws://localhost:4000` to view WebSocket frames if necessary.

Talking points:
- “This mode demonstrates the exact same behavior without requiring a stable internet connection.”

---

## Mode C — Hardware Demo (physical board + laptop/bridge)
When: You want to show the full physical flow using an Arduino board.
What it shows: Physical action triggers, serial bridge (or Wi-Fi board), server move validation, and UI updates.

Setup steps:
1. Plug Arduino into laptop via USB and identify the serial port (Windows: `COMx`, Linux: `/dev/ttyUSB0`).
2. Ensure Arduino is flashed with a sketch that prints tokens (e.g., `REMOVED:E2:Pawn` and `PLACED:E4:Pawn`) or JSON move lines.
3. Launch the serial bridge pointing to the backend (deployed or local):
```bash
cd backend
# For deployed backend:
node serial-bridge.js --port COM3 --baud 9600 --host https://arduino-chess.onrender.com

# For local backend:
node serial-bridge.js --port COM3 --baud 9600 --host http://localhost:4000
```

How to demo:
- Lift a piece (Arduino prints `REMOVED`), place it in a legal square (Arduino prints `PLACED`). The bridge pairs and posts the move.
- The Arduino can show LED feedback from the bridge’s `move_result` JSON (green/red).
- The front end shows the new move; mention `turn`, `_in_check_` or `checkmate` when applicable.

Verification:
- Watch the `serial-bridge` logs for raw events and `Move response` data.
- Check the frontend for the corresponding board update.

Talking points:
- “This is the production user experience: the real board triggers a validated move, and the web UI updates instantly.”

---

## Common Troubleshooting (Quick fixes)
- Backend `health` fails: verify Render status or local `node server.js` is running.
- Simulator posts but server rejects move: check `/health` to get `turn` and target correct `/white/move` or `/black/move`.
- Frontend doesn’t update: verify WebSocket URL and set `VITE_BACKEND_WS` to `wss://` for deployed and restart/redeploy the frontend.
- API key rejections: add `x-api-key` to `simulate-arduino.js` or `serial-bridge.js` requests if `API_KEY` is required.
- Serial bridge fails to open port: confirm the port name and permissions; on Windows, ensure COM port not in use.

---

## Demo Script (copy/paste)
```bash
# Quick check
curl -sS https://arduino-chess.onrender.com/health

# Run simulator against deployed backend
cd backend
node simulate-arduino.js --host https://arduino-chess.onrender.com --removed D7 --placed D6 --piece Pawn --execute
# Watch frontend update and explain flow
```

---

If you’d like, I can:
- Create a `demo.sh` script with the commands above for one-click demos
- Add a short one-minute screen recording to the repo as a demo fallback
- Add small UI elements to the frontend to show connection status and last move message for easier live inspection

Pick which one you want and I’ll add it next.
