import mongoose from 'mongoose';
import Room from './src/models/Room.js';
import GameState from './src/models/GameState.js';
import registerGameHandlers from './src/sockets/gameHandlers.js';

let passed = true;
function assert(condition, message) {
  if (!condition) {
    console.error(`❌ FAIL: ${message}`);
    passed = false;
  } else {
    console.log(`✅ PASS: ${message}`);
  }
}

// 1. Mock DB data
const mockRoomId = new mongoose.Types.ObjectId();
const mockGameId = new mongoose.Types.ObjectId();
const mockHostId = new mongoose.Types.ObjectId();
const mockPlayer2Id = new mongoose.Types.ObjectId();

const mockRoom = {
  _id: mockRoomId,
  roomCode: 'ABCD',
  host: mockHostId,
  players: [
    {
      userId: mockHostId,
      username: 'Lalit',
      socketId: 'socket_host',
      isReady: true,
      status: 'online'
    },
    {
      userId: mockPlayer2Id,
      username: 'Prince',
      socketId: 'socket_player2',
      isReady: true,
      status: 'online'
    }
  ],
  status: 'active',
  gameState: mockGameId,
  save: async function() { return this; }
};

const mockGameState = {
  _id: mockGameId,
  roomId: mockRoomId,
  deck: [{ id: 'yellow_7', color: 'Yellow', type: 'number', value: '7', drawValue: 0 }],
  discardPile: [{ id: 'red_5', color: 'Red', type: 'number', value: '5', drawValue: 0 }],
  players: [
    {
      userId: mockHostId,
      username: 'Lalit',
      hand: [{ id: 'blue_5', color: 'Blue', type: 'number', value: '5', drawValue: 0 }],
      isEliminated: false,
      socketId: 'socket_host',
      status: 'online'
    },
    {
      userId: mockPlayer2Id,
      username: 'Prince',
      hand: [{ id: 'red_skip', color: 'Red', type: 'skip', value: 'skip', drawValue: 0 }],
      isEliminated: false,
      socketId: 'socket_player2',
      status: 'online'
    }
  ],
  turnIndex: 0,
  direction: 1,
  currentColor: 'Red',
  currentType: 'number',
  penaltyStack: 0,
  status: 'playing',
  save: async function() { return this; }
};

// Stub out mongoose model queries
Room.findOne = async () => mockRoom;
Room.findById = async () => mockRoom;
Room.find = async () => [mockRoom];
GameState.findOne = async () => mockGameState;
GameState.findById = async () => mockGameState;

// 2. Setup mock sockets & io
const socketCallbacks = {};
const emittedEvents = [];
const joinedRooms = new Set();
const leftRooms = new Set();
const ioEmittedEvents = [];

const mockSocket = {
  id: 'socket_player2_new',
  user: {
    id: mockPlayer2Id.toString(),
    username: 'Prince',
    isGuest: true
  },
  join: (roomCode) => {
    joinedRooms.add(roomCode);
  },
  leave: (roomCode) => {
    leftRooms.add(roomCode);
  },
  emit: (event, data) => {
    emittedEvents.push({ socketId: 'self', event, data });
  },
  on: (event, callback) => {
    socketCallbacks[event] = callback;
  }
};

const mockIo = {
  in: (roomCode) => ({
    emit: (event, data) => {
      ioEmittedEvents.push({ roomCode, event, data });
    },
    fetchSockets: async () => {
      return [];
    }
  }),
  sockets: {
    sockets: new Map()
  }
};

// Override global setTimeout to run immediately for testing turn timeouts
const originalSetTimeout = global.setTimeout;
global.setTimeout = (callback, delay) => {
  callback();
  return 12345;
};

console.log('--- RUNNING SOCKET RECONNECT & SESSION RECOVERY TESTS ---');

// Register handlers
registerGameHandlers(mockIo, mockSocket);

// ==========================================
// TEST 1: Disconnect logic
// Expected: Prince status -> offline, socketId -> null. Not removed.
// ==========================================
await socketCallbacks['disconnect']();
assert(mockRoom.players[1].status === 'offline', 'Test 1: Room player status marked offline');
assert(mockRoom.players[1].socketId === null, 'Test 1: Room player socketId cleared');
assert(mockGameState.players[1].status === 'offline', 'Test 1: Game player status marked offline');
assert(mockGameState.players[1].socketId === null, 'Test 1: Game player socketId cleared');
assert(mockRoom.players.length === 2, 'Test 1: Player not removed from players seat list');

// ==========================================
// TEST 2: Rejoin/Reconnect logic
// Expected: Prince status -> online, socketId -> new socket id. Logs output.
// ==========================================
// Reset mock socket id to 'socket_player2_new' to simulate reconnection
mockSocket.id = 'socket_player2_new';
// Simulate refresh by assigning Prince a fresh new guest identity user ID
mockSocket.user.id = new mongoose.Types.ObjectId().toString();

await socketCallbacks['join_room']({ roomCode: 'ABCD', username: 'Prince' });
assert(mockRoom.players[1].status === 'online', 'Test 2: Room player status marked online');
assert(mockRoom.players[1].socketId === 'socket_player2_new', 'Test 2: Room player socketId updated');
assert(mockGameState.players[1].status === 'online', 'Test 2: Game player status marked online');
assert(mockGameState.players[1].socketId === 'socket_player2_new', 'Test 2: Game player socketId updated');
assert(mockSocket.user.id === mockPlayer2Id.toString(), 'Test 2: Socket user ID remapped to Prince\'s original userId');
assert(joinedRooms.has('ABCD'), 'Test 2: Socket joined room channel ABCD');

// ==========================================
// TEST 3: Turn Timeout Auto-skip logic
// Expected: If turn changes to offline player, auto-draw/skip triggers immediately.
// ==========================================
// Let's set Prince's turn (index 1) and make him offline
mockGameState.turnIndex = 1;
mockRoom.players[1].status = 'offline';
mockRoom.players[1].socketId = null;
mockGameState.players[1].status = 'offline';
mockGameState.players[1].socketId = null;

// Trigger checkAndManageTurnTimeout by simulating Prince disconnecting during his turn
await socketCallbacks['disconnect']();
assert(mockGameState.turnIndex === 0, 'Test 3: Turn advanced to Lalit (index 0) due to offline timeout skip');
assert(mockGameState.players[1].hand.length === 2, 'Test 3: Prince auto-drew 1 card (hand size 1 -> 2)');

// ==========================================
// TEST 4: Leave room (Voluntary exit)
// Expected: Prince is removed permanently, hand is removed, seat removed.
// ==========================================
await socketCallbacks['leave_room']();
assert(mockRoom.players.length === 1, 'Test 4: Room player list reduced to 1');
assert(mockGameState.players.length === 1, 'Test 4: Game player list reduced to 1 (Prince permanently left)');
assert(leftRooms.has('ABCD'), 'Test 4: Socket left room channel ABCD');

// Restore original setTimeout
global.setTimeout = originalSetTimeout;

if (passed) {
  console.log('\n🎉 ALL RECONNECT & SESSION RECOVERY TESTS PASSED SUCCESSFULLY! 🎉');
  process.exit(0);
} else {
  console.error('\n❌ SOME RECONNECT TESTS FAILED! ❌');
  process.exit(1);
}
