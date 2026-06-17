import React from 'react';

const COLOR_MAP = {
  Red: {
    bg: 'from-[#C0392B] to-[#922B21]',
    primary: '#C0392B',
    secondary: '#922B21',
    text: 'text-red-500'
  },
  Yellow: {
    bg: 'from-[#D4A017] to-[#9A7D0A]',
    primary: '#D4A017',
    secondary: '#9A7D0A',
    text: 'text-amber-500'
  },
  Green: {
    bg: 'from-[#198754] to-[#145A32]',
    primary: '#198754',
    secondary: '#145A32',
    text: 'text-emerald-500'
  },
  Blue: {
    bg: 'from-[#1E4FBF] to-[#154360]',
    primary: '#1E4FBF',
    secondary: '#154360',
    text: 'text-blue-500'
  },
  Wild: {
    bg: 'from-[#4B2E83] to-[#2E1A47]',
    primary: '#4B2E83',
    secondary: '#2E1A47',
    text: 'text-purple-400'
  }
};

const getCornerLabel = (type, value) => {
  if (type === 'number') return value;
  if (type === 'draw2') return '+2';
  if (type === 'draw4') return '+4';
  if (type === 'skip') return '⊘';
  if (type === 'skip_everyone') return '⊘∀';
  if (type === 'reverse') return '⇄';
  if (type === 'discard_all') return '✕';
  
  // Wild cards
  if (type === 'wild') return 'WILD';
  if (type === 'wild_reverse_draw4') return '↺ +4';
  if (type === 'wild_draw6') return '+6';
  if (type === 'wild_draw10') return '+10';
  if (type === 'wild_color_roulette') return '🎲';
  
  return '';
};

export default function Card({ card, onClick, isPlayable = false, isHighlighted = false, hidden = false, size = 'md' }) {
  if (hidden) {
    return <CardBack onClick={onClick} size={size} />;
  }

  const { color, type, value, drawValue } = card;
  const design = COLOR_MAP[color] || COLOR_MAP.Wild;

  const sizeClasses = {
    sm: 'w-10 h-14 sm:w-12 sm:h-18 md:w-14 md:h-20 text-[7px] sm:text-[8px] rounded-md shadow-sm',
    md: 'w-22 h-32 sm:w-28 sm:h-42 md:w-32 md:h-48 text-xs sm:text-sm rounded-xl shadow-md',
    lg: 'w-32 h-48 sm:w-40 sm:h-56 md:w-44 md:h-64 text-base sm:text-lg rounded-2xl shadow-xl'
  };

  const interactiveClasses = (isPlayable || isHighlighted)
    ? 'cursor-pointer transition-all duration-300 active:scale-95 touch-manipulation'
    : 'cursor-not-allowed opacity-100';

  const cornerLabel = getCornerLabel(type, value);

  const cornerTextSize = {
    sm: 'text-[8px] sm:text-[9px]',
    md: 'text-[9px] sm:text-[11px]',
    lg: 'text-[11px] sm:text-[13px]'
  };

  const renderCardSymbol = () => {
    switch (type) {
      case 'number':
        return (
          <text x="50" y="62" textAnchor="middle" fontStyle="italic" fontWeight="900" fontSize="38" fill="white" filter="url(#shadow)">
            {value}
          </text>
        );
      case 'skip':
        return (
          <g transform="translate(32, 32) scale(0.36)" stroke="white" strokeWidth="8" fill="none">
            <circle cx="50" cy="50" r="40" />
            <line x1="22" y1="22" x2="78" y2="78" />
          </g>
        );
      case 'skip_everyone':
        return (
          <g transform="translate(30, 26) scale(0.4)" fill="white">
            <text x="50" y="45" textAnchor="middle" fontWeight="bold" fontSize="16" fill="white">SKIP</text>
            <text x="50" y="65" textAnchor="middle" fontWeight="bold" fontSize="14" fill="#EF4444">ALL</text>
            <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="6" fill="none" />
            <line x1="18" y1="18" x2="82" y2="82" stroke="white" strokeWidth="6" />
          </g>
        );
      case 'reverse':
        return (
          <g transform="translate(30, 32) scale(0.4)" stroke="white" strokeWidth="10" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M20,35 L10,25 L20,15" />
            <path d="M10,25 L70,25 C80,25 80,45 70,45 L40,45" />
            <path d="M80,65 L90,75 L80,85" />
            <path d="M90,75 L30,75 C20,75 20,55 30,55 L60,55" />
          </g>
        );
      case 'draw2':
      case 'draw4':
        return (
          <g transform="translate(32, 28) scale(0.36)">
            {/* Draw 2 cards overlap visual */}
            <rect x="15" y="15" width="45" height="65" rx="5" fill="white" stroke="#2563EB" strokeWidth="2" transform="rotate(-10, 37, 47)" />
            <rect x="35" y="25" width="45" height="65" rx="5" fill="white" stroke="#DC2626" strokeWidth="2" transform="rotate(10, 57, 57)" />
            <text x="50" y="94" textAnchor="middle" fontWeight="900" fontSize="24" fill="white">
              +{drawValue}
            </text>
          </g>
        );
      case 'wild':
        return (
          <g transform="translate(30, 30) scale(0.4)" filter="url(#shadow)">
            <path d="M50,50 L50,5 A45,45 0 0,1 95,50 Z" fill="#EF4444" />
            <path d="M50,50 L95,50 A45,45 0 0,1 50,95 Z" fill="#3B82F6" />
            <path d="M50,50 L50,95 A45,45 0 0,1 5,50 Z" fill="#10B981" />
            <path d="M50,50 L5,50 A45,45 0 0,1 50,5 Z" fill="#FBBF24" />
            <circle cx="50" cy="50" r="10" fill="white" />
          </g>
        );
      case 'wild_reverse_draw4':
        return (
          <g transform="translate(30, 24) scale(0.4)">
            {/* Wheel */}
            <path d="M50,50 L50,15 A35,35 0 0,1 85,50 Z" fill="#EF4444" />
            <path d="M50,50 L85,50 A35,35 0 0,1 50,85 Z" fill="#3B82F6" />
            <path d="M50,50 L50,85 A35,35 0 0,1 15,50 Z" fill="#10B981" />
            <path d="M50,50 L15,50 A35,35 0 0,1 50,15 Z" fill="#FBBF24" />
            <circle cx="50" cy="50" r="8" fill="white" />
            {/* Reverse icons */}
            <path d="M15,20 L5,20 L5,30" stroke="white" strokeWidth="4" fill="none" />
            <path d="M85,80 L95,80 L95,70" stroke="white" strokeWidth="4" fill="none" />
            <text x="50" y="102" textAnchor="middle" fontWeight="950" fontSize="22" fill="#FF8C00">
              ↺ +4
            </text>
          </g>
        );
      case 'wild_draw6':
      case 'wild_draw10':
        return (
          <g transform="translate(30, 24) scale(0.4)">
            <path d="M50,50 L50,15 A35,35 0 0,1 85,50 Z" fill="#EF4444" />
            <path d="M50,50 L85,50 A35,35 0 0,1 50,85 Z" fill="#3B82F6" />
            <path d="M50,50 L50,85 A35,35 0 0,1 15,50 Z" fill="#10B981" />
            <path d="M50,50 L15,50 A35,35 0 0,1 50,15 Z" fill="#FBBF24" />
            <circle cx="50" cy="50" r="10" fill="white" />
            <text x="50" y="105" textAnchor="middle" fontWeight="950" fontSize="30" fill="white" filter="url(#shadow)">
              +{drawValue}
            </text>
          </g>
        );
      case 'wild_color_roulette':
        return (
          <g transform="translate(28, 20) scale(0.44)">
            <circle cx="50" cy="50" r="42" fill="none" stroke="white" strokeWidth="2" />
            {/* Colored Pinwheel slices */}
            <path d="M50,50 L50,10 A40,40 0 0,1 90,50 Z" fill="#EF4444" />
            <path d="M50,50 L90,50 A40,40 0 0,1 50,90 Z" fill="#3B82F6" />
            <path d="M50,50 L50,90 A40,40 0 0,1 10,50 Z" fill="#10B981" />
            <path d="M50,50 L10,50 A40,40 0 0,1 50,10 Z" fill="#FBBF24" />
            <polygon points="50,10 45,28 55,28" fill="white" transform="rotate(45, 50, 50)" />
            <polygon points="50,10 45,28 55,28" fill="white" transform="rotate(135, 50, 50)" />
            <polygon points="50,10 45,28 55,28" fill="white" transform="rotate(225, 50, 50)" />
            <polygon points="50,10 45,28 55,28" fill="white" transform="rotate(315, 50, 50)" />
            <circle cx="50" cy="50" r="14" fill="#1E293B" stroke="white" strokeWidth="2" />
            <text x="50" y="55" textAnchor="middle" fontWeight="bold" fontSize="14" fill="white">?</text>
          </g>
        );
      case 'discard_all':
        return (
          <g transform="translate(30, 28) scale(0.4)" fill="white">
            <path d="M20,20 L80,80 M80,20 L20,80" stroke="white" strokeWidth="8" strokeLinecap="round" />
            <circle cx="50" cy="50" r="45" stroke="white" strokeWidth="5" fill="none" />
            <text x="50" y="96" textAnchor="middle" fontWeight="bold" fontSize="16" fill="white">DISCARD ALL</text>
          </g>
        );
      default:
        return null;
    }
  };

  const cardStyle = {
    borderColor: isHighlighted ? '#FBBF24' : isPlayable ? '#39FF88' : '#000000',
    boxShadow: isHighlighted
      ? '0 0 14px rgba(251,191,36,0.85), 0 0 26px rgba(251,191,36,0.65)'
      : isPlayable 
      ? '0 0 10px rgba(57,255,136,0.65), 0 0 22px rgba(57,255,136,0.45)' 
      : '0 2px 4px rgba(0,0,0,0.3)',
    filter: (isPlayable || isHighlighted) ? 'none' : 'brightness(0.8) saturate(0.85)',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease, filter 0.2s ease'
  };

  return (
    <div
      onClick={isPlayable ? onClick : undefined}
      className={`relative bg-gradient-to-br ${design.bg} ${(isPlayable || isHighlighted) ? 'border-4' : 'border-2'} select-none ${sizeClasses[size]} ${interactiveClasses}`}
      style={cardStyle}
    >
      {isHighlighted && (
        <span className="absolute -top-2 -right-2 bg-yellow-400 text-black text-[9px] font-black px-1.5 py-0.5 rounded-full border border-black shadow-lg animate-pulse uppercase tracking-wider scale-90 z-20">
          Drawn
        </span>
      )}
      {/* Corner indicators */}
      {cornerLabel && (
        <>
          <div className={`absolute top-1 left-1.5 md:top-1.5 md:left-2 font-black text-white tracking-tighter ${cornerTextSize[size]}`}>
            {cornerLabel}
          </div>
          <div className={`absolute bottom-1 right-1.5 md:bottom-1.5 md:right-2 font-black text-white tracking-tighter rotate-180 ${cornerTextSize[size]}`}>
            {cornerLabel}
          </div>
        </>
      )}

      {/* SVG Central Vector Graphic */}
      <svg className="w-full h-full" viewBox="0 0 100 120" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <filter id="shadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="2" dy="2" stdDeviation="2" floodOpacity="0.5" />
          </filter>
          <radialGradient id="cardInner" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="0.25" />
            <stop offset="100%" stopColor="black" stopOpacity="0.2" />
          </radialGradient>
        </defs>
        
        {/* Inner oval design */}
        <ellipse cx="50" cy="60" rx="38" ry="46" fill="url(#cardInner)" stroke="white" strokeWidth="1" strokeDasharray="2,2" />

        {renderCardSymbol()}
      </svg>
    </div>
  );
}

function CardBack({ onClick, size = 'md' }) {
  const sizeClasses = {
    sm: 'w-10 h-14 sm:w-12 sm:h-18 md:w-14 md:h-20 rounded-md shadow-sm',
    md: 'w-22 h-32 sm:w-28 sm:h-42 md:w-32 md:h-48 rounded-xl shadow-md',
    lg: 'w-32 h-48 sm:w-40 sm:h-56 md:w-44 md:h-64 rounded-2xl shadow-xl'
  };

  return (
    <div
      onClick={onClick}
      className={`relative bg-black border-2 border-black bg-gradient-to-br from-black via-slate-900 to-red-950 flex flex-col justify-between items-center p-3 select-none overflow-hidden hover:scale-105 hover:shadow-2xl transition-all duration-300 ${sizeClasses[size]}`}
    >
      <div className="w-full text-left font-black text-xs text-red-600 tracking-wider">NO MERCY</div>
      
      {/* Central glowing UNO logo */}
      <div className="relative transform -rotate-20 flex flex-col items-center">
        <span className="font-extrabold text-4xl text-amber-500 tracking-tighter drop-shadow-[0_4px_6px_rgba(239,68,68,0.8)] filter italic">
          UNO
        </span>
        <span className="absolute -bottom-2 text-[9px] font-black tracking-widest bg-red-600 text-black px-1 rounded transform skew-x-12 animate-pulse">
          SHOW 'EM
        </span>
      </div>

      <div className="w-full text-right font-black text-xs text-red-600 tracking-wider">NO MERCY</div>
    </div>
  );
}
