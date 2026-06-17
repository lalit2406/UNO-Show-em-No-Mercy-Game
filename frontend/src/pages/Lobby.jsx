import React, { useState } from 'react';
import PlayerList from '../components/PlayerList';
import { useSocket } from '../context/SocketContext';

const COLOR_MAP = {
  Red: { bg: 'from-[#C0392B] to-[#922B21]' },
  Yellow: { bg: 'from-[#D4A017] to-[#9A7D0A]' },
  Green: { bg: 'from-[#198754] to-[#145A32]' },
  Blue: { bg: 'from-[#1E4FBF] to-[#154360]' },
  Wild: { bg: 'from-[#4B2E83] to-[#2E1A47]' }
};

const getCornerLabel = (type) => {
  if (type === 'skip') return '⊘';
  if (type === 'reverse') return '⇄';
  if (type === 'draw2') return '+2';
  if (type === 'draw4') return '+4';
  if (type === 'wild') return 'WILD';
  return '';
};

const renderSymbol = (type) => {
  if (type === 'skip') {
    return (
      <g stroke="white" strokeWidth="8" fill="none">
        <circle cx="50" cy="50" r="40" />
        <line x1="22" y1="22" x2="78" y2="78" />
      </g>
    );
  }
  if (type === 'reverse') {
    return (
      <g stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none" transform="translate(5, 12) scale(0.9)">
        <path d="M20,35 L10,25 L20,15" />
        <path d="M10,25 L70,25 C80,25 80,45 70,45 L40,45" />
        <path d="M80,65 L90,75 L80,85" />
        <path d="M90,75 L30,75 C20,75 20,55 30,55 L60,55" />
      </g>
    );
  }
  if (type === 'draw2') {
    return (
      <g transform="translate(16, 20) scale(0.68)">
        <rect x="15" y="15" width="45" height="65" rx="5" fill="white" stroke="#2563EB" strokeWidth="2" transform="rotate(-10, 37, 47)" />
        <rect x="35" y="25" width="45" height="65" rx="5" fill="white" stroke="#DC2626" strokeWidth="2" transform="rotate(10, 57, 57)" />
      </g>
    );
  }
  if (type === 'draw4') {
    return (
      <g transform="translate(16, 20) scale(0.68)">
        <rect x="15" y="15" width="45" height="65" rx="5" fill="white" stroke="#10B981" strokeWidth="2" transform="rotate(-15, 37, 47)" />
        <rect x="35" y="25" width="45" height="65" rx="5" fill="white" stroke="#FBBF24" strokeWidth="2" transform="rotate(15, 57, 57)" />
      </g>
    );
  }
  if (type === 'wild') {
    return (
      <g transform="translate(10, 20) scale(0.8)">
        <path d="M50,50 L50,5 A45,45 0 0,1 95,50 Z" fill="#EF4444" />
        <path d="M50,50 L95,50 A45,45 0 0,1 50,95 Z" fill="#3B82F6" />
        <path d="M50,50 L50,95 A45,45 0 0,1 5,50 Z" fill="#10B981" />
        <path d="M50,50 L5,50 A45,45 0 0,1 50,5 Z" fill="#FBBF24" />
        <circle cx="50" cy="50" r="10" fill="white" />
      </g>
    );
  }
  return null;
};

function BackgroundCard({ type, color, rotationClass, className }) {
  const design = COLOR_MAP[color] || COLOR_MAP.Wild;
  const cornerLabel = getCornerLabel(type);

  return (
    <div className={`absolute w-36 h-52 sm:w-44 sm:h-64 rounded-2xl border-2 border-white/5 shadow-2xl bg-gradient-to-br ${design.bg} p-4 flex flex-col justify-between overflow-hidden opacity-25 blur-[1.5px] select-none pointer-events-none ${rotationClass} ${className}`}>
      {cornerLabel && (
        <div className="text-white font-black text-sm tracking-tighter">
          {cornerLabel}
        </div>
      )}
      <div className="flex-1 flex items-center justify-center">
        <svg className="w-24 h-28 opacity-80" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
          <ellipse cx="50" cy="60" rx="38" ry="46" fill="white" fillOpacity="0.08" stroke="white" strokeWidth="1" strokeDasharray="2,2" />
          {renderSymbol(type)}
        </svg>
      </div>
      {cornerLabel && (
        <div className="text-white font-black text-sm tracking-tighter rotate-180 self-end">
          {cornerLabel}
        </div>
      )}
    </div>
  );
}

const inlineStyles = `
  @keyframes float-slow-1 {
    0%, 100% { transform: translateY(0px) rotate(-15deg); }
    50% { transform: translateY(-20px) rotate(-12deg); }
  }
  @keyframes float-slow-2 {
    0%, 100% { transform: translateY(0px) rotate(20deg); }
    50% { transform: translateY(-15px) rotate(23deg); }
  }
  @keyframes float-slow-3 {
    0%, 100% { transform: translateY(0px) rotate(10deg); }
    50% { transform: translateY(-25px) rotate(8deg); }
  }
  @keyframes float-slow-4 {
    0%, 100% { transform: translateY(0px) rotate(-10deg); }
    50% { transform: translateY(-18px) rotate(-8deg); }
  }
  @keyframes float-slow-5 {
    0%, 100% { transform: translateY(0px) rotate(25deg); }
    50% { transform: translateY(-22px) rotate(22deg); }
  }
  @keyframes float-slow-6 {
    0%, 100% { transform: translateY(0px) rotate(-20deg); }
    50% { transform: translateY(-17px) rotate(-22deg); }
  }
  @keyframes float-particle {
    0% { transform: translateY(100vh) scale(0.8); opacity: 0; }
    50% { opacity: 0.5; }
    100% { transform: translateY(-10vh) scale(1.2); opacity: 0; }
  }
  .animate-float-card-1 {
    animation: float-slow-1 12s ease-in-out infinite;
  }
  .animate-float-card-2 {
    animation: float-slow-2 14s ease-in-out infinite;
  }
  .animate-float-card-3 {
    animation: float-slow-3 16s ease-in-out infinite;
  }
  .animate-float-card-4 {
    animation: float-slow-4 13s ease-in-out infinite;
  }
  .animate-float-card-5 {
    animation: float-slow-5 15s ease-in-out infinite;
  }
  .animate-float-card-6 {
    animation: float-slow-6 17s ease-in-out infinite;
  }
  .animate-particle {
    animation: float-particle linear infinite;
  }
`;

const PARTICLES = Array.from({ length: 15 }).map((_, i) => ({
  id: i,
  style: {
    left: `${(i * 7) % 100}%`,
    bottom: `${(i * 13) % 100}%`,
    width: `${(i % 3) + 2}px`,
    height: `${(i % 3) + 2}px`,
    animationDelay: `${i * 0.4}s`,
    animationDuration: `${(i % 5) + 6}s`,
  }
}));

export default function Lobby({ room, currentPlayer, onLeave }) {
  const { toggleReady, startGame } = useSocket();
  const [copied, setCopied] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);

  const players = room.players || [];
  const roomCode = room.roomCode;
  const inviteLink = `${window.location.origin}/join/${roomCode}`;

  const handleCopyInviteLink = () => {
    navigator.clipboard.writeText(inviteLink);
    setInviteCopied(true);
    setTimeout(() => setInviteCopied(false), 2000);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join my UNO Show 'Em No Mercy Lobby!",
          text: `Join my private game room! Room code: ${roomCode}`,
          url: inviteLink
        });
      } catch (err) {
        console.error('Error sharing:', err);
      }
    }
  };

  const hostId = room.host?._id || room.host;
  const currentPlayerUserId = currentPlayer?.userId?._id
    ? currentPlayer.userId._id.toString()
    : currentPlayer?.userId?.toString();

  const isHost = currentPlayerUserId && hostId && currentPlayerUserId === hostId.toString();
  const myReadyStatus = currentPlayer?.isReady || false;

  const nonHostPlayers = players.filter(p => {
    const pId = p.userId._id ? p.userId._id.toString() : p.userId.toString();
    return pId !== hostId.toString();
  });
  const canStart = players.length >= 2 && nonHostPlayers.every(p => p.isReady);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(roomCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative min-h-screen bg-slate-950 flex justify-center items-center p-6 text-white select-none overflow-hidden">
      <style dangerouslySetInnerHTML={{ __html: inlineStyles }} />

      {/* 1. Neon Glowing Streaks & Laser Lines */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[150%] bg-gradient-to-tr from-red-600/10 via-orange-500/5 to-transparent rotate-[35deg] blur-3xl"></div>
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[150%] bg-gradient-to-bl from-blue-600/10 via-indigo-500/5 to-transparent rotate-[35deg] blur-3xl"></div>
        <div className="absolute top-[20%] right-[-20%] w-[60%] h-[60%] bg-gradient-to-br from-yellow-500/5 to-transparent blur-3xl"></div>
        <div className="absolute bottom-[20%] left-[-20%] w-[60%] h-[60%] bg-gradient-to-ur from-green-500/5 to-transparent blur-3xl"></div>

        {/* Diagonal glowing lines */}
        <div className="absolute top-1/4 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-red-500/20 to-transparent rotate-[15deg]"></div>
        <div className="absolute top-2/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-amber-500/20 to-transparent rotate-[-10deg]"></div>
        <div className="absolute top-1/3 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/20 to-transparent rotate-[25deg]"></div>
      </div>

      {/* 2. Floating Background Particles */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        {PARTICLES.map((particle) => (
          <div
            key={particle.id}
            className="absolute bg-white rounded-full opacity-0 animate-particle"
            style={particle.style}
          />
        ))}
      </div>

      {/* 3. Background Floating Cards */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <BackgroundCard type="wild" color="Wild" rotationClass="animate-float-card-1" className="top-[5%] left-[3%] sm:left-[6%]" />
        <BackgroundCard type="skip" color="Red" rotationClass="animate-float-card-2" className="top-[45%] left-[-3%] sm:left-[2%]" />
        <BackgroundCard type="draw2" color="Blue" rotationClass="animate-float-card-4" className="bottom-[5%] left-[5%] sm:left-[10%]" />
        
        <BackgroundCard type="draw4" color="Wild" rotationClass="animate-float-card-3" className="top-[8%] right-[3%] sm:right-[6%]" />
        <BackgroundCard type="reverse" color="Yellow" rotationClass="animate-float-card-5" className="top-[48%] right-[-3%] sm:right-[2%]" />
        <BackgroundCard type="reverse" color="Green" rotationClass="animate-float-card-6" className="bottom-[8%] right-[5%] sm:right-[10%]" />
      </div>

      {/* 4. MAIN LOBBY CARD */}
      <div className="max-w-lg w-full bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl rounded-3xl p-8 shadow-[0_20px_50px_rgba(0,0,0,0.8)] flex flex-col gap-6 relative z-10 ring-1 ring-white/5">
        
        {/* Header */}
        <div className="text-center space-y-1.5 border-b border-slate-800/80 pb-4">
          <h2 className="text-[10px] font-black tracking-widest text-slate-500 uppercase">GAME LOBBY</h2>
          <div className="flex justify-center items-center gap-2">
            <span className="text-3xl font-black tracking-widest text-yellow-400">{roomCode}</span>
            <button
              onClick={handleCopyCode}
              className="px-3 py-1 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              {copied ? 'Code Copied ✓' : 'Copy Code'}
            </button>
          </div>
          <p className="text-xs text-slate-400 font-bold">
            Share this code or invite link with friends so they can join!
          </p>
          <div className="flex justify-center gap-2 mt-2">
            <button
              onClick={handleCopyInviteLink}
              className="px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all"
            >
              {inviteCopied ? 'Link Copied ✓' : 'Copy Invite Link'}
            </button>
            {navigator.share && (
              <button
                onClick={handleShare}
                className="px-3 py-1.5 rounded-lg bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 text-xs font-bold text-slate-400 hover:text-white transition-all"
              >
                Share
              </button>
            )}
          </div>
        </div>

        {/* Players List Card */}
        <div className="space-y-3">
          <div className="flex justify-between items-center px-1">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Players List</span>
            <span className="text-xs font-bold text-slate-400 bg-slate-950/60 px-2 py-0.5 rounded-full border border-slate-850">
              {players.length} / 10
            </span>
          </div>
          <PlayerList players={players} hostId={hostId} />
        </div>

        {/* Action Controls */}
        <div className="flex flex-col gap-3 pt-4 border-t border-slate-800/60">
          <div className="flex gap-4">
            <button
              onClick={onLeave}
              className="flex-1 py-3.5 rounded-2xl bg-slate-950/60 hover:bg-slate-900 border border-slate-850 hover:border-slate-700 font-bold text-slate-450 hover:text-white hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 shadow-md"
            >
              Leave Room
            </button>

            {isHost ? (
              <button
                onClick={startGame}
                disabled={!canStart}
                className="flex-1 py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 disabled:from-slate-900/60 disabled:to-slate-900/60 disabled:border disabled:border-slate-850 disabled:text-slate-500 disabled:cursor-not-allowed disabled:scale-100 disabled:translate-y-0 disabled:shadow-none font-black text-white hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] transition-all duration-300 shadow-xl shadow-red-600/20 hover:shadow-red-500/40 uppercase tracking-wider text-sm"
              >
                Start Game
              </button>
            ) : (
              <button
                onClick={toggleReady}
                className={`flex-1 py-3.5 rounded-2xl font-black text-sm transition-all duration-300 hover:scale-[1.02] hover:-translate-y-0.5 active:scale-[0.98] shadow-xl ${
                  myReadyStatus
                    ? 'bg-amber-505 hover:bg-amber-400 text-black shadow-amber-500/20 hover:shadow-amber-400/40 uppercase'
                    : 'bg-emerald-600 hover:bg-emerald-505 text-white shadow-emerald-600/20 hover:shadow-emerald-500/40 uppercase'
                }`}
              >
                {myReadyStatus ? 'Set Unready' : 'Set Ready'}
              </button>
            )}
          </div>

          {/* Helper hint messages */}
          {isHost && !canStart && (
            <p className="text-center text-[11px] text-red-500/80 font-black tracking-wide animate-pulse mt-2">
              ⚠️ NEED AT LEAST 2 PLAYERS AND ALL CLIENTS TO READY UP TO START.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
