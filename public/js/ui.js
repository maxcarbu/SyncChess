/**
 * UI update functions for SyncChess
 */

// Update status message
function updateStatus(message, isError = false) {
    const statusDiv = document.getElementById('status');
    if (!statusDiv) return;
    
    statusDiv.textContent = message;
    
    if (isError) {
      statusDiv.classList.add('error');
      statusDiv.classList.remove('success');
      setTimeout(() => {
        statusDiv.classList.remove('error');
      }, 3000);
    } else {
      statusDiv.classList.remove('error');
    }
  }
  
  // Update check status display
  function updateCheckStatus(inCheckState) {
    const whiteStatus = document.getElementById('white-check-status');
    const blackStatus = document.getElementById('black-check-status');
    
    if (!whiteStatus || !blackStatus) return;
    
    whiteStatus.textContent = inCheckState.white ? "White: IN CHECK" : "White: Safe";
    blackStatus.textContent = inCheckState.black ? "Black: IN CHECK" : "Black: Safe";
    
    if (inCheckState.white) {
      whiteStatus.classList.add('status-active');
    } else {
      whiteStatus.classList.remove('status-active');
    }
    
    if (inCheckState.black) {
      blackStatus.classList.add('status-active');
    } else {
      blackStatus.classList.remove('status-active');
    }
  }
  
  // Update player info
  function updatePlayerInfo() {
    const whiteStatus = document.getElementById('white-status');
    const blackStatus = document.getElementById('black-status');
    
    if (!whiteStatus || !blackStatus) return;
    
    if (myColor === 'white') {
      whiteStatus.textContent = 'You';
      document.getElementById('player-white').classList.add('active');
    } else if (myColor === 'black') {
      blackStatus.textContent = 'You';
      document.getElementById('player-black').classList.add('active');
    }
  }
  
  // Format time for display
  function formatTime(seconds) {
    // Handle infinite time (no time limit)
    if (seconds === 0 && timers.timeControl === 0) {
      return '∞'; // Infinity symbol for no time limit
    }
    
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }
  
  // Update timers display
  function updateTimerDisplay() {
    const whiteTimer = document.getElementById('white-timer');
    const blackTimer = document.getElementById('black-timer');
    
    if (!whiteTimer || !blackTimer) return;
    
    whiteTimer.textContent = formatTime(timers.white);
    blackTimer.textContent = formatTime(timers.black);
    
    // Show active/inactive timers
    if (timers.whiteActive) {
      whiteTimer.classList.add('timer-active');
      whiteTimer.classList.remove('timer-inactive');
    } else {
      whiteTimer.classList.remove('timer-active');
      whiteTimer.classList.add('timer-inactive');
    }
    
    if (timers.blackActive) {
      blackTimer.classList.add('timer-active');
      blackTimer.classList.remove('timer-inactive');
    } else {
      blackTimer.classList.remove('timer-active');
      blackTimer.classList.add('timer-inactive');
    }
    
    // Highlight low time (less than 30 seconds)
    if (timers.white < 30) {
      whiteTimer.classList.add('timer-low');
    } else {
      whiteTimer.classList.remove('timer-low');
    }
    
    if (timers.black < 30) {
      blackTimer.classList.add('timer-low');
    } else {
      blackTimer.classList.remove('timer-low');
    }
  }
  
  // Generate a random room ID
  function generateRoomId() {
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += characters.charAt(Math.floor(Math.random() * characters.length));
    }
    return result;
  }
  
  // Copy room ID to clipboard
  function copyRoomId() {
    const roomIdElement = document.getElementById('room-id');
    if (!roomIdElement) return;
    
    const roomId = roomIdElement.textContent;
    
    navigator.clipboard.writeText(window.location.href).then(() => {
      // Show success message
      const copyBtn = document.getElementById('copy-btn');
      if (copyBtn) {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = 'Copied!';
        setTimeout(() => {
          copyBtn.textContent = originalText;
        }, 2000);
      }
      updateStatus('Game link copied to clipboard!', false);
    }).catch(() => {
      updateStatus('Failed to copy. Try selecting and copying the URL manually.', true);
    });
  }
  
  // Update time control info display
  function updateTimeControlInfo(timeControl) {
    // Format time control for display
    let timeControlText = '';
    
    if (timeControl === 0) {
      timeControlText = 'No time limit';
    } else if (timeControl < 60) {
      timeControlText = `${timeControl} seconds per player`;
    } else if (timeControl < 3600) {
      const minutes = Math.floor(timeControl / 60);
      timeControlText = `${minutes} minute${minutes !== 1 ? 's' : ''} per player`;
    } else {
      const hours = Math.floor(timeControl / 3600);
      timeControlText = `${hours} hour${hours !== 1 ? 's' : ''} per player`;
    }
    
    // Update time setting display
    const whiteTimerElement = document.getElementById('white-timer');
    
    if (whiteTimerElement) {
      const timeSettingDisplay = document.createElement('div');
      timeSettingDisplay.className = 'time-setting-display';
      timeSettingDisplay.textContent = timeControlText;
      
      // Remove any existing time setting display
      const existingDisplay = whiteTimerElement.parentNode.querySelector('.time-setting-display');
      if (existingDisplay) {
        existingDisplay.remove();
      }
      
      whiteTimerElement.parentNode.insertBefore(timeSettingDisplay, whiteTimerElement.nextSibling);
    }
  }
  
  // Display game result with stalemate detection
  function showGameResult(result) {
    const resultElement = document.getElementById('game-result');
    if (!resultElement) return;
    
    // Clear previous result
    resultElement.className = '';
    
    switch (result) {
      case 'whiteWins':
        resultElement.textContent = 'White wins by checkmate!';
        resultElement.className = 'game-result white-wins';
        
        // Play victory sound for white, defeat for black
        if (myColor === 'white') {
          playSound('victory');
        } else {
          playSound('defeat');
        }
        break;
      case 'blackWins':
        resultElement.textContent = 'Black wins by checkmate!';
        resultElement.className = 'game-result black-wins';
        
        // Play victory sound for black, defeat for white
        if (myColor === 'black') {
          playSound('victory');
        } else {
          playSound('defeat');
        }
        break;
      case 'draw':
        // Check if this is a stalemate (only if we have inCheck info)
        if (game && game.inCheck) {
          if (game.inCheck.white && game.inCheck.black) {
            resultElement.textContent = 'Draw! Both kings are in checkmate.';
          } else if (!game.inCheck.white && !game.inCheck.black) {
            resultElement.textContent = 'Draw by stalemate! Neither player can make a legal move.';
          } else if (!game.inCheck.white) {
            resultElement.textContent = 'Draw by stalemate! White has no legal moves.';
          } else if (!game.inCheck.black) {
            resultElement.textContent = 'Draw by stalemate! Black has no legal moves.';
          }
        } else {
          // Fallback if we don't have check info
          resultElement.textContent = 'The game is a draw!';
        }
        resultElement.className = 'game-result draw';
        playSound('draw');
        break;
      case 'whiteTimeout':
        resultElement.textContent = 'Black wins on time!';
        resultElement.className = 'game-result black-wins';
        
        // Play appropriate sound based on player color
        if (myColor === 'black') {
          playSound('victory');
        } else {
          playSound('defeat');
        }
        break;
      case 'blackTimeout':
        resultElement.textContent = 'White wins on time!';
        resultElement.className = 'game-result white-wins';
        
        // Play appropriate sound based on player color
        if (myColor === 'white') {
          playSound('victory');
        } else {
          playSound('defeat');
        }
        break;
      default:
        resultElement.textContent = '';
        resultElement.className = '';
        return;
    }
    
    // Show the result area
    resultElement.style.display = 'block';
    
    // Disable the submit button
    const submitBtn = document.getElementById('submitBtn');
    if (submitBtn) {
      submitBtn.disabled = true;
    }
    
    // Show a new game button
    const newGameBtn = document.getElementById('new-game-btn');
    if (newGameBtn) {
      newGameBtn.style.display = 'block';
    }
  }