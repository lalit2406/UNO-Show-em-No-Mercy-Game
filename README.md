# UNO Show 'Em No Mercy - Real-Time Multiplayer Card Game

This project is a high-fidelity, real-time multiplayer implementation of the intense card game **UNO Show 'Em No Mercy**. It uses Node.js/Express and MongoDB for the backend, Socket.io for bidirectional communication, and React with Tailwind CSS for a premium, highly animated visual experience.

## Features Implemented
1. **The Mercy Rule**: Players with exactly 25 or more cards in hand are instantly knocked out (`eliminatePlayer` event).
2. **Tougher Drawing**: Players without playable cards draw from the deck consecutively until a playable card is drawn, which is then played automatically.
3. **Stacking Penalties**: Stack Draw cards (+2, +4, +6, +10) of equal or higher value to pass accumulating penalty stacks to the next player.
4. **Discard All**: Discards all cards matching the color of the Discard All card.
5. **Wild Color Roulette**: Force the next player to draw cards from the deck until they draw a matching color chosen by you, skipping their turn.
6. **Double-Turn action**: Play a *Skip Everyone* card to immediately take another turn.
7. **Secure GameSync**: Backend state serialization hides opponent hands from memory inspect tools (only exposes hand counts).

---

## Directory Structure

```
uno-no-mercy/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   ├── models/
│   │   │   ├── User.js
│   │   │   ├── Room.js
│   │   │   └── GameState.js
│   │   ├── sockets/
│   │   │   ├── socketManager.js
│   │   │   └── gameHandlers.js
│   │   ├── utils/
│   │   │   ├── deck.js
│   │   │   └── logger.js
│   │   ├── gameEngine.js
│   │   └── server.js
│   ├── .env.example
│   └── package.json
└── frontend/
    ├── src/
    │   ├── components/
    │   │   ├── Card.jsx
    │   │   ├── GameBoard.jsx
    │   │   ├── PlayerHand.jsx
    │   │   └── Opponents.jsx
    │   ├── context/
    │   │   └── SocketContext.jsx
    │   ├── App.jsx
    │   └── main.jsx
    └── package.json
```

---

## Running Locally

### 1. Pre-requisites
- Node.js (v18+)
- MongoDB running locally or a MongoDB Atlas URI

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Copy environment configuration and configure values:
   ```bash
   cp .env.example .env
   ```
4. Start the server:
   ```bash
   npm start
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd ../frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the dev client:
   ```bash
   npm start
   ```
4. Open your browser at `http://localhost:3000`. Open multiple tabs to test multiplayer!
