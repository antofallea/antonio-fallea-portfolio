import * as THREE from 'three';

export class Player {
  constructor(scene, camera, assetManager, colliders, clickables, isUltra) {
    this.scene = scene;
    this.camera = camera;
    this.assets = assetManager;
    this.colliders = colliders;
    this.clickables = clickables;
    this.isUltra = isUltra;
    
    this.group = new THREE.Group();
    this.characterGroup = new THREE.Group();
    this.group.add(this.characterGroup);
    
    this.group.position.set(0, 0.06, 6.5);
    this.scene.add(this.group);

    this.mixer = null;
    this.actions = {};
    this.activeAction = null;
    
    this.keys = new Set();
    this.touch = new Set();
    this.cameraYaw = 0;
    this.cameraDistance = 7.4;
    this.target = new THREE.Vector3();
    
    this.destination = null;
    this.moving = false;
    this.cameraIntroPhase = true; // Cinematic intro phase
    this.introCamPos = new THREE.Vector3(30, 45, 40);

    this.setupAvatar();
    this.setupListeners();
  }

  setupAvatar() {
    this.assets.loadSoldier((gltf) => {
      const model = gltf.scene;
      model.scale.setScalar(1.58);
      model.rotation.y = Math.PI;
      
      const bounds = new THREE.Box3().setFromObject(model);
      model.position.y = -bounds.min.y;
      
      model.traverse(node => {
        if (node.isMesh) {
          node.castShadow = !this.isUltra;
          node.receiveShadow = !this.isUltra;
        }
      });
      
      this.characterGroup.add(model);
      this.mixer = new THREE.AnimationMixer(model);
      
      gltf.animations.forEach(clip => {
        this.actions[clip.name] = this.mixer.clipAction(clip);
      });
      
      this.switchAnimation('Idle');
    });

    const playerLight = new THREE.PointLight('#b7efff', 6.5, 13, 2);
    playerLight.position.set(0, 4, 3);
    this.group.add(playerLight);
  }

  switchAnimation(name) {
    if (!this.mixer) return;
    const next = this.actions[name] || this.actions['Idle'];
    if (!next || this.activeAction === next) return;
    
    if (this.activeAction) this.activeAction.fadeOut(0.18);
    next.reset().fadeIn(0.18).play();
    this.activeAction = next;
  }

  setupListeners() {
    window.addEventListener('keydown', e => {
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','KeyW','KeyA','KeyS','KeyD'].includes(e.code)) {
        e.preventDefault();
        this.keys.add(e.code);
      }
    });
    window.addEventListener('keyup', e => this.keys.delete(e.code));
    
    window.addEventListener('wheel', e => {
      if (this.cameraIntroPhase) return;
      this.cameraDistance = THREE.MathUtils.clamp(this.cameraDistance + e.deltaY * 0.012, 4.8, 11.5);
    }, { passive: true });
  }

  setIntroPhase(active) {
    this.cameraIntroPhase = active;
  }

  travelTo(position) {
    this.destination = position.clone();
  }

  free(pos) {
    if (Math.abs(pos.x) > 36 || Math.abs(pos.z) > 36) return false;
    for (const c of this.colliders) {
      if (Math.abs(pos.x - c.x) < c.w && Math.abs(pos.z - c.z) < c.d) return false;
    }
    return true;
  }

  turnAngle(current, target, amount) {
    return current + Math.atan2(Math.sin(target - current), Math.cos(target - current)) * amount;
  }

  updateMovement(delta) {
    const raw = new THREE.Vector3(
      (this.keys.has('KeyD') || this.keys.has('ArrowRight') || this.touch.has('right') ? 1 : 0) - (this.keys.has('KeyA') || this.keys.has('ArrowLeft') || this.touch.has('left') ? 1 : 0),
      0,
      (this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.touch.has('down') ? 1 : 0) - (this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touch.has('up') ? 1 : 0)
    );
    
    const forward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    const right = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));
    const input = forward.multiplyScalar(-raw.z).add(right.multiplyScalar(raw.x));
    
    this.group.position.y = 0.06;
    let moving = false;
    
    if (input.lengthSq()) {
      this.destination = null;
      moving = true;
      input.normalize().multiplyScalar(8.2 * delta);
      const n = this.group.position.clone().add(input);
      if (this.free(n)) this.group.position.copy(n);
      this.group.rotation.y = this.turnAngle(this.group.rotation.y, Math.atan2(input.x, input.z), 0.24);
    }
    
    if (this.destination) {
      const d = this.destination.clone().sub(this.group.position);
      d.y = 0;
      if (d.length() < 0.3) {
        this.destination = null;
      } else {
        moving = true;
        d.normalize().multiplyScalar(7.4 * delta);
        const n = this.group.position.clone().add(d);
        if (this.free(n)) {
          this.group.position.copy(n);
          this.group.rotation.y = this.turnAngle(this.group.rotation.y, Math.atan2(d.x, d.z), 0.16);
        } else {
          this.destination = null;
        }
      }
    }
    
    this.moving = moving;
    if (this.mixer) {
      this.mixer.update(delta);
      this.switchAnimation(moving ? 'Walk' : 'Idle');
    }
  }

  updateCamera(delta) {
    if (this.cameraIntroPhase) {
      // Rotate high camera
      this.introCamPos.applyAxisAngle(new THREE.Vector3(0, 1, 0), delta * 0.1);
      this.camera.position.lerp(this.introCamPos, 1 - Math.exp(-delta * 5));
      this.camera.lookAt(0, 0, 0);
      return;
    }

    const smoothing = 1 - Math.exp(-delta * 8);
    this.target.lerp(this.group.position, 1 - Math.exp(-delta * 10));
    
    const zoomOut = this.moving ? 0.16 : 0;
    const lookLead = this.moving ? 0.55 : 0.14;
    
    // Head bob effect when moving
    const bob = this.moving ? Math.sin(performance.now() * 0.015) * 0.08 : 0;
    
    const offset = new THREE.Vector3(0, (this.moving ? 3.25 : 3.15) + bob, this.cameraDistance + zoomOut)
      .applyAxisAngle(new THREE.Vector3(0, 1, 0), this.cameraYaw);
      
    const heading = new THREE.Vector3(Math.sin(this.group.rotation.y), 0, Math.cos(this.group.rotation.y)).multiplyScalar(lookLead);
    const lookAt = this.target.clone().add(heading).add(new THREE.Vector3(0, 1.82, 0));
    
    this.camera.position.lerp(this.target.clone().add(offset), smoothing);
    this.camera.lookAt(lookAt);
  }

  update(delta) {
    if (!this.cameraIntroPhase) {
      this.updateMovement(delta);
    }
    this.updateCamera(delta);
  }
}
