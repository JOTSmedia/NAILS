import { initNailLab as initSculpture } from './nail-lab.js';

const families = {
  Nudes: [['Ballet','#edc7bf'],['Rosewater','#d997a3'],['Blush','#c78386'],['Cashmere','#c49d85'],['Oat milk','#e9d4b9'],['Latte','#ac7b60'],['Caramel','#9b6246'],['Cocoa','#744734']],
  Pinks: [['Petal','#f4b2cd'],['Rose','#d66f97'],['Flamingo','#f879aa'],['Barbie','#e52b86'],['Fuchsia','#b92677'],['Raspberry','#9e315c'],['Bubblegum','#f394be'],['Peony','#e3a0bc']],
  Reds: [['Cherry','#ae1735'],['Poppy','#e13f43'],['Rouge','#cb152d'],['Garnet','#7d1f34'],['Merlot','#642136'],['Coral','#f16c69'],['Watermelon','#f13b5a'],['Brick','#a54439']],
  Brights: [['Tangerine','#ef6b2c'],['Apricot','#f6ab6c'],['Butter','#ead36b'],['Lemon','#f2e53b'],['Lime','#a9ca42'],['Electric','#caff35'],['Orchid','#b879ce'],['Lilac','#c7a3e2']],
  Blues: [['Cloud','#accfe2'],['Pool','#4baac7'],['Lagoon','#138896'],['Cobalt','#2c4dc4'],['Denim','#53739c'],['Navy','#243657'],['Periwinkle','#939ddb'],['Ice','#d6e8ed']],
  Greens: [['Pistachio','#b6c896'],['Sage','#8da17c'],['Olive','#7f8551'],['Jade','#388a70'],['Matcha','#a7af6a'],['Forest','#2b5948'],['Mint','#b3d9c2'],['Emerald','#146c54']],
  Darks: [['Espresso','#392322'],['Chocolate','#5f352d'],['Ink','#202026'],['Plum','#563451'],['Aubergine','#3b2639'],['Storm','#656572'],['Mocha','#907366'],['Slate','#677581']],
  Neutrals: [['Snow','#f7f3ed'],['Milky white','#e6ded9'],['Silver','#a8a9ae'],['Champagne','#c6ae7b'],['Gold','#b79952'],['Pearl','#e4ddd0'],['Stone','#b4a69b'],['Dove','#c7c2c0']],
};
const shades = Object.entries(families).flatMap(([family, list]) => list.map(([name, hex]) => ({family,name,hex})));
const fingerNames = ['Thumb','Index','Middle','Ring','Pinky'];
const shapes = ['Almond','Square','Coffin','Stiletto'];
const styles = ['Solid','French','Ombré','Glitter','Pearls','Micro French'];
const regions = [[.075,.40,.25,.67],[.27,.05,.42,.28],[.44,0,.58,.20],[.58,.05,.73,.28],[.73,.20,.90,.44]];
const rgb = hex => hex.match(/[a-f0-9]{2}/gi).map(s => parseInt(s,16));
const clamp = (v,a=0,b=1) => Math.max(a,Math.min(b,v));

export async function initNailLab(root, onChange) {
  const state = { color:'Rosewater',hex:'#d997a3', colors:Array(5).fill('#d997a3'),shape:'Almond',length:'Medium',finish:'Gloss',style:'Solid',skin:'Warm' };
  let activeFinger = -1, family='All', view='photo', zoom=false, image, source, masks=[], requestId=0, threeAPI, threeLoading;
  const cache = new Map();
  let mobileCanvas, mobileContext;
  const summary = () => `${state.color} ${state.hex.toUpperCase()} · ${state.shape} · ${state.length} · ${state.style} · ${state.finish} · ${state.skin} skin${new Set(state.colors).size>1?' · '+state.colors.map((hex,i)=>fingerNames[i]+' '+hex.toUpperCase()).join(', '):''}`;
  root.className = 'nail-lab photo-studio';
  root.removeAttribute('data-ui');
  root.innerHTML = `
    <div class="studio-preview">
      <div class="studio-view-tabs" role="group" aria-label="Preview view"><button type="button" data-view="photo" aria-pressed="true">Photo try-on</button><button type="button" data-view="three" aria-pressed="false">Rotate in 3D</button><button type="button" class="studio-zoom" aria-pressed="false">Zoom details</button></div>
      <div class="photo-frame"><canvas class="photo-canvas" role="img" aria-label="Photographic manicure preview with your selected design"></canvas><span class="photo-loading" role="status">Preparing your try-on…</span><div class="photo-tip">Select a nail to create an accent</div></div>
      <div class="three-preview" hidden><div class="nail-stage" tabindex="0" role="region" aria-label="Rotatable 3D hand shape study"><img class="nail-fallback" src="./assets/cherry-muse.webp" alt="Manicure inspiration"><span class="nail-drag-hint">Drag to rotate · Arrows to turn</span><div class="nail-view-controls"><button type="button" data-nail-view="spin" aria-pressed="false">Rotate</button><button type="button" data-nail-view="reset">Reset</button></div></div><p class="nail-current"></p><div class="nail-options"></div><span class="nail-status lookbook-sr-only"></span><button type="button" data-nail-view="save" hidden>Save</button></div>
      <div class="studio-preview-footer"><p class="studio-caption">Photographic hand · Digital shade preview</p><button type="button" class="studio-save">Save your look <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 4v16m-7-7 7 7 7-7"/></svg></button></div>
      <p class="studio-disclaimer">Colors on screen are a guide. Confirm polish, length, and art with Lisa.</p>
    </div>
    <div class="studio-controls">
      <div class="studio-control-heading"><h2>Your signature set.</h2><button type="button" class="studio-reset">Reset</button></div>
      <fieldset data-ui class="studio-target"><legend>Apply color to</legend><div class="studio-fingers">${['All nails',...fingerNames].map((name,i)=>`<button type="button" data-finger="${i-1}" aria-pressed="${i===0}">${name}</button>`).join('')}</div></fieldset>
      <fieldset data-ui class="studio-colors"><legend>Find your color <output class="studio-color-name">Rosewater</output></legend><div class="studio-families" role="group" aria-label="Shade families">${['All',...Object.keys(families)].map(name=>`<button type="button" data-family="${name}" aria-pressed="${name==='All'}">${name}</button>`).join('')}</div><div class="studio-palette" role="group" aria-label="64 digital nail shades"></div><div class="studio-custom"><label>Any color <input type="color" value="${state.hex}" aria-label="Custom nail color"></label><label class="studio-hex-label">Hex <input type="text" class="studio-hex" value="${state.hex}" maxlength="7" pattern="#[a-fA-F0-9]{6}" aria-label="Custom hex color" spellcheck="false"></label><span>64 shades + full spectrum</span></div></fieldset>
      ${[['Shape',shapes],['Length',['Short','Medium','Long']],['Style',styles],['Finish',['Gloss','Matte','Chrome','Sheer']]].map(([title,options])=>`<fieldset data-ui class="studio-choice"><legend>${title}</legend><div>${options.map(option=>`<button type="button" data-option="${title.toLowerCase()}" data-value="${option}" aria-pressed="${state[title.toLowerCase()]===option}">${option}</button>`).join('')}</div></fieldset>`).join('')}
      <fieldset data-ui class="studio-choice studio-skin"><legend>Skin tone</legend><div>${['Fair','Warm','Deep'].map(tone=>`<button type="button" data-option="skin" data-value="${tone}" aria-pressed="${tone==='Warm'}">${tone}</button>`).join('')}</div></fieldset>
      <div class="studio-selection" aria-live="polite"><p class="studio-selection-summary"></p></div><button type="button" class="studio-book button button-cherry" data-book data-custom-design>Plan this set <span aria-hidden="true"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M6 18 18 6M6 6h12v12"/></svg></span></button>
      <p class="studio-status lookbook-sr-only" role="status" aria-live="polite"></p>
    </div>`;
  const canvas=root.querySelector('.photo-canvas'), ctx=canvas.getContext('2d',{willReadFrequently:true});
  const loading=root.querySelector('.photo-loading'), status=root.querySelector('.studio-status');
  const controls=root.querySelector('.studio-controls');
  const palette=root.querySelector('.studio-palette');
  const threeRoot=root.querySelector('.three-preview');

  function paintPalette() {
    palette.innerHTML=shades.filter(shade=>family==='All'||shade.family===family).map(shade=>`<button type="button" class="studio-swatch" data-shade="${shade.name}" data-hex="${shade.hex}" style="--swatch:${shade.hex}" aria-label="${shade.name} ${shade.hex}" aria-pressed="${shade.hex===state.hex}" title="${shade.name}"><span></span></button>`).join('');
  }
  function chooseColor(hex,name) {
    state.hex=hex.toLowerCase();state.color=name||'Custom';
    if(activeFinger<0)state.colors.fill(state.hex);else state.colors[activeFinger]=state.hex;
    root.querySelector('input[type=color]').value=state.hex;
    root.querySelector('.studio-hex').value=state.hex;
    root.querySelector('.studio-hex').setCustomValidity('');
    root.querySelector('.studio-color-name').textContent=state.color;
    palette.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.hex===state.hex)));
    update();
  }
  function update() {
    controls.querySelectorAll('[data-option]').forEach(button=>button.setAttribute('aria-pressed',String(state[button.dataset.option]===button.dataset.value)));
    root.querySelector('.studio-selection-summary').textContent=summary();
    const d={...state,colors:[...state.colors],description:summary()};onChange?.(d);
    if(source)draw();
    if(threeAPI)threeAPI.setState({...state,finish:state.style.includes('French')?'French':state.style==='Pearls'?'Pearl':state.finish});
    status.textContent=`${summary()}. Preview updated.`;
  }
  async function loadPhoto() {
    const id=++requestId;
    loading.hidden=false;loading.textContent='Preparing your try-on…';
    const path=`./assets/tryon/${state.shape.toLowerCase()}${state.skin==='Warm'?'':'-'+state.skin.toLowerCase()}-lengths.jpg`;
    try {
      if(!cache.has(path))cache.set(path,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=path;}));
      image=await cache.get(path);
      if(id!==requestId)return;
      const column=['Short','Medium','Long'].indexOf(state.length);
      canvas.width=Math.round(image.naturalWidth/3);canvas.height=image.naturalHeight;
      ctx.drawImage(image,column*image.naturalWidth/3,0,image.naturalWidth/3,image.naturalHeight,0,0,canvas.width,canvas.height);
      source=ctx.getImageData(0,0,canvas.width,canvas.height);
      masks=findNails(source);loading.hidden=true;draw();
      if(masks.some(mask=>mask.pixels.length<100))status.textContent='Some nail details are still loading. Try another shape.';
    } catch {
      if(id!==requestId)return;
      loading.textContent='This shape preview could not load. Refresh to try again.';
      status.textContent='Photo preview unavailable. You can use the 3D shape view or keep selecting your design.';
    }
  }

  // Segment the neutral lacquer inside five constrained nail windows. Skin and
  // fabric stay photographic; only lacquer pixels receive the selected color.
  function findNails(data) {
    const w=data.width,h=data.height,p=data.data;
    return regions.map((box,finger)=>{
      const [x0,y0,x1,y1]=box.map((n,i)=>Math.round(n*(i%2?h:w)));
      const rw=x1-x0,rh=y1-y0,visited=new Uint8Array(rw*rh);let largest=[];
      const isPolish=(x,y)=>{const i=(y*w+x)*4,r=p[i],g=p[i+1],b=p[i+2];return r-b<40&&r-g<27&&Math.max(r,g,b)-Math.min(r,g,b)<43&&r>40;};
      for(let yy=y0;yy<y1;yy++)for(let xx=x0;xx<x1;xx++){
        let k=(yy-y0)*rw+xx-x0;if(visited[k]||!isPolish(xx,yy))continue;
        const queue=[[xx,yy]],component=[];visited[k]=1;
        for(let q=0;q<queue.length;q++){
          const [x,y]=queue[q];component.push(y*w+x);
          for(const [nx,ny]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
            if(nx<x0||nx>=x1||ny<y0||ny>=y1)continue;
            k=(ny-y0)*rw+nx-x0;if(!visited[k]&&isPolish(nx,ny)){visited[k]=1;queue.push([nx,ny]);}
          }
        }
        if(component.length>largest.length)largest=component;
      }
      let minX=w,minY=h,maxX=0,maxY=0;
      largest.forEach(index=>{const x=index%w,y=Math.floor(index/w);minX=Math.min(minX,x);maxX=Math.max(maxX,x);minY=Math.min(minY,y);maxY=Math.max(maxY,y);});
      return {pixels:largest,minX,minY,maxX,maxY,finger};
    });
  }

  function draw() {
    const out=new ImageData(new Uint8ClampedArray(source.data),source.width,source.height),p=out.data,original=source.data,w=source.width;
    masks.forEach((mask,finger)=>{
      const chosen=rgb(state.colors[finger]),nude=[219,171,158],mw=Math.max(1,mask.maxX-mask.minX),mh=Math.max(1,mask.maxY-mask.minY);
      mask.pixels.forEach(index=>{
        const i=index*4,x=index%w,y=Math.floor(index/w),u=(x-mask.minX)/mw,v=1-(y-mask.minY)/mh;
        const luma=(original[i]+original[i+1]+original[i+2])/3;
        let base=chosen;
        if(state.style.includes('French')){
          const line=state.style==='Micro French'?.91:.76;
          const tip=v>line-.09*Math.pow((u-.5)*2,2);
          base=tip?chosen:nude;
        }else if(state.style==='Ombré'){
          const mix=clamp((v-.12)/.75);base=nude.map((c,k)=>c*(1-mix)+chosen[k]*mix);
        }
        let shade=clamp(luma/165,.35,1.24),spec=Math.pow(clamp((luma-188)/65),1.3)*.88;
        if(state.finish==='Matte'){shade=.83+clamp(luma/220)*.24;spec=0;}
        if(state.finish==='Chrome'){shade=.32+Math.pow(Math.abs(Math.cos(u*6.4+v*.7)),1.6)*1.15;spec=Math.pow(clamp((luma-160)/80),1.1)*.65;}
        if(state.finish==='Sheer')base=base.map((c,k)=>c*.6+nude[k]*.4);
        for(let k=0;k<3;k++)p[i+k]=clamp(base[k]*shade*(1-spec)+255*spec,0,255);
        if(state.style==='Glitter'){
          const seed=Math.sin(x*127.1+y*311.7)*43758.5453;
          if(seed-Math.floor(seed)>.95){const glint=(seed-Math.floor(seed)-.95)*20;for(let k=0;k<3;k++)p[i+k]=p[i+k]*(1-glint)+255*glint;}
        }
      });
    });
    ctx.putImageData(out,0,0);
    if(state.style==='Pearls')masks.forEach(mask=>{
      const r=Math.max(2,(mask.maxX-mask.minX)*.055);
      for(let i=0;i<3;i++){const x=mask.minX+(mask.maxX-mask.minX)*(.3+i*.2),y=mask.maxY-r*2-Math.abs(i-1)*r;const gradient=ctx.createRadialGradient(x-r*.3,y-r*.4,r*.1,x,y,r);gradient.addColorStop(0,'#ffffff');gradient.addColorStop(.6,'#f5ead5');gradient.addColorStop(1,'#aa8c72');ctx.fillStyle=gradient;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();}
    });
    if(mobileContext){mobileContext.clearRect(0,0,180,180);mobileContext.drawImage(canvas,0,0,180,180);}
    canvas.setAttribute('aria-label',`Photographic manicure try-on: ${summary()}`);
  }

  controls.addEventListener('click',event=>{
    const shade=event.target.closest('[data-shade]');if(shade){chooseColor(shade.dataset.hex,shade.dataset.shade);return;}
    const f=event.target.closest('[data-family]');if(f){family=f.dataset.family;controls.querySelectorAll('[data-family]').forEach(b=>b.setAttribute('aria-pressed',String(b===f)));paintPalette();return;}
    const finger=event.target.closest('[data-finger]');if(finger){selectFinger(Number(finger.dataset.finger));return;}
    const button=event.target.closest('[data-option]');if(!button)return;
    state[button.dataset.option]=button.dataset.value;update();
    if(['shape','length','skin'].includes(button.dataset.option))loadPhoto();
  });
  function selectFinger(index){activeFinger=index;controls.querySelectorAll('[data-finger]').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.finger)===index)));root.querySelector('.photo-tip').textContent=index<0?'Color applies to all nails':`${fingerNames[index]} selected · Choose its color`;}
  canvas.addEventListener('click',event=>{const box=canvas.getBoundingClientRect(),x=(event.clientX-box.left)/box.width*canvas.width,y=(event.clientY-box.top)/box.height*canvas.height;const match=masks.find(m=>x>=m.minX&&x<=m.maxX&&y>=m.minY&&y<=m.maxY);if(match)selectFinger(match.finger);});
  root.querySelector('input[type=color]').addEventListener('input',event=>chooseColor(event.target.value,'Custom'));
  root.querySelector('.studio-hex').addEventListener('change',event=>{const hex=event.target.value.trim();if(/^#[a-f\d]{6}$/i.test(hex))chooseColor(hex,'Custom');else {event.target.setCustomValidity('Use a six-digit hex color such as #D997A3.');event.target.reportValidity();}});
  root.querySelector('.studio-reset').addEventListener('click',()=>{Object.assign(state,{shape:'Almond',length:'Medium',finish:'Gloss',style:'Solid',skin:'Warm'});selectFinger(-1);chooseColor('#d997a3','Rosewater');loadPhoto();});
  root.querySelector('.studio-zoom').addEventListener('click',event=>{zoom=!zoom;root.querySelector('.photo-frame').classList.toggle('is-zoomed',zoom);event.target.setAttribute('aria-pressed',String(zoom));event.target.textContent=zoom?'Full hand':'Zoom details';});
  root.querySelectorAll('[data-view]').forEach(button=>button.addEventListener('click',async()=>{
    view=button.dataset.view;root.querySelectorAll('[data-view]').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));
    root.querySelector('.photo-frame').hidden=view!=='photo';threeRoot.hidden=view!=='three';root.querySelector('.studio-zoom').hidden=view!=='photo';
    root.querySelector('.studio-caption').textContent=view==='photo'?'Photographic hand · Digital shade preview':'3D shape study · Drag to rotate';
    if(view==='three'){
      if(!threeLoading)threeLoading=initSculpture(threeRoot).then(api=>{threeAPI=api;update();}).catch(()=>{status.textContent='3D could not load. Use the photo try-on to keep designing.';});
      await threeLoading;
    }
  }));
  const mini=document.createElement('button');
  mini.type='button';mini.className='studio-mini';mini.hidden=true;mini.setAttribute('aria-label','View your updated manicure');
  mini.innerHTML='<canvas aria-hidden="true"></canvas><span>View your set <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 20V4m-7 7 7-7 7 7"/></svg></span>';
  controls.prepend(mini);mobileCanvas=mini.querySelector('canvas');mobileCanvas.width=180;mobileCanvas.height=180;mobileContext=mobileCanvas.getContext('2d');
  mini.addEventListener('click',()=>root.querySelector('.studio-preview').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'}));
  mini.hidden=false;
  const exportDialog=document.createElement('dialog');exportDialog.className='studio-export';exportDialog.setAttribute('aria-label','Save your nail design');
  exportDialog.innerHTML='<button type="button" class="export-close" aria-label="Close saved design"><svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="m6 6 12 12M18 6 6 18"/></svg></button><h2>Your look.</h2><img alt="Your customized NAILS BY LISA manicure"><a class="button button-cherry" download="nails-by-lisa-my-look.png">Download PNG <svg class="ui-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path d="M12 4v16m-7-7 7 7 7-7"/></svg></a><p>Save this image to share with Lisa.</p>';
  root.append(exportDialog);exportDialog.querySelector('.export-close').addEventListener('click',()=>exportDialog.close());
  root.querySelector('.studio-save').addEventListener('click',()=>{if(!source)return;exportDialog.querySelector('img').src=canvas.toDataURL('image/png');exportDialog.querySelector('a').href=canvas.toDataURL('image/png');exportDialog.showModal();});
  paintPalette();update();await loadPhoto();return {getState:()=>({...state,description:summary()})};
}
