import React, { useEffect, useRef, useState } from "react";
import { Chess } from "chess.js";
import Board from "./components/Board";
import StatusIndicator from "./components/StatusIndicator"

export default function App() {
  const game = useRef(null);
  const [fen, setFen] = useState(() => new Chess().fen());
  const [connected, setConnected] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    if (!game.current) game.current = new Chess();
  }, []);

  useEffect(() => {
    // Use Vite-provided env var when available, otherwise derive from the HTTP backend
    const defaultHttp = import.meta.env.VITE_BACKEND_HTTP || 'http://localhost:4000';
    const wsUrl = import.meta.env.VITE_BACKEND_WS || defaultHttp.replace(/^http/, 'ws');
    const ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      setConnected(true);
      console.log("Connected to WebSocket");
    };

    ws.onmessage = (msg) => {
      try {
        const data = JSON.parse(msg.data);

        if (data.type === "state" && data.fen) {
          // initial state sent by server on connection
          if (!game.current) game.current = new Chess();
          game.current.load(data.fen);
          setFen(data.fen);
          setStatus(
            `Turn: ${data.turn === "white" ? "White" : "Black"}`
          );
          return;
        }

        if (data.type === "reset") {
          game.current = new Chess();
          setFen(data.fen);
          setStatus("Board Reset");
          return;
        }

        if (data.type === "move" && data.fen) {
          console.log("♟ Move received:", data.move);
          game.current.load(data.fen);
          setFen(data.fen);

          if (data.in_checkmate) setStatus("Checkmate!");
          else if (data.in_check) setStatus("Check!");
          else if (data.in_draw) setStatus("Draw!");
          else
            setStatus(
              `Turn: ${data.turn === "white" ? "White" : "Black"}`
            );
        }
      } catch (err) {
        console.error("Move parse error:", err);
      }
    };

    ws.onclose = () => {
      setConnected(false);
      console.log("WebSocket closed");
    };

    return () => ws.close();
  }, []);

  return (
    <div
      style={{
        textAlign: "center",
        marginTop: 20,
        fontFamily: "'Segoe UI', system-ui, sans-serif",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        minHeight: "100vh",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "rgba(255,255,255,0.95)",
          borderRadius: 20,
          padding: "30px",
          margin: "0 auto",
          maxWidth: 800,
          boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
          border: "1px solid rgba(255,255,255,0.2)",
          backdropFilter: "blur(10px)",
        }}
      >
        <h1
          style={{
            fontSize: "2.5rem",
            fontWeight: "700",
            background: "linear-gradient(135deg, #2c3e50, #34495e)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            marginBottom: 10,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 12,
          }}
        >
          <span style={{ fontSize: "2.8rem" }}>♟</span>
          Arduino Chessboard
        </h1>

        <p
          style={{
            color: "#7f8c8d",
            fontSize: 16,
            marginBottom: 30,
            fontWeight: "500",
          }}
        >
          Live moves from your physical chessboard
        </p>

        <Board fen={fen} />

        <StatusIndicator connected={connected} status={status} />

        <div
          style={{
            background: "#f8f9fa",
            padding: "15px 20px",
            borderRadius: 10,
            marginTop: 20,
            border: "1px solid #e9ecef",
          }}
        >
          <p
            style={{
              color: "#495057",
              fontSize: 13,
              fontWeight: "600",
              marginBottom: 8,
              textTransform: "uppercase",
              letterSpacing: 0.5,
            }}
          >
            Current FEN
          </p>
          <p
            style={{
              color: "#2c3e50",
              fontSize: 12,
              fontFamily: "monospace",
              background: "#e9ecef",
              padding: "8px 12px",
              borderRadius: 6,
              wordBreak: "break-all",
              border: "1px solid #dee2e6",
            }}
          >
            {fen}
          </p>
        </div>
      </div>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.7; }
            100% { opacity: 1; }
          }
        `}
      </style>
    </div>
  );
}
