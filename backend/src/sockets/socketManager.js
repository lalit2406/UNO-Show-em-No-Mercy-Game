import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { logger } from '../utils/logger.js';
import registerGameHandlers from './gameHandlers.js';

let io;

export function initSockets(server) {
  io = new Server(server, {
    cors: {
      origin: '*', // Configurable in production
      methods: ['GET', 'POST']
    }
  });

  // Socket authentication middleware using JWT and Guest fallback
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token || socket.handshake.query?.token;
    const jwtSecret = process.env.JWT_SECRET;

    if (token && jwtSecret) {
      try {
        const decoded = jwt.verify(token, jwtSecret);
        socket.user = {
          id: decoded.id || decoded._id,
          username: decoded.username,
          isGuest: false
        };
        return next();
      } catch (err) {
        logger.error('JWT verification failed', err);
        return next(new Error('Authentication error'));
      }
    }

    // Guest fallback
    const username = socket.handshake.auth?.username || socket.handshake.query?.username;
    if (username) {
      socket.user = {
        id: new mongoose.Types.ObjectId().toString(),
        username: username.trim(),
        isGuest: true
      };
      return next();
    }

    return next(new Error('Authentication or Guest identity required'));
  });

  io.on('connection', (socket) => {
    logger.info(`Socket connected: ${socket.id} (User: ${socket.user?.username})`);

    // Register UNO game and room socket handlers
    registerGameHandlers(io, socket);

    socket.on('disconnect', () => {
      logger.info(`Socket disconnected: ${socket.id}`);
    });
  });

  return io;
}

export function getIO() {
  if (!io) {
    throw new Error('Socket.io not initialized.');
  }
  return io;
}
