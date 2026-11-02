/* SPDX-License-Identifier: MIT — OG mobile infinite diagram workspace.
 * Extends the existing source plot without changing its solver or app.js.
 */
'use strict';
globalThis.FazCalismaAlani=(()=>{
 function createController({width=1120,height=720,viewportWidth=375,viewportHeight=500}={}){
   const state={x:0,y:0,zoom:1,mode:'pan',locked:false,width,height,viewportWidth,viewportHeight};
   const clampZoom=z=>Math.min(3,Math.max(.2,z));
   function pan(dx,dy){if(state.locked)return;state.x+=dx;state.y+=dy;}
   function zoomAt(factor,px=state.viewportWidth/2,py=state.viewportHeight/2){
     if(state.locked)return;
     const next=clampZoom(state.zoom*factor),ratio=next/state.zoom;
     state.x=px-(px-state.x)*ratio;state.y=py-(py-state.y)*ratio;state.zoom=next;
   }
   function fit(){if(state.locked)return;state.zoom=clampZoom(Math.min(state.viewportWidth/state.width,state.viewportHeight/state.height)*.95);state.x=(state.viewportWidth-state.width*state.zoom)/2;state.y=(state.viewportHeight-state.height*state.zoom)/2;}
   function reset(){if(state.locked)return;state.zoom=1;state.x=0;state.y=0;}
   function resize(width,height){state.viewportWidth=width;state.viewportHeight=height;}
   return {state,pan,zoomAt,fit,reset,resize,toPlot:(px,py)=>({px:(px-state.x)/state.zoom,py:(py-state.y)/state.zoom})};
 }
 function mount(){
   if(typeof document==='undefined'||typeof KANCA==='undefined'||typeof svgNokta!=='function')return null;
   const plot=document.getElementById('cizim');if(!plot||plot.parentElement.classList.contains('ca-stage'))return null;
   sozlukEkle({
     'ca.title':['Geniş diyagram çalışma alanı','Wide diagram workspace'],
     'ca.pan':['Gezin','Pan'],
     'ca.select':['Nokta seç','Select point'],
     'ca.lock':['Görünümü kilitle','Lock view'],
     'ca.unlock':['Kilidi aç','Unlock view'],
     'ca.in':['Yakınlaştır +','Zoom in +'],
     'ca.out':['Uzaklaştır −','Zoom out −'],
     'ca.reset':['1:1 görünüm','1:1 view'],
     'ca.fit':['Diyagramı sığdır','Fit diagram'],
     'ca.left':['Sola git','Move left'],'ca.right':['Sağa git','Move right'],
     'ca.up':['Yukarı git','Move up'],'ca.down':['Aşağı git','Move down'],
     'ca.helpPan':['Gezin: tek parmakla sürükle, iki parmakla yakınlaştır. Alanın içinde her yöne ilerleyebilirsin. Nokta değiştirmek için “Nokta seç”e geç.','Pan: drag with one finger, pinch with two. Move freely in every direction. Switch to “Select point” to change the diagram point.'],
     'ca.helpSelect':['Nokta seç: diyagrama dokunarak seçimi değiştir. Görünümü taşımak için “Gezin”e geç. Yakınlaştırmada da seçim koordinatları korunur.','Select point: tap the diagram to change the selection. Switch to “Pan” to move the view. Selection coordinates remain correct when zoomed.'],
     'ca.helpLocked':['Görünüm kilitli: taşıma ve yakınlaştırma kapalı. “Nokta seç” modunda ölçüm noktası seçilebilir.','View locked: panning and zooming are disabled. The measurement point remains selectable in “Select point” mode.'],
     'ca.keyboard':['Klavye: alana odaklanınca oklarla gezin, +/− yakınlaştır, 0 sıfırla. Diyagramın kendisi odaktayken oklar noktayı değiştirir.','Keyboard: focus the workspace to pan with arrows, zoom with +/−, reset with 0. When the diagram itself is focused, arrows change the selected point.'],
   });
   const outer=document.createElement('div');outer.className='ca-workspace';
   const tools=document.createElement('div');tools.className='ca-tools';tools.setAttribute('aria-label',t('ca.title'));
   tools.innerHTML=`<div class="ca-mode" role="group" aria-label="${esc(t('ca.title'))}"><button type="button" data-ca-mode="pan" aria-pressed="true">${esc(t('ca.pan'))}</button><button type="button" data-ca-mode="select" aria-pressed="false">${esc(t('ca.select'))}</button><button type="button" data-ca-lock aria-pressed="false">${esc(t('ca.lock'))}</button></div><div class="ca-actions"><button type="button" data-ca-zoom="in" aria-label="${esc(t('ca.in'))}">+</button><output data-ca-zoom-value>100%</output><button type="button" data-ca-zoom="out" aria-label="${esc(t('ca.out'))}">−</button><button type="button" data-ca-reset>${esc(t('ca.reset'))}</button><button type="button" data-ca-fit>${esc(t('ca.fit'))}</button></div><div class="ca-arrows" role="group" aria-label="${esc(t('ca.pan'))}">${[['left','←'],['up','↑'],['down','↓'],['right','→']].map(([name,symbol])=>`<button type="button" data-ca-pan="${name}" aria-label="${esc(t('ca.'+name))}">${symbol}</button>`).join('')}</div>`;
   const viewport=document.createElement('div');viewport.className='ca-viewport';viewport.tabIndex=0;viewport.setAttribute('role','region');viewport.setAttribute('aria-label',t('ca.title'));viewport.setAttribute('aria-describedby','caHelp');
   const stage=document.createElement('div');stage.className='ca-stage';
   const shield=document.createElement('div');shield.className='ca-pan-shield';shield.setAttribute('aria-hidden','true');
   const help=document.createElement('p');help.className='ca-help';help.id='caHelp';
   plot.before(outer);stage.append(plot);viewport.append(stage,shield);outer.append(tools,viewport,help);
   const media=matchMedia('(max-width: 900px)'),controller=createController(),state=controller.state,pointers=new Map();let active=media.matches,gesture=null,disposed=false;
   const sourcePoint=svgNokta;
   // The original solver's pointer helper subtracts the transformed SVG rect,
   // but does not divide by CSS scale. Correct that single geometric conversion
   // in this extension; no synthetic events, phase changes or app.js edits.
   const mappedPoint=function(event){const p=sourcePoint(event);return active?{px:p.px/state.zoom,py:p.py/state.zoom}:p;};
   svgNokta=mappedPoint;
   const abort=new AbortController(),on=(node,type,fn,options={})=>node.addEventListener(type,fn,{...options,signal:abort.signal});
   function paint(){
     outer.classList.toggle('ca-active',active);outer.dataset.mode=state.mode;outer.dataset.locked=String(state.locked);
     stage.style.transform=active?`translate(${state.x}px,${state.y}px) scale(${state.zoom})`:'';
     tools.querySelector('[data-ca-zoom-value]').textContent=Math.round(state.zoom*100)+'%';
     for(const b of tools.querySelectorAll('[data-ca-mode]'))b.setAttribute('aria-pressed',String(b.dataset.caMode===state.mode));
     const lock=tools.querySelector('[data-ca-lock]');lock.setAttribute('aria-pressed',String(state.locked));lock.textContent=t(state.locked?'ca.unlock':'ca.lock');
     for(const b of tools.querySelectorAll('[data-ca-zoom],[data-ca-pan],[data-ca-reset],[data-ca-fit]'))b.disabled=state.locked;
     help.textContent=t(state.locked?'ca.helpLocked':state.mode==='pan'?'ca.helpPan':'ca.helpSelect')+' '+t('ca.keyboard');
   }
   function updateSize(){const rect=viewport.getBoundingClientRect();controller.resize(rect.width||375,rect.height||500);}
   function local(event){const r=viewport.getBoundingClientRect();return {x:event.clientX-r.left,y:event.clientY-r.top};}
   function startGesture(){
     const points=[...pointers.values()];
     if(points.length>=2){const [a,b]=points;gesture={kind:'pinch',distance:Math.hypot(b.x-a.x,b.y-a.y),zoom:state.zoom,x:state.x,y:state.y,mid:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}};}
     else if(points.length)gesture={kind:'pan',point:points[0],x:state.x,y:state.y};else gesture=null;
   }
   on(shield,'pointerdown',event=>{if(!active||state.mode!=='pan'||state.locked)return;event.preventDefault();pointers.set(event.pointerId,local(event));shield.setPointerCapture?.(event.pointerId);startGesture();});
   on(shield,'pointermove',event=>{
     if(!active||state.mode!=='pan'||state.locked||!pointers.has(event.pointerId)||!gesture)return;
     event.preventDefault();pointers.set(event.pointerId,local(event));const points=[...pointers.values()];
     if(gesture.kind==='pinch'&&points.length>=2){const [a,b]=points,mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2},ratio=Math.hypot(b.x-a.x,b.y-a.y)/Math.max(gesture.distance,1),z=Math.min(3,Math.max(.2,gesture.zoom*ratio));state.zoom=z;state.x=mid.x-(gesture.mid.x-gesture.x)*(z/gesture.zoom);state.y=mid.y-(gesture.mid.y-gesture.y)*(z/gesture.zoom);}
     else if(points.length){state.x=gesture.x+points[0].x-gesture.point.x;state.y=gesture.y+points[0].y-gesture.point.y;}
     paint();
   });
   const release=event=>{pointers.delete(event.pointerId);startGesture();};on(shield,'pointerup',release);on(shield,'pointercancel',release);on(shield,'lostpointercapture',release);
   on(viewport,'wheel',event=>{if(!active)return;if(state.locked){event.preventDefault();event.stopPropagation();return;}if(state.mode!=='pan')return;event.preventDefault();event.stopPropagation();if(event.ctrlKey||event.metaKey){const p=local(event);controller.zoomAt(Math.exp(-event.deltaY*.002),p.x,p.y);}else controller.pan(-event.deltaX,-event.deltaY);paint();},{passive:false,capture:true});
   tools.querySelectorAll('[data-ca-mode]').forEach(b=>on(b,'click',()=>{state.mode=b.dataset.caMode;pointers.clear();gesture=null;paint();}));
   on(tools.querySelector('[data-ca-lock]'),'click',()=>{state.locked=!state.locked;pointers.clear();gesture=null;paint();});
   tools.querySelectorAll('[data-ca-zoom]').forEach(b=>on(b,'click',()=>{controller.zoomAt(b.dataset.caZoom==='in'?1.2:1/1.2);paint();}));
   on(tools.querySelector('[data-ca-reset]'),'click',()=>{controller.reset();paint();});on(tools.querySelector('[data-ca-fit]'),'click',()=>{controller.fit();paint();});
   const arrows={left:[70,0],right:[-70,0],up:[0,70],down:[0,-70]};
   tools.querySelectorAll('[data-ca-pan]').forEach(b=>on(b,'click',()=>{controller.pan(...arrows[b.dataset.caPan]);paint();}));
   on(viewport,'keydown',event=>{if(!active||event.target!==viewport)return;const keys={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'};if(keys[event.key]){event.preventDefault();controller.pan(...arrows[keys[event.key]]);paint();}else if(['+','=','-','0'].includes(event.key)){event.preventDefault();if(event.key==='0')controller.reset();else controller.zoomAt(event.key==='-'?1/1.2:1.2);paint();}});
   const observer=new ResizeObserver(updateSize);observer.observe(viewport);
   on(media,'change',()=>{active=media.matches;pointers.clear();gesture=null;paint();updateSize();});
   function dispose(){if(disposed)return;disposed=true;abort.abort();observer.disconnect();if(svgNokta===mappedPoint)svgNokta=sourcePoint;}
   on(window,'pagehide',event=>{if(!event.persisted)dispose();});
   paint();updateSize();return {controller,outer,viewport,stage,dispose,get active(){return active;}};
 }
 return {createController,mount};
})();
if(typeof document!=='undefined'&&typeof KANCA!=='undefined')globalThis.FazCalismaGorunumu=FazCalismaAlani.mount();
