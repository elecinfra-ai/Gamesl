/* Central Snake — Friends-ish themed PWA
 * Features: obstacles, power-ups (Pivot, Smelly Cat, Sarcasm), speed boosts, swipe controls
 * No external assets required.
 */
(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const size = 20; // grid cell size
  const cols = canvas.width / size;
  const rows = canvas.height / size;

  // UI elements
  const scoreEl = document.getElementById('score');
  const hiEl = document.getElementById('hi');
  const speedEl = document.getElementById('speed');
  const modeEl = document.getElementById('mode');
  const powersEl = document.getElementById('powers');

  const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
  const rand = (n) => Math.floor(Math.random() * n);
  const keymap = { ArrowLeft: [-1,0], ArrowRight: [1,0], ArrowUp: [0,-1], ArrowDown: [0,1], a:[-1,0], d:[1,0], w:[0,-1], s:[0,1] };

  const COLORS = {
    bg: '#0b1220',
    grid: '#0f172a',
    snake: '#34d399',
    snakeHead: '#10b981',
    food: '#f59e0b', // coffee
    obstacle: '#f97316', // sofa blocks
    text: '#e5e7eb',
    powerPivot: '#60a5fa',
    powerSmelly: '#a78bfa',
    powerSarcasm: '#f472b6',
    boost: '#22d3ee'
  };

  // Game state
  let snake, dir, nextDir, food, obstacles, boost, powerups, score, hi, speed, tick, alive, wallPass, slowTimer, doubleTimer, boostTimer;
  let lastTime = 0;
  const baseInterval = 140; // ms
  const speedStep = 0.9;

  function reset() {
    snake = [{x: Math.floor(cols/2), y: Math.floor(rows/2)}];
    dir = {x: 1, y: 0};
    nextDir = {x: 1, y: 0};
    score = 0;
    speed = 1;
    tick = 0;
    alive = true;
    wallPass = 0;
    slowTimer = 0;
    doubleTimer = 0;
    boostTimer = 0;

    obstacles = [];
    // Create sofa-like blocks around the map edges and random interior couches
    const ring = 2;
    for (let x=0;x<cols;x++) {
      if (x % 2 === 0) {
        obstacles.push({x, y:ring}); 
        obstacles.push({x, y:rows - ring - 1});
      }
    }
    for (let y=ring;y<rows-ring;y++) {
      if (y % 2 === 0) {
        obstacles.push({x:ring, y});
        obstacles.push({x:cols - ring - 1, y});
      }
    }
    // Random interior obstacles
    for (let i=0;i<18;i++) {
      obstacles.push(randFreeCell());
    }

    food = randFreeCell();
    boost = randFreeCell();
    powerups = [
      { type: 'pivot', pos: randFreeCell(), color: COLORS.powerPivot, emoji: '↻' },
      { type: 'smelly', pos: randFreeCell(), color: COLORS.powerSmelly, emoji: '🐾' },
      { type: 'sarcasm', pos: randFreeCell(), color: COLORS.powerSarcasm, emoji: '★' }
    ];

    hi = Number(localStorage.getItem('central-snake-hi')||0);
    updateUI();
    powersEl.innerHTML = '';
  }

  function cellEq(a,b){ return a.x===b.x && a.y===b.y; }
  function occupied(cell){
    return snake.some(s => cellEq(s, cell)) ||
           obstacles.some(o => cellEq(o, cell)) ||
           (food && cellEq(food, cell)) ||
           (boost && cellEq(boost, cell)) ||
           powerups.some(p => cellEq(p.pos, cell));
  }
  function randFreeCell(){
    let c;
    do {
      c = {x: rand(cols), y: rand(rows)};
    } while (occupied(c));
    return c;
  }

  function updateUI(){
    scoreEl.textContent = score;
    hiEl.textContent = hi;
    speedEl.textContent = (speed).toFixed(1)+'x';
    let mode = 'Classic';
    if (wallPass>0) mode = 'Pivot!';
    else if (slowTimer>0) mode = 'Smelly Cat';
    else if (doubleTimer>0) mode = 'Sarcasm';
    else if (boostTimer>0) mode = 'Speed Boost';
    modeEl.textContent = mode;

    powersEl.innerHTML = '';
    if (wallPass>0) addBadge('Pivot!', wallPass);
    if (slowTimer>0) addBadge('Smelly Cat', slowTimer);
    if (doubleTimer>0) addBadge('Sarcasm', doubleTimer);
    if (boostTimer>0) addBadge('Boost', boostTimer);
  }
  function addBadge(label, t){
    const el = document.createElement('span');
    el.className = 'badge';
    el.textContent = `${label} ${Math.ceil(t/60)}s`;
    powersEl.appendChild(el);
  }

  function setDir(dx, dy){
    // Prevent reversing into itself
    if (-dx === dir.x && -dy === dir.y) return;
    nextDir = {x:dx, y:dy};
  }

  // Keyboard controls
  window.addEventListener('keydown', (e) => {
    const k = e.key in keymap ? e.key : e.key.toLowerCase();
    if (k in keymap) {
      e.preventDefault();
      const [dx,dy] = keymap[k];
      setDir(dx,dy);
    } else if (e.key === ' ') {
      e.preventDefault();
      if (!alive) reset();
    }
  }, {passive:false});

  // Touch swipe controls
  let touchStart = null;
  canvas.addEventListener('touchstart', (e) => {
    if (!e.touches[0]) return;
    touchStart = {x: e.touches[0].clientX, y: e.touches[0].clientY};
  }, {passive:true});
  canvas.addEventListener('touchmove', (e) => { e.preventDefault(); }, {passive:false});
  canvas.addEventListener('touchend', (e) => {
    if (!touchStart) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - touchStart.x;
    const dy = t.clientY - touchStart.y;
    if (Math.abs(dx) > Math.abs(dy)) {
      setDir(dx>0?1:-1, 0);
    } else {
      setDir(0, dy>0?1:-1);
    }
    touchStart = null;
  });

  function drawGrid(){
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0,0,canvas.width, canvas.height);
    ctx.strokeStyle = COLORS.grid;
    for(let x=0; x<cols; x++){
      ctx.beginPath();
      ctx.moveTo(x*size+0.5,0);
      ctx.lineTo(x*size+0.5,canvas.height);
      ctx.stroke();
    }
    for(let y=0; y<rows; y++){
      ctx.beginPath();
      ctx.moveTo(0,y*size+0.5);
      ctx.lineTo(canvas.width,y*size+0.5);
      ctx.stroke();
    }
  }

  function drawRect(cell, color){
    ctx.fillStyle = color;
    ctx.fillRect(cell.x*size+2, cell.y*size+2, size-4, size-4);
  }

  function drawEmoji(cell, emoji){
    ctx.font = (size*0.9)+'px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillText(emoji, cell.x*size + size/2, cell.y*size + size/2);
  }

  function step(dt){
    if (!alive) return;
    tick += dt;

    const slowFactor = slowTimer>0 ? 1.6 : 1.0;
    const boostFactor = boostTimer>0 ? 0.7 : 1.0;
    const interval = baseInterval * Math.pow(speedStep, (speed-1)*4) * slowFactor * boostFactor;

    if (tick >= interval){
      tick = 0;

      dir = nextDir;
      const head = {x: snake[0].x + dir.x, y: snake[0].y + dir.y};

      if (wallPass>0) {
        // Wrap around
        head.x = (head.x + cols) % cols;
        head.y = (head.y + rows) % rows;
      }

      // Collisions
      if (!wallPass>0) {
        if (head.x<0 || head.x>=cols || head.y<0 || head.y>=rows) {
          return gameOver();
        }
      }
      if (snake.some((s,i)=> i>4 && cellEq(s, head))) return gameOver();
      if (obstacles.some(o=>cellEq(o,head))) return gameOver();

      snake.unshift(head);

      // Eat logic
      let grew = false;
      if (cellEq(head, food)) {
        grew = true;
        const points = doubleTimer>0 ? 2 : 1;
        score += points;
        food = randFreeCell();
        if (Math.random() < 0.25) speed = Math.min(3.5, speed + 0.1);
      }
      if (cellEq(head, boost)) {
        boostTimer = 60 * 7; // ~7 seconds
        boost = randFreeCell();
      }
      for (let i=0;i<powerups.length;i++){
        const p = powerups[i];
        if (cellEq(head, p.pos)) {
          if (p.type==='pivot') wallPass = 60 * 8; // seconds at 60fps-ish
          if (p.type==='smelly') slowTimer = 60 * 8;
          if (p.type==='sarcasm') doubleTimer = 60 * 8;
          powerups[i].pos = randFreeCell();
        }
      }

      if (!grew) snake.pop();

      // Timers
      if (wallPass>0) wallPass--;
      if (slowTimer>0) slowTimer--;
      if (doubleTimer>0) doubleTimer--;
      if (boostTimer>0) boostTimer--;

      // Occasionally add obstacles as the cafe gets crowded
      if (Math.random() < 0.03 && obstacles.length < (cols*rows)*0.12){
        obstacles.push(randFreeCell());
      }

      updateUI();
    }

    // Render
    drawGrid();
    // draw obstacles (sofas)
    obstacles.forEach(o => drawRect(o, COLORS.obstacle));
    // draw food (coffee)
    ctx.fillStyle = COLORS.food;
    drawEmoji(food, '☕');
    // draw speed boost
    drawEmoji(boost, '➤');
    // draw powerups
    powerups.forEach(p => {
      ctx.save();
      drawRect(p.pos, p.color);
      drawEmoji(p.pos, p.emoji);
      ctx.restore();
    });
    // draw snake
    snake.forEach((s,i)=> {
      drawRect(s, i===0?COLORS.snakeHead:COLORS.snake);
    });

    // HUD overlay
    ctx.fillStyle = 'rgba(0,0,0,0.15)';
    ctx.fillRect(0,0,canvas.width, 28);
    ctx.fillStyle = COLORS.text;
    ctx.font = '14px system-ui';
    ctx.fillText(`Score ${score}  ·  Speed ${speed.toFixed(1)}x`, 8, 18);
    if (!alive){
      ctx.fillStyle = 'rgba(0,0,0,0.5)';
      ctx.fillRect(0,0,canvas.width, canvas.height);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 24px system-ui';
      ctx.textAlign = 'center';
      ctx.fillText('Game Over — press Space to restart', canvas.width/2, canvas.height/2);
      ctx.textAlign = 'left';
    }
  }

  function gameOver(){
    alive = false;
    hi = Math.max(hi, score);
    localStorage.setItem('central-snake-hi', String(hi));
    updateUI();
  }

  function loop(ts){
    const dt = ts - lastTime;
    lastTime = ts;
    step(dt);
    requestAnimationFrame(loop);
  }

  reset();
  requestAnimationFrame(loop);
})();
