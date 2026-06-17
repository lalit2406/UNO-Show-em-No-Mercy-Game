import express from 'express';
import http from 'http';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import { initSockets } from './sockets/socketManager.js';
import { logger } from './utils/logger.js';

// Load environment variables
dotenv.config();

const app = express();
const server = http.createServer(app);

// Express middleware
app.use(cors({
  origin: process.env.CLIENT_URL,
  credentials: true
}));
app.use(express.json());

// Basic Health Check Route
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy', timestamp: new Date() });
});

// Root Route
app.get('/', (req, res) => {
  res.send('UNO No Mercy Backend Running');
});

// Database Connection
const mongoURI = process.env.MONGODB_URI;
if (!mongoURI) {
  logger.error('MONGODB_URI is not set in environment variables.');
  process.exit(1);
}

mongoose.connect(mongoURI)
  .then(() => {
    logger.info('Connected to MongoDB database.');
  })
  .catch((err) => {
    logger.error('Database connection failed:', err);
    process.exit(1);
  });

// Socket initialization
initSockets(server);

// Start Server
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  logger.info(`Server listening on port ${PORT}`);
});

export { app, server };
