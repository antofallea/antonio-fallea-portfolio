export class UIManager {
  constructor(player, projects, infoPlace, districts) {
    this.player = player;
    this.projects = projects;
    this.infoPlace = infoPlace;
    this.districts = districts;
    
    this.visited = new Set();
    
    this.zoneName = document.querySelector('#zoneName');
    this.missionText = document.querySelector('#missionText');
    this.interactionPrompt = document.querySelector('#interactionPrompt');
    this.nearbyName = document.querySelector('#nearbyName');
    this.toast = document.querySelector('#toast');
    this.miniPlayer = document.querySelector('#miniPlayer');
    this.visitedCount = document.querySelector('#visitedCount');
    
    this.introScreen = document.querySelector('#introScreen');
    this.projectDialog = document.querySelector('#projectDialog');
    this.infoDialog = document.querySelector('#infoDialog');
    
    // Create District UI dynamically
    this.districtUI = document.createElement('div');
    this.districtUI.className = 'district-announcement';
    this.districtUI.innerHTML = `<h2 class="d-title"></h2><p class="d-sub"></p>`;
    document.body.appendChild(this.districtUI);
    
    this.nearbyProject = null;
    this.currentDistrict = null;
    
    this.setupListeners();
  }

  setupListeners() {
    document.querySelector('#enterWorld').addEventListener('click', () => {
      this.introScreen.classList.add('hidden');
      this.player.setIntroPhase(false);
      this.showToast('Welcome to Antonio’s world');
    });

    document.querySelector('#openInfo').addEventListener('click', () => this.infoDialog.showModal());
    document.querySelector('.close-dialog').addEventListener('click', () => this.projectDialog.close());
    document.querySelector('.close-info').addEventListener('click', () => this.infoDialog.close());
    
    document.querySelector('#exploreTouch').addEventListener('click', () => this.explore());
    window.addEventListener('keydown', e => {
      if (e.code === 'KeyE') this.explore();
    });

    // Dialog backdrop clicks
    this.projectDialog.addEventListener('click', e => { if (e.target.tagName === 'DIALOG') e.currentTarget.close() });
    this.infoDialog.addEventListener('click', e => { if (e.target.tagName === 'DIALOG') e.currentTarget.close() });

    // Touch controls
    document.querySelectorAll('[data-dir]').forEach(b => {
      const d = b.dataset.dir;
      const start = e => { e.preventDefault(); this.player.touch.add(d); };
      const end = () => this.player.touch.delete(d);
      b.addEventListener('pointerdown', start);
      b.addEventListener('pointerup', end);
      b.addEventListener('pointerleave', end);
      b.addEventListener('pointercancel', end);
    });

    // Pointer events for camera rotation (orbit)
    let pointerX = null;
    let dragging = false;
    let dragDistance = 0;
    
    document.querySelector('#world').addEventListener('pointerdown', e => {
      if (this.player.cameraIntroPhase) return;
      dragging = true;
      pointerX = e.clientX;
      dragDistance = 0;
    });
    
    document.querySelector('#world').addEventListener('pointermove', e => {
      if (this.player.cameraIntroPhase || (!dragging && e.pointerType !== 'mouse')) return;
      if (pointerX === null) { pointerX = e.clientX; return; }
      
      const d = e.clientX - pointerX;
      const sensitivity = e.pointerType === 'mouse' ? 0.0034 : 0.006;
      pointerX = e.clientX;
      
      if (d) {
        this.player.cameraYaw -= d * sensitivity;
        if (dragging) dragDistance += Math.abs(d);
      }
    });
    
    window.addEventListener('pointerup', e => {
      if (!dragging || this.player.cameraIntroPhase) return;
      dragging = false;
    });
  }

  showToast(text) {
    this.toast.textContent = text;
    this.toast.classList.add('visible');
    setTimeout(() => this.toast.classList.remove('visible'), 2400);
  }
  
  announceDistrict(district) {
    this.districtUI.querySelector('.d-title').textContent = district.name;
    this.districtUI.querySelector('.d-sub').textContent = district.subtitle;
    
    this.districtUI.classList.add('show');
    
    if (this.districtTimer) clearTimeout(this.districtTimer);
    this.districtTimer = setTimeout(() => {
      this.districtUI.classList.remove('show');
    }, 4000);
  }

  markVisited(project) {
    if (this.visited.has(project.id)) return;
    this.visited.add(project.id);
    
    if (this.visitedCount) {
        this.visitedCount.textContent = this.visited.size;
        this.visitedCount.classList.add('pop');
        setTimeout(() => this.visitedCount.classList.remove('pop'), 300);
    }
    
    this.showToast(`${project.title} discovered`);
  }

  openProject(project) {
    this.markVisited(project);
    document.querySelector('#dialogIndex').textContent = project.index;
    document.querySelector('#dialogType').textContent = project.type;
    document.querySelector('#dialogTitle').textContent = project.title;
    document.querySelector('#dialogDescription').textContent = project.description;
    document.querySelector('#dialogTags').innerHTML = project.tags.map(tag => `<span>${tag}</span>`).join('');
    document.querySelector('#dialogLink').href = project.link;
    this.projectDialog.showModal();
  }

  explore() {
    if (!this.nearbyProject) return;
    if (this.nearbyProject.id === 'info') {
      this.infoDialog.showModal();
    } else if (!this.projectDialog.open) {
      this.openProject(this.nearbyProject);
    }
  }

  getNearest() {
    let result = null;
    let d = Infinity;
    const places = [...Object.values(this.projects), this.infoPlace];
    
    for (const p of places) {
      const n = this.player.group.position.distanceTo(p.position);
      if (n < d) {
        result = p;
        d = n;
      }
    }
    return d < 6.4 ? result : null;
  }
  
  checkDistricts() {
    const pos = this.player.group.position;
    let found = null;
    
    for (const d of this.districts) {
      const dist = Math.sqrt(Math.pow(pos.x - d.x, 2) + Math.pow(pos.z - d.z, 2));
      if (dist < d.radius) {
        found = d;
        break;
      }
    }
    
    if (found && found.id !== this.currentDistrict) {
      this.currentDistrict = found.id;
      this.announceDistrict(found);
    } else if (!found && this.currentDistrict) {
      this.currentDistrict = null; // Left all known districts
    }
  }

  update() {
    if (this.player.cameraIntroPhase) return;

    this.checkDistricts();
    const p = this.getNearest();
    
    if (p !== this.nearbyProject) {
      this.nearbyProject = p;
      this.interactionPrompt.classList.toggle('show', !!p);
      
      if (p) {
        this.nearbyName.textContent = p.short;
        this.zoneName.textContent = p.short;
        this.missionText.textContent = `Explore ${p.short}`;
      } else {
        const isBase = this.player.group.position.length() < 9;
        this.zoneName.textContent = isBase ? 'BASE CAMP' : 'OPEN WORLD';
        this.missionText.textContent = 'Explore the city';
      }
    }
    
    // Update minimap dot
    if (this.miniPlayer) {
      this.miniPlayer.style.left = `${50 + this.player.group.position.x * 1.12}%`;
      this.miniPlayer.style.top = `${50 + this.player.group.position.z * 1.12}%`;
    }
  }
}
