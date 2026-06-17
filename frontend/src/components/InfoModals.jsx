import React, { useEffect } from 'react';

function HowToPlayContent() {
  return (
    <div className="space-y-5">
      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5">Objective</h4>
        <p className="text-slate-300 font-medium">
          Be the first player to get rid of all cards in your hand.
        </p>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5">Matching Rules</h4>
        <p className="text-slate-300 font-medium">
          During your turn, you may play a card from your hand if it matches the top card on the Discard Pile by:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 font-semibold">
          <li>Color (Red, Yellow, Green, Blue)</li>
          <li>Number (0-9)</li>
          <li>Action Type (Skip, Reverse, Discard All, etc.)</li>
          <li>Or if it is a Wild card</li>
        </ul>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5">UNO Rule</h4>
        <p className="text-slate-300 font-medium">
          When you are reduced to exactly <strong>1 card</strong> in your hand, you must press the <strong>Call UNO!</strong> button before your turn ends.
        </p>
        <p className="text-slate-400 font-semibold mt-2">
          If you forget to call UNO and another player plays or draws a card, you will receive a <strong>2-card penalty</strong>.
        </p>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5">Elimination Rule</h4>
        <p className="text-slate-300 font-medium">
          If a player's hand reaches <strong>25 or more cards</strong> at any time, they are instantly <strong>eliminated</strong> from the match. Their cards are returned to the deck, and they become spectators.
        </p>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-amber-400 uppercase tracking-widest mb-1.5">Ranking System</h4>
        <p className="text-slate-300 font-medium">
          The match does not end when the first player wins. Instead, the winner takes <strong>1st Place</strong>, and the remaining players continue playing to determine <strong>2nd Place, 3rd Place, 4th Place</strong>, etc.
        </p>
        <p className="text-slate-400 font-semibold mt-2">
          The game ends only when all rankings are determined (i.e. only 1 active player remains).
        </p>
      </section>
    </div>
  );
}

function GameRulesContent() {
  return (
    <div className="space-y-6">
      {/* Special Cards */}
      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-3">Special Cards</h4>
        <div className="space-y-3.5 text-slate-300">
          <div>
            <span className="font-extrabold text-amber-400">Draw 2 (+2) & Draw 4 (+4):</span> Next player draws 2 or 4 cards and their turn is skipped.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Reverse:</span> Reverses the direction of play.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Skip:</span> Skips the next player's turn.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Skip Everyone:</span> Skips all other players in the room, immediately giving you another turn.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Discard All:</span> Discards all cards of the matching color currently in your hand.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Wild:</span> Allows you to choose the active color.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Wild Reverse Draw 4:</span> Reverses play direction and makes the next player draw 4 cards.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Wild Draw 6 (+6) & Wild Draw 10 (+10):</span> Allows you to choose the active color and forces the next player to draw 6 or 10 cards.
          </div>
          <div>
            <span className="font-extrabold text-amber-400">Wild Color Roulette:</span> Choose a color. The next player must draw cards from the deck until they find a card of the selected color, and their turn is skipped.
          </div>
        </div>
      </section>

      {/* Stacking Rules */}
      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-red-500 uppercase tracking-widest mb-1.5">Stacking Rules</h4>
        <p className="text-slate-300 font-medium">
          When a Draw card is played, you can play an **equal or higher** Draw card to pass the penalty to the next player, building a stack:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 font-semibold">
          <li>+2 +2 = Next player draws 4</li>
          <li>+4 +4 = Next player draws 8</li>
          <li>+6 +4 = Next player draws 10</li>
        </ul>
        <p className="text-slate-400 font-semibold mt-2.5">
          Only equal or higher draw cards may continue a stack (e.g. you can stack a +4 on a +2, but you cannot stack a +2 on a +4).
        </p>
      </section>
    </div>
  );
}

function PrivacyPolicyContent() {
  return (
    <div className="space-y-5">
      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5">Data Collection</h4>
        <p className="text-slate-300 font-medium">
          UNO No Mercy only stores:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 font-semibold">
          <li>Player username</li>
          <li>Room code</li>
          <li>Active match state during gameplay</li>
        </ul>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5">No Personal Data</h4>
        <p className="text-slate-300 font-medium">
          The game does <strong>NOT</strong> collect, request, or share:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1 text-slate-400 font-semibold">
          <li>Email addresses</li>
          <li>Phone numbers</li>
          <li>Payment information or details</li>
          <li>Government IDs or personal credentials</li>
        </ul>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5">Multiplayer Connections</h4>
        <p className="text-slate-300 font-medium">
          Player usernames and socket connections are used solely to allow hosting/joining rooms, identify active players during turns, and render the live leaderboards and match event logs.
        </p>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5">Cookies & Tracking</h4>
        <p className="text-slate-300 font-medium">
          No advertising trackers, analytical cookies, or behavioral trackers are used.
        </p>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5">Data Security</h4>
        <p className="text-slate-300 font-medium">
          Active gameplay data is transient and used only to coordinate the lobby session. We never share match data or player records with third parties.
        </p>
      </section>

      <section className="bg-slate-950/40 p-4 rounded-2xl border border-slate-800/40">
        <h4 className="text-xs font-black text-blue-400 uppercase tracking-widest mb-1.5">Contact</h4>
        <p className="text-slate-300 font-medium">
          For any questions regarding the game or data practices, please contact the game administrator.
        </p>
      </section>
    </div>
  );
}

export default function InfoModals({ activeModal, onClose }) {
  // Prevent background scrolling when modal is open
  useEffect(() => {
    if (activeModal) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [activeModal]);

  if (!activeModal) return null;

  const renderContent = () => {
    switch (activeModal) {
      case 'how_to_play':
        return <HowToPlayContent />;
      case 'game_rules':
        return <GameRulesContent />;
      case 'privacy_policy':
        return <PrivacyPolicyContent />;
      default:
        return null;
    }
  };

  const getTitle = () => {
    switch (activeModal) {
      case 'how_to_play':
        return 'UNO NO MERCY - HOW TO PLAY';
      case 'game_rules':
        return 'UNO NO MERCY - GAME RULES';
      case 'privacy_policy':
        return 'UNO NO MERCY - PRIVACY POLICY';
      default:
        return '';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-[fadeIn_0.2s_ease-out_forwards]">
      {/* Modal Container */}
      <div className="relative w-full max-w-2xl max-h-[85vh] bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col shadow-2xl ring-1 ring-white/10 overflow-hidden animate-[scaleIn_0.25s_ease-out_forwards]">
        
        {/* Header */}
        <div className="flex justify-between items-center pb-4 border-b border-slate-800/80 mb-6">
          <h2 className="text-base md:text-lg font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-red-500 uppercase">
            {getTitle()}
          </h2>
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl bg-slate-950/60 hover:bg-slate-800 border border-slate-850 hover:border-slate-700 text-slate-450 hover:text-white transition-all text-xs font-bold"
            title="Close"
          >
            ✕ Close
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto pr-2 space-y-6 text-sm text-slate-300 leading-relaxed scrollbar-thin scrollbar-thumb-slate-800">
          {renderContent()}
        </div>
      </div>
    </div>
  );
}
