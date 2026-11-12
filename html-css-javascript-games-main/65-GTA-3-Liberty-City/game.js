// GTA III: Liberty City 3D - re3 Web Engine
import * as THREE from './three.module.js';

(() => {
  'use strict';

  // --- AUDIO SYNTHESIS ---
  class SoundEngine {
    constructor() {
      this.ctx = null;
      this.engineGain = null;
      this.engineOsc = null;
      this.sirenGain = null;
      this.sirenOsc = null;
      this.stations = ['Head Radio', 'Flashback FM', 'Game FM', 'Lips 106', 'Rise FM'];
      this.currentStation = 0;
    }

    init() {
      if (this.ctx) return;
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      // Engine sound
      this.engineOsc = this.ctx.createOscillator();
      this.engineGain = this.ctx.createGain();
      this.engineOsc.type = 'sawtooth';
      this.engineOsc.frequency.setValueAtTime(45, this.ctx.currentTime);
      this.engineGain.gain.setValueAtTime(0, this.ctx.currentTime);

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);
      this.engineOsc.connect(filter);
      filter.connect(this.engineGain);
      this.engineGain.connect(this.ctx.destination);
      this.engineOsc.start();

      // Siren sound
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();
      this.sirenOsc.type = 'sine';
      this.sirenGain.gain.setValueAtTime(0, this.ctx.currentTime);
      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.ctx.destination);
      this.sirenOsc.start();
    }

    setEngine(speedRatio, inCar) {
      if (!this.ctx || !this.engineGain) return;
      if (!inCar) {
        this.engineGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.05);
        return;
      }
      const freq = 45 + Math.abs(speedRatio) * 180;
      this.engineOsc.frequency.setTargetAtTime(freq, this.ctx.currentTime, 0.05);
      this.engineGain.gain.setTargetAtTime(0.12, this.ctx.currentTime, 0.05);
    }

    setSiren(wanted) {
      if (!this.ctx || !this.sirenGain) return;
      if (wanted > 0) {
        const time = this.ctx.currentTime;
        const freq = 650 + Math.sin(time * 7) * 220;
        this.sirenOsc.frequency.setValueAtTime(freq, time);
        this.sirenGain.gain.setTargetAtTime(0.14, time, 0.1);
      } else {
        this.sirenGain.gain.setTargetAtTime(0, this.ctx.currentTime, 0.1);
      }
    }

    shoot() {
      if (!this.ctx) return;
      const t = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(360, t);
      osc.frequency.exponentialRampToValueAtTime(30, t + 0.12);
      gain.gain.setValueAtTime(0.3, t);
      gain.gain.exponentialRampToValueAtTime(0.01, t + 0.12);
      osc.connect(gain);
      gain.connect(this.ctx.destination);
      osc.start(t);
      osc.stop(t + 0.12);
    }

    cycleRadio() {
      this.currentStation = (this.currentStation + 1) % this.stations.length;
      return this.stations[this.currentStation];
    }
  }

  const audio = new SoundEngine();

  // --- GAME APPLICATION ---
  class GTA3Game {
    constructor() {
      this.container = document.getElementById('game-container');
      this.canvas = document.getElementById('three-canvas');

      // State
      this.playerHealth = 100;
      this.playerArmor = 100;
      this.playerCash = 5000;
      this.wantedLevel = 0;
      this.inVehicle = false;
      this.currentVehicle = null;

      this.keys = { forward: false, backward: false, left: false, right: false, sprint: false, shoot: false };

      this.initThree();
      this.buildCity();
      this.createPlayer();
      this.createVehicles();
      this.createMissions();
      this.setupControls();
      this.setupEvents();

      this.clock = new THREE.Clock();
      this.animate();
    }

    initThree() {
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x0e141f);
      this.scene.fog = new THREE.FogExp2(0x0e141f, 0.008);

      this.camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 1000);
      this.camera.position.set(0, 10, 15);

      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
      this.renderer.setSize(window.innerWidth, window.innerHeight);
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      this.renderer.shadowMap.enabled = true;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      // Lights
      const ambientLight = new THREE.AmbientLight(0x708090, 1.2);
      this.scene.add(ambientLight);

      this.dirLight = new THREE.DirectionalLight(0xfff5e6, 1.6);
      this.dirLight.position.set(60, 120, 60);
      this.dirLight.castShadow = true;
      this.dirLight.shadow.mapSize.width = 2048;
      this.dirLight.shadow.mapSize.height = 2048;
      this.dirLight.shadow.camera.near = 0.5;
      this.dirLight.shadow.camera.far = 300;
      const d = 100;
      this.dirLight.shadow.camera.left = -d;
      this.dirLight.shadow.camera.right = d;
      this.dirLight.shadow.camera.top = d;
      this.dirLight.shadow.camera.bottom = -d;
      this.scene.add(this.dirLight);

      // Camera orbit state
      this.camYaw = 0;
      this.camPitch = 0.25;
      this.camDist = 8;
    }

    buildCity() {
      // Ground plane (Roads & Terrain)
      const groundGeo = new THREE.PlaneGeometry(600, 600);
      const groundMat = new THREE.MeshStandardMaterial({ color: 0x1a2130, roughness: 0.8 });
      const ground = new THREE.Mesh(groundGeo, groundMat);
      ground.rotation.x = -Math.PI / 2;
      ground.receiveShadow = true;
      this.scene.add(ground);

      // Road Grid
      const roadMat = new THREE.MeshStandardMaterial({ color: 0x2b303c, roughness: 0.9 });
      const roadCoords = [-120, -60, 0, 60, 120];

      roadCoords.forEach(coord => {
        // Horizontal road
        const roadH = new THREE.Mesh(new THREE.PlaneGeometry(600, 14), roadMat);
        roadH.rotation.x = -Math.PI / 2;
        roadH.position.set(0, 0.05, coord);
        roadH.receiveShadow = true;
        this.scene.add(roadH);

        // Vertical road
        const roadV = new THREE.Mesh(new THREE.PlaneGeometry(14, 600), roadMat);
        roadV.rotation.x = -Math.PI / 2;
        roadV.position.set(coord, 0.05, 0);
        roadV.receiveShadow = true;
        this.scene.add(roadV);
      });

      // City Skyscrapers
      this.buildings = [];
      const buildingColors = [0x334155, 0x1e293b, 0x475569, 0x0f172a, 0x27272a, 0x3f3f46];

      for (let x = -150; x <= 150; x += 30) {
        for (let z = -150; z <= 150; z += 30) {
          // Skip road intersections
          const nearRoadX = roadCoords.some(rc => Math.abs(x - rc) < 12);
          const nearRoadZ = roadCoords.some(rc => Math.abs(z - rc) < 12);
          if (nearRoadX || nearRoadZ) continue;

          const height = 20 + Math.random() * 65;
          const width = 16 + Math.random() * 6;
          const depth = 16 + Math.random() * 6;
          const color = buildingColors[Math.floor(Math.random() * buildingColors.length)];

          const bGeo = new THREE.BoxGeometry(width, height, depth);
          const bMat = new THREE.MeshStandardMaterial({
            color: color,
            roughness: 0.6,
            metalness: 0.2
          });
          const building = new THREE.Mesh(bGeo, bMat);
          building.position.set(x, height / 2, z);
          building.castShadow = true;
          building.receiveShadow = true;
          this.scene.add(building);

          this.buildings.push({
            minX: x - width / 2, maxX: x + width / 2,
            minZ: z - depth / 2, maxZ: z + depth / 2
          });
        }
      }

      // Street Lamps
      for (let x of [-60, 0, 60]) {
        for (let z of [-90, -30, 30, 90]) {
          const lampGeo = new THREE.CylinderGeometry(0.15, 0.2, 7);
          const lampMat = new THREE.MeshStandardMaterial({ color: 0x111 });
          const lamp = new THREE.Mesh(lampGeo, lampMat);
          lamp.position.set(x + 8, 3.5, z);
          this.scene.add(lamp);

          const light = new THREE.PointLight(0xfffaed, 0.8, 25);
          light.position.set(x + 8, 7.5, z);
          this.scene.add(light);
        }
      }
    }

    createPlayer() {
      this.playerGroup = new THREE.Group();

      // Claude (GTA III Protagonist): Black leather jacket & green pants
      // Torso
      const torsoGeo = new THREE.BoxGeometry(0.9, 1.2, 0.5);
      const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1a1a1a, roughness: 0.5 }); // Black leather jacket
      const torso = new THREE.Mesh(torsoGeo, torsoMat);
      torso.position.y = 1.4;
      torso.castShadow = true;
      this.playerGroup.add(torso);

      // Head
      const headGeo = new THREE.BoxGeometry(0.5, 0.5, 0.5);
      const headMat = new THREE.MeshStandardMaterial({ color: 0xe0ac69 });
      const head = new THREE.Mesh(headGeo, headMat);
      head.position.y = 2.25;
      head.castShadow = true;
      this.playerGroup.add(head);

      // Legs (Green cargo pants)
      const legGeo = new THREE.BoxGeometry(0.35, 1.0, 0.35);
      const legMat = new THREE.MeshStandardMaterial({ color: 0x2d4a22 }); // Army green
      
      this.leftLeg = new THREE.Mesh(legGeo, legMat);
      this.leftLeg.position.set(-0.25, 0.5, 0);
      this.leftLeg.castShadow = true;
      this.playerGroup.add(this.leftLeg);

      this.rightLeg = new THREE.Mesh(legGeo, legMat);
      this.rightLeg.position.set(0.25, 0.5, 0);
      this.rightLeg.castShadow = true;
      this.playerGroup.add(this.rightLeg);

      // Arms
      const armGeo = new THREE.BoxGeometry(0.28, 0.9, 0.28);
      this.leftArm = new THREE.Mesh(armGeo, torsoMat);
      this.leftArm.position.set(-0.62, 1.4, 0);
      this.playerGroup.add(this.leftArm);

      this.rightArm = new THREE.Mesh(armGeo, torsoMat);
      this.rightArm.position.set(0.62, 1.4, 0);
      this.playerGroup.add(this.rightArm);

      this.playerGroup.position.set(0, 0, 10);
      this.scene.add(this.playerGroup);

      this.playerPos = this.playerGroup.position;
      this.playerRot = 0;
      this.playerSpeed = 0;
    }

    createVehicles() {
      this.vehicles = [];

      const spawnCar = (x, z, color, isPolice = false) => {
        const carGroup = new THREE.Group();

        // Chassis
        const bodyGeo = new THREE.BoxGeometry(2.4, 1.0, 4.8);
        const bodyMat = new THREE.MeshStandardMaterial({ color: color, roughness: 0.3, metalness: 0.6 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        body.position.y = 0.8;
        body.castShadow = true;
        carGroup.add(body);

        // Cabin
        const cabinGeo = new THREE.BoxGeometry(2.0, 0.8, 2.4);
        const cabinMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.1 });
        const cabin = new THREE.Mesh(cabinGeo, cabinMat);
        cabin.position.set(0, 1.5, -0.2);
        cabin.castShadow = true;
        carGroup.add(cabin);

        // Wheels
        const wheelGeo = new THREE.CylinderGeometry(0.45, 0.45, 0.4, 16);
        const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111 });
        wheelGeo.rotateZ(Math.PI / 2);

        const wheelOffsets = [
          [-1.25, 0.45, 1.5], [1.25, 0.45, 1.5],
          [-1.25, 0.45, -1.5], [1.25, 0.45, -1.5]
        ];
        wheelOffsets.forEach(pos => {
          const wheel = new THREE.Mesh(wheelGeo, wheelMat);
          wheel.position.set(...pos);
          carGroup.add(wheel);
        });

        // Police Siren Lightbar
        if (isPolice) {
          const barGeo = new THREE.BoxGeometry(1.2, 0.25, 0.4);
          const barMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
          const bar = new THREE.Mesh(barGeo, barMat);
          bar.position.set(0, 2.0, -0.2);
          carGroup.add(bar);

          const sirenLight = new THREE.PointLight(0xff0000, 1.5, 18);
          sirenLight.position.set(0, 2.2, -0.2);
          carGroup.add(sirenLight);
          carGroup.userData.sirenLight = sirenLight;
        }

        // Headlights
        const headL = new THREE.SpotLight(0xffffff, 1.5, 30, Math.PI / 6, 0.5);
        headL.position.set(0.8, 0.8, -2.4);
        headL.target.position.set(0.8, 0.2, -15);
        carGroup.add(headL);
        carGroup.add(headL.target);

        carGroup.position.set(x, 0, z);
        this.scene.add(carGroup);

        const vehicleObj = {
          mesh: carGroup,
          speed: 0,
          maxSpeed: isPolice ? 28 : 25,
          angle: 0,
          isPolice: isPolice,
          health: 100
        };
        this.vehicles.push(vehicleObj);
        return vehicleObj;
      };

      // Spawn Cars
      spawnCar(0, 25, 0xff0044); // Red Sports Infernus
      spawnCar(15, -40, 0x1d4ed8); // Blue Sedan
      spawnCar(-60, 50, 0xfacc15); // Taxi Yellow
      this.policeCruiser = spawnCar(60, -60, 0x111111, true); // LCPD Police Cruiser
    }

    createMissions() {
      // 3D Rotating Mission Marker
      const markerGeo = new THREE.CylinderGeometry(1.8, 0.1, 3.5, 6);
      const markerMat = new THREE.MeshStandardMaterial({
        color: 0xffd700,
        emissive: 0xffaa00,
        emissiveIntensity: 0.6,
        wireframe: true
      });
      this.missionMarker = new THREE.Mesh(markerGeo, markerMat);
      this.missionMarker.position.set(0, 2.5, -60);
      this.scene.add(this.missionMarker);
    }

    setupControls() {
      window.addEventListener('keydown', (e) => {
        audio.init();
        if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = true;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = true;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = true;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = true;
        if (e.code === 'ShiftLeft') this.keys.sprint = true;
        if (e.code === 'Space') this.fireWeapon();
        if (e.code === 'KeyF' || e.code === 'Enter') this.toggleVehicle();
        if (e.code === 'KeyR') {
          const st = audio.cycleRadio();
          const rb = document.getElementById('hud-radio');
          rb.style.display = 'block';
          rb.textContent = `📻 Radio: ${st}`;
          setTimeout(() => rb.style.display = 'none', 3000);
        }
      });

      window.addEventListener('keyup', (e) => {
        if (e.code === 'KeyW' || e.code === 'ArrowUp') this.keys.forward = false;
        if (e.code === 'KeyS' || e.code === 'ArrowDown') this.keys.backward = false;
        if (e.code === 'KeyA' || e.code === 'ArrowLeft') this.keys.left = false;
        if (e.code === 'KeyD' || e.code === 'ArrowRight') this.keys.right = false;
        if (e.code === 'ShiftLeft') this.keys.sprint = false;
      });

      // Mouse Look
      let isMouseDown = false;
      window.addEventListener('mousedown', (e) => {
        if (e.target.tagName !== 'BUTTON') {
          audio.init();
          isMouseDown = true;
        }
      });
      window.addEventListener('mouseup', () => isMouseDown = false);

      window.addEventListener('mousemove', (e) => {
        if (isMouseDown || document.pointerLockElement) {
          this.camYaw -= e.movementX * 0.0035;
          this.camPitch = Math.max(0.05, Math.min(Math.PI / 2.5, this.camPitch + e.movementY * 0.003));
        }
      });

      document.getElementById('start-btn').addEventListener('click', () => {
        audio.init();
        document.getElementById('start-modal').style.display = 'none';
      });

      document.getElementById('respawn-btn').addEventListener('click', () => {
        this.playerHealth = 100;
        this.playerArmor = 50;
        this.playerCash = Math.max(0, this.playerCash - 500);
        this.wantedLevel = 0;
        this.playerPos.set(0, 0, 10);
        this.inVehicle = false;
        this.currentVehicle = null;
        this.playerGroup.visible = true;
        audio.setSiren(0);
        audio.setEngine(0, false);
        this.updateHUD();
        document.getElementById('wasted-modal').style.display = 'none';
      });
    }

    setupEvents() {
      window.addEventListener('resize', () => {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
      });
    }

    toggleVehicle() {
      if (this.inVehicle) {
        // Exit
        this.inVehicle = false;
        this.playerPos.copy(this.currentVehicle.mesh.position).add(new THREE.Vector3(2.5, 0, 0));
        this.playerGroup.visible = true;
        this.currentVehicle = null;
        audio.setEngine(0, false);
      } else {
        // Check closest car
        for (let v of this.vehicles) {
          if (v.mesh.position.distanceTo(this.playerPos) < 4.5) {
            this.inVehicle = true;
            this.currentVehicle = v;
            this.playerGroup.visible = false;
            if (v.isPolice && this.wantedLevel === 0) {
              this.increaseWanted();
            }
            break;
          }
        }
      }
    }

    fireWeapon() {
      audio.shoot();
      if (Math.random() < 0.25) this.increaseWanted();
    }

    increaseWanted() {
      this.wantedLevel = Math.min(5, this.wantedLevel + 1);
      audio.setSiren(this.wantedLevel);
      this.updateHUD();
    }

    updateHUD() {
      document.getElementById('hud-cash').textContent = '$' + String(this.playerCash).padStart(6, '0');
      document.getElementById('hud-hp').style.width = Math.max(0, this.playerHealth) + '%';
      document.getElementById('hud-arm').style.width = Math.max(0, this.playerArmor) + '%';

      const stars = document.getElementById('hud-stars').children;
      for (let i = 0; i < 5; i++) {
        if (i < this.wantedLevel) stars[i].classList.add('active');
        else stars[i].classList.remove('active');
      }
    }

    checkBuildingCollision(x, z, radius = 1.0) {
      for (let b of this.buildings) {
        if (x + radius > b.minX && x - radius < b.maxX &&
            z + radius > b.minZ && z - radius < b.maxZ) {
          return true;
        }
      }
      return false;
    }

    update(dt) {
      // Mission marker rotation
      if (this.missionMarker) {
        this.missionMarker.rotation.y += 0.03;
      }

      if (!this.inVehicle) {
        // On foot controls
        let moveX = 0, moveZ = 0;
        if (this.keys.forward) moveZ -= 1;
        if (this.keys.backward) moveZ += 1;
        if (this.keys.left) moveX -= 1;
        if (this.keys.right) moveX += 1;

        if (moveX !== 0 || moveZ !== 0) {
          const moveVector = new THREE.Vector3(moveX, 0, moveZ).normalize();
          moveVector.applyAxisAngle(new THREE.Vector3(0, 1, 0), this.camYaw);

          const speed = this.keys.sprint ? 12 : 6;
          const nextX = this.playerPos.x + moveVector.x * speed * dt;
          const nextZ = this.playerPos.z + moveVector.z * speed * dt;

          if (!this.checkBuildingCollision(nextX, this.playerPos.z)) this.playerPos.x = nextX;
          if (!this.checkBuildingCollision(this.playerPos.x, nextZ)) this.playerPos.z = nextZ;

          this.playerRot = Math.atan2(moveVector.x, moveVector.z);
          this.playerGroup.rotation.y = this.playerRot;

          // Leg swinging animation
          const legAngle = Math.sin(Date.now() * 0.012) * 0.5;
          this.leftLeg.rotation.x = legAngle;
          this.rightLeg.rotation.x = -legAngle;
          this.leftArm.rotation.x = -legAngle * 0.8;
          this.rightArm.rotation.x = legAngle * 0.8;
        } else {
          this.leftLeg.rotation.x = 0;
          this.rightLeg.rotation.x = 0;
          this.leftArm.rotation.x = 0;
          this.rightArm.rotation.x = 0;
        }

        // Camera follow Claude
        const camX = this.playerPos.x + Math.sin(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        const camY = this.playerPos.y + Math.sin(this.camPitch) * this.camDist + 2;
        const camZ = this.playerPos.z + Math.cos(this.camYaw) * Math.cos(this.camPitch) * this.camDist;
        this.camera.position.set(camX, camY, camZ);
        this.camera.lookAt(this.playerPos.x, this.playerPos.y + 1.5, this.playerPos.z);

      } else {
        // Vehicle driving
        const car = this.currentVehicle;
        if (this.keys.forward) car.speed = Math.min(car.speed + 18 * dt, car.maxSpeed);
        else if (this.keys.backward) car.speed = Math.max(car.speed - 16 * dt, -car.maxSpeed * 0.4);
        else car.speed *= 0.96;

        if (Math.abs(car.speed) > 0.5) {
          const steer = 1.8 * dt * (car.speed > 0 ? 1 : -1);
          if (this.keys.left) car.angle += steer;
          if (this.keys.right) car.angle -= steer;
        }

        car.mesh.rotation.y = car.angle;
        const vx = -Math.sin(car.angle) * car.speed * dt;
        const vz = -Math.cos(car.angle) * car.speed * dt;

        if (!this.checkBuildingCollision(car.mesh.position.x + vx, car.mesh.position.z + vz, 2.0)) {
          car.mesh.position.x += vx;
          car.mesh.position.z += vz;
        } else {
          car.speed = -car.speed * 0.4;
        }

        this.playerPos.copy(car.mesh.position);
        audio.setEngine(car.speed / car.maxSpeed, true);

        // Chase Cam
        const chaseDist = 12;
        const camX = car.mesh.position.x + Math.sin(car.angle) * chaseDist;
        const camY = car.mesh.position.y + 4.5;
        const camZ = car.mesh.position.z + Math.cos(car.angle) * chaseDist;
        this.camera.position.lerp(new THREE.Vector3(camX, camY, camZ), 0.1);
        this.camera.lookAt(car.mesh.position.x, car.mesh.position.y + 1.2, car.mesh.position.z);
      }

      // Police AI pursuit
      if (this.wantedLevel > 0 && this.policeCruiser) {
        const pc = this.policeCruiser;
        const targetPos = this.playerPos;
        const dx = targetPos.x - pc.mesh.position.x;
        const dz = targetPos.z - pc.mesh.position.z;
        const targetAngle = Math.atan2(-dx, -dz);

        pc.angle += (targetAngle - pc.angle) * 0.05;
        pc.mesh.rotation.y = pc.angle;
        pc.speed = Math.min(pc.speed + 12 * dt, 20);

        pc.mesh.position.x -= Math.sin(pc.angle) * pc.speed * dt;
        pc.mesh.position.z -= Math.cos(pc.angle) * pc.speed * dt;

        // Siren flash
        if (pc.mesh.userData.sirenLight) {
          const isBlue = Math.floor(Date.now() / 150) % 2 === 0;
          pc.mesh.userData.sirenLight.color.setHex(isBlue ? 0x0088ff : 0xff0000);
        }

        // Ramming player
        if (pc.mesh.position.distanceTo(this.playerPos) < 4.0) {
          this.playerHealth -= 8 * dt;
          this.updateHUD();
          if (this.playerHealth <= 0) {
            document.getElementById('wasted-modal').style.display = 'flex';
          }
        }
      }

      // Mission check
      if (this.missionMarker && this.playerPos.distanceTo(this.missionMarker.position) < 5.0) {
        this.playerCash += 10000;
        this.missionMarker.position.set((Math.random() - 0.5) * 180, 2.5, (Math.random() - 0.5) * 180);
        const mb = document.getElementById('mission-box');
        mb.style.display = 'block';
        setTimeout(() => mb.style.display = 'none', 4000);
        this.updateHUD();
      }

      // Radar Canvas update
      this.updateRadar();
    }

    updateRadar() {
      const rCanvas = document.getElementById('radar-canvas');
      const rCtx = rCanvas.getContext('2d');
      rCanvas.width = 140;
      rCanvas.height = 140;
      rCtx.clearRect(0, 0, 140, 140);

      rCtx.fillStyle = '#0f172a';
      rCtx.fillRect(0, 0, 140, 140);

      rCtx.save();
      rCtx.translate(70, 70);

      const scale = 0.4;
      // Mission blip (Yellow)
      if (this.missionMarker) {
        const mx = (this.missionMarker.position.x - this.playerPos.x) * scale;
        const mz = (this.missionMarker.position.z - this.playerPos.z) * scale;
        rCtx.fillStyle = '#ffd700';
        rCtx.fillRect(mx - 3, mz - 3, 6, 6);
      }

      // Police blip (Red)
      if (this.wantedLevel > 0 && this.policeCruiser) {
        const px = (this.policeCruiser.mesh.position.x - this.playerPos.x) * scale;
        const pz = (this.policeCruiser.mesh.position.z - this.playerPos.z) * scale;
        rCtx.fillStyle = '#ff2222';
        rCtx.fillRect(px - 3, pz - 3, 6, 6);
      }

      // Player blip
      rCtx.fillStyle = '#00e5ff';
      rCtx.beginPath();
      rCtx.arc(0, 0, 4, 0, Math.PI * 2);
      rCtx.fill();

      rCtx.restore();
    }

    animate() {
      requestAnimationFrame(() => this.animate());
      const dt = Math.min(this.clock.getDelta(), 0.1);
      this.update(dt);
      this.renderer.render(this.scene, this.camera);
    }
  }

  window.addEventListener('DOMContentLoaded', () => {
    new GTA3Game();
  });
})();