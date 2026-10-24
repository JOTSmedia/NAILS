import * as THREE from './vendor/three.module.min.js';
import { GLTFLoader } from './vendor/GLTFLoader.js';

const colors = [
  { name: 'Cherry', hex: '#cf3d43' }, { name: 'Milk', hex: '#eee1dc' },
  { name: 'Bare', hex: '#b97c75' }, { name: 'Hot pink', hex: '#f32678' },
  { name: 'Cobalt', hex: '#2343ce' }, { name: 'Espresso', hex: '#38201f' },
];
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));

// A curved shell with a rounded cuticle and a silhouette that changes by shape.
function nailGeometry(shape, length, tipOnly = false) {
  const positions = [], indices = [], uvs = [];
  const rows = 64, columns = 32;
  const height = { Short: 2.15, Medium: 2.9, Long: 3.7 }[length];
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    for (let col = 0; col <= columns; col++) {
      const u = col / columns * 2 - 1;
      const start = tipOnly ? 0.77 - 0.13 * (1 - u * u) : 0;
      const v = start + (1 - start) * t;
      let width;
      if (v < 0.12) width = Math.sqrt(Math.max(0.001, 1 - Math.pow((v - 0.12) / 0.12, 2)));
      else if (shape === 'Square') width = 1 - 0.07 * v;
      else if (shape === 'Coffin') width = 1 - 0.4 * Math.pow((v - 0.12) / 0.88, 1.6);
      else if (shape === 'Stiletto') width = Math.pow(Math.max(0.001, 1 - (v - 0.12) / 0.88), 0.78);
      else width = Math.sqrt(Math.max(0.001, 1 - Math.pow((v - 0.12) / 0.88, 2.4)));
      const x = u * width * 0.65;
      const y = (v - 0.5) * height;
      const z = Math.sqrt(Math.max(0, 1 - u * u)) * 0.31 * width + Math.sin(v * Math.PI) * 0.11;
      positions.push(x, y, z + (tipOnly ? 0.008 : 0));
      uvs.push(col / columns, v);
      if (row < rows && col < columns) {
        const a = row * (columns + 1) + col, b = a + columns + 1;
        indices.push(a, a + 1, b, a + 1, b + 1, b);
      }
    }
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

export async function initNailLab(root, onChange) {
  const state = { color: 'Cherry', shape: 'Almond', length: 'Medium', finish: 'Gloss', skin: 'Warm' };
  let rotation = { x: -0.22, y: -0.22 }, target = { ...rotation }, spinning = false;
  let visible = true, frame = 0, pointer = null, lastTime = 0;
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const stage = root.querySelector('.nail-stage');
  const status = root.querySelector('.nail-status');
  const label = root.querySelector('.nail-current');
  const description = () => `${state.color} / ${state.shape} / ${state.length} / ${state.finish}`;
  const controls = root.querySelector('.nail-options');
  controls.innerHTML = `
    <fieldset class="nail-skin nail-field"><legend>Skin tone</legend><div class="nail-segments">${['Fair', 'Warm', 'Deep'].map(tone => `<button type="button" data-skin="${tone}" aria-pressed="${state.skin === tone}">${tone}</button>`).join('')}</div></fieldset>
    <fieldset class="nail-colors"><legend>Color <output class="nail-color-name">Cherry</output></legend><div class="nail-swatches">${colors.map((color, i) => `<button type="button" class="nail-swatch" style="--swatch:${color.hex}" data-color="${color.name}" aria-label="${color.name}" aria-pressed="${i === 0}"><span></span></button>`).join('')}</div></fieldset>
    ${[['Shape', ['Almond', 'Coffin', 'Square', 'Stiletto']], ['Finish', ['Gloss', 'French', 'Chrome', 'Pearl']], ['Length', ['Short', 'Medium', 'Long']]].map(([title, options]) => `<fieldset class="nail-field"><legend>${title}</legend><div class="nail-segments">${options.map(option => `<button type="button" data-${title.toLowerCase()}="${option}" aria-pressed="${state[title.toLowerCase()] === option}">${option}</button>`).join('')}</div></fieldset>`).join('')}`;

  let renderer, scene, camera, set, material, tipMaterial, pearlMaterial, skinMaterial;
  const skinTextures = new Map();
  const skinTones = { Fair: '#edbc9d', Warm: '#bd8058', Deep: '#6b3927' };
  const nails = [];
  let contextAvailable = true;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'low-power' });
    renderer.setPixelRatio(Math.min(devicePixelRatio, 1.75));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.95;
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.setAttribute('aria-hidden', 'true');
    stage.prepend(renderer.domElement);
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
    camera.position.set(0, 0, 20);
    scene.add(new THREE.HemisphereLight(0xfff5e8, 0xc29578, 1.4));

    // Photograph-like reflection cards baked into a local studio environment.
    const room = new THREE.Scene();
    room.background = new THREE.Color('#c0b6ac');
    const card = (x, y, z, w, h, intensity, ry = 0, rx = 0) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ color: new THREE.Color(intensity, intensity, intensity), side: THREE.DoubleSide }));
      mesh.position.set(x, y, z); mesh.rotation.set(rx, ry, 0); room.add(mesh);
    };
    card(-4, 3, 5, 1.7, 9, 8, 0.4);
    card(5, 1, 3, 1.5, 8, 5, -0.6);
    card(0, 6, 0, 9, 3, 4, 0, Math.PI / 2);
    card(0, -1, -5, 7, 5, 0.08);
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environment = pmrem.fromScene(room, 0.02);
    scene.environment = environment.texture;
    pmrem.dispose();
    room.traverse(obj => { obj.geometry?.dispose(); obj.material?.dispose(); });

    material = new THREE.MeshPhysicalMaterial({ color: colors[0].hex, roughness: 0.16, metalness: 0.12, clearcoat: 1, clearcoatRoughness: 0.06, side: THREE.DoubleSide, envMapIntensity: 1.3 });
    tipMaterial = new THREE.MeshPhysicalMaterial({ color: '#fff4ee', roughness: 0.15, clearcoat: 1, side: THREE.DoubleSide });
    pearlMaterial = new THREE.MeshPhysicalMaterial({ color: '#fff5e8', metalness: 0.3, roughness: 0.17, clearcoat: 1 });
    set = new THREE.Group(); scene.add(set);
    const hand = await new GLTFLoader().loadAsync('./assets/hand-right.glb');
    const holder = new THREE.Group();
    holder.rotation.set(Math.PI, Math.PI / 2, 0);
    // Rotate the supplied hand from XR coordinates into an upright manicure view.
    holder.quaternion.setFromRotationMatrix(new THREE.Matrix4().set(0,0,1,0, 0,-1,0,0, 1,0,0,0, 0,0,0,1));
    holder.scale.setScalar(38);
    holder.position.set(0.15, -1.06, -0.95);
    set.add(holder); holder.add(hand.scene);
    skinMaterial = new THREE.MeshPhysicalMaterial({ color: '#ffffff', roughness: 0.75, metalness: 0, sheen: 0.12, sheenColor: '#e8b39c', sheenRoughness: 0.8, envMapIntensity: 0.35 });
    const mapRange = (n, points) => {
      for (let i=1;i<points.length;i++) if(n<=points[i][0]) { const a=points[i-1],b=points[i]; return a[1]+(b[1]-a[1])*clamp((n-a[0])/(b[0]-a[0]),0,1); }
      return points[points.length-1][1];
    };
    hand.scene.traverse(object => {
      if (!object.isMesh) return;
      object.material = skinMaterial; object.frustumCulled = false;
      const positions=object.geometry.attributes.position;
      const uv=new Float32Array(positions.count*2);
      for(let i=0;i<positions.count;i++){
        const u=mapRange(positions.getZ(i),[[-.085,.09],[-.069,.16],[-.010,.35],[.016,.51],[.045,.65],[.062,.82],[.075,.9]]);
        const v=mapRange(-positions.getY(i),[[-.080,1.02],[-.025,.88],[0,.72],[.05,.46],[.08,.30],[.105,.19],[.122,.10],[.14,.03]]);
        uv[i*2]=(1+u)/3;uv[i*2+1]=1-v;
      }
      object.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
    });
    await setSkinTexture(state.skin);
    const fingerNames = ['thumb', 'index-finger', 'middle-finger', 'ring-finger', 'pinky-finger'];
    const widths = [0.0103, 0.0091, 0.0094, 0.0088, 0.0073];
    fingerNames.forEach((name, index) => {
      const tip = hand.scene.getObjectByName(`${name}-tip`);
      const distal = hand.scene.getObjectByName(`${name}-${name === 'thumb' ? 'phalanx-distal' : 'phalanx-distal'}`);
      const direction = tip.position.clone().sub(distal.position).normalize();
      const normal = new THREE.Vector3(1, 0, 0);
      normal.addScaledVector(direction, -normal.dot(direction)).normalize();
      const across = new THREE.Vector3().crossVectors(direction, normal).normalize();
      const nail = new THREE.Group();
      nail.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(across, direction, normal));
      nail.scale.setScalar(widths[index]);
      nail.userData = { tip: tip.position.clone(), direction, normal, width: widths[index] };
      positionNail(nail);
      nail.add(new THREE.Mesh(nailGeometry(state.shape, state.length), material));
      const french = new THREE.Mesh(nailGeometry(state.shape, state.length, true), tipMaterial); french.visible = false; nail.add(french);
      const pearls = new THREE.Group(); pearls.visible = false;
      for (let i = 0; i < 5; i++) {
        const bead = new THREE.Mesh(new THREE.SphereGeometry(0.065, 16, 12), pearlMaterial);
        bead.position.set((i - 2) * 0.18, -1.13 + Math.abs(i - 2) * 0.035, 0.2 + (2 - Math.abs(i - 2)) * 0.04);
        pearls.add(bead);
      }
      nail.add(pearls); holder.add(nail); nails.push(nail);
    });
    root.classList.add('nail-ready');
  } catch (error) {
    contextAvailable = false;
    renderer?.dispose();
    renderer?.domElement.remove();
    root.classList.add('nail-static');
    status.textContent = 'Live 3D is unavailable on this device. Your design choices still work.';
    root.querySelector('.nail-drag-hint').textContent = 'Your design will be included in your brief';
    root.querySelectorAll('[data-nail-view]').forEach(button => { button.disabled = true; });
  }

  async function setSkinTexture(tone) {
    const path=`./assets/tryon/almond${tone==='Warm'?'':'-'+tone.toLowerCase()}-lengths.jpg`;
    if(!skinTextures.has(path))skinTextures.set(path,new THREE.TextureLoader().loadAsync(path).then(sourceTexture=>{
      const im=sourceTexture.image, canvas=document.createElement('canvas');canvas.width=im.width;canvas.height=im.height;
      const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(im,0,0);
      const data=context.getImageData(0,0,canvas.width,canvas.height),original=new Uint8ClampedArray(data.data),width=canvas.width,height=canvas.height,frameWidth=width/3;
      const windows=[[.075,.40,.25,.67],[.27,.05,.42,.28],[.44,0,.58,.20],[.58,.05,.73,.28],[.73,.20,.90,.44]];
      // Nail lacquer is a separate 3D surface. Sample bare skin at the cuticle
      // so the photographic skin texture cannot leave a gray nail underneath.
      for(let col=0;col<3;col++)for(const box of windows){
        const x0=Math.floor((col+box[0])*frameWidth),x1=Math.ceil((col+box[2])*frameWidth),y0=Math.floor(box[1]*height),y1=Math.ceil(box[3]*height);
        for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
          const i=(y*width+x)*4,r=original[i],g=original[i+1],b=original[i+2];
          if(r-b>=43||r-g>=28)continue;
          let found=-1;
          for(let sy=y+8;sy<Math.min(height,y+height*.25);sy++){
            const j=(sy*width+x)*4;if(original[j]-original[j+2]>52&&original[j]-original[j+1]>27){found=j;break;}
          }
          if(found>=0)for(let k=0;k<3;k++)data.data[i+k]=original[found+k];
        }
      }
      context.putImageData(data,0,0);sourceTexture.dispose();return new THREE.CanvasTexture(canvas);
    }));
    try {
      const texture=await skinTextures.get(path);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=4;
      if(state.skin===tone){skinMaterial.map=texture;skinMaterial.needsUpdate=true;start();}
    }catch{skinMaterial.map=null;skinMaterial.color.set(skinTones[tone]);start();}
  }
  function positionNail(nail) {
    const { tip, direction, normal, width } = nail.userData;
    const height = { Short: 2.15, Medium: 2.9, Long: 3.7 }[state.length] * width;
    nail.position.copy(tip).addScaledVector(direction, height / 2 - 0.01).addScaledVector(normal, 0.0048);
  }
  function render(time = 0) {
    frame = 0;
    if (!contextAvailable || !visible || document.hidden) return;
    const delta = Math.min((time - lastTime) / 1000 || 0.016, 0.05); lastTime = time;
    if (spinning) target.y += delta * 0.45;
    const damping = reduced.matches ? 1 : 1 - Math.exp(-delta * 9);
    rotation.x += (target.x - rotation.x) * damping;
    rotation.y += (target.y - rotation.y) * damping;
    set.rotation.set(rotation.x, rotation.y, -0.24);
    set.position.y = reduced.matches || pointer ? 0 : Math.sin(time / 1900) * 0.07;
    renderer.render(scene, camera);
    if (!reduced.matches || spinning || Math.abs(target.x - rotation.x) + Math.abs(target.y - rotation.y) > 0.001) start();
  }
  function start() { if (!frame && visible && !document.hidden && contextAvailable) frame = requestAnimationFrame(render); }
  function resize() {
    if (!contextAvailable) return;
    const { width, height } = stage.getBoundingClientRect();
    renderer.setSize(width, height); camera.aspect = width / height;
    camera.position.z = camera.aspect < 1 ? 23.5 : 19.5;
    camera.updateProjectionMatrix(); start();
  }
  function update() {
    label.textContent = description();
    root.querySelector('.nail-color-name').textContent = state.color;
    controls.querySelectorAll('button').forEach(button => {
      const key = Object.keys(button.dataset)[0];
      button.setAttribute('aria-pressed', String(state[key] === button.dataset[key]));
    });
    if (contextAvailable) {
      setSkinTexture(state.skin);
      const chrome = state.finish === 'Chrome';
      material.color.set(chrome && state.color === 'Milk' ? '#d0c9c9' : state.hex || colors.find(color => color.name === state.color)?.hex || colors[0].hex);
      material.metalness = chrome ? 1 : 0.12; material.roughness = state.finish === 'Matte' ? 0.7 : chrome ? 0.13 : 0.16;
      nails.forEach(nail => {
        positionNail(nail);
        nail.children[0].geometry.dispose(); nail.children[0].geometry = nailGeometry(state.shape, state.length);
        nail.children[1].geometry.dispose(); nail.children[1].geometry = nailGeometry(state.shape, state.length, true);
        nail.children[1].visible = state.finish === 'French';
        nail.children[2].visible = state.finish === 'Pearl';
        nail.children[2].position.y = { Short: 0.28, Medium: 0, Long: -0.35 }[state.length];
      });
      start();
    }
    status.textContent = `${description()}. ${contextAvailable ? 'Preview updated.' : 'Design selected. Live 3D is unavailable on this device.'}`;
    onChange?.({ ...state, description: description() });
  }
  controls.addEventListener('click', event => {
    const button = event.target.closest('button'); if (!button) return;
    const key = Object.keys(button.dataset)[0]; state[key] = button.dataset[key]; update();
  });
  stage.addEventListener('pointerdown', event => {
    if (!contextAvailable || event.button !== 0 || event.target.closest('button')) return;
    pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId); spinning = false; syncSpin();
  });
  stage.addEventListener('pointermove', event => {
    if (!pointer || pointer.id !== event.pointerId) return;
    target.y += (event.clientX - pointer.x) * 0.012;
    target.x = clamp(target.x + (event.clientY - pointer.y) * 0.01, -1.3, 1.3);
    pointer.x = event.clientX; pointer.y = event.clientY; start();
  });
  ['pointerup', 'pointercancel', 'lostpointercapture'].forEach(name => stage.addEventListener(name, () => { pointer = null; }));
  stage.addEventListener('keydown', event => {
    if (event.target !== stage || !contextAvailable) return;
    if (event.key === 'ArrowLeft') target.y -= 0.2;
    else if (event.key === 'ArrowRight') target.y += 0.2;
    else if (event.key === 'ArrowUp') target.x = clamp(target.x - 0.2, -1.3, 1.3);
    else if (event.key === 'ArrowDown') target.x = clamp(target.x + 0.2, -1.3, 1.3);
    else if (event.key.toLowerCase() === 'r') target = { x: -0.22, y: -0.22 };
    else return;
    event.preventDefault(); start();
  });
  function syncSpin() { root.querySelector('[data-nail-view="spin"]').setAttribute('aria-pressed', String(spinning)); }
  root.querySelector('[data-nail-view="spin"]').addEventListener('click', () => { spinning = !spinning; syncSpin(); start(); });
  root.querySelector('[data-nail-view="reset"]').addEventListener('click', () => { spinning = false; syncSpin(); target = { x: -0.22, y: -0.22 }; start(); });
  root.querySelector('[data-nail-view="save"]').addEventListener('click', () => {
    const link = document.createElement('a');
    if (contextAvailable) {
      renderer.render(scene, camera);
      const canvas = document.createElement('canvas');
      canvas.width = renderer.domElement.width;
      canvas.height = renderer.domElement.height + 150;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = getComputedStyle(stage).backgroundColor === 'rgba(0, 0, 0, 0)' ? '#f9e4d0' : getComputedStyle(stage).backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(renderer.domElement, 0, 0);
      ctx.fillStyle = '#493b30';
      ctx.font = `500 ${Math.max(16, canvas.width / 32)}px Arial`;
      ctx.fillText('NAILS BY LISA', 28, canvas.height - 100);
      ctx.font = `${Math.max(11, canvas.width / 46)}px Arial`;
      ctx.fillText(description().toUpperCase(), 28, canvas.height - 64);
      ctx.fillText('DIGITAL COLOR STUDY · CONFIRM YOUR SHADE WITH LISA', 28, canvas.height - 28);
      link.href = canvas.toDataURL('image/png');
      link.download = 'nails-by-lisa-my-design.png';
      link.click();
    } else {
      const blob = new Blob([`NAILS BY LISA — MY NAIL DESIGN\n\n${description()}\n\nA digital color study. Confirm the final shade and service with Lisa.\n`], { type: 'text/plain;charset=utf-8' });
      const url = URL.createObjectURL(blob); link.href = url; link.download = 'nails-by-lisa-my-design.txt'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
    status.textContent = 'Your design is ready to save.';
  });
  new ResizeObserver(resize).observe(stage);
  new IntersectionObserver(([entry]) => { visible = entry.isIntersecting; if (visible) { lastTime = 0; start(); } else { cancelAnimationFrame(frame); frame = 0; } }).observe(stage);
  document.addEventListener('visibilitychange', () => { if (document.hidden) { cancelAnimationFrame(frame); frame = 0; } else { lastTime = 0; start(); } });
  reduced.addEventListener('change', () => { spinning = false; syncSpin(); start(); });
  resize(); onChange?.({ ...state, description: description() });
  return { getState: () => ({ ...state, description: description() }), setState: design => { Object.assign(state, design); update(); } };
}
