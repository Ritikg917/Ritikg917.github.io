// Minecraft Survival 3D - MCP 940 Web Engine
import * as THREE from './three.module.js';

(() => {
  'use strict';

  // --- AUDIO SYNTHESIS ---
  class MCSoundEngine {
    constructor() {
      this.ctx = null;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();
    }

    playBreak() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(160, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.1);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.1);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.1);
    }

    playPlace() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(220, t);
      osc.frequency.exponentialRampToValueAtTime(60, t + 0.08);
      gain.gain.setValueAtTime(0.28, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.08);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.08);
    }

    playStep() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(80, t);
      gain.gain.setValueAtTime(0.08, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.05);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    }

    playChime() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(523.25, t); // C5
      osc.frequency.setValueAtTime(659.25, t + 0.08); // E5
      osc.frequency.setValueAtTime(783.99, t + 0.16); // G5
      gain.gain.setValueAtTime(0.2, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.35);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.35);
    }
  }

  const audio = new MCSoundEngine();

  // --- BLOCK TYPES ---
  const BLOCK_TYPES = {
    AIR: 0,
    GRASS: 1,
    DIRT: 2,
    STONE: 3,
    WOOD: 4,
    LEAVES: 5,
    PLANKS: 6,
    COAL: 7,
    IRON: 8,
    DIAMOND: 9,
    TORCH: 10,
    BEDROCK: 11
  };

  const BLOCK_COLORS = {
    [BLOCK_TYPES.GRASS]: 0x5b8731,
    [BLOCK_TYPES.DIRT]: 0x866043,
    [BLOCK_TYPES.STONE]: 0x767676,
    [BLOCK_TYPES.WOOD]: 0x675231,
    [BLOCK_TYPES.LEAVES]: 0x3d7e29,
    [BLOCK_TYPES.PLANKS]: 0x9c7d4a,
    [BLOCK_TYPES.COAL]: 0x242424,
    [BLOCK_TYPES.IRON]: 0xd8af93,
    [BLOCK_TYPES.DIAMOND]: 0x4eedd7,
    [BLOCK_TYPES.TORCH]: 0xffbb00,
    [BLOCK_TYPES.BEDROCK]: 0x181818
  };

  // --- VOXEL WORLD MANAGER ---
  class VoxelWorld {
    constructor(scene) {
      this.scene = scene;
      this.sizeX = 40;
      this.sizeZ = 40;
      this.sizeY = 16;
      this.blocks = new Map(); // "x,y,z" -> { type, mesh }
      this.boxGeo = new THREE.BoxGeometry(1, 1, 1);
      this.materials = {};

      // Initialize materials
      for (const [type, color] of Object.entries(BLOCK_COLORS)) {
        this.materials[type] = new THREE.MeshLambertMaterial({ color: color });
      }

      this.generateTerrain();
    }

    key(x, y, z) {
      return `${Math.floor(x)},${Math.floor(y)},${Math.floor(z)}`;
    }

    setBlock(x, y, z, type) {
      x = Math.floor(x);
      y = Math.floor(y);
      z = Math.floor(z);
      const k = this.key(x, y, z);

      if (this.blocks.has(k)) {
        const old = this.blocks.get(k);
        this.scene.remove(old.mesh);
        this.blocks.delete(k);
      }

      if (type !== BLOCK_TYPES.AIR) {
        const mesh = new THREE.Mesh(this.boxGeo, this.materials[type]);
        mesh.position.set(x + 0.5, y + 0.5, z + 0.5);
        mesh.castShadow = true;
        mesh.receiveShadow = true;
        mesh.userData = { voxelPos: { x, y, z }, blockType: type };
        this.scene.add(mesh);
        this.blocks.set(k, { type, mesh });
      }
    }

    getBlock(x, y, z) {
      const k = this.key(x, y, z);
      return this.blocks.get(k) || null;
    }

    generateTerrain() {
      const halfX = this.sizeX / 2;
      const halfZ = this.sizeZ / 2;

      for (let x = -halfX; x < halfX; x++) {
        for (let z = -halfZ; z < halfZ; z++) {
          // Bedrock bottom
          this.setBlock(x, 0, z, BLOCK_TYPES.BEDROCK);

          // Height variations using sine waves
          const height = Math.floor(4 + Math.sin(x * 0.25) * 2 + Math.cos(z * 0.25) * 2);

          for (let y = 1; y <= height; y++) {
            if (y === height) {
              this.setBlock(x, y, z, BLOCK_TYPES.GRASS);
            } else if (y >= height - 2) {
              this.setBlock(x, y, z, BLOCK_TYPES.DIRT);
            } else {
              // Stone with random ores
              const r = Math.random();
              if (r < 0.04) this.setBlock(x, y, z, BLOCK_TYPES.DIAMOND);
              else if (r < 0.12) this.setBlock(x, y, z, BLOCK_TYPES.IRON);
              else if (r < 0.22) this.setBlock(x, y, z, BLOCK_TYPES.COAL);
              else this.setBlock(x, y, z, BLOCK_TYPES.STONE);
            }
          }

          // Random Trees
          if (x % 7 === 0 && z % 7 === 0 && Math.random() < 0.8) {
            const treeY = height + 1;
            // Trunk
            for (let ty = 0; ty < 4; ty++) {
              this.setBlock(x, treeY + ty, z, BLOCK_TYPES.WOOD);
            }
            // Leaves
            for (let lx = -1; lx <= 1; lx++) {
              for (let lz = -1; lz <= 1; lz++) {
                for (let ly = 3; ly <= 4; ly++) {
                  if (lx === 0 && lz === 0 && ly === 3) continue;
                  this.setBlock(x + lx, treeY + ly, z + lz, BLOCK_TYPES.LEAVES);
                }
              }
            }
            this.setBlock(x, treeY + 5, z, BLOCK_TYPES.LEAVES);
          }
        }
      }
    }
  }

  // --- MAIN SURVIVAL GAME ---
  class MinecraftGame {
    constructor() {
      this.canvas = document.getElementById('three-canvas');
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x78a7ff);
      this.scene.fog = new THREE.FogExp2(0x78a7ff, 0.02);

      this.camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.1, 150);
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

      // Lighting
      this.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
      this.scene.add(this.ambientLight);

      this.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
      this.sunLight.position.set(50, 80, 40);
      this.scene.add(this.sunLight);

      // World
      this.world = new VoxelWorld(this.scene);

      // Player state
      this.playerPos = new THREE.Vector3(0, 10, 0);
      this.playerVel = new THREE.Vector3();
      this.playerPitch = 0;
      this.playerYaw = 0;
      this.isOnGround = false;

      // Stats
      this.health = 20;
      this.hunger = 20;
      this.xpLevel = 7;

      // Hotbar Inventory
      this.activeSlot = 0;
      this.hotbar = [
        { type: BLOCK_TYPES.GRASS, name: 'Grass', icon: '🟩', count: 64 },
        { type: BLOCK_TYPES.WOOD, name: 'Oak Wood', icon: '🪵', count: 32 },
        { type: BLOCK_TYPES.STONE, name: 'Stone', icon: '🪨', count: 64 },
        { type: BLOCK_TYPES.PLANKS, name: 'Planks', icon: '📦', count: 32 },
        { type: BLOCK_TYPES.TORCH, name: 'Torch', icon: '🕯️', count: 16 },
        { type: BLOCK_TYPES.IRON, name: 'Iron Ore', icon: '⚙️', count: 14 },
        { type: BLOCK_TYPES.DIAMOND, name: 'Diamond Ore', icon: '💎', count: 8 },
        { type: BLOCK_TYPES.LEAVES, name: 'Leaves', icon: '🍃', count: 48 },
        { type: BLOCK_TYPES.COAL, name: 'Coal Ore', icon: '⬛', count: 24 }
      ];

      // Block selection highlight
      const hlGeo = new THREE.BoxGeometry(1.02, 1.02, 1.02);
      const hlMat = new THREE.MeshBasicMaterial({ color: 0x000000, wireframe: true });
      this.highlightBox = new THREE.Mesh(hlGeo, hlMat);
      this.highlightBox.visible = false;
      this.scene.add(this.highlightBox);

      // Mobs (Zombies & Sheep)
      this.mobs = [];
      this.spawnMobs();

      this.keys = { forward: false, backward: false, left: false, right: false, jump: false };
      this.raycaster = new THREE.Raycaster();

      this.renderHotbarUI();
      this.setupControls();
      this.setupPointerLock();

      this.clock = new THREE.Clock();
      this.dayTime = 0;
      this.animate();
    }

    spawnMobs() {
      // Create a friendly sheep and a zombie
      const sheepGeo = new THREE.BoxGeometry(1.2, 0.9, 1.4);
      const sheepMat = new THREE.MeshLambertMaterial({ color: 0xffffff });
      const sheep = new THREE.Mesh(sheepGeo, sheepMat);
      sheep.position.set(4, 7, 4);
      this.scene.add(sheep);
      this.mobs.push({ mesh: sheep, type: 'sheep', hp: 8 });

      // Zombie
      const zombieGeo = new THREE.BoxGeometry(0.8, 1.8, 0.6);
      const zombieMat = new THREE.MeshLambertMaterial({ color: 0x2e7d32 });
      const zombie = new THREE.Mesh(zombieGeo, zombieMat);
      zombie.position.set(-6, 7, -6);
      this.scene.add(zombie);
      this.mobs.push({ mesh: zombie, type: 'zombie', hp: 20 });
    }

    renderHotbarUI() {
      const hb = document.getElementById('hotbar');
      hb.innerHTML = '';
      this.hotbar.forEach((slot, idx) => {
        const el = document.createElement('div');
        el.className = 'hotbar-slot' + (idx === this.activeSlot ? ' active' : '');
        el.innerHTML = `<span>${slot.icon}</span><span class="slot-count">${slot.count}</span>`;
        el.addEventListener('click', () => {
          this.activeSlot = idx;
          this.renderHotbarUI();
        });
        hb.appendChild(el);
      });
    }

    setupControls() {
      window.addEventListener('keydown', (e) => {
        audio.init();
        if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = true;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
        if (e.code === 'Space') this.keys.jump = true;
        if (e.code === 'KeyE') this.toggleCrafting();

        // 1-9 Keys for Hotbar
        if (e.key >= '1' && e.key <= '9') {
          this.activeSlot = parseInt(e.key) - 1;
          this.renderHotbarUI();
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
        if (e.code === 'Space') this.keys.jump = false;
      });

      // Mouse Wheel for Hotbar
      window.addEventListener('wheel', (e) => {
        if (e.deltaY > 0) this.activeSlot = (this.activeSlot + 1) % 9;
        else this.activeSlot = (this.activeSlot - 1 + 9) % 9;
        this.renderHotbarUI();
      });

      // Mouse Clicks
      window.addEventListener('mousedown', (e) => {
        audio.init();
        if (e.target.tagName === 'BUTTON' || document.getElementById('craft-modal').style.display === 'flex') return;

        if (e.button === 0) {
          // Left click: Mine / Break
          this.breakBlock();
        } else if (e.button === 2) {
          // Right click: Place
          e.preventDefault();
          this.placeBlock();
        }
      });

      window.addEventListener('contextmenu', (e) => e.preventDefault());

      // Start Button
      document.getElementById('start-btn').addEventListener('click', () => {
        audio.init();
        document.getElementById('start-modal').style.display = 'none';
        this.canvas.requestPointerLock?.();
      });

      // Close Craft Button
      document.getElementById('close-craft').addEventListener('click', () => this.toggleCrafting());

      // Crafting Recipes
      document.querySelectorAll('.recipe-item').forEach(item => {
        item.addEventListener('click', () => {
          audio.playChime();
          this.xpLevel++;
          document.getElementById('hud-xp-lvl').textContent = this.xpLevel;
          const current = this.hotbar[this.activeSlot];
          current.count += 4;
          this.renderHotbarUI();
        });
      });

      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    setupPointerLock() {
      window.addEventListener('mousemove', (e) => {
        if (document.pointerLockElement === this.canvas) {
          this.playerYaw -= e.movementX * 0.0025;
          this.playerPitch = Math.max(-Math.PI / 2.2, Math.min(Math.PI / 2.2, this.playerPitch - e.movementY * 0.0025));
        }
      });
    }

    toggleCrafting() {
      const modal = document.getElementById('craft-modal');
      const isVisible = modal.style.display === 'flex';
      modal.style.display = isVisible ? 'none' : 'flex';
      if (isVisible) this.canvas.requestPointerLock?.();
      else document.exitPointerLock?.();
    }

    raycastVoxel() {
      this.raycaster.setFromCamera(new THREE.Vector2(0, 0), this.camera);
      const meshes = Array.from(this.world.blocks.values()).map(b => b.mesh);
      const intersects = this.raycaster.intersectObjects(meshes);

      if (intersects.length > 0 && intersects[0].distance < 7.0) {
        return intersects[0];
      }
      return null;
    }

    breakBlock() {
      const hit = this.raycastVoxel();
      if (hit) {
        const { x, y, z } = hit.object.userData.voxelPos;
        this.world.setBlock(x, y, z, BLOCK_TYPES.AIR);
        audio.playBreak();

        // Increment hotbar count
        const active = this.hotbar[this.activeSlot];
        active.count++;
        this.renderHotbarUI();
      }
    }

    placeBlock() {
      const hit = this.raycastVoxel();
      if (hit && hit.face) {
        const active = this.hotbar[this.activeSlot];
        if (active.count <= 0) return;

        const pos = hit.object.userData.voxelPos;
        const nx = pos.x + hit.face.normal.x;
        const ny = pos.y + hit.face.normal.y;
        const nz = pos.z + hit.face.normal.z;

        // Ensure block doesn't overlap player
        const dist = this.playerPos.distanceTo(new THREE.Vector3(nx + 0.5, ny + 0.5, nz + 0.5));
        if (dist > 1.2) {
          this.world.setBlock(nx, ny, nz, active.type);
          active.count--;
          audio.playPlace();
          this.renderHotbarUI();
        }
      }
    }

    updatePhysics(dt) {
      // Movement vector
      let moveX = 0, moveZ = 0;
      if (this.keys.forward) moveZ -= 1;
      if (this.keys.backward) moveZ += 1;
      if (this.keys.left) moveX -= 1;
      if (this.keys.right) moveX += 1;

      const speed = 7.5;
      if (moveX !== 0 || moveZ !== 0) {
        const moveVec = new THREE.Vector3(moveX, 0, moveZ).normalize();
        moveVec.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.playerYaw);
        this.playerPos.x += moveVec.x * speed * dt;
        this.playerPos.z += moveVec.z * speed * dt;

        if (this.isOnGround && Math.random() < 0.1) audio.playStep();
      }

      // Gravity & Jump
      if (this.keys.jump && this.isOnGround) {
        this.playerVel.y = 8.5;
        this.isOnGround = false;
      }

      this.playerVel.y -= 22 * dt; // gravity
      this.playerPos.y += this.playerVel.y * dt;

      // Ground collision with voxel blocks
      const groundCheckY = Math.floor(this.playerPos.y - 1.6);
      const groundBlock = this.world.getBlock(this.playerPos.x, groundCheckY, this.playerPos.z);

      if (groundBlock && groundBlock.type !== BLOCK_TYPES.AIR && this.playerVel.y <= 0) {
        this.playerPos.y = groundCheckY + 1 + 1.6;
        this.playerVel.y = 0;
        this.isOnGround = true;
      } else {
        this.isOnGround = false;
      }

      // Update camera orientation
      this.camera.position.copy(this.playerPos);
      this.camera.rotation.set(0, 0, 0);
      this.camera.rotateY(this.playerYaw);
      this.camera.rotateX(this.playerPitch);

      // Raycast highlight box
      const hit = this.raycastVoxel();
      if (hit) {
        const pos = hit.object.position;
        this.highlightBox.position.copy(pos);
        this.highlightBox.visible = true;
      } else {
        this.highlightBox.visible = false;
      }
    }

    updateDayNight(dt) {
      this.dayTime += dt * 0.05;
      const sunAngle = this.dayTime;
      this.sunLight.position.set(Math.cos(sunAngle) * 80, Math.sin(sunAngle) * 80, 40);

      const isDay = Math.sin(sunAngle) > 0;
      const skyColor = isDay ? 0x78a7ff : 0x080b15;
      this.scene.background.setHex(skyColor);
      this.scene.fog.color.setHex(skyColor);

      document.getElementById('hud-time').textContent = isDay ? 'Time: 12:00 PM (Day)' : 'Time: 12:00 AM (Night)';
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.updatePhysics(dt);
      this.updateDayNight(dt);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    new MinecraftGame();
  });
})();