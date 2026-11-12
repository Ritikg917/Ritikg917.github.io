// GTA Advance - Top-Down Open World Engine
(() => {
  'use strict';

  // --- AUDIO SYNTHESIS ENGINE ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.radioStation = 0;
      this.radioPlaying = false;
      this.engineOsc = null;
      this.engineGain = null;
      this.sirenOsc = null;
      this.sirenGain = null;
      this.stations = ['Off', 'Head Radio', 'Flash FM', 'Liberty Beats'];
      this.radioStep = 0;
      this.radioTimer = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
      this.setupEngineSound();
      this.setupSirenSound();
    }

    setupEngineSound() {
      if (!this.ctx) return;
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(55, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);
      
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(400, this.ctx.currentTime);

      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();
    }

    setupSirenSound() {
      if (!this.ctx) return;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.setValueAtTime(700, this.ctx.currentTime);
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    }

    updateEngine(speedRatio, inCar) {
      if (!this.ctx || !this.engineGain) return;
      if (!inCar) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        return;
      }
      const freq = 50 + Math.abs(speedRatio) * 160;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.05);
    }

    updateSiren(wantedLevel) {
      if (!this.ctx || !this.sirenGain) return;
      if (wantedLevel > 0) {
        const time = this.ctx.currentTime;
        const freq = 650 + Math.sin(time * 6) * 250;
        this.sirenOsc.frequency.setValueAtTime(freq, time);
        this.sirenGain.gain.setTargetAtTime(0.15, time, 0.1);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }

    playShoot(type = 'pistol') {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = type === 'shotgun' ? 'square' : 'sawtooth';
      osc.frequency.setValueAtTime(type === 'rpg' ? 120 : 380, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.15);

      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.15);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.15);
    }

    playExplosion() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(90, t);
      osc.frequency.exponentialRampToValueAtTime(20, t + 0.6);

      gain.gain.setValueAtTime(0.4, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.6);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.6);
    }

    playSkid() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(900 + Math.random() * 200, t);
      gain.gain.setValueAtTime(0.05, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.08);

      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    playDoor() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(140, t);
      osc.frequency.exponentialRampToValueAtTime(40, t + 0.1);
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    playCash() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(987.77, t); // B5
      osc.frequency.setValueAtTime(1318.51, t + 0.08); // E6
      gain.gain.setValueAtTime(0.18, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.25);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.25);
    }

    cycleRadio() {
      this.radioStation = (this.radioStation + 1) % this.stations.length;
      return this.stations[this.radioStation];
    }
  }

  const audio = new SoundEngine();

  // --- GAME CONFIG & CONSTANTS ---
  const WORLD_WIDTH = 3200;
  const WORLD_HEIGHT = 3200;
  const TILE_SIZE = 64;

  const WEAPONS = [
    { name: 'FISTS', icon: '👊', ammo: Infinity, damage: 15, range: 45, rate: 300 },
    { name: 'PISTOL', icon: '🔫', ammo: 100, damage: 35, range: 350, rate: 260, speed: 18 },
    { name: 'UZI', icon: '⚡', ammo: 250, damage: 25, range: 420, rate: 110, speed: 20 },
    { name: 'SHOTGUN', icon: '💥', ammo: 50, damage: 70, range: 280, rate: 600, speed: 16 },
    { name: 'RPG', icon: '🚀', ammo: 15, damage: 200, range: 500, rate: 1000, speed: 12 }
  ];

  // --- CITY MAP GENERATION ---
  class CityMap {
    constructor() {
      this.roads = [];
      this.buildings = [];
      this.sidewalks = [];
      this.zones = {
        hospital: { x: 400, y: 400, w: 180, h: 140, name: 'Hope Medical Center' },
        police: { x: 2600, y: 500, w: 180, h: 140, name: 'LCPD Precinct' },
        paynspray: { x: 1500, y: 1500, w: 120, h: 100, name: 'Pay \'n\' Spray' },
        warehouse: { x: 2700, y: 2600, w: 220, h: 180, name: 'Mafia Harbor' }
      };
      this.phoneBooths = [
        { x: 750, y: 650, ringing: true, missionId: 1 },
        { x: 1650, y: 1350, ringing: false, missionId: 2 },
        { x: 2400, y: 1800, ringing: false, missionId: 3 }
      ];
      this.buildGrid();
    }

    buildGrid() {
      // Create major avenues (vertical & horizontal)
      const roadCoordsX = [300, 700, 1100, 1500, 1900, 2300, 2700];
      const roadCoordsY = [300, 700, 1100, 1500, 1900, 2300, 2700];
      const roadWidth = 100;

      // Vertical roads
      roadCoordsX.forEach(x => {
        this.roads.push({ x: x - roadWidth / 2, y: 0, w: roadWidth, h: WORLD_HEIGHT, dir: 'v' });
      });
      // Horizontal roads
      roadCoordsY.forEach(y => {
        this.roads.push({ x: 0, y: y - roadWidth / 2, w: WORLD_WIDTH, h: roadWidth, dir: 'h' });
      });

      // City blocks (Buildings)
      for (let i = 0; i < roadCoordsX.length - 1; i++) {
        for (let j = 0; j < roadCoordsY.length - 1; j++) {
          const x1 = roadCoordsX[i] + roadWidth / 2 + 20;
          const y1 = roadCoordsY[j] + roadWidth / 2 + 20;
          const bw = (roadCoordsX[i+1] - roadWidth / 2) - x1 - 20;
          const bh = (roadCoordsY[j+1] - roadWidth / 2) - y1 - 20;

          // Building styles
          const styles = ['#3a3e47', '#2f3542', '#4b5563', '#374151', '#23272e', '#1e293b'];
          const roofColor = styles[(i * 5 + j) % styles.length];
          const hasHelipad = (i === 2 && j === 2);

          this.buildings.push({
            x: x1,
            y: y1,
            w: bw,
            h: bh,
            color: roofColor,
            hasHelipad: hasHelipad
          });
        }
      }
    }

    checkBuildingCollision(x, y, radius) {
      for (let b of this.buildings) {
        if (x + radius > b.x && x - radius < b.x + b.w &&
            y + radius > b.y && y - radius < b.y + b.h) {
          return b;
        }
      }
      return null;
    }
  }

  // --- VEHICLE CLASS ---
  class Vehicle {
    constructor(x, y, angle, type = 'sedan') {
      this.x = x;
      this.y = y;
      this.angle = angle;
      this.speed = 0;
      this.type = type;
      this.health = 100;
      this.isPlayer = false;
      this.isPolice = (type === 'police');
      this.driver = null;

      // Type specs
      if (type === 'sports') {
        this.w = 42; this.h = 24; this.maxSpeed = 12; this.accel = 0.28; this.turnSpeed = 0.055; this.color = '#ff3333';
      } else if (type === 'police') {
        this.w = 44; this.h = 25; this.maxSpeed = 11; this.accel = 0.24; this.turnSpeed = 0.05; this.color = '#111';
      } else if (type === 'taxi') {
        this.w = 42; this.h = 24; this.maxSpeed = 9; this.accel = 0.2; this.turnSpeed = 0.048; this.color = '#ffd700';
      } else { // sedan
        this.w = 40; this.h = 24; this.maxSpeed = 9; this.accel = 0.18; this.turnSpeed = 0.045; this.color = '#2563eb';
      }
      this.smokeTimer = 0;
    }

    update(map, controls, player) {
      if (this.health <= 0) return;

      if (this.isPlayer) {
        // Player input
        if (controls.forward) this.speed = Math.min(this.speed + this.accel, this.maxSpeed);
        else if (controls.backward) this.speed = Math.max(this.speed - this.accel * 0.8, -this.maxSpeed * 0.4);
        else this.speed *= 0.94; // friction

        if (controls.drift) {
          this.speed *= 0.97;
          audio.playSkid();
        }

        if (Math.abs(this.speed) > 0.2) {
          const dir = this.speed > 0 ? 1 : -1;
          const turn = controls.drift ? this.turnSpeed * 1.5 : this.turnSpeed;
          if (controls.left) this.angle -= turn * dir;
          if (controls.right) this.angle += turn * dir;
        }

        audio.updateEngine(this.speed / this.maxSpeed, true);
      } else if (this.isPolice && player.wantedLevel > 0) {
        // Police Chase AI
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const targetAngle = Math.atan2(dy, dx);
        
        let diff = targetAngle - this.angle;
        while (diff < -Math.PI) diff += Math.PI * 2;
        while (diff > Math.PI) diff -= Math.PI * 2;

        if (diff > 0.1) this.angle += this.turnSpeed;
        else if (diff < -0.1) this.angle -= this.turnSpeed;

        this.speed = Math.min(this.speed + this.accel, this.maxSpeed * 0.85);
      } else {
        // Civilian cruise
        this.speed = Math.min(this.speed + 0.1, 4.5);
      }

      // Movement vector
      const vx = Math.cos(this.angle) * this.speed;
      const vy = Math.sin(this.angle) * this.speed;

      this.x += vx;
      this.y += vy;

      // World boundary
      this.x = Math.max(40, Math.min(WORLD_WIDTH - 40, this.x));
      this.y = Math.max(40, Math.min(WORLD_HEIGHT - 40, this.y));

      // Building collision
      const col = map.checkBuildingCollision(this.x, this.y, 20);
      if (col) {
        this.x -= vx * 1.5;
        this.y -= vy * 1.5;
        this.speed = -this.speed * 0.4;
        this.health -= Math.abs(this.speed) * 4;
        audio.playDoor();
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fillRect(-this.w / 2 + 4, -this.h / 2 + 4, this.w, this.h);

      // Body
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);

      // Windshield & windows
      ctx.fillStyle = '#1a1f2c';
      ctx.fillRect(-this.w / 2 + 10, -this.h / 2 + 3, 10, this.h - 6);
      ctx.fillRect(-this.w / 2 + 24, -this.h / 2 + 3, 8, this.h - 6);

      // Headlights
      ctx.fillStyle = '#fffca8';
      ctx.fillRect(this.w / 2 - 3, -this.h / 2 + 2, 3, 4);
      ctx.fillRect(this.w / 2 - 3, this.h / 2 - 6, 3, 4);

      // Taillights
      ctx.fillStyle = '#ff2222';
      ctx.fillRect(-this.w / 2, -this.h / 2 + 2, 3, 4);
      ctx.fillRect(-this.w / 2, this.h / 2 - 6, 3, 4);

      // Police lightbar
      if (this.isPolice) {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-4, -6, 8, 12);
        const flash = Math.floor(Date.now() / 150) % 2 === 0;
        ctx.fillStyle = flash ? '#ff0000' : '#0088ff';
        ctx.fillRect(-3, -5, 6, 4);
        ctx.fillStyle = flash ? '#0088ff' : '#ff0000';
        ctx.fillRect(-3, 1, 6, 4);
      }

      // Taxi roof sign
      if (this.type === 'taxi') {
        ctx.fillStyle = '#fff';
        ctx.fillRect(-6, -4, 12, 8);
        ctx.fillStyle = '#111';
        ctx.font = '7px sans-serif';
        ctx.fillText('TAXI', -5, 2);
      }

      // Damage smoke
      if (this.health < 40) {
        ctx.fillStyle = 'rgba(60,60,60,0.7)';
        ctx.beginPath();
        ctx.arc(this.w / 2 - 5, (Math.random() - 0.5) * 8, 6 + Math.random() * 4, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  // --- PEDESTRIAN / NPC CLASS ---
  class Pedestrian {
    constructor(x, y) {
      this.x = x;
      this.y = y;
      this.angle = Math.random() * Math.PI * 2;
      this.speed = 1.2;
      this.health = 40;
      this.color = ['#f59e0b', '#10b981', '#6366f1', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)];
      this.state = 'walk'; // walk, panicking, dead
    }

    update(map, player) {
      if (this.health <= 0) {
        this.state = 'dead';
        return;
      }

      const distToPlayer = Math.hypot(player.x - this.x, player.y - this.y);
      if (distToPlayer < 120 && player.wantedLevel > 0) {
        this.state = 'panicking';
        this.angle = Math.atan2(this.y - player.y, this.x - player.x);
        this.speed = 3.2;
      }

      this.x += Math.cos(this.angle) * this.speed;
      this.y += Math.sin(this.angle) * this.speed;

      // Obstacle collision
      if (map.checkBuildingCollision(this.x, this.y, 10)) {
        this.angle += Math.PI * 0.8;
      }
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      ctx.rotate(this.angle);

      if (this.state === 'dead') {
        ctx.fillStyle = '#b91c1c';
        ctx.beginPath();
        ctx.arc(0, 0, 10, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
        return;
      }

      // Shadow
      ctx.fillStyle = 'rgba(0,0,0,0.25)';
      ctx.beginPath();
      ctx.arc(2, 2, 8, 0, Math.PI * 2);
      ctx.fill();

      // Body & Shoulders
      ctx.fillStyle = this.color;
      ctx.beginPath();
      ctx.ellipse(0, 0, 9, 6, 0, 0, Math.PI * 2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fcd34d';
      ctx.beginPath();
      ctx.arc(0, 0, 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();
    }
  }

  // --- PROJECTILE CLASS ---
  class Bullet {
    constructor(x, y, angle, weapon) {
      this.x = x;
      this.y = y;
      this.vx = Math.cos(angle) * weapon.speed;
      this.vy = Math.sin(angle) * weapon.speed;
      this.damage = weapon.damage;
      this.isRPG = (weapon.name === 'RPG');
      this.life = weapon.range / weapon.speed;
    }

    update() {
      this.x += this.vx;
      this.y += this.vy;
      this.life--;
      return this.life > 0;
    }

    draw(ctx) {
      ctx.fillStyle = this.isRPG ? '#ff4500' : '#ffd700';
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.isRPG ? 5 : 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  // --- PICKUP ITEM CLASS ---
  class Pickup {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type; // health, armor, cash, bribe
    }

    draw(ctx) {
      ctx.save();
      ctx.translate(this.x, this.y);
      const bob = Math.sin(Date.now() / 200) * 3;

      if (this.type === 'health') {
        ctx.fillStyle = '#ef4444';
        ctx.font = '22px sans-serif';
        ctx.fillText('❤️', -11, bob + 8);
      } else if (this.type === 'armor') {
        ctx.fillStyle = '#3b82f6';
        ctx.font = '22px sans-serif';
        ctx.fillText('🛡️', -11, bob + 8);
      } else if (this.type === 'cash') {
        ctx.fillStyle = '#10b981';
        ctx.font = '22px sans-serif';
        ctx.fillText('💵', -11, bob + 8);
      } else if (this.type === 'bribe') {
        ctx.fillStyle = '#fbbf24';
        ctx.font = '22px sans-serif';
        ctx.fillText('⭐', -11, bob + 8);
      }
      ctx.restore();
    }
  }

  // --- MAIN GAME MANAGER ---
  class Game {
    constructor() {
      this.canvas = document.getElementById('game-canvas');
      this.ctx = this.canvas.getContext('2d');
      this.radarCanvas = document.getElementById('radar-canvas');
      this.radarCtx = this.radarCanvas.getContext('2d');

      this.map = new CityMap();

      // Player state
      this.player = {
        x: 450,
        y: 450,
        angle: 0,
        speed: 3.5,
        health: 100,
        armor: 100,
        cash: 2500,
        wantedLevel: 0,
        wantedCooldown: 0,
        weaponIndex: 0,
        vehicle: null,
        sprint: false
      };

      this.vehicles = [];
      this.pedestrians = [];
      this.bullets = [];
      this.pickups = [];

      this.controls = {
        forward: false, backward: false, left: false, right: false,
        shoot: false, sprint: false, drift: false, action: false
      };

      this.lastShotTime = 0;
      this.camera = { x: 450, y: 450 };

      // Missions
      this.currentMission = null;
      this.missions = [
        {
          id: 1,
          title: 'Getaway Rush',
          speaker: 'King Courtney',
          desc: 'Evade police pursuit within 60 seconds!',
          reward: 5000,
          targetWanted: 2,
          timer: 60
        },
        {
          id: 2,
          title: 'Smuggler\'s Run',
          speaker: 'Asuka',
          desc: 'Deliver package to the Harbor Warehouse!',
          reward: 8000,
          targetPos: { x: 2700, y: 2600 }
        },
        {
          id: 3,
          title: 'Turf Takedown',
          speaker: '8-Ball',
          desc: 'Eliminate the rival gang van patrolling 15th Street!',
          reward: 12000
        }
      ];

      this.initWorldEntities();
      this.setupEventListeners();
      this.setupTouchControls();
      this.resize();
    }

    initWorldEntities() {
      // Spawn parked / cruising vehicles
      const vehicleTypes = ['sedan', 'sports', 'taxi', 'police'];
      for (let i = 0; i < 28; i++) {
        const road = this.map.roads[i % this.map.roads.length];
        const vx = road.dir === 'v' ? road.x + road.w / 2 : Math.random() * WORLD_WIDTH;
        const vy = road.dir === 'h' ? road.y + road.h / 2 : Math.random() * WORLD_HEIGHT;
        const vtype = vehicleTypes[i % vehicleTypes.length];
        this.vehicles.push(new Vehicle(vx, vy, road.dir === 'v' ? Math.PI / 2 : 0, vtype));
      }

      // Spawn pedestrians
      for (let i = 0; i < 50; i++) {
        const px = 200 + Math.random() * (WORLD_WIDTH - 400);
        const py = 200 + Math.random() * (WORLD_HEIGHT - 400);
        this.pedestrians.push(new Pedestrian(px, py));
      }

      // Spawn pickups around city
      for (let i = 0; i < 18; i++) {
        const types = ['health', 'armor', 'cash', 'bribe'];
        const type = types[i % types.length];
        this.pickups.push(new Pickup(250 + Math.random() * 2600, 250 + Math.random() * 2600, type));
      }
    }

    resize() {
      this.canvas.width = window.innerWidth;
      this.canvas.height = window.innerHeight;
      this.radarCanvas.width = 150;
      this.radarCanvas.height = 150;
    }

    setupEventListeners() {
      window.addEventListener('resize', () => this.resize());

      // Keyboard
      window.addEventListener('keydown', (e) => {
        audio.init();
        const code = e.code;
        if (code === 'KeyW' || code === 'ArrowUp') this.controls.forward = true;
        if (code === 'KeyS' || code === 'ArrowDown') this.controls.backward = true;
        if (code === 'KeyA' || code === 'ArrowLeft') this.controls.left = true;
        if (code === 'KeyD' || code === 'ArrowRight') this.controls.right = true;
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
          this.controls.sprint = true;
          this.controls.drift = true;
        }
        if (code === 'Space') this.controls.shoot = true;
        if (code === 'KeyF' || code === 'Enter') this.toggleVehicleEntry();
        if (code === 'KeyE') this.cycleWeapon(1);
        if (code === 'KeyQ') this.cycleWeapon(-1);
        if (code === 'KeyR') {
          const st = audio.cycleRadio();
          const rh = document.getElementById('hud-radio');
          rh.style.display = 'block';
          rh.textContent = `📻 Station: ${st}`;
          setTimeout(() => rh.style.display = 'none', 3000);
        }
      });

      window.addEventListener('keyup', (e) => {
        const code = e.code;
        if (code === 'KeyW' || code === 'ArrowUp') this.controls.forward = false;
        if (code === 'KeyS' || code === 'ArrowDown') this.controls.backward = false;
        if (code === 'KeyA' || code === 'ArrowLeft') this.controls.left = false;
        if (code === 'KeyD' || code === 'ArrowRight') this.controls.right = false;
        if (code === 'ShiftLeft' || code === 'ShiftRight') {
          this.controls.sprint = false;
          this.controls.drift = false;
        }
        if (code === 'Space') this.controls.shoot = false;
      });

      // Mouse Aim & Shoot
      this.canvas.addEventListener('mousemove', (e) => {
        if (!this.player.vehicle) {
          const rect = this.canvas.getBoundingClientRect();
          const mx = e.clientX - rect.left;
          const my = e.clientY - rect.top;
          const screenPX = this.canvas.width / 2;
          const screenPY = this.canvas.height / 2;
          this.player.angle = Math.atan2(my - screenPY, mx - screenPX);
        }
      });

      this.canvas.addEventListener('mousedown', () => {
        audio.init();
        this.controls.shoot = true;
      });
      window.addEventListener('mouseup', () => this.controls.shoot = false);

      // Start & Respawn Buttons
      document.getElementById('start-btn').addEventListener('click', () => {
        audio.init();
        document.getElementById('start-modal').style.display = 'none';
      });

      document.getElementById('respawn-btn').addEventListener('click', () => {
        this.respawnAtHospital();
        document.getElementById('wasted-modal').style.display = 'none';
      });

      document.getElementById('dialog-btn').addEventListener('click', () => {
        document.getElementById('dialog-box').style.display = 'none';
        this.startMission(this.pendingMission);
      });
    }

    setupTouchControls() {
      const isTouch = ('ontouchstart' in window) || navigator.maxTouchPoints > 0;
      if (!isTouch) return;

      document.getElementById('touch-controls').style.display = 'block';

      // Virtual Joystick
      const zone = document.getElementById('joystick-zone');
      const knob = document.getElementById('joystick-knob');
      let touchId = null;
      let startX = 0, startY = 0;

      zone.addEventListener('touchstart', (e) => {
        e.preventDefault();
        audio.init();
        const t = e.changedTouches[0];
        touchId = t.identifier;
        const rect = zone.getBoundingClientRect();
        startX = rect.left + rect.width / 2;
        startY = rect.top + rect.height / 2;
      });

      zone.addEventListener('touchmove', (e) => {
        e.preventDefault();
        for (let t of e.changedTouches) {
          if (t.identifier === touchId) {
            const dx = t.clientX - startX;
            const dy = t.clientY - startY;
            const dist = Math.hypot(dx, dy);
            const maxR = 45;
            const angle = Math.atan2(dy, dx);
            const clampedDist = Math.min(dist, maxR);

            knob.style.transform = `translate(${Math.cos(angle) * clampedDist}px, ${Math.sin(angle) * clampedDist}px)`;

            this.controls.forward = dy < -15;
            this.controls.backward = dy > 15;
            this.controls.left = dx < -15;
            this.controls.right = dx > 15;
            if (!this.player.vehicle) {
              this.player.angle = angle;
            }
          }
        }
      });

      const resetJoystick = () => {
        touchId = null;
        knob.style.transform = 'translate(0,0)';
        this.controls.forward = false;
        this.controls.backward = false;
        this.controls.left = false;
        this.controls.right = false;
      };

      zone.addEventListener('touchend', resetJoystick);
      zone.addEventListener('touchcancel', resetJoystick);

      // Buttons
      const fireBtn = document.getElementById('btn-fire');
      fireBtn.addEventListener('touchstart', (e) => { e.preventDefault(); this.controls.shoot = true; });
      fireBtn.addEventListener('touchend', (e) => { e.preventDefault(); this.controls.shoot = false; });

      document.getElementById('btn-action').addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.toggleVehicleEntry();
      });

      document.getElementById('btn-sprint').addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.controls.sprint = !this.controls.sprint;
        this.controls.drift = this.controls.sprint;
      });

      document.getElementById('btn-weapon').addEventListener('touchstart', (e) => {
        e.preventDefault();
        this.cycleWeapon(1);
      });
    }

    cycleWeapon(dir) {
      this.player.weaponIndex = (this.player.weaponIndex + dir + WEAPONS.length) % WEAPONS.length;
      this.updateWeaponHUD();
    }

    updateWeaponHUD() {
      const w = WEAPONS[this.player.weaponIndex];
      document.getElementById('hud-weapon-icon').textContent = w.icon;
      document.getElementById('hud-weapon-name').textContent = w.name;
      document.getElementById('hud-weapon-ammo').textContent = w.ammo === Infinity ? '∞' : w.ammo;
    }

    toggleVehicleEntry() {
      if (this.player.vehicle) {
        // Exit car
        const car = this.player.vehicle;
        car.isPlayer = false;
        this.player.x = car.x + Math.cos(car.angle + Math.PI / 2) * 36;
        this.player.y = car.y + Math.sin(car.angle + Math.PI / 2) * 36;
        this.player.vehicle = null;
        audio.playDoor();
        audio.updateEngine(0, false);
      } else {
        // Check closest car to enter
        for (let car of this.vehicles) {
          const d = Math.hypot(car.x - this.player.x, car.y - this.player.y);
          if (d < 55) {
            this.player.vehicle = car;
            car.isPlayer = true;
            audio.playDoor();
            if (car.isPolice && this.player.wantedLevel === 0) {
              this.increaseWanted();
            }
            break;
          }
        }
      }
    }

    increaseWanted() {
      this.player.wantedLevel = Math.min(5, this.player.wantedLevel + 1);
      this.player.wantedCooldown = 400; // frames before cool
      audio.updateSiren(this.player.wantedLevel);
      this.updateHUD();
    }

    respawnAtHospital() {
      this.player.health = 100;
      this.player.armor = 50;
      this.player.cash = Math.max(0, this.player.cash - 500);
      this.player.wantedLevel = 0;
      this.player.x = this.map.zones.hospital.x + 80;
      this.player.y = this.map.zones.hospital.y + 80;
      this.player.vehicle = null;
      audio.updateSiren(0);
      audio.updateEngine(0, false);
      this.updateHUD();
    }

    update() {
      // On-foot movement
      if (!this.player.vehicle) {
        let speed = this.player.sprint || this.controls.sprint ? 5.8 : 3.4;
        let vx = 0, vy = 0;
        if (this.controls.forward) vy -= 1;
        if (this.controls.backward) vy += 1;
        if (this.controls.left) vx -= 1;
        if (this.controls.right) vx += 1;

        if (vx !== 0 || vy !== 0) {
          const mag = Math.hypot(vx, vy);
          vx = (vx / mag) * speed;
          vy = (vy / mag) * speed;
          this.player.angle = Math.atan2(vy, vx);

          const nextX = this.player.x + vx;
          const nextY = this.player.y + vy;

          if (!this.map.checkBuildingCollision(nextX, this.player.y, 14)) this.player.x = nextX;
          if (!this.map.checkBuildingCollision(this.player.x, nextY, 14)) this.player.y = nextY;
        }
      } else {
        // Vehicle physics
        this.player.vehicle.update(this.map, this.controls, this.player);
        this.player.x = this.player.vehicle.x;
        this.player.y = this.player.vehicle.y;
        this.player.angle = this.player.vehicle.angle;

        // Pay 'n' Spray Garage Repair
        const pns = this.map.zones.paynspray;
        if (this.player.x > pns.x && this.player.x < pns.x + pns.w &&
            this.player.y > pns.y && this.player.y < pns.y + pns.h) {
          if (this.player.vehicle.health < 100 || this.player.wantedLevel > 0) {
            this.player.vehicle.health = 100;
            this.player.wantedLevel = 0;
            this.player.cash = Math.max(0, this.player.cash - 100);
            audio.playCash();
            audio.updateSiren(0);
            this.updateHUD();
          }
        }
      }

      // Shooting logic
      if (this.controls.shoot) {
        const weapon = WEAPONS[this.player.weaponIndex];
        const now = Date.now();
        if (now - this.lastShotTime > weapon.rate) {
          if (weapon.ammo > 0) {
            this.lastShotTime = now;
            if (weapon.ammo !== Infinity) weapon.ammo--;
            this.updateWeaponHUD();
            audio.playShoot(weapon.name.toLowerCase());

            if (weapon.name !== 'FISTS') {
              this.bullets.push(new Bullet(this.player.x, this.player.y, this.player.angle, weapon));
            } else {
              // Melee hit
              for (let p of this.pedestrians) {
                if (Math.hypot(p.x - this.player.x, p.y - this.player.y) < 40) {
                  p.health -= 35;
                  if (p.health <= 0) {
                    this.player.cash += 40;
                    this.increaseWanted();
                  }
                }
              }
            }
          }
        }
      }

      // Update bullets
      for (let i = this.bullets.length - 1; i >= 0; i--) {
        const b = this.bullets[i];
        if (!b.update() || this.map.checkBuildingCollision(b.x, b.y, 4)) {
          if (b.isRPG) audio.playExplosion();
          this.bullets.splice(i, 1);
          continue;
        }

        // Hit pedestrians
        for (let p of this.pedestrians) {
          if (p.state !== 'dead' && Math.hypot(p.x - b.x, p.y - b.y) < 18) {
            p.health -= b.damage;
            this.bullets.splice(i, 1);
            if (p.health <= 0) {
              this.player.cash += 80;
              this.increaseWanted();
            }
            break;
          }
        }
      }

      // Update AI Vehicles & Pedestrians
      this.vehicles.forEach(v => {
        if (!v.isPlayer) v.update(this.map, {}, this.player);
      });
      this.pedestrians.forEach(p => p.update(this.map, this.player));

      // Check Pickups
      for (let i = this.pickups.length - 1; i >= 0; i--) {
        const pk = this.pickups[i];
        if (Math.hypot(pk.x - this.player.x, pk.y - this.player.y) < 30) {
          audio.playCash();
          if (pk.type === 'health') this.player.health = Math.min(100, this.player.health + 40);
          else if (pk.type === 'armor') this.player.armor = Math.min(100, this.player.armor + 50);
          else if (pk.type === 'cash') this.player.cash += 500;
          else if (pk.type === 'bribe') {
            this.player.wantedLevel = Math.max(0, this.player.wantedLevel - 1);
            audio.updateSiren(this.player.wantedLevel);
          }
          this.pickups.splice(i, 1);
          this.updateHUD();
        }
      }

      // Check Mission Phone Booths
      this.map.phoneBooths.forEach(pb => {
        if (pb.ringing && Math.hypot(pb.x - this.player.x, pb.y - this.player.y) < 45) {
          pb.ringing = false;
          this.openMissionDialog(pb.missionId);
        }
      });

      // Camera follow
      this.camera.x += (this.player.x - this.camera.x) * 0.1;
      this.camera.y += (this.player.y - this.camera.y) * 0.1;

      // Wanted cooldown
      if (this.player.wantedLevel > 0) {
        this.player.wantedCooldown--;
        if (this.player.wantedCooldown <= 0) {
          this.player.wantedLevel--;
          this.player.wantedCooldown = 400;
          audio.updateSiren(this.player.wantedLevel);
          this.updateHUD();
        }
      }

      // Player health check
      if (this.player.health <= 0) {
        document.getElementById('wasted-modal').style.display = 'flex';
        audio.playExplosion();
      }
    }

    openMissionDialog(missionId) {
      const m = this.missions.find(x => x.id === missionId);
      if (!m) return;
      this.pendingMission = m;
      document.getElementById('dialog-speaker').textContent = m.speaker;
      document.getElementById('dialog-text').textContent = m.desc;
      document.getElementById('dialog-box').style.display = 'flex';
    }

    startMission(m) {
      this.currentMission = m;
      const banner = document.getElementById('mission-banner');
      banner.style.display = 'block';
      document.getElementById('mission-title').textContent = `Mission: ${m.title}`;
      document.getElementById('mission-desc').textContent = m.desc;
      if (m.targetWanted) {
        this.player.wantedLevel = m.targetWanted;
        audio.updateSiren(this.player.wantedLevel);
      }
      this.updateHUD();
    }

    updateHUD() {
      document.getElementById('hud-cash').textContent = '$' + String(this.player.cash).padStart(6, '0');
      document.getElementById('hud-health').style.width = Math.max(0, this.player.health) + '%';
      document.getElementById('hud-armor').style.width = Math.max(0, this.player.armor) + '%';

      const stars = document.getElementById('hud-stars').children;
      for (let i = 0; i < 5; i++) {
        if (i < this.player.wantedLevel) stars[i].classList.add('active');
        else stars[i].classList.remove('active');
      }
    }

    draw() {
      const { ctx, canvas } = this;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      // Center camera
      ctx.translate(canvas.width / 2 - this.camera.x, canvas.height / 2 - this.camera.y);

      // Grass terrain
      ctx.fillStyle = '#2d5a27';
      ctx.fillRect(0, 0, WORLD_WIDTH, WORLD_HEIGHT);

      // Roads
      ctx.fillStyle = '#374151';
      this.map.roads.forEach(r => {
        ctx.fillRect(r.x, r.y, r.w, r.h);
        // Dashed lane dividers
        ctx.strokeStyle = '#fcd34d';
        ctx.lineWidth = 3;
        ctx.setLineDash([20, 20]);
        ctx.beginPath();
        if (r.dir === 'v') {
          ctx.moveTo(r.x + r.w / 2, r.y);
          ctx.lineTo(r.x + r.w / 2, r.y + r.h);
        } else {
          ctx.moveTo(r.x, r.y + r.h / 2);
          ctx.lineTo(r.x + r.w, r.y + r.h / 2);
        }
        ctx.stroke();
        ctx.setLineDash([]);
      });

      // Special Zones
      const pns = this.map.zones.paynspray;
      ctx.fillStyle = '#10b981';
      ctx.fillRect(pns.x, pns.y, pns.w, pns.h);
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 14px sans-serif';
      ctx.fillText('PAY \'N\' SPRAY', pns.x + 8, pns.y + 55);

      const hosp = this.map.zones.hospital;
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(hosp.x, hosp.y, hosp.w, hosp.h);
      ctx.fillStyle = '#fff';
      ctx.fillText('HOSPITAL', hosp.x + 35, hosp.y + 75);

      // Buildings
      this.map.buildings.forEach(b => {
        // Roof
        ctx.fillStyle = b.color;
        ctx.fillRect(b.x, b.y, b.w, b.h);
        ctx.strokeStyle = '#111827';
        ctx.lineWidth = 4;
        ctx.strokeRect(b.x, b.y, b.w, b.h);

        if (b.hasHelipad) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.arc(b.x + b.w / 2, b.y + b.h / 2, 35, 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = '#facc15';
          ctx.font = 'bold 36px sans-serif';
          ctx.fillText('H', b.x + b.w / 2 - 12, b.y + b.h / 2 + 13);
        }
      });

      // Phone booths
      this.map.phoneBooths.forEach(pb => {
        ctx.fillStyle = '#3b82f6';
        ctx.fillRect(pb.x - 12, pb.y - 12, 24, 24);
        if (pb.ringing) {
          ctx.strokeStyle = '#facc15';
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(pb.x, pb.y, 22 + Math.sin(Date.now() / 150) * 6, 0, Math.PI * 2);
          ctx.stroke();
        }
      });

      // Pickups
      this.pickups.forEach(pk => pk.draw(ctx));

      // Pedestrians
      this.pedestrians.forEach(p => p.draw(ctx));

      // Vehicles
      this.vehicles.forEach(v => v.draw(ctx));

      // Bullets
      this.bullets.forEach(b => b.draw(ctx));

      // On-foot Player
      if (!this.player.vehicle) {
        ctx.save();
        ctx.translate(this.player.x, this.player.y);
        ctx.rotate(this.player.angle);

        // Player Shadow
        ctx.fillStyle = 'rgba(0,0,0,0.35)';
        ctx.beginPath();
        ctx.arc(3, 3, 11, 0, Math.PI * 2);
        ctx.fill();

        // Leather Jacket (Mike)
        ctx.fillStyle = '#1e293b';
        ctx.beginPath();
        ctx.ellipse(0, 0, 13, 8, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hands & Weapon
        ctx.fillStyle = '#fbcfe8';
        ctx.beginPath();
        ctx.arc(10, 8, 4, 0, Math.PI * 2);
        ctx.arc(10, -8, 4, 0, Math.PI * 2);
        ctx.fill();

        // Head
        ctx.fillStyle = '#38bdf8'; // Blue cap
        ctx.beginPath();
        ctx.arc(0, 0, 7, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
      }

      ctx.restore();

      // Render Radar Mini-map
      this.drawRadar();
    }

    drawRadar() {
      const { radarCtx, radarCanvas } = this;
      const rw = radarCanvas.width;
      const rh = radarCanvas.height;
      radarCtx.clearRect(0, 0, rw, rh);

      // Radar background
      radarCtx.fillStyle = '#0a192f';
      radarCtx.fillRect(0, 0, rw, rh);

      const scale = 0.045;
      const cx = rw / 2;
      const cy = rh / 2;

      radarCtx.save();
      radarCtx.translate(cx, cy);

      // Roads on radar
      radarCtx.fillStyle = '#334155';
      this.map.roads.forEach(r => {
        const rx = (r.x - this.player.x) * scale;
        const ry = (r.y - this.player.y) * scale;
        radarCtx.fillRect(rx, ry, r.w * scale, r.h * scale);
      });

      // Special Zones on radar
      const pns = this.map.zones.paynspray;
      radarCtx.fillStyle = '#10b981';
      radarCtx.fillRect((pns.x - this.player.x) * scale, (pns.y - this.player.y) * scale, 6, 6);

      // Police blips (flashing red)
      if (this.player.wantedLevel > 0) {
        radarCtx.fillStyle = '#ef4444';
        this.vehicles.filter(v => v.isPolice).forEach(pv => {
          radarCtx.fillRect((pv.x - this.player.x) * scale - 2, (pv.y - this.player.y) * scale - 2, 5, 5);
        });
      }

      // Player blip (arrow pointing in player angle)
      radarCtx.rotate(this.player.angle);
      radarCtx.fillStyle = '#00e5ff';
      radarCtx.beginPath();
      radarCtx.moveTo(7, 0);
      radarCtx.lineTo(-6, -5);
      radarCtx.lineTo(-3, 0);
      radarCtx.lineTo(-6, 5);
      radarCtx.closePath();
      radarCtx.fill();

      radarCtx.restore();
    }

    loop() {
      this.update();
      this.draw();
      requestAnimationFrame(() => this.loop());
    }
  }

  // Launch Game
  window.addEventListener('DOMContentLoaded', () => {
    const game = new Game();
    game.loop();
  });
})();