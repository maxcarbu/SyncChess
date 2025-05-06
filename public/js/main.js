/**
 * Main client-side logic for SyncChess
 */

let socket;
let board;
let myColor = null;
let selectedMove = null;
let lastMovedPiece = null; // This will store the unique piece identifier
let inCheck = false;
let gameReady = false;
let moveSubmitted = false;
let lastMoves = { white: null, black: null };
let castlingRights = {
  white: { kingSide: true, queenSide: true },
  black: { kingSide: true, queenSide: true }
};
let enPassantTarget = null;
let roomId = null;

let timers = {
  timeControl: 300, // Default 5 minutes
  white: 300,
  black: 300,
  whiteActive: true,
  blackActive: true
};

// Sound system
const sounds = {
  move: new Audio('/sounds/move.mp3'),
  capture: new Audio('/sounds/capture.mp3'),
  check: new Audio('/sounds/check.mp3'),
  victory: new Audio('/sounds/victory.mp3'),
  defeat: new Audio('/sounds/defeat.mp3'),
  draw: new Audio('/sounds/draw.mp3'),
  promotion: new Audio('/sounds/promotion.mp3')
};

function playSound(soundName) {
  // Check if sound exists and if sound is enabled
  if (sounds[soundName] && !localStorage.getItem('soundsDisabled')) {
    // Reset the sound to the beginning and play it
    sounds[soundName].currentTime = 0;
    sounds[soundName].play().catch(err => {
      // Ignore autoplay errors - browsers may block sounds until user interaction
      console.log('Sound play error:', err);
    });
  }
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
  // Get room ID and time control from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  roomId = urlParams.get('room');
  const timeControlParam = urlParams.get('timeControl');
  
  if (!roomId) {
    // If no room ID provided, redirect back to home page
    window.location.href = '/';
    return;
  }
  
  // Initialize with default or specified time control
  if (timeControlParam) {
    timers.timeControl = parseInt(timeControlParam);
    timers.white = timers.timeControl;
    timers.black = timers.timeControl;
  }
  
  // Display room ID
  const roomIdElement = document.getElementById('room-id');
  if (roomIdElement) {
    roomIdElement.textContent = roomId;
  }
  
  // Show rules if requested
  if (urlParams.get('rules') === 'show') {
    const rulesContent = document.getElementById('rules-content');
    if (rulesContent) {
      rulesContent.style.display = 'block';
    }
  }
  
  // Initialize the socket connection
  initSocketConnection();
  
  // Initialize the chessboard
  initChessboard();
  
  // Add event listeners to buttons
  setupEventListeners();
  
  // Initialize timer display
  updateTimerDisplay();
  updateTimeControlInfo(timers.timeControl);
  
  // Set initial status message
  updateStatus('Waiting for both players to join...', false);
});

// Initialize socket.io connection
function initSocketConnection() {
  socket = io(window.location.origin);
  
  socket.on('connect', () => {
    console.log('Connected to server');
    // Join a game room with time control parameter
    socket.emit('joinGame', {
      roomId: roomId,
      timeControl: timers.timeControl
    });
  });
  
  // Socket event handlers
  setupSocketHandlers();
}

// Helper function to get piece name from code
function getPieceName(pieceType) {
  switch (pieceType) {
    case 'Q': return 'Queen';
    case 'R': return 'Rook';
    case 'B': return 'Bishop';
    case 'N': return 'Knight';
    default: return pieceType;
  }
}

// Function to reset and redraw the board from a position
function resetBoardFromPosition(position) {
  if (!board || !position) return;
  
  // Create a normalized position for display
  const displayPos = normalizeForDisplay(position);
  
  // Temporarily clear the board completely first
  board.position('clear', false); // false means no animation
  
  // Then set the new position
  board.position(displayPos, false); // false means no animation
  
  // After updating the board, set the full piece IDs as data attributes
  // This helps track unique pieces for the game rules
  setTimeout(() => {
    updateDataPieceAttributes(position);
    
    // Show last moves after board is updated
    showLastMoves();
    
    // If there's an en passant target, highlight it
    if (enPassantTarget) {
      $(`[data-square="${enPassantTarget}"]`).addClass('en-passant-target');
    }
  }, 10);
}

// Set up all the socket event handlers
function setupSocketHandlers() {
  socket.on('playerColor', (color) => {
    console.log('🎨 Assigned color:', color);
    myColor = color;
    board.orientation(color === 'white' ? 'white' : 'black');
    updatePlayerInfo();
  });
  
  socket.on('boardState', (pos) => {
    console.log("New board state received:", pos);
    
    // Use the new reset function to completely refresh the board
    // This prevents visual artifacts from previous states
    resetBoardFromPosition(pos);
  });
  
  socket.on('gameReady', (ready) => {
    gameReady = ready;
    if (ready) {
      updateStatus('Game ready! Both players connected. Make your move.');
    } else {
      updateStatus('Waiting for both players to join...');
    }
  });
  
  socket.on('gameState', (state) => {
    // Update check status for both players
    if (state.inCheck) {
      updateCheckStatus(state.inCheck);
      
      // Update local check status
      if (myColor) {
        inCheck = state.inCheck[myColor];
        
        // Show check indicator on my board if I'm in check
        const checkIndicator = document.getElementById('check-indicator');
        if (checkIndicator) {
          if (inCheck) {
            checkIndicator.style.display = 'flex';
            updateStatus('CHECK! You must get your king out of check.', true);
            playSound('check');
          } else {
            checkIndicator.style.display = 'none';
          }
        }
      }
    }
    
    // Update last moved pieces
    if (state.lastMovedPieces) {
      if (myColor) {
        lastMovedPiece = state.lastMovedPieces[myColor];
        console.log("Received last moved piece:", lastMovedPiece);
      }
    }
    
    // Update last moves
    if (state.lastMoves) {
      lastMoves = state.lastMoves;
      showLastMoves();
    }
    
    // Update castling rights
    if (state.castlingRights) {
      castlingRights = state.castlingRights;
      console.log("Castling rights updated:", castlingRights);
    }
    
    // Update en passant target
    if ('enPassantTarget' in state) {
      enPassantTarget = state.enPassantTarget;
      console.log("En passant target updated:", enPassantTarget);
    }
    
    // Update timers if provided
    if (state.timers) {
      timers = state.timers;
      updateTimerDisplay();
    }
    
    // Update game started status
    if (state.gameStarted) {
      document.dispatchEvent(new Event('gameStarted'));
    }
    
    // Handle game result
    if (state.gameResult) {
      showGameResult(state.gameResult);
      gameReady = false;
    }
    
    // Reset move submitted flag
    moveSubmitted = false;
    
    // Enable/disable submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = !selectedMove || state.gameResult;
    }
    
    // If no special message has been shown (like check or game result)
    // and the game has started but we have no message, set a default one
    if (!inCheck && !state.gameResult && state.gameStarted) {
      if (document.getElementById('status').textContent === 'Waiting for both players to join...') {
        updateStatus('Your turn! Select a piece to move.', false);
      }
    }
  });
  
  socket.on('timerUpdate', (updatedTimers) => {
    timers = updatedTimers;
    updateTimerDisplay();
  });
  
  socket.on('gameStarted', () => {
    // Disable settings when game starts
    const applySettingsBtn = document.getElementById('apply-settings');
    if (applySettingsBtn) {
      applySettingsBtn.disabled = true;
    }
    
    const timeControlSelect = document.getElementById('time-control');
    if (timeControlSelect) {
      timeControlSelect.disabled = true;
    }
    
    updateStatus('Game has started. Settings are now locked.', false);
  });
  
  socket.on('settingsUpdated', (settings) => {
    console.log('Game settings updated:', settings);
    
    // Update UI to reflect new settings
    if (settings.timeControl !== undefined) {
      // Update the time control display
      timers.timeControl = parseInt(settings.timeControl);
      
      // If timers are provided in settings, use those values directly
      if (settings.timers) {
        timers = settings.timers;
      } else {
        // Otherwise set both timers to the new time control
        timers.white = timers.timeControl;
        timers.black = timers.timeControl;
      }
      
      // Update timer display
      updateTimerDisplay();
      
      // Show time control info
      updateTimeControlInfo(timers.timeControl);
      
      updateStatus('Game settings updated', false);
    }
  });
  
  socket.on('error', (message) => {
    // Handle error messages from the server
    console.error('Server error:', message);
    updateStatus(message, true);
    
    // Reset selected move
    selectedMove = null;
    
    // Disable submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
    
    // Clear any highlights
    clearHighlights();
  });
  
  socket.on('moveAccepted', () => {
    updateStatus('Move submitted. Waiting for opponent...', false);
    playSound('move');
  });
  
  socket.on('playerDisconnected', (color) => {
    updateStatus(`${color} player disconnected. Waiting for them to reconnect...`, true);
    gameReady = false;
  });
  
  // Add handler for pawn promotion
  socket.on('promotionNeeded', (data) => {
    const square = data.square;
    
    // Create a promotion dialog
    showPromotionDialog(square);
  });
  
  // Updated handler for promotion confirmation
  socket.on('promotionConfirmed', (data) => {
    // Don't add a visual representation here - wait for the boardState update
    // Just provide user feedback 
    updateStatus(`Promoting to ${getPieceName(data.pieceType)}. Waiting for opponent...`, false);
    
    // Play promotion sound
    playSound('promotion');
  });
}

// Initialize the chessboard
function initChessboard() {
  const config = {
    draggable: true,
    position: 'start',
    pieceTheme: 'https://chessboardjs.com/img/chesspieces/wikipedia/{piece}.png',
    onDragStart: onDragStart,
    onDrop: onDrop,
    onSnapEnd: onSnapEnd
  };
  
  board = Chessboard('board', config);
  
  // Handle window resize
  window.addEventListener('resize', () => {
    board.resize();
  });
}

// Set up all button event listeners
function setupEventListeners() {
  // Submit move button
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.addEventListener('click', submitMove);
  }
  
  // Reset game button
  const resetBtn = document.getElementById('resetBtn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      window.location.href = window.location.href;
    });
  }
  
  // Toggle rules button
  const rulesBtn = document.getElementById('rules-btn');
  const rulesContent = document.getElementById('rules-content');
  
  if (rulesBtn && rulesContent) {
    rulesBtn.addEventListener('click', () => {
      rulesContent.style.display = rulesContent.style.display === 'none' ? 'block' : 'none';
    });
  }
  
  // Copy room ID button
  const copyBtn = document.getElementById('copy-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', copyRoomId);
  }
  
  // New game button
  const newGameBtn = document.getElementById('new-game-btn');
  if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
      window.location.href = '/';
    });
  }
  
  // Apply settings button
  const applySettingsBtn = document.getElementById('apply-settings');
  if (applySettingsBtn) {
    applySettingsBtn.addEventListener('click', applyGameSettings);
  }
  
  // Sound toggle button
  const soundToggleBtn = document.getElementById('sound-toggle');
  if (soundToggleBtn) {
    // Set initial state based on localStorage
    const soundsDisabled = localStorage.getItem('soundsDisabled');
    soundToggleBtn.textContent = soundsDisabled ? 'Sound Off' : 'Sound On';
    soundToggleBtn.classList.toggle('inactive', soundsDisabled);
    
    soundToggleBtn.addEventListener('click', () => {
      const currentlyDisabled = localStorage.getItem('soundsDisabled');
      if (currentlyDisabled) {
        localStorage.removeItem('soundsDisabled');
        soundToggleBtn.textContent = 'Sound On';
        soundToggleBtn.classList.remove('inactive');
      } else {
        localStorage.setItem('soundsDisabled', 'true');
        soundToggleBtn.textContent = 'Sound Off';
        soundToggleBtn.classList.add('inactive');
      }
    });
  }
  
  // Settings button
  const settingsBtn = document.getElementById('settings-btn');
  const settingsPanel = document.getElementById('settings-panel');
  
  if (settingsBtn && settingsPanel) {
    settingsBtn.addEventListener('click', () => {
      settingsPanel.style.display = settingsPanel.style.display === 'none' ? 'block' : 'none';
    });
  }
  
  // Hide settings panel when game starts
  document.addEventListener('gameStarted', () => {
    if (settingsPanel) {
      settingsPanel.style.display = 'none';
    }
  });
  
  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    // Submit move with Enter key
    if (e.key === 'Enter' && submitBtn && !submitBtn.disabled) {
      submitBtn.click();
    }
    
    // Show/hide rules with 'R' key
    if ((e.key === 'r' || e.key === 'R') && rulesBtn) {
      rulesBtn.click();
    }
  });
}

// Toggle rules display - legacy support
function toggleRules() {
  const rulesContent = document.getElementById('rules-content');
  if (rulesContent) {
    rulesContent.style.display = rulesContent.style.display === 'none' ? 'block' : 'none';
  }
}

// Submit move to server
function submitMove() {
  if (!selectedMove) {
    return updateStatus("Select a move first!", true);
  }
  
  socket.emit('submitMove', {
    gameId: roomId,
    move: selectedMove
  });
  
  // The server will update the timer states and send back the updated status
  moveSubmitted = true;
  
  // Disable submit button
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
  }
  
  // Save the move for display
  if (myColor === 'white') {
    lastMoves.white = selectedMove;
  } else {
    lastMoves.black = selectedMove;
  }
  
  // Clear selected move
  selectedMove = null;
  
  // Clear highlights
  clearHighlights();
  
  updateStatus('Move submitted. Waiting for opponent...');
}

// Apply game settings
function applyGameSettings() {
  const timeControlSelect = document.getElementById('time-control');
  if (!timeControlSelect) return;
  
  const timeControl = timeControlSelect.value;
  
  // Send settings update to server
  socket.emit('updateSettings', {
    gameId: roomId,
    settings: {
      timeControl: timeControl
    }
  });
  
  updateStatus('Settings applied. Waiting for game to start...', false);
}

// Show promotion dialog - FIXED
function showPromotionDialog(square) {
  // Disable the submit button while promoting
  const submitBtn = document.getElementById('submitBtn');
  if (submitBtn) {
    submitBtn.disabled = true;
  }
  
  // Create a modal overlay for promotion selection
  const overlay = document.createElement('div');
  overlay.className = 'promotion-overlay';
  
  // Create promotion dialog
  const dialog = document.createElement('div');
  dialog.className = 'promotion-dialog';
  
  // Add title
  const title = document.createElement('h3');
  title.textContent = 'Choose Promotion Piece';
  dialog.appendChild(title);
  
  // Add piece options with images for better UX
  const pieces = ['Queen', 'Rook', 'Knight', 'Bishop'];
  const pieceCodes = ['Q', 'R', 'N', 'B'];
  const buttonContainer = document.createElement('div');
  buttonContainer.className = 'promotion-buttons';
  
  pieces.forEach((piece, index) => {
    const button = document.createElement('button');
    
    // Create a piece image for the button
    const img = document.createElement('img');
    img.src = `https://chessboardjs.com/img/chesspieces/wikipedia/${myColor.charAt(0)}${pieceCodes[index]}.png`;
    img.alt = piece;
    img.className = 'promotion-piece-img';
    
    button.appendChild(img);
    button.className = 'promotion-btn';
    button.title = piece;
    
    button.addEventListener('click', () => {
      // Send promotion choice to server
      socket.emit('promotePawn', {
        gameId: roomId,
        square: square,
        pieceType: pieceCodes[index]
      });
      
      // Remove overlay
      document.body.removeChild(overlay);
      
      // Reset move submitted flag, since the server will handle the move completion
      moveSubmitted = true;
      
      // Update status
      updateStatus(`Promotion choice submitted: ${piece}. Waiting for server confirmation...`);
    });
    
    buttonContainer.appendChild(button);
  });
  
  dialog.appendChild(buttonContainer);
  overlay.appendChild(dialog);
  document.body.appendChild(overlay);
}