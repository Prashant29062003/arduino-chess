import express from "express";
import cors from "cors";
import { WebSocketServer } from "ws";
import { Chess } from "chess.js";

const app = express();
const PORT =  process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

const server = app.listen(PORT, () =>
  console.log(`🚀 Server running on port ${PORT}`)
);

const wss = new WebSocketServer({ server });

let game = new Chess();
let latestArduinoEvent = null; // store last raw coordinate/event from Arduino

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === 1) client.send(msg);
  });
}

wss.on("connection", (ws) => {
  console.log("🟢 Client connected");
  ws.send(JSON.stringify({ type: "state", fen: game.fen() }));

  ws.on("close", () => console.log("🔴 Client disconnected"));
  ws.onerror = (error) => console.error("WebSocket error:", error);
});

// heartbeat for detecting dead clients and keeping connections alive
wss.on('connection', (ws) => {
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
});

// Periodically ping clients and terminate dead connections
const interval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) return ws.terminate();
    ws.isAlive = false;
    try { ws.ping(); } catch (e) { /* ignore */ }
  });
}, 30000);

// Clean up interval on server close
server.on('close', () => clearInterval(interval));

app.post("/white/move", (req, res) => {
  try {
    if (game.turn() !== "w")
      return res.status(400).json({ error: "Not white's turn" });

    const { from, to } = req.body;
    let move;
    try {
      move = game.move({ from, to });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid move', detail: err.message, from, to });
    }

    if (!move)
      return res.status(400).json({ error: "Invalid move", from, to });

    console.log(`⚪ White plays: ${move.san}`);

    const state = {
      type: "move",
      move,
      fen: game.fen(),
      turn: game.turn() === "w" ? "white" : "black",
      in_check: game.isCheck(),
      in_checkmate: game.isCheckmate(),
      in_draw: game.isDraw(),
      game_over: game.isGameOver?.() || game.isGameOver,
    };

    broadcast(state);
    return res.json(state);
  } catch (err) {
    console.error('Error handling /white/move:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post("/black/move", (req, res) => {
  try {
    if (game.turn() !== "b")
      return res.status(400).json({ error: "Not black's turn" });

    const { from, to } = req.body;
    let move;
    try {
      move = game.move({ from, to });
    } catch (err) {
      return res.status(400).json({ error: 'Invalid move', detail: err.message, from, to });
    }

    if (!move)
      return res.status(400).json({ error: "Invalid move", from, to });

    console.log(`⚫ Black plays: ${move.san}`);

    const state = {
      type: "move",
      move,
      fen: game.fen(),
      turn: game.turn() === "w" ? "white" : "black",
      in_check: game.isCheck(),
      in_checkmate: game.isCheckmate(),
      in_draw: game.isDraw(),
      game_over: game.isGameOver?.() || game.isGameOver,
    };

    broadcast(state);
    return res.json(state);
  } catch (err) {
    console.error('Error handling /black/move:', err);
    return res.status(500).json({ error: 'server_error' });
  }
});

app.post("/reset", (req, res) => {
  game.reset();
  const state = { type: "reset", fen: game.fen() };
  console.log("♻️ Board reset");
  broadcast(state);
  res.json(state);
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    clients: wss.clients.size,
    port: PORT,
    turn: game.turn() === "w" ? "white" : "black",
  });
});

// Endpoint for receiving raw Arduino events (coordinates / piece notices)
// Example body: { type: 'removed'|'placed', square: 'H2', piece: 'Pawn' }
app.post('/arduino/event', (req, res) => {
  const { type, square, piece } = req.body || {};
  if (!type || !square) return res.status(400).json({ error: 'type and square required' });

  const event = { type: 'arduino', subType: type, square, piece: piece || null, ts: Date.now() };
  latestArduinoEvent = event;
  console.log('🔌 Arduino event:', event);

  // Broadcast to websocket clients so frontend can react in real-time
  broadcast({ type: 'arduino', event });

  res.json({ status: 'ok', event });
});

// Simple API to fetch last Arduino event
app.get('/arduino/latest', (req, res) => {
  if (!latestArduinoEvent) return res.status(404).json({ error: 'no events yet' });
  res.json({ event: latestArduinoEvent });
});