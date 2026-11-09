let gameData = null;
let todayKey = "";
let todayPuzzle = null;

// Estado en LocalStorage exclusivo para hoy
let savedState = JSON.parse(localStorage.getItem('colgadoTodayState')) || {
  date: "",
  guessed: [],
  fails: 0,
  hints: { def: false, let: false },
  status: 'playing' // 'playing', 'won', 'lost'
};

// Elementos DOM
const archiveView = document.getElementById('archive-view');
const gameView = document.getElementById('game-view');
const reviewView = document.getElementById('review-view');
const endGameModal = document.getElementById('end-game-modal');

const wordContainer = document.getElementById('word-container');
const kbdContainer = document.getElementById('keyboard');
const hintDisplay = document.getElementById('hint-display');
const btnHintDef = document.getElementById('btn-hint-def');
const btnHintLet = document.getElementById('btn-hint-let');
const livesDisplay = document.getElementById('lives-display');
const dailyActionContainer = document.getElementById('daily-action-container');

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
      
      const dayIndex = Math.max(0, dayDiff);
      todayKey = today.toISOString().split('T')[0];

      // Seleccionar palabra del día de forma rotativa o por índice
      const retos = gameData.retos;
      todayPuzzle = retos[dayIndex % retos.length];

      // Resetear estado si cambió el día
      if (savedState.date !== todayKey) {
        savedState = {
          date: todayKey,
          guessed: [],
          fails: 0,
          hints: { def: false, let: false },
          status: 'playing'
        };
        saveStateToLocal();
      }

      renderMenuUI();
      initCountdown();
    }
  })
  .catch(error => {
    console.error("Fallo:", error);
    alert("Error cargando datos.json");
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
    
    const timerEl = document.getElementById('countdown-timer');
    if (timerEl) timerEl.textContent = `${hours}:${minutes}:${seconds}`;
  }
  updateTimer();
  setInterval(updateTimer, 1000);
}

// Navegación menú
document.getElementById('btn-archive').addEventListener('click', () => {
  gameView.classList.add('hidden');
  reviewView.classList.add('hidden');
  archiveView.classList.add('show');
  renderMenuUI();
});

document.getElementById('btn-back-archive').addEventListener('click', () => {
  reviewView.classList.remove('show');
  reviewView.classList.add('hidden');
  archiveView.classList.add('show');
  renderMenuUI();
});

// Modal Final de Partida
document.getElementById('btn-modal-continue').addEventListener('click', () => {
  endGameModal.style.display = 'none';
  gameView.classList.add('hidden');
  showReview();
});

function renderMenuUI() {
  dailyActionContainer.innerHTML = '';
  
  if (savedState.status === 'playing') {
    const btn = document.createElement('button');
    btn.className = 'btn-pixel';
    btn.style.background = 'var(--accent)';
    btn.style.padding = '20px';
    btn.style.fontSize = '2rem';
    btn.textContent = '▶ JUGAR';
    btn.onclick = () => startGame();
    dailyActionContainer.appendChild(btn);
  } else {
    const btn = document.createElement('button');
    btn.className = 'btn-pixel';
    btn.style.background = savedState.status === 'won' ? 'var(--success)' : 'var(--danger)';
    btn.style.color = '#fff';
    btn.style.padding = '20px';
    btn.style.fontSize = '2rem';
    btn.textContent = 'HOY: JUGADO (REVISIÓN)';
    btn.onclick = () => showReview();
    dailyActionContainer.appendChild(btn);
  }
}

function showReview() {
  const content = document.getElementById('review-content');
  const isWon = savedState.status === 'won';
  
  content.innerHTML = `
    <div class="review-item ${isWon ? 'correct' : 'incorrect'}">
        <p style="font-size:1.8rem; font-weight:bold; margin-bottom:5px; color: ${isWon ? 'var(--success)' : 'var(--danger)'};">${isWon ? '✨ ¡TE SALVASTE!' : '💀 CAÍSTE A LA LAVA'}</p>
        <p class="review-word">${todayPuzzle.palabra}</p>
        <p style="font-size:1.4rem; margin-bottom:15px; text-transform:none; color: var(--text);"><strong>Definición:</strong> ${todayPuzzle.definicion}</p>
        
        <div style="background: var(--bg); padding: 10px; border: 2px solid #000; border-radius: 4px; color: var(--text);">
          <p style="font-size:1.3rem;">Pista definición usada: <strong>${savedState.hints.def ? 'SÍ' : 'NO'}</strong></p>
          <p style="font-size:1.3rem;">Pista letra usada: <strong>${savedState.hints.let ? 'SÍ' : 'NO'}</strong></p>
          <p style="font-size:1.3rem; margin-top:5px;">Fallos cometidos: <strong>${savedState.fails} / 6</strong></p>
        </div>
    </div>
  `;

  archiveView.classList.remove('show');
  reviewView.classList.remove('hidden');
  reviewView.classList.add('show');
}

// Compartir resultado
document.getElementById('btn-share').addEventListener('click', () => {
  const isWon = savedState.status === 'won';
  let text = `EL COLGADO - RETO DE HOY ${isWon ? '🏆' : '💀'}\n\n`;
  
  const vidasLeft = Math.max(0, 6 - savedState.fails);
  text += `Intentos restantes: ${'❤️'.repeat(vidasLeft)}${'🖤'.repeat(6 - vidasLeft)}\n`;
  if(savedState.hints.def || savedState.hints.let) {
      text += `Pistas usadas: ${savedState.hints.def ? '💡' : ''}${savedState.hints.let ? '🔠' : ''}\n`;
  }
  text += `\nJuega en: https://alejandrocoonde.github.io/elcolgado/`;

  navigator.clipboard.writeText(text).then(() => {
    const toast = document.getElementById('toast');
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2500);
  });
});

function startGame() {
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
  
  if (savedState.status !== 'playing') {
    endGameUI(savedState.status === 'won');
  } else {
    hintDisplay.style.display = 'none';
  }
}

function saveStateToLocal() {
  localStorage.setItem('colgadoTodayState', JSON.stringify(savedState));
}

function updateLivesUI() {
    const lives = Math.max(0, 6 - savedState.fails);
    livesDisplay.textContent = '❤️'.repeat(lives) + '🖤'.repeat(6 - lives);
}

function renderArt(shake = false) {
    playerSprite.className = 'player';
    rope.style.display = 'none';
    platform.style.display = 'block';
    playerHand.innerHTML = '';
    
    if (savedState.fails > 0) {
        playerSprite.classList.add('jumping');
        rope.style.display = 'block';
        platform.style.display = 'none';
        
        const dedos = Math.max(0, 6 - savedState.fails);
        for(let i=0; i<dedos; i++) {
            playerHand.innerHTML += '<div class="finger"></div>';
        }

        if (savedState.fails >= 6) {
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
  todayPuzzle.palabra.split('').forEach(letter => {
    const div = document.createElement('div');
    div.className = 'letter-slot';
    div.innerText = savedState.guessed.includes(letter) ? letter : '';
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
      
      if (savedState.guessed.includes(key)) {
        if (todayPuzzle.palabra.includes(key)) btn.classList.add('correct');
        else btn.classList.add('wrong');
      }

      if (savedState.status !== 'playing') {
        btn.style.pointerEvents = 'none';
      }

      btn.onclick = () => handleGuess(key);
      row.appendChild(btn);
    });
    kbdContainer.appendChild(row);
  });
}

function renderHints() {
  const isFinished = savedState.status !== 'playing';

  btnHintDef.style.opacity = (savedState.hints.def || isFinished) ? '0.4' : '1';
  btnHintLet.style.opacity = (savedState.hints.let || isFinished) ? '0.4' : '1';
  
  if (savedState.hints.def || isFinished) {
    hintDisplay.style.display = 'block';
    hintDisplay.innerText = todayPuzzle.definicion;
  }

  if (isFinished) {
    btnHintDef.onclick = null;
    btnHintLet.onclick = null;
    return;
  }

  btnHintDef.onclick = () => {
    if (savedState.hints.def || savedState.status !== 'playing') return;
    savedState.hints.def = true;
    saveStateToLocal();
    renderHints();
  };

  btnHintLet.onclick = () => {
    if (savedState.hints.let || savedState.status !== 'playing') return;
    const unrevealed = todayPuzzle.palabra.split('').filter(l => !savedState.guessed.includes(l));
    if (unrevealed.length > 0) {
      savedState.hints.let = true;
      const randomChar = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      saveStateToLocal();
      renderHints();
      handleGuess(randomChar, true);
    }
  };
}

function handleGuess(key, isHint = false) {
  if (savedState.status !== 'playing' || savedState.guessed.includes(key)) return;

  savedState.guessed.push(key);
  const isCorrect = todayPuzzle.palabra.includes(key);

  if (!isCorrect && !isHint) {
    savedState.fails++;
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

  checkEndGame();
}

function checkEndGame() {
  const isWon = todayPuzzle.palabra.split('').every(l => savedState.guessed.includes(l));
  const isLost = savedState.fails >= 6;

  if (isWon || isLost) {
    savedState.status = isWon ? 'won' : 'lost';
    saveStateToLocal();
    
    document.querySelectorAll('.key').forEach(btn => btn.style.pointerEvents = 'none');
    
    setTimeout(() => {
      endGameUI(isWon);
      renderHints(); 
    }, 1000);
  }
}

function endGameUI(isWon) {
    const title = document.getElementById('modal-title');
    const desc = document.getElementById('modal-desc');
    
    endGameModal.style.display = 'flex';
    
    if (isWon) {
        title.textContent = '¡VICTORIA!';
        title.style.color = 'var(--success)';
        desc.innerHTML = `Has adivinado la palabra <br><strong>${todayPuzzle.palabra}</strong>`;
    } else {
        title.textContent = '¡DERROTA!';
        title.style.color = 'var(--danger)';
        desc.innerHTML = `Has caído a la lava. La palabra era <br><strong>${todayPuzzle.palabra}</strong>`;
    }
}