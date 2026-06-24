/**
 * Game Engine for UNO Show 'Em No Mercy
 * Pure functional game state transitions.
 * Contains NO console.log statements.
 */

import { shuffleDeck, generateDeck } from './utils/deck.js';

// Helper: draw card from deck, handling reshuffling if deck is empty
function drawCardFromDeck(gameState) {
  if (gameState.deck.length === 0) {
    if (gameState.discardPile.length <= 1) {
      // Emergency fallback: generate a new deck and shuffle it if we literally run out of cards
      const newDeck = shuffleDeck(generateDeck());
      // Filter out cards currently in players' hands
      const cardsInHands = new Set();
      gameState.players.forEach(p => p.hand.forEach(c => cardsInHands.add(c.id)));
      gameState.deck = newDeck.filter(c => !cardsInHands.has(c.id));
    } else {
      const topCard = gameState.discardPile[gameState.discardPile.length - 1];
      const restDiscard = gameState.discardPile.slice(0, -1);
      gameState.deck = shuffleDeck(restDiscard);
      gameState.discardPile = [topCard];
    }
  }

  if (gameState.deck.length === 0) {
    throw new Error('No cards left in the deck to draw.');
  }

  return gameState.deck.pop();
}

// Get next active player index
export function getNextPlayerIndex(gameState, offset = 1) {
  const activePlayers = gameState.players.filter(p => !p.isEliminated && (!p.finishedRank || p.finishedRank === 0));
  if (activePlayers.length <= 1) return gameState.turnIndex;

  let nextIdx = gameState.turnIndex;
  for (let i = 0; i < offset; i++) {
    do {
      nextIdx = (nextIdx + gameState.direction + gameState.players.length) % gameState.players.length;
    } while (gameState.players[nextIdx].isEliminated || (gameState.players[nextIdx].finishedRank > 0));
  }
  return nextIdx;
}

// Helper to get hierarchy rank of draw cards in UNO No Mercy
export function getDrawRank(cardType) {
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

// Check if a card is playable
export function canPlayCard(card, topCard, currentColor, penaltyStack, hand = []) {
  // If there's an active penalty stack, player MUST stack an allowed draw card
  if (penaltyStack > 0) {
    const topType = topCard.type;
    if (topType === 'draw2') {
      return card.type === 'draw2' || card.type === 'draw4';
    } else if (topType === 'draw4' || topType === 'wild_reverse_draw4') {
      return card.type === 'draw4';
    } else if (topType === 'wild_draw6') {
      return card.type === 'wild_draw6' || card.type === 'wild_draw10';
    } else if (topType === 'wild_draw10') {
      return card.type === 'wild_draw10';
    }
    return false;
  }

  // Otherwise, normal play rules
  if (card.color === 'Wild') {
    // Wild cards should only be playable when the player has NO OTHER VALID PLAY available.
    const isNormalCardPlayable = (c) => {
      if (c.color === 'Wild') return false;
      return c.color === currentColor || c.value === topCard.value;
    };
    const hasOtherValidPlay = hand.some(c => c.id !== card.id && isNormalCardPlayable(c));
    return !hasOtherValidPlay;
  }

  return (
    card.color === currentColor ||
    card.value === topCard.value
  );
}

// Apply missing UNO penalties to any player who failed to call UNO before the next turn starts
export function applyMissingUnoPenalties(gameState) {
  const unoPenalizedPlayers = [];
  gameState.players.forEach(p => {
    if (p.needsUnoCall && p.hand.length === 1 && !p.hasCalledUno) {
      p.needsUnoCall = false;
      p.hasCalledUno = false;
      const cards = [];
      for (let i = 0; i < 2; i++) {
        const drawn = drawCardFromDeck(gameState);
        p.hand.push(drawn);
        cards.push(drawn);
      }
      unoPenalizedPlayers.push({
        userId: p.userId,
        username: p.username,
        socketId: p.socketId,
        cards
      });
    }
  });
  return unoPenalizedPlayers;
}

// Eliminate a player and check if game is over
export function checkMercyRule(gameState) {
  let changeOccurred = false;

  gameState.players.forEach(player => {
    if (!player.isEliminated && (!player.finishedRank || player.finishedRank === 0) && player.hand.length >= 25) {
      player.isEliminated = true;

      // Assign bottom rank
      const N = gameState.players.length;
      const eliminatedCount = gameState.players.filter(p => p.isEliminated).length;
      player.finishedRank = N - eliminatedCount + 1;

      // Discard their hand
      gameState.discardPile.unshift(...player.hand);
      player.hand = [];
      changeOccurred = true;
    }
  });

  const activePlayers = gameState.players.filter(p => !p.isEliminated && (!p.finishedRank || p.finishedRank === 0));
  if (activePlayers.length <= 1 && gameState.status !== 'finished') {
    gameState.status = 'finished';

    // Assign rank to the last remaining player
    if (activePlayers.length === 1) {
      const lastPlayer = activePlayers[0];
      const topFinishedCount = gameState.players.filter(p => p.finishedRank > 0 && !p.isEliminated).length;
      lastPlayer.finishedRank = topFinishedCount + 1;
    }

    // Set the overall winner to the player who finished 1st
    const winnerPlayer = gameState.players.find(p => p.finishedRank === 1);
    gameState.winner = winnerPlayer ? winnerPlayer.userId : null;

    changeOccurred = true;
  }

  return changeOccurred;
}

// Plays a card from hand
export function executePlayCard(gameState, playerIndex, cardId, chosenColor) {
  if (gameState.status === 'finished') {
    throw new Error('Game is already finished.');
  }
  if (gameState.turnIndex !== playerIndex) {
    throw new Error('It is not your turn.');
  }

  const unoPenalizedPlayers = applyMissingUnoPenalties(gameState);

  const player = gameState.players[playerIndex];
  if (player.isEliminated) {
    throw new Error('Eliminated players cannot play.');
  }

  const cardIdx = player.hand.findIndex(c => c.id === cardId);
  if (cardIdx === -1) {
    throw new Error('Card not found in hand.');
  }

  const card = player.hand[cardIdx];
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];

  if (!canPlayCard(card, topCard, gameState.currentColor, gameState.penaltyStack, player.hand)) {
    if (card.color === 'Wild') {
      throw new Error('Wild cards can only be played when no other valid card is available.');
    }
    throw new Error('Card is not playable.');
  }

  // 1. Remove card from hand and push to discard pile
  player.hand.splice(cardIdx, 1);
  gameState.discardPile.push(card);

  // Set current color and type/value
  gameState.currentColor = card.color === 'Wild' ? chosenColor : card.color;
  gameState.currentType = card.type;

  // Stacking logic
  if (card.drawValue > 0) {
    gameState.penaltyStack += card.drawValue;
  }

  // 2. Apply special card effects
  const opponentDrawInfo = applyCardEffects(gameState, card, playerIndex, chosenColor);

  // 3. Update UNO status
  if (player.hand.length === 1) {
    player.needsUnoCall = true;
    player.hasCalledUno = false;
  } else {
    player.needsUnoCall = false;
    player.hasCalledUno = false;
  }

  // 4. Check win condition: active player won by emptying hand
  if (player.hand.length === 0) {
    const topFinishedCount = gameState.players.filter(p => p.finishedRank > 0 && !p.isEliminated).length;
    player.finishedRank = topFinishedCount + 1;
  }

  checkMercyRule(gameState);

  // 5. Advance turn if game not finished and not waiting for color roulette
  if (gameState.status === 'playing') {
    const playedAndFinished = player.hand.length === 0;
    // If player finished, they cannot get another turn even with skip_everyone
    if (playedAndFinished || card.type !== 'skip_everyone') {
      const activePlayers = gameState.players.filter(p => !p.isEliminated && (!p.finishedRank || p.finishedRank === 0));
      const activePlayersCount = activePlayers.length;
      const isReverseAsSkip = (card.type === 'reverse' || card.type.includes('reverse')) && activePlayersCount === 2;
      const skipOffset = (card.type === 'skip' || isReverseAsSkip) ? 2 : 1;
      gameState.turnIndex = getNextPlayerIndex(gameState, skipOffset);
    }
  }

  gameState.hasDrawnThisTurn = false;
  return { gameState, unoPenalizedPlayers, opponentDrawInfo };
}

// Apply special effects of cards
function applyCardEffects(gameState, card, playerIndex, chosenColor) {
  const player = gameState.players[playerIndex];
  let opponentDrawInfo = null;

  // 1. Reverse direction
  if (card.type === 'reverse' || card.type === 'wild_reverse_draw4') {
    const activePlayers = gameState.players.filter(p => !p.isEliminated && (!p.finishedRank || p.finishedRank === 0));
    const activePlayersCount = activePlayers.length;

    // In 2-player game, Reverse acts as a Skip
    if (activePlayersCount === 2) {
      // We still reverse the direction
      gameState.direction *= -1;

      // If the card has a draw value, the opponent must draw immediately
      if (card.drawValue > 0 && gameState.penaltyStack > 0) {
        const opponentIdx = getNextPlayerIndex(gameState, 1);
        const opponent = gameState.players[opponentIdx];
        const cards = [];
        for (let i = 0; i < gameState.penaltyStack; i++) {
          cards.push(drawCardFromDeck(gameState));
        }
        opponent.hand.push(...cards);

        // Check mercy rule for the opponent
        if (opponent.hand.length >= 25) {
          opponent.isEliminated = true;
          const N = gameState.players.length;
          const eliminatedCount = gameState.players.filter(p => p.isEliminated).length;
          opponent.finishedRank = N - eliminatedCount + 1;
          gameState.discardPile.unshift(...opponent.hand);
          opponent.hand = [];
        }

        gameState.penaltyStack = 0;

        opponentDrawInfo = {
          userId: opponent.userId,
          username: opponent.username,
          socketId: opponent.socketId,
          cards,
          wasEliminated: opponent.isEliminated
        };
      }
    } else {
      gameState.direction *= -1;
    }
  }

  // 2. Discard All matching color
  if (card.type === 'discard_all') {
    // Discard all other cards matching this color in the player's hand
    const matchingCards = player.hand.filter(c => c.color === card.color);
    player.hand = player.hand.filter(c => c.color !== card.color);
    gameState.discardPile.unshift(...matchingCards);
  }

  // 3. Wild Color Roulette
  if (card.type === 'wild_color_roulette') {
    let nextPlayerIndex = getNextPlayerIndex(gameState, 1);
    const currentPlayer = gameState.players[playerIndex];
    let targetPlayer = gameState.players[nextPlayerIndex];

    if (targetPlayer && currentPlayer && targetPlayer.userId.toString() === currentPlayer.userId.toString()) {
      console.error('[Roulette Setup Error] Target player matches current player. Finding next valid active player.');
      let offset = 2;
      while (offset <= gameState.players.length) {
        const potentialIndex = getNextPlayerIndex(gameState, offset);
        const potentialPlayer = gameState.players[potentialIndex];
        if (potentialPlayer.userId.toString() !== currentPlayer.userId.toString() && !potentialPlayer.isEliminated && (!potentialPlayer.finishedRank || potentialPlayer.finishedRank === 0)) {
          nextPlayerIndex = potentialIndex;
          break;
        }
        offset++;
      }
    }

    gameState.status = 'roulette_waiting';
    gameState.actionData = {
      rouletteTargetIndex: nextPlayerIndex,
      chosenColor: chosenColor // The color the next player must search for
    };
  }

  return opponentDrawInfo;
}

/// Executes a draw action (either resolves a penalty stack or tougher drawing)
export function executeDraw(gameState, playerIndex) {
  if (gameState.status === 'finished') {
    throw new Error('Game is already finished.');
  }
  if (gameState.turnIndex !== playerIndex) {
    throw new Error('It is not your turn.');
  }

  const unoPenalizedPlayers = applyMissingUnoPenalties(gameState);

  const player = gameState.players[playerIndex];
  if (player.isEliminated) {
    throw new Error('Eliminated players cannot draw.');
  }

  // Case A: PASS ACTION (If the player already drew a playable card this turn, drawing again acts as a Pass)
  if (gameState.hasDrawnThisTurn && gameState.penaltyStack === 0) {
    gameState.hasDrawnThisTurn = false;
    if (gameState.status === 'playing') {
      gameState.turnIndex = getNextPlayerIndex(gameState, 1);
    }
    return { gameState, cardsDrawn: [], unoPenalizedPlayers };
  }

  // Case B: Resolving a penalty stack
  if (gameState.penaltyStack > 0) {
    const cardsDrawn = [];
    for (let i = 0; i < gameState.penaltyStack; i++) {
      cardsDrawn.push(drawCardFromDeck(gameState));
    }
    player.hand.push(...cardsDrawn);

    gameState.penaltyStack = 0;

    if (player.hand.length !== 1) {
      player.needsUnoCall = false;
      player.hasCalledUno = false;
    }

    checkMercyRule(gameState);

    // End turn of the player who drew the penalties
    if (gameState.status === 'playing') {
      gameState.turnIndex = getNextPlayerIndex(gameState, 1);
    }

    return { gameState, cardsDrawn, unoPenalizedPlayers };
  }

  // Case C: Normal draw action (Draws exactly 1 card when no active penalty exists)
  const cardsDrawn = [];
  const card = drawCardFromDeck(gameState);
  cardsDrawn.push(card);
  player.hand.push(card);

  if (player.hand.length !== 1) {
    player.needsUnoCall = false;
    player.hasCalledUno = false;
  }

  // Check Mercy Rule immediately in case the player exceeds 25 cards
  const wasEliminated = player.hand.length >= 25;
  if (wasEliminated) {
    checkMercyRule(gameState);
  }

  // Do NOT auto-play the card. Check if it is playable.
  const topCard = gameState.discardPile[gameState.discardPile.length - 1];
  const isPlayable = canPlayCard(card, topCard, gameState.currentColor, 0, player.hand) && !player.isEliminated;

  if (isPlayable) {
    // If playable, allow them to choose to play it or pass. Do NOT advance turn!
    gameState.hasDrawnThisTurn = true;
  } else {
    // If not playable, reset hasDrawnThisTurn and advance turn automatically
    gameState.hasDrawnThisTurn = false;
    if (gameState.status === 'playing') {
      gameState.turnIndex = getNextPlayerIndex(gameState, 1);
    }
  }

  return { gameState, cardsDrawn, unoPenalizedPlayers };
}

// Resolve Wild Color Roulette (Next player draws until color matches)
export function resolveColorRoulette(gameState) {
  if (gameState.status !== 'roulette_waiting' || !gameState.actionData) {
    return gameState;
  }

  const { rouletteTargetIndex, chosenColor } = gameState.actionData;
  let targetPlayer = gameState.players[rouletteTargetIndex];
  const currentPlayer = gameState.players[gameState.turnIndex];

  // Additional Safety Check
  if (targetPlayer && currentPlayer && targetPlayer.userId.toString() === currentPlayer.userId.toString()) {
    console.error('[Roulette Error] Target player matches current player. Finding next valid active player.');
    let offset = 1;
    let foundNext = false;
    while (offset <= gameState.players.length) {
      const potentialIndex = getNextPlayerIndex(gameState, offset);
      const potentialPlayer = gameState.players[potentialIndex];
      if (potentialPlayer.userId.toString() !== currentPlayer.userId.toString() && !potentialPlayer.isEliminated && (!potentialPlayer.finishedRank || potentialPlayer.finishedRank === 0)) {
        targetPlayer = potentialPlayer;
        gameState.actionData.rouletteTargetIndex = potentialIndex;
        foundNext = true;
        break;
      }
      offset++;
    }
    if (!foundNext) {
      // No other active player, cancel roulette
      gameState.status = 'playing';
      gameState.actionData = {};
      gameState.turnIndex = getNextPlayerIndex(gameState, 1);
      return gameState;
    }
  }

  if (!targetPlayer || targetPlayer.isEliminated) {
    gameState.status = 'playing';
    gameState.actionData = {};
    gameState.turnIndex = getNextPlayerIndex(gameState, 1);
    return gameState;
  }

  const cardsDrawn = [];
  let colorMatched = false;

  while (!colorMatched && !targetPlayer.isEliminated) {
    const card = drawCardFromDeck(gameState);
    cardsDrawn.push(card);
    targetPlayer.hand.push(card);

    if (targetPlayer.hand.length !== 1) {
      targetPlayer.needsUnoCall = false;
      targetPlayer.hasCalledUno = false;
    }

    if (targetPlayer.hand.length >= 25) {
      checkMercyRule(gameState);
      break;
    }

    if (card.color === chosenColor) {
      colorMatched = true;
    }
  }

  // Next player's turn is skipped (since roulette target drew, they don't get a normal turn)
  // Set turn index to the player AFTER the roulette target
  const finalTargetIdx = gameState.actionData?.rouletteTargetIndex !== undefined ? gameState.actionData.rouletteTargetIndex : rouletteTargetIndex;
  gameState.turnIndex = finalTargetIdx;
  gameState.turnIndex = getNextPlayerIndex(gameState, 1);

  // Clear roulette status
  gameState.status = 'playing';
  gameState.actionData = {};

  checkMercyRule(gameState);

  return { gameState, targetUsername: targetPlayer.username, cardsDrawn };
}

// Execute call UNO action
export function executeCallUno(gameState, playerIndex) {
  const player = gameState.players[playerIndex];
  if (!player) {
    throw new Error('Player not found.');
  }

  if (player.isEliminated) {
    throw new Error('Eliminated players cannot call UNO.');
  }

  if (player.hand.length !== 1) {
    throw new Error('UNO can only be called when you have exactly 1 card in hand.');
  }

  player.hasCalledUno = true;
  player.needsUnoCall = false;
  return gameState;
}
