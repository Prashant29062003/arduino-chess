import React from 'react'

function Square({ piece, dark, isHighlighted, coord }) {
  const hasPiece = !!piece;
  const isWhite = hasPiece && piece === piece.toUpperCase();
  const pieceName = hasPiece ? `${isWhite ? 'w' : 'b'}${piece.toUpperCase()}` : null;

  return (
    <div
      style={{
        width: 70,
        height: 70,
        background: isHighlighted
          ? dark
            ? '#baca2b'
            : '#f7f769'
          : dark
          ? '#769656'
          : '#eeeed2',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'all 0.2s ease',
        cursor: hasPiece ? 'grab' : 'default',
        borderRadius: 2,
        position: 'relative',
        boxShadow: isHighlighted ? 'inset 0 0 0 2px #d4af37' : 'none',
        overflow: 'hidden',
      }}
        onMouseEnter={(e) => {
          if (hasPiece) {
            e.currentTarget.style.transform = 'scale(1.02)';
            e.currentTarget.style.zIndex = '10';
          }
        }}
        onMouseLeave={(e) => {
          if (hasPiece) {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.zIndex = '1';
          }
        }}
    >
      {hasPiece && (
        <img
          src={`/pieces/${pieceName}.svg`}
          alt={piece}
          style={{
            width: 58,
            height: 58,
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.3))',
            transition: 'transform 0.2s ease',
            cursor: 'grab',
          }}
          onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1.0)')}
        />
      )}

      {/* Coordinate label: visible when square empty, or on hover */}
      <span
        className="sq-coord"
        style={{
          position: 'absolute',
          bottom: 4,
          right: 6,
          fontSize: 10,
          color: dark ? '#eeeed2aa' : '#769656aa',
          fontWeight: '500',
          pointerEvents: 'none',
          transition: 'opacity 0.15s ease',
          opacity: 1,
        }}
      >
        {coord}
        {/* Will be filled by Board if needed via titles or accessible tools */}
      </span>
    </div>
  );
}

export default Square