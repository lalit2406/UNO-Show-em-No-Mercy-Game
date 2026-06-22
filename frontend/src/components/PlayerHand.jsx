import React, { useState, useEffect, useRef } from 'react';
import Card from './Card';

const getGlowColor = (color) => {
  switch (color) {
    case 'Red': return 'rgba(239, 68, 68, 0.5)';
    case 'Yellow': return 'rgba(250, 204, 21, 0.5)';
    case 'Green': return 'rgba(16, 185, 129, 0.5)';
    case 'Blue': return 'rgba(59, 130, 246, 0.5)';
    default: return 'rgba(168, 85, 247, 0.5)'; // purple/violet glow for Wild
  }
};

const COLOR_ORDER = {
  Blue: 1,
  Green: 2,
  Red: 3,
  Yellow: 4,
  Wild: 5
};

const TYPE_ORDER = {
  number: 1,
  skip: 2,
  reverse: 3,
  draw2: 4,
  skip_everyone: 5,
  discard_all: 6,
  wild: 7,
  wild_draw6: 8,
  wild_reverse_draw4: 9,
  wild_draw10: 10,
  wild_color_roulette: 11
};

const sortHand = (handList) => {
  if (!handList) return [];
  return [...handList]
    .map((card, originalIndex) => ({ card, originalIndex }))
    .sort((a, b) => {
      const colorA = COLOR_ORDER[a.card.color] || 99;
      const colorB = COLOR_ORDER[b.card.color] || 99;
      if (colorA !== colorB) {
        return colorA - colorB;
      }

      const typeA = TYPE_ORDER[a.card.type] || 99;
      const typeB = TYPE_ORDER[b.card.type] || 99;
      if (typeA !== typeB) {
        return typeA - typeB;
      }

      if (a.card.type === 'number' && b.card.type === 'number') {
        const valA = Number(a.card.value) || 0;
        const valB = Number(b.card.value) || 0;
        if (valA !== valB) {
          return valA - valB;
        }
      }

      return a.originalIndex - b.originalIndex;
    })
    .map(item => item.card);
};

export default function PlayerHand({
  hand,
  isMyTurn,
  playableCardIds,
  onPlayCard,
  direction,
  currentColor,
  deckCount,
  highlightedCardId,
  animatingCardIds = new Set()
}) {
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [localPlayingCardId, setLocalPlayingCardId] = useState(null);
  const [screenWidth, setScreenWidth] = useState(typeof window !== 'undefined' ? window.innerWidth : 1000);

  // Synchronize and clear localPlayingCardId when parent prop catches up or safety timeout fires
  useEffect(() => {
    if (localPlayingCardId) {
      if (animatingCardIds.has(localPlayingCardId) || !hand.some(c => c.id === localPlayingCardId)) {
        setLocalPlayingCardId(null);
      } else {
        const timer = setTimeout(() => {
          setLocalPlayingCardId(null);
        }, 1200);
        return () => clearTimeout(timer);
      }
    }
  }, [animatingCardIds, hand, localPlayingCardId]);

  const [visualHand, setVisualHand] = useState(() => hand || []);

  useEffect(() => {
    setVisualHand(prevVisual => {
      const newHand = [...hand];
      const incomingIds = new Set(hand.map(c => c.id));

      prevVisual.forEach((prevCard, index) => {
        const isAnimating = (animatingCardIds && animatingCardIds.has(prevCard.id)) || prevCard.id === localPlayingCardId;
        if (isAnimating && !incomingIds.has(prevCard.id)) {
          newHand.splice(index, 0, prevCard);
          incomingIds.add(prevCard.id);
        }
      });
      return newHand;
    });
  }, [hand, animatingCardIds, localPlayingCardId]);

  // Gesture State
  const [draggedCardId, setDraggedCardId] = useState(null);
  const [draggedStartRect, setDraggedStartRect] = useState(null);
  const [snappingCardId, setSnappingCardId] = useState(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [pendingDragCard, setPendingDragCard] = useState(null);
  const dragStart = useRef({ x: 0, y: 0, time: 0 });
  const snapTimeoutRef = useRef(null);
  const lastClickRef = useRef({ time: 0, cardId: null });

  // Clear timeout on unmount
  useEffect(() => {
    return () => {
      if (snapTimeoutRef.current) {
        clearTimeout(snapTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleResize = () => setScreenWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [pulsePlayable, setPulsePlayable] = useState(false);
  const prevIsMyTurn = useRef(isMyTurn);

  useEffect(() => {
    if (isMyTurn && !prevIsMyTurn.current) {
      setPulsePlayable(true);
      const timer = setTimeout(() => {
        setPulsePlayable(false);
      }, 500); // 500ms pulse duration
      return () => clearTimeout(timer);
    }
    prevIsMyTurn.current = isMyTurn;
  }, [isMyTurn]);

  // Gesture Move & End handlers attached to window
  useEffect(() => {
    if (!draggedCardId && !pendingDragCard) return;

    const handleDragMove = (e) => {
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;

      // Prevent viewport scrolling/bounce on mobile while dragging cards
      if (e.cancelable) {
        e.preventDefault();
      }

      if (pendingDragCard && !draggedCardId) {
        const deltaX = clientX - dragStart.current.x;
        const deltaY = clientY - dragStart.current.y;
        const distance = Math.hypot(deltaX, deltaY);

        // Threshold of 8px to start dragging
        if (distance > 8) {
          const el = document.getElementById(`hand-card-${pendingDragCard.id}`);
          if (el) {
            const rect = el.getBoundingClientRect();
            setDraggedStartRect({
              left: rect.left,
              top: rect.top,
              width: rect.width,
              height: rect.height
            });
            setDraggedCardId(pendingDragCard.id);
            setPendingDragCard(null);
          }
        }
        return;
      }

      if (!draggedCardId) return;

      let deltaX = clientX - dragStart.current.x;
      let deltaY = clientY - dragStart.current.y;

      // Prevent downward drag (card cannot go below hand area)
      if (deltaY > 0) {
        deltaY = 0;
      }

      // Restrict upward travel to center table / discard pile area height
      let totalDistX = 0;
      let totalDistY = 250; // fallback
      let ratio = 0;

      if (draggedStartRect) {
        const discardPileEl = document.getElementById('discard-pile');
        if (discardPileEl) {
          const discardRect = discardPileEl.getBoundingClientRect();
          const discardCenterX = discardRect.left + discardRect.width / 2;
          const discardCenterY = discardRect.top + discardRect.height / 2;
          const cardStartX = draggedStartRect.left + draggedStartRect.width / 2;
          const cardStartY = draggedStartRect.top + draggedStartRect.height / 2;

          totalDistX = discardCenterX - cardStartX;
          totalDistY = Math.max(100, cardStartY - discardCenterY);
          ratio = Math.min(1, Math.max(0, -deltaY / totalDistY));
        }
      }

      const minY = -totalDistY;
      if (deltaY < minY) {
        deltaY = minY;
      }

      // Guide the card X coordinate diagonally toward the discard pile center
      const diagonalOffsetX = ratio * totalDistX;
      // Allow organic horizontal wiggling (±50px) around the diagonal guide path
      const wiggle = deltaX - diagonalOffsetX;
      const clampedWiggle = Math.max(-50, Math.min(50, wiggle));
      const finalDeltaX = diagonalOffsetX + clampedWiggle;

      setDragOffset({ x: finalDeltaX, y: deltaY });
    };

    const handleDragEnd = (e) => {
      setPendingDragCard(null);
      setHoveredCardId(null); // Clear hover/touch states instantly on release

      if (!draggedCardId) {
        return;
      }

      let clientX, clientY;
      if (e.changedTouches) {
        clientX = e.changedTouches[0].clientX;
        clientY = e.changedTouches[0].clientY;
      } else {
        clientX = e.clientX;
        clientY = e.clientY;
      }

      const deltaY = clientY - dragStart.current.y;
      const elapsedTime = Date.now() - dragStart.current.time;

      // Swipe velocity detection (pixels per millisecond, upward is positive)
      const velocityY = -deltaY / Math.max(1, elapsedTime);

      const card = hand.find(c => c.id === draggedCardId);
      const currentDraggedId = draggedCardId;

      if (card) {
        // Compute maximum upward distance dynamically
        let totalDistX = 0;
        let totalDistY = 250; // fallback
        if (draggedStartRect) {
          const discardPileEl = document.getElementById('discard-pile');
          if (discardPileEl) {
            const discardRect = discardPileEl.getBoundingClientRect();
            const discardCenterX = discardRect.left + discardRect.width / 2;
            const discardCenterY = discardRect.top + discardRect.height / 2;
            const cardStartX = draggedStartRect.left + draggedStartRect.width / 2;
            const cardStartY = draggedStartRect.top + draggedStartRect.height / 2;

            totalDistX = discardCenterX - cardStartX;
            totalDistY = Math.max(100, cardStartY - discardCenterY);
          }
        }

        // Play threshold: 45% of the distance to the center table, or fast flick upward
        const threshold = totalDistY * 0.45;
        const isDraggedPastThreshold = -deltaY >= threshold;
        const isUpwardFlick = deltaY < -60 && velocityY > 0.5;

        if (isDraggedPastThreshold || isUpwardFlick) {
          // Calculate final page-relative release position of the card
          const releaseX = draggedStartRect.left + dragOffset.x + window.scrollX;
          const releaseY = draggedStartRect.top + dragOffset.y + window.scrollY;

          setLocalPlayingCardId(card.id);
          setDraggedCardId(null);
          setDraggedStartRect(null);
          setDragOffset({ x: 0, y: 0 });
          onPlayCard(card, { x: releaseX, y: releaseY });
        } else {
          // Snap back animation
          setSnappingCardId(currentDraggedId);
          setDraggedCardId(null);
          setDragOffset({ x: 0, y: 0 });

          if (snapTimeoutRef.current) {
            clearTimeout(snapTimeoutRef.current);
          }
          snapTimeoutRef.current = setTimeout(() => {
            setSnappingCardId(prev => {
              if (prev === currentDraggedId) {
                setDraggedStartRect(null);
                return null;
              }
              return prev;
            });
            snapTimeoutRef.current = null;
          }, 250);
        }
      } else {
        setDraggedCardId(null);
        setDraggedStartRect(null);
        setDragOffset({ x: 0, y: 0 });
      }
    };

    window.addEventListener('mousemove', handleDragMove);
    window.addEventListener('touchmove', handleDragMove, { passive: false });
    window.addEventListener('mouseup', handleDragEnd);
    window.addEventListener('touchend', handleDragEnd);
    window.addEventListener('touchcancel', handleDragEnd);

    return () => {
      window.removeEventListener('mousemove', handleDragMove);
      window.removeEventListener('touchmove', handleDragMove);
      window.removeEventListener('mouseup', handleDragEnd);
      window.removeEventListener('touchend', handleDragEnd);
      window.removeEventListener('touchcancel', handleDragEnd);
    };
  }, [draggedCardId, pendingDragCard, draggedStartRect, hand, onPlayCard]);

  const handleDragStart = (e, card) => {
    const isPlayable = isMyTurn && playableCardIds.has(card.id);
    if (!isPlayable) return; // Non-playable cards are not draggable

    setHoveredCardId(card.id); // Set hover/touch state immediately on touch/drag start

    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;

    dragStart.current = {
      x: clientX,
      y: clientY,
      time: Date.now()
    };

    if (snapTimeoutRef.current) {
      clearTimeout(snapTimeoutRef.current);
      snapTimeoutRef.current = null;
    }
    setSnappingCardId(null);

    setPendingDragCard(card);

    if (!e.touches) {
      e.preventDefault();
    }
  };

  // Unified Double Click / Double Tap play handler
  const handleCardClickOrTap = (card) => {
    const isPlayable = isMyTurn && playableCardIds.has(card.id);
    if (!isPlayable) {
      return;
    }

    const now = Date.now();
    const isSameCard = lastClickRef.current.cardId === card.id;
    const isDouble = isSameCard && (now - lastClickRef.current.time < 350);

    if (isDouble) {
      // Double tap/click plays card instantly
      setLocalPlayingCardId(card.id);
      onPlayCard(card);
      lastClickRef.current = { time: 0, cardId: null };
    } else {
      // Single click highlights
      lastClickRef.current = { time: now, cardId: card.id };
    }
  };

  const cardWidth = screenWidth < 640 ? 88 : screenWidth < 768 ? 112 : 128;
  const padding = screenWidth < 640 ? 24 : 48;
  const maxHandWidth = Math.min(screenWidth - padding, 1100);

  // Sort the visualHand (which retains played/animating cards) by color and value
  const sortedHand = sortHand(visualHand);

  // Keep all visualHand cards in visibleHand (no filtering them out completely, so they occupy their spacing slots)
  const visibleHand = sortedHand;
  const N = visibleHand.length;

  // Spacing algorithm (distance from card start to next card start)
  let spacing = 0;
  if (N > 1) {
    const defaultSpacing = screenWidth < 640 ? cardWidth * 0.55 : cardWidth * 0.65;
    const minSpacing = screenWidth < 640 ? 14 : 20;
    const maxSpacingPossible = (maxHandWidth - cardWidth) / (N - 1);
    spacing = Math.max(minSpacing, Math.min(defaultSpacing, maxSpacingPossible));
  } else {
    spacing = 0;
  }

  const totalHandWidth = N > 0 ? cardWidth + (N - 1) * spacing : 0;
  const isOverflowing = totalHandWidth > maxHandWidth;

  return (
    <div className="w-full flex flex-col items-center bg-slate-900 border-t-2 border-slate-700/50 p-2 pb-4 sm:p-4 sm:pb-6 gap-2 sm:gap-3 select-none">
      {/* Hand Info Bar Row */}
      <div className="w-full max-w-6xl flex justify-center items-center px-4">
        {/* Center: Match Stats Info Bar */}
        <div className="flex items-center gap-3 bg-slate-950/40 border border-slate-800/60 rounded-full py-1.5 px-5 shadow-inner shadow-black/20 text-xs font-bold text-slate-300">
          <div className="flex items-center gap-1">
            <span className="text-slate-400 text-xs">↻</span>
            <span className="text-yellow-400 text-[10px] sm:text-xs">
              {direction === 1 ? 'Clockwise' : 'Counter'}
            </span>
          </div>
          
          <span className="text-slate-800 select-none">|</span>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            <span className="text-slate-400">🎴</span>
            <span className="text-slate-200">{deckCount}<span className="hidden sm:inline"> Cards Left</span></span>
          </div>

          <span className="text-slate-800 select-none">|</span>

          <div className="flex items-center gap-1 text-[10px] sm:text-xs">
            <span className="text-slate-400">✋</span>
            <span className="text-slate-200">
              {hand.length} <span className="text-slate-400 font-medium">{hand.length === 1 ? 'Card' : 'Cards'} in Hand</span>
            </span>
          </div>

          {hand.length >= 20 && (
            <>
              <span className="text-slate-800 select-none">|</span>
              <span className="animate-pulse bg-amber-500 text-black font-black text-[10px] px-2.5 py-0.5 rounded-full">
                ⚠️ MERCY RISK ({hand.length}/25)
              </span>
            </>
          )}
        </div>
      </div>

      {/* Cards Overlay Container */}
      <div className={`w-full overflow-x-auto scrollbar-thin scrollbar-thumb-slate-800 py-3 sm:py-4 px-3 sm:px-6 flex items-center ${isOverflowing ? 'justify-start' : 'justify-center'}`}>
        <div
          id="player-hand-container"
          className="relative h-40 sm:h-56 flex items-center transition-all duration-300 touch-pan-x"
          style={{ width: N > 0 ? `${totalHandWidth}px` : 'auto' }}
        >
          {visibleHand.map((card, index) => {
            const isPlayable = isMyTurn && playableCardIds.has(card.id);
            const isHovered = hoveredCardId === card.id;
            const isBeingDragged = draggedCardId === card.id;
            const isSnapping = snappingCardId === card.id;
            const isDraggedOrSnapping = (isBeingDragged || isSnapping) && draggedStartRect !== null;

            const isAnimating = (animatingCardIds && animatingCardIds.has(card.id)) || card.id === localPlayingCardId;

            // All cards stay on the same baseline and translate horizontally to their sorted slot. Hover/touch scales playable cards to 1.03.
            let transformStr = '';
            if (isDraggedOrSnapping) {
              transformStr = `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) scale(${isBeingDragged ? 1.04 : 1.0}) rotate(${isBeingDragged ? dragOffset.x * 0.08 : 0}deg)`;
            } else {
              const hoverScale = (isPlayable && isHovered) ? 1.03 : 1.0;
              transformStr = `translate3d(${index * spacing}px, 0px, 0) scale(${hoverScale})`;
            }

            const glowColor = getGlowColor(card.color);
            const cardStyle = {
              position: isDraggedOrSnapping ? 'fixed' : 'absolute',
              left: isDraggedOrSnapping ? `${draggedStartRect.left}px` : '0px',
              top: isDraggedOrSnapping ? `${draggedStartRect.top}px` : '0px',
              width: isDraggedOrSnapping ? `${draggedStartRect.width}px` : 'auto',
              height: isDraggedOrSnapping ? `${draggedStartRect.height}px` : 'auto',
              zIndex: isBeingDragged ? 99999 : isSnapping ? 99998 : (isHovered && isPlayable ? 100 : index + 1),
              transform: transformStr,
              transition: isBeingDragged
                ? 'none'
                : 'transform 0.18s cubic-bezier(0.25, 0.8, 0.25, 1), z-index 0s 0.18s',
              cursor: isPlayable ? (isBeingDragged ? 'grabbing' : 'pointer') : 'default',
              touchAction: isPlayable ? 'none' : 'auto',
              boxShadow: isBeingDragged
                ? `0 25px 30px -5px rgba(0, 0, 0, 0.5), 0 0 25px 6px ${glowColor}`
                : isSnapping
                ? `0 15px 20px -10px rgba(0, 0, 0, 0.4), 0 0 15px 2px ${glowColor}`
                : 'none',
              pointerEvents: isAnimating ? 'none' : (isBeingDragged ? 'none' : 'auto'),
              opacity: isAnimating ? 0 : 1,
              visibility: isAnimating ? 'hidden' : 'visible'
            };

            return (
              <div
                key={card.id}
                id={`hand-card-${card.id}`}
                onMouseEnter={() => !draggedCardId && !snappingCardId && setHoveredCardId(card.id)}
                onMouseLeave={() => setHoveredCardId(null)}
                onMouseDown={(e) => handleDragStart(e, card)}
                onTouchStart={(e) => handleDragStart(e, card)}
                onClick={() => handleCardClickOrTap(card)}
                style={cardStyle}
              >
                <Card
                  card={card}
                  isPlayable={isPlayable}
                  isHighlighted={highlightedCardId === card.id}
                  isMyTurn={isMyTurn}
                  isHandCard={true}
                  isHovered={isHovered}
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
