/* ===================================================================
   games.js — Tic-Tac-Toe, Memory, Snake, Reaction (vanilla JS)
   Exposes window.Games.init() — called from app.js after icons hydrate.
   =================================================================== */
(() => {
  'use strict';
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const store = {
    get: (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } },
    set: (k, v) => localStorage.setItem(k, JSON.stringify(v))
  };
  const toast = m => window.toast && window.toast(m);

  /* ---------- Scores ---------- */
  const SKEY = 'game-scores';
  const defaults = () => ({ ttt: { win: 0, loss: 0, draw: 0 }, memory: null, snake: 0, reaction: null });
  let scores = Object.assign(defaults(), store.get(SKEY, {}));
  const save = () => { store.set(SKEY, scores); renderScores(); };
  function renderScores() {
    const rows = [
      ['Tic-Tac-Toe', `${scores.ttt.win}W · ${scores.ttt.loss}L · ${scores.ttt.draw}D`],
      ['Memory', scores.memory ? `${scores.memory.moves} moves · ${fmtTime(scores.memory.time)}` : '—'],
      ['Snake', scores.snake ? `${scores.snake} pts` : '—'],
      ['Reaction', scores.reaction ? `${scores.reaction} ms` : '—']
    ];
    $('#scoreList').innerHTML = rows.map(([n, v]) => `<li>${icon('trophy')}<span>${n}</span><strong>${v}</strong></li>`).join('');
  }
  $('#scoresReset').onclick = () => { scores = defaults(); save(); initTTT(); initMemory(); snakeReset(); reactReset(); toast('Scores reset'); };
  const fmtTime = s => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

  /* ---------- Tabs ---------- */
  let active = 'ttt';
  $('#gameTabs').onclick = e => {
    const b = e.target.closest('.chip'); if (!b) return;
    active = b.dataset.game;
    $$('.chip', e.currentTarget).forEach(c => c.classList.toggle('active', c === b));
    $$('.game').forEach(g => g.hidden = g.dataset.game !== active);
    if (active !== 'snake') snakeStop();
    if (active === 'memory' && !memStarted) initMemory();
  };

  /* ===================== TIC-TAC-TOE (unbeatable AI) ===================== */
  const LINES = [[0, 1, 2], [3, 4, 5], [6, 7, 8], [0, 3, 6], [1, 4, 7], [2, 5, 8], [0, 4, 8], [2, 4, 6]];
  let board, over, human = 'X', ai = 'O';
  const winner = b => { for (const [a, c, d] of LINES) if (b[a] && b[a] === b[c] && b[a] === b[d]) return { p: b[a], line: [a, c, d] }; return b.every(Boolean) ? { p: 'draw' } : null; };
  function minimax(b, player, depth = 0) {
    const w = winner(b); if (w) return w.p === ai ? 10 - depth : w.p === human ? depth - 10 : 0;
    let best = player === ai ? -Infinity : Infinity;
    b.forEach((c, i) => { if (c) return; b[i] = player; const s = minimax(b, player === ai ? human : ai, depth + 1); b[i] = null; best = player === ai ? Math.max(best, s) : Math.min(best, s); });
    return best;
  }
  const bestMove = b => { let m = -1, best = -Infinity; b.forEach((c, i) => { if (c) return; b[i] = ai; const s = minimax(b, human); b[i] = null; if (s > best) { best = s; m = i; } }); return m; };
  function initTTT() {
    board = Array(9).fill(null); over = false;
    $('#tttBoard').innerHTML = board.map((_, i) => `<button class="ttt-cell" data-i="${i}" aria-label="Cell ${i + 1}"></button>`).join('');
    $('#tttStatus').textContent = 'Your move — you are X';
    $('#tttScore').textContent = `Wins ${scores.ttt.win} · Losses ${scores.ttt.loss} · Draws ${scores.ttt.draw}`;
  }
  function drawTTT(hl = []) { $$('.ttt-cell').forEach((c, i) => { c.textContent = board[i] || ''; c.dataset.p = board[i] || ''; c.classList.toggle('win', hl.includes(i)); c.disabled = over || !!board[i]; }); }
  function endTTT(w) {
    over = true; drawTTT(w.line || []);
    const msg = w.p === 'draw' ? 'Draw.' : w.p === human ? 'You win!' : 'AI wins.';
    scores.ttt[w.p === 'draw' ? 'draw' : w.p === human ? 'win' : 'loss']++; save();
    $('#tttStatus').textContent = msg + ' Click "New game" to play again.'; $('#tttScore').textContent = `Wins ${scores.ttt.win} · Losses ${scores.ttt.loss} · Draws ${scores.ttt.draw}`;
  }
  $('#tttBoard').onclick = e => {
    const c = e.target.closest('.ttt-cell'); if (!c || over || board[c.dataset.i]) return;
    board[c.dataset.i] = human; drawTTT(); let w = winner(board); if (w) return endTTT(w);
    $('#tttStatus').textContent = 'AI is thinking…';
    setTimeout(() => { board[bestMove(board)] = ai; drawTTT(); w = winner(board); if (w) return endTTT(w); $('#tttStatus').textContent = 'Your move'; }, 350);
  };
  $('#tttReset').onclick = initTTT;

  /* ===================== MEMORY ===================== */
  const ICONS = ['bot', 'zap', 'globe', 'puzzle', 'radio', 'ticket', 'cpu', 'gamepad'];
  let memCards, memFlipped, memMatched, memMoves, memTimer, memSec, memStarted = false;
  function initMemory() {
    clearInterval(memTimer); memStarted = true; memFlipped = []; memMatched = 0; memMoves = 0; memSec = 0;
    $('#memMoves').textContent = 0; $('#memTime').textContent = '0:00';
    memCards = [...ICONS, ...ICONS].sort(() => Math.random() - .5);
    $('#memBoard').innerHTML = memCards.map((ic, i) => `<button class="mem-card" data-i="${i}" aria-label="Card ${i + 1}"><span class="mem-inner"><span class="mem-back">${icon('sparkles')}</span><span class="mem-front">${icon(ic)}</span></span></button>`).join('');
    $('#memBest').textContent = scores.memory ? `Best: ${scores.memory.moves} moves in ${fmtTime(scores.memory.time)}` : 'No best score yet';
  }
  $('#memBoard').onclick = e => {
    const c = e.target.closest('.mem-card'); if (!c || c.classList.contains('flip') || memFlipped.length === 2) return;
    if (memMoves === 0 && memFlipped.length === 0) memTimer = setInterval(() => { memSec++; $('#memTime').textContent = fmtTime(memSec); }, 1000);
    c.classList.add('flip'); memFlipped.push(c);
    if (memFlipped.length < 2) return;
    memMoves++; $('#memMoves').textContent = memMoves;
    const [a, b] = memFlipped;
    if (memCards[a.dataset.i] === memCards[b.dataset.i]) {
      a.classList.add('match'); b.classList.add('match'); memFlipped = []; memMatched++;
      if (memMatched === ICONS.length) {
        clearInterval(memTimer);
        const better = !scores.memory || memMoves < scores.memory.moves || (memMoves === scores.memory.moves && memSec < scores.memory.time);
        if (better) { scores.memory = { moves: memMoves, time: memSec }; save(); toast('New memory record!'); } else toast(`Done in ${memMoves} moves`);
        $('#memBest').textContent = `Best: ${scores.memory.moves} moves in ${fmtTime(scores.memory.time)}`;
      }
    } else setTimeout(() => { a.classList.remove('flip'); b.classList.remove('flip'); memFlipped = []; }, 700);
  };
  $('#memReset').onclick = initMemory;

  /* ===================== SNAKE ===================== */
  const cv = $('#snakeCanvas'), cx = cv.getContext('2d'), N = 18, CELL = cv.width / N;
  let snake, dir, nextDir, food, snakeScore = 0, loop = null, speed;
  const rndFood = () => { let f; do { f = { x: Math.floor(Math.random() * N), y: Math.floor(Math.random() * N) }; } while (snake.some(s => s.x === f.x && s.y === f.y)); return f; };
  function snakeReset() { snakeStop(); snake = [{ x: 9, y: 9 }, { x: 8, y: 9 }, { x: 7, y: 9 }]; dir = nextDir = { x: 1, y: 0 }; food = rndFood(); snakeScore = 0; speed = 140; $('#snakeScore').textContent = 0; $('#snakeBest').textContent = scores.snake; $('#snakeOverlay').hidden = false; $('#snakeOverlay').querySelector('strong').textContent = 'Snake'; $('#snakeStart').textContent = 'Start'; drawSnake(); }
  function snakeStop() { clearTimeout(loop); loop = null; }
  function snakeStart() { if (loop) return; $('#snakeOverlay').hidden = true; if (snake.length === 0 || snakeOver) snakeReset(); snakeOver = false; $('#snakeOverlay').hidden = true; tick(); }
  let snakeOver = false;
  function tick() {
    dir = nextDir; const h = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    if (h.x < 0 || h.y < 0 || h.x >= N || h.y >= N || snake.some(s => s.x === h.x && s.y === h.y)) return gameOver();
    snake.unshift(h);
    if (h.x === food.x && h.y === food.y) { snakeScore += 10; $('#snakeScore').textContent = snakeScore; food = rndFood(); speed = Math.max(60, speed - 3); } else snake.pop();
    drawSnake(); loop = setTimeout(tick, speed);
  }
  function gameOver() {
    snakeStop(); snakeOver = true;
    if (snakeScore > scores.snake) { scores.snake = snakeScore; save(); toast('New snake high score!'); }
    $('#snakeBest').textContent = scores.snake;
    const o = $('#snakeOverlay'); o.hidden = false; o.querySelector('strong').textContent = `Game over — ${snakeScore} pts`; o.querySelector('span').textContent = snakeScore >= scores.snake && snakeScore > 0 ? 'New personal best!' : `Best: ${scores.snake}`; $('#snakeStart').textContent = 'Play again';
  }
  function drawSnake() {
    const css = getComputedStyle(document.documentElement), accent = css.getPropertyValue('--accent').trim();
    cx.fillStyle = css.getPropertyValue('--surface-2').trim(); cx.fillRect(0, 0, cv.width, cv.height);
    cx.strokeStyle = css.getPropertyValue('--border').trim(); cx.lineWidth = 1;
    for (let i = 1; i < N; i++) { cx.beginPath(); cx.moveTo(i * CELL, 0); cx.lineTo(i * CELL, cv.height); cx.moveTo(0, i * CELL); cx.lineTo(cv.width, i * CELL); cx.stroke(); }
    cx.fillStyle = css.getPropertyValue('--dnd').trim(); cx.beginPath(); cx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL * .32, 0, 7); cx.fill();
    snake.forEach((s, i) => { cx.fillStyle = i === 0 ? accent : accent + 'bb'; const r = 4; cx.beginPath(); cx.roundRect ? cx.roundRect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, r) : cx.rect(s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3); cx.fill(); });
  }
  const setDir = d => { const m = { up: { x: 0, y: -1 }, down: { x: 0, y: 1 }, left: { x: -1, y: 0 }, right: { x: 1, y: 0 } }[d]; if (!m || (m.x === -dir.x && m.y === -dir.y)) return; nextDir = m; };
  addEventListener('keydown', e => {
    if (active !== 'snake' || $('#games').getBoundingClientRect().bottom < 0) return;
    const k = { ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right', w: 'up', s: 'down', a: 'left', d: 'right', W: 'up', S: 'down', A: 'left', D: 'right' }[e.key];
    if (k) { e.preventDefault(); setDir(k); if (!loop && !snakeOver) snakeStart(); }
    if (e.key === ' ' && !loop) { e.preventDefault(); snakeStart(); }
  });
  $('#dpad').onclick = e => { const b = e.target.closest('button'); if (b) { setDir(b.dataset.dir); if (!loop) snakeStart(); } };
  let tx, ty; cv.addEventListener('touchstart', e => { tx = e.touches[0].clientX; ty = e.touches[0].clientY; }, { passive: true });
  cv.addEventListener('touchend', e => { const dx = e.changedTouches[0].clientX - tx, dy = e.changedTouches[0].clientY - ty; if (Math.hypot(dx, dy) < 20) return; setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up')); if (!loop) snakeStart(); }, { passive: true });
  $('#snakeStart').onclick = snakeStart;
  document.addEventListener('visibilitychange', () => { if (document.hidden && loop) { snakeStop(); $('#snakeOverlay').hidden = false; $('#snakeOverlay').querySelector('strong').textContent = 'Paused'; $('#snakeStart').textContent = 'Resume'; } });
  new MutationObserver(drawSnake).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  /* ===================== REACTION ===================== */
  const pad = $('#reactPad'); let rState = 'idle', rTimer, rStart, history = [];
  function reactReset() { rState = 'idle'; clearTimeout(rTimer); pad.className = 'reaction-pad'; pad.innerHTML = '<strong>Click to start</strong><span>Wait for green, then click as fast as you can.</span>'; $('#reactBest').textContent = scores.reaction ? `${scores.reaction} ms` : '—'; history = []; $('#reactHistory').textContent = ''; }
  pad.onclick = () => {
    if (rState === 'idle' || rState === 'result') {
      rState = 'wait'; pad.className = 'reaction-pad wait'; pad.innerHTML = '<strong>Wait for green…</strong><span>Don\'t click yet.</span>';
      rTimer = setTimeout(() => { rState = 'go'; pad.className = 'reaction-pad go'; pad.innerHTML = '<strong>Click!</strong>'; rStart = performance.now(); }, 1200 + Math.random() * 2500);
    } else if (rState === 'wait') {
      clearTimeout(rTimer); rState = 'result'; pad.className = 'reaction-pad early'; pad.innerHTML = '<strong>Too early</strong><span>Click to try again.</span>';
    } else if (rState === 'go') {
      const ms = Math.round(performance.now() - rStart); rState = 'result'; history.unshift(ms); history = history.slice(0, 5);
      const avg = Math.round(history.reduce((a, b) => a + b, 0) / history.length);
      pad.className = 'reaction-pad result'; pad.innerHTML = `<strong>${ms} ms</strong><span>${ms < 200 ? 'Lightning fast.' : ms < 300 ? 'Great reflexes.' : 'Click to try again.'}</span>`;
      if (!scores.reaction || ms < scores.reaction) { scores.reaction = ms; save(); toast('New reaction record!'); }
      $('#reactBest').textContent = `${scores.reaction} ms`; $('#reactHistory').textContent = `Last ${history.length}: ${history.join(', ')} ms · avg ${avg} ms`;
    }
  };

  window.Games = { init() { renderScores(); initTTT(); snakeReset(); reactReset(); } };
})();
