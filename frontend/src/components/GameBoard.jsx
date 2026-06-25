import React, { useEffect, useState, useRef } from 'react';
import { useSocket } from '../context/SocketContext';
import Card from './Card';
import Opponents from './Opponents';
import PlayerHand from './PlayerHand';
import soundManager from '../utils/soundManager';
import Confetti from './Confetti';

const COLOR_CODES = {
  Red: 'bg-red-500 hover:bg-red-600 shadow-red-500/20',
  Yellow: 'bg-amber-400 hover:bg-amber-500 shadow-amber-400/20',
  Green: 'bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20',
  Blue: 'bg-blue-500 hover:bg-blue-600 shadow-blue-500/20'
};

const CARD_SIZE_CLASSES = {
  sm: 'w-[48px] h-[72px] sm:w-[56px] sm:h-[84px] md:w-[64px] md:h-[96px]',
  md: 'w-[88px] h-[128px] sm:w-[112px] sm:h-[168px] md:w-[128px] md:h-[192px]',
  lg: 'w-[128px] h-[192px] sm:w-[160px] sm:h-[224px] md:w-[176px] md:h-[256px]'
};

function getDrawRank(cardType) {
  switch (cardType) {
    case 'draw2':
      return 1;
    case 'draw4':
      return 2;
    case 'wild_reverse_draw4':
      return 3;
    case 'wild_draw6':
      return 4;
    case 'wild_draw10':
      return 5;
    default:
      return 0;
  }
}


export default function GameBoard({ roomCode, myUserId, onLeaveRoom }) {
  const { socket, connected } = useSocket();
  const [gameState, setGameState] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [logs, setLogs] = useState([{ id: 'start-log', text: '🎮 Host started a new match!' }]);
  const [showRestartConfirm, setShowRestartConfirm] = useState(false);
  const [pendingWildCard, setPendingWildCard] = useState(null); // Card waiting for color selection
  const [pendingWildDragPos, setPendingWildDragPos] = useState(null); // Track custom drag position for wild animation
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [privateDrawnCards, setPrivateDrawnCards] = useState([]); // Visual popup of drawn cards
  const [showMobileLog, setShowMobileLog] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(soundManager.isEnabled());
  const [soundVolume, setSoundVolume] = useState(soundManager.getVolume());
  const [lastDrawnCardId, setLastDrawnCardId] = useState(null);
  const [playerToRemove, setPlayerToRemove] = useState(null);
  const logsEndRef = useRef(null);
  const mobileLogsEndRef = useRef(null);
  const usernameRef = useRef('');

  // Animations State
  const [animatingCards, setAnimatingCards] = useState([]);
  const [animatingCardIds, setAnimatingCardIds] = useState(new Set());
  const [animatingPlayCardId, setAnimatingPlayCardId] = useState(null);
  const [optimisticDiscardCard, setOptimisticDiscardCard] = useState(null);

  const animatingPlayCardIdRef = useRef(null);
  useEffect(() => {
    animatingPlayCardIdRef.current = animatingPlayCardId;
  }, [animatingPlayCardId]);

  const privateDrawnTimerRef = useRef(null);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

  // Active Color Badge Pulse State
  const [pulseColorBadge, setPulseColorBadge] = useState(false);
  const prevColorRef = useRef(gameState?.currentColor);

  useEffect(() => {
    if (gameState?.currentColor && gameState.currentColor !== prevColorRef.current) {
      setPulseColorBadge(true);
      const timer = setTimeout(() => {
        setPulseColorBadge(false);
      }, 400); // 400ms pulse
      prevColorRef.current = gameState.currentColor;
      return () => clearTimeout(timer);
    }
  }, [gameState?.currentColor]);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const getElementCenter = (id) => {
    const el = document.getElementById(id);
    if (!el) return null;
    const rect = el.getBoundingClientRect();
    return {
      x: rect.left + rect.width / 2 + window.scrollX,
      y: rect.top + rect.height / 2 + window.scrollY,
      width: rect.width,
      height: rect.height
    };
  };

  const addCardAnimation = ({ card, startX, startY, endX, endY, duration, rotation, scale, hidden, size, isPlay = false }) => {
    const animId = Math.random().toString(36).substring(2, 9);
    
    // Configure scale dynamics
    const isOpponentDraw = hidden;
    const isOpponentPlay = !hidden && size === 'sm';
    
    let startScale = 1.0;
    let midScale = 1.15;
    let endScale = scale || 1.0;
    
    if (isOpponentDraw) {
      startScale = 0.8;
      midScale = 0.7;
      endScale = scale || 0.5;
    } else if (isOpponentPlay) {
      startScale = 0.6;
      midScale = 0.9;
      endScale = scale || 0.85;
    }

    const newAnim = {
      id: animId,
      card,
      startX,
      startY,
      endX,
      endY,
      duration,
      startScale,
      midScale,
      endScale,
      startRot: 0,
      midRot: rotation ? rotation * 0.6 : (Math.random() * 8 - 4),
      endRot: rotation || 0,
      hidden,
      size
    };

    if (isPlay && card && card.id) {
      setAnimatingPlayCardId(card.id);
    }

    setAnimatingCards(prev => [...prev, newAnim]);

    setTimeout(() => {
      setAnimatingCards(prev => prev.filter(anim => anim.id !== animId));
      if (isPlay && card && card.id) {
        setAnimatingPlayCardId(prev => prev === card.id ? null : prev);
      }
    }, duration);
  };


  useEffect(() => {
    if (!socket) return;

    // Join room channel and sync game state
    socket.emit('sync_game');

    const handleSync = (state) => {
      setOptimisticDiscardCard(prev => {
        if (!prev) return null;
        const newTopCard = state.discardPile[state.discardPile.length - 1];
        if (newTopCard && newTopCard.id === prev.id) {
          return null;
        }
        if (state.status === 'finished' || state.status === 'lobby') {
          return null;
        }
        return prev;
      });

      setGameState(prev => {
        if (prev) {
          const wasMyTurn = prev.players[prev.turnIndex]?.userId.toString() === myUserId ||
                            (prev.players[prev.turnIndex]?.userId._id && prev.players[prev.turnIndex]?.userId._id.toString() === myUserId);
          const isMyTurn = state.players[state.turnIndex]?.userId.toString() === myUserId ||
                           (state.players[state.turnIndex]?.userId._id && state.players[state.turnIndex]?.userId._id.toString() === myUserId);
          
          if (isMyTurn && !wasMyTurn && state.status !== 'finished') {
            soundManager.playYourTurn();
          }

          // --- DETECT CARDS DRAWN BY LOCAL PLAYER ---
          const prevMyState = prev.players.find(
            p => p.userId.toString() === myUserId || (p.userId._id && p.userId._id.toString() === myUserId)
          );
          const newMyState = state.players.find(
            p => p.userId.toString() === myUserId || (p.userId._id && p.userId._id.toString() === myUserId)
          );

          if (prevMyState && newMyState) {
            const prevHandIds = new Set(prevMyState.hand.map(c => c.id));
            const newlyDrawn = newMyState.hand.filter(c => !prevHandIds.has(c.id));

            if (newlyDrawn.length > 0) {
              const drawDeckCenter = getElementCenter('draw-deck-pile');
              const startX = drawDeckCenter ? drawDeckCenter.x - drawDeckCenter.width / 2 : window.innerWidth / 2 - 44;
              const startY = drawDeckCenter ? drawDeckCenter.y - drawDeckCenter.height / 2 : window.innerHeight / 2 - 64;

              // Hide from player hand container temporarily
              setAnimatingCardIds(prevIds => {
                const next = new Set(prevIds);
                newlyDrawn.forEach(c => next.add(c.id));
                return next;
              });

              newlyDrawn.forEach((card, idx) => {
                setTimeout(() => {
                  const handContainer = getElementCenter('player-hand-container');
                  const endX = handContainer ? handContainer.x - 44 : window.innerWidth / 2 - 44;
                  const endY = handContainer ? handContainer.y - 64 : window.innerHeight - 150;

                  addCardAnimation({
                    card,
                    startX,
                    startY,
                    endX,
                    endY,
                    duration: 200,
                    rotation: Math.random() * 20 - 10,
                    scale: 0.95,
                    hidden: false,
                    size: screenWidth < 640 ? 'sm' : 'md'
                  });

                  // Make card visible in fanned hand
                  setTimeout(() => {
                    setAnimatingCardIds(prevIds => {
                      const next = new Set(prevIds);
                      next.delete(card.id);
                      return next;
                    });
                  }, 200);
                }, idx * 50); // Stagger 50ms per card
              });
            }
          }
        }
        return state;
      });

      // Clear lastDrawnCardId if it is not our turn or hasDrawnThisTurn is false
      const isMyTurn = state.players[state.turnIndex]?.userId.toString() === myUserId ||
                       (state.players[state.turnIndex]?.userId._id && state.players[state.turnIndex]?.userId._id.toString() === myUserId);
      if (!isMyTurn || !state.hasDrawnThisTurn) {
        setLastDrawnCardId(null);
      }

      setErrorMessage(null);
    };

    const handlePrivateDrawn = ({ cards, isPenalty }) => {
      if (!cards || cards.length === 0) return;

      if (privateDrawnTimerRef.current) {
        clearTimeout(privateDrawnTimerRef.current);
      }

      // Display overlay only for penalty or multiple draws
      if (cards.length > 1 || isPenalty) {
        setPrivateDrawnCards(cards);
        privateDrawnTimerRef.current = setTimeout(() => {
          setPrivateDrawnCards([]);
        }, 1200);
      } else {
        setPrivateDrawnCards([]);
      }
      
      if (cards.length === 1 && !isPenalty) {
        setLastDrawnCardId(cards[0].id);
      } else {
        setLastDrawnCardId(null);
      }
    };

    const handleCardPlayed = ({ username, card, currentColor, reverseAsSkip }) => {
      if (reverseAsSkip) {
        addLog(`${username} played Reverse. With 2 players remaining, Reverse acted as Skip.`);
      } else {
        addLog(`${username} played ${card.color === 'Wild' ? 'Wild' : card.color} ${card.type === 'number' ? card.value : card.type.replace('_', ' ')} (Color is now ${currentColor})`);
      }

      // Add penalty stack log
      if (card.drawValue > 0) {
        if (card.type === 'draw2') {
          addLog('Penalty Stack Active: Only Draw 2 or Draw 4 may be played.');
        } else if (card.type === 'draw4' || card.type === 'wild_reverse_draw4') {
          addLog('Penalty Stack Active: Only Draw 4 may be played.');
        } else if (card.type === 'wild_draw6') {
          addLog('Penalty Stack Active: Only Wild Draw 6 or Wild Draw 10 may be played.');
        } else if (card.type === 'wild_draw10') {
          addLog('Penalty Stack Active: Only Wild Draw 10 may be played.');
        }
      }
      
      // Animate flight path for opponent plays
      if (username !== usernameRef.current) {
        const opponentAvatarPos = getElementCenter(`opponent-avatar-${username}`);
        const discardPos = getElementCenter('discard-pile');

        const startX = opponentAvatarPos ? opponentAvatarPos.x - 28 : window.innerWidth / 2;
        const startY = opponentAvatarPos ? opponentAvatarPos.y - 28 : 50;
        const endX = discardPos ? discardPos.x - discardPos.width / 2 : window.innerWidth / 2 + 50;
        const endY = discardPos ? discardPos.y - discardPos.height / 2 : window.innerHeight / 2 - 80;

        addCardAnimation({
          card,
          startX,
          startY,
          endX,
          endY,
          duration: 250,
          rotation: Math.random() * 30 - 15,
          scale: 0.85,
          hidden: false,
          size: 'sm',
          isPlay: true
        });
      }

      if (card.type === 'reverse') {
        soundManager.playReverse();
      } else if (card.type === 'skip' || card.type === 'skip_everyone') {
        soundManager.playSkip();
      } else if (card.type === 'discard_all') {
        soundManager.playDiscardAll();
      } else if (card.color === 'Wild') {
        soundManager.playColorChange();
      } else {
        soundManager.playCardPlay();
      }
    };

    const handleCardsDrawn = ({ username, count, isPenalty, wasEliminated }) => {
      if (count === 0) {
        addLog(`${username} passed their turn.`);
        return;
      }
      const action = isPenalty ? `drew ${count} penalty cards` : `drew ${count} cards`;
      addLog(`${username} ${action}${wasEliminated ? ' and was ELIMINATED!' : '.'}`);
      
      // Animate flight path for opponent draws
      if (username !== usernameRef.current) {
        const drawDeckPos = getElementCenter('draw-deck-pile');
        const opponentAvatarPos = getElementCenter(`opponent-avatar-${username}`);

        const startX = drawDeckPos ? drawDeckPos.x - drawDeckPos.width / 2 : window.innerWidth / 2 - 44;
        const startY = drawDeckPos ? drawDeckPos.y - drawDeckPos.height / 2 : window.innerHeight / 2 - 64;
        const endX = opponentAvatarPos ? opponentAvatarPos.x - 20 : window.innerWidth / 2;
        const endY = opponentAvatarPos ? opponentAvatarPos.y - 20 : 50;

        for (let i = 0; i < count; i++) {
          setTimeout(() => {
            addCardAnimation({
              card: {},
              startX,
              startY,
              endX,
              endY,
              duration: 200,
              rotation: Math.random() * 20 - 10,
              scale: 0.5,
              hidden: true,
              size: 'sm'
            });
          }, i * 50);
        }
      }

      if (isPenalty) {
        soundManager.playPenalty();
      } else {
        soundManager.playCardDraw();
      }
    };

    const handleElimination = ({ username }) => {
      addLog(`💀 ${username} was eliminated (hand reached 25+ cards)!`);
    };

    const handleRoulette = ({ username, color, drawCount }) => {
      addLog(`🎯 Wild Color Roulette: ${username} drew ${drawCount} cards until finding ${color}!`);
      soundManager.playPenalty();
    };

    const handleGameOver = ({ winnerUsername }) => {
      addLog(`🏆 GAME OVER! ${winnerUsername} is the winner!`);
      if (winnerUsername === usernameRef.current) {
        soundManager.playVictory();
      } else {
        soundManager.playDefeat();
      }
    };

    const handleError = (msg) => {
      setErrorMessage(msg);
      setTimeout(() => setErrorMessage(null), 4000);
    };

    const handleUnoCalled = ({ username }) => {
      addLog(`📢 ${username} called UNO!`);
      soundManager.playUnoCall();
    };

    const handleUnoPenalty = ({ username }) => {
      addLog(`⚠️ ${username} forgot to call UNO and was penalized 2 cards!`);
      soundManager.playUnoPenalty();
    };

    const handlePlayerFinished = ({ username, rank }) => {
      const suffixes = ["th", "st", "nd", "rd"];
      const val = rank % 100;
      const suffix = suffixes[(val - 20) % 10] || suffixes[val] || suffixes[0];
      const emoji = rank === 1 ? '🏆' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
      addLog(`${emoji} ${username} finished in ${rank}${suffix} place!`);
    };

    const handlePlayerRemoved = ({ username }) => {
      addLog(`⚠️ ${username} was removed by the host.`);
      setErrorMessage(`${username} was removed by the host.`);
      setTimeout(() => setErrorMessage(null), 4500);
    };

    const handleLogMessage = ({ text }) => {
      addLog(text);
    };

    const handlePlayerLeft = ({ username }) => {
      addLog(`🚪 ${username} left the match.`);
    };

    socket.on('game_state_sync', handleSync);
    socket.on('cards_drawn_private', handlePrivateDrawn);
    socket.on('card_played', handleCardPlayed);
    socket.on('cards_drawn', handleCardsDrawn);
    socket.on('player_eliminated', handleElimination);
    socket.on('roulette_resolved', handleRoulette);
    socket.on('game_over', handleGameOver);
    socket.on('error_message', handleError);
    socket.on('uno_called', handleUnoCalled);
    socket.on('uno_penalty', handleUnoPenalty);
    socket.on('player_finished', handlePlayerFinished);
    socket.on('player_removed', handlePlayerRemoved);
    socket.on('log_message', handleLogMessage);
    socket.on('player_left', handlePlayerLeft);

    return () => {
      socket.off('game_state_sync', handleSync);
      socket.off('cards_drawn_private', handlePrivateDrawn);
      socket.off('card_played', handleCardPlayed);
      socket.off('cards_drawn', handleCardsDrawn);
      socket.off('player_eliminated', handleElimination);
      socket.off('roulette_resolved', handleRoulette);
      socket.off('game_over', handleGameOver);
      socket.off('error_message', handleError);
      socket.off('uno_called', handleUnoCalled);
      socket.off('uno_penalty', handleUnoPenalty);
      socket.off('player_finished', handlePlayerFinished);
      socket.off('player_removed', handlePlayerRemoved);
      socket.off('log_message', handleLogMessage);
      socket.off('player_left', handlePlayerLeft);
      if (privateDrawnTimerRef.current) {
        clearTimeout(privateDrawnTimerRef.current);
      }
    };
  }, [socket]);

  useEffect(() => {
    logsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    mobileLogsEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  useEffect(() => {
    if (gameState) {
      const myState = gameState.players.find(
        p => p.userId.toString() === myUserId || (p.userId._id && p.userId._id.toString() === myUserId)
      );
      if (myState) {
        usernameRef.current = myState.username;
      }
    }
  }, [gameState, myUserId]);

  const toggleSound = () => {
    const newVal = soundManager.toggleEnabled();
    setSoundEnabled(newVal);
  };

  const handleVolumeChange = (e) => {
    const val = parseFloat(e.target.value);
    soundManager.setVolume(val);
    setSoundVolume(val);
  };

  const addLog = (msg) => {
    setLogs(prev => [...prev.slice(-30), { id: Date.now() + Math.random(), text: msg }]);
  };

  const handleRestartMatch = () => {
    setShowRestartConfirm(false);
    setOptimisticDiscardCard(null);
    if (socket) {
      socket.emit('restart_game');
    }
  };

  const handleConfirmRemove = (player) => {
    if (socket) {
      const targetUserId = player.userId._id ? player.userId._id.toString() : player.userId.toString();
      socket.emit('remove_player', { userId: targetUserId });
    }
  };

  if (!gameState) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white select-none">
        <img
          src="/favicon.png"
          alt="UNO No Mercy Logo"
          className="w-24 h-24 sm:w-32 sm:h-32 object-contain animate-logo-float mb-6"
        />
        <p className="text-slate-400 font-bold uppercase tracking-widest text-[10px] sm:text-xs animate-pulse">
          Connecting to Game Session...
        </p>
      </div>
    );
  }

  const myPlayerState = gameState.players.find(
    p => p.userId.toString() === myUserId || (p.userId._id && p.userId._id.toString() === myUserId)
  );

  const opponents = gameState.players.filter(
    p => p.userId.toString() !== myUserId && (p.userId._id ? p.userId._id.toString() !== myUserId : true)
  );

  const isHost = myUserId === gameState.hostId;

  const isMyTurn = gameState.players[gameState.turnIndex]?.userId.toString() === myUserId ||
                   (gameState.players[gameState.turnIndex]?.userId._id && gameState.players[gameState.turnIndex]?.userId._id.toString() === myUserId);

  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  const serverTopCard = gameState.discardPile[gameState.discardPile.length - 1];
  const serverPrevCard = gameState.discardPile.length > 1 ? gameState.discardPile[gameState.discardPile.length - 2] : null;

  let visualTopCard = null;
  let prevCard = null;

  if (animatingPlayCardId) {
    if (serverTopCard && serverTopCard.id === animatingPlayCardId) {
      visualTopCard = serverPrevCard;
      prevCard = gameState.discardPile.length > 2 ? gameState.discardPile[gameState.discardPile.length - 3] : null;
    } else {
      visualTopCard = serverTopCard;
      prevCard = serverPrevCard;
    }
  } else if (optimisticDiscardCard) {
    visualTopCard = optimisticDiscardCard;
    prevCard = serverTopCard;
  } else {
    visualTopCard = serverTopCard;
    prevCard = serverPrevCard;
  }

  // Helper to pre-calculate playable cards in player hand
  const playableCardIds = new Set();
  if (myPlayerState && !myPlayerState.isEliminated) {
    if (gameState.penaltyStack > 0) {
      myPlayerState.hand.forEach(card => {
        const topType = topCard.type;
        let isPlayable = false;
        if (topType === 'draw2') {
          isPlayable = card.type === 'draw2' || card.type === 'draw4';
        } else if (topType === 'draw4' || topType === 'wild_reverse_draw4') {
          isPlayable = card.type === 'draw4';
        } else if (topType === 'wild_draw6') {
          isPlayable = card.type === 'wild_draw6' || card.type === 'wild_draw10';
        } else if (topType === 'wild_draw10') {
          isPlayable = card.type === 'wild_draw10';
        }
        if (isPlayable) {
          playableCardIds.add(card.id);
        }
      });
    } else {
      // Wild cards should only be playable when the player has NO OTHER VALID PLAY available.
      const isNormalCardPlayable = (c) => {
        if (c.color === 'Wild') return false;
        return c.color === gameState.currentColor || c.value === topCard.value;
      };
      const hasNormalPlay = myPlayerState.hand.some(c => isNormalCardPlayable(c));

      myPlayerState.hand.forEach(card => {
        if (card.color === 'Wild') {
          if (!hasNormalPlay) {
            playableCardIds.add(card.id);
          }
        } else {
          if (card.color === gameState.currentColor || card.value === topCard.value) {
            playableCardIds.add(card.id);
          }
        }
      });
    }
  }

  const handlePlayAttemptFailed = (card) => {
    if (card.color === 'Wild') {
      setErrorMessage("Wild cards can only be played when no other valid card is available.");
      setTimeout(() => setErrorMessage(null), 4000);
    }
  };

  const handleCardClick = (card, dragStartPos = null) => {
    if (card.color === 'Wild') {
      setPendingWildCard(card);
      setPendingWildDragPos(dragStartPos);
      setShowColorPicker(true);
    } else {
      // Optimistic play card animation for non-wild cards
      const handCardPos = getElementCenter('hand-card-' + card.id);
      const discardPos = getElementCenter('discard-pile');

      const startX = dragStartPos ? dragStartPos.x : (handCardPos ? handCardPos.x - handCardPos.width / 2 : window.innerWidth / 2 - 44);
      const startY = dragStartPos ? dragStartPos.y : (handCardPos ? handCardPos.y - handCardPos.height / 2 : window.innerHeight - 150);
      const endX = discardPos ? discardPos.x - discardPos.width / 2 : window.innerWidth / 2 + 50;
      const endY = discardPos ? discardPos.y - discardPos.height / 2 : window.innerHeight / 2 - 80;

      setOptimisticDiscardCard(card); // Set optimistic top card state

      setAnimatingCardIds(prev => {
        const next = new Set(prev);
        next.add(card.id);
        return next;
      });

      addCardAnimation({
        card,
        startX,
        startY,
        endX,
        endY,
        duration: 250,
        rotation: Math.random() * 30 - 15,
        scale: 0.95,
        hidden: false,
        size: screenWidth < 640 ? 'sm' : 'md',
        isPlay: true
      });

      setTimeout(() => {
        setAnimatingCardIds(prev => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }, 250);

      // Safety fallback: clear optimistic card after 1.5s in case sync is lost
      setTimeout(() => {
        setOptimisticDiscardCard(prev => {
          if (prev && prev.id === card.id) {
            return null;
          }
          return prev;
        });
      }, 1500);

      socket.emit('play_card', { cardId: card.id });
    }
  };

  const handleColorSelected = (color) => {
    if (pendingWildCard) {
      const card = pendingWildCard;
      // Optimistic play card animation for wild cards after color choice
      const handCardPos = getElementCenter('hand-card-' + card.id);
      const discardPos = getElementCenter('discard-pile');

      const startX = pendingWildDragPos ? pendingWildDragPos.x : (handCardPos ? handCardPos.x - handCardPos.width / 2 : window.innerWidth / 2 - 44);
      const startY = pendingWildDragPos ? pendingWildDragPos.y : (handCardPos ? handCardPos.y - handCardPos.height / 2 : window.innerHeight - 150);
      const endX = discardPos ? discardPos.x - discardPos.width / 2 : window.innerWidth / 2 + 50;
      const endY = discardPos ? discardPos.y - discardPos.height / 2 : window.innerHeight / 2 - 80;

      setOptimisticDiscardCard(card); // Set optimistic top card state

      setAnimatingCardIds(prev => {
        const next = new Set(prev);
        next.add(card.id);
        return next;
      });

      addCardAnimation({
        card,
        startX,
        startY,
        endX,
        endY,
        duration: 250,
        rotation: Math.random() * 30 - 15,
        scale: 0.95,
        hidden: false,
        size: screenWidth < 640 ? 'sm' : 'md',
        isPlay: true
      });

      setTimeout(() => {
        setAnimatingCardIds(prev => {
          const next = new Set(prev);
          next.delete(card.id);
          return next;
        });
      }, 250);

      // Safety fallback: clear optimistic card after 1.5s in case sync is lost
      setTimeout(() => {
        setOptimisticDiscardCard(prev => {
          if (prev && prev.id === card.id) {
            return null;
          }
          return prev;
        });
      }, 1500);

      socket.emit('play_card', { cardId: pendingWildCard.id, chosenColor: color });
      setPendingWildCard(null);
      setPendingWildDragPos(null);
      setShowColorPicker(false);
    }
  };

  const handleDrawClick = () => {
    if (isMyTurn) {
      socket.emit('draw_card');
    }
  };

  return (
    <div className="min-h-screen w-full max-w-full overflow-x-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex flex-col justify-between text-white font-sans relative">
      {/* 1. TOP HEADER */}
      <header className="bg-slate-900/80 border-b border-slate-800 p-3 sm:p-4 flex flex-col sm:flex-row justify-between items-center gap-3 sm:gap-4 z-10 w-full max-w-full">
        {/* Row 1: Logo & Room Code */}
        <div className="flex w-full sm:w-auto justify-between items-center gap-4">
          <span className="font-black text-lg sm:text-xl tracking-tighter text-red-500 italic uppercase">UNO NO MERCY</span>
          <div className="bg-slate-800 px-3 py-1 rounded-full text-[10px] sm:text-xs font-bold border border-slate-700 whitespace-nowrap">
            Room Code: <span className="text-yellow-400 font-extrabold">{roomCode}</span>
          </div>
        </div>

        {/* Row 2: Controls */}
        <div className="flex w-full sm:w-auto justify-between sm:justify-start items-center gap-2 sm:gap-3">
          {/* Audio Controls */}
          <div className="flex items-center gap-1.5 sm:gap-2 bg-slate-800 px-2 py-1 sm:px-2.5 sm:py-1.5 rounded-lg border border-slate-700 select-none">
            <button
              onClick={toggleSound}
              className="text-[10px] sm:text-xs font-bold text-slate-200 hover:text-white flex items-center gap-0.5 sm:gap-1 min-w-[42px] sm:min-w-[50px] transition-colors"
              title={soundEnabled ? 'Mute Sound' : 'Unmute Sound'}
            >
              {soundEnabled ? '🔊 ON' : '🔇 OFF'}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={soundVolume}
              onChange={handleVolumeChange}
              className="w-12 xs:w-16 sm:w-20 h-1 bg-slate-600 rounded appearance-none cursor-pointer accent-red-500"
              title="Sound Volume"
            />
          </div>

          {/* Log Toggle Button (Mobile only) */}
          <button
            onClick={() => setShowMobileLog(true)}
            className="md:hidden px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] sm:text-xs font-bold transition-all border border-slate-700 flex items-center gap-1 text-slate-200 whitespace-nowrap"
          >
            📋 Log
          </button>
          
          <button
            onClick={onLeaveRoom}
            className="px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-[10px] sm:text-xs font-bold transition-all border border-slate-700 whitespace-nowrap"
          >
            Leave Match
          </button>
        </div>
      </header>

      {/* 2. OPPONENTS SECTION */}
      <section className="py-2 bg-slate-950/20">
        <Opponents 
          players={gameState.players} 
          currentTurnIndex={gameState.turnIndex} 
          myUserId={myUserId} 
          isHost={isHost}
          onRemovePlayer={(opponent) => setPlayerToRemove(opponent)}
        />
      </section>

      {/* 3. CENTER PLAY AREA GRID */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 grid grid-cols-1 md:grid-cols-4 gap-6 items-center justify-center relative">
        {/* Error / Notification Overlay Banner */}
        {errorMessage && (
          <div className="absolute top-2 left-1/2 transform -translate-x-1/2 z-50 bg-red-600/90 backdrop-blur-sm border border-red-500 px-6 py-2 rounded-xl text-sm font-black tracking-wide shadow-xl shadow-red-900/30 animate-bounce">
            ⚠️ {errorMessage}
          </div>
        )}

        {/* Left Side: Opponent Status Panel (Hidden on mobile) */}
        <div className="hidden md:flex bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl md:col-span-1 min-h-64 md:min-h-80 h-fit flex flex-col justify-between gap-4">
          <div>
            {/* Opponents Status Heading */}
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Opponent Status</h3>
            
            {/* Opponents List */}
            <div className="space-y-2.5 text-sm">
              {(() => {
                const activeOpponents = opponents.filter(o => !o.finishedRank || o.finishedRank === 0);
                if (activeOpponents.length === 0) {
                  return <span className="text-xs text-slate-500 italic">No active opponents</span>;
                }
                return activeOpponents.map((opponent) => {
                  const isEliminated = opponent.isEliminated;
                  const handCount = opponent.handCount;
                  const isUno = handCount === 1;
                  const isCritical = handCount <= 3;
                  const isCurrentTurn = gameState.players[gameState.turnIndex]?.userId.toString() === opponent.userId.toString() ||
                                        (gameState.players[gameState.turnIndex]?.userId._id && gameState.players[gameState.turnIndex]?.userId._id.toString() === opponent.userId.toString());

                  return (
                    <div key={opponent.userId._id || opponent.userId} className="flex justify-between items-center py-0.5">
                      <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                        <span className="text-slate-500 text-xs">👤</span>
                        <span className={`truncate font-medium ${isCurrentTurn ? 'text-red-400 font-bold' : 'text-slate-200'}`} title={opponent.username}>
                          {opponent.username} {opponent.status === 'offline' && '🔴 Offline'}
                        </span>
                        {isUno && !isEliminated && (
                          <span className="text-[10px] font-black bg-red-600 text-white px-1.5 py-0.5 rounded animate-pulse tracking-wide flex items-center gap-0.5 flex-shrink-0">
                            ⚠️ UNO
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        {isEliminated ? (
                          <span className="text-[9px] font-black text-red-500/80 uppercase tracking-wider">💀 ELIMINATED</span>
                        ) : (
                          <span className={`inline-block text-center font-black rounded-md px-2 py-0.5 text-xs min-w-7 border ${
                            isUno
                              ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                              : isCritical
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                              : 'bg-slate-800 text-slate-300 border-slate-700/50'
                          }`}>
                            {handCount}
                          </span>
                        )}

                        {isHost && (
                          <button
                            onClick={() => setPlayerToRemove(opponent)}
                            className="px-1.5 py-0.5 rounded bg-red-650/20 hover:bg-red-600 text-red-400 hover:text-white border border-red-600/30 text-[9px] font-black uppercase transition-all duration-200 flex-shrink-0"
                            title={`Remove ${opponent.username}`}
                          >
                            🚫 Kick
                          </button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}
            </div>

            {/* Real-time Match Rankings */}
            {(() => {
              const rankedPlayers = gameState.players
                .filter(p => p.finishedRank > 0)
                .sort((a, b) => a.finishedRank - b.finishedRank);
              if (rankedPlayers.length === 0) return null;
              return (
                <div className="mt-6 border-t border-slate-800/80 pt-4 select-none">
                  <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">🏆 Match Rankings</h3>
                  <div className="space-y-2.5 text-sm">
                    {rankedPlayers.map((player) => {
                      const isSelf = player.userId.toString() === myUserId || (player.userId._id && player.userId._id.toString() === myUserId);
                      const rank = player.finishedRank;
                      const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '🏅';
                      
                      return (
                        <div key={player.userId._id || player.userId} className="flex justify-between items-center py-0.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-lg">{medal}</span>
                            <span className={`truncate font-medium ${isSelf ? 'text-yellow-400 font-bold' : 'text-slate-200'}`} title={player.username}>
                              {player.username} {isSelf && '(You)'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                            {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>

          {gameState.penaltyStack > 0 && (
            <div className="p-3 bg-red-950/80 border border-red-800/60 rounded-xl flex flex-col items-center justify-center text-center animate-pulse">
              <span className="text-[10px] font-black tracking-widest text-red-500 uppercase">Penalty Stack</span>
              <span className="text-2xl font-black text-red-400">+{gameState.penaltyStack} Cards</span>
              <span className="text-[9px] text-slate-400 mt-1">
                {(() => {
                  const topType = topCard?.type;
                  if (topType === 'draw2') return 'Stack Draw 2 or Draw 4!';
                  if (topType === 'draw4' || topType === 'wild_reverse_draw4') return 'Stack Draw 4!';
                  if (topType === 'wild_draw6') return 'Stack Wild Draw 6 or Draw 10!';
                  if (topType === 'wild_draw10') return 'Stack Wild Draw 10!';
                  return 'Stack allowed DRAW card!';
                })()}
              </span>
            </div>
          )}
        </div>

        {/* Center: Table & Play Piles */}
        <div className="md:col-span-2 flex flex-col items-center justify-center gap-8  relative">
          {/* Rotating play-direction glowing ring */}
          <div className={`absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full border-4 border-dashed border-slate-800 opacity-20 pointer-events-none ${
            gameState.direction === 1 ? 'animate-[spin_40s_linear_infinite]' : 'animate-[spin_40s_linear_infinite_reverse]'
          }`}></div>

          {/* Card Piles Row */}
          <div className="flex justify-center items-center gap-10 relative z-10">
            {/* Draw Deck Stack */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Draw Deck</span>
              <div id="draw-deck-pile" className="relative">
                <Card
                  hidden
                  size="md"
                  onClick={handleDrawClick}
                  isPlayable={isMyTurn}
                />
                {isMyTurn && gameState.hasDrawnThisTurn && (
                  <span className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-amber-500 text-black font-black text-[10px] px-3 py-0.5 rounded-full animate-pulse cursor-pointer">
                    Pass
                  </span>
                )}
                {isMyTurn && !gameState.hasDrawnThisTurn && gameState.penaltyStack === 0 && (
                  <span className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-emerald-500 text-black font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                    Draw
                  </span>
                )}
                {isMyTurn && !gameState.hasDrawnThisTurn && gameState.penaltyStack > 0 && (
                  <span className="absolute -bottom-7 left-1/2 transform -translate-x-1/2 bg-red-600 text-white font-black text-[10px] px-2 py-0.5 rounded-full animate-bounce">
                    TAKE PENALTY
                  </span>
                )}
              </div>
            </div>

            {/* Discard Pile Stack */}
            <div className="flex flex-col items-center gap-1.5">
              <span className="text-xs font-bold text-slate-500">Discard Pile</span>
              <div id="discard-pile" className="relative w-[88px] h-[128px] sm:w-[112px] sm:h-[168px] md:w-[128px] md:h-[192px]">
                {/* Pre-drawn under-stacking shadow cards */}
                <div className="absolute top-1 left-1 w-full h-full bg-slate-900 border border-slate-800 rounded-xl -z-10 rotate-3"></div>
                
                {/* Underneath card (previous top card) */}
                {prevCard && (
                  <div className="absolute inset-0">
                    <Card card={prevCard} size="md" />
                  </div>
                )}

                {/* Top card (new top card) */}
                {visualTopCard && (
                  <div key={visualTopCard.id} className="absolute inset-0 animate-discard-fade-in">
                    <Card card={visualTopCard} size="md" />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Active Color Badge */}
          {(() => {
            const activeColor = gameState.currentColor;
            const badgeColorConfig = {
              Red: { glow: ' border-red-500/30', emoji: '🟥', label: 'RED' },
              Green: {  glow: ' border-emerald-500/30', emoji: '🟩', label: 'GREEN' },
              Blue: {  glow: ' border-blue-500/30', emoji: '🟦', label: 'BLUE' },
              Yellow: { glow: ' border-amber-400/30', emoji: '🟨', label: 'YELLOW' }
            }[activeColor] || { bg: 'bg-slate-700', glow: 'shadow-none border-slate-600/30', emoji: '⚪', label: 'UNKNOWN' };

            return (
              <div
                className={`relative z-20 flex items-center justify-center gap-2 px-6 sm:px-8 h-11 sm:h-12 rounded-full border text-white font-black tracking-widest text-sm sm:text-base uppercase drop-shadow-[0_1.5px_2px_rgba(0,0,0,0.65)] transition-all duration-300 ease-in-out ${
                  pulseColorBadge ? 'animate-badge-pulse' : ''
                } ${badgeColorConfig.bg} ${badgeColorConfig.glow}`}
              >
                <span className="text-2xl">{badgeColorConfig.emoji}</span>
                <span>{badgeColorConfig.label}</span>
              </div>
            );
          })()}

          {/* Animated UNO Button Indicator */}
          {myPlayerState && myPlayerState.hand.length === 1 && (myPlayerState.needsUnoCall || myPlayerState.hasCalledUno) && (
            <div className="relative z-20 flex flex-col items-center mt-1.5 animate-[scaleIn_0.3s_ease-out_forwards]">
              {!myPlayerState.hasCalledUno ? (
                <button
                  onClick={() => socket.emit('call_uno')}
                  className="px-8 py-3 rounded-full bg-gradient-to-r from-red-600 via-yellow-500 to-red-600 hover:from-red-500 hover:via-yellow-400 hover:to-red-500 font-black text-black text-lg border-2 border-white shadow-xl shadow-red-600/40 animate-pulse active:scale-95 transition-all uppercase tracking-wider skew-x-[-6deg]"
                >
                  Call UNO!
                </button>
              ) : (
                <div className="flex flex-col items-center gap-1">
                  <button
                    disabled
                    className="px-8 py-3 rounded-full bg-slate-800 text-slate-500 font-black text-lg border-2 border-slate-700 uppercase tracking-wider skew-x-[-6deg]"
                  >
                    UNO Called
                  </button>
                  <span className="text-[10px] font-black text-emerald-400 tracking-widest uppercase animate-pulse">
                    ✓ SECURE
                  </span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Side: Move logs Panel (Hidden on mobile) */}
        <div className="hidden md:flex bg-slate-900/40 border border-slate-800/80 p-4 rounded-2xl md:col-span-1 h-64 md:h-80 flex flex-col">
          <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-3">Live Log</h3>
          <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono text-slate-400 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
            {logs.map((log) => (
              <div key={log.id} className="border-b border-slate-800/30 pb-1 last:border-0 leading-relaxed">
                {log.text}
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </main>

      {/* 4. PRIVATE DRAWN CARD POPUP MODAL */}
      {privateDrawnCards.length > 0 && (
        <div 
          onClick={() => {
            setPrivateDrawnCards([]);
            if (privateDrawnTimerRef.current) {
              clearTimeout(privateDrawnTimerRef.current);
            }
          }}
          className="absolute inset-0 z-40 bg-black/70 backdrop-blur-sm flex flex-col justify-center items-center gap-4 cursor-pointer select-none"
        >
          <h2 className="text-2xl font-black text-yellow-400 tracking-wide animate-pulse">
            YOU DREW {privateDrawnCards.length} {privateDrawnCards.length === 1 ? 'CARD' : 'CARDS'}!
          </h2>
          <div className="flex gap-4 p-4 overflow-x-auto max-w-full justify-center">
            {privateDrawnCards.map((card, idx) => (
              <div key={card.id || idx} className="animate-[scaleIn_0.3s_ease-out_forwards]" style={{ animationDelay: `${idx * 100}ms` }}>
                <Card card={card} size="md" />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 5. COLOR PICKER DIALOG */}
      {showColorPicker && (
        <div className="absolute inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-sm w-full text-center shadow-2xl flex flex-col items-center">
            <h2 className="text-xl font-black tracking-wide text-white mb-2">CHOOSE COLOR</h2>
            <p className="text-slate-400 text-xs mb-6">Select a color to set the active color for play.</p>

            <div className="grid grid-cols-2 gap-4 w-full">
              {Object.keys(COLOR_CODES).map((color) => (
                <button
                  key={color}
                  onClick={() => handleColorSelected(color)}
                  className={`py-6 rounded-2xl text-black font-extrabold text-lg uppercase transition-all duration-300 transform hover:scale-105 active:scale-95 shadow-lg ${COLOR_CODES[color]}`}
                >
                  {color}
                </button>
              ))}
            </div>
            
            <button
              onClick={() => {
                setShowColorPicker(false);
                setPendingWildCard(null);
              }}
              className="mt-6 text-xs text-slate-500 font-bold hover:text-slate-300 transition-colors"
            >
              Cancel Play
            </button>
          </div>
        </div>
      )}

      {/* 6. GAME OVER OVERLAY */}
      {gameState.status === 'finished' && (
        <div className="absolute inset-0 z-50 bg-black/95 flex flex-col justify-center items-center text-center p-4 sm:p-6 overflow-y-auto">
          {/* Confetti Explosion */}
          <Confetti />

          {/* Glowing Trophy */}
          <div className="text-6xl sm:text-7xl mb-4 animate-[float-trophy_3s_ease-in-out_infinite] filter drop-shadow-[0_0_20px_rgba(251,191,36,0.6)]">
            🏆
          </div>
          
          <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-red-500 uppercase italic animate-[scaleIn_0.4s_ease-out_forwards] drop-shadow-[0_2px_10px_rgba(0,0,0,0.5)]">
            MATCH FINISHED!
          </h1>
          
          {/* Leaderboard list */}
          <div className="mt-8 max-w-sm w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-6 flex flex-col gap-3 shadow-2xl ring-1 ring-white/10 animate-[scaleIn_0.5s_ease-out_forwards]">
            <h2 className="text-xs font-black text-slate-500 uppercase tracking-widest text-left mb-2">🏆 Final Results</h2>
            {gameState.players
              .filter(p => p.finishedRank > 0)
              .sort((a, b) => a.finishedRank - b.finishedRank)
              .map((player) => {
                const isSelf = player.userId.toString() === myUserId || (player.userId._id && player.userId._id.toString() === myUserId);
                const rank = player.finishedRank;
                const medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : '4️⃣';
                
                return (
                  <div 
                    key={player.userId._id || player.userId} 
                    className={`flex justify-between items-center py-2.5 px-3 rounded-xl border text-left transition-all ${
                      rank === 1 
                        ? 'bg-yellow-500/10 border-yellow-500/35 animate-[pulse-glow_3s_infinite]' 
                        : 'bg-slate-950/60 border-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="text-2xl">{medal}</span>
                      <span className={`truncate font-bold ${isSelf ? 'text-yellow-400 font-bold' : 'text-slate-200'}`}>
                        {player.username} {isSelf && '(You)'}
                      </span>
                    </div>
                    <span className={`text-xs font-extrabold ${rank === 1 ? 'text-yellow-450' : 'text-slate-400'}`}>
                      {rank === 1 ? '1st' : rank === 2 ? '2nd' : rank === 3 ? '3rd' : `${rank}th`} Place
                    </span>
                  </div>
                );
              })}
          </div>

          {isHost ? (
            <div className="flex flex-col sm:flex-row gap-4 mt-10 z-10">
              <button
                onClick={() => setShowRestartConfirm(true)}
                className="px-8 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-600 text-black font-black text-lg transition-all shadow-xl shadow-emerald-500/25 hover:scale-105 active:scale-95 flex items-center gap-1.5 animate-[scaleIn_0.55s_ease-out_forwards]"
              >
                🔄 Play Again
              </button>
              <button
                onClick={onLeaveRoom}
                className="px-8 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg transition-all border border-slate-700 hover:scale-105 active:scale-95 animate-[scaleIn_0.55s_ease-out_forwards]"
              >
                Return to Lobby
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2 items-center mt-10 z-10">
              <p className="text-slate-400 text-xs italic animate-pulse">Waiting for host to restart or close room...</p>
              <button
                onClick={onLeaveRoom}
                className="mt-4 px-8 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-black text-lg transition-all border border-slate-700 hover:scale-105 active:scale-95"
              >
                Return to Lobby
              </button>
            </div>
          )}
        </div>
      )}

      {/* RESTART CONFIRMATION MODAL */}
      {showRestartConfirm && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-[scaleIn_0.2s_ease-out_forwards]">
            <h2 className="text-xl font-black tracking-wide text-white mb-2">Restart Match</h2>
            <p className="text-slate-400 text-sm mb-6">Restart the match for all players?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowRestartConfirm(false)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-slate-700 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={handleRestartMatch}
                className="flex-1 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-black font-black transition-all shadow-lg shadow-emerald-500/20 active:scale-95"
              >
                Restart
              </button>
            </div>
          </div>
        </div>
      )}

      {/* KICK CONFIRMATION MODAL */}
      {playerToRemove && (
        <div className="absolute inset-0 z-50 bg-black/80 backdrop-blur-sm flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center shadow-2xl animate-[scaleIn_0.2s_ease-out_forwards]">
            <h2 className="text-xl font-black tracking-wide text-white mb-2">Remove Player</h2>
            <p className="text-slate-400 text-sm mb-6">Remove {playerToRemove.username} from this room?</p>
            <div className="flex gap-4">
              <button
                onClick={() => setPlayerToRemove(null)}
                className="flex-1 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold transition-all border border-slate-700 active:scale-95"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleConfirmRemove(playerToRemove);
                  setPlayerToRemove(null);
                }}
                className="flex-1 py-3 rounded-xl bg-red-650 hover:bg-red-600 text-white font-black transition-all shadow-lg shadow-red-600/20 active:scale-95"
              >
                Remove Player
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 7. BOTTOM ACTIVE HAND OR SPECTATOR BANNER */}
      {myPlayerState && !myPlayerState.isEliminated && (
        <section className="relative z-20">
          {myPlayerState.finishedRank > 0 ? (
            <div className="bg-slate-900/90 backdrop-blur-md border-t border-slate-800 p-6 flex flex-col justify-center items-center gap-2 select-none shadow-2xl relative">
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 px-4 py-1.5 rounded-full bg-emerald-500 text-black text-xs font-black uppercase tracking-widest border border-slate-900 shadow-lg shadow-emerald-500/20">
                Spectating Match
              </div>
              <div className="text-3xl animate-bounce mt-2">
                {myPlayerState.finishedRank === 1 ? '🏆' : myPlayerState.finishedRank === 2 ? '🥈' : myPlayerState.finishedRank === 3 ? '🥉' : '🏅'}
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-yellow-400 uppercase italic tracking-wide">
                You Finished {myPlayerState.finishedRank === 1 ? '1st' : myPlayerState.finishedRank === 2 ? '2nd' : myPlayerState.finishedRank === 3 ? '3rd' : `${myPlayerState.finishedRank}th`} Place!
              </h2>
              <p className="text-slate-400 text-xs sm:text-sm">Please wait while the remaining players finish the match.</p>
            </div>
          ) : (
            <PlayerHand
              hand={myPlayerState.hand}
              isMyTurn={isMyTurn}
              playableCardIds={playableCardIds}
              onPlayCard={handleCardClick}
              onPlayAttemptFailed={handlePlayAttemptFailed}
              direction={gameState.direction}
              currentColor={gameState.currentColor}
              deckCount={gameState.deckCount}
              highlightedCardId={lastDrawnCardId}
              animatingCardIds={(() => {
                const ids = new Set(animatingCardIds);
                if (pendingWildCard) {
                  ids.add(pendingWildCard.id);
                }
                return ids;
              })()}
            />
          )}
        </section>
      )}

      {/* Renders if player is eliminated but watching the game */}
      {myPlayerState && myPlayerState.isEliminated && (
        <div className="bg-red-950/40 border-t border-red-900/50 p-4 text-center select-none z-10">
          <p className="text-red-500 font-black tracking-widest uppercase text-sm animate-pulse">
            💀 YOU HAVE BEEN ELIMINATED (SPECTATING MATCH)
          </p>
        </div>
      )}

      {/* MOBILE LOG MODAL POPUP */}
      {showMobileLog && (
        <div className="absolute inset-0 z-50 bg-black/85 backdrop-blur-md flex justify-center items-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full h-[60vh] flex flex-col shadow-2xl relative animate-[scaleIn_0.25s_ease-out_forwards]">
            <button
              onClick={() => setShowMobileLog(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white font-black text-lg p-1"
            >
              ✕
            </button>
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4">Live Log</h3>
            <div className="flex-1 overflow-y-auto space-y-2 text-xs font-mono text-slate-400 pr-1 scrollbar-thin scrollbar-thumb-slate-800">
              {logs.map((log) => (
                <div key={log.id} className="border-b border-slate-800/30 pb-1 last:border-0 leading-relaxed">
                  {log.text}
                </div>
              ))}
              <div ref={mobileLogsEndRef} />
            </div>
          </div>
        </div>
      )}

      {/* 8. FLYING CARDS CONTAINER */}
      {animatingCards.map(anim => {
        const styleOuter = {
          position: 'absolute',
          left: 0,
          top: 0,
          '--start-x': `${anim.startX}px`,
          '--start-y': `${anim.startY}px`,
          '--end-x': `${anim.endX}px`,
          '--end-y': `${anim.endY}px`,
          animationDuration: `${anim.duration}ms`,
          zIndex: 99999,
          pointerEvents: 'none'
        };

        const styleInner = {
          width: '100%',
          height: '100%',
          '--flight-start-scale': anim.startScale,
          '--flight-mid-scale': anim.midScale,
          '--flight-end-scale': anim.endScale,
          '--flight-start-rot': `${anim.startRot}deg`,
          '--flight-mid-rot': `${anim.midRot}deg`,
          '--flight-end-rot': `${anim.endRot}deg`,
          animationDuration: `${anim.duration}ms`
        };

        return (
          <div
            key={anim.id}
            className={`animate-card-flight-outer ${CARD_SIZE_CLASSES[anim.size || 'md']}`}
            style={styleOuter}
          >
            <div className="animate-card-flight-inner" style={styleInner}>
              <Card card={anim.card} hidden={anim.hidden} size={anim.size || 'md'} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
