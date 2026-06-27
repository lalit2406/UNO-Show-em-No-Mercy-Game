import Room from '../models/Room.js';
import GameState from '../models/GameState.js';
import User from '../models/User.js';
import { generateDeck, shuffleDeck } from '../utils/deck.js';
import {
  executePlayCard,
  executeDraw,
  resolveColorRoulette,
  checkMercyRule,
  getNextPlayerIndex,
  executeCallUno
} from '../gameEngine.js';
import { logger } from '../utils/logger.js';

// Helper: Sanitize game state for a specific user
function sanitizeGameState(gameState, userId) {
  const stateObj = gameState.toObject ? gameState.toObject() : JSON.parse(JSON.stringify(gameState));

  stateObj.deckCount = stateObj.deck.length;
  delete stateObj.deck;

  stateObj.players = stateObj.players.map(player => {
    const playerUserId = player.userId._id ? player.userId._id.toString() : player.userId.toString();
    const isSelf = playerUserId === userId.toString();

    if (!isSelf) {
      player.handCount = player.hand.length;
      delete player.hand;
    } else {
      player.handCount = player.hand.length;
    }
    return player;
  });

  return stateObj;
}

// Helper: Sync state to all active players in a room
async function syncGameState(io, roomCode, roomId) {
  const gameState = await GameState.findOne({ roomId });
  if (!gameState) return;

  const room = await Room.findById(roomId);
  const hostId = room ? room.host.toString() : null;

  const sockets = await io.in(roomCode).fetchSockets();
  sockets.forEach(socket => {
    if (socket.user && socket.user.id) {
      const sanitized = sanitizeGameState(gameState, socket.user.id);
      sanitized.hostId = hostId;
      socket.emit('game_state_sync', sanitized);
    }
  });
}

const turnTimeouts = new Map();

function clearRoomTimeout(roomId) {
  const key = roomId.toString();
  if (turnTimeouts.has(key)) {
    clearTimeout(turnTimeouts.get(key).timeoutId);
    turnTimeouts.delete(key);
  }
}

async function checkAndManageTurnTimeout(io, roomCode, roomId) {
  try {
    const room = await Room.findById(roomId);
    if (!room || room.status !== 'active') {
      clearRoomTimeout(roomId);
      return;
    }

    const gameState = await GameState.findOne({ roomId });
    if (!gameState || gameState.status !== 'playing') {
      clearRoomTimeout(roomId);
      return;
    }

    const currentPlayer = gameState.players[gameState.turnIndex];
    if (!currentPlayer) return;

    const isOffline = !currentPlayer.socketId || currentPlayer.status === 'offline';

    if (!isOffline) {
      clearRoomTimeout(roomId);
      return;
    }

    const key = roomId.toString();
    const activeTimeout = turnTimeouts.get(key);
    if (activeTimeout && activeTimeout.userId === currentPlayer.userId.toString()) {
      return;
    }

    if (activeTimeout) {
      clearTimeout(activeTimeout.timeoutId);
    }

    io.in(roomCode).emit('log_message', { text: `Waiting for ${currentPlayer.username} to reconnect...` });

    const timeoutId = setTimeout(async () => {
      try {
        await handleTurnTimeoutExpiry(io, roomCode, roomId, currentPlayer.userId);
      } catch (err) {
        logger.error('Error in turn timeout expiry:', err);
      }
    }, 20000);

    turnTimeouts.set(key, {
      timeoutId,
      userId: currentPlayer.userId.toString(),
      expiresAt: Date.now() + 20000
    });

  } catch (err) {
    logger.error('Error in checkAndManageTurnTimeout:', err);
  }
}

async function handleTurnTimeoutExpiry(io, roomCode, roomId, playerUserId) {
  const room = await Room.findById(roomId);
  if (!room || room.status !== 'active') return;

  const gameState = await GameState.findOne({ roomId });
  if (!gameState || gameState.status !== 'playing') return;

  const currentPlayer = gameState.players[gameState.turnIndex];
  if (!currentPlayer || currentPlayer.userId.toString() !== playerUserId.toString()) return;

  const activeStack = gameState.penaltyStack;
  const activeRouletteStack = gameState.pendingRouletteStack || 0;
  const previousRanks = new Map(gameState.players.map(p => [p.userId.toString(), p.finishedRank || 0]));
  const eliminatedBefore = new Set(gameState.players.filter(p => p.isEliminated).map(p => p.userId.toString()));

  const { cardsDrawn, unoPenalizedPlayers, rouletteResolutions } = executeDraw(gameState, gameState.turnIndex);

  if (gameState.hasDrawnThisTurn) {
    gameState.hasDrawnThisTurn = false;
    gameState.turnIndex = getNextPlayerIndex(gameState, 1);
  }

  gameState.players.forEach(p => {
    const prev = previousRanks.get(p.userId.toString()) || 0;
    if (p.finishedRank > 0 && prev === 0) {
      io.in(roomCode).emit('player_finished', {
        username: p.username,
        rank: p.finishedRank
      });
    }
  });

  if (gameState.status === 'finished') {
    room.status = 'finished';
    await room.save();

    const winner = await User.findById(gameState.winner);
    if (winner && !winner.isGuest) {
      winner.stats.gamesWon += 1;
      await winner.save();
    }

    for (const p of gameState.players) {
      const user = await User.findById(p.userId);
      if (user && !user.isGuest) {
        user.stats.gamesPlayed += 1;
        if (p.isEliminated) {
          user.stats.eliminations += 1;
        }
        await user.save();
      }
    }

    await gameState.save();
    io.in(roomCode).emit('game_over', { winnerUsername: winner ? winner.username : 'Guest' });
  } else {
    await gameState.save();
  }

  turnTimeouts.delete(roomId.toString());

  io.in(roomCode).emit('cards_drawn', {
    username: currentPlayer.username,
    count: cardsDrawn.length,
    isPenalty: activeStack > 0 || activeRouletteStack > 0,
    wasEliminated: currentPlayer.isEliminated
  });

  if (rouletteResolutions && rouletteResolutions.length > 0) {
    rouletteResolutions.forEach(res => {
      io.in(roomCode).emit('roulette_resolved', {
        username: currentPlayer.username,
        color: res.color,
        drawCount: res.drawCount
      });
    });
  }

  gameState.players.forEach(p => {
    if (p.isEliminated && !eliminatedBefore.has(p.userId.toString())) {
      io.in(roomCode).emit('player_eliminated', { username: p.username });
    }
  });

  await syncGameState(io, roomCode, room._id);

  await checkAndManageTurnTimeout(io, roomCode, room._id);
}


// Generate a unique room code
async function generateUniqueRoomCode() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let attempts = 0;
  while (attempts < 100) {
    let code = '';
    for (let i = 0; i < 4; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
    const existing = await Room.findOne({ roomCode: code, status: 'lobby' });
    if (!existing) return code;
    attempts++;
  }
  throw new Error('Failed to generate unique room code.');
}

export default function registerGameHandlers(io, socket) {
  // 1. Create Room
  socket.on('create_room', async () => {
    try {
      const roomCode = await generateUniqueRoomCode();
      const room = new Room({
        roomCode,
        host: socket.user.id,
        players: [{
          userId: socket.user.id,
          username: socket.user.username,
          socketId: socket.id,
          isReady: true // Host is ready by default
        }]
      });

      await room.save();
      socket.join(roomCode);

      socket.emit('room_updated', room);
    } catch (err) {
      logger.error('Error creating room', err);
      socket.emit('error_message', 'Could not create room.');
    }
  });

  // 2. Join Room
  socket.on('join_room', async ({ roomCode, username }) => {
    try {
      const upperCode = roomCode.trim().toUpperCase();
      const userToJoin = username ? username.trim() : socket.user.username;
      
      const room = await Room.findOne({ roomCode: upperCode, status: { $in: ['lobby', 'active'] } });

      if (!room) {
        return socket.emit('error_message', 'Room not found.');
      }

      const existingPlayer = room.players.find(p => p.username.toLowerCase() === userToJoin.toLowerCase());

      if (room.status === 'active') {
        if (!existingPlayer) {
          return socket.emit('error_message', 'Game already started.');
        }
        if (existingPlayer.status === 'online' && existingPlayer.socketId) {
          return socket.emit('error_message', 'This player is already online in the match.');
        }
      }

      if (!existingPlayer && room.players.length >= room.maxPlayers) {
        return socket.emit('error_message', 'Lobby is full.');
      }

      if (!existingPlayer) {
        room.players.push({
          userId: socket.user.id,
          username: userToJoin,
          socketId: socket.id,
          isReady: false,
          status: 'online'
        });
      } else {
        // Adopt the identity of the existing player (critical for re-mapping their socket user to their original userId)
        socket.user.id = existingPlayer.userId.toString();
        existingPlayer.socketId = socket.id;
        existingPlayer.status = 'online';
      }

      await room.save();
      socket.join(upperCode);

      // Print reconnection and session restoration logs if active
      if (room.status === 'active' && existingPlayer) {
        const gameState = await GameState.findOne({ roomId: room._id });
        if (gameState) {
          const gamePlayer = gameState.players.find(p => p.userId.toString() === existingPlayer.userId.toString());
          if (gamePlayer) {
            gamePlayer.socketId = socket.id;
            gamePlayer.status = 'online';
            await gameState.save();

            console.log(`[MANUAL REJOIN]\nusername: ${existingPlayer.username}\nroom: ${room.roomCode}`);
            const position = gameState.players.findIndex(p => p.userId.toString() === existingPlayer.userId.toString());
            console.log(`[PLAYER RESTORED]\ncards: ${gamePlayer.hand.length}\nseat: ${position}\nturn: ${gameState.turnIndex}`);
          }
        }
      }

      io.in(upperCode).emit('room_updated', room);
      
      if (room.status === 'active') {
        await syncGameState(io, room.roomCode, room._id);
        // Clear turn timeout if active for this player
        await checkAndManageTurnTimeout(io, room.roomCode, room._id);
      }
    } catch (err) {
      logger.error('Error joining room', err);
      socket.emit('error_message', 'Could not join room.');
    }
  });

  // 3. Toggle Ready Status
  socket.on('toggle_ready', async () => {
    try {
      const room = await Room.findOne({ 'players.userId': socket.user.id, status: 'lobby' });
      if (!room) return;

      const player = room.players.find(p => p.userId.toString() === socket.user.id.toString());
      if (player && player.userId.toString() !== room.host.toString()) {
        player.isReady = !player.isReady;
        await room.save();
        io.in(room.roomCode).emit('room_updated', room);
      }
    } catch (err) {
      logger.error('Error toggling ready', err);
    }
  });

  // 4. Start Game (Host only)
  socket.on('start_game', async () => {
    try {
      const room = await Room.findOne({ host: socket.user.id, status: 'lobby' });
      if (!room) {
        return socket.emit('error_message', 'Only the host can start the game.');
      }

      if (room.players.length < 2) {
        return socket.emit('error_message', 'Need at least 2 players to start.');
      }

      const unreadyPlayers = room.players.filter(p => !p.isReady);
      if (unreadyPlayers.length > 0) {
        return socket.emit('error_message', 'Not all players are ready.');
      }

      // Generate & shuffle deck
      let deck = shuffleDeck(generateDeck());

      // Deal 7 cards to each player
      const playersState = room.players.map(p => {
        const hand = [];
        for (let i = 0; i < 7; i++) {
          hand.push(deck.pop());
        }
        return {
          userId: p.userId,
          username: p.username,
          hand,
          isEliminated: false,
          socketId: p.socketId
        };
      });

      // Find first non-wild, non-action number card for starting card
      let starterCardIdx = deck.findIndex(card => card.color !== 'Wild' && card.type === 'number');
      if (starterCardIdx === -1) {
        starterCardIdx = deck.findIndex(card => card.color !== 'Wild');
      }
      const startingCard = deck.splice(starterCardIdx, 1)[0];

      const gameState = new GameState({
        roomId: room._id,
        deck,
        discardPile: [startingCard],
        players: playersState,
        turnIndex: 0,
        direction: 1,
        currentColor: startingCard.color,
        currentType: startingCard.type,
        penaltyStack: 0,
        status: 'playing'
      });

      await gameState.save();

      room.status = 'active';
      room.gameState = gameState._id;
      await room.save();

      io.in(room.roomCode).emit('game_started', {
        roomId: room._id,
        roomCode: room.roomCode
      });

      await syncGameState(io, room.roomCode, room._id);
      await checkAndManageTurnTimeout(io, room.roomCode, room._id);
    } catch (err) {
      logger.error('Error starting game', err);
      socket.emit('error_message', 'Failed to start game.');
    }
  });

  // 5. Play Card
  socket.on('play_card', async ({ cardId, chosenColor }) => {
    try {
      const room = await Room.findOne({ 'players.userId': socket.user.id, status: 'active' });
      if (!room) return;

      const gameState = await GameState.findOne({ roomId: room._id });
      if (!gameState || gameState.status === 'finished') return;

      const playerIndex = gameState.players.findIndex(p => p.userId.toString() === socket.user.id.toString());
      if (playerIndex !== gameState.turnIndex) {
        return socket.emit('error_message', 'It is not your turn.');
      }

      const playedCard = gameState.players[playerIndex].hand.find(c => c.id === cardId);
      if (!playedCard) {
        return socket.emit('error_message', 'Card not found in hand.');
      }

      const previousRanks = new Map(gameState.players.map(p => [p.userId.toString(), p.finishedRank || 0]));
      const eliminatedBefore = new Set(gameState.players.filter(p => p.isEliminated).map(p => p.userId.toString()));

      // Count active players BEFORE playing the card
      const activePlayersBefore = gameState.players.filter(p => !p.isEliminated && (!p.finishedRank || p.finishedRank === 0));
      const activePlayersCountBefore = activePlayersBefore.length;
      const wasReverseCard = playedCard.type === 'reverse' || playedCard.type.includes('reverse');
      const reverseAsSkip = wasReverseCard && activePlayersCountBefore === 2;

      // Execute card play in engine
      const { unoPenalizedPlayers, opponentDrawInfo } = executePlayCard(gameState, playerIndex, cardId, chosenColor);

      // Handle UNO penalty broadcast
      if (unoPenalizedPlayers && unoPenalizedPlayers.length > 0) {
        unoPenalizedPlayers.forEach(p => {
          const targetSocket = io.sockets.sockets.get(p.socketId);
          if (targetSocket) {
            targetSocket.emit('cards_drawn_private', { cards: p.cards, isPenalty: true });
          }
          io.in(room.roomCode).emit('cards_drawn', {
            username: p.username,
            count: 2,
            isPenalty: true,
            wasEliminated: false
          });
          io.in(room.roomCode).emit('uno_penalty', {
            username: p.username
          });
        });
      }

      // Handle Opponent Auto Draw from reverse-as-skip draw cards
      if (opponentDrawInfo) {
        const targetSocket = io.sockets.sockets.get(opponentDrawInfo.socketId);
        if (targetSocket) {
          targetSocket.emit('cards_drawn_private', { cards: opponentDrawInfo.cards, isPenalty: true });
        }
        io.in(room.roomCode).emit('cards_drawn', {
          username: opponentDrawInfo.username,
          count: opponentDrawInfo.cards.length,
          isPenalty: true,
          wasEliminated: opponentDrawInfo.wasEliminated
        });
      }

      // Handle Wild Color Roulette resolution immediately if triggered
      if (gameState.status === 'roulette_waiting') {
        const result = resolveColorRoulette(gameState);
        if (result && result.cardsDrawn) {
          io.in(room.roomCode).emit('roulette_resolved', {
            username: result.targetUsername,
            color: gameState.currentColor,
            drawCount: result.cardsDrawn.length
          });
        }
      }

      // Check for new finishes/ranks and emit events
      gameState.players.forEach(p => {
        const prev = previousRanks.get(p.userId.toString()) || 0;
        if (p.finishedRank > 0 && prev === 0) {
          io.in(room.roomCode).emit('player_finished', {
            username: p.username,
            rank: p.finishedRank
          });
        }
      });

      // Check if game has ended
      if (gameState.status === 'finished') {
        room.status = 'finished';
        await room.save();

        const winner = await User.findById(gameState.winner);
        if (winner && !winner.isGuest) {
          winner.stats.gamesWon += 1;
          await winner.save();
        }

        // Update gamesPlayed stats for all non-guest players
        for (const p of gameState.players) {
          const user = await User.findById(p.userId);
          if (user && !user.isGuest) {
            user.stats.gamesPlayed += 1;
            if (p.isEliminated) {
              user.stats.eliminations += 1;
            }
            await user.save();
          }
        }

        await gameState.save();
        io.in(room.roomCode).emit('game_over', { winnerUsername: winner ? winner.username : 'Guest' });
      } else {
        await gameState.save();
      }

      // Notify others of action
      io.in(room.roomCode).emit('card_played', {
        username: socket.user.username,
        card: playedCard,
        currentColor: gameState.currentColor,
        reverseAsSkip
      });

      // Handle newly eliminated players
      gameState.players.forEach(p => {
        if (p.isEliminated && !eliminatedBefore.has(p.userId.toString())) {
          io.in(room.roomCode).emit('player_eliminated', { username: p.username });
        }
      });

      // Synchronize modified states to all players securely
      await syncGameState(io, room.roomCode, room._id);
      await checkAndManageTurnTimeout(io, room.roomCode, room._id);
    } catch (err) {
      logger.error('Error playing card', err);
      socket.emit('error_message', err.message || 'Failed to play card.');
    }
  });

  // 6. Draw Card
  socket.on('draw_card', async () => {
    try {
      const room = await Room.findOne({ 'players.userId': socket.user.id, status: 'active' });
      if (!room) return;

      const gameState = await GameState.findOne({ roomId: room._id });
      if (!gameState || gameState.status === 'finished') return;

      const playerIndex = gameState.players.findIndex(p => p.userId.toString() === socket.user.id.toString());
      if (playerIndex !== gameState.turnIndex) {
        return socket.emit('error_message', 'It is not your turn.');
      }

      const previousRanks = new Map(gameState.players.map(p => [p.userId.toString(), p.finishedRank || 0]));
      const activeStack = gameState.penaltyStack;
      const activeRouletteStack = gameState.pendingRouletteStack || 0;
      const eliminatedBefore = new Set(gameState.players.filter(p => p.isEliminated).map(p => p.userId.toString()));

      // Execute draw operation (handles tougher drawing or stack drawing)
      const { cardsDrawn, unoPenalizedPlayers, rouletteResolutions } = executeDraw(gameState, playerIndex);

      const drawnCount = cardsDrawn.length;
      const player = gameState.players[playerIndex];

      // Handle UNO penalty broadcast
      if (unoPenalizedPlayers && unoPenalizedPlayers.length > 0) {
        unoPenalizedPlayers.forEach(p => {
          const targetSocket = io.sockets.sockets.get(p.socketId);
          if (targetSocket) {
            targetSocket.emit('cards_drawn_private', { cards: p.cards, isPenalty: true });
          }
          io.in(room.roomCode).emit('cards_drawn', {
            username: p.username,
            count: 2,
            isPenalty: true,
            wasEliminated: false
          });
          io.in(room.roomCode).emit('uno_penalty', {
            username: p.username
          });
        });
      }

      // Check for new finishes/ranks and emit events
      gameState.players.forEach(p => {
        const prev = previousRanks.get(p.userId.toString()) || 0;
        if (p.finishedRank > 0 && prev === 0) {
          io.in(room.roomCode).emit('player_finished', {
            username: p.username,
            rank: p.finishedRank
          });
        }
      });

      if (gameState.status === 'finished') {
        room.status = 'finished';
        await room.save();

        const winner = await User.findById(gameState.winner);
        if (winner && !winner.isGuest) {
          winner.stats.gamesWon += 1;
          await winner.save();
        }

        // Update gamesPlayed stats for all non-guest players
        for (const p of gameState.players) {
          const user = await User.findById(p.userId);
          if (user && !user.isGuest) {
            user.stats.gamesPlayed += 1;
            if (p.isEliminated) {
              user.stats.eliminations += 1;
            }
            await user.save();
          }
        }

        await gameState.save();
        io.in(room.roomCode).emit('game_over', { winnerUsername: winner ? winner.username : 'Guest' });
      } else {
        await gameState.save();
      }

      // Notify client who drew cards about the cards they got
      socket.emit('cards_drawn_private', { cards: cardsDrawn, isPenalty: activeStack > 0 || activeRouletteStack > 0 });

      // Notify other room players about drawing action
      io.in(room.roomCode).emit('cards_drawn', {
        username: socket.user.username,
        count: drawnCount,
        isPenalty: activeStack > 0 || activeRouletteStack > 0,
        wasEliminated: player.isEliminated
      });

      if (rouletteResolutions && rouletteResolutions.length > 0) {
        rouletteResolutions.forEach(res => {
          io.in(room.roomCode).emit('roulette_resolved', {
            username: player.username,
            color: res.color,
            drawCount: res.drawCount
          });
        });
      }

      // Handle newly eliminated players
      gameState.players.forEach(p => {
        if (p.isEliminated && !eliminatedBefore.has(p.userId.toString())) {
          io.in(room.roomCode).emit('player_eliminated', { username: p.username });
        }
      });

      await syncGameState(io, room.roomCode, room._id);
      await checkAndManageTurnTimeout(io, room.roomCode, room._id);
    } catch (err) {
      logger.error('Error drawing card', err);
      socket.emit('error_message', err.message || 'Failed to draw card.');
    }
  });

  // 6.5 Call UNO
  socket.on('call_uno', async () => {
    try {
      const room = await Room.findOne({ 'players.userId': socket.user.id, status: 'active' });
      if (!room) return;

      const gameState = await GameState.findOne({ roomId: room._id });
      if (!gameState || gameState.status === 'finished') return;

      const playerIndex = gameState.players.findIndex(p => p.userId.toString() === socket.user.id.toString());
      if (playerIndex === -1) return;

      // Execute calling UNO
      executeCallUno(gameState, playerIndex);
      await gameState.save();

      // Broadcast event to all players in the room
      io.in(room.roomCode).emit('uno_called', {
        username: socket.user.username
      });

      // Synchronize game state
      await syncGameState(io, room.roomCode, room._id);
    } catch (err) {
      logger.error('Error calling UNO', err);
      socket.emit('error_message', err.message || 'Failed to call UNO.');
    }
  });

  // 7. Get Room Status sync
  socket.on('sync_game', async () => {
    try {
      const room = await Room.findOne({ 'players.userId': socket.user.id, status: { $in: ['active', 'finished'] } });
      if (room) {
        const gameState = await GameState.findOne({ roomId: room._id });
        if (gameState) {
          const sanitized = sanitizeGameState(gameState, socket.user.id);
          sanitized.hostId = room.host.toString();
          socket.emit('game_state_sync', sanitized);
        }
      }
    } catch (err) {
      logger.error('Error syncing game', err);
    }
  });

  // 8. Restart Game (Host only)
  socket.on('restart_game', async () => {
    try {
      // Find room where status is finished and current player is the host
      const room = await Room.findOne({ host: socket.user.id, status: 'finished' });
      if (!room) {
        return socket.emit('error_message', 'Only the room host can restart the match once it has finished.');
      }

      // Find currently connected sockets in the room
      const activeSockets = await io.in(room.roomCode).fetchSockets();
      const connectedUserIds = new Set(activeSockets.map(s => s.user?.id?.toString()).filter(Boolean));

      // Filter players in the room to keep only those currently connected
      const connectedPlayers = room.players.filter(p => connectedUserIds.has(p.userId.toString()));
      if (connectedPlayers.length < 2) {
        return socket.emit('error_message', 'Cannot restart match. Need at least 2 connected players.');
      }

      // Update room players list to include only connected ones
      room.players = connectedPlayers;

      // Generate & shuffle fresh deck
      let deck = shuffleDeck(generateDeck());

      // Deal 7 cards to each connected player
      const playersState = connectedPlayers.map(p => {
        const hand = [];
        for (let i = 0; i < 7; i++) {
          hand.push(deck.pop());
        }
        return {
          userId: p.userId,
          username: p.username,
          hand,
          isEliminated: false,
          socketId: p.socketId
        };
      });

      // Find first non-wild, non-action number card for starting card
      let starterCardIdx = deck.findIndex(card => card.color !== 'Wild' && card.type === 'number');
      if (starterCardIdx === -1) {
        starterCardIdx = deck.findIndex(card => card.color !== 'Wild');
      }
      const startingCard = deck.splice(starterCardIdx, 1)[0];

      // Delete old game state to clean up, if it exists
      if (room.gameState) {
        await GameState.deleteOne({ _id: room.gameState });
      }

      // Create new GameState
      const newGameState = new GameState({
        roomId: room._id,
        deck,
        discardPile: [startingCard],
        players: playersState,
        turnIndex: 0,
        direction: 1,
        currentColor: startingCard.color,
        currentType: startingCard.type,
        penaltyStack: 0,
        status: 'playing'
      });

      await newGameState.save();

      // Reset room status and reference new game state
      room.status = 'active';
      room.gameState = newGameState._id;
      await room.save();

      // Notify all connected clients in the room that game is starting (as a restart)
      io.in(room.roomCode).emit('game_started', {
        roomId: room._id,
        roomCode: room.roomCode,
        isRestart: true
      });

      // Synchronize fresh game state to all players
      await syncGameState(io, room.roomCode, room._id);
      clearRoomTimeout(room._id);
      await checkAndManageTurnTimeout(io, room.roomCode, room._id);
    } catch (err) {
      logger.error('Error restarting game', err);
      socket.emit('error_message', 'Failed to restart the game.');
    }
  });

  // 9. Remove Player (Host only)
  socket.on('remove_player', async ({ userId }) => {
    try {
      const room = await Room.findOne({ host: socket.user.id, $or: [{ status: 'lobby' }, { status: 'active' }] });
      if (!room) {
        return socket.emit('error_message', 'Only the host can remove players.');
      }

      if (userId.toString() === socket.user.id.toString()) {
        return socket.emit('error_message', 'Host cannot remove themselves.');
      }

      // Find the player in the room
      const targetPlayer = room.players.find(p => p.userId.toString() === userId.toString());
      if (!targetPlayer) {
        return socket.emit('error_message', 'Player not found in this room.');
      }

      const targetUsername = targetPlayer.username;
      const targetSocketId = targetPlayer.socketId;

      // Remove player from room players list
      room.players = room.players.filter(p => p.userId.toString() !== userId.toString());

      let wasGameActive = room.status === 'active';
      let gameState = null;

      if (wasGameActive && room.gameState) {
        gameState = await GameState.findById(room.gameState);
        if (gameState && gameState.status !== 'finished') {
          const gamePlayerIdx = gameState.players.findIndex(p => p.userId.toString() === userId.toString());
          if (gamePlayerIdx !== -1) {
            const isCurrentTurn = gameState.turnIndex === gamePlayerIdx;

            // Remove player from game state players list (and their cards implicitly)
            gameState.players.splice(gamePlayerIdx, 1);

            // If the player was the current turn, shift turn
            if (isCurrentTurn && gameState.players.length > 0) {
              if (gameState.turnIndex >= gameState.players.length) {
                gameState.turnIndex = 0;
              }
              // Advance to the next active player if needed
              let attempts = 0;
              while (
                (gameState.players[gameState.turnIndex].isEliminated || gameState.players[gameState.turnIndex].finishedRank > 0) &&
                attempts < gameState.players.length
              ) {
                gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
                attempts++;
              }
            } else if (gameState.turnIndex > gamePlayerIdx) {
              // Adjust turnIndex because elements shifted left
              gameState.turnIndex--;
            }

            // Check if game status waiting for roulette is affected
            if (gameState.status === 'roulette_waiting' && gameState.actionData) {
              const { rouletteTargetIndex } = gameState.actionData;
              if (rouletteTargetIndex === gamePlayerIdx) {
                // Kicked player was target of roulette. Reset roulette.
                gameState.status = 'playing';
                gameState.actionData = {};
              } else if (rouletteTargetIndex > gamePlayerIdx) {
                gameState.actionData.rouletteTargetIndex--;
              }
            }

            // Check win/finished condition
            checkMercyRule(gameState);

            if (gameState.status === 'finished') {
              room.status = 'finished';
            }

            await gameState.save();
          }
        }
      }

      await room.save();

      // Notify the kicked player
      const targetSocket = io.sockets.sockets.get(targetSocketId);
      if (targetSocket) {
        targetSocket.emit('kicked_from_room');
        targetSocket.leave(room.roomCode);
      }

      // Broadcast event to remaining players
      io.in(room.roomCode).emit('player_removed', { username: targetUsername });

      if (wasGameActive) {
        // Sync fresh game state to all remaining players
        await syncGameState(io, room.roomCode, room._id);
        await checkAndManageTurnTimeout(io, room.roomCode, room._id);
      } else {
        // Sync room data for lobby
        io.in(room.roomCode).emit('room_updated', room);
      }

    } catch (err) {
      logger.error('Error removing player', err);
      socket.emit('error_message', 'Failed to remove player.');
    }
  });

  // 10. Voluntary Leave Room
  socket.on('leave_room', async () => {
    try {
      const room = await Room.findOne({ 'players.userId': socket.user.id, $or: [{ status: 'lobby' }, { status: 'active' }] });
      if (!room) return;

      const userId = socket.user.id;
      const targetPlayer = room.players.find(p => p.userId.toString() === userId.toString());
      if (!targetPlayer) return;

      const targetUsername = targetPlayer.username;

      // Remove player from room players list
      room.players = room.players.filter(p => p.userId.toString() !== userId.toString());

      // If they were the host, migrate host to next player
      if (room.host.toString() === userId.toString()) {
        if (room.players.length > 0) {
          room.host = room.players[0].userId;
        } else {
          room.status = 'finished';
        }
      }

      let wasGameActive = room.status === 'active';
      let gameState = null;

      if (wasGameActive && room.gameState) {
        gameState = await GameState.findById(room.gameState);
        if (gameState && gameState.status !== 'finished') {
          const gamePlayerIdx = gameState.players.findIndex(p => p.userId.toString() === userId.toString());
          if (gamePlayerIdx !== -1) {
            const isCurrentTurn = gameState.turnIndex === gamePlayerIdx;

            // Remove player from game state players list (and their cards implicitly)
            gameState.players.splice(gamePlayerIdx, 1);

            // If the player was the current turn, shift turn
            if (isCurrentTurn && gameState.players.length > 0) {
              if (gameState.turnIndex >= gameState.players.length) {
                gameState.turnIndex = 0;
              }
              // Advance to the next active player if needed
              let attempts = 0;
              while (
                (gameState.players[gameState.turnIndex].isEliminated || gameState.players[gameState.turnIndex].finishedRank > 0) &&
                attempts < gameState.players.length
              ) {
                gameState.turnIndex = (gameState.turnIndex + 1) % gameState.players.length;
                attempts++;
              }
            } else if (gameState.turnIndex > gamePlayerIdx) {
              // Adjust turnIndex because elements shifted left
              gameState.turnIndex--;
            }

            // Check if game status waiting for roulette is affected
            if (gameState.status === 'roulette_waiting' && gameState.actionData) {
              const { rouletteTargetIndex } = gameState.actionData;
              if (rouletteTargetIndex === gamePlayerIdx) {
                gameState.status = 'playing';
                gameState.actionData = {};
              } else if (rouletteTargetIndex > gamePlayerIdx) {
                gameState.actionData.rouletteTargetIndex--;
              }
            }

            // Check win/finished condition
            checkMercyRule(gameState);

            if (gameState.status === 'finished') {
              room.status = 'finished';
            }

            await gameState.save();
          }
        }
      }

      await room.save();
      socket.leave(room.roomCode);

      // Broadcast event to remaining players
      io.in(room.roomCode).emit('player_left', { username: targetUsername });

      if (wasGameActive) {
        await syncGameState(io, room.roomCode, room._id);
        await checkAndManageTurnTimeout(io, room.roomCode, room._id);
      } else {
        io.in(room.roomCode).emit('room_updated', room);
      }
    } catch (err) {
      logger.error('Error leaving room', err);
    }
  });

  // 11. Disconnect Hook
  socket.on('disconnect', async () => {
    try {
      if (!socket.user || !socket.user.id) return;

      const rooms = await Room.find({ 'players.userId': socket.user.id, status: { $ne: 'finished' } });
      for (const room of rooms) {
        const player = room.players.find(p => p.userId.toString() === socket.user.id.toString());
        if (player) {
          player.socketId = null;
          player.status = 'offline';
          await room.save();

          console.log(`[PLAYER DISCONNECTED]\nusername: ${player.username}\nroom: ${room.roomCode}`);

          if (room.status === 'active' && room.gameState) {
            const gameState = await GameState.findById(room.gameState);
            if (gameState) {
              const gamePlayer = gameState.players.find(p => p.userId.toString() === socket.user.id.toString());
              if (gamePlayer) {
                gamePlayer.socketId = null;
                gamePlayer.status = 'offline';
                await gameState.save();
              }
              // Sync updated state (marked offline) to remaining online players
              await syncGameState(io, room.roomCode, room._id);
              // Trigger turn timeout skip engine if the disconnected player's turn was active
              await checkAndManageTurnTimeout(io, room.roomCode, room._id);
            }
          } else {
            io.in(room.roomCode).emit('room_updated', room);
          }
        }
      }
    } catch (err) {
      logger.error('Error in socket disconnect handler:', err);
    }
  });
}
