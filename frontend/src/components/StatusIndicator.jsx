import React from 'react'

function StatusIndicator({ connected, status }) {
  const getStatusColor = () => {
    if (status.includes("Checkmate")) return "#e74c3c";
    if (status.includes("Check")) return "#f39c12";
    if (status.includes("Draw")) return "#95a5a6";
    if (status.includes("White")) return "#ecf0f1";
    if (status.includes("Black")) return "#2c3e50";
    return "#7f8c8d";
  };

  return (
    <div
      style={{
        background: "linear-gradient(135deg, #34495e, #2c3e50)",
        padding: "20px 30px",
        borderRadius: 12,
        boxShadow: "0 4px 15px rgba(0,0,0,0.2)",
        margin: "20px auto",
        maxWidth: 400,
        border: "1px solid rgba(255,255,255,0.1)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: 12,
          marginBottom: 15,
        }}
      >
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: "50%",
            background: connected ? "#2ecc71" : "#e74c3c",
            boxShadow: connected ? "0 0 12px #2ecc71aa" : "0 0 12px #e74c3caa",
            animation: connected ? "pulse 2s infinite" : "none",
          }}
        />
        <span
          style={{
            color: "#ecf0f1",
            fontWeight: "600",
            fontSize: 14,
            textTransform: "uppercase",
            letterSpacing: 1,
          }}
        >
          {connected ? "Connected" : "Disconnected"}
        </span>
      </div>

      <div
        style={{
          color: getStatusColor(),
          fontSize: 18,
          fontWeight: "600",
          textAlign: "center",
          padding: "12px 0",
          background: "rgba(0,0,0,0.2)",
          borderRadius: 8,
          border: "1px solid rgba(255,255,255,0.05)",
          transition: "all 0.3s ease",
        }}
      >
        {status || "Waiting for moves..."}
      </div>
    </div>
  );
}
export default StatusIndicator