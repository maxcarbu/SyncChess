/**
 * SyncChess server
 */

const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const { createGameState } = require('./boardUtils');
const { isLegalMove, isInCheck, checkTimerStatus, processMoves } = require('./gameLogic');

// Set up Express server
const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from the public directory
app.use(express.static(path.join(__dirname, '../public')));

// Redirect root to index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

app.get('/game', (req, res) => {
  res.sendFile(path.join(__dirname, '../public/game.html'));
});

// Save games with their state
const games = {}; // roomId -> gameState

io.on('connection', (socket) => {
  console.log('🟢 Connected:', socket.id);

  socket.on('joinGame', (data) => {
    let roomId, timeControl;
    
    // Handle both string and object format
    if (typeof data === 'string') {
      roomId = data;
      timeControl = 300; // Default 5 minutes
    } else {
      roomId = data.roomId;
      timeControl = parseInt(data.timeControl) || 300;
    }
    
    if (!games[roomId]) {
      games[roomId] = createGameState(timeControl);
    }

    const game = games[roomId];

    let color = null;
    if (!game.whiteId) {
      game.whiteId = socket.id;
      color = 'white';
    } else if (!game.blackId) {
      game.blackId = socket.id;
      color = 'black';
    } else {
      socket.emit('error', 'Room full');
      return;
    }

    socket.join(roomId);
    socket.emit('playerColor', color);
    socket.emit('boardState', game.position);
    
    // Send game state info
    socket.emit('gameState', {
      inCheck: game.inCheck,
      lastMovedPiece: game.lastMovedPieces[color],
      lastMoves: game.lastMoves,
      timers: game.timers,
      castlingRights: game.castlingRights,
      enPassantTarget: game.enPassantTarget,
      gameStarted: game.gameStarted
    });
    
    console.log(`🎨 Assigned ${color} to ${socket.id} in room ${roomId}`);
    
    // Notify if both players have joined
    if (game.whiteId && game.blackId) {
      io.to(roomId).emit('gameReady', true);
      
      // Start the game timer when both players join
      game.timerRunning = true;
      game.timers.lastUpdate = Date.now();
      
      // In chess-style timer, both players' timers start running until they submit a move
      game.timers.whiteActive = true;
      game.timers.blackActive = true;
      
      // Send timer updates every second
      if (!games[roomId].timerInterval) {
        games[roomId].timerInterval = setInterval(() => {
          if (game.timerRunning) {
            // Check if time control is 0 (no time limit)
            if (game.timers.timeControl === 0) {
              // Just send timer updates without decrementing
              io.to(roomId).emit('timerUpdate', game.timers);
              return;
            }
            
            // Update time remaining
            const now = Date.now();
            const elapsed = (now - game.timers.lastUpdate) / 1000;
            
            // Only decrement time for active timers
            if (game.timers.whiteActive) {
              game.timers.white = Math.max(0, game.timers.white - elapsed);
            }
            
            if (game.timers.blackActive) {
              game.timers.black = Math.max(0, game.timers.black - elapsed);
            }
            
            game.timers.lastUpdate = now;
            
            // Check for timeout
            let gameOver = false;
            
            if (game.timers.white <= 0) {
              io.to(roomId).emit('gameState', {
                inCheck: game.inCheck,
                lastMovedPieces: game.lastMovedPieces,
                lastMoves: game.lastMoves,
                timers: game.timers,
                gameResult: 'blackWins'
              });
              gameOver = true;
            } else if (game.timers.black <= 0) {
              io.to(roomId).emit('gameState', {
                inCheck: game.inCheck,
                lastMovedPieces: game.lastMovedPieces,
                lastMoves: game.lastMoves,
                timers: game.timers,
                gameResult: 'whiteWins'
              });
              gameOver = true;
            }
            
            if (gameOver) {
              clearInterval(games[roomId].timerInterval);
              game.timerRunning = false;
            } else {
              // Just send timer updates
              io.to(roomId).emit('timerUpdate', game.timers);
            }
          }
        }, 1000);
      }
    }
  });

  // NEW EVENT HANDLER for updating game settings
  socket.on('updateSettings', ({ gameId, settings }) => {
    const game = games[gameId];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }
    
    // Only allow settings changes before game has started
    if (game.gameStarted) {
      socket.emit('error', 'Cannot change settings after game has started');
      return;
    }
    
    // Update time control if provided
    if (settings.timeControl !== undefined) {
      const timeControl = parseInt(settings.timeControl);
      
      // Validate the time control value
      if (isNaN(timeControl) || (timeControl < 0 && timeControl !== 0)) {
        socket.emit('error', 'Invalid time control value');
        return;
      }
      
      // Update the time control setting
      game.timers.timeControl = timeControl;
      game.timers.white = timeControl;
      game.timers.black = timeControl;
      
      console.log(`⏱️ Updated time control to ${timeControl} seconds for game ${gameId}`);
      
      // Notify all players about the updated settings and send updated timer values
      io.to(gameId).emit('settingsUpdated', { 
        timeControl: timeControl,
        timers: game.timers // Send the full timer object
      });
    }
  });

  // Handle pawn promotion - FIXED
  socket.on('promotePawn', ({ gameId, square, pieceType }) => {
    const game = games[gameId];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    const colorName = (socket.id === game.whiteId) ? 'white' : 
                      (socket.id === game.blackId) ? 'black' : null;
    if (!colorName) {
      socket.emit('error', 'You are not a player in this game');
      return;
    }
    
    const color = colorName === 'white' ? 'w' : 'b';
    
    // Validate the piece type (Q, R, N, B)
    if (!['Q', 'R', 'N', 'B'].includes(pieceType)) {
      socket.emit('error', 'Invalid promotion piece type');
      return;
    }
    
    // Check if we have a pending move with a pawn that needs promotion
    if (!game.pendingMoves[colorName]) {
      socket.emit('error', 'No pending move requiring promotion');
      return;
    }
    
    const pendingMove = game.pendingMoves[colorName];
    const destinationSquare = pendingMove.to;
    
    // Check if the specified square matches our pending move destination
    if (destinationSquare !== square) {
      socket.emit('error', 'Square mismatch for promotion');
      return;
    }
    
    // Check if there's a pawn at the source square in the pendingMove
    const fromCoords = require('./boardUtils').squareToCoords(pendingMove.from);
    const board = require('./boardUtils').positionToBoard(game.position);
    const piece = board[fromCoords.rank][fromCoords.file];
    
    if (!piece || piece[0] !== color || piece[1] !== 'P') {
      socket.emit('error', 'No pawn found for promotion');
      return;
    }
    
    // Check if the pawn is moving to the promotion rank
    const toRank = square[1];
    if ((color === 'w' && toRank !== '8') || (color === 'b' && toRank !== '1')) {
      socket.emit('error', 'Pawn is not moving to the promotion rank');
      return;
    }
    
    // At this point, we've validated the promotion request
    // Create a promoted piece ID that maintains the pawn's identifier
    // e.g., wPe -> wQe (keeping the file identifier)
    const promotedPieceId = color + pieceType + piece.substring(2);
    
    // Store the promotion choice in the pending move
    game.pendingMoves[colorName].promotion = pieceType;
    game.pendingMoves[colorName].promotedPieceId = promotedPieceId;
    
    console.log(`${colorName} is promoting pawn at ${square} to ${color}${pieceType}`);
    
    // Update timer status based on who has submitted moves
    checkTimerStatus(game);
    
    // Send timer update to all players
    io.to(gameId).emit('timerUpdate', game.timers);
    
    // Send confirmation back to the player
    socket.emit('promotionConfirmed', {
      square: square,
      pieceType: pieceType
    });
    
    // If both players have submitted moves, process them
    if (game.pendingMoves.white && game.pendingMoves.black) {
      // Process the moves
      const result = processMoves(game);
      
      // Reset pending moves for next round
      game.pendingMoves = { white: null, black: null };
      
      // For chess-style timer, activate both timers for the next round
      game.timers.whiteActive = true;
      game.timers.blackActive = true;
      game.timers.lastUpdate = Date.now();
      
      // Send updated board to both players
      io.to(gameId).emit('boardState', game.position);
      
      // Send game state to both players
      io.to(gameId).emit('gameState', {
        inCheck: game.inCheck,
        lastMovedPieces: game.lastMovedPieces,
        lastMoves: game.lastMoves,
        timers: game.timers,
        castlingRights: game.castlingRights,
        enPassantTarget: game.enPassantTarget,
        gameStarted: game.gameStarted,
        gameResult: result.gameResult
      });
    }
  });

  socket.on('submitMove', ({ gameId, move }) => {
    const game = games[gameId];
    if (!game) {
      socket.emit('error', 'Game not found');
      return;
    }

    const colorName = (socket.id === game.whiteId) ? 'white' : 
                      (socket.id === game.blackId) ? 'black' : null;
    if (!colorName) {
      socket.emit('error', 'You are not a player in this game');
      return;
    }
    
    // Mark the game as started when the first move is submitted
    if (!game.gameStarted) {
      game.gameStarted = true;
      io.to(gameId).emit('gameStarted', true);
    }
    
    const color = colorName === 'white' ? 'w' : 'b';
    
    // Get the current board
    const board = require('./boardUtils').positionToBoard(game.position);
    
    // Validate move
    const { from, to } = move;
    const fromCoords = require('./boardUtils').squareToCoords(from);
    
    // Check if the square has a piece
    if (!board[fromCoords.rank] || !board[fromCoords.rank][fromCoords.file]) {
      socket.emit('error', 'No piece at starting position');
      return;
    }
    
    const piece = board[fromCoords.rank][fromCoords.file];
    
    // Check if moving the correct color
    if (!piece || piece[0] !== color) {
      socket.emit('error', 'Not your piece');
      return;
    }
    
    console.log(`Player ${colorName} is moving ${piece} from ${from} to ${to}`);
    console.log(`Last moved piece for ${colorName} was: ${game.lastMovedPieces[colorName]}`);
    
    // Check "no repeating the same piece" rule with exceptions
    if (piece === game.lastMovedPieces[colorName]) {
      // Exception 1: King can move if in check
      const kingExceptionApplies = (piece[1] === 'K' && game.inCheck[colorName]);
      
      // Exception 2: King can have an extra move when in check (SyncChess variant rule)
      const kingExtraMoveApplies = (piece[1] === 'K' && game.inCheck[colorName]);
      
      // Exception 3: If there are no other valid moves available
      let hasOtherValidMoves = false;
      if (!kingExceptionApplies && !kingExtraMoveApplies) {
        // Check if any other piece can make a valid move
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const checkPiece = board[r][f];
            if (checkPiece && checkPiece[0] === color && checkPiece !== piece) {
              const checkFrom = require('./boardUtils').coordsToSquare({ rank: r, file: f });
              // Try every square on the board
              for (let tr = 0; tr < 8; tr++) {
                for (let tf = 0; tf < 8; tf++) {
                  const checkTo = require('./boardUtils').coordsToSquare({ rank: tr, file: tf });
                  // Use just the basic piece type for move validation
                  const basicPieceType = checkPiece.substring(0, 2);
                  if (isLegalMove(board, checkFrom, checkTo, basicPieceType, game)) {
                    hasOtherValidMoves = true;
                    break;
                  }
                }
                if (hasOtherValidMoves) break;
              }
            }
            if (hasOtherValidMoves) break;
          }
          if (hasOtherValidMoves) break;
        }
      }
      
      // Allow the move if any exception applies
      if (kingExceptionApplies || kingExtraMoveApplies || !hasOtherValidMoves) {
        console.log("Exception to 'no repeating piece' rule applies");
      } else {
        socket.emit('error', 'Cannot move the same piece twice in a row');
        return;
      }
    }
    
    // Basic move validation
    const basicPieceType = piece.substring(0, 2);
    if (!isLegalMove(board, from, to, basicPieceType, game)) {
      socket.emit('error', 'Illegal move');
      return;
    }
    
    // If the king is in check, verify this move actually gets out of check
    if (game.inCheck[colorName]) {
      // Make a temporary board with the intended move
      const tempBoard = JSON.parse(JSON.stringify(board));
      const toCoords = require('./boardUtils').squareToCoords(to);
      
      // Apply the move to the temporary board
      tempBoard[fromCoords.rank][fromCoords.file] = null;
      tempBoard[toCoords.rank][toCoords.file] = piece;
      
      // Check if the king is still in check after the move
      if (isInCheck(tempBoard, color)) {
        socket.emit('error', 'Your king is in check! You must make a move that resolves the check.');
        return;
      }
    }
    
    // Check for pawn promotion
    const isPawnPromotion = (piece[1] === 'P') && ((color === 'w' && to[1] === '8') || (color === 'b' && to[1] === '1'));
    if (isPawnPromotion) {
      // Store the pending move
      game.pendingMoves[colorName] = move;
      
      // Request promotion choice from the client
      socket.emit('promotionNeeded', { square: to });
      return; // Wait for the promotion choice before continuing
    }
    
    // Store the pending move
    game.pendingMoves[colorName] = move;
    socket.emit('moveAccepted', true);
    
    // Update timer status based on who has submitted moves
    checkTimerStatus(game);
    
    // Send timer update to all players
    io.to(gameId).emit('timerUpdate', game.timers);
    
    // If both players have submitted moves, process them
    if (game.pendingMoves.white && game.pendingMoves.black) {
      // Process the moves
      const result = processMoves(game);
      
      // Reset pending moves for next round
      game.pendingMoves = { white: null, black: null };
      
      // For chess-style timer, activate both timers for the next round
      game.timers.whiteActive = true;
      game.timers.blackActive = true;
      game.timers.lastUpdate = Date.now();
      
      // Send updated board to both players
      io.to(gameId).emit('boardState', game.position);
      
      // Send game state to both players
      io.to(gameId).emit('gameState', {
        inCheck: game.inCheck,
        lastMovedPieces: game.lastMovedPieces,
        lastMoves: game.lastMoves,
        timers: game.timers,
        castlingRights: game.castlingRights,
        enPassantTarget: game.enPassantTarget,
        gameStarted: game.gameStarted,
        gameResult: result.gameResult
      });
    }
  });

  socket.on('disconnect', () => {
    for (const roomId in games) {
      const game = games[roomId];
      if (game.whiteId === socket.id) {
        game.whiteId = null;
        io.to(roomId).emit('playerDisconnected', 'white');
        console.log(`⚪ White player disconnected from room ${roomId}`);
      }
      if (game.blackId === socket.id) {
        game.blackId = null;
        io.to(roomId).emit('playerDisconnected', 'black');
        console.log(`⚫ Black player disconnected from room ${roomId}`);
      }
      
      // Clean up empty games
      if (!game.whiteId && !game.blackId) {
        console.log(`🧹 Cleaning up empty room ${roomId}`);
        
        // Clear the timer interval if it exists
        if (games[roomId].timerInterval) {
          clearInterval(games[roomId].timerInterval);
        }
        delete games[roomId];
      }
    }
  });
});

// Start the server
const PORT = process.env.PORT || 3025;
server.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});