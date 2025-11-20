// Pastel Snake - simple canvas game
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const powerEl = document.getElementById('power');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayScore = document.getElementById('overlay-score');
const retryBtn = document.getElementById('retry');

const cell = 40;
let cols = Math.floor(canvas.width / cell);
let rows = Math.floor(canvas.height / cell);
const originalCanvasWidth = canvas.width;
const originalCanvasHeight = canvas.height;

function setCanvasSize(w, h) {
    canvas.width = Math.max(200, Math.floor(w));
    canvas.height = Math.max(200, Math.floor(h));
    cols = Math.floor(canvas.width / cell);
    rows = Math.floor(canvas.height / cell);
}

let snake; // array of {x,y}
let dir; // {x,y}
let nextDir;
let pellet;
let blueberry = null; // power-up
let score = 0;
let alive = true;
let invincibleUntil = 0;
let gameInterval = null;
let blueberryTimer = null;
let deathAnimTimer = null;
let startAnimTime = 0; // track when game started for float-in animation
let showGrid = false; // grid toggle state
let countdownActive = false; // 3-2-1 GO countdown
let countdownStartTime = 0;
// horror state
let playSessions = 0; // increments each reset/respawn
    let horrorMode = true;
    let horrorAllowSound = true;
    let horrorAllowFlash = true;
const horrorMessages = [
    "I can feel under your skin",
    "god is dead",
    "Iam the savior",
    "soak in the blood of your sorrows"
];

function resetGame() {
    snake = [];
    const startLen = 4;
    const sx = Math.floor(cols / 2);
    const sy = Math.floor(rows / 2);
    for (let i = 0; i < startLen; i++) snake.push({ x: sx - i, y: sy });
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    pellet = spawnItem();
    blueberry = null;
    score = 0;
    alive = true;
    invincibleUntil = 0;
    scoreEl.textContent = `Score: ${score}`;
    powerEl.textContent = `Invincible: 0s`;
    overlay.classList.add('hidden');
    if (gameInterval) clearInterval(gameInterval);
    startAnimTime = Date.now(); // start float-in animation
    // count this play session (used for horror event every 5 starts)
    playSessions++;
    countdownActive = true; // start countdown before game can go
    countdownStartTime = Date.now();
    gameInterval = setInterval(tick, 100);
    scheduleBlueberry();
}

function scheduleBlueberry() {
    if (blueberryTimer) clearTimeout(blueberryTimer);
    const t = 15000 + Math.random() * 15000; // 15-30s
    blueberryTimer = setTimeout(() => { blueberry = spawnItem(); scheduleBlueberry(); }, t);
}

function spawnItem() {
    while (true) {
        const x = Math.floor(Math.random() * cols);
        const y = Math.floor(Math.random() * rows);
        if (!snake.some(s => s.x === x && s.y === y)) return { x, y };
    }
}

function tick() {
    if (!alive) return;
    
    // check if countdown is still active
    const now = Date.now();
    const countdownElapsed = now - countdownStartTime;
    if (countdownActive && countdownElapsed >= 3500) {
        countdownActive = false; // countdown ended
    }
    
    if (countdownActive) {
        draw();
        return;
    }
    
    // apply direction change
    dir = nextDir;
    const head = { ...snake[0] };
    head.x += dir.x;
    head.y += dir.y;
    // check collisions
    const hitWall = head.x < 0 || head.x >= cols || head.y < 0 || head.y >= rows;
    const hitSelf = snake.some((s, i) => i > 0 && s.x === head.x && s.y === head.y);
    const invincible = now < invincibleUntil;
    if ((hitWall || (hitSelf && !invincible))) {
        die();
        return;
    }
    snake.unshift(head);
    // pellet
    if (head.x === pellet.x && head.y === pellet.y) {
        score += 1;
        scoreEl.textContent = `Score: ${score}`;
        pellet = spawnItem();
    } else {
        snake.pop();
    }
    // blueberry
    if (blueberry && head.x === blueberry.x && head.y === blueberry.y) {
        invincibleUntil = Date.now() + 20000; // 20s
        blueberry = null;
        powerEl.textContent = `Invincible: 20s`;
    }
    // update power display
    const remaining = Math.max(0, Math.ceil((invincibleUntil - now) / 1000));
    powerEl.textContent = `Invincible: ${remaining}s`;
    draw();
}

function die() {
    alive = false;
    // stop regular ticks
    if (gameInterval) { clearInterval(gameInterval); gameInterval = null; }
    // start tail-to-head vanish
    deathAnimTimer = setInterval(() => {
        if (snake.length > 0) {
            snake.pop();
            draw();
        } else {
            clearInterval(deathAnimTimer);
            deathAnimTimer = null;
            showGameOver();
        }
    }, 70);
}

function showGameOver() {
    overlayTitle.textContent = 'Game Over';
    overlayScore.textContent = `Score: ${score}`;
    overlay.classList.remove('hidden');
}

function draw() {
    // clear
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // subtle background
    ctx.save();
    ctx.globalAlpha = 0.04;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
    
    // grid lines
    if (showGrid) {
        ctx.save();
        ctx.globalAlpha = 0.2;
        ctx.strokeStyle = '#9090D8';
        ctx.lineWidth = 1;
        for (let gx = 0; gx <= cols; gx++) {
            ctx.beginPath();
            ctx.moveTo(gx * cell, 0);
            ctx.lineTo(gx * cell, canvas.height);
            ctx.stroke();
        }
        for (let gy = 0; gy <= rows; gy++) {
            ctx.beginPath();
            ctx.moveTo(0, gy * cell);
            ctx.lineTo(canvas.width, gy * cell);
            ctx.stroke();
        }
        ctx.restore();
    }

    // pellet
    drawPellet(pellet.x, pellet.y);
    // blueberry
    if (blueberry) drawBlueberry(blueberry.x, blueberry.y);

    // snake body
    for (let i = snake.length - 1; i >= 0; i--) {
        const s = snake[i];
        const isHead = i === 0;
        drawSegment(s.x, s.y, isHead);
    }
    
    // draw countdown if active
    if (countdownActive) {
        drawCountdown();
    }
}

function drawPellet(x, y) {
    const cx = x * cell + cell / 2;
    const cy = y * cell + cell / 2;
    ctx.beginPath();
    ctx.fillStyle = '#FFCBC1';
    ctx.arc(cx, cy, cell * 0.28, 0, Math.PI * 2);
    ctx.fill();
}

function drawBlueberry(x, y) {
    const cx = x * cell + cell / 2;
    const cy = y * cell + cell / 2;
    // berry
    ctx.beginPath();
    ctx.fillStyle = '#7FA8FF';
    ctx.arc(cx, cy, cell * 0.34, 0, Math.PI * 2);
    ctx.fill();
    // highlight
    ctx.beginPath();
    ctx.fillStyle = '#BFD7FF';
    ctx.arc(cx - cell * 0.08, cy - cell * 0.12, cell * 0.12, 0, Math.PI * 2);
    ctx.fill();
    // little stem
    ctx.beginPath();
    ctx.strokeStyle = '#7B8C6B';
    ctx.lineWidth = 2;
    ctx.moveTo(cx + cell * 0.15, cy - cell * 0.28);
    ctx.lineTo(cx + cell * 0.05, cy - cell * 0.18);
    ctx.stroke();
}

function drawSegment(x, y, isHead) {
    const px = x * cell;
    const py = y * cell;
    const radius = 6;
    // body color changes if invincible
    const now = Date.now();
    const invincible = now < invincibleUntil;
    const color = invincible ? '#FFF0B6' : '#B4E1C4';
    const color2 = invincible ? '#FFE28A' : '#8FD5A8';
    
    // tail fade: segments closer to tail become more transparent
    const segmentIndex = snake.indexOf({ x, y }); // find this segment's position
    let opacity = 1;
    if (segmentIndex > 0) {
        opacity = 1 - (segmentIndex / snake.length) * 0.5; // tail fades to 50%
    }
    ctx.globalAlpha = opacity;
    
    // float-in starter animation (first 600ms)
    const animDuration = 600;
    const elapsed = Math.min(now - startAnimTime, animDuration);
    const animProgress = elapsed / animDuration;
    let offsetY = 0;
    if (animProgress < 1) {
        // linear easing for smoother, less choppy animation
        offsetY = (1 - animProgress) * canvas.height * 0.3; // float up from below
    }
    
    // rounded rect
    roundRect(px + 2, py + 2 + offsetY, cell - 4, cell - 4, radius, color);
    // darker inner
    roundRect(px + 4, py + 6 + offsetY, cell - 8, cell - 12, radius, color2);
    
    // draw wings during float-in animation
    if (animProgress < 1) {
        const wingFlap = Math.sin(animProgress * Math.PI * 4) * 0.3; // flapping motion
        drawWings(px + cell/2, py + cell/2 + offsetY, animProgress, wingFlap);
    }
    
    ctx.globalAlpha = 1; // reset opacity
    if (isHead) {
        // eyes
        const eyeOffsetX = dir.x === 0 ? (dir.y > 0 ? 0 : 0) : (dir.x > 0 ? 0.18 * cell : -0.18 * cell);
        const eyeOffsetY = dir.y === 0 ? (dir.x > 0 ? -0.18 * cell : -0.18 * cell) : (dir.y > 0 ? 0.18 * cell : -0.18 * cell);
        const ex1 = px + cell / 2 - eyeOffsetX - 4;
        const ey1 = py + cell / 2 - eyeOffsetY - 6;
        const ex2 = px + cell / 2 + eyeOffsetX + 4;
        const ey2 = py + cell / 2 + eyeOffsetY - 6;
        drawEye(ex1, ey1);
        drawEye(ex2, ey2);
    }
}

function roundRect(x, y, w, h, r, fillColor) {
    ctx.beginPath();
    ctx.fillStyle = fillColor;
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.fill();
}

function drawCountdown() {
    const elapsed = Date.now() - countdownStartTime;
    let text = '';
    let scale = 1;
    
    if (elapsed < 1000) {
        text = '3';
        scale = 1 - (elapsed / 1000) * 0.3; // shrink
    } else if (elapsed < 2000) {
        text = '2';
        scale = 1 - ((elapsed - 1000) / 1000) * 0.3;
    } else if (elapsed < 3000) {
        text = '1';
        scale = 1 - ((elapsed - 2000) / 1000) * 0.3;
    } else if (elapsed < 3500) {
        text = 'GO!';
        scale = 1 + ((elapsed - 3000) / 500) * 0.2; // grow
    }
    
    ctx.save();
    ctx.font = `bold ${80 * scale}px Arial`;
    ctx.fillStyle = 'rgba(205, 235, 248, 0.8)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'rgba(100, 100, 150, 0.3)';
    ctx.shadowBlur = 10;
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
    ctx.restore();
}

function drawEye(x, y) {
    ctx.beginPath();
    ctx.fillStyle = '#FFF';
    ctx.arc(x, y, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.fillStyle = '#333';
    ctx.arc(x + 1, y + 1, 1.8, 0, Math.PI * 2);
    ctx.fill();
}

function drawWings(cx, cy, progress, flapAmount) {
    // left wing
    ctx.beginPath();
    ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
    const wingY = cy - 4;
    const wingLeft = cx - 18 - flapAmount * 10;
    ctx.ellipse(wingLeft, wingY, 8, 12, -0.3 + flapAmount * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // right wing
    ctx.beginPath();
    ctx.fillStyle = 'rgba(200, 220, 255, 0.6)';
    const wingRight = cx + 18 + flapAmount * 10;
    ctx.ellipse(wingRight, wingY, 8, 12, 0.3 - flapAmount * 0.2, 0, Math.PI * 2);
    ctx.fill();
}

// input
window.addEventListener('keydown', e => {
    const key = e.key;
    if (!alive || countdownActive) return;
    if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        if (dir.y === 1) return; nextDir = { x: 0, y: -1 };
    } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        if (dir.y === -1) return; nextDir = { x: 0, y: 1 };
    } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        if (dir.x === 1) return; nextDir = { x: -1, y: 0 };
    } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        if (dir.x === -1) return; nextDir = { x: 1, y: 0 };
    }
});

// Retry click: randomly trigger horror event with a fixed probability
const HORROR_PROBABILITY = 0.25; // 25% chance per retry
retryBtn.addEventListener('click', () => {
    if (horrorMode && Math.random() < HORROR_PROBABILITY) {
        // trigger horror sequence, then start the game after it finishes
        triggerHorrorEvent();
        setTimeout(() => resetGame(), 1600);
    } else {
        resetGame();
    }
});

document.getElementById('grid-toggle').addEventListener('click', () => {
    showGrid = !showGrid;
    document.getElementById('grid-toggle').textContent = `Grid: ${showGrid ? 'ON' : 'OFF'}`;
});

document.getElementById('fullscreen-btn').addEventListener('click', () => {
    if (document.fullscreenElement) {
        document.exitFullscreen();
    } else {
        // request fullscreen; actual resize handled on fullscreenchange
        document.documentElement.requestFullscreen();
    }
});

// resize canvas when entering/exiting fullscreen so game fills the screen
document.addEventListener('fullscreenchange', () => {
    if (document.fullscreenElement) {
        // make the canvas fill the viewport and prevent page scrollbars
        document.documentElement.style.overflow = 'hidden';
        setCanvasSize(window.innerWidth, window.innerHeight);
        // ensure the canvas CSS fills viewport
        canvas.style.width = '100vw';
        canvas.style.height = '100vh';
    } else {
        // restore original sizing and allow scrolling again
        document.documentElement.style.overflow = '';
        setCanvasSize(originalCanvasWidth, originalCanvasHeight);
        canvas.style.width = '';
        canvas.style.height = '';
    }
});

// Horror toggle removed from UI; horrorMode remains forced on by default

// Horror event: flash image + message + sounds
function triggerHorrorEvent() {
    // force enable (user requested always-on)
    horrorMode = true;
    horrorAllowSound = true;
    horrorAllowFlash = true;

    const overlayEl = document.getElementById('horror-overlay');
    const canvas = document.getElementById('horror-canvas');
    const msgEl = document.getElementById('horror-message');
    const gameCanvas = document.getElementById('game');
    const hud = document.querySelector('.hud');
    if (!overlayEl || !canvas || !msgEl) return;

    const msg = horrorMessages[Math.floor(Math.random() * horrorMessages.length)];
    msgEl.textContent = msg;

    // hide the game and HUD during the flash
    if (gameCanvas) gameCanvas.style.visibility = 'hidden';
    if (hud) hud.style.visibility = 'hidden';
    overlayEl.classList.remove('hidden');
    overlayEl.classList.add('horror-flash-bg');

    // size canvas to viewport
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const c = canvas.getContext('2d');

    // draw function that supports scaling
    function drawCaterpillarScaled(ctx, w, h, scale) {
        ctx.save();
        ctx.clearRect(0,0,w,h);
        // center and scale
        ctx.translate(w/2, h/2 + 30);
        ctx.scale(scale, scale);
        const cx = 0;
        const cy = 0;
        // body segments
        for (let i=0;i<7;i++){
            const x = - (i*30) + 40;
            const y = Math.sin(i*0.6)*6;
            ctx.beginPath();
            ctx.fillStyle = `rgba(${90+i*6}, ${10+i*3}, ${12+i*3}, 1)`;
            ctx.ellipse(x,y,36 - i*2, 26 - i*1.5, 0, 0, Math.PI*2);
            ctx.fill();
        }
        // head
        ctx.beginPath(); ctx.fillStyle = '#3b1b1b'; ctx.ellipse(40, cy, 46, 36, 0,0,Math.PI*2); ctx.fill();
        // eyes
        ctx.beginPath(); ctx.fillStyle='#fff'; ctx.ellipse(60, cy-8, 12,16,0,0,Math.PI*2); ctx.fill();
        ctx.beginPath(); ctx.fillStyle='#fff'; ctx.ellipse(60, cy+8, 12,16,0,0,Math.PI*2); ctx.fill();
        // veins
        ctx.strokeStyle='rgba(160,20,20,0.95)'; ctx.lineWidth=2;
        ctx.beginPath(); ctx.moveTo(56, -18); ctx.lineTo(68, -6); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(56, 18); ctx.lineTo(68, 6); ctx.stroke();
        // pupil
        ctx.beginPath(); ctx.fillStyle='#220000'; ctx.arc(64, 0, 5,0,Math.PI*2); ctx.fill();
        ctx.restore();
    }

    // animate scale + flash over duration
    const duration = 700;
    const start = performance.now();

    function frame(now) {
        const t = Math.min((now - start) / duration, 1);
        // ease-in-out for dramatic effect
        const eased = t < 0.5 ? 2*t*t : -1 + (4-2*t)*t;
        const scale = 0.8 + eased * 1.6; // from ~0.8 to ~2.4 then back

        if (horrorAllowFlash) drawCaterpillarScaled(c, canvas.width, canvas.height, scale);

        if (t < 1) {
            requestAnimationFrame(frame);
        } else {
            // end: clear and hide overlay, restore game
            overlayEl.classList.add('hidden');
            overlayEl.classList.remove('horror-flash-bg');
            c.clearRect(0,0,canvas.width,canvas.height);
            msgEl.textContent = '';
            if (gameCanvas) gameCanvas.style.visibility = '';
            if (hud) hud.style.visibility = '';
        }
    }

    if (horrorAllowSound) playHorrorSoundSequence();
    requestAnimationFrame(frame);
}

function playHorrorSoundSequence(){
    try{
        const actx = new (window.AudioContext || window.webkitAudioContext)();
        const master = actx.createGain(); master.gain.value = 0.6; master.connect(actx.destination);
        // short low sawtooth burst
        const osc = actx.createOscillator(); const g = actx.createGain();
        osc.type = 'sawtooth'; osc.frequency.value = 70; g.gain.value = 0;
        osc.connect(g); g.connect(master); osc.start();
        g.gain.linearRampToValueAtTime(1.0, actx.currentTime+0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime+0.25);
        osc.stop(actx.currentTime+0.3);
        // knocking sequence
        const knocks = [0.4,0.65,0.95];
        knocks.forEach(t=>{
            const o = actx.createOscillator(); const gg = actx.createGain();
            o.type='square'; o.frequency.value=220; gg.gain.value=0;
            o.connect(gg); gg.connect(master);
            o.start(actx.currentTime + t);
            gg.gain.linearRampToValueAtTime(0.5, actx.currentTime + t + 0.01);
            gg.gain.exponentialRampToValueAtTime(0.0001, actx.currentTime + t + 0.12);
            o.stop(actx.currentTime + t + 0.16);
        });
    }catch(e){ console.warn('Audio failed', e); }
}

// Start
resetGame();

// initial draw
draw();
