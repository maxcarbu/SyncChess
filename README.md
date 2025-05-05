# SyncChess

SyncChess is an innovative chess variant where both players submit their moves simultaneously instead of taking turns. This creates a unique strategic experience that combines traditional chess knowledge with prediction, mind games, and risk assessment.

## Game Rules

### Core Mechanics

1. **Simultaneous Moves**: Both players submit their moves at the same time. There are no turns; each round consists of one move per player, executed simultaneously.

2. **No Repeating the Same Piece**: A piece cannot be moved two turns in a row, with one exception: the king can move multiple times in a row if it is in check or if there are no other legal moves available.

3. **"Swerving" Rule**: If a piece tries to capture an enemy piece, but that piece moves away in the same turn, no capture occurs. Both pieces simply move to their new destinations as if nothing happened.

4. **Collision Rule**: If two pieces move to the same square at the same time, both are removed from the board.

### Check & Checkmate

- A king cannot move into a square that is already under threat (standard chess rule).
- If a king ends up in check due to the opponent's simultaneous move, that's allowed.
- If a player is in check, they must get out of it on their next move.
- If both kings are in check at the same time, both players must escape check in the next round.
- If a player delivers checkmate, the game ends immediately, even if that player also ends up in check on the same turn.
- If both players deliver checkmate at the same time, the game ends in a draw.

### Special Moves

- **Castling**: Works as in standard chess but with simultaneous moves.
- **En Passant**: Standard chess rules apply.
- **Pawn Promotion**: When a pawn reaches the opposite end of the board, it can be promoted to a queen, rook, bishop, or knight.
- **King's Extra Move**: Kings can move multiple times in a row when in check.

## Technical Features

- **Real-time Multiplayer**: Built using Socket.io for seamless real-time gameplay.
- **Customizable Time Controls**: Options from 1 minute to 60 minutes, or unlimited time.
- **Move Validation**: Server-side validation ensures all moves follow the rules.
- **Visual Feedback**: Highlights for check, last moves, valid moves, and en passant.
- **Mobile Responsive**: Playable on devices of various screen sizes.

## Potential Future Improvements

### Gameplay Features

1. **Additional Draw Conditions**:
   - Implement 50-move rule
   - Add threefold repetition
   - Add insufficient material detection

2. **Game Analysis**:
   - Move notation recording
   - Post-game analysis board
   - Game replay functionality

3. **Tournament Features**:
   - Player accounts and ratings
   - Matchmaking system
   - Leaderboards

### Technical Improvements

1. **Performance Optimizations**:
   - Optimize Socket.io usage for larger scale
   - Implement caching for game states
   - Add database persistence for game history

2. **User Experience**:
   - Add sound and visual effects for major events
   - Implement spectator mode
   - Add chat functionality
   - Improve animations for moves

3. **Security Enhancements**:
   - Add rate limiting
   - Implement more robust input validation
   - Add protection against common web vulnerabilities

## Getting Started

### Prerequisites

- Node.js (v14+)
- npm or yarn

### Installation

1. Clone the repository:
   ```
   git clone https://github.com/yourusername/syncchess.git
   ```

2. Install dependencies:
   ```
   cd syncchess
   npm install
   ```

3. Start the server:
   ```
   npm start
   ```

4. Visit `http://localhost:3024` in your browser to play.

### Playing the Game

1. Create a new game and share the link with your opponent.
2. Both players select and submit moves simultaneously.
3. After both players submit moves, the board updates.
4. Continue until one player achieves checkmate or a draw occurs.

## License

[Specify your license here, e.g., MIT License]

## Acknowledgments

- Built using [Chessboard.js](https://chessboardjs.com/)
- Socket.io for real-time communication
- Express.js for the web server

---

## License

Copyright © 2025 [Max Carbunaru]. All Rights Reserved.

This code is provided for personal, non-commercial use only. 
No permission is granted for commercial use, distribution, or modification without explicit written consent from Max Carbunaru.

Created by [Max Carbunaru]