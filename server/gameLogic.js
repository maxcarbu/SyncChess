/**
 * Game logic for SyncChess
 */
const { positionToBoard, boardToPosition, squareToCoords, coordsToSquare } = require('./boardUtils');

// Check if a square is threatened by opponent pieces
function isSquareUnderAttack(board, square, attackerColor) {
  const { rank, file } = squareToCoords(square);
  
  // Check if any enemy piece can legally move to this square
  for (let r = 0; r < 8; r++) {
    for (let f = 0; f < 8; f++) {
      const piece = board[r][f];
      if (piece && piece[0] === attackerColor) {
        const fromSquare = coordsToSquare({ rank: r, file: f });
        // For move validation, we only need the basic piece type (first two characters)
        const basicPiece = piece.substring(0, 2);
        // Use a dummy game state for attack checking (no castling, en passant in attack check)
        const dummyGameState = { castlingRights: { white: {}, black: {} }, enPassantTarget: null };
        if (isLegalMove(board, fromSquare, square, basicPiece, dummyGameState)) {
          return true;
        }
      }
    }
  }
  return false;
}

// Find a king's position on the board
function findKing(board, color) {
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece[0] === color && piece[1] === 'K') {
        return coordsToSquare({ rank, file });
      }
    }
  }
  return null;
}

// Check if a king is in check
function isInCheck(board, color) {
  const kingSquare = findKing(board, color);
  if (!kingSquare) return false; // If king is not found (e.g., collision removed it), not in check
  
  const opponentColor = color === 'w' ? 'b' : 'w';
  return isSquareUnderAttack(board, kingSquare, opponentColor);
}

// Check if a move is legal according to standard chess rules
function isLegalMove(board, from, to, piece, gameState) {
  // Extract the color (w/b) and type (P/R/N/B/Q/K)
  const color = piece[0];
  const type = piece[1];
  
  const fromCoords = squareToCoords(from);
  const toCoords = squareToCoords(to);
  
  // Check if destination has a piece of the same color
  const destPiece = board[toCoords.rank][toCoords.file];
  if (destPiece && destPiece[0] === color) {
    return false; // Can't capture your own piece
  }
  
  // Calculate move delta
  const rankDiff = toCoords.rank - fromCoords.rank;
  const fileDiff = toCoords.file - fromCoords.file;
  
  // Check basic movement patterns for each piece type
  switch (type) {
    case 'P': // Pawn
      // White pawns move up (negative rank), black pawns move down (positive rank)
      const direction = color === 'w' ? -1 : 1;
      const startRank = color === 'w' ? 6 : 1;
      
      // Forward move (non-capture)
      if (fileDiff === 0 && !destPiece) {
        // Single square forward
        if (rankDiff === direction) {
          return true;
        }
        
        // Double square from starting position
        if (rankDiff === 2 * direction && fromCoords.rank === startRank) {
          // Check if path is clear
          const midRank = fromCoords.rank + direction;
          if (!board[midRank][fromCoords.file]) {
            return true;
          }
        }
      }
      
      // Regular capture moves (diagonal)
      if (Math.abs(fileDiff) === 1 && rankDiff === direction && destPiece) {
        return true;
      }
      
      // En passant capture
      if (Math.abs(fileDiff) === 1 && rankDiff === direction && !destPiece && gameState.enPassantTarget) {
        const enPassantCoords = squareToCoords(gameState.enPassantTarget);
        if (toCoords.rank === enPassantCoords.rank && toCoords.file === enPassantCoords.file) {
          return true;
        }
      }
      
      return false;
      
    case 'R': // Rook
      // Rooks move horizontally or vertically
      if (rankDiff !== 0 && fileDiff !== 0) {
        return false;
      }
      
      // Check if path is clear
      const rStep = Math.sign(rankDiff);
      const fStep = Math.sign(fileDiff);
      
      let r = fromCoords.rank + rStep;
      let f = fromCoords.file + fStep;
      
      while (r !== toCoords.rank || f !== toCoords.file) {
        if (board[r][f]) {
          return false; // Path is blocked
        }
        r += rStep;
        f += fStep;
      }
      
      return true;
      
    case 'N': // Knight
      // Knights move in an L-shape: 2 squares in one dimension and 1 in the other
      return (Math.abs(rankDiff) === 2 && Math.abs(fileDiff) === 1) ||
             (Math.abs(rankDiff) === 1 && Math.abs(fileDiff) === 2);
      
    case 'B': // Bishop
      // Bishops move diagonally
      if (Math.abs(rankDiff) !== Math.abs(fileDiff)) {
        return false;
      }
      
      // Check if path is clear
      const rDiagStep = Math.sign(rankDiff);
      const fDiagStep = Math.sign(fileDiff);
      
      let rDiag = fromCoords.rank + rDiagStep;
      let fDiag = fromCoords.file + fDiagStep;
      
      while (rDiag !== toCoords.rank && fDiag !== toCoords.file) {
        if (board[rDiag][fDiag]) {
          return false; // Path is blocked
        }
        rDiag += rDiagStep;
        fDiag += fDiagStep;
      }
      
      return true;
      
    case 'Q': // Queen
      // Queens move like rooks or bishops
      const isDiagonal = Math.abs(rankDiff) === Math.abs(fileDiff);
      const isStraight = rankDiff === 0 || fileDiff === 0;
      
      if (!isDiagonal && !isStraight) {
        return false;
      }
      
      // Check if path is clear (similar to rook and bishop combined)
      const rQStep = Math.sign(rankDiff);
      const fQStep = Math.sign(fileDiff);
      
      let rQ = fromCoords.rank + rQStep;
      let fQ = fromCoords.file + fQStep;
      
      while (rQ !== toCoords.rank || fQ !== toCoords.file) {
        if (board[rQ][fQ]) {
          return false; // Path is blocked
        }
        rQ += rQStep;
        fQ += fQStep;
      }
      
      return true;
      
    case 'K': // King
      // Normal king move (one square in any direction)
      if (Math.abs(rankDiff) <= 1 && Math.abs(fileDiff) <= 1) {
        return true;
      }
      
      // Castling (king moves two squares horizontally)
      if (rankDiff === 0 && Math.abs(fileDiff) === 2) {
        // Check castling rights
        const colorName = color === 'w' ? 'white' : 'black';
        const isKingside = fileDiff > 0;
        
        if (!gameState.castlingRights[colorName]) {
          return false;
        }
        
        if (isKingside && !gameState.castlingRights[colorName].kingSide) {
          return false;
        }
        
        if (!isKingside && !gameState.castlingRights[colorName].queenSide) {
          return false;
        }
        
        // Check if king is in check
        if (isInCheck(board, color)) {
          return false;
        }
        
        // Check if squares between king and rook are empty
        if (isKingside) {
          // Kingside castling
          if (board[fromCoords.rank][5] || board[fromCoords.rank][6]) {
            return false;
          }
          
          // Check if king passes through check
          const midSquare = coordsToSquare({ rank: fromCoords.rank, file: 5 });
          const opponentColor = color === 'w' ? 'b' : 'w';
          if (isSquareUnderAttack(board, midSquare, opponentColor)) {
            return false;
          }
        } else {
          // Queenside castling
          if (board[fromCoords.rank][1] || board[fromCoords.rank][2] || board[fromCoords.rank][3]) {
            return false;
          }
          
          // Check if king passes through check
          const midSquare = coordsToSquare({ rank: fromCoords.rank, file: 3 });
          const opponentColor = color === 'w' ? 'b' : 'w';
          if (isSquareUnderAttack(board, midSquare, opponentColor)) {
            return false;
          }
        }
        
        return true;
      }
      
      return false;
      
    default:
      return false;
  }
}

// Handle castling
function handleCastling(board, color, move) {
  const fromCoords = squareToCoords(move.from);
  const toCoords = squareToCoords(move.to);
  
  // Determine if kingside or queenside castling
  const isKingside = toCoords.file > fromCoords.file;
  
  // Set the king's position
  board[fromCoords.rank][fromCoords.file] = null; // Remove king from old position
  board[toCoords.rank][toCoords.file] = color + 'K'; // Place king in new position
  
  // Set the rook's position
  if (isKingside) {
    // Kingside castling - rook moves from h-file to f-file
    const rookFile = 7; // h-file
    const newRookFile = 5; // f-file
    
    // Get the rook piece
    const rookPiece = board[fromCoords.rank][rookFile];
    
    // Move the rook
    board[fromCoords.rank][rookFile] = null; // Remove rook from old position
    board[fromCoords.rank][newRookFile] = rookPiece; // Place rook in new position
  } else {
    // Queenside castling - rook moves from a-file to d-file
    const rookFile = 0; // a-file
    const newRookFile = 3; // d-file
    
    // Get the rook piece
    const rookPiece = board[fromCoords.rank][rookFile];
    
    // Move the rook
    board[fromCoords.rank][rookFile] = null; // Remove rook from old position
    board[fromCoords.rank][newRookFile] = rookPiece; // Place rook in new position
  }
}

// Basic checkmate detection
function isCheckmate(board, color, gameState) {
  // If not in check, it's not checkmate
  if (!isInCheck(board, color)) {
    return false;
  }
  
  // Try every possible move for every piece of this color
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      if (piece && piece[0] === color) {
        const fromSquare = coordsToSquare({ rank, file });
        
        // Try moving to every square on the board
        for (let r = 0; r < 8; r++) {
          for (let f = 0; f < 8; f++) {
            const toSquare = coordsToSquare({ rank: r, file: f });
            
            // For move validation, use just the basic piece type (first two characters)
            const basicPieceType = piece.substring(0, 2);
            
            if (isLegalMove(board, fromSquare, toSquare, basicPieceType, gameState)) {
              // Make the move on a temporary board
              const tempBoard = JSON.parse(JSON.stringify(board));
              tempBoard[rank][file] = null;
              tempBoard[r][f] = piece;
              
              // If not in check after the move, it's not checkmate
              if (!isInCheck(tempBoard, color)) {
                return false;
              }
            }
          }
        }
      }
    }
  }
  
  // If no move gets out of check, it's checkmate
  return true;
}

// Check if a player is in stalemate (no legal moves but not in check)
function isStalemate(board, color, gameState) {
  // If player is in check, it's not stalemate
  if (isInCheck(board, color)) {
    return false;
  }
  
  // Try every possible move for every piece of this color
  for (let rank = 0; rank < 8; rank++) {
    for (let file = 0; file < 8; file++) {
      const piece = board[rank][file];
      
      // Skip empty squares or opponent pieces
      if (!piece || piece[0] !== color) {
        continue;
      }
      
      const fromSquare = coordsToSquare({ rank, file });
      
      // Try moving to every square on the board
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          // Skip the piece's current square
          if (rank === r && file === f) {
            continue;
          }
          
          const toSquare = coordsToSquare({ rank: r, file: f });
          
          // Get the basic piece type (first two characters)
          const basicPieceType = piece.substring(0, 2);
          
          // Check if the move is legal
          if (isLegalMove(board, fromSquare, toSquare, basicPieceType, gameState)) {
            // Make the move on a temporary board
            const tempBoard = JSON.parse(JSON.stringify(board));
            tempBoard[rank][file] = null;
            tempBoard[r][f] = piece;
            
            // If this move doesn't leave/put the king in check, it's a valid move
            if (!isInCheck(tempBoard, color)) {
              return false; // Found at least one legal move, not stalemate
            }
          }
        }
      }
    }
  }
  
  // If we reach here, no legal moves were found
  return true;
}

// Function to check which timers should be active
function checkTimerStatus(game) {
  // If the game is over, stop all timers
  if (game.gameResult) {
    game.timers.whiteActive = false;
    game.timers.blackActive = false;
    game.timerRunning = false;
    return;
  }
  
  // If both players have submitted, neither timer is active
  if (game.pendingMoves.white && game.pendingMoves.black) {
    game.timers.whiteActive = false;
    game.timers.blackActive = false;
    return;
  }
  
  // White has submitted but not Black - only Black's timer runs
  if (game.pendingMoves.white && !game.pendingMoves.black) {
    game.timers.whiteActive = false;
    game.timers.blackActive = true;
  }
  // Black has submitted but not White - only White's timer runs
  else if (!game.pendingMoves.white && game.pendingMoves.black) {
    game.timers.whiteActive = true;
    game.timers.blackActive = false;
  }
  // Neither has submitted - both timers run
  else {
    game.timers.whiteActive = true;
    game.timers.blackActive = true;
  }
}

// Check if a king exists on the board
function doesKingExist(board, color) {
  return findKing(board, color) !== null;
}

// Process simultaneous moves
function processMoves(game) {
  const whiteMove = game.pendingMoves.white;
  const blackMove = game.pendingMoves.black;
  const board = positionToBoard(game.position);
  
  // Get starting positions
  const whitePiecePos = squareToCoords(whiteMove.from);
  const blackPiecePos = squareToCoords(blackMove.from);
  const whitePiece = board[whitePiecePos.rank][whitePiecePos.file];
  const blackPiece = board[blackPiecePos.rank][blackPiecePos.file];
  
  // Get destination coordinates
  const whiteToCoords = squareToCoords(whiteMove.to);
  const blackToCoords = squareToCoords(blackMove.to);
  
  console.log("Processing moves:");
  console.log("White move:", whiteMove.from, "to", whiteMove.to, "with piece", whitePiece);
  console.log("Black move:", blackMove.from, "to", blackMove.to, "with piece", blackPiece);
  
  // Create a new board for the result
  const newBoard = JSON.parse(JSON.stringify(board));
  
  // Reset en passant target
  game.enPassantTarget = null;
  
  // Handle promoted pieces - create new piece IDs if promotion is happening
  let promotedWhitePiece = whitePiece;
  let promotedBlackPiece = blackPiece;
  
  // Check if white is promoting
  if (whiteMove.promotion) {
    // Use the stored promotedPieceId if available, otherwise create one
    promotedWhitePiece = whiteMove.promotedPieceId || ('w' + whiteMove.promotion + whitePiece.substring(2));
    console.log(`White promoting to ${promotedWhitePiece}`);
  }
  
  // Check if black is promoting
  if (blackMove.promotion) {
    // Use the stored promotedPieceId if available, otherwise create one
    promotedBlackPiece = blackMove.promotedPieceId || ('b' + blackMove.promotion + blackPiece.substring(2));
    console.log(`Black promoting to ${promotedBlackPiece}`);
  }
  
  // Handle special cases before removing pieces from original positions
  // Check for castling (king moves 2 squares horizontally)
  if (whitePiece && whitePiece[1] === 'K' && Math.abs(whitePiecePos.file - whiteToCoords.file) === 2) {
    handleCastling(newBoard, 'w', whiteMove);
  }
  
  if (blackPiece && blackPiece[1] === 'K' && Math.abs(blackPiecePos.file - blackToCoords.file) === 2) {
    handleCastling(newBoard, 'b', blackMove);
  }
  
  // Check for en passant possibility (pawn moves 2 squares)
  if (whitePiece && whitePiece[1] === 'P' && Math.abs(whitePiecePos.rank - whiteToCoords.rank) === 2) {
    const passantSquare = coordsToSquare({
      rank: whitePiecePos.rank - 1, // One square in the direction of movement
      file: whitePiecePos.file
    });
    game.enPassantTarget = passantSquare;
  }
  
  if (blackPiece && blackPiece[1] === 'P' && Math.abs(blackPiecePos.rank - blackToCoords.rank) === 2) {
    const passantSquare = coordsToSquare({
      rank: blackPiecePos.rank + 1, // One square in the direction of movement
      file: blackPiecePos.file
    });
    game.enPassantTarget = passantSquare;
  }
  
  // Check for en passant capture
  if (whitePiece && whitePiece[1] === 'P' && Math.abs(whitePiecePos.file - whiteToCoords.file) === 1 &&
      whiteToCoords.rank === 2 && board[whiteToCoords.rank][whiteToCoords.file] === null) {
    // White is capturing en passant
    newBoard[whiteToCoords.rank + 1][whiteToCoords.file] = null; // Remove black pawn
  }
  
  if (blackPiece && blackPiece[1] === 'P' && Math.abs(blackPiecePos.file - blackToCoords.file) === 1 &&
      blackToCoords.rank === 5 && board[blackToCoords.rank][blackToCoords.file] === null) {
    // Black is capturing en passant
    newBoard[blackToCoords.rank - 1][blackToCoords.file] = null; // Remove white pawn
  }
  
  // Remove pieces from original positions (if not handled by castling)
  if (board[whitePiecePos.rank][whitePiecePos.file] === whitePiece) {
    newBoard[whitePiecePos.rank][whitePiecePos.file] = null;
  }
  
  if (board[blackPiecePos.rank][blackPiecePos.file] === blackPiece) {
    newBoard[blackPiecePos.rank][blackPiecePos.file] = null;
  }
  
  // Handle special case: "Swerving" rule
  // If a piece was about to capture, but the target moved away, no capture happens
  
  // Check for collision (both pieces moving to the same square)
  let gameResult = null;
  
  if (whiteMove.to === blackMove.to) {
    // Both pieces are removed in a collision
    console.log(`☄️ Collision at ${whiteMove.to}`);
    
    // Check if one of the pieces is a king
    if (whitePiece && whitePiece[1] === 'K') {
      // White king involved in collision, black wins
      gameResult = 'blackWins';
      console.log("White king eliminated in collision - Black wins!");
    }
    
    if (blackPiece && blackPiece[1] === 'K') {
      // Black king involved in collision, white wins
      gameResult = 'whiteWins';
      console.log("Black king eliminated in collision - White wins!");
    }
    
    // If both kings collide, it's a draw
    if (whitePiece && whitePiece[1] === 'K' && blackPiece && blackPiece[1] === 'K') {
      gameResult = 'draw';
      console.log("Both kings eliminated in collision - Draw!");
    }
  } else {
    // Handle white's move (check if black piece swerved)
    if (board[whiteToCoords.rank][whiteToCoords.file] === blackPiece &&
        blackMove.from !== blackMove.to) {
      // Black piece swerved, white's move proceeds normally
      newBoard[whiteToCoords.rank][whiteToCoords.file] = promotedWhitePiece; // Use promoted piece if applicable
    } else if (board[whiteToCoords.rank][whiteToCoords.file] === null ||
              board[whiteToCoords.rank][whiteToCoords.file][0] === 'b') {
      // Either empty square or black piece that didn't move away
      newBoard[whiteToCoords.rank][whiteToCoords.file] = promotedWhitePiece; // Use promoted piece if applicable
    }
    
    // Handle black's move (check if white piece swerved)
    if (board[blackToCoords.rank][blackToCoords.file] === whitePiece &&
        whiteMove.from !== whiteMove.to) {
      // White piece swerved, black's move proceeds normally
      newBoard[blackToCoords.rank][blackToCoords.file] = promotedBlackPiece; // Use promoted piece if applicable
    } else if (board[blackToCoords.rank][blackToCoords.file] === null ||
              board[blackToCoords.rank][blackToCoords.file][0] === 'w') {
      // Either empty square or white piece that didn't move away
      newBoard[blackToCoords.rank][blackToCoords.file] = promotedBlackPiece; // Use promoted piece if applicable
    }
  }
  
  // Update castling rights
  // Update king moved status (for castling rights)
  if (whitePiece && whitePiece[1] === 'K') {
    game.kingsMoved.white = true;
    game.castlingRights.white.kingSide = false;
    game.castlingRights.white.queenSide = false;
  }
  
  if (blackPiece && blackPiece[1] === 'K') {
    game.kingsMoved.black = true;
    game.castlingRights.black.kingSide = false;
    game.castlingRights.black.queenSide = false;
  }
  
  // Update rook moved status (for castling rights)
  if (whitePiece && whitePiece[1] === 'R') {
    if (whiteMove.from === 'a1') {
      game.rooksMoved.white.a1 = true;
      game.castlingRights.white.queenSide = false;
    } else if (whiteMove.from === 'h1') {
      game.rooksMoved.white.h1 = true;
      game.castlingRights.white.kingSide = false;
    }
  }
  
  if (blackPiece && blackPiece[1] === 'R') {
    if (blackMove.from === 'a8') {
      game.rooksMoved.black.a8 = true;
      game.castlingRights.black.queenSide = false;
    } else if (blackMove.from === 'h8') {
      game.rooksMoved.black.h8 = true;
      game.castlingRights.black.kingSide = false;
    }
  }
  
  // If a rook is captured, remove that castling right
  if (board[whiteToCoords.rank][whiteToCoords.file] &&
      board[whiteToCoords.rank][whiteToCoords.file][1] === 'R') {
    if (whiteMove.to === 'a8') game.castlingRights.black.queenSide = false;
    if (whiteMove.to === 'h8') game.castlingRights.black.kingSide = false;
  }
  
  if (board[blackToCoords.rank][blackToCoords.file] &&
      board[blackToCoords.rank][blackToCoords.file][1] === 'R') {
    if (blackMove.to === 'a1') game.castlingRights.white.queenSide = false;
    if (blackMove.to === 'h1') game.castlingRights.white.kingSide = false;
  }
  
  // Convert the board back to a position object
  const newPosition = boardToPosition(newBoard);
  
  // Update the game state
  game.position = newPosition;
  
  // Add moves to history
  game.moveHistory.push({
    white: { from: whiteMove.from, to: whiteMove.to, piece: whitePiece, promotion: whiteMove.promotion },
    black: { from: blackMove.from, to: blackMove.to, piece: blackPiece, promotion: blackMove.promotion }
  });
  
  // Save which pieces were moved last (using their unique IDs)
  // For promoted pieces, use the new piece IDs
  game.lastMovedPieces.white = promotedWhitePiece;
  game.lastMovedPieces.black = promotedBlackPiece;
  
  // Save last moves for UI highlighting
  game.lastMoves = {
    white: whiteMove,
    black: blackMove
  };
  
  // Check if kings are in check
  game.inCheck.white = isInCheck(newBoard, 'w');
  game.inCheck.black = isInCheck(newBoard, 'b');
  
  // Check if kings exist (may have been removed by collision)
  const whiteKingExists = doesKingExist(newBoard, 'w');
  const blackKingExists = doesKingExist(newBoard, 'b');
  
  // If no result from collision, check for missing kings
  if (!gameResult) {
    if (!whiteKingExists && !blackKingExists) {
      gameResult = 'draw';
      console.log("Both kings missing - Draw!");
    } else if (!whiteKingExists) {
      gameResult = 'blackWins';
      console.log("White king is missing - Black wins!");
    } else if (!blackKingExists) {
      gameResult = 'whiteWins';
      console.log("Black king is missing - White wins!");
    }
  }
  
  // If still no result, check for checkmate
  if (!gameResult) {
    if (game.inCheck.white && isCheckmate(newBoard, 'w', game)) {
      gameResult = 'blackWins';
      console.log("White is in checkmate - Black wins!");
    } else if (game.inCheck.black && isCheckmate(newBoard, 'b', game)) {
      gameResult = 'whiteWins';
      console.log("Black is in checkmate - White wins!");
    } else if (game.inCheck.white && game.inCheck.black &&
              isCheckmate(newBoard, 'w', game) && isCheckmate(newBoard, 'b', game)) {
      gameResult = 'draw';
      console.log("Both kings in checkmate - Draw!");
    }
  }
  
  // If still no result, check for stalemate
  if (!gameResult) {
    const whiteStalemated = whiteKingExists && !game.inCheck.white && isStalemate(newBoard, 'w', game);
    const blackStalemated = blackKingExists && !game.inCheck.black && isStalemate(newBoard, 'b', game);
    
    if (whiteStalemated && blackStalemated) {
      gameResult = 'draw';
      console.log("Draw by double stalemate!");
    } else if (whiteStalemated) {
      gameResult = 'draw';
      console.log("Draw by stalemate - white has no legal moves!");
    } else if (blackStalemated) {
      gameResult = 'draw';
      console.log("Draw by stalemate - black has no legal moves!");
    }
  }
  
  // Store the game result
  game.gameResult = gameResult;
  
  // If the game is over, stop all timers
  if (gameResult) {
    game.timerRunning = false;
    game.timers.whiteActive = false;
    game.timers.blackActive = false;
  }
  
  return {
    position: newPosition,
    inCheck: game.inCheck,
    gameResult: gameResult
  };
}

module.exports = {
  isLegalMove,
  isSquareUnderAttack,
  isInCheck,
  isCheckmate,
  isStalemate,
  checkTimerStatus,
  processMoves,
  doesKingExist
};