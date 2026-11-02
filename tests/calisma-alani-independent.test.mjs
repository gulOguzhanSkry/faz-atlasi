import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseHTML} from 'linkedom';
const source=readFileSync(new URL('../web/calisma-alani.js',import.meta.url),'utf8');
const css=readFileSync(new URL('../web/calisma-alani.css',import.meta.url),'utf8');
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
function api(){const context={};runInNewContext(source,context);return context.FazCalismaAlani;}
function harness(mobile=true){
 const {document,window}=parseHTML('<html><body><div><svg id="cizim"></svg></div></body></html>'),plot=document.getElementById('cizim'),media=new window.EventTarget();media.matches=mobile;
 let selection=0,sourceWheel=0,solverCalls=0;const captured=[],observers=[];
 window.HTMLElement.prototype.setPointerCapture=function(id){captured.push(id);};
 window.HTMLElement.prototype.getBoundingClientRect=function(){return {left:10,top:20,width:375,height:500};};
 const originalPoint=e=>{const rect=plot.getBoundingClientRect();return {px:e.clientX-rect.left,py:e.clientY-rect.top};};
 const context={document,window,console,AbortController,KANCA:{},svgNokta:originalPoint,matchMedia:()=>media,sozlukEkle(){},esc:String,t:k=>k,ResizeObserver:class{constructor(){observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},durum(){solverCalls++;throw new Error('Workspace must not invoke or replace the phase solver');}};
 const originalSolver=context.durum;runInNewContext(source,context);
 const mounted=context.FazCalismaGorunumu,{controller,viewport,outer}=mounted,shield=outer.querySelector('.ca-pan-shield');
 plot.getBoundingClientRect=()=>({left:10+(media.matches?controller.state.x:0),top:20+(media.matches?controller.state.y:0),width:1120*(media.matches?controller.state.zoom:1),height:720*(media.matches?controller.state.zoom:1)});
 plot.addEventListener('click',()=>selection++);plot.addEventListener('wheel',()=>sourceWheel++);
 const fire=(target,type,props={})=>{const event=new window.Event(type,{bubbles:true,cancelable:true});for(const [key,value] of Object.entries(props))Object.defineProperty(event,key,{value});target.dispatchEvent(event);return event;};
 const click=selector=>fire(outer.querySelector(selector),'click');
 return {document,window,context,media,plot,mounted,controller,viewport,outer,shield,fire,click,captured,observers,originalPoint,originalSolver,get selection(){return selection;},get sourceWheel(){return sourceWheel;},get solverCalls(){return solverCalls;}};
}

test('workspace controller pans without diagram-edge bounds, round-trips coordinates and keeps zoom anchors at both clamps',()=>{
 const controller=api().createController({width:1120,height:720,viewportWidth:375,viewportHeight:500}),s=controller.state;
 controller.pan(1e6,-1e6);assert.equal(s.x,1e6);assert.equal(s.y,-1e6);
 for(const factor of [2,.01,100]){
  const anchor=controller.toPlot(123,234);controller.zoomAt(factor,123,234);
  close(controller.toPlot(123,234).px,anchor.px);close(controller.toPlot(123,234).py,anchor.py);
  assert.ok(s.zoom>=.2&&s.zoom<=3);
 }
 for(const [px,py] of [[0,0],[123,-456],[1e6,1e6]]){const plot=controller.toPlot(px,py);close(plot.px*s.zoom+s.x,px);close(plot.py*s.zoom+s.y,py);}
 controller.reset();controller.fit();close((s.width*s.zoom+2*s.x),375);close((s.height*s.zoom+2*s.y),500);
 s.locked=true;const before=JSON.stringify(s);controller.pan(50,80);controller.zoomAt(2);controller.fit();controller.reset();assert.equal(JSON.stringify(s),before);
});

test('375px pan shield intercepts dragging without selecting the source plot; select mode and keyboard controls remain available',()=>{
 const h=harness(),s=h.controller.state;assert.equal(h.mounted.active,true);assert.equal(s.mode,'pan');
 h.fire(h.shield,'pointerdown',{pointerId:1,clientX:30,clientY:40});h.fire(h.shield,'pointermove',{pointerId:1,clientX:230,clientY:-60});h.fire(h.shield,'pointerup',{pointerId:1});h.fire(h.shield,'click');
 assert.equal(s.x,200);assert.equal(s.y,-100);assert.deepEqual(h.captured,[1]);assert.equal(h.selection,0);
 h.fire(h.viewport,'keydown',{key:'ArrowRight'});assert.equal(s.x,130);
 h.click('[data-ca-mode="select"]');assert.equal(s.mode,'select');assert.equal(h.outer.querySelector('[data-ca-mode="select"]').getAttribute('aria-pressed'),'true');
 assert.match(css,/\[data-mode=select\]\s+\.ca-pan-shield\{pointer-events:none\}/);
 h.fire(h.plot,'click');assert.equal(h.selection,1);const x=s.x;h.fire(h.plot,'keydown',{key:'ArrowRight'});assert.equal(s.x,x,'source plot key events must not pan the workspace');
 assert.equal(h.context.durum,h.originalSolver);assert.equal(h.solverCalls,0);h.mounted.dispose();
});

test('view lock disables movement controls and wheel while point selection remains enabled',()=>{
 const h=harness(),s=h.controller.state;h.click('[data-ca-lock]');assert.equal(s.locked,true);
 for(const button of h.outer.querySelectorAll('[data-ca-zoom],[data-ca-pan],[data-ca-reset],[data-ca-fit]'))assert.equal(button.disabled,true);
 for(const button of h.outer.querySelectorAll('[data-ca-mode]'))assert.notEqual(button.disabled,true);
 const before=JSON.stringify(s),wheel=h.fire(h.viewport,'wheel',{deltaX:12,deltaY:30,clientX:100,clientY:100});assert.equal(wheel.defaultPrevented,true);
 h.fire(h.shield,'pointerdown',{pointerId:4,clientX:30,clientY:40});h.fire(h.shield,'pointermove',{pointerId:4,clientX:230,clientY:240});h.fire(h.viewport,'keydown',{key:'+'});assert.equal(JSON.stringify(s),before);
 h.click('[data-ca-mode="select"]');h.fire(h.plot,'click');assert.equal(h.selection,1);
 h.click('[data-ca-lock]');assert.equal(s.locked,false);for(const button of h.outer.querySelectorAll('[data-ca-zoom],[data-ca-pan],[data-ca-reset],[data-ca-fit]'))assert.equal(button.disabled,false);
 h.mounted.dispose();
});

test('transformed SVG coordinates are divided by zoom once, desktop bypasses the correction and disposal restores the exact source helper',()=>{
 const h=harness(),s=h.controller.state;h.controller.pan(-90,60);h.controller.zoomAt(2,100,120);
 const rect=h.plot.getBoundingClientRect(),event={clientX:rect.left+250*s.zoom,clientY:rect.top+125*s.zoom};
 const result=h.context.svgNokta(event);close(result.px,250);close(result.py,125);
 h.media.matches=false;h.media.dispatchEvent(new h.window.Event('change'));assert.equal(h.mounted.active,false);assert.equal(h.mounted.stage.style.transform,'');
 assert.deepEqual(h.context.svgNokta({clientX:260,clientY:145}),h.originalPoint({clientX:260,clientY:145}));
 h.fire(h.plot,'wheel',{deltaX:2,deltaY:8});assert.equal(h.sourceWheel,1,'desktop retains the original plot event path');
 h.mounted.dispose();h.mounted.dispose();assert.equal(h.context.svgNokta,h.originalPoint);assert.equal(h.observers[0].disconnected,true);
});

test('pinch preserves the source point under the moving centroid; pan-wheel is consumed and select-wheel stays native',()=>{
 const h=harness(),s=h.controller.state;
 h.fire(h.shield,'pointerdown',{pointerId:1,clientX:110,clientY:120});h.fire(h.shield,'pointerdown',{pointerId:2,clientX:210,clientY:120});
 const anchor=h.controller.toPlot(150,100);
 h.fire(h.shield,'pointermove',{pointerId:2,clientX:310,clientY:120});close(s.zoom,2);
 close(h.controller.toPlot(200,100).px,anchor.px);close(h.controller.toPlot(200,100).py,anchor.py);
 h.fire(h.shield,'pointerup',{pointerId:1});h.fire(h.shield,'pointerup',{pointerId:2});
 const beforeX=s.x,beforeY=s.y,panWheel=h.fire(h.viewport,'wheel',{deltaX:15,deltaY:25,clientX:160,clientY:120});
 assert.equal(panWheel.defaultPrevented,true);close(s.x,beforeX-15);close(s.y,beforeY-25);
 h.click('[data-ca-mode="select"]');const nativeWheel=h.fire(h.viewport,'wheel',{deltaX:15,deltaY:25});assert.equal(nativeWheel.defaultPrevented,false);
 h.mounted.dispose();
});
