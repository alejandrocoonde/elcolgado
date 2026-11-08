let gameData = null;
let currentOfficialDay = 1;
let playingDay = null;
let currentStreak = 0;
let currentReviewDay = null; 

// Estado en LocalStorage
let savedState = JSON.parse(localStorage.getItem('colgadoState')) || {
  history: {}, 
  activeSession: null 
};

// Variables de partida
const maxFails = 6;
let targetWord = "";
let guessedLetters = [];
let fails = 0;
let hints = { def: false, let: false };

// Elementos DOM
const archiveView = document.getElementById('archive-view');
const gameView = document.getElementById('game-view');
const reviewView = document.getElementById('review-view');
const statsView = document.getElementById('stats-view');

const wordContainer = document.getElementById('word-container');
const kbdContainer = document.getElementById('keyboard');
const hintDisplay = document.getElementById('hint-display');
const btnHintDef = document.getElementById('btn-hint-def');
const btnHintLet = document.getElementById('btn-hint-let');
const actionBtn = document.getElementById('action-btn');
const livesDisplay = document.getElementById('lives-display');

// Elementos Arte
const playerSprite = document.getElementById('player-sprite');
const playerHand = document.getElementById('player-hand');
const rope = document.querySelector('.rope');
const platform = document.querySelector('.platform');

// 1. Inicialización
fetch('datos.json')
  .then(res => {
    if (!res.ok) throw new Error('Error de red');
    return res.json();
  })
  .then(data => {
    gameData = data;
    if (gameData && gameData.fecha_inicio) {
      const startDate = new Date(gameData.fecha_inicio + "T00:00:00").getTime();
      const today = new Date();
      today.setHours(0,0,0,0);
      const dayDiff = Math.floor((today.getTime() - startDate) / (1000 * 60 * 60 * 24));
      
      currentOfficialDay = Math.max(1, dayDiff + 1);
      calculateStreak();
      renderArchive();
      initCountdown();
    }
  })
  .catch(error => {
    console.error("Fallo:", error);
    alert("Error cargando los datos.json");
  });

function initCountdown() {
  function updateTimer() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    
    const diff = tomorrow - now;
    const hours = String(Math.floor((diff / (1000 * 60 * 60)) % 24)).padStart(2, '0');
    const minutes = String(Math.floor((diff / (1000 * 60)) % 60)).padStart(2, '0');
    const seconds = String(Math.floor((diff / 1000) % 60)).padStart(2, '0');
    
    document.getElementById('countdown-timer').textContent = `${hours}:${minutes}:${seconds}`;
  }
  updateTimer();
  setInterval(updateTimer, 1000);
}

function calculateStreak() {
  currentStreak = 0;
  for (let i = currentOfficialDay; i >= 1; i--) {
    const record = savedState.history[i];
    if (record && record.status === 'won') {
      currentStreak++;
    } else if (i === currentOfficialDay && !record) {
      continue; 
    } else {
      break;
    }
  }
  document.getElementById('menu-streak').textContent = currentStreak;
  document.getElementById('game-streak-text').textContent = currentStreak;
}

// Navegación
document.getElementById('btn-archive').addEventListener('click', () => {
  archiveView.classList.add('show');
  gameView.classList.add('hidden');
  reviewView.classList.add('hidden');
  statsView.classList.add('hidden');
  calculateStreak();
  renderArchive();
});

document.getElementById('btn-back-archive').addEventListener('click', () => {
  reviewView.classList.remove('show');
  reviewView.classList.add('hidden');
  archiveView.classList.add('show');
});

document.getElementById('btn-show-archive').addEventListener('click', () => {
  const fullSection = document.getElementById('full-archive-section');
  fullSection.classList.add('show-archive');
  fullSection.scrollIntoView({ behavior: 'smooth' });
});

document.getElementById('btn-close-archive').addEventListener('click', () => {
  document.getElementById('full-archive-section').classList.remove('show-archive');
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

document.getElementById('btn-stats').addEventListener('click', () => {
  calcularEstadisticasGlobales();
  archiveView.classList.remove('show');
  statsView.classList.remove('hidden');
  statsView.classList.add('show');
});

document.getElementById('btn-close-stats').addEventListener('click', () => {
  statsView.classList.remove('show');
  statsView.classList.add('hidden');
  archiveView.classList.add('show');
});

function calcularEstadisticasGlobales() {
  const historyKeys = Object.keys(savedState.history);
  const played = historyKeys.length;
  let won = 0;
  
  historyKeys.forEach(k => {
    if (savedState.history[k].status === 'won') won++;
  });
  const winrate = played > 0 ? Math.round((won / played) * 100) : 0;

  document.getElementById('stat-played').textContent = played;
  document.getElementById('stat-won').textContent = won;
  document.getElementById('stat-winrate').textContent = winrate + '%';
  document.getElementById('stat-streak').textContent = currentStreak;
}

document.getElementById('btn-share').addEventListener('click', () => {
  const record = savedState.history[currentReviewDay];
  let text = `EL COLGADO - Día ${currentReviewDay} ${record.status === 'won' ? '🏆' : '💀'}\n`;
  text += `🔥 Racha: ${currentStreak}\n\n`;
  
  const vidasLeft = Math.max(0, 6 - record.fails);
  text += `Intentos restantes: ${'❤️'.repeat(vidasLeft)}${'🖤'.repeat(6 - vidasLeft)}\n`;
  if(record.hints.def || record.hints.let) {
      text += `Pistas usadas: ${record.hints.def ? '💡' : ''}${record.hints.let ? '🔠' : ''}\n`;
  }
  text += `\nJuega en: https://alejandrocoonde.github.io/elcolgado/`;

  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  });
});

// Render Menú
function renderArchive() {
  const currentWeekGrid = document.getElementById('current-week-grid');
  const fullDaysGrid = document.getElementById('full-days-grid');
  currentWeekGrid.innerHTML = '';
  fullDaysGrid.innerHTML = '';

  for (let i = currentOfficialDay; i < currentOfficialDay + 8; i++) {
    currentWeekGrid.appendChild(createDayButton(i));
  }
  for (let i = 1; i <= currentOfficialDay; i++) {
    fullDaysGrid.appendChild(createDayButton(i));
  }
}

function createDayButton(i) {
  const btn = document.createElement('button');
  btn.className = 'day-btn';
  
  const dataExists = gameData.retos.find(r => r.dia === i);
  
  if (i > currentOfficialDay) {
    btn.innerHTML = `DÍA ${i}<br><span style="font-size: 1rem; color:#aaa">PRÓX.</span>`;
    btn.disabled = true;
  } else if (!dataExists) {
    btn.innerHTML = `DÍA ${i}<br><span style="font-size: 1rem; color:#aaa">EN OBRAS</span>`;
    btn.disabled = true;
  } else {
    const historyRecord = savedState.history[i];
    if (historyRecord) {
      btn.innerHTML = `DÍA ${i}<br><span style="font-size: 1rem;">VER ARCHIVO</span>`;
      btn.classList.add(historyRecord.status);
      btn.onclick = () => showReview(i);
    } else if (savedState.activeSession && savedState.activeSession.dia === i) {
      btn.innerHTML = `DÍA ${i}<br><span style="font-size: 1rem;">SEGUIR</span>`;
      btn.classList.add('resume');
      btn.onclick = () => startGame(i, true);
    } else {
      btn.innerHTML = `DÍA ${i}<br><span style="font-size: 1rem;">JUGAR</span>`;
      btn.onclick = () => startGame(i, false);
    }
  }
  return btn;
}

function showReview(diaId) {
  currentReviewDay = diaId; 
  const record = savedState.history[diaId];
  const dayData = gameData.retos.find(r => r.dia === diaId); 
  
  document.getElementById('review-title').textContent = `REVISIÓN DÍA ${diaId} - ${record.status === 'won' ? 'VICTORIA' : 'DERROTA'}`;
  const content = document.getElementById('review-content');
  content.innerHTML = `
    <div class="review-item ${record.status === 'won' ? 'correct' : 'incorrect'}">
        <p class="review-word">${dayData.palabra}</p>
        <p style="font-size:1.3rem;">${dayData.definicion}</p>
        <p style="margin-top:10px; color:var(--text-muted);">Fallos: ${record.fails} / 6</p>
    </div>
  `;

  archiveView.classList.remove('show');
  reviewView.classList.remove('hidden');
  reviewView.classList.add('show');
}

function startGame(diaId, isResume) {
  playingDay = gameData.retos.find(r => r.dia === diaId);
  targetWord = playingDay.palabra;
  
  if (isResume) {
    guessedLetters = savedState.activeSession.guessed;
    fails = savedState.activeSession.fails;
    hints = savedState.activeSession.hints;
  } else {
    guessedLetters = [];
    fails = 0;
    hints = { def: false, let: false };
    savedState.activeSession = { dia: diaId, guessed: [], fails: 0, hints: { def: false, let: false } };
    saveStateToLocal();
  }

  document.getElementById('day-badge').textContent = `DÍA ${diaId}`;
  actionBtn.classList.add('hidden');
  hintDisplay.style.display = 'none';
  hintDisplay.className = 'feedback';
  
  archiveView.classList.remove('show');
  gameView.classList.remove('hidden');
  
  renderGame();
}

function renderGame() {
  renderArt();
  renderWord();
  renderKeyboard();
  renderHints();
  updateLivesUI();
  checkEndGame(false);
}

function saveStateToLocal() {
  if (savedState.activeSession) {
      savedState.activeSession.guessed = guessedLetters;
      savedState.activeSession.fails = fails;
      savedState.activeSession.hints = hints;
  }
  localStorage.setItem('colgadoState', JSON.stringify(savedState));
}

function updateLivesUI() {
    const lives = Math.max(0, 6 - fails);
    livesDisplay.textContent = '❤️'.repeat(lives) + '🖤'.repeat(6 - lives);
}

function renderArt(shake = false) {
    playerSprite.className = 'player';
    rope.style.display = 'none';
    platform.style.display = 'block';
    playerHand.innerHTML = '';
    
    if (fails > 0) {
        playerSprite.classList.add('jumping');
        rope.style.display = 'block';
        platform.style.display = 'none';
        
        // Dedos (5 menos los fallos, el primer fallo te deja colgado con 5 dedos)
        const dedos = Math.max(0, 6 - fails);
        for(let i=0; i<dedos; i++) {
            playerHand.innerHTML += '<div class="finger"></div>';
        }

        if (fails >= 6) {
            playerSprite.className = 'player dead';
            rope.style.display = 'none';
        }
    }

    if (shake) {
        const cardBox = document.getElementById('question-card-box');
        if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        cardBox.classList.remove('screen-shake');
        void cardBox.offsetWidth;
        cardBox.classList.add('screen-shake');
    }
}

function renderWord() {
  wordContainer.innerHTML = '';
  targetWord.split('').forEach(letter => {
    const div = document.createElement('div');
    div.className = 'letter-slot';
    div.innerText = guessedLetters.includes(letter) ? letter : '';
    wordContainer.appendChild(div);
  });
}

function renderKeyboard() {
  kbdContainer.innerHTML = '';
  const layout = ["QWERTYUIOP", "ASDFGHJKLÑ", "ZXCVBNM"];
  
  layout.forEach(rowStr => {
    const row = document.createElement('div');
    row.className = 'kbd-row';
    rowStr.split('').forEach(key => {
      const btn = document.createElement('button');
      btn.className = 'key';
      btn.id = 'key-' + key;
      btn.innerText = key;
      
      if (guessedLetters.includes(key)) {
        if (targetWord.includes(key)) btn.classList.add('correct');
        else btn.classList.add('wrong');
      }

      btn.onclick = () => handleGuess(key);
      row.appendChild(btn);
    });
    kbdContainer.appendChild(row);
  });
}

function renderHints() {
  btnHintDef.style.opacity = hints.def ? '0.4' : '1';
  btnHintLet.style.opacity = hints.let ? '0.4' : '1';
  
  if (hints.def) {
    hintDisplay.style.display = 'block';
    hintDisplay.innerText = playingDay.definicion;
  }

  btnHintDef.onclick = () => {
    if (hints.def) return;
    hints.def = true;
    saveStateToLocal();
    renderHints();
  };

  btnHintLet.onclick = () => {
    if (hints.let) return;
    const unrevealed = targetWord.split('').filter(l => !guessedLetters.includes(l));
    if (unrevealed.length > 0) {
      hints.let = true;
      const randomChar = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      saveStateToLocal();
      renderHints();
      handleGuess(randomChar, true); // true para indicar que no penaliza como fallo si ya estaba
    }
  };
}

function handleGuess(key, isHint = false) {
  if (guessedLetters.includes(key)) return;

  guessedLetters.push(key);
  const isCorrect = targetWord.includes(key);

  if (!isCorrect && !isHint) {
    fails++;
    renderArt(true);
  } else if(isCorrect) {
    const cardBox = document.getElementById('question-card-box');
    cardBox.classList.remove('flash-success');
    void cardBox.offsetWidth;
    cardBox.classList.add('flash-success');
  }

  saveStateToLocal();
  renderWord();
  updateLivesUI();
  
  const keyBtn = document.getElementById('key-' + key);
  if (keyBtn) {
    keyBtn.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  checkEndGame(true);
}

function checkEndGame(withDelay) {
  const isWon = targetWord.split('').every(l => guessedLetters.includes(l));
  const isLost = fails >= maxFails;

  if (isWon || isLost) {
    // Deshabilitar teclado
    document.querySelectorAll('.key').forEach(btn => btn.style.pointerEvents = 'none');
    
    if (withDelay) {
        setTimeout(() => endGame(isWon ? 'won' : 'lost'), 1500);
    } else {
        endGame(isWon ? 'won' : 'lost'); // Si entras y ya habías acabado (por recargar)
    }
  }
}

function endGame(status) {
    actionBtn.classList.remove('hidden');
    hintDisplay.style.display = 'block';
    
    if (status === 'won') {
        hintDisplay.innerHTML = `¡VICTORIA!<br><span style="font-size: 1.4rem; color: #fff;">Palabra: ${targetWord}</span>`;
        hintDisplay.className = 'feedback show success';
    } else {
        hintDisplay.innerHTML = `¡DERROTA!<br><span style="font-size: 1.4rem; color: #fff;">La palabra era: ${targetWord}</span>`;
        hintDisplay.className = 'feedback show error';
    }
    
    if (savedState.activeSession) {
        savedState.history[playingDay.dia] = { 
            status: status, 
            fails: fails,
            hints: hints
        };
        savedState.activeSession = null;
        saveStateToLocal();
        calculateStreak();
    }
    
    actionBtn.textContent = 'VOLVER AL MENÚ';
    actionBtn.style.background = 'var(--track)';
    actionBtn.style.color = '#fff';
    actionBtn.disabled = false;
    
    actionBtn.onclick = () => {
        gameView.classList.add('hidden');
        archiveView.classList.add('show');
        renderArchive();
    };
}