import mongoose from 'mongoose';

const roomSchema = new mongoose.Schema({
  roomCode: {
    type: String,
    required: true,
    unique: true,
    uppercase: true,
    trim: true,
    minlength: 4,
    maxlength: 6
  },
  host: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
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
    socketId: {
      type: String
    },
    isReady: {
      type: Boolean,
      default: false
    }
  }],
  status: {
    type: String,
    enum: ['lobby', 'active', 'finished'],
    default: 'lobby'
  },
  maxPlayers: {
    type: Number,
    default: 10,
    min: 2,
    max: 10
  },
  gameState: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'GameState'
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);
export default Room;
