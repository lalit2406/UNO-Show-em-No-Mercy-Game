import React, { createContext, useContext, useState } from 'react';
import { io } from 'socket.io-client';

const SocketContext = createContext(null);

export function useSocket() {
  return useContext(SocketContext);
}

export function SocketProvider({ children }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  const connectSocket = (username) => {
    return new Promise((resolve, reject) => {
      // Disconnect existing socket if any
      if (socket) {
        socket.disconnect();
      }

      const serverUrl = process.env.REACT_APP_BACKEND_URL || 'http://localhost:5000';
      console.log('[DEBUG] Connecting socket to URL:', serverUrl, 'with username:', username);

      const socketInstance = io(serverUrl, {
        auth: { username },
        autoConnect: true,
        reconnectionAttempts: 5
      });

      socketInstance.on('connect', () => {
        console.log('[DEBUG] socket connect event triggered. Socket ID:', socketInstance.id);
        setConnected(true);
        setError(null);
        resolve(socketInstance);
      });

      socketInstance.on('disconnect', (reason) => {
        console.log('[DEBUG] socket disconnect event triggered. Reason:', reason);
        setConnected(false);
      });

      socketInstance.on('connect_error', (err) => {
        console.log('[DEBUG] socket connect_error event triggered. Error:', err.message);
        setConnected(false);
        setError(err.message || 'Connection failed.');
        reject(err);
      });

      // Debug logs for backend events
      socketInstance.on('room_updated', (room) => {
        console.log('[DEBUG] room_updated event received:', room);
      });

      socketInstance.on('game_started', (data) => {
        console.log('[DEBUG] game_started event received:', data);
      });

      socketInstance.on('game_state_sync', (state) => {
        console.log('[DEBUG] game_state_sync event received:', state);
      });

      socketInstance.on('error_message', (msg) => {
        console.log('[DEBUG] error_message event received:', msg);
      });

      setSocket(socketInstance);
    });
  };

  const disconnectSocket = () => {
    if (socket) {
      console.log('[DEBUG] Manually disconnecting socket');
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  const createRoom = (usernameVal) => {
    if (socket) {
      console.log('[DEBUG] Emitting create_room with username:', usernameVal);
      socket.emit('create_room', { username: usernameVal });
    } else {
      console.error('[DEBUG] Cannot emit create_room: Socket is not initialized.');
    }
  };

  const joinRoom = (roomCodeVal, usernameVal) => {
    if (socket) {
      console.log('[DEBUG] Emitting join_room for room:', roomCodeVal, 'with username:', usernameVal);
      socket.emit('join_room', { roomCode: roomCodeVal, username: usernameVal });
    } else {
      console.error('[DEBUG] Cannot emit join_room: Socket is not initialized.');
    }
  };

  const toggleReady = () => {
    if (socket) {
      console.log('[DEBUG] Emitting toggle_ready');
      socket.emit('toggle_ready');
    } else {
      console.error('[DEBUG] Cannot emit toggle_ready: Socket is not initialized.');
    }
  };

  const startGame = () => {
    if (socket) {
      console.log('[DEBUG] Emitting start_game');
      socket.emit('start_game');
    } else {
      console.error('[DEBUG] Cannot emit start_game: Socket is not initialized.');
    }
  };

  return (
    <SocketContext.Provider value={{
      socket,
      connected,
      error,
      connectSocket,
      disconnectSocket,
      createRoom,
      joinRoom,
      toggleReady,
      startGame
    }}>
      {children}
    </SocketContext.Provider>
  );
}
