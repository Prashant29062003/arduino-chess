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

```
chess-and-arduino/
├── backend/
│   ├── server.js          # Express + WebSocket server
│   ├── serial-bridge.js   # Optional: Arduino Serial bridge script
│   ├── package.json
│
├── frontend/
│   ├── public/
│   │   └── pieces/        # Custom chess piece SVGs (wP.svg, bK.svg, etc.)
│   ├── src/
│   │   └── App.jsx        # React app displaying chessboard + WebSocket logic
│   ├── package.json
│
└── README.md
```

---

## ⚙️ Backend Setup

```bash
cd backend
npm install
node server.js
```

Output:

```
🚀 Server running on port 4000
🟢 Client connected
```

---

## ⚙️ Frontend Setup

```bash
cd frontend
npm install
npm run dev
```

Then open 👉 **[http://localhost:5173](http://localhost:5173)**

---

## 🔌 API Reference

### ♙ White move

```bash
POST /white/move
Content-Type: application/json
{
  "from": "e2",
  "to": "e4"
}
```

### ♟ Black move

```bash
POST /black/move
Content-Type: application/json
{
  "from": "e7",
  "to": "e5"
}
```

### ♻️ Reset

```bash
POST /reset
```

### ❤️ Health check

```bash
GET /health
```

---

## 🧩 WebSocket Events

| Event             | Description                                              |
| ----------------- | -------------------------------------------------------- |
| `{type: "move"}`  | A valid move has been made (includes full FEN and state) |
| `{type: "reset"}` | Board reset signal                                       |
| `{type: "state"}` | Full game state sync for new clients                     |

**Example move message:**

```json
{
  "type": "move",
  "move": { "from": "e2", "to": "e4", "piece": "p", "san": "e4" },
  "fen": "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1",
  "turn": "black",
  "in_check": false,
  "in_checkmate": false,
  "in_draw": false
}
```

---

## 🧪 Example Game (Scholar’s Mate)

```bash
curl -X POST http://localhost:4000/white/move -H "Content-Type: application/json" -d '{"from":"e2","to":"e4"}'
curl -X POST http://localhost:4000/black/move -H "Content-Type: application/json" -d '{"from":"e7","to":"e5"}'
curl -X POST http://localhost:4000/white/move -H "Content-Type: application/json" -d '{"from":"d1","to":"h5"}'
curl -X POST http://localhost:4000/black/move -H "Content-Type: application/json" -d '{"from":"b8","to":"c6"}'
curl -X POST http://localhost:4000/white/move -H "Content-Type: application/json" -d '{"from":"f1","to":"c4"}'
curl -X POST http://localhost:4000/black/move -H "Content-Type: application/json" -d '{"from":"g8","to":"f6"}'
curl -X POST http://localhost:4000/white/move -H "Content-Type: application/json" -d '{"from":"h5","to":"f7"}'
```

Your frontend will automatically show 🏁 **Checkmate!**

---

## 🧠 System Flow

```
Arduino (Sensors) 
   ↓ JSON Move Data
Backend (Express + Chess.js)
   ↓ WebSocket
Frontend (React)
```

1. Arduino sends `{from, to}` when a move is detected.
2. Backend validates move with `chess.js`.
3. Broadcasts updated `fen` and state to all connected clients.
4. React frontend updates the board instantly.

---

## ⚙️ Arduino Integration

### 🔩 Components Needed

| Component                       | Description                |
| ------------------------------- | -------------------------- |
| Arduino UNO / ESP32             | Reads board sensors        |
| 64 Reed Switches / Hall Sensors | One under each square      |
| Magnets in Chess Pieces         | Detects presence           |
| Multiplexers (optional)         | Reduce pin count           |
| USB Cable or Wi-Fi              | Communication with backend |

---

### 🧲 Hardware Working Principle

* Each square has a magnetic sensor.
* When a piece is **lifted**, the sensor changes from “LOW → HIGH”.
* When a piece is **placed**, it goes “HIGH → LOW”.
* Arduino detects both squares — that gives the move:

  ```
  { "from": "e2", "to": "e4" }
  ```
* Then it automatically sends that move to your backend via Serial or Wi-Fi.

---

### 🪄 Option 1: Serial Communication (via Node.js Bridge)

Arduino sketch (`arduino_chess.ino`):

```cpp
#include <ArduinoJson.h>

void setup() {
  Serial.begin(9600);
}

void loop() {
  // Example: mock sending move (you’ll replace this with actual sensors)
  StaticJsonDocument<128> doc;
  doc["from"] = "e2";
  doc["to"] = "e4";
  serializeJson(doc, Serial);
  Serial.println();
  delay(5000);  // Send every 5s for testing
}
```

Node bridge (`serial-bridge.js`):

```js
import { SerialPort, ReadlineParser } from "serialport";
import fetch from "node-fetch";

const port = new SerialPort({ path: "/dev/ttyUSB0", baudRate: 9600 });
const parser = port.pipe(new ReadlineParser({ delimiter: "\n" }));

let turn = "white";

parser.on("data", async (line) => {
  try {
    const data = JSON.parse(line);
    console.log(`Move detected: ${data.from} → ${data.to}`);

    await fetch(`http://localhost:4000/${turn}/move`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ from: data.from, to: data.to }),
    });

    turn = turn === "white" ? "black" : "white";
  } catch (err) {
    console.error("Parse error:", err);
  }
});
```

Run it:

```bash
node serial-bridge.js
```

Now physical moves are automatically sent to your backend and appear on your frontend.

---

### 🌐 Option 2: ESP32 Wi-Fi Direct POST

If using ESP32, send HTTP POST directly:

```cpp
#include <WiFi.h>
#include <HTTPClient.h>

const char* ssid = "YOUR_WIFI";
const char* password = "YOUR_PASS";

void setup() {
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) delay(500);
}

void loop() {
  HTTPClient http;
  http.begin("http://192.168.1.100:4000/white/move");
  http.addHeader("Content-Type", "application/json");
  http.POST("{\"from\":\"e2\",\"to\":\"e4\"}");
  http.end();
  delay(10000);
}
```

---

## 🧰 Future Enhancements

* 🪄 Auto-move endpoints (`/auto/move`)
* 💾 Move history with undo/redo
* 🎯 Move highlighting animations
* ⚙️ Servo control for robotic piece movement
* 🔉 Voice move announcements
* ☁️ Cloud multiplayer support

---

## 📜 License

MIT © 2025 **Prashant Kumar**