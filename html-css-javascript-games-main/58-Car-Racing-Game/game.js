(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const scoreVal = document.getElementById('scoreVal');
  const speedVal = document.getElementById('speedVal');
  const fuelBar = document.getElementById('fuelBar');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Sound Engine
  let audioCtx = null;
  function initAudio() {
    if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  }

  function playTone(freq, type, duration, vol) {
    if (!audioCtx) return;
    if (audioCtx.state === 'suspended') audioCtx.resume();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    gain.gain.setValueAtTime(vol, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + duration);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + duration);
  }

  const keys = {};
  window.addEventListener('keydown', (e) => (keys[e.code] = true));
  window.addEventListener('keyup', (e) => (keys[e.code] = false));

  let player = { x: 0, y: 0, w: 50, h: 90, speed: 120, targetX: 0 };
  let roadY = 0;
  let score = 0;
  let fuel = 100;
  let traffic = [];
  let pickups = [];
  let particles = [];
  let isRunning = false;

  const roadWidth = 420;

  function initGame() {
    player.x = width / 2;
    player.y = height - 160;
    player.targetX = width / 2;
    player.speed = 120;
    roadY = 0;
    score = 0;
    fuel = 100;
    traffic = [];
    pickups = [];
    particles = [];
  }

  function spawnTraffic() {
    if (Math.random() < 0.035 && traffic.length < 6) {
      const lane = Math.floor(Math.random() * 4);
      const laneX = width / 2 - roadWidth / 2 + 50 + lane * 105;
      traffic.push({
        x: laneX,
        y: -120,
        w: 48,
        h: 85,
        speed: 40 + Math.random() * 45,
        color: ['#3b82f6', '#10b981', '#a855f7', '#f43f5e', '#ffffff'][Math.floor(Math.random() * 5)]
      });
    }

    if (Math.random() < 0.02) {
      const lane = Math.floor(Math.random() * 4);
      const laneX = width / 2 - roadWidth / 2 + 50 + lane * 105;
      pickups.push({
        x: laneX,
        y: -50,
        type: Math.random() > 0.4 ? 'coin' : 'fuel',
        r: 16
      });
    }
  }

  function drawCar(x, y, w, h, color, isPlayer) {
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.fillRect(-w / 2 + 4, -h / 2 + 6, w, h);

    // Car Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h / 2, w, h, 10);
    ctx.fill();

    // Roof & Windows
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(-w * 0.36, -h * 0.25, w * 0.72, h * 0.45);

    // Front / Rear windshields
    ctx.fillStyle = '#38bdf8';
    ctx.fillRect(-w * 0.3, -h * 0.22, w * 0.6, h * 0.12);
    ctx.fillRect(-w * 0.3, h * 0.08, w * 0.6, h * 0.09);

    // Headlights
    ctx.fillStyle = isPlayer ? '#fef08a' : '#ef4444';
    ctx.fillRect(-w * 0.4, -h * 0.48, 10, 6);
    ctx.fillRect(w * 0.4 - 10, -h * 0.48, 10, 6);

    // Taillights
    ctx.fillStyle = isPlayer ? '#ef4444' : '#fef08a';
    ctx.fillRect(-w * 0.4, h * 0.42, 10, 6);
    ctx.fillRect(w * 0.4 - 10, h * 0.42, 10, 6);

    ctx.restore();
  }

  function loop() {
    if (!isRunning) return;

    // Controls
    if (keys['ArrowLeft'] || keys['KeyA']) player.x -= 7;
    if (keys['ArrowRight'] || keys['KeyD']) player.x += 7;
    if (keys['ArrowUp'] || keys['KeyW']) {
      player.speed = Math.min(220, player.speed + 1.2);
    } else if (keys['ArrowDown'] || keys['KeyS']) {
      player.speed = Math.max(70, player.speed - 1.5);
    } else {
      player.speed = Math.max(120, player.speed - 0.4);
    }

    // Keep on road
    const leftLimit = width / 2 - roadWidth / 2 + player.w / 2 + 10;
    const rightLimit = width / 2 + roadWidth / 2 - player.w / 2 - 10;
    player.x = Math.max(leftLimit, Math.min(rightLimit, player.x));

    // Move road
    roadY += player.speed * 0.12;
    score += Math.round(player.speed * 0.05);
    fuel -= 0.06;

    if (fuel <= 0) {
      gameOver('Out of Fuel!');
      return;
    }

    fuelBar.style.width = `${Math.max(0, fuel)}%`;
    fuelBar.style.background = fuel > 30 ? '#10b981' : '#ef4444';
    scoreVal.textContent = score;
    speedVal.innerHTML = `${Math.round(player.speed)} <span style="font-size: 12px; color: #94a3b8;">KM/H</span>`;

    spawnTraffic();

    // Update traffic
    for (let i = traffic.length - 1; i >= 0; i--) {
      const c = traffic[i];
      c.y += (player.speed - c.speed) * 0.12;

      // Collision check with player
      if (
        Math.abs(player.x - c.x) < (player.w + c.w) * 0.42 &&
        Math.abs(player.y - c.y) < (player.h + c.h) * 0.42
      ) {
        playTone(120, 'sawtooth', 0.4, 0.3);
        gameOver('Crashed into traffic!');
        return;
      }

      if (c.y > height + 150 || c.y < -300) traffic.splice(i, 1);
    }

    // Update pickups
    for (let i = pickups.length - 1; i >= 0; i--) {
      const p = pickups[i];
      p.y += player.speed * 0.12;

      if (Math.hypot(player.x - p.x, player.y - p.y) < 40) {
        if (p.type === 'coin') {
          score += 250;
          playTone(987, 'sine', 0.15, 0.2);
        } else {
          fuel = Math.min(100, fuel + 35);
          playTone(523, 'triangle', 0.25, 0.25);
        }
        pickups.splice(i, 1);
        continue;
      }

      if (p.y > height + 50) pickups.splice(i, 1);
    }

    // DRAW
    ctx.fillStyle = '#064e3b'; // Roadside grass
    ctx.fillRect(0, 0, width, height);

    // Road asphalt
    const roadX = width / 2 - roadWidth / 2;
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(roadX, 0, roadWidth, height);

    // Road Borders
    ctx.fillStyle = '#e2e8f0';
    ctx.fillRect(roadX, 0, 8, height);
    ctx.fillRect(roadX + roadWidth - 8, 0, 8, height);

    // Dashed lanes
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 4;
    ctx.setLineDash([30, 40]);
    ctx.lineDashOffset = -roadY;

    for (let l = 1; l < 4; l++) {
      const lx = roadX + (l * roadWidth) / 4;
      ctx.beginPath();
      ctx.moveTo(lx, 0);
      ctx.lineTo(lx, height);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Draw Pickups
    pickups.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = p.type === 'coin' ? '#ffd700' : '#ef4444';
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 12px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(p.type === 'coin' ? '$' : 'F', p.x, p.y);
    });

    // Draw Traffic
    traffic.forEach((c) => drawCar(c.x, c.y, c.w, c.h, c.color, false));

    // Draw Player
    drawCar(player.x, player.y, player.w, player.h, '#ffd200', true);

    requestAnimationFrame(loop);
  }

  function gameOver(msg) {
    isRunning = false;
    overlay.style.display = 'flex';
    overlay.querySelector('.title-banner').textContent = '💥 ' + msg;
    overlay.querySelector('p').textContent = `Final Score: ${score}`;
    startBtn.textContent = 'PLAY AGAIN';
  }

  startBtn.addEventListener('click', () => {
    initAudio();
    overlay.style.display = 'none';
    initGame();
    isRunning = true;
    requestAnimationFrame(loop);
  });
})();
