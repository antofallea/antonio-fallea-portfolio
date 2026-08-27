import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import soldierAsset from '../assets/soldier.glb?url';
import asphaltColor from '../assets/pbr/asphalt-color.jpg';
import asphaltNormal from '../assets/pbr/asphalt-normal.jpg';
import asphaltRoughness from '../assets/pbr/asphalt-roughness.jpg';
import facadeColor from '../assets/pbr/facade-color.jpg';
import facadeNormal from '../assets/pbr/facade-normal.jpg';
import facadeRoughness from '../assets/pbr/facade-roughness.jpg';

export class AssetManager {
  constructor(renderer, isUltra) {
    this.renderer = renderer;
    this.isUltra = isUltra;
    this.textureLoader = new THREE.TextureLoader();
    this.gltfLoader = new GLTFLoader();
    
    this.geometries = new Map();
    this.materials = {};
    
    this.initMaterials();
  }

  // GEOMETRY CACHING
  getBoxGeometry(w, h, d) {
    const key = `box_${w}_${h}_${d}`;
    if (!this.geometries.has(key)) {
      this.geometries.set(key, new THREE.BoxGeometry(w, h, d));
    }
    return this.geometries.get(key);
  }

  getCylinderGeometry(rt, rb, h, rs) {
    const key = `cyl_${rt}_${rb}_${h}_${rs}`;
    if (!this.geometries.has(key)) {
      this.geometries.set(key, new THREE.CylinderGeometry(rt, rb, h, rs));
    }
    return this.geometries.get(key);
  }
  
  getPlaneGeometry(w, h) {
    const key = `plane_${w}_${h}`;
    if (!this.geometries.has(key)) {
        this.geometries.set(key, new THREE.PlaneGeometry(w, h));
    }
    return this.geometries.get(key);
  }

  // TEXTURE GENERATION
  surfaceTexture(asset, repeat, color = false) {
    const texture = this.textureLoader.load(asset);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeat, repeat);
    texture.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    if (color) texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }

  groundTexture(base, variance, repeat) {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    const rgb = base.match(/\w\w/g).map(v => parseInt(v, 16));
    const img = x.createImageData(512, 512);
    for (let i = 0; i < img.data.length; i += 4) {
      const n = (Math.random() - 0.5) * variance;
      img.data[i] = rgb[0] + n;
      img.data[i + 1] = rgb[1] + n;
      img.data[i + 2] = rgb[2] + n;
      img.data[i + 3] = 255;
    }
    x.putImageData(img, 0, 0);
    x.globalAlpha = 0.16;
    x.strokeStyle = '#0a151a';
    for (let i = 0; i < 45; i++) {
      x.beginPath();
      x.moveTo(Math.random() * 512, Math.random() * 512);
      x.lineTo(Math.random() * 512, Math.random() * 512);
      x.stroke();
    }
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repeat, repeat);
    return t;
  }

  facadeTexture(seed, lit = '#79efff') {
    const c = document.createElement('canvas');
    c.width = c.height = 512;
    const x = c.getContext('2d');
    const random = n => {
      const v = Math.sin(n * 999 + seed * 73.17) * 43758.5453;
      return v - Math.floor(v);
    };
    x.fillStyle = seed % 2 ? '#0b1a2c' : '#111d2b';
    x.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 11; row++) {
      for (let col = 0; col < 5; col++) {
        const key = row * 5 + col;
        const px = 14 + col * 101;
        const py = 13 + row * 46;
        const active = random(key) > 0.35;
        x.fillStyle = active ? (random(key + 31) > 0.82 ? '#e8fbff' : lit) : '#07101d';
        x.fillRect(px, py, 73, 27);
        x.fillStyle = active ? '#ffffff18' : '#153048';
        x.fillRect(px + 3, py + 3, 67, 3);
        x.fillStyle = '#050b14';
        x.fillRect(px + 34, py, 4, 27);
      }
    }
    x.fillStyle = '#2e4255';
    for (let col = 0; col < 6; col++) x.fillRect(col * 101, 0, 7, 512);
    for (let row = 0; row < 12; row++) x.fillRect(0, row * 46, 512, 5);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    return t;
  }

  createTextLabel(text, color = '#0a2033') {
    const c = document.createElement('canvas');
    c.width = 900;
    c.height = 160;
    const x = c.getContext('2d');
    x.font = '600 48px "DM Mono", monospace';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.lineJoin = 'round';
    x.lineWidth = 18;
    x.strokeStyle = color;
    x.strokeText(text, 450, 80);
    x.fillStyle = '#f5f1e6';
    x.fillText(text, 450, 80);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthTest: false }));
    s.scale.set(7.4, 1.32, 1);
    return s;
  }

  createSignTexture(title, subtitle, color, bgColor = '#050d1b') {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 256;
    const x = c.getContext('2d');
    
    // Background
    x.fillStyle = bgColor;
    x.fillRect(0, 0, 1024, 256);
    
    // Border
    x.strokeStyle = color;
    x.lineWidth = 8;
    x.strokeRect(4, 4, 1016, 248);

    // Title
    x.font = '700 84px "Space Grotesk", sans-serif';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillStyle = color;
    x.fillText(title, 512, 100);
    
    // Subtitle
    if (subtitle) {
      x.font = '500 36px "DM Mono", monospace';
      x.fillStyle = '#cbd6e2';
      x.fillText(subtitle, 512, 180);
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = Math.min(this.renderer.capabilities.getMaxAnisotropy(), 8);
    return t;
  }

  createDirectionSignTexture(text, dir = 'left', color = '#19e7ff') {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 128;
    const x = c.getContext('2d');
    
    x.fillStyle = '#0a151a';
    x.fillRect(0, 0, 512, 128);
    x.strokeStyle = color;
    x.lineWidth = 6;
    x.strokeRect(3, 3, 506, 122);
    
    x.font = '600 42px "DM Mono", monospace';
    x.fillStyle = color;
    x.textAlign = dir === 'left' ? 'left' : 'right';
    x.textBaseline = 'middle';
    
    if (dir === 'left') {
      x.fillText(`← ${text}`, 30, 64);
    } else if (dir === 'right') {
      x.fillText(`${text} →`, 482, 64);
    } else {
      x.textAlign = 'center';
      x.fillText(`↑ ${text}`, 256, 64);
    }

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  initMaterials() {
    const BaseMat = this.isUltra ? THREE.MeshLambertMaterial : THREE.MeshStandardMaterial;
    const BasicMat = this.isUltra ? THREE.MeshBasicMaterial : THREE.MeshStandardMaterial;

    this.materials = {
      concrete: new BaseMat({ color: '#173652', roughness: 0.78, map: this.groundTexture('102943', 27, 11) }),
      pavement: new BaseMat({ color: '#123756', roughness: 0.56, map: this.groundTexture('0d2745', 15, 8) }),
      asphalt: new BaseMat({ 
        color: '#142337', 
        map: this.surfaceTexture(asphaltColor, 11, true),
        normalMap: this.isUltra ? null : this.surfaceTexture(asphaltNormal, 11),
        roughnessMap: this.isUltra ? null : this.surfaceTexture(asphaltRoughness, 11)
      }),
      paint: new THREE.MeshBasicMaterial({ color: '#dce9ec' }),
      navy: new BaseMat({ color: '#051121', roughness: 0.48 }),
      glass: new THREE.MeshPhysicalMaterial({ color: '#14b9e6', roughness: 0.08, metalness: 0.55, transmission: this.isUltra ? 0 : 0.04 }),
      foliage: new BaseMat({ color: '#0b4958', roughness: 0.8 }),
      trunk: new BaseMat({ color: '#16283c', roughness: 0.7 }),
      orange: new BaseMat({ color: '#ff43b4', emissive: '#ff0a91', emissiveIntensity: 1.1 }),
      lime: new BaseMat({ color: '#2bf1ff', emissive: '#00d9ff', emissiveIntensity: 1.35 }),
      light: new THREE.MeshBasicMaterial({ color: '#c7fbff' }),
      curb: new BaseMat({ color: '#9aa5aa', roughness: 0.86 }),
      stucco: new BaseMat({ color: '#697785', roughness: 0.86 }),
      roof: new BaseMat({ color: '#202b36', roughness: 0.7 }),
      aluminum: new BaseMat({ color: '#70808c', roughness: 0.33 }),
      window: new BasicMat({ color: '#132c40', emissive: '#0a1b28', emissiveIntensity: 0.32 }),
      warmWindow: new BasicMat({ color: '#c8a773', emissive: '#c47f43', emissiveIntensity: 0.82 }),
      door: new BaseMat({ color: '#163143', roughness: 0.48 }),
      planter: new BaseMat({ color: '#4d5660', roughness: 0.72 }),
      cladding: new BaseMat({
        color: '#b2ccdb', roughness: 0.82,
        map: this.surfaceTexture(facadeColor, 2, true),
        normalMap: this.isUltra ? null : this.surfaceTexture(facadeNormal, 2),
        roughnessMap: this.isUltra ? null : this.surfaceTexture(facadeRoughness, 2)
      })
    };

    if (!this.isUltra) {
      this.materials.asphalt.normalScale = new THREE.Vector2(0.32, 0.32);
    }
  }

  loadSoldier(callback) {
    this.gltfLoader.load(soldierAsset, callback);
  }
}
