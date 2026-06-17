import React from 'react';

export default function CreateRoomForm({ onSubmit, onCancel }) {
  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <form onSubmit={handleSubmit} className="w-full space-y-4">
      <p className="text-xs text-slate-400 leading-relaxed text-center">
        Create a new private game lobby. You will be designated as the Room Host, and other players can join using your unique room code.
      </p>

      <div className="flex gap-4 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="flex-1 py-3.5 rounded-xl bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-slate-400 hover:text-white font-bold transition-all text-sm hover:scale-[1.02] active:scale-[0.98] shadow-md"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="flex-1 py-3.5 rounded-xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 font-black text-white hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all text-sm shadow-lg shadow-red-600/20"
        >
          Create Room
        </button>
      </div>
    </form>
  );
}
