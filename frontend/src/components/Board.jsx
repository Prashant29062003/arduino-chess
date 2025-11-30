import React from 'react'
import Square from './Square';
function Board({ fen }) {
  const rows = fen.split(" ")[0].split("/");

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(8, 70px)",
        border: "12px solid #2c3e50",
        borderRadius: 8,
        boxShadow: `
          0 12px 40px rgba(0,0,0,0.3),
          inset 0 1px 0 rgba(255,255,255,0.1)
        `,
        margin: "30px auto",
        background: "linear-gradient(145deg, #34495e, #2c3e50)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* File labels (a-h) */}
      {/* Top file labels (a-h) - added to show labels on both top and bottom */}
      <div
        style={{
          position: "absolute",
          top: -25,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          padding: "0 35px",
        }}
      >
        {["a", "b", "c", "d", "e", "f", "g", "h"].map((file) => (
          <span
            key={`top-${file}`}
            style={{ color: "#ecf0f1", fontWeight: "600", fontSize: 14 }}
          >
            {file}
          </span>
        ))}
      </div>

      {/* Bottom file labels (a-h) */}
      <div
        style={{
          position: "absolute",
          bottom: -25,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "space-around",
          padding: "0 35px",
        }}
      >
        {["a", "b", "c", "d", "e", "f", "g", "h"].map((file) => (
          <span
            key={`bottom-${file}`}
            style={{ color: "#ecf0f1", fontWeight: "600", fontSize: 14 }}
          >
            {file}
          </span>
        ))}
      </div>

      {/* Rank labels (1-8) */}
      <div
        style={{
          position: "absolute",
          left: -25,
          top: 0,
          bottom: 0,
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-around",
          padding: "35px 0",
        }}
      >
        {[8, 7, 6, 5, 4, 3, 2, 1].map((rank) => (
          <span
            key={rank}
            style={{ color: "#ecf0f1", fontWeight: "600", fontSize: 14 }}
          >
            {rank}
          </span>
        ))}
      </div>

      {rows.map((row, rIdx) => {
        const squares = [];
        for (let ch of row) {
          if (isNaN(ch)) squares.push(ch);
          else for (let i = 0; i < Number(ch); i++) squares.push("");
        }
        return squares.map((sq, cIdx) => {
          // calculate coordinates: files a-h, ranks 8-1
          const file = String.fromCharCode(97 + cIdx); // 'a' + cIdx
          const rank = 8 - rIdx; // rIdx 0 => rank 8
          const coord = `${file}${rank}`;

          return (
            <Square
              key={`${rIdx}-${cIdx}`}
              piece={sq}
              dark={(rIdx + cIdx) % 2 === 1}
              isHighlighted={false} // You can implement move highlighting logic here
              coord={coord}
            />
          );
        });
      })}
    </div>
  );
}

export default Board