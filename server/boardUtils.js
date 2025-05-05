/**
 * Utility functions for chess board manipulation
 */

// Get starting position with unique piece IDs
function getStartingPosition() {
    const pos = {};
    
    // Initialize pawns with unique IDs (file letter)
    for (let i = 0; i < 8; i++) {
      const f = String.fromCharCode(97 + i); // 'a' to 'h'
      pos[f + '2'] = 'wP' + f;  // White pawns with file as ID
      pos[f + '7'] = 'bP' + f;  // Black pawns with file as ID
    }
    
    // Initialize back row pieces with unique IDs
    pos['a1'] = 'wR1'; // White rooks
    pos['h1'] = 'wR2';
    pos['a8'] = 'bR1'; // Black rooks
    pos['h8'] = 'bR2';
    
    pos['b1'] = 'wN1'; // White knights
    pos['g1'] = 'wN2';
    pos['b8'] = 'bN1'; // Black knights
    pos['g8'] = 'bN2';
    
    pos['c1'] = 'wB1'; // White bishops
    pos['f1'] = 'wB2';
    pos['c8'] = 'bB1'; // Black bishops
    pos['f8'] = 'bB2';
    
    pos['d1'] = 'wQ';  // White queen
    pos['e1'] = 'wK';  // White king
    pos['d8'] = 'bQ';  // Black queen
    pos['e8'] = 'bK';  // Black king
    
    return pos;
  }
  
  // Convert position object to a 2D array for easier processing
  function positionToBoard(position) {
    const board = Array(8).fill().map(() => Array(8).fill(null));
    
    Object.entries(position).forEach(([square, piece]) => {
      const file = square.charCodeAt(0) - 97; // 'a' -> 0
      const rank = 8 - parseInt(square[1]);   // '1' -> 7
      board[rank][file] = piece;
    });
    
    return board;
  }
  
  // Convert 2D array back to position object
  function boardToPosition(board) {
    const position = {};
    
    for (let rank = 0; rank < 8; rank++) {
      for (let file = 0; file < 8; file++) {
        const piece = board[rank][file];
        if (piece) {
          const square = String.fromCharCode(97 + file) + (8 - rank);
          position[square] = piece;
        }
      }
    }
    
    return position;
  }
  
  // Convert algebraic notation to coordinates
  function squareToCoords(square) {
    const file = square.charCodeAt(0) - 97; // 'a' -> 0
    const rank = 8 - parseInt(square[1]);   // '1' -> 7
    return { rank, file };
  }
  
  // Convert coordinates to algebraic notation
  function coordsToSquare(coords) {
    const { rank, file } = coords;
    return String.fromCharCode(97 + file) + (8 - rank);
  }
  
  // Create initial game state - UPDATED to include timeControl parameter
  function createGameState(timeControl = 300) {
    return {
      position: getStartingPosition(),
      whiteId: null,
      blackId: null,
      pendingMoves: { white: null, black: null },
      lastMovedPieces: { 
        white: null, // Which piece was moved last (unique ID)
        black: null
      },
      lastMoves: {
        white: null,
        black: null
      },
      inCheck: { white: false, black: false },
      // Track castling rights
      castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
      },
      // Track potential en passant targets
      enPassantTarget: null,
      // Track move history for move count
      moveHistory: [],
      // Timer settings in seconds (now configurable)
      timers: {
        timeControl: timeControl, // Store the time control setting
        white: timeControl,
        black: timeControl,
        lastUpdate: Date.now(),
        whiteActive: true,
        blackActive: true
      },
      timerRunning: false,
      gameStarted: false, // Track if the game has started
      // Track if kings have moved (for castling rights)
      kingsMoved: { white: false, black: false },
      // Track if rooks have moved (for castling rights)
      rooksMoved: { 
        white: { a1: false, h1: false },
        black: { a8: false, h8: false }
      }
    };
  }
  
  module.exports = {
    getStartingPosition,
    positionToBoard,
    boardToPosition,
    squareToCoords,
    coordsToSquare,
    createGameState
  };