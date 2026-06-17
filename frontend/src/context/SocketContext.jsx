import React, { createContext, useContext, useState } from "react";
import { io } from "socket.io-client";

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

      const serverUrl =
        process.env.REACT_APP_BACKEND_URL || "http://localhost:5000";

      const socketInstance = io(serverUrl, {
        auth: { username },
        autoConnect: true,
        reconnectionAttempts: 5,
        transports: ["websocket", "polling"],
      });

      socketInstance.on("connect", () => {
        setConnected(true);
        setError(null);
        resolve(socketInstance);
      });

      socketInstance.on("disconnect", (reason) => {
        setConnected(false);
      });

      socketInstance.on("connect_error", (err) => {
        setConnected(false);
        setError(err.message || "Connection failed.");
        reject(err);
      });

      setSocket(socketInstance);
    });
  };

  const disconnectSocket = () => {
    if (socket) {
      socket.disconnect();
      setSocket(null);
      setConnected(false);
    }
  };

  const createRoom = (usernameVal) => {
    if (socket) {
      socket.emit("create_room", { username: usernameVal });
    } else {
      console.error("Cannot emit create_room: Socket is not initialized.");
    }
  };

  const joinRoom = (roomCodeVal, usernameVal) => {
    if (socket) {
      socket.emit("join_room", {
        roomCode: roomCodeVal,
        username: usernameVal,
      });
    } else {
      console.error("Cannot emit join_room: Socket is not initialized.");
    }
  };

  const toggleReady = () => {
    if (socket) {
      socket.emit("toggle_ready");
    } else {
      console.error("Cannot emit toggle_ready: Socket is not initialized.");
    }
  };

  const startGame = () => {
    if (socket) {
      socket.emit("start_game");
    } else {
      console.error("Cannot emit start_game: Socket is not initialized.");
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connected,
        error,
        connectSocket,
        disconnectSocket,
        createRoom,
        joinRoom,
        toggleReady,
        startGame,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
