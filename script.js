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

const wordContainer = document.getElementById('word-container');
const kbdContainer = document.getElementById('keyboard');
const hintDisplay = document.getElementById('hint-display');
const btnHintDef = document.getElementById('btn-hint-def');
const btnHintLet = document.getElementById('btn-hint-let');
const livesDisplay = document.getElementById('lives-display');
const dailyActionContainer = document.getElementById('daily-action-container');

// Elementos Arte SVG
const svgPlayer = document.getElementById('svg-player');
const svgPlatform = document.getElementById('svg-platform');
const svgRope = document.getElementById('svg-rope');
const svgLegs = document.getElementById('svg-legs');
const svgArmHold = document.getElementById('svg-arm-hold');

// Caras
const svgFaceNeutral = document.getElementById('svg-face-neutral');
const svgFaceScared = document.getElementById('svg-face-scared');
const svgFaceDead = document.getElementById('svg-face-dead');

// Dedos (1 a 5)
const svgFingers = [
  document.getElementById('svg-finger-1'),
  document.getElementById('svg-finger-2'),
  document.getElementById('svg-finger-3'),
  document.getElementById('svg-finger-4'),
  document.getElementById('svg-finger-5') // Pulgar
];


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
  renderGame();
}

function renderGame() {
  renderArt();
  renderWord();
  renderKeyboard();
  renderHints();
  updateLivesUI();
  
  if (savedState.status !== 'playing') {
    // Si se recarga y ya estaba acabado, que vaya a la revisión directamente
    showReview();
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
    // ESTADO INICIAL A SALVO
    if (savedState.fails === 0) {
      svgPlayer.setAttribute('transform', 'translate(150, 110)'); // Posición suelo
      svgPlatform.style.display = 'block';
      svgRope.style.display = 'none';
      svgArmHold.style.display = 'none';
      svgLegs.style.display = 'block';
      
      svgFaceNeutral.style.display = 'block';
      svgFaceScared.style.display = 'none';
      svgFaceDead.style.display = 'none';
      
      svgFingers.forEach(f => f.style.display = 'block'); // Reset dedos
    } 
    // COLGADO (Fallos 1 a 5)
    else if (savedState.fails > 0 && savedState.fails < 6) {
      svgPlayer.setAttribute('transform', 'translate(150, 80)'); // Posición saltando
      svgPlatform.style.display = 'none';
      svgRope.style.display = 'block';
      svgArmHold.style.display = 'block';
      svgLegs.style.display = 'none'; // Al estar colgado las patas no asientan igual
      
      svgFaceNeutral.style.display = 'none';
      svgFaceScared.style.display = 'block';
      svgFaceDead.style.display = 'none';

      // Calcular dedos a esconder
      // Fallo 1 = Quedan 5 dedos. Fallo 5 = Queda 1 dedo (el pulgar).
      const fallosSobreAgarre = savedState.fails - 1; 
      for(let i=0; i<5; i++) {
        if (i < fallosSobreAgarre) {
          svgFingers[i].style.display = 'none'; // Esconde un dedo
        } else {
          svgFingers[i].style.display = 'block';
        }
      }
    } 
    // MUERTO A LA LAVA (Fallo 6)
    else if (savedState.fails >= 6) {
      svgPlayer.setAttribute('transform', 'translate(150, 200) rotate(180)'); // Cae y gira
      svgPlatform.style.display = 'none';
      svgRope.style.display = 'block';
      svgArmHold.style.display = 'none'; // Se suelta
      
      svgFaceNeutral.style.display = 'none';
      svgFaceScared.style.display = 'none';
      svgFaceDead.style.display = 'block';
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
    
    // Deshabilitar teclado inmediatamente
    document.querySelectorAll('.key').forEach(btn => btn.style.pointerEvents = 'none');
    
    // Esperar 1.5 segundos para la animación y saltar a revisión
    setTimeout(() => {
      renderHints(); 
      showReview();
    }, 1500);
  }
}