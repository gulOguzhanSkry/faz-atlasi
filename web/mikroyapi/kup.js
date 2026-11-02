/* SPDX-License-Identifier: MIT — on-demand Three.js inspector. */
import * as THREE from '../vendor/three/three.module.min.js';
import {OrbitControls} from '../vendor/three/OrbitControls.js';
import {createModel,PHASE_COLORS,CONSTITUENT_COLORS} from './model.js';
import {renderSlice,saveSlicePNG,registerSliceTranslations} from './kesit2d.js?v=1.2.2';
import {drawAtomicPhase,drawAtomicLesson,LESSON_COLORS} from './atom.js';
import {phaseCrystal,cellShareCount,packingFraction,coordinationNumber,interstitialSummary,radiiAngstrom,CARBON_RADIUS_ANGSTROM} from './kristal-yapilar.js';
import {lessonSteps} from './atom-dersleri.js';
import {carbonPopulation} from './karbon-yerlesimi.js';

export function mountCube(host,api){
 if(api.register)registerSliceTranslations(api.register);
 const {t,lang,sourceData}=api,get=selector=>host.querySelector(selector),viewport=get('[data-kup-viewport]'),canvas=get('[data-kup-slice]'),summary=get('[data-kup-summary]');
 const reduced=matchMedia('(prefers-reduced-motion: reduce)'),abort=new AbortController(),on=(node,type,fn)=>node.addEventListener(type,fn,{signal:abort.signal});
 let destroyed=false,isOpen=true,raf=0,drawRaf=0,playRaf=0,lastTick=0,playDirection=0,depth=1,axis='z',mode='phases',atomic=false,quality='fine',surface=192;
 let lessonStep='lattice',frontCamera=false;
 let current=api.getState(),stateKey=null,painted=false,model=createModel({quality,eutectoidTemperature:sourceData.invariants.otektoid.T,invariants:sourceData.invariants}),renderer=null,controls=null,scene=null,camera=null,group=null;
 try{
   renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});renderer.localClippingEnabled=true;renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));renderer.setClearColor(0,0);
   renderer.domElement.setAttribute('role','img');renderer.domElement.setAttribute('aria-label',t('kup.title'));viewport.append(renderer.domElement);
   scene=new THREE.Scene();camera=new THREE.PerspectiveCamera(38,1,.05,30);camera.position.set(1.8,1.45,1.8);
   controls=new OrbitControls(camera,renderer.domElement);controls.enablePan=false;controls.enableDamping=false;controls.minDistance=1.4;controls.maxDistance=6;
   group=new THREE.Group();scene.add(group);scene.add(new THREE.HemisphereLight(0xffffff,0x62767e,2.8));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(3,5,4);scene.add(light);
   controls.addEventListener('change',requestDraw);
 }catch(error){console.warn('WebGL fallback',error);summary.textContent=t('kup.webgl');viewport.hidden=true;host.classList.add('kup-no-webgl');}
 const clearGroup=()=>{
   if(!group)return;
   for(const child of [...group.children]){child.traverse(node=>{node.geometry?.dispose();const materials=Array.isArray(node.material)?node.material:node.material?[node.material]:[];for(const material of materials){material.map?.dispose();material.dispose();}});group.remove(child);}
 };
 function requestDraw(){if(!drawRaf&&!destroyed&&renderer)drawRaf=requestAnimationFrame(()=>{drawRaf=0;if(document.visibilityState!=='hidden')renderer.render(scene,camera);});}
 function resize(){if(!renderer||destroyed)return;const rect=renderer.domElement.parentElement.getBoundingClientRect(),width=Math.max(1,rect.width),height=Math.max(1,rect.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();requestDraw();}
 const world=p=>[p[0]-.5,p[2]-.5,.5-p[1]];
 const point=(a,c,u,v)=>a==='x'?[c,u,v]:a==='y'?[u,c,v]:[u,v,c];
 function face(a,c,uMax,vMax){
   const textureCanvas=document.createElement('canvas');
   renderSlice(textureCanvas,model,{axis:a,depth:c,resolution:surface,extent:{u:uMax,v:vMax},mode,magnification:'low',effects:false,info:false,lang});
   const texture=new THREE.CanvasTexture(textureCanvas);texture.colorSpace=THREE.SRGBColorSpace;texture.flipY=false;texture.minFilter=THREE.LinearFilter;texture.generateMipmaps=false;
   const corners=[point(a,c,0,0),point(a,c,uMax,0),point(a,c,uMax,vMax),point(a,c,0,vMax)];
   const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(corners.flatMap(world),3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute([0,0,1,0,1,1,0,1],2));geometry.setIndex([0,1,2,0,2,3]);geometry.computeVertexNormals();
   const material=new THREE.MeshStandardMaterial({map:texture,side:THREE.DoubleSide,metalness:.03,roughness:.94});group.add(new THREE.Mesh(geometry,material));
 }
 const fmt=(v,d=3)=>v.toLocaleString(lang,{maximumFractionDigits:d,useGrouping:false});
 const el=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
 const chip=(color,label)=>{const p=el('p','kup-lesson-chip');const i=el('i');i.style.background=color;p.append(i,el('span','',label));return p;};
 /** Lesson strip: one button per step, arrow keys move between steps. */
 function lessonStrip(steps,active){
   const strip=get('[data-kup-lesson]');strip.replaceChildren();
   steps.forEach((step,i)=>{const b=el('button','',(i+1)+' · '+t('kup.lesson.'+step.id+'.short'));b.type='button';b.dataset.step=step.id;b.setAttribute('aria-pressed',String(step.id===active.id));b.tabIndex=step.id===active.id?0:-1;strip.append(b);});
 }
 /** Card text: every number is computed from the reference geometry or the source invariants. */
 function lessonCard(step,reference){
   const card=get('[data-kup-lesson-card]');card.replaceChildren();
   const steps=lessonSteps(reference.code),index=steps.findIndex(s=>s.id===step.id);
   card.append(el('p','kup-eyebrow',t('kup.lesson.label')+' · '+(index+1)+'/'+steps.length),el('h3','',t(step.titleKey)));
   if(step.badges.length){const row=el('div','kup-badges');for(const b of step.badges)row.append(el('span','kup-badge kup-badge-'+b,t('kup.badge.'+b)));card.append(row);}
   card.append(el('p','kup-lesson-body',t(step.bodyKey)));
   const facts=el('div','kup-facts'),code=reference.code;
   if(step.id==='lattice'&&coordinationNumber(reference))facts.append(el('p','',t('kup.fact.system',{system:reference.system,cn:coordinationNumber(reference)})));
   if(step.id==='cell'){
     const rows=cellShareCount(reference),fe=rows.find(r=>r.element==='Fe'),c=rows.find(r=>r.element==='C');
     if(code==='C')facts.append(el('p','kup-formula',t('kup.fact.cementite',{fe:fmt(fe.total),c:fmt(c.total),units:fmt(c.total)})));
     else{
       const order=['corner','edge','face','body'],terms=order.filter(k=>fe.byClass[k]).map(k=>t('kup.fact.'+k,{n:fe.byClass[k]}));
       facts.append(el('p','kup-formula',terms.join(' + ')+' '+t('kup.fact.count',{total:fmt(fe.total)})));
       for(const k of order)if(fe.byClass[k])facts.append(chip(LESSON_COLORS[k],t('kup.fact.'+k,{n:fe.byClass[k]})));
       const apf=packingFraction(reference);facts.append(el('p','',t('kup.fact.apf',{apf:fmt(apf,2),pct:fmt(apf*100,0)})));
     }
   }
   if(step.id==='interstices'){
     const sum=interstitialSummary(reference),o=sum.find(x=>x.kind==='octa'),tt=sum.find(x=>x.kind==='tetra');
     facts.append(el('p','',t('kup.fact.holes',{octa:o.perCell,tetra:tt.perCell})),el('p','kup-formula',t('kup.fact.ratios',{ro:fmt(o.ratio),rt:fmt(tt.ratio)})));
     facts.append(chip(LESSON_COLORS.octa,t('kup.legend.octa')),chip(LESSON_COLORS.tetra,t('kup.legend.tetra')),chip(LESSON_COLORS.carbon,t('kup.legend.carbon')));
     if(step.view.neighbours)facts.append(el('p','',t('kup.fact.neighbours')));
   }
   if(step.id==='compare'){
     const g=radiiAngstrom('G'),a=radiiAngstrom('A'),inv=sourceData.invariants,table=el('table','kup-compare');
     const pct=(v,d)=>lang==='tr'?'%'+fmt(v,d):fmt(v,d)+' wt%';
     const head=el('tr');head.append(el('th',''),el('th','',t('kup.G')),el('th','',t('kup.A')));table.append(head);
     const row=(label,x,y)=>{const r=el('tr');r.append(el('th','',label),el('td','',x),el('td','',y));table.append(r);};
     row(t('kup.cmp.a'),fmt(g.a)+' Å',fmt(a.a)+' Å');row(t('kup.cmp.octa'),fmt(g.octa,2)+' Å',fmt(a.octa,2)+' Å');row(t('kup.cmp.tetra'),fmt(g.tetra,2)+' Å',fmt(a.tetra,2)+' Å');
     row(t('kup.cmp.carbon'),'≈ '+fmt(CARBON_RADIUS_ANGSTROM,2)+' Å','≈ '+fmt(CARBON_RADIUS_ANGSTROM,2)+' Å');
     row(t('kup.cmp.max'),pct(inv.otektik.G,2)+' · '+fmt(inv.otektik.T,0)+' °C',pct(inv.otektoid.A,3)+' · '+fmt(inv.otektoid.T,0)+' °C');
     facts.append(table,el('p','kup-conclusion',t('kup.cmp.conclusion',{ratio:fmt(g.octa/a.octa,1),g:fmt(inv.otektik.G,2),a:fmt(inv.otektoid.A,3)})),el('p','kup-note',t('kup.cmp.source')));
   }
   card.append(facts);
   const nav=el('div','kup-lesson-nav'),prev=el('button','',t('kup.lesson.prev')),next=el('button','',t('kup.lesson.next'));prev.type=next.type='button';
   prev.disabled=index<=0;next.disabled=index>=steps.length-1;prev.dataset.go=String(index-1);next.dataset.go=String(index+1);nav.append(prev,next);card.append(nav);
 }
 function crystal(){
   const code=get('[data-kup-phase]').value,reference=phaseCrystal(code),present=current?.result?.status==='resolved'?current.result.phases.find(p=>p.f===code&&p.oran>0):null;
   const steps=lessonSteps(code),step=steps.find(s=>s.id===lessonStep)??steps[0];lessonStep=step.id;lessonStrip(steps,step);
   get('[data-kup-free-controls]').hidden=Boolean(step.view);
   const card=get('[data-kup-lesson-card]');card.hidden=!step.view;
   if(step.view){
     // Compare places γ and α side by side: look at them from the front once, then the visitor may orbit.
     const wantFront=step.view.compare;if(camera&&wantFront!==frontCamera){frontCamera=wantFront;if(wantFront)camera.position.set(0,.75,3.1);else camera.position.set(1.8,1.45,1.8);controls.target.set(0,0,0);controls.update();}
     if(group)drawAtomicLesson(group,reference,step.view);
     lessonCard(step,reference);
     get('[data-kup-atom-description]').textContent=t('kup.'+code)+' · '+t(present?'kup.atomPresent':'kup.atomAbsent');
     get('[data-kup-atom-counts]').textContent='';get('[data-kup-atom-source]').href=reference.source;
     return;
   }
   let repeat=get('[data-kup-repeat]').value,population;
   if(present&&['A','D','G'].includes(code))population=carbonPopulation(reference,present.w,repeat==='auto'?'auto':Number(repeat));
   repeat=population?.repetitions||(repeat==='auto'?1:Number(repeat));
   if(group)drawAtomicPhase(group,reference,repeat,get('[data-kup-carbon]').checked,get('[data-kup-holes]').checked,get('[data-kup-neighbours]').checked,population,get('[data-kup-volumes]').checked,get('[data-kup-compact]').checked);
   get('[data-kup-atom-description]').textContent=t('kup.'+code)+' · '+t('kup.atom.'+code)+' '+t(present?'kup.atomPresent':'kup.atomAbsent');
   get('[data-kup-atom-counts]').textContent=population?t('kup.atomCounts',{fe:population.ironCount,c:population.carbonCount,target:population.targetWtPercent.toLocaleString(lang,{maximumSignificantDigits:4}),represented:population.representedWtPercent.toLocaleString(lang,{maximumSignificantDigits:4})}):code==='C'?`${12*repeat**3} Fe + ${4*repeat**3} C · ${repeat}³`:t('kup.atomScope');
   get('[data-kup-atom-source]').href=reference.source;
   get('[data-kup-repeat]').disabled=!reference.periodic;
   for(const name of ['holes','neighbours','volumes'])get('[data-kup-'+name+']').disabled=!reference.periodic||code==='C'&&name==='holes';
 }
 function paintSection(){
   const result=renderSlice(canvas,model,{axis,depth,resolution:surface,mode:get('[data-kup-section-mode]').value,magnification:get('[data-kup-magnification]').value,effects:get('[data-kup-effects]').checked,info:false,lang,carbon:current.carbon,temperature:current.temperature,eutectoidTemperature:sourceData.invariants.otektoid.T});
   get('[data-kup-section-warning]').textContent=result.warning||'';
   const caption=get('[data-kup-section-caption]');if(caption)caption.textContent=`C ${current.carbon?.toLocaleString(lang,{maximumFractionDigits:3})} ${lang==='tr'?'ağ.%':'wt%'} · ${current.temperature?.toLocaleString(lang,{maximumFractionDigits:1})} °C · ${t('kup.scope')}`;
 }
 function legend(){
   const holder=get('[data-kup-legend]');holder.replaceChildren();
   if(current?.result?.status!=='resolved')return;
   const entries=mode==='constituents'?current.result.parts.map(p=>({id:p.id,value:p.fraction,label:t('bilesen.part.'+p.id),color:CONSTITUENT_COLORS[p.id]})):current.result.phases.map(p=>({id:p.f,value:p.oran,label:t('kup.'+p.f),color:PHASE_COLORS[p.f]}));
   if(mode==='grains'){const p=document.createElement('p');p.textContent=t('kup.grains')+' · '+model.config.grains;holder.append(p);return;}
   for(const entry of entries){const row=document.createElement('p'),dot=document.createElement('i'),label=document.createElement('span'),value=document.createElement('b');dot.style.background=entry.color;label.textContent=entry.label;value.textContent=(entry.value*100).toLocaleString(lang,{maximumFractionDigits:2})+'%';row.append(dot,label,value);holder.append(row);}
 }
 function refresh(){
   raf=0;if(destroyed)return;painted=true;clearGroup();
   const valid=current?.binary&&current?.result?.status==='resolved'&&model.valid;
   get('[data-kup-point]').textContent=`C ${current.carbon?.toLocaleString(lang,{maximumFractionDigits:4})} ${lang==='tr'?'ağ.%':'wt%'} · ${current.temperature?.toLocaleString(lang,{maximumFractionDigits:2})} °C`;
   get('[data-kup-temperature]').value=Number(current.temperature?.toFixed(4));
   summary.textContent=!current.binary?t('kup.alloy'):!valid?t('kup.unavailable'):!renderer?t('kup.webgl'):reduced.matches?t('kup.reduced')+' '+t('kup.scope'):t('kup.scope');
   get('[data-kup-depth-value]').textContent=depth.toLocaleString(lang,{minimumFractionDigits:2,maximumFractionDigits:2});
   if(!valid){paintSection();requestDraw();return;}
   if(atomic)crystal();
   else if(group){
     const extent={x:1,y:1,z:1};extent[axis]=depth;
     face('x',0,extent.y,extent.z);face('x',extent.x,extent.y,extent.z);face('y',0,extent.x,extent.z);face('y',extent.y,extent.x,extent.z);face('z',0,extent.x,extent.y);face('z',extent.z,extent.x,extent.y);
     const box=new THREE.BoxGeometry(extent.x,extent.z,extent.y),edge=new THREE.EdgesGeometry(box);box.dispose();const outline=new THREE.LineSegments(edge,new THREE.LineBasicMaterial({color:0x42535a,transparent:true,opacity:.6}));outline.position.set((extent.x-1)/2,(extent.z-1)/2,(1-extent.y)/2);group.add(outline);
   }
   paintSection();legend();requestDraw();
 }
 function schedule(){if(!raf&&!destroyed)raf=requestAnimationFrame(refresh);}
 function setState(next){
   if(destroyed)return;
   // A KANCA redraw or open/minimise does not constitute a new physical state.
   // Compare the meaningful source inventory instead of object identity: source
   // panels may allocate fresh result objects for an unchanged C/T/ξ selection.
   const key=JSON.stringify({binary:next.binary,carbon:next.carbon,temperature:next.temperature,result:next.result?{status:next.result.status,basis:next.result.basis,event:next.result.event,xi:next.result.xi,phases:next.result.phases,parts:next.result.parts}:null});
   current=next;
   if(key===stateKey){requestDraw();return;}
   stateKey=key;model.setState(next.binary?next.result:null,next.carbon,next.temperature);schedule();
 }
 function stop(){playDirection=0;cancelAnimationFrame(playRaf);playRaf=0;}
 function play(direction){
   stop();if(reduced.matches||!current.binary||current.result?.status!=='resolved')return;
   playDirection=direction;lastTick=0;
   const boundaries=api.boundaries(current.carbon).filter(Number.isFinite),now=current.temperature;
   const limits=direction>0?boundaries.filter(T=>T>now+1e-6).sort((a,b)=>a-b):boundaries.filter(T=>T<now-1e-6).sort((a,b)=>b-a);
   const target=limits[0]??(direction>0?sourceData.meta.T_max:sourceData.meta.T_min);
   function tick(time){
     if(destroyed||!isOpen||reduced.matches||!playDirection||document.visibilityState==='hidden'){stop();return;}
     if(!lastTick||time-lastTick>=70){lastTick=time;const T=current.temperature+playDirection*2,next=direction>0?Math.min(T,target):Math.max(T,target);api.selectTemperature(next);if(next===target){stop();summary.textContent=t('kup.atBoundary');return;}}
     playRaf=requestAnimationFrame(tick);
   }
   playRaf=requestAnimationFrame(tick);
 }
 on(get('[data-kup-scale]'),'change',()=>{atomic=get('[data-kup-scale]').value==='atomic';get('[data-kup-volume-controls]').hidden=atomic;get('[data-kup-atomic-controls]').hidden=!atomic;get('[data-kup-section-view]').hidden=atomic;if(!atomic)get('[data-kup-lesson-card]').hidden=true;schedule();});
 const goLesson=id=>{if(!id||id===lessonStep)return;lessonStep=id;schedule();requestAnimationFrame(()=>get(`[data-kup-lesson] [data-step="${id}"]`)?.focus());};
 on(get('[data-kup-lesson]'),'click',event=>goLesson(event.target.closest('button')?.dataset.step));
 on(get('[data-kup-lesson]'),'keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;const steps=lessonSteps(get('[data-kup-phase]').value),i=steps.findIndex(s=>s.id===lessonStep),j=Math.min(steps.length-1,Math.max(0,i+(event.key==='ArrowRight'?1:-1)));event.preventDefault();goLesson(steps[j].id);});
 on(get('[data-kup-lesson-card]'),'click',event=>{const b=event.target.closest('button[data-go]');if(!b)return;const steps=lessonSteps(get('[data-kup-phase]').value);goLesson(steps[Number(b.dataset.go)]?.id);});
 on(get('[data-kup-colors]'),'change',()=>{mode=get('[data-kup-colors]').value;schedule();});
 on(get('[data-kup-quality]'),'change',()=>{quality=get('[data-kup-quality]').value;summary.textContent=t('kup.resize');model=createModel({quality,eutectoidTemperature:sourceData.invariants.otektoid.T,invariants:sourceData.invariants});surface=model.config.surface;stateKey=null;setState(current);});
 on(get('[data-kup-depth]'),'input',()=>{depth=Number(get('[data-kup-depth]').value);schedule();});
 for(const input of host.querySelectorAll('input[name=kupAxis]'))on(input,'change',()=>{axis=input.value;schedule();});
 for(const name of ['phase','repeat','carbon','holes','neighbours','volumes','compact'])on(get('[data-kup-'+name+']'),'change',schedule);
 for(const name of ['section-mode','magnification','effects'])on(get('[data-kup-'+name+']'),'change',paintSection);
 for(const button of host.querySelectorAll('[data-kup-camera]'))on(button,'click',()=>{if(!camera)return;const action=button.dataset.kupCamera;if(action==='reset'){camera.position.set(1.8,1.45,1.8);controls.target.set(0,0,0);}else if(action==='left'||action==='right')camera.position.applyAxisAngle(new THREE.Vector3(0,1,0),action==='left'?-.3:.3);else camera.position.multiplyScalar(action==='in'?.85:1.15);controls.update();requestDraw();});
 for(const button of host.querySelectorAll('[data-kup-play]'))on(button,'click',()=>button.dataset.kupPlay==='stop'?stop():play(button.dataset.kupPlay==='heat'?1:-1));
 function updateMotion(){if(reduced.matches)stop();for(const button of host.querySelectorAll('[data-kup-play]'))if(button.dataset.kupPlay!=='stop')button.disabled=reduced.matches;if(reduced.matches)summary.textContent=t('kup.reduced');}
 on(reduced,'change',updateMotion);updateMotion();
 on(get('[data-kup-temperature]'),'change',()=>{stop();api.selectTemperature(Number(get('[data-kup-temperature]').value));});
 on(get('[data-kup-export]'),'click',()=>{
   const output=document.createElement('canvas');
   renderSlice(output,model,{axis,depth,resolution:512,mode:get('[data-kup-section-mode]').value,magnification:get('[data-kup-magnification]').value,effects:get('[data-kup-effects]').checked,info:true,lang,carbon:current.carbon,temperature:current.temperature,eutectoidTemperature:sourceData.invariants.otektoid.T});
   saveSlicePNG(output,`faz-atlasi-${current.carbon}-${current.temperature}-${axis}-${depth.toFixed(2)}.png`);
 });
 const full=get('[data-kup-full]');if(!host.requestFullscreen)full.hidden=true;on(full,'click',()=>{const request=document.fullscreenElement===host?document.exitFullscreen():host.requestFullscreen();request?.catch(()=>{});});
 on(document,'fullscreenchange',()=>{full.textContent=t(document.fullscreenElement===host?'kup.exitfull':'kup.full');resize();});
 on(window,'resize',resize);on(document,'visibilitychange',()=>{if(document.visibilityState==='hidden')stop();else requestDraw();});
 if(renderer){on(renderer.domElement,'webglcontextlost',event=>{event.preventDefault();stop();summary.textContent=t('kup.webgl');host.classList.add('kup-no-webgl');});on(renderer.domElement,'webglcontextrestored',()=>{host.classList.remove('kup-no-webgl');schedule();});}
 const observer=new ResizeObserver(resize);observer.observe(viewport);
 function dispose(){if(destroyed)return;destroyed=true;stop();cancelAnimationFrame(raf);cancelAnimationFrame(drawRaf);abort.abort();observer.disconnect();controls?.removeEventListener('change',requestDraw);controls?.dispose();clearGroup();renderer?.dispose();renderer?.domElement.remove();}
 on(window,'pagehide',event=>{if(!event.persisted)dispose();});
 function open(){isOpen=true;if(renderer)viewport.append(renderer.domElement);resize();if(!painted)schedule();else requestDraw();}
 function close(){isOpen=false;stop();if(document.fullscreenElement===host)void document.exitFullscreen().catch(()=>{});}
 function dock(container){if(renderer){container.replaceChildren(renderer.domElement);resize();requestDraw();}}
 setState(current);resize();
 return {setState,open,close,dock,resize,dispose,get model(){return model;},get renderer(){return renderer;},get destroyed(){return destroyed;},get playing(){return Boolean(playDirection);},get depth(){return depth;},get quality(){return quality;},get surface(){return surface;},get axis(){return axis;},get colorMode(){return mode;},get camera(){return camera;}};
}
