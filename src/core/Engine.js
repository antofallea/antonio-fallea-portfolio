import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

export class Engine {
  constructor(canvas, isUltra) {
    this.canvas = canvas;
    this.isUltra = isUltra;
    this.clock = new THREE.Clock();
    
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#050d1b');
    
    // Improved Fog for better depth
    this.scene.fog = new THREE.FogExp2('#050d1b', 0.016);
    
    this.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200);
    
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !this.isUltra,
      powerPreference: 'high-performance'
    });
    
    // Adaptive quality setup
    this.setQuality();

    this.composer = null;
    if (!this.isUltra) {
      this.composer = new EffectComposer(this.renderer);
      this.composer.addPass(new RenderPass(this.scene, this.camera));
      
      // Adjusted bloom for better performance and look
      const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth / 2, window.innerHeight / 2), 
        0.08, 0.25, 0.99
      );
      this.composer.addPass(bloomPass);
    }
    
    this.onUpdate = [];
    
    window.addEventListener('resize', this.onResize.bind(this));
  }

  setQuality() {
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, this.isUltra ? 1.0 : 1.5));
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.shadowMap.enabled = !this.isUltra;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.08;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
  }

  onResize() {
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    if (this.composer) {
      this.composer.setSize(window.innerWidth, window.innerHeight);
    }
  }

  addUpdateCallback(callback) {
    this.onUpdate.push(callback);
  }

  start() {
    const loop = () => {
      requestAnimationFrame(loop);
      
      const delta = Math.min(this.clock.getDelta(), 0.05); // Cap delta to prevent huge jumps
      const time = this.clock.getElapsedTime();
      
      for (const callback of this.onUpdate) {
        callback(delta, time);
      }
      
      if (this.composer) {
        this.composer.render();
      } else {
        this.renderer.render(this.scene, this.camera);
      }
    };
    
    loop();
  }
}
