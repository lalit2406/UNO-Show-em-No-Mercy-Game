import React from 'react';
import GameBoard from '../components/GameBoard';

export default function Game({ roomCode, currentPlayer, onLeaveRoom }) {
  const myUserId = currentPlayer?.userId?._id
    ? currentPlayer.userId._id.toString()
    : currentPlayer?.userId?.toString();

  return (
    <GameBoard
      roomCode={roomCode}
      myUserId={myUserId}
      onLeaveRoom={onLeaveRoom}
    />
  );
}
