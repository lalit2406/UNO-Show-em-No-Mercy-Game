import React, { useState, useEffect } from 'react';
import Card from './Card';

export default function PlayerHand({ hand, isMyTurn, playableCardIds, onPlayCard, direction, currentColor, deckCount, highlightedCardId }) {
  const [sortBy, setSortBy] = useState('color'); // 'color' | 'value'
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Sort cards based on preference
  const sortedHand = [...hand].sort((a, b) => {
    if (sortBy === 'color') {
      if (a.color !== b.color) {
        return a.color.localeCompare(b.color);
      }
      return a.value.localeCompare(b.value);
    } else {
      if (a.value !== b.value) {
        return a.value.localeCompare(b.value);
      }
      return a.color.localeCompare(b.color);
    }
  });

  const cardWidth = screenWidth < 640 ? 88 : screenWidth < 768 ? 112 : 128;
  const maxHandWidth = Math.min(screenWidth - 48, 1100);
  const N = sortedHand.length;

  let overlap = 0;
  let gap = 8; // default gap when not overlapping

  const totalNoOverlapWidth = N * cardWidth + (N - 1) * gap;

  if (totalNoOverlapWidth > maxHandWidth && N > 1) {
    overlap = (totalNoOverlapWidth - maxHandWidth) / (N - 1);
    // For mobile devices, cap the overlap to prevent squishing so player can scroll
    const maxOverlap = screenWidth < 768 ? cardWidth * 0.55 : cardWidth - 16;
    overlap = Math.min(overlap, maxOverlap);
    gap = 0;
  }

  return (
    <div className="w-full flex flex-col items-center bg-slate-900/60 backdrop-blur-md border-t-2 border-slate-700/50 p-2 pb-4 sm:p-4 sm:pb-6 gap-2 sm:gap-3 select-none">
      {/* Hand Controls */}
      <div className="w-full max-w-6xl flex flex-wrap gap-4 justify-between items-center px-4">
        {/* Left: Sort Controls */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-slate-400">Sort cards:</span>
          <button
            onClick={() => setSortBy('color')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              sortBy === 'color'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Color
          </button>
          <button
            onClick={() => setSortBy('value')}
            className={`px-3 py-1 rounded-md text-xs font-bold transition-all ${
              sortBy === 'value'
                ? 'bg-red-500 text-white shadow-lg shadow-red-500/30'
                : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
            }`}
          >
            Value
          </button>
        </div>

        {/* Center: Match Stats Info Bar */}
        <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800/60 rounded-full py-1 px-4 shadow-inner shadow-black/20 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">↻</span>
            <span className="text-yellow-400 text-[10px] sm:text-xs">
              {direction === 1 ? 'Clockwise' : 'Counter'}
            </span>
          </div>
          
          <span className="text-slate-800 select-none">|</span>

          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
            <span className="text-slate-400 sm:inline hidden">Color:</span>
            <span className={`font-black uppercase px-2 py-0.5 rounded text-[10px] text-black ${
              currentColor === 'Red' ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.3)]' :
              currentColor === 'Yellow' ? 'bg-yellow-400 shadow-[0_0_6px_rgba(250,204,21,0.3)]' :
              currentColor === 'Green' ? 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.3)]' : 'bg-blue-500 shadow-[0_0_6px_rgba(59,130,246,0.3)]'
            }`}>
              {currentColor}
            </span>
          </div>

          <span className="text-slate-800 select-none">|</span>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            <span className="text-slate-400">🎴</span>
            <span className="text-slate-200">{deckCount}<span className="hidden sm:inline"> Cards Left</span></span>
          </div>
        </div>

        {/* Right: Hand Size Info */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-black text-slate-300">YOUR HAND</span>
          <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-extrabold text-xs">
            {hand.length} {hand.length === 1 ? 'card' : 'cards'}
          </span>
          {hand.length >= 20 && (
            <span className="animate-pulse px-2.5 py-0.5 rounded-full bg-amber-500 text-black font-black text-xs">
              ⚠️ MERCY RISK ({hand.length}/25)
            </span>
          )}
        </div>
      </div>

      {/* Cards Overlay Container */}
      <div className={`w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 py-3 sm:py-4 px-6 flex items-center ${totalNoOverlapWidth > maxHandWidth ? 'justify-start' : 'justify-center'}`}>
        <div 
          className="relative h-36 sm:h-56 flex items-center transition-all duration-300 touch-pan-x"
          style={{ width: N > 0 ? `${cardWidth + (N - 1) * (cardWidth - overlap + gap)}px` : 'auto' }}
        >
          {sortedHand.map((card, index) => {
            const isPlayable = isMyTurn && playableCardIds.has(card.id);
            const isHovered = hoveredCardId === card.id;
            
            const cardStyle = {
              position: 'absolute',
              left: `${index * (cardWidth - overlap + gap)}px`,
              zIndex: isHovered ? 100 : index + 1,
              transform: isHovered ? 'translateY(-8px) scale(1.03)' : 'translateY(0) scale(1)',
              transition: 'transform 0.2s cubic-bezier(0.2, 0.8, 0.2, 1), left 0.3s cubic-bezier(0.2, 0.8, 0.2, 1), z-index 0.1s ease',
              cursor: isPlayable ? 'pointer' : 'default',
            };

            return (
              <div
                key={card.id}
                onMouseEnter={() => setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                style={cardStyle}
              >
                <Card
                  card={card}
                  isPlayable={isPlayable}
                  isHighlighted={highlightedCardId === card.id}
                  onClick={() => onPlayCard(card)}
                  size="md"
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
