// ESTADOS DEL DIBUJO ASCII (Arcade & Zoom 5 dedos)
const artFrames = [
// 0: A salvo
`      |
      |
      |         _|_
      |        (o_o)
      |        /| |\
      |         / \
<span class="lava">≈≈≈≈≈≈≈≈</span>  <span class="platform">[███████]</span>`,

// 1: 5 dedos (Salta a la cuerda)
`<span class="zoom">🔍 ZOOM:</span>
   |
<span class="rope">[|||||]</span>
   |
 (>_<)
 /| |\
  / \
<span class="lava">≈≈≈≈≈≈≈≈</span>  <span class="platform">[███████]</span>`,

// 2: 4 dedos
`<span class="zoom">🔍 ZOOM:</span>
   |
<span class="rope">[|||| ]</span>
   |
 (>_<)
 /| |\
  / \
<span class="lava">≈≈≈≈≈≈≈≈</span>  <span class="platform">[███████]</span>`,

// 3: 3 dedos
`<span class="zoom">🔍 ZOOM:</span>
   |
<span class="rope">[|||  ]</span>
   |
 (T_T)
 /| |\
  / \
<span class="lava">≈≈≈≈≈≈≈≈</span>  <span class="platform">[███████]</span>`,

// 4: 2 dedos
`<span class="zoom">🔍 ZOOM:</span>
   |
<span class="rope">[||   ]</span>
   |
 (T_T)
 /| |\
  / \
<span class="lava">≈≈≈≈≈≈≈≈</span>  <span class="platform">[███████]</span>`,

// 5: 1 dedo
`<span class="zoom">🔍 ZOOM:</span>
   |
<span class="rope">[|    ]</span>
   |
 (X_X)
 /| |\
  / \
<span class="lava">≈≈≈≈≈≈≈≈</span>  <span class="platform">[███████]</span>`,

// 6: Caída
`<span class="zoom">🔍 ZOOM:</span>
   |
<span class="rope">[     ]</span>
   
 
 
<span class="lava">≈</span>\(x_x)/<span class="lava">≈</span>  <span class="platform">[███████]</span>`
];

let words = [];
let dailyPuzzle = null;
let targetWord = "";
const maxFails = 6;
let gameState = {};

// ELEMENTOS DOM
const screenMenu = document.getElementById('screen-menu');
const screenGame = document.getElementById('screen-game');
const artBox = document.getElementById('art');
const wordContainer = document.getElementById('word-container');
const kbdContainer = document.getElementById('keyboard');
const hintDisplay = document.getElementById('hint-display');
const btnHintDef = document.getElementById('btn-hint-def');
const btnHintLet = document.getElementById('btn-hint-let');
const modal = document.getElementById('modal');

const btnPlay = document.getElementById('btn-play');
const playedState = document.getElementById('played-state');
const playedTitle = document.getElementById('played-title');
const playedWord = document.getElementById('played-word');

// TEMPORIZADOR
function updateTimer() {
  const now = new Date();
  const nextMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  const diff = nextMidnight - now;
  
  const h = Math.floor((diff / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
  const m = Math.floor((diff / 1000 / 60) % 60).toString().padStart(2, '0');
  const s = Math.floor((diff / 1000) % 60).toString().padStart(2, '0');
  
  document.getElementById('countdown').innerText = `${h}:${m}:${s}`;
}
setInterval(updateTimer, 1000);
updateTimer();

// INICIALIZACIÓN
fetch('datos.json')
  .then(res => res.json())
  .then(data => {
    words = data;
    initDailyGame();
  })
  .catch(err => {
    console.error("Error", err);
    words = [{ word: "JAVASCRIPT", def: "Lenguaje de programación web." }];
    initDailyGame();
  });

function initDailyGame() {
  const d = new Date();
  const todayStr = d.getFullYear() + '-' + (d.getMonth()+1) + '-' + d.getDate();
  
  let hash = 0;
  for(let i=0; i<todayStr.length; i++) hash = todayStr.charCodeAt(i) + ((hash << 5) - hash);
  dailyPuzzle = words[Math.abs(hash) % words.length];
  targetWord = dailyPuzzle.word;

  gameState = JSON.parse(localStorage.getItem('colgado_daily')) || {};
  if (gameState.date !== todayStr) {
    gameState = { date: todayStr, guessed: [], fails: 0, hints: { def: false, let: false }, status: 'playing' };
    saveState();
  }

  // Comprobar si ya se jugó hoy
  if (gameState.status !== 'playing') {
    btnPlay.classList.add('hidden');
    playedState.classList.remove('hidden');
    playedWord.innerText = targetWord;
    if (gameState.status === 'won') {
      playedTitle.innerText = "¡TE SALVASTE!";
      playedTitle.style.color = "var(--success)";
    } else {
      playedTitle.innerText = "¡CAÍSTE A LA LAVA!";
      playedTitle.style.color = "var(--danger)";
    }
  }
}

btnPlay.addEventListener('click', () => {
  if (!dailyPuzzle) return;
  screenMenu.classList.add('hidden');
  screenGame.classList.remove('hidden');
  renderGame();
});

function renderGame() {
  renderArt();
  renderWord();
  renderKeyboard();
  renderHints();
  checkEndGame();
}

function saveState() {
  localStorage.setItem('colgado_daily', JSON.stringify(gameState));
}

function renderArt(shake = false) {
  artBox.innerHTML = artFrames[gameState.fails];
  if (shake) {
    artBox.classList.remove('shake');
    void artBox.offsetWidth;
    artBox.classList.add('shake');
  }
}

function renderWord() {
  wordContainer.innerHTML = '';
  targetWord.split('').forEach(letter => {
    const div = document.createElement('div');
    div.className = 'letter-slot';
    div.innerText = gameState.guessed.includes(letter) ? letter : '';
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
      
      if (gameState.guessed.includes(key)) {
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
  if (gameState.hints.def) {
    btnHintDef.style.opacity = '0.4';
    hintDisplay.style.display = 'block';
    hintDisplay.innerText = dailyPuzzle.def;
  }
  if (gameState.hints.let) {
    btnHintLet.style.opacity = '0.4';
  }

  btnHintDef.onclick = () => {
    if (gameState.hints.def || gameState.status !== 'playing') return;
    gameState.hints.def = true;
    saveState();
    renderHints();
  };

  btnHintLet.onclick = () => {
    if (gameState.hints.let || gameState.status !== 'playing') return;
    const unrevealed = targetWord.split('').filter(l => !gameState.guessed.includes(l));
    if (unrevealed.length > 0) {
      gameState.hints.let = true;
      const randomChar = unrevealed[Math.floor(Math.random() * unrevealed.length)];
      saveState();
      renderHints();
      handleGuess(randomChar);
    }
  };
}

function handleGuess(key) {
  if (gameState.status !== 'playing' || gameState.guessed.includes(key)) return;

  gameState.guessed.push(key);
  const isCorrect = targetWord.includes(key);

  if (!isCorrect) {
    gameState.fails++;
    renderArt(true);
  }

  saveState();
  renderWord();
  
  const keyBtn = document.getElementById('key-' + key);
  if (keyBtn) {
    keyBtn.classList.add(isCorrect ? 'correct' : 'wrong');
  }

  checkEndGame();
}

function checkEndGame() {
  const isWon = targetWord.split('').every(l => gameState.guessed.includes(l));
  const isLost = gameState.fails >= maxFails;

  if (isWon) gameState.status = 'won';
  else if (isLost) gameState.status = 'lost';

  if (gameState.status !== 'playing') {
    saveState();
    setTimeout(() => {
      modal.style.display = 'flex';
      document.getElementById('modal-title').innerText = isWon ? '¡TE SALVASTE!' : '¡TE CAÍSTE!';
      document.getElementById('modal-title').style.color = isWon ? 'var(--success)' : 'var(--danger)';
      document.getElementById('modal-final-word').innerText = targetWord;
    }, 600);
  }
}
