import * as THREE from 'three';
import { Engine } from './core/Engine.js';
import { AssetManager } from './core/AssetManager.js';
import { Environment } from './world/Environment.js';
import { CityBuilder } from './world/CityBuilder.js';
import { Player } from './entities/Player.js';
import { UIManager } from './ui/UIManager.js';
import { AudioManager } from './core/AudioManager.js';
import './style.css';

// Graphics Mode Handling
const isMobileDevice = window.innerWidth < 768;
const savedMode = localStorage.getItem('graphicsMode');
const isUltra = savedMode ? savedMode === 'ultra' : isMobileDevice;

const toggleBarHTML = `
  <div id="modeToggleBar" class="toggle-bar">
    <span>MODALITÀ:</span>
    <button id="btnNormal" class="${!isUltra ? 'active' : ''}">PC (NORMALE)</button>
    <button id="btnUltra" class="${isUltra ? 'active' : ''}">MOBILE (OTTIMIZZATA)</button>
  </div>
`;
document.body.insertAdjacentHTML('afterbegin', toggleBarHTML);

document.getElementById('btnNormal').addEventListener('click', () => {
  localStorage.setItem('graphicsMode', 'normal');
  location.reload();
});
document.getElementById('btnUltra').addEventListener('click', () => {
  localStorage.setItem('graphicsMode', 'ultra');
  location.reload();
});

// Init Audio
const audio = new AudioManager();

// Project & District Data
const projects = {
  chrono: { 
    id: 'chrono', index: '01', type: 'PYTHON · AI', title: 'ChronoWeave', short: 'CHRONO WEAVE', 
    description: 'A pluggable vector index for AI retrieval with temporal freshness.', 
    tags: ['Python','Vector index','RAG'], 
    link: 'https://github.com/antofallea/ChronoWeave', 
    position: new THREE.Vector3(18, 0, -18), 
    color: 0xff2bbd 
  },
  ris: { 
    id: 'ris', index: '02', type: 'PYTHON · GRAPH DATA', title: 'Relational Identity Structure', short: 'R.I.S. LAB', 
    description: 'Entity-resolution research project.', 
    tags: ['Python','Graphs','Research'], 
    link: 'https://github.com/antofallea/relational-identity-structure', 
    position: new THREE.Vector3(25, 0, -10), 
    color: 0x1cecff 
  },
  mensa: { 
    id: 'mensa', index: '03', type: 'C · ALGORITHMS', title: 'Mensa Simulator', short: 'MENSA SIMULATOR', 
    description: 'Data structures and algorithms applied to queue simulation.', 
    tags: ['C','Data Structures'], 
    link: '#', 
    position: new THREE.Vector3(-15, 0, -25), 
    color: 0x8957ff 
  }
};

const districts = [
  { id: 'ai', name: 'AI RESEARCH LAB', subtitle: 'Experiments, models and intelligent systems.', x: 20, z: -15, radius: 15 },
  { id: 'core', name: 'SKILLS & TECH CENTER', subtitle: 'Algorithms and Data Structures.', x: -15, z: -20, radius: 15 },
  { id: 'hq', name: 'PORTFOLIO HQ', subtitle: 'Central Hub & Contact Center.', x: 0, z: 0, radius: 12 }
];

const infoPlace = { id: 'info', short: 'ABOUT ME', position: new THREE.Vector3(-10, 0, -11) };

// Initialize Modules
const canvas = document.querySelector('#world');
const engine = new Engine(canvas, isUltra);
const assets = new AssetManager(engine.renderer, isUltra);
const environment = new Environment(engine.scene, isUltra);

const city = new CityBuilder(engine.scene, assets, isUltra);
city.build(projects, infoPlace);

const player = new Player(engine.scene, engine.camera, assets, city.colliders, city.clickables, isUltra);
const ui = new UIManager(player, projects, infoPlace, districts);

// Setup Update Loop
engine.addUpdateCallback((delta, time) => {
  player.update(delta);
  city.update(delta, time);
  ui.update();
});

// Start Audio on interaction
const startAudio = () => {
  audio.startMusic();
  window.removeEventListener('pointerdown', startAudio);
  window.removeEventListener('keydown', startAudio);
};
window.addEventListener('pointerdown', startAudio);
window.addEventListener('keydown', startAudio);

// Start Engine
engine.start();
