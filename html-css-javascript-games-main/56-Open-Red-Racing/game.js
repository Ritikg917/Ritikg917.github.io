(function () {
  'use strict';

  const canvas = document.getElementById('gameCanvas');
  const ctx = canvas.getContext('2d');
  const speedVal = document.getElementById('speedVal');
  const scoreVal = document.getElementById('scoreVal');
  const nitroVal = document.getElementById('nitroVal');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');

  let width = (canvas.width = window.innerWidth);
  let height = (canvas.height = window.innerHeight);

  window.addEventListener('resize', () => {
    width = canvas.width = window.innerWidth;
    height = canvas.height = window.innerHeight;
  });

  // Sound Engine (Web Audio API)
  let audioCtx = null;
  let engineOsc = null;
  let engineGain = null;

  function initAudio() {
    if (audioCtx) return;
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContext();
    engineOsc = audioCtx.createOscillator();
    engineGain = audioCtx.createGain();
    engineOsc.type = 'sawtooth';
    engineOsc.frequency.setValueAtTime(60, audioCtx.currentTime);
    engineGain.gain.setValueAtTime(0.05, audioCtx.currentTime);
    engineOsc.connect(engineGain);
    engineGain.connect(audioCtx.destination);
    engineOsc.start();
  }

  function updateEngineSound(spd) {
    if (!audioCtx || !engineOsc) return;
    const freq = 50 + (spd / 260) * 220;
    engineOsc.frequency.setTargetAtTime(freq, audioCtx.currentTime, 0.05);
  }

  // Road configuration
  const roadWidth = 2000;
  const segmentLength = 200;
  const rumbleLength = 3;
  const drawDistance = 240;
  const cameraHeight = 1000;
  const fieldOfView = 100;
  const cameraDepth = 1 / Math.tan(((fieldOfView / 2) * Math.PI) / 180);

  let segments = [];
  let cars = [];
  let playerX = 0;
  let position = 0;
  let speed = 0;
  const maxSpeed = 260;
  const accel = 60;
  const breaking = -100;
  const decel = -30;
  let nitro = 100;
  let isNitro = false;
  let distance = 0;
  let isRunning = false;

  // Keyboard
  const keys = {};
  window.addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (e.code === 'Space') isNitro = true;
  });
  window.addEventListener('keyup', (e) => {
    keys[e.code] = false;
    if (e.code === 'Space') isNitro = false;
  });

  // Build Track
  function buildRoad() {
    segments = [];
    const totalSegments = 1600;

    for (let i = 0; i < totalSegments; i++) {
      let curve = 0;
      let y = 0;

      // Curves and hills
      if (i > 100 && i < 300) curve = 2.5;
      else if (i > 400 && i < 600) curve = -3;
      else if (i > 700 && i < 1000) {
        curve = 3.5;
        y = Math.sin((i / 30) * Math.PI) * 1200;
      } else if (i > 1100 && i < 1400) {
        curve = -2;
        y = Math.cos((i / 25) * Math.PI) * 1500;
      }

      segments.push({
        index: i,
        p1: { world: { y, z: i * segmentLength }, camera: {}, screen: {} },
        p2: { world: { y, z: (i + 1) * segmentLength }, camera: {}, screen: {} },
        curve: curve,
        color:
          Math.floor(i / rumbleLength) % 2 === 0
            ? { road: '#2a3346', grass: '#151c2d', rumble: '#ff0844', lane: '#ffffff' }
            : { road: '#252d3e', grass: '#101524', rumble: '#ffffff', lane: '#252d3e' },
        tree: Math.random() < 0.12 ? (Math.random() > 0.5 ? 1.6 : -1.6) : null
      });
    }

    // AI Traffic Cars
    cars = [];
    for (let i = 0; i < 40; i++) {
      cars.push({
        offset: (Math.random() - 0.5) * 1.5,
        z: 800 * segmentLength + Math.random() * (totalSegments - 900) * segmentLength,
        speed: 90 + Math.random() * 80,
        color: ['#00e5ff', '#ffd200', '#10b981', '#ffffff', '#a855f7'][Math.floor(Math.random() * 5)]
      });
    }
  }

  function project(p, camX, camY, camZ) {
    p.camera.x = (p.world.x || 0) - camX;
    p.camera.y = (p.world.y || 0) - camY;
    p.camera.z = (p.world.z || 0) - camZ;
    p.screen.scale = cameraDepth / p.camera.z;
    p.screen.x = Math.round(width / 2 + (p.screen.scale * p.camera.x * width) / 2);
    p.screen.y = Math.round(height / 2 - (p.screen.scale * p.camera.y * height) / 2);
    p.screen.w = Math.round((p.screen.scale * roadWidth * width) / 2);
  }

  function drawPolygon(x1, y1, x2, y2, x3, y3, x4, y4, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.lineTo(x4, y4);
    ctx.closePath();
    ctx.fill();
  }

  function drawTree(x, y, scale) {
    const s = scale * 180;
    ctx.fillStyle = '#0f3822';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 1.8);
    ctx.lineTo(x + s * 0.7, y);
    ctx.lineTo(x - s * 0.7, y);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = '#185633';
    ctx.beginPath();
    ctx.moveTo(x, y - s * 2.2);
    ctx.lineTo(x + s * 0.5, y - s * 0.5);
    ctx.lineTo(x - s * 0.5, y - s * 0.5);
    ctx.closePath();
    ctx.fill();
  }

  function drawCar(x, y, scale, color, isPlayer) {
    const w = 120 * scale;
    const h = 55 * scale;
    ctx.save();
    ctx.translate(x, y);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.45)';
    ctx.beginPath();
    ctx.ellipse(0, 0, w * 0.6, h * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.roundRect(-w / 2, -h, w, h * 0.75, 8 * scale);
    ctx.fill();

    // Cabin
    ctx.fillStyle = '#111827';
    ctx.beginPath();
    ctx.roundRect(-w * 0.35, -h * 1.3, w * 0.7, h * 0.55, 6 * scale);
    ctx.fill();

    // Windshield
    ctx.fillStyle = '#38bdf8';
    ctx.beginPath();
    ctx.roundRect(-w * 0.28, -h * 1.25, w * 0.56, h * 0.25, 4 * scale);
    ctx.fill();

    // Tail Lights
    ctx.fillStyle = isPlayer && (keys['ArrowDown'] || keys['KeyS']) ? '#ff0033' : '#aa0011';
    ctx.fillRect(-w * 0.45, -h * 0.5, w * 0.2, h * 0.18);
    ctx.fillRect(w * 0.25, -h * 0.5, w * 0.2, h * 0.18);

    // Nitro flame
    if (isPlayer && isNitro && nitro > 0 && speed > 50) {
      ctx.fillStyle = '#00e5ff';
      ctx.beginPath();
      ctx.moveTo(-w * 0.1, 0);
      ctx.lineTo(w * 0.1, 0);
      ctx.lineTo(0, h * 0.8 + Math.random() * 20);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  let lastTime = performance.now();

  function update(dt) {
    // Player Controls
    if (keys['ArrowUp'] || keys['KeyW']) {
      const topSpeed = isNitro && nitro > 0 ? maxSpeed * 1.25 : maxSpeed;
      speed = Math.min(topSpeed, speed + accel * dt * 2.5);
      if (isNitro && nitro > 0) nitro = Math.max(0, nitro - dt * 20);
    } else if (keys['ArrowDown'] || keys['KeyS']) {
      speed = Math.max(0, speed + breaking * dt * 2.5);
    } else {
      speed = Math.max(0, speed + decel * dt);
      nitro = Math.min(100, nitro + dt * 5);
    }

    if (keys['ArrowLeft'] || keys['KeyA']) {
      playerX -= (speed / maxSpeed) * dt * 1.8;
    }
    if (keys['ArrowRight'] || keys['KeyD']) {
      playerX += (speed / maxSpeed) * dt * 1.8;
    }

    // Keep on track
    if (playerX < -1.4 || playerX > 1.4) {
      speed = Math.max(20, speed - dt * 120); // grass drag
    }

    position += speed * 12 * dt;
    distance += speed * dt * 0.3;

    const trackLength = segments.length * segmentLength;
    while (position >= trackLength) position -= trackLength;
    while (position < 0) position += trackLength;

    // Update AI Traffic
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      c.z += c.speed * 10 * dt;
      if (c.z >= trackLength) c.z -= trackLength;

      // Collision check
      if (Math.abs(c.z - position) < 250 && Math.abs(c.offset - playerX) < 0.4) {
        speed = Math.max(30, speed * 0.5);
      }
    }

    // Update HUD
    speedVal.innerHTML = `${Math.round(speed)} <span class="speed-unit">KM/H</span>`;
    scoreVal.innerHTML = `${Math.round(distance)} <span class="speed-unit">M</span>`;
    nitroVal.textContent = `${Math.round(nitro)}%`;
    nitroVal.style.color = isNitro && nitro > 0 ? '#00e5ff' : '#ffaa00';

    updateEngineSound(speed);
  }

  function render() {
    ctx.clearRect(0, 0, width, height);

    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, height / 2);
    sky.addColorStop(0, '#0a0d1a');
    sky.addColorStop(1, '#ff416c');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, width, height / 2);

    // Distant mountains / skyline
    ctx.fillStyle = '#1e102d';
    for (let i = 0; i < 8; i++) {
      const bx = (i * width) / 6 - ((position * 0.02) % (width / 6));
      ctx.fillRect(bx, height / 2 - 80, width / 7, 80);
    }

    const startPos = Math.floor(position / segmentLength);
    const playerSegment = segments[startPos % segments.length];
    let maxy = height;
    let x = 0;
    let dx = -(playerSegment.curve * (position % segmentLength) / segmentLength);

    for (let n = 0; n < drawDistance; n++) {
      const segment = segments[(startPos + n) % segments.length];
      const looped = segment.index < playerSegment.index;

      project(
        segment.p1,
        playerX * roadWidth - x,
        cameraHeight + playerSegment.p1.world.y,
        position - (looped ? segments.length * segmentLength : 0)
      );
      project(
        segment.p2,
        playerX * roadWidth - x - dx,
        cameraHeight + playerSegment.p1.world.y,
        position - (looped ? segments.length * segmentLength : 0)
      );

      x += dx;
      dx += segment.curve;

      if (
        segment.p1.camera.z <= cameraDepth ||
        segment.p2.screen.y >= maxy ||
        segment.p2.screen.y >= segment.p1.screen.y
      )
        continue;

      // Draw Grass
      ctx.fillStyle = segment.color.grass;
      ctx.fillRect(0, segment.p2.screen.y, width, segment.p1.screen.y - segment.p2.screen.y);

      // Draw Road & Rumble
      drawPolygon(
        segment.p1.screen.x - segment.p1.screen.w * 1.15, segment.p1.screen.y,
        segment.p1.screen.x + segment.p1.screen.w * 1.15, segment.p1.screen.y,
        segment.p2.screen.x + segment.p2.screen.w * 1.15, segment.p2.screen.y,
        segment.p2.screen.x - segment.p2.screen.w * 1.15, segment.p2.screen.y,
        segment.color.rumble
      );
      drawPolygon(
        segment.p1.screen.x - segment.p1.screen.w, segment.p1.screen.y,
        segment.p1.screen.x + segment.p1.screen.w, segment.p1.screen.y,
        segment.p2.screen.x + segment.p2.screen.w, segment.p2.screen.y,
        segment.p2.screen.x - segment.p2.screen.w, segment.p2.screen.y,
        segment.color.road
      );

      // Lanes
      if (segment.color.lane !== segment.color.road) {
        drawPolygon(
          segment.p1.screen.x - segment.p1.screen.w * 0.03, segment.p1.screen.y,
          segment.p1.screen.x + segment.p1.screen.w * 0.03, segment.p1.screen.y,
          segment.p2.screen.x + segment.p2.screen.w * 0.03, segment.p2.screen.y,
          segment.p2.screen.x - segment.p2.screen.w * 0.03, segment.p2.screen.y,
          segment.color.lane
        );
      }

      // Trees
      if (segment.tree) {
        const treeX = segment.p1.screen.x + segment.tree * segment.p1.screen.w;
        drawTree(treeX, segment.p1.screen.y, segment.p1.screen.scale);
      }

      maxy = segment.p1.screen.y;
    }

    // Draw AI Traffic Cars
    for (let i = 0; i < cars.length; i++) {
      const c = cars[i];
      let relZ = c.z - position;
      if (relZ < 0) relZ += segments.length * segmentLength;
      if (relZ > 0 && relZ < drawDistance * segmentLength) {
        const segIdx = Math.floor(c.z / segmentLength) % segments.length;
        const seg = segments[segIdx];
        const scale = cameraDepth / relZ;
        const carX = width / 2 + (scale * (c.offset * roadWidth - playerX * roadWidth) * width) / 2;
        const carY = height / 2 - (scale * (seg.p1.world.y - (cameraHeight + playerSegment.p1.world.y)) * height) / 2;
        drawCar(carX, carY, scale * 3.5, c.color, false);
      }
    }

    // Draw Player Car
    drawCar(width / 2, height - 70, 1.4, '#ff0844', true);
  }

  function loop(now) {
    if (!isRunning) return;
    const dt = Math.min(0.05, (now - lastTime) / 1000);
    lastTime = now;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  startBtn.addEventListener('click', () => {
    initAudio();
    overlay.style.display = 'none';
    buildRoad();
    isRunning = true;
    lastTime = performance.now();
    requestAnimationFrame(loop);
  });
})();
