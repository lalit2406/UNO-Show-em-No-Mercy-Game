import mongoose from 'mongoose';

const cardSchema = new mongoose.Schema({
  id: { type: String, required: true },
  color: {
    type: String,
    enum: ['Red', 'Blue', 'Green', 'Yellow', 'Wild'],
    required: true
  },
  type: {
    type: String,
    enum: [
      'number',
      'skip',
      'reverse',
      'draw2',
      'draw4',
      'skip_everyone',
      'discard_all',
      'wild',
      'wild_reverse_draw4',
      'wild_draw6',
      'wild_draw10',
      'wild_color_roulette'
    ],
    required: true
  },
  value: { type: String, required: true }, // '0'-'9', 'skip', 'reverse', 'draw2', 'draw4', 'skip_everyone', 'discard_all', 'wild', 'wild_reverse_draw4', 'wild_draw6', 'wild_draw10', 'wild_color_roulette'
  drawValue: { type: Number, default: 0 } // 2, 4, 6, 10
});

const gameStateSchema = new mongoose.Schema({
  roomId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Room',
    required: true
  },
  deck: [cardSchema],
  discardPile: [cardSchema],
  players: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    username: {
      type: String,
      required: true
    },
    hand: [cardSchema],
    isEliminated: {
      type: Boolean,
      default: false
    },
    hasCalledUno: {
      type: Boolean,
      default: false
    },
    needsUnoCall: {
      type: Boolean,
      default: false
    },
    socketId: {
      type: String
    },
    finishedRank: {
      type: Number,
      default: 0
    }
  }],
  turnIndex: {
    type: Number,
    default: 0
  },
  direction: {
    type: Number,
    enum: [1, -1],
    default: 1 // 1 for clockwise, -1 for counter-clockwise
  },
  currentColor: {
    type: String,
    enum: ['Red', 'Blue', 'Green', 'Yellow'],
    required: true
  },
  currentType: {
    type: String,
    required: true
  },
  penaltyStack: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['playing', 'roulette_waiting', 'finished'],
    default: 'playing'
  },
  winner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  actionData: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  hasDrawnThisTurn: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

const GameState = mongoose.model('GameState', gameStateSchema);
export default GameState;
export { cardSchema };
