import React from 'react';
import Card from './Card';

export default function Opponents({ players, currentTurnIndex, myUserId, isHost, onRemovePlayer }) {
  // Filter out myself to list only opponents
  const opponents = players.filter(
    p => p.userId.toString() !== myUserId && (p.userId._id ? p.userId._id.toString() !== myUserId : true)
  );

  // Helper to render fanned visual representing hand size
  const renderFannedCards = (count) => {
    const visibleCount = Math.min(Math.ceil(count / 3), 6); // Max 6 stacked cards visually
    if (visibleCount <= 0) return null;

    return (
      <div className="flex -space-x-10 relative w-24 h-20 justify-center items-center">
        {Array.from({ length: visibleCount }).map((_, idx) => (
          <div
            key={idx}
            className="transform origin-bottom"
            style={{
              transform: `rotate(${(idx - (visibleCount - 1) / 2) * 8}deg) translateY(${Math.abs(idx - (visibleCount - 1) / 2) * 2}px)`,
              zIndex: idx
            }}
          >
            <Card card={{}} hidden size="sm" />
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="w-full flex flex-wrap justify-center items-center gap-6 px-4 py-2 select-none">
      {opponents.map((opponent, idx) => {
        const isCurrentTurn = players[currentTurnIndex]?.userId.toString() === opponent.userId.toString() ||
                              (players[currentTurnIndex]?.userId._id && players[currentTurnIndex]?.userId._id.toString() === opponent.userId.toString());
        const isEliminated = opponent.isEliminated;
        const isFinished = opponent.finishedRank > 0;

        return (
          <div
            id={`opponent-avatar-${opponent.username}`}
            key={opponent.userId._id || opponent.userId}
            className={`relative flex flex-col items-center p-1.5 sm:p-3 rounded-xl sm:rounded-2xl transition-all duration-300 ${
              isCurrentTurn
                ? 'bg-red-500/10 border-2 border-red-500 shadow-md shadow-red-500/10'
                : isFinished
                ? 'bg-slate-800/20 border-2 border-slate-700/20 opacity-60'
                : 'bg-slate-800/40 border-2 border-slate-700/40'
            } ${isEliminated ? 'opacity-40 grayscale' : ''} w-24 sm:w-40`}
          >
            {isHost && !isFinished && onRemovePlayer && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onRemovePlayer(opponent);
                }}
                className="absolute top-1.5 right-1.5 w-5 h-5 rounded-full bg-red-600/80 hover:bg-red-600 text-white flex items-center justify-center text-[10px] font-black transition-all hover:scale-110 active:scale-90 z-20 shadow-md border border-white/10"
                title={`Remove ${opponent.username}`}
              >
                ✕
              </button>
            )}
            {/* Turn Glow Overlay */}
            {isCurrentTurn && (
              <span className="absolute -top-2.5 px-2 py-0.5 rounded-full bg-red-600 text-[8px] sm:text-[10px] font-black text-white uppercase tracking-wider animate-pulse">
                <span className="sm:inline hidden">Active Turn</span>
                <span className="sm:hidden inline">Active</span>
              </span>
            )}

            {/* Username & Remaining Cards Info */}
            <div className="flex flex-col items-center gap-1 sm:gap-1.5 mt-0.5 sm:mt-1 w-full">
              <div className="flex items-center justify-center gap-1 sm:gap-1.5 w-full px-1 sm:px-2">
                <span className={`text-xs sm:text-sm font-bold truncate max-w-[50px] sm:max-w-[95px] ${isCurrentTurn ? 'text-red-400 font-bold' : isFinished ? 'text-yellow-400 font-bold' : 'text-slate-200'}`} title={opponent.username}>
                  {opponent.username}
                </span>
                {!isEliminated && !isFinished && (
                  <span className={`text-[10px] sm:text-xs font-black px-1 sm:px-1.5 py-0.5 rounded-md border ${
                    opponent.handCount === 1
                      ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                      : opponent.handCount === 2
                      ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                      : 'bg-slate-700/60 text-slate-300 border-slate-600/50'
                  }`}>
                    {opponent.handCount}
                  </span>
                )}
              </div>
              
              {opponent.status === 'offline' && !isFinished && (
                <span className="text-[9px] sm:text-xs font-black text-red-500 uppercase tracking-widest mt-0.5 animate-pulse">
                  🔴 Offline
                </span>
              )}

              {isEliminated && (
                <span className="text-[9px] sm:text-xs font-black text-red-500 uppercase tracking-widest mt-0.5">
                  💀 <span className="sm:inline hidden">Eliminated</span>
                </span>
              )}

              {isFinished && (
                <span className="text-[10px] sm:text-xs font-black text-yellow-400 uppercase tracking-widest mt-0.5">
                  {opponent.finishedRank === 1 ? '🥇 1st Place' : opponent.finishedRank === 2 ? '🥈 2nd Place' : opponent.finishedRank === 3 ? '🥉 3rd Place' : `🏅 ${opponent.finishedRank}th Place`}
                </span>
              )}
            </div>

            {/* Fanned Cards Stack visual representation */}
            {!isEliminated && !isFinished && (
              <div className="hidden sm:flex mt-3 h-20 justify-center items-center">
                {renderFannedCards(opponent.handCount)}
              </div>
            )}

            {/* Badges */}
            {!isEliminated && !isFinished && opponent.handCount === 1 && !opponent.hasCalledUno && (
              <div className="absolute -bottom-2 bg-yellow-500 text-black font-black text-[8px] sm:text-[10px] px-1.5 sm:px-2 py-0.5 rounded-full animate-bounce border border-black uppercase tracking-wider">
                UNO!
              </div>
            )}

            {!isEliminated && !isFinished && opponent.handCount === 1 && opponent.hasCalledUno && (
              <div className="absolute -bottom-2 bg-emerald-500 text-black font-black text-[8px] sm:text-[10px] px-2 sm:px-2.5 py-0.5 rounded-full border border-black uppercase tracking-wider">
                <span className="sm:inline hidden">✓ UNO Called</span>
                <span className="sm:hidden inline">✓ Called</span>
              </div>
            )}
            
            {!isEliminated && !isFinished && opponent.handCount >= 20 && (
              <div className="absolute -bottom-2 bg-amber-600 text-white font-black text-[8px] sm:text-[9px] px-1.5 sm:px-2 py-0.5 rounded-full border border-black uppercase tracking-wider">
                <span className="sm:inline hidden">Mercy Risk</span>
                <span className="sm:hidden inline">Mercy</span>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
