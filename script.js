let gameData = null;
let todayKey = "";
let todayPuzzle = { palabra: "HARDWARE", definicion: "Componentes físicos y tangibles de un sistema informático." };
let isAnimating = false;

// Estado guardado en LocalStorage
let savedState = JSON.parse(localStorage.getItem('colgadoTodayState')) || {
  date: "",
  guessed: [],
  fails: 0,
  hints: { def: false, let: false },
  status: 'playing' 
};

// Elementos DOM
const archiveView = document.getElementById('archive-view');
const gameView = document.getElementById('game-view');
const reviewView = document.getElementById('review-view');

const wordContainer = document.getElementById('word-container');
const kbdContainer = document.getElementById('keyboard');
const hintDisplay = document.getElementById('hint-display');
const btnHintDef = document.getElementById('btn-hint-def');
const btnHintLet = document.getElementById('btn-hint-let');
const livesDisplay = document.getElementById('lives-display');
const dailyActionContainer = document.getElementById('daily-action-container');

// Elementos SVG Pixel Art
const camera = document.getElementById('camera');
const playerGroup = document.getElementById('player-group');
const spriteStand = document.getElementById('sprite-stand');
const spriteHang = document.getElementById('sprite-hang');
const svgFingers = [
  document.getElementById('f1'),
  document.getElementById('f2'),
  document.getElementById('f3'),
  document.getElementById('f4'),
  document.getElementById('f5')
];

// Carga inicial robusta
fetch('datos.json')
  .then(res => {
    if (!res.ok) throw new Error('No se pudo cargar datos.json');
    return res.json();
  })
  .then(data => {
    gameData = data;
    const retos = Array.isArray(data) ? data : (data.retos || []);
    const fechaInicio = data.fecha_inicio || "2026-01-01";
    
    const startDate = new Date(fechaInicio + "T00:00:00").getTime();
    const today = new Date();
    today.setHours(0,0,0,0);
    const dayDiff = Math.floor((today.getTime() - startDate) / (1000 * 60 * 60 * 24));
    
    const dayIndex = Math.max(0, dayDiff);
    todayKey = today.toISOString().split('T')[0];

    const rawPuzzle = retos[dayIndex % retos.length];
    if (rawPuzzle) {
      todayPuzzle = {
        palabra: (rawPuzzle.palabra || rawPuzzle.word || "HARDWARE").toUpperCase(),
        definicion: rawPuzzle.definicion || rawPuzzle.def || "Definición del reto diario."
      };
    }

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
  })
  .catch(err => {
    console.warn("Usando datos por defecto:", err);
    todayKey = new Date().toISOString().split('T')[0];
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
  gameView.classList.add('hidden');
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
  renderGameInit();
}

function saveStateToLocal() {
  localStorage.setItem('colgadoTodayState', JSON.stringify(savedState));
}

function updateLivesUI() {
    const lives = Math.max(0, 6 - savedState.fails);
    livesDisplay.textContent = '❤️'.repeat(lives) + '🖤'.repeat(6 - lives);
}

function renderGameInit() {
  renderWord();
  renderKeyboard();
  renderHints();
  updateLivesUI();
  
  if (savedState.fails === 0) {
      spriteStand.style.display = 'block';
      spriteHang.style.display = 'none';
      playerGroup.setAttribute('class', 'player-start');
      camera.setAttribute('class', '');
  } else if (savedState.fails >= 1 && savedState.fails < 6) {
      spriteStand.style.display = 'none';
      spriteHang.style.display = 'block';
      playerGroup.setAttribute('class', 'player-on-rope');
      camera.setAttribute('class', 'zoomed');
  } else if (savedState.fails >= 6) {
      spriteStand.style.display = 'none';
      spriteHang.style.display = 'block'; 
      playerGroup.setAttribute('class', 'player-in-lava');
      camera.setAttribute('class', '');
  }
  
  updateFingersUI();

  if (savedState.status !== 'playing') {
    showReview();
  } else {
    hintDisplay.style.display = 'none';
  }
}

function updateFingersUI() {
  const fallosSobreAgarre = Math.max(0, savedState.fails - 1); 
  for(let i=0; i<5; i++) {
    if (i < fallosSobreAgarre) {
      svgFingers[i].style.display = 'none'; 
    } else {
      svgFingers[i].style.display = 'block';
    }
  }
}

function renderWord() {
  wordContainer.innerHTML = '';
  const palabra = todayPuzzle.palabra || "HARDWARE";
  palabra.split('').forEach(letter => {
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

      if (savedState.status !== 'playing' || isAnimating) {
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

  btnHintDef.style.opacity = (savedState.hints.def || isFinished || isAnimating) ? '0.4' : '1';
  btnHintLet.style.opacity = (savedState.hints.let || isFinished || isAnimating) ? '0.4' : '1';
  
  if (savedState.hints.def || isFinished) {
    hintDisplay.style.display = 'block';
    hintDisplay.innerText = todayPuzzle.definicion;
  }

  if (isFinished || isAnimating) {
    btnHintDef.onclick = null;
    btnHintLet.onclick = null;
    return;
  }

  btnHintDef.onclick = () => {
    if (savedState.hints.def || savedState.status !== 'playing' || isAnimating) return;
    savedState.hints.def = true;
    saveStateToLocal();
    renderHints();
  };

  btnHintLet.onclick = () => {
    if (savedState.hints.let || savedState.status !== 'playing' || isAnimating) return;
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
  if (savedState.status !== 'playing' || savedState.guessed.includes(key) || isAnimating) return;

  savedState.guessed.push(key);
  const isCorrect = todayPuzzle.palabra.includes(key);

  if (isCorrect) {
    const cardBox = document.getElementById('question-card-box');
    cardBox.classList.remove('flash-success');
    void cardBox.offsetWidth;
    cardBox.classList.add('flash-success');
    
    saveStateToLocal();
    renderWord();
    updateLivesUI();
    const keyBtn = document.getElementById('key-' + key);
    if (keyBtn) keyBtn.classList.add('correct');
    
    checkWinCondition();

  } else {
    if(!isHint) savedState.fails++;
    saveStateToLocal();
    renderWord();
    updateLivesUI();
    const keyBtn = document.getElementById('key-' + key);
    if (keyBtn) keyBtn.classList.add('wrong');
    
    triggerFailAnimation();
  }
}

function triggerFailAnimation() {
  isAnimating = true;
  renderKeyboard();
  renderHints();
  
  updateFingersUI();
  
  if (savedState.fails === 1) {
    playerGroup.setAttribute('class', 'jumping-to-rope');
    
    setTimeout(() => {
      spriteStand.style.display = 'none';
      spriteHang.style.display = 'block';
    }, 1200);

    setTimeout(() => {
      camera.setAttribute('class', 'zoomed');
    }, 2200);

    setTimeout(() => {
      isAnimating = false;
      renderKeyboard();
      renderHints();
    }, 3200); 

  } else if (savedState.fails === 6) {
    camera.setAttribute('class', '');
    
    setTimeout(() => {
      playerGroup.setAttribute('class', 'falling-to-lava');
    }, 1000);

    setTimeout(() => {
      isAnimating = false;
      checkLossCondition();
    }, 2500); 

  } else {
    setTimeout(() => {
      isAnimating = false;
      renderKeyboard();
      renderHints();
    }, 500);
  }
}

function checkWinCondition() {
  const isWon = todayPuzzle.palabra.split('').every(l => savedState.guessed.includes(l));
  if (isWon) {
    savedState.status = 'won';
    saveStateToLocal();
    document.querySelectorAll('.key').forEach(btn => btn.style.pointerEvents = 'none');
    
    setTimeout(() => {
      showReview();
    }, 1500);
  }
}

function checkLossCondition() {
  savedState.status = 'lost';
  saveStateToLocal();
  document.querySelectorAll('.key').forEach(btn => btn.style.pointerEvents = 'none');
  showReview();
}