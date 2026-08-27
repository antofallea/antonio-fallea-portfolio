import * as THREE from 'three';

export class CityBuilder {
  constructor(scene, assetManager, isUltra) {
    this.scene = scene;
    this.assets = assetManager;
    this.isUltra = isUltra;
    this.world = new THREE.Group();
    this.scene.add(this.world);
    
    this.colliders = [];
    this.clickables = [];
    this.hubs = [];
    this.techEffects = [];
    this.cars = [];
    this.skyTraffic = [];
    this.particles = null;

    // Data for instancing
    this.treeData = [];
    this.lampData = [];
  }

  collide(x, z, w, d) {
    this.colliders.push({ x, z, w: w / 2 + 0.7, d: d / 2 + 0.7 });
  }

  createMesh(geometry, mat, x = 0, y = 0, z = 0, parent = this.world) {
    const o = new THREE.Mesh(geometry, mat);
    o.position.set(x, y, z);
    o.castShadow = !this.isUltra;
    o.receiveShadow = !this.isUltra;
    parent.add(o);
    return o;
  }

  box(w, h, d, x, y, z, mat, parent = this.world) {
    const geo = this.assets.getBoxGeometry(w, h, d);
    return this.createMesh(geo, mat, x, y + h / 2, z, parent);
  }

  // Record positions for instanced meshes
  addTree(x, z, s = 1) {
    this.treeData.push({ x, z, s });
  }

  addLamp(x, z) {
    this.lampData.push({ x, z });
  }

  buildInstancedMeshes() {
    // Trees
    if (this.treeData.length > 0) {
      const trunkGeo = this.assets.getCylinderGeometry(0.14, 0.2, 1.35, 8);
      // Simplify leaves geometry
      const foliageGeo = new THREE.IcosahedronGeometry(0.95, this.isUltra ? 1 : 2);
      
      const trunks = new THREE.InstancedMesh(trunkGeo, this.assets.materials.trunk, this.treeData.length);
      const foliages = new THREE.InstancedMesh(foliageGeo, this.assets.materials.foliage, this.treeData.length);
      
      trunks.castShadow = !this.isUltra;
      foliages.castShadow = !this.isUltra;
      
      const dummy = new THREE.Object3D();
      this.treeData.forEach((t, i) => {
        dummy.position.set(t.x, 0.67 * t.s, t.z);
        dummy.scale.setScalar(t.s);
        dummy.updateMatrix();
        trunks.setMatrixAt(i, dummy.matrix);
        
        dummy.position.set(t.x, 1.8 * t.s, t.z);
        dummy.scale.set(t.s, t.s * 1.15, t.s);
        dummy.updateMatrix();
        foliages.setMatrixAt(i, dummy.matrix);
      });
      this.world.add(trunks, foliages);
    }

    // Lamps
    if (this.lampData.length > 0) {
      const poleGeo = this.assets.getCylinderGeometry(0.055, 0.075, 3.1, 8);
      const lightGeo = this.assets.getBoxGeometry(0.48, 0.16, 0.48);
      
      const poles = new THREE.InstancedMesh(poleGeo, this.assets.materials.navy, this.lampData.length);
      const lights = new THREE.InstancedMesh(lightGeo, this.assets.materials.light, this.lampData.length);
      
      const dummy = new THREE.Object3D();
      this.lampData.forEach((l, i) => {
        dummy.position.set(l.x, 1.55, l.z);
        dummy.scale.setScalar(1);
        dummy.updateMatrix();
        poles.setMatrixAt(i, dummy.matrix);
        
        dummy.position.set(l.x, 3.12, l.z);
        dummy.updateMatrix();
        lights.setMatrixAt(i, dummy.matrix);
        
        // Add point light for each lamp if not ultra (performance)
        if (!this.isUltra || Math.random() > 0.5) {
          const pool = new THREE.PointLight('#63e8ff', 2.35, 9, 2);
          pool.position.set(l.x, 3.05, l.z);
          this.world.add(pool);
        }
      });
      this.world.add(poles, lights);
    }
  }

  road(w, d, x, z) {
    const horiz = w > d;
    const length = Math.max(w, d);
    const roadWidth = Math.min(w, d);
    
    const sidewalk = this.box(w + 2.2, 0.06, d + 2.2, x, -0.055, z, this.assets.materials.pavement);
    const surface = this.box(w, 0.045, d, x, 0.01, z, this.assets.materials.asphalt);
    sidewalk.castShadow = surface.castShadow = false;
    sidewalk.receiveShadow = surface.receiveShadow = true;

    const curbMaterial = this.assets.materials.curb;
    const curbInset = roadWidth / 2 + 0.23;
    
    const curb = (cw, cd, cx, cz) => {
      const piece = this.box(cw, 0.15, cd, cx, -0.01, cz, curbMaterial);
      piece.castShadow = false;
    };

    if (horiz) {
      curb(w + 1.1, 0.26, x, z + curbInset);
      curb(w + 1.1, 0.26, x, z - curbInset);
    } else {
      curb(0.26, d + 1.1, x + curbInset, z);
      curb(0.26, d + 1.1, x - curbInset, z);
    }
    
    // Instead of instancing dashes which is complex for roads, we just create them with BasicMaterial
    for (let p = -length / 2 + 2.4; p < length / 2 - 1.2; p += 5.4) {
      const dash = this.box(horiz ? 2.25 : 0.14, 0.052, horiz ? 0.14 : 2.25, horiz ? x + p : x, 0.04, horiz ? z : z + p, this.assets.materials.paint);
      dash.castShadow = false;
    }
  }

  placeBuildingSign(title, subtitle, color, w, h, x, y, z, rotationY, parent) {
    const tex = this.assets.createSignTexture(title, subtitle, color);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const geo = this.assets.getPlaneGeometry(w, h);
    const sign = this.createMesh(geo, mat, x, y, z, parent);
    sign.rotation.y = rotationY;
  }

  placeStreetSign(text, dir, color, x, z, rotationY) {
    const g = new THREE.Group();
    g.position.set(x, 0, z);
    g.rotation.y = rotationY;
    
    // Pole
    this.box(0.12, 2.5, 0.12, 0, 0, 0, this.assets.materials.aluminum, g);
    
    // Sign plane (removed DoubleSide to prevent mirrored backward text)
    const tex = this.assets.createDirectionSignTexture(text, dir, color);
    const mat = new THREE.MeshBasicMaterial({ map: tex });
    const sign = this.createMesh(this.assets.getPlaneGeometry(2, 0.5), mat, 0, 2.2, 0.1, g);
    
    this.world.add(g);
  }

  building(x, z, w, d, h, v = 0, signData = null) {
    const g = new THREE.Group();
    const glowColor = [0x6ccff4, 0xffb36a, 0xb99df7][v % 3];
    const floors = Math.max(2, Math.floor((h - 0.72) / 1.46));
    const floorHeight = (h - 0.78) / floors;
    
    g.position.set(x, 0, z);
    
    const mats = this.assets.materials;
    const body = this.box(w, h, d, 0, 0, 0, [mats.stucco, mats.stucco, mats.roof, mats.roof, mats.cladding, mats.cladding], g);
    const plinth = this.box(w + 0.38, 0.44, d + 0.38, 0, 0, 0, mats.curb, g);
    const roof = this.box(w + 0.52, 0.24, d + 0.52, 0, h, 0, mats.roof, g);
    
    body.castShadow = roof.castShadow = plinth.castShadow = !this.isUltra;

    // Interior light
    if (!this.isUltra) {
      const interior = new THREE.PointLight(glowColor, 1.15, 11, 2);
      interior.position.set(0, Math.min(h * 0.5, 4), d / 2 + 1.1);
      g.add(interior);
    }
    
    // Sign on building
    if (signData) {
      this.placeBuildingSign(signData.title, signData.sub, signData.color, Math.min(w * 0.8, 6), 1.5, 0, h + 1, d/2 + 0.2, 0, g);
    }

    this.world.add(g);
    this.collide(x, z, w, d);
  }

  cyberTower(x, z, height, color, signData = null) {
    const g = new THREE.Group();
    const width = 3.6 + Math.random() * 1.4;
    g.position.set(x, 0, z);
    
    const core = this.box(width, height, width, 0, 0, 0, this.assets.materials.glass, g);
    const capGeo = this.assets.getCylinderGeometry(width * 0.58, width * 0.8, 1.25, 6);
    const cap = this.createMesh(capGeo, new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1.2 }), 0, height + 0.6, 0, g);
    
    core.castShadow = cap.castShadow = !this.isUltra;
    
    const light = new THREE.PointLight(color, 2.8, 16, 2);
    light.position.set(0, height * 0.55, 0);
    g.add(light);
    
    if (signData) {
      this.placeBuildingSign(signData.title, signData.sub, signData.color, width * 1.5, 2, 0, height * 0.6, width/2 + 0.3, 0, g);
    }
    
    this.world.add(g);
    this.collide(x, z, width, width);
  }

  projectHub(project, type) {
    const g = new THREE.Group();
    g.position.copy(project.position);
    
    const padGeo = this.assets.getCylinderGeometry(5.2, 5.2, 0.22, 48);
    this.createMesh(padGeo, this.assets.materials.pavement, 0, 0.11, 0, g);
    
    const bmat = new THREE.MeshBasicMaterial({ color: project.color, transparent: true, opacity: 0.15, side: THREE.DoubleSide, depthWrite: false });
    const beam = this.createMesh(this.assets.getCylinderGeometry(0.26, 1.25, 16, 20, 1, true), bmat, 0, 8, 0, g);
    
    const orb = this.createMesh(new THREE.IcosahedronGeometry(0.54, 2), new THREE.MeshStandardMaterial({ color: project.color, emissive: project.color, emissiveIntensity: 2.6 }), 0, 15.75, 0, g);
    
    // Front signage
    this.placeBuildingSign(project.short, 'Project Terminal', `#${project.color.toString(16).padStart(6, '0')}`, 4, 1, 0, 2.5, 3.5, 0, g);
    
    g.userData = { project, beam, orb };
    this.hubs.push(g);
    this.clickables.push(g);
    this.world.add(g);
    this.collide(project.position.x, project.position.z, 6.2, 6.2);
  }

  infoHouse(infoPlace) {
    const g = new THREE.Group();
    g.position.copy(infoPlace.position);
    
    const mats = this.assets.materials;
    const pad = this.box(8.1, 0.18, 7.55, 0, 0, 0, mats.pavement, g);
    const plinth = this.box(6.55, 0.44, 5.75, 0, 0.18, 0, mats.curb, g);
    const walls = this.box(6.2, 3.72, 5.38, 0, 0.62, 0, [mats.stucco, mats.stucco, mats.roof, mats.roof, mats.cladding, mats.cladding], g);
    
    // Glowing Sign
    this.placeBuildingSign('ABOUT ME', 'Antonio Fallea', '#ff48c8', 4.5, 1.2, 0, 4.5, 2.7, 0, g);
    
    g.userData = { place: infoPlace };
    this.clickables.push(g);
    this.world.add(g);
    this.collide(infoPlace.position.x, infoPlace.position.z, 6.65, 5.9);
  }

  particleField() {
    const amount = 780;
    const p = new Float32Array(amount * 3);
    const speed = new Float32Array(amount);
    
    for (let i = 0; i < amount; i++) {
      p[i * 3] = (Math.random() - 0.5) * 78;
      p[i * 3 + 1] = Math.random() * 18 + 0.3;
      p[i * 3 + 2] = (Math.random() - 0.5) * 78;
      speed[i] = 0.25 + Math.random() * 0.55;
    }
    
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const point = new THREE.Points(geo, new THREE.PointsMaterial({ color: '#fff2c9', size: 0.065, transparent: true, opacity: 0.62, depthWrite: false }));
    this.scene.add(point);
    this.particles = { point, speed };
  }

  build(projects, infoPlace) {
    const ground = this.createMesh(this.assets.getPlaneGeometry(100, 100), this.assets.materials.concrete);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = !this.isUltra;

    // Roads
    this.road(90, 8, 0, 0);
    this.road(8, 90, 0, 0);
    this.road(5.7, 40, 24, -17);
    this.road(40, 5.7, -17, 24);

    // Hubs
    this.projectHub(projects.chrono, 'chrono');
    this.projectHub(projects.ris, 'ris');
    this.projectHub(projects.mensa, 'mensa');
    this.infoHouse(infoPlace);

    // Buildings & Towers with Landmarks
    this.building(-25, -25, 8, 8, 12, 1, { title: 'SKILLS CENTER', sub: 'Tech Stack', color: '#c8ef5b' });
    this.cyberTower(25, -25, 20, '#19e7ff', { title: 'AI LAB', sub: 'Research & Models', color: '#19e7ff' });
    this.building(25, 25, 10, 8, 14, 2, { title: 'CONTACT', sub: 'Get in touch', color: '#ff48c8' });
    
    // Central HQ Tower
    this.cyberTower(8, -8, 25, '#ff48c8', { title: 'PORTFOLIO HQ', sub: 'Antonio Fallea', color: '#ff48c8' });

    // Other filler buildings
    const bParams = [[-28,-18,5.5,7,5.3,0],[-29,-5,4.5,9,3.6,1],[16,21,5.2,8,5.1,0],[28,9,5.6,5.5,7.3,1],[-11,28,8,4.4,5,1],[29,-7,4.3,6,6.1,0]];
    bParams.forEach(a => this.building(...a));

    // Street Signs at the intersection corners facing the player (rotationY = 0)
    this.placeStreetSign('AI LAB', 'right', '#19e7ff', 4.5, 4.5, 0);
    this.placeStreetSign('ABOUT ME', 'left', '#ff48c8', -4.5, 4.5, 0);
    this.placeStreetSign('SKILLS', 'up', '#c8ef5b', -4.5, -4.5, 0);
    
    // Instances
    for (let x = -35; x <= 35; x += 5) { this.addTree(x, -36, 0.82); this.addTree(x, 35, 0.85); }
    for (let z = -30; z <= 30; z += 5) { this.addTree(-36, z, 0.76); this.addTree(36, z, 0.86); }
    
    [-29, -21, -13, 13, 21, 29].forEach(n => {
      this.addLamp(n, -4.1); this.addLamp(n, 4.1);
      this.addLamp(-4.1, n); this.addLamp(4.1, n);
    });

    this.buildInstancedMeshes();
    this.particleField();
  }

  update(delta, time) {
    this.hubs.forEach((hub, i) => {
      hub.userData.orb.position.y = 15.75 + Math.sin(time * 2.1 + i) * 0.3;
      hub.userData.orb.rotation.y += delta * 1.7;
      if (hub.userData.beam) hub.userData.beam.material.opacity = 0.13 + Math.sin(time * 1.7 + i) * 0.04;
    });

    if (this.particles) {
      const pos = this.particles.point.geometry.attributes.position.array;
      for (let i = 0; i < this.particles.speed.length; i++) {
        pos[i * 3 + 1] -= this.particles.speed[i] * delta;
        pos[i * 3] += Math.sin(time * 0.36 + i) * 0.16 * delta;
        if (pos[i * 3 + 1] < 0.2) pos[i * 3 + 1] = 18 + Math.random() * 6;
      }
      this.particles.point.geometry.attributes.position.needsUpdate = true;
    }
  }
}
