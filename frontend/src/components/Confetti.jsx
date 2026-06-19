import React, { useEffect, useState } from 'react';

export default function Confetti() {
  const [pieces, setPieces] = useState([]);

  useEffect(() => {
    const colors = [
      '#EF4444', // Red
      '#FBBF24', // Yellow
      '#10B981', // Green
      '#3B82F6', // Blue
      '#A855F7', // Purple
      '#F43F5E'  // Pink
    ];

    const generatedPieces = Array.from({ length: 120 }).map((_, i) => {
      const size = Math.random() * 8 + 6; // random size: 6px to 14px
      const color = colors[Math.floor(Math.random() * colors.length)];
      const delay = Math.random() * 3.5; // animation delay: 0s to 3.5s
      const duration = Math.random() * 2.5 + 2.5; // duration: 2.5s to 5s
      const left = Math.random() * 100; // start left offset percentage
      const top = Math.random() * -40 - 10; // start top offset above viewport

      return {
        id: i,
        style: {
          position: 'absolute',
          left: `${left}%`,
          top: `${top}px`,
          width: `${size}px`,
          height: `${size * (Math.random() * 0.8 + 1.2)}px`,
          backgroundColor: color,
          borderRadius: Math.random() > 0.5 ? '50%' : '2px',
          animation: `confetti-fall ${duration}s linear infinite`,
          animationDelay: `${delay}s`,
          transform: `rotate(${Math.random() * 360}deg)`,
          pointerEvents: 'none'
        }
      };
    });

    setPieces(generatedPieces);
  }, []);

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden pointer-events-none z-45 select-none">
      {pieces.map(piece => (
        <div key={piece.id} style={piece.style} />
      ))}
    </div>
  );
}
