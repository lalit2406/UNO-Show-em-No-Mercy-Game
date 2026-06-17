import React from 'react';

export default function PlayerList({ players, hostId }) {
  return (
    <div className="w-full space-y-3">
      {players.map((player) => {
        const playerUserId = player.userId._id ? player.userId._id.toString() : player.userId.toString();
        const isHost = playerUserId === hostId.toString();

        return (
          <div
            key={playerUserId}
            className="flex items-center justify-between p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl"
          >
            <div className="flex items-center gap-3">
              {/* Profile avatar representation */}
              <div className="w-9 h-9 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center font-black text-slate-300">
                {player.username[0].toUpperCase()}
              </div>
              <span className="font-bold text-slate-200">{player.username}</span>
              {isHost && (
                <span className="bg-yellow-500/15 text-yellow-500 border border-yellow-500/30 text-[10px] font-black uppercase px-2 py-0.5 rounded-full flex items-center gap-1">
                  👑 Host
                </span>
              )}
            </div>

            <div>
              {isHost ? (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-black px-3 py-1 rounded-full">
                  ✓ Ready (Host)
                </span>
              ) : player.isReady ? (
                <span className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 text-xs font-black px-3 py-1 rounded-full">
                  ✓ Ready
                </span>
              ) : (
                <span className="bg-red-500/10 text-red-500 border border-red-500/20 text-xs font-black px-3 py-1 rounded-full">
                  ✕ Not Ready
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
