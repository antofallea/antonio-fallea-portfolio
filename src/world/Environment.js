import * as THREE from 'three';

export class Environment {
  constructor(scene, isUltra) {
    this.scene = scene;
    this.isUltra = isUltra;
    
    this.setupLighting();
    this.setupSky();
  }

  setupLighting() {
    // Hemisphere light for base ambient
    const hemiLight = new THREE.HemisphereLight('#59c7ff', '#04101d', 1.9);
    this.scene.add(hemiLight);

    // Main sun (directional)
    const sun = new THREE.DirectionalLight('#98c7ff', 1.05);
    sun.position.set(24, 34, 12);
    sun.castShadow = !this.isUltra;
    if (!this.isUltra) {
      sun.shadow.mapSize.set(2048, 2048);
      sun.shadow.camera.left = -43;
      sun.shadow.camera.right = 43;
      sun.shadow.camera.top = 43;
      sun.shadow.camera.bottom = -43;
      sun.shadow.bias = -0.0005; // Prevent shadow acne
    }
    this.scene.add(sun);

    // City key light
    const cityKey = new THREE.DirectionalLight('#82dcff', 1.35);
    cityKey.position.set(0, 17, 23);
    this.scene.add(cityKey);

    // Decorative glows
    this.addGlow('#ff48c8', 5, 28, new THREE.Vector3(0, 11, 0));
    this.addGlow('#19e7ff', 6, 32, new THREE.Vector3(-13, 9, 7));
    this.addGlow('#8957ff', 6, 32, new THREE.Vector3(16, 12, -11));
  }

  addGlow(color, intensity, distance, position) {
    const light = new THREE.PointLight(color, intensity, distance, 2);
    light.position.copy(position);
    this.scene.add(light);
  }

  setupSky() {
    // A simple gradient background using a large sphere for the sky
    const vertexShader = `
      varying vec3 vWorldPosition;
      void main() {
        vec4 worldPosition = modelMatrix * vec4(position, 1.0);
        vWorldPosition = worldPosition.xyz;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const fragmentShader = `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vWorldPosition;
      void main() {
        float h = normalize(vWorldPosition).y;
        gl_FragColor = vec4(mix(bottomColor, topColor, max(h, 0.0)), 1.0);
      }
    `;
    const uniforms = {
      topColor: { value: new THREE.Color('#031021') },
      bottomColor: { value: new THREE.Color('#071a33') }
    };
    
    const skyGeo = new THREE.SphereGeometry(150, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms,
      side: THREE.BackSide,
      depthWrite: false
    });
    const sky = new THREE.Mesh(skyGeo, skyMat);
    this.scene.add(sky);
  }
}
