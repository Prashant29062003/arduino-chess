# ♟ Arduino Chessboard Live

A full-stack **real-time chessboard** controlled via **Arduino** and **WebSocket communication** — built with
**Node.js (Express + WS)** for the backend and **React + Chess.js** for the frontend.

The system visualizes every chess move from your **physical chessboard** (via Arduino sensors) or manual API requests in real time — including check, checkmate, and draw detection.

---

## 🚀 Features

* ♟ **Real-time move updates** via WebSockets
* 🧠 **Full chess rules** powered by `chess.js` (valid moves, turn logic, check, checkmate, draw)
* ⚡ **Dual endpoints** for `/white/move` and `/black/move` (true turn-based control)
* 🧩 **Frontend chessboard renderer** with custom piece images
* ♻️ **Reset** and **Health check** endpoints
* 🧪 Fully testable using simple `curl` commands — no Arduino required during development

---

## 🏗️ Tech Stack

| Layer             | Tech                                                      |
| ----------------- | --------------------------------------------------------- |
| **Frontend**      | React 19, Vite, Chess.js                                  |
| **Backend**       | Node.js, Express, WebSocket (WS)                          |
| **Communication** | WebSocket (real-time broadcast)                           |
| **Data Format**   | JSON (`{ piece, from, to, fen, in_check, in_checkmate }`) |

---

## 📁 Project Structure


chess-and-arduino/
├── backend/
# ♟ Arduino Chessboard Live

A full-stack real-time chessboard that integrates a physical Arduino-based board with a Node.js backend and a React frontend. The backend is authoritative (uses `chess.js`) and broadcasts game updates to connected frontends via WebSocket.

This README covers local setup, env variables, running the serial bridge or simulator, and short deployment notes.

---

## 🚀 Quick Start

- Backend (API + WebSocket)

```bash
cd backend
npm install
# use .env for configuration (see backend/.env.sample)
npm run dev          # or `node server.js` for production
```

- Frontend (Vite + React)

```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173


---

## **Environment**

- `backend/.env.sample` contains recommended variables: `PORT`, `API_KEY` (optional for securing Arduino/bridge), `BACKEND_HOST`, `SERIAL_PORT`, `SERIAL_BAUD`, `PAIR_WINDOW_MS`.
- `frontend/.env.sample` shows `VITE_BACKEND_HTTP` and `VITE_BACKEND_WS` for configuring the client.

Copy samples to actual env files locally and fill secrets:

```bash
cp backend/.env.sample backend/.env
cp frontend/.env.sample frontend/.env
```

Do NOT commit `.env` files (they are excluded by `.gitignore`).

---

## **Project Layout**

```
/
├── arduino/        # Arduino sketch(s)
├── backend/        # Node.js server, serial-bridge, simulator
├── frontend/       # React app (Vite)
├── .gitignore
└── README.md
```

---

## **API (quick reference)**

- POST `/white/move`  { from: "e2", to: "e4" }
- POST `/black/move`  { from: "e7", to: "e5" }
- POST `/reset`
- GET  `/health`      returns `{ status, clients, port, turn }`
- POST `/arduino/event` raw Arduino events: `{ type: 'removed'|'placed', square: 'E2', piece: 'Pawn' }`

All endpoints expect JSON and respond with the updated FEN and move metadata on success.

---

## **Running the Serial Bridge & Simulator**

- Serial bridge (reads Arduino over USB and posts events/moves to backend):

```bash
cd backend
# Example: node serial-bridge.js --port COM3 --baud 9600 --host http://localhost:4000
node serial-bridge.js --port COM3 --baud 9600 --host http://localhost:4000
```

- Simulator (post fake removed/placed events or execute a move):

```bash
cd backend
# Simulate a removal and placement and execute the move against the server
node simulate-arduino.js --removed D7 --placed D6 --piece Pawn --execute

# Send a single raw event
node simulate-arduino.js --event "placed,E2,Pawn"
```

Note: If you configure `API_KEY` in `backend/.env`, update the bridge and simulator to send the `x-api-key` header (recommended for public exposure).

---

## **Git / Repo Guidance**

- This project works well as a single repository (monorepo) containing `arduino`, `backend`, and `frontend` folders. It's simple for local dev and smaller teams.
- Keep secrets out of Git: commit `.env.sample` but add `.env` to `.gitignore`.
- Useful root `.gitignore` entries: `node_modules/`, `dist/`, `.env`, editor folders, and compiled Arduino artifacts.

Example quick push (already initialized):

```bash
git add .
git commit -m "Initial import"
git remote add origin git@github.com:<user>/<repo>.git
git push -u origin main
```

If you ever need to split a folder into its own repository later, use `git subtree split` or `git filter-repo`.

---

## **Deployment Notes**

- Frontend: Vercel or Netlify (static), free tiers available.
- Backend (WebSocket/persistent): prefer Render, Fly.io, Railway, or a small VPS/Oracle Always Free VM — serverless platforms are not ideal for long-lived WebSockets.
- For quick testing expose local backend via `ngrok` or Cloudflare Tunnel; secure endpoints with `API_KEY` when exposed to the internet.

---

## **Development Tips**

- Start backend first so the frontend can connect to WebSocket on load.
- If the frontend cannot connect to WebSocket, check `VITE_BACKEND_WS` or that the backend's `PORT` is correct.
- Use the simulator for rapid testing without hardware.

---

## **Contributing**

- Add issues / PRs. If you change API shapes, update `README.md` and frontend accordingly.
- Keep commits focused to one area (backend/frontend/arduino) when possible.

---

## **License**

MIT © 2025 **Prashant Kumar**
