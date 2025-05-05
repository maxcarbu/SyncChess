/**
 * Board manipulation functions for SyncChess
 */

// Function to normalize the position for display
// ChessboardJS expects standard piece codes (wP, bN, etc.)
function normalizeForDisplay(position) {
    const displayPos = {};
    
    // Loop through each square on the board
    for (const [square, piece] of Object.entries(position)) {
      // Extract just the basic piece type (first two characters)
      // e.g., wN1 -> wN, bPe -> bP
      const basicPiece = piece.substring(0, 2);
      displayPos[square] = basicPiece;
    }
    
    return displayPos;
  }
  
  // Update the data-piece attributes on the board
  // This allows us to store the full piece IDs in the DOM
  function updateDataPieceAttributes(position) {
    // Loop through each square on the board
    for (const [square, piece] of Object.entries(position)) {
      // Find the square element
      const $square = $(`[data-square="${square}"]`);
      if ($square.length) {
        // Set a data attribute on the square for the full piece ID
        $square.attr('data-full-piece', piece);
      }
    }
  }
  
  // Get piece from the board at a specific square
  function getPieceAt(square) {
    if (!board || !board.position) return null;
    const position = board.position();
    return position[square];
  }
  
  // Get the full piece ID (with unique identifier) from a square
  function getFullPieceAt(square) {
    const $square = $(`[data-square="${square}"]`);
    if ($square.length) {
      return $square.attr('data-full-piece');
    }
    return null;
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
  
  // Get the current board as a 2D array
  function getCurrentBoard() {
    const position = board.position();
    const boardArray = Array(8).fill().map(() => Array(8).fill(null));
    
    Object.entries(position).forEach(([square, piece]) => {
      const coords = squareToCoords(square);
      boardArray[coords.rank][coords.file] = piece;
    });
    
    return boardArray;
  }
  
  // Check if a square is threatened by opponent pieces
  function isSquareUnderAttack(boardArray, square, attackerColor) {
    const coords = squareToCoords(square);
    
    // Check pawn attacks
    const pawnDir = attackerColor === 'w' ? -1 : 1;
    const pawnRank = coords.rank - pawnDir;
    
    // Ensure pawn rank is valid
    if (pawnRank >= 0 && pawnRank < 8) {
      // Check diagonal left attack
      if (coords.file - 1 >= 0) {
        const piece = boardArray[pawnRank][coords.file - 1];
        if (piece && piece[0] === attackerColor && piece[1] === 'P') {
          return true;
        }
      }
      
      // Check diagonal right attack
      if (coords.file + 1 < 8) {
        const piece = boardArray[pawnRank][coords.file + 1];
        if (piece && piece[0] === attackerColor && piece[1] === 'P') {
          return true;
        }
      }
    }
    
    // Check knight attacks
    const knightMoves = [
      { rank: -2, file: -1 }, { rank: -2, file: 1 },
      { rank: -1, file: -2 }, { rank: -1, file: 2 },
      { rank: 1, file: -2 }, { rank: 1, file: 2 },
      { rank: 2, file: -1 }, { rank: 2, file: 1 }
    ];
    
    for (const move of knightMoves) {
      const r = coords.rank + move.rank;
      const f = coords.file + move.file;
      
      if (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const piece = boardArray[r][f];
        if (piece && piece[0] === attackerColor && piece[1] === 'N') {
          return true;
        }
      }
    }
    
    // Check king attacks (for adjacent squares)
    const kingMoves = [
      { rank: -1, file: -1 }, { rank: -1, file: 0 }, { rank: -1, file: 1 },
      { rank: 0, file: -1 }, { rank: 0, file: 1 },
      { rank: 1, file: -1 }, { rank: 1, file: 0 }, { rank: 1, file: 1 }
    ];
    
    for (const move of kingMoves) {
      const r = coords.rank + move.rank;
      const f = coords.file + move.file;
      
      if (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const piece = boardArray[r][f];
        if (piece && piece[0] === attackerColor && piece[1] === 'K') {
          return true;
        }
      }
    }
    
    // Check rook/queen attacks (horizontal and vertical)
    const rookDirs = [
      { rank: -1, file: 0 }, // up
      { rank: 1, file: 0 },  // down
      { rank: 0, file: -1 }, // left
      { rank: 0, file: 1 }   // right
    ];
    
    for (const dir of rookDirs) {
      let r = coords.rank + dir.rank;
      let f = coords.file + dir.file;
      
      while (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const piece = boardArray[r][f];
        
        if (piece) {
          if (piece[0] === attackerColor && (piece[1] === 'R' || piece[1] === 'Q')) {
            return true;
          }
          break; // Stop checking in this direction if we hit any piece
        }
        
        r += dir.rank;
        f += dir.file;
      }
    }
    
    // Check bishop/queen attacks (diagonals)
    const bishopDirs = [
      { rank: -1, file: -1 }, // up-left
      { rank: -1, file: 1 },  // up-right
      { rank: 1, file: -1 },  // down-left
      { rank: 1, file: 1 }    // down-right
    ];
    
    for (const dir of bishopDirs) {
      let r = coords.rank + dir.rank;
      let f = coords.file + dir.file;
      
      while (r >= 0 && r < 8 && f >= 0 && f < 8) {
        const piece = boardArray[r][f];
        
        if (piece) {
          if (piece[0] === attackerColor && (piece[1] === 'B' || piece[1] === 'Q')) {
            return true;
          }
          break; // Stop checking in this direction if we hit any piece
        }
        
        r += dir.rank;
        f += dir.file;
      }
    }
    
    return false;
  }
  
  // Check if the king would be in check after a move
  function wouldKingBeInCheck(sourceSquare, targetSquare) {
    // Get the current board state
    const boardArray = getCurrentBoard();
    
    // Get info about the moving piece
    const piece = getPieceAt(sourceSquare);
    if (!piece) return false;
    
    const pieceColor = piece.charAt(0);
    const pieceType = piece.charAt(1);
    
    // Get the coordinates
    const sourceCoords = squareToCoords(sourceSquare);
    const targetCoords = squareToCoords(targetSquare);
    
    // Make a copy of the board to simulate the move
    const tempBoard = JSON.parse(JSON.stringify(boardArray));
    
    // Remove the piece from its original position
    tempBoard[sourceCoords.rank][sourceCoords.file] = null;
    
    // Place the piece at the target position
    tempBoard[targetCoords.rank][targetCoords.file] = piece;
    
    // Find the king's position
    let kingSquare;
    
    // If we're moving the king, use the target square
    if (pieceType === 'K') {
      kingSquare = targetSquare;
    } else {
      // Otherwise, find the king on the board
      for (let r = 0; r < 8; r++) {
        for (let f = 0; f < 8; f++) {
          const p = tempBoard[r][f];
          if (p && p[0] === pieceColor && p[1] === 'K') {
            kingSquare = coordsToSquare({ rank: r, file: f });
            break;
          }
        }
        if (kingSquare) break;
      }
    }
    
    if (!kingSquare) return false; // No king found (shouldn't happen)
    
    // Check if the king is under attack
    const opponentColor = pieceColor === 'w' ? 'b' : 'w';
    return isSquareUnderAttack(tempBoard, kingSquare, opponentColor);
  }
  
  // Simplified client-side validation including king check
  function isClientValidMove(source, target) {
    // Get the basic piece type (for display)
    const piece = getPieceAt(source);
    if (!piece) return false;
    
    // Get color
    const pieceColor = piece.charAt(0);
    
    // Make sure it's the player's piece
    if ((myColor === 'white' && pieceColor !== 'w') || 
        (myColor === 'black' && pieceColor !== 'b')) {
      return false;
    }
    
    // Get the full piece ID with unique identifier
    const fullPiece = getFullPieceAt(source);
    
    // Check "no repeating the same piece" rule
    if (lastMovedPiece && fullPiece === lastMovedPiece) {
      // Exception: Kings can move again if in check
      if (inCheck && fullPiece.includes('K')) {
        // Still need to check if king would be in check after move
        if (wouldKingBeInCheck(source, target)) {
          updateStatus('Cannot move into check!', true);
          return false;
        }
        return true;
      }
      
      // No other piece can move twice in a row
      updateStatus('Cannot move the same piece twice in a row', true);
      return false;
    }
    
    // Check if the destination has one of our own pieces
    const targetPiece = getPieceAt(target);
    if (targetPiece && targetPiece.charAt(0) === pieceColor) {
      return false;
    }
    
    // Kings cannot move into check
    if (piece.charAt(1) === 'K' && wouldKingBeInCheck(source, target)) {
      updateStatus('Cannot move into check!', true);
      return false;
    }
    
    // For all other pieces, check if the move would leave the king in check
    if (wouldKingBeInCheck(source, target)) {
      updateStatus('This move would leave your king in check!', true);
      return false;
    }
    
    // All other validation will be done on the server
    return true;
  }
  
  // Highlight valid moves for a piece
  function highlightValidMoves(source) {
    // Clear all highlights first
    clearHighlights();
    
    // Get the piece at the source square
    const piece = getPieceAt(source);
    if (!piece) return;
    
    // Highlight the source square
    $(`[data-square="${source}"]`).addClass('highlight-square');
    
    // If this is the king, also highlight castling options if available
    if (piece.includes('K')) {
      const rank = myColor === 'white' ? '1' : '8';
      
      // Check kingside castling
      if ((myColor === 'white' && castlingRights.white.kingSide) || 
          (myColor === 'black' && castlingRights.black.kingSide)) {
        const kingsideDest = `g${rank}`;
        // Check if castling would put king in check
        if (!wouldKingBeInCheck(source, kingsideDest)) {
          $(`[data-square="${kingsideDest}"]`).addClass('highlight-square');
        }
      }
      
      // Check queenside castling
      if ((myColor === 'white' && castlingRights.white.queenSide) || 
          (myColor === 'black' && castlingRights.black.queenSide)) {
        const queensideDest = `c${rank}`;
        // Check if castling would put king in check
        if (!wouldKingBeInCheck(source, queensideDest)) {
          $(`[data-square="${queensideDest}"]`).addClass('highlight-square');
        }
      }
    }
    
    // If this is a pawn and there's an en passant target, highlight it
    if (piece.includes('P') && enPassantTarget) {
      // Check if this pawn can capture en passant
      const sourceFile = source.charAt(0);
      const sourceRank = parseInt(source.charAt(1));
      const targetFile = enPassantTarget.charAt(0);
      const targetRank = parseInt(enPassantTarget.charAt(1));
      
      // En passant is only possible if the pawn is on the correct rank and adjacent file
      if ((myColor === 'white' && sourceRank === 5 && Math.abs(sourceFile.charCodeAt(0) - targetFile.charCodeAt(0)) === 1) ||
          (myColor === 'black' && sourceRank === 4 && Math.abs(sourceFile.charCodeAt(0) - targetFile.charCodeAt(0)) === 1)) {
        
        // Check if en passant would leave king in check
        if (!wouldKingBeInCheck(source, enPassantTarget)) {
          $(`[data-square="${enPassantTarget}"]`).addClass('en-passant-target');
        }
      }
    }
  }
  
  // Clear all highlighted squares
  function clearHighlights() {
    $('.highlight-square').removeClass('highlight-square');
    $('.en-passant-target').removeClass('en-passant-target');
  }
  
  // Display the last moves made by both players
  function showLastMoves() {
    // Clear any previous highlights
    $('.last-move').removeClass('last-move');
    
    // Highlight white's last move
    if (lastMoves.white) {
      $(`[data-square="${lastMoves.white.from}"]`).addClass('last-move');
      $(`[data-square="${lastMoves.white.to}"]`).addClass('last-move');
    }
    
    // Highlight black's last move
    if (lastMoves.black) {
      $(`[data-square="${lastMoves.black.from}"]`).addClass('last-move');
      $(`[data-square="${lastMoves.black.to}"]`).addClass('last-move');
    }
  }
  
  // Prevent dragging pieces before game is ready or if it's not your piece
  function onDragStart(source, piece) {
    // Don't allow dragging if the game is not ready
    if (!gameReady) {
      return false;
    }
    
    // Don't allow dragging if a move is already submitted
    if (moveSubmitted) {
      return false;
    }
    
    // Only allow dragging own pieces
    const pieceColor = piece.charAt(0);
    if ((myColor === 'white' && pieceColor !== 'w') || 
        (myColor === 'black' && pieceColor !== 'b')) {
      return false;
    }
    
    // Get the full piece ID from the square
    const fullPiece = getFullPieceAt(source);
    
    // Check "no repeating the same piece" rule
    if (lastMovedPiece && fullPiece === lastMovedPiece) {
      // Exception: Kings can move again if in check
      if (inCheck && fullPiece.includes('K')) {
        console.log("King in check - allowing repeat move");
        highlightValidMoves(source);
        return true;
      }
      
      // Show an error message and don't allow the drag
      updateStatus('Cannot move the same piece twice in a row', true);
      return false;
    }
    
    // Show valid moves when dragging starts
    highlightValidMoves(source);
    
    return true;
  }
  
  // Handle dropped pieces
  function onDrop(source, target) {
    // Clear highlights
    clearHighlights();
    
    // If same square, snap back
    if (source === target) {
      return 'snapback';
    }
    
    // Check if target is a valid square
    if (target.match(/^[a-h][1-8]$/) === null) {
      return 'snapback';
    }
    
    // Check basic validity - this now includes king check validation
    if (!isClientValidMove(source, target)) {
      return 'snapback';
    }
    
    // At this point, we'll allow the move on the client side
    // Store the selected move
    selectedMove = { from: source, to: target };
    
    // Enable submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = false;
    }
    
    // Update status
    updateStatus(`Move selected: ${source} to ${target}. Click Submit when ready.`);
    
    return true;
  }
  
  // After a piece snaps to its new position
  function onSnapEnd() {
    // If we've selected a valid move, highlight it
    if (selectedMove) {
      $(`[data-square="${selectedMove.from}"]`).addClass('highlight-square');
      $(`[data-square="${selectedMove.to}"]`).addClass('highlight-square');
    }
  }