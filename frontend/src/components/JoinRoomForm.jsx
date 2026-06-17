import React, { useState } from 'react';

export default function JoinRoomForm({ onSubmit, onCancel }) {
  const [roomCode, setRoomCode] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!roomCode.trim()) return;
    onSubmit(roomCode.trim().toUpperCase());
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <div className="flex flex-col text-left">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Room Code</label>
        <input
          type="text"
          value={roomCode}
          onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
          placeholder="ENTER 4-LETTER CODE"
          maxLength={6}
          required
          className="w-full bg-slate-950/80 border-2 border-slate-800/80 rounded-xl px-4 py-3.5 text-center text-xl font-black tracking-widest placeholder:text-slate-850 focus:outline-none focus:border-amber-500/80 transition-colors uppercase text-yellow-400"
        />
      </div>

      <div className="flex gap-4">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white font-bold transition-all text-sm hover:scale-[1.02] active:scale-[0.98] shadow-md"
        >
          Back
        </button>
        <button
          type="submit"
          disabled={!roomCode.trim()}
          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:opacity-50 disabled:cursor-not-allowed font-black text-white hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all text-sm shadow-lg shadow-red-600/20"
        >
          Join Room
        </button>
      </div>
    </form>
  );
}
