import React, { useState, useEffect } from 'react';
import { SocketProvider, useSocket } from './context/SocketContext';
import Home from './pages/Home';
import Lobby from './pages/Lobby';
import Game from './pages/Game';
import JoinViaInvite from './pages/JoinViaInvite';


function MainApp() {
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState('');
  const [currentRoom, setCurrentRoom] = useState(null);
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentGameState, setCurrentGameState] = useState(null);
  const [currentView, setCurrentView] = useState('home'); // 'home' | 'lobby' | 'game' | 'invite'
  const [loadingState, setLoadingState] = useState(''); // '', 'connecting', 'creating', 'joining', 'waiting'
  const [inviteCode, setInviteCode] = useState(() => {
    const path = window.location.pathname;
    const match = path.match(/^\/join\/([A-Za-z0-9]+)/);
    return match ? match[1].toUpperCase() : '';
  });

  useEffect(() => {
    if (inviteCode) {
      setRoomCode(inviteCode);
      setCurrentView('invite');
    }
  }, [inviteCode]);


  const { socket, connected, error, connectSocket, disconnectSocket } = useSocket();

  // Listen to socket events for screen transitions
  useEffect(() => {
    if (!socket) return;

    const handleRoomUpdated = (room) => {
      setCurrentRoom(room);
      setRoomCode(room.roomCode);
      
      // Identify current player using username
      const me = room.players.find(p => p.username === username);
      if (me) {
        setCurrentPlayer(me);
      }

      setLoadingState('');
      setCurrentView('lobby');
    };

    const handleGameStarted = (data) => {
      if (data && data.isRestart) {
        setLoadingState('restarting');
      } else {
        setLoadingState('waiting'); // Show waiting for game state loading screen
      }
    };

    const handleGameStateSync = (state) => {
      setCurrentGameState(state);
      setLoadingState('');
      setCurrentView('game');
    };

    const handleErrorMessage = (msg) => {
      setLoadingState('');
      alert(`Error: ${msg}`);
    };

    const handleKickedFromRoom = () => {
      disconnectSocket();
      setCurrentRoom(null);
      setCurrentGameState(null);
      setCurrentPlayer(null);
      setRoomCode('');
      setCurrentView('home');
      setLoadingState('');
      alert('You were removed from the room by the host.');
    };

    socket.on('room_updated', handleRoomUpdated);
    socket.on('game_started', handleGameStarted);
    socket.on('game_state_sync', handleGameStateSync);
    socket.on('error_message', handleErrorMessage);
    socket.on('kicked_from_room', handleKickedFromRoom);

    return () => {
      socket.off('room_updated', handleRoomUpdated);
      socket.off('game_started', handleGameStarted);
      socket.off('game_state_sync', handleGameStateSync);
      socket.off('error_message', handleErrorMessage);
      socket.off('kicked_from_room', handleKickedFromRoom);
    };
  }, [socket, username, disconnectSocket]);

  const handleHost = async (name) => {
    setUsername(name);
    setLoadingState('connecting');
    try {
      const socketInstance = await connectSocket(name);
      setLoadingState('creating');
      socketInstance.emit('create_room', { username: name });
    } catch (err) {
      setLoadingState('');
      console.error('Connect error in handleHost:', err);
      alert(`Connection failed: ${err.message || 'Cannot reach server'}`);
    }
  };

  const handleJoin = async (code, name) => {
    setUsername(name);
    setRoomCode(code);
    setLoadingState('connecting');
    try {
      const socketInstance = await connectSocket(name);
      setLoadingState('joining');
      socketInstance.emit('join_room', { roomCode: code, username: name });
    } catch (err) {
      setLoadingState('');
      console.error('Connect error in handleJoin:', err);
      alert(`Connection failed: ${err.message || 'Cannot reach server'}`);
    }
  };

  const handleLeave = () => {
    disconnectSocket();
    setCurrentRoom(null);
    setCurrentGameState(null);
    setCurrentPlayer(null);
    setRoomCode('');
    setCurrentView('home');
    setLoadingState('');
  };

  // 1. Render Loading Screens
  if (loadingState) {
    let loadingText = 'Loading...';
    if (loadingState === 'connecting') {
      loadingText = 'Connecting to game server...';
    } else if (loadingState === 'creating') {
      loadingText = 'Creating room...';
    } else if (loadingState === 'joining') {
      loadingText = 'Joining room...';
    } else if (loadingState === 'waiting') {
      loadingText = 'Waiting for lobby data...';
    } else if (loadingState === 'restarting') {
      loadingText = '🔄 New game starting...';
    }

    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white select-none">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-500 mb-4"></div>
        <p className="text-slate-400 font-bold uppercase tracking-wider text-xs">{loadingText}</p>
      </div>
    );
  }

  // 2. Render Screen Views
  switch (currentView) {
    case 'lobby':
      return (
        <Lobby
          room={currentRoom}
          currentPlayer={currentPlayer}
          onLeave={handleLeave}
        />
      );
    case 'game':
      return (
        <Game
          roomCode={roomCode}
          currentPlayer={currentPlayer}
          onLeaveRoom={handleLeave}
        />
      );
    case 'invite':
      return (
        <JoinViaInvite
          roomCode={inviteCode}
          onJoin={handleJoin}
          onCancel={() => {
            window.history.pushState({}, '', '/');
            setInviteCode('');
            setRoomCode('');
            setCurrentView('home');
          }}
        />
      );
    case 'home':
    default:
      return (
        <Home
          onHost={handleHost}
          onJoin={handleJoin}
        />
      );
  }
}

export default function App() {
  return (
    <SocketProvider>
      <MainApp />
    </SocketProvider>
  );
}