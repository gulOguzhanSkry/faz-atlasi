import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import {runInNewContext} from 'node:vm';
import {build} from 'esbuild';
import {parseHTML} from 'linkedom';
import * as THREE from '../web/vendor/three/three.module.min.js';
import * as MODEL from '../web/mikroyapi/model.js';
import {data,motor} from './source-solver.mjs';

const root=fileURLToPath(new URL('../',import.meta.url));
const bundle=await build({entryPoints:[root+'web/mikroyapi/kup.js'],bundle:true,write:false,format:'iife',globalName:'CubeUnderTest',logLevel:'silent',plugins:[{name:'renderer-only-double',setup(b){b.onLoad({filter:/[/\\]kup\.js$/},args=>({contents:readFileSync(args.path,'utf8').replace("import * as THREE from '../vendor/three/three.module.min.js';",'const THREE=globalThis.__THREE;').replace("import {OrbitControls} from '../vendor/three/OrbitControls.js';",'const OrbitControls=globalThis.__OrbitControls;').replace("import {createModel,PHASE_COLORS,CONSTITUENT_COLORS} from './model.js';",'const {createModel,PHASE_COLORS,CONSTITUENT_COLORS}=globalThis.__MODEL;'),loader:'js',resolveDir:root+'web/mikroyapi'}));}}]});
const engine=motor();
function harness({reduced=false,webgl=true,temperature=650}={}){
 const {document,window}=parseHTML('<html><body><section id="kBilesen"></section></body></html>');
 const selectValue=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value');
 const selected=new WeakMap();
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return selected.has(this)?selected.get(this):selectValue.get.call(this);},set(value){selected.set(this,String(value));}});
 Object.defineProperty(document,'visibilityState',{value:'visible',writable:true});
 const text=[],downloads=[],pngCanvases=[];
 window.HTMLCanvasElement.prototype.getContext=function(type){return type==='2d'?{createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(){},fillRect(){},strokeRect(){},measureText:s=>({width:s.length*5}),fillText:s=>text.push(s)}:null;};
 window.HTMLCanvasElement.prototype.toDataURL=function(){pngCanvases.push({width:this.width,height:this.height});return 'data:image/png;base64,independent-test';};
 window.HTMLAnchorElement.prototype.click=function(){downloads.push({download:this.download,href:this.href});};
 const media=new window.EventTarget();media.matches=reduced;
 let rafId=0;const rafs=new Map(),renderers=[],observers=[],controlInstances=[];
 class FakeRenderer{
  constructor(){if(!webgl)throw new Error('No WebGL in test');this.domElement=document.createElement('canvas');renderers.push(this);}
  setPixelRatio(){}setClearColor(){}setSize(){}render(scene){this.scene=scene;this.renders=(this.renders||0)+1;}dispose(){this.disposes=(this.disposes||0)+1;}
 }
 class FakeControls extends THREE.EventDispatcher{
  constructor(){super();this.target=new THREE.Vector3();controlInstances.push(this);}update(){}dispose(){this.disposed=true;}
 }
 const context={document,window,console:{warn(){},error:console.error},CustomEvent:window.CustomEvent,AbortController,performance,devicePixelRatio:1,matchMedia:()=>media,requestAnimationFrame:fn=>{rafs.set(++rafId,fn);return rafId;},cancelAnimationFrame:id=>rafs.delete(id),ResizeObserver:class{constructor(fn){this.fn=fn;observers.push(this);}observe(){}disconnect(){this.disconnected=true;}},__THREE:{...THREE,WebGLRenderer:FakeRenderer},__MODEL:MODEL,__OrbitControls:FakeControls,D:data,DIL:'en',st:{C:.45,T:650,alas:{}},KAYNAK:{alt:null},KANCA:{panel:[]},t:k=>k,esc:String,sozlukEkle(){},FazBilesen:engine,sec(){},gecisler(){return [];}};
 runInNewContext(readFileSync(new URL('../web/mikroyapi/bootstrap.js',import.meta.url),'utf8'),context);
 runInNewContext(bundle.outputFiles[0].text,context);
 const host=document.querySelector('.kup-dialog'),selections=[];let current={binary:true,carbon:.45,temperature,result:engine.calculate(.45,temperature)};
 const controller=context.CubeUnderTest.mountCube(host,{t:k=>k,lang:'en',sourceData:data,getState:()=>current,boundaries:()=>[data.invariants.otektoid.T],selectTemperature:T=>{selections.push(T);current={...current,temperature:T,result:engine.calculate(current.carbon,T)};controller.setState(current);}});
 assert.equal(controller.model.config.grains,192,'runtime default must agree with the 192-grain control');
 assert.equal(controller.model.quality,host.querySelector('[data-kup-quality]').value);
 const quality=host.querySelector('[data-kup-quality]');quality.value='economy';quality.dispatchEvent(new window.Event('change'));
 const flush=(time=100)=>{const jobs=[...rafs];rafs.clear();for(const [,fn] of jobs)fn(time);};
 const fire=(selector,event='click')=>host.querySelector(selector).dispatchEvent(new window.Event(event));
 return {host,controller,context,document,window,media,rafs,renderers,observers,controlInstances,selections,downloads,pngCanvases,text,flush,fire};
}

test('cube replaces and disposes actual Three.js face resources, exports scoped PNG and closes playback',()=>{
 const h=harness();h.flush();h.flush();
 const preview=h.host.querySelector('[data-kup-slice]');assert.equal(preview.width,preview.height,'preview remains square without export metadata');
 assert.match(h.host.querySelector('[data-kup-section-caption]').textContent,/650.*kup.scope/);
 const renderer=h.renderers[0];assert.ok(renderer.renders>0);
 const faces=renderer.scene.children.find(x=>x.type==='Group').children;
 assert.equal(faces.filter(x=>x.isMesh).length,6);
 const resources=[];for(const child of faces){if(child.geometry)resources.push(child.geometry);for(const material of [child.material].flat().filter(Boolean)){resources.push(material);if(material.map)resources.push(material.map);}}
 let disposed=0;resources.forEach(r=>r.addEventListener('dispose',()=>disposed++));
 h.controller.setState({binary:true,carbon:1.2,temperature:650,result:engine.calculate(1.2,650)});h.flush();h.flush();
 assert.equal(disposed,resources.length,'old face geometries/materials/textures must all be disposed');
 h.fire('[data-kup-export]');assert.equal(h.downloads.length,1);assert.match(h.downloads[0].download,/1.2-650-z-1.00\.png$/);assert.match(h.text.join(' '),/not a measured micrograph/);
 assert.ok(h.pngCanvases[0].width>=512);assert.ok(h.pngCanvases[0].height>h.pngCanvases[0].width,'export must include its scientific information strip');
 h.fire('[data-kup-play="heat"]');assert.equal(h.controller.playing,true);
 h.controller.close();assert.equal(h.controller.playing,false);
 h.controller.open();h.flush();h.flush();
 h.controller.dispose();h.controller.dispose();
 assert.equal(h.controller.destroyed,true);assert.equal(renderer.disposes,1);assert.equal(renderer.domElement.parentElement,null);assert.equal(h.controlInstances[0].disposed,true);assert.equal(h.observers[0].disconnected,true);assert.equal(h.rafs.size,0);
});

test('reduced-motion preference disables playback and a live preference change stops it',()=>{
 const h=harness({reduced:true});
 assert.equal(h.host.querySelector('[data-kup-play="heat"]').disabled,true);
 h.fire('[data-kup-play="heat"]');assert.equal(h.controller.playing,false);assert.equal(h.selections.length,0);
 h.media.matches=false;h.media.dispatchEvent(new h.window.Event('change'));
 assert.equal(h.host.querySelector('[data-kup-play="heat"]').disabled,false);
 h.fire('[data-kup-play="heat"]');assert.equal(h.controller.playing,true);
 h.media.matches=true;h.media.dispatchEvent(new h.window.Event('change'));
 assert.equal(h.controller.playing,false);h.controller.dispose();assert.equal(h.rafs.size,0);
});

test('WebGL failure retains functional shared 2D canvas, alloy changes invalidate it and pagehide disposes',()=>{
 const h=harness({webgl:false});h.flush();
 assert.equal(h.controller.renderer,null);assert.ok(h.host.classList.contains('kup-no-webgl'));
 assert.ok(h.host.querySelector('[data-kup-slice]').width>=64);assert.match(h.host.querySelector('.kup-foot').textContent,/kup.scope/);
 h.fire('[data-kup-export]');assert.match(h.text.join(' '),/not a measured micrograph/);assert.ok(h.pngCanvases[0].height>h.pngCanvases[0].width);
 h.controller.setState({binary:false,carbon:.45,temperature:650,result:engine.calculate(.45,650)});h.flush();
 assert.equal(h.controller.model.valid,false);assert.match(h.host.querySelector('[data-kup-summary]').textContent,/kup.alloy/);
 h.fire('[data-kup-play="heat"]');assert.equal(h.controller.playing,false);
 const event=new h.window.Event('pagehide');Object.defineProperty(event,'persisted',{value:false});h.window.dispatchEvent(event);
 assert.equal(h.controller.destroyed,true);assert.equal(h.observers[0].disconnected,true);
});

test('thermal playback stops exactly at the source invariant and does not invent an unresolved morphology',()=>{
 const invariant=data.invariants.otektoid.T,h=harness({webgl:false,temperature:invariant+.5});
 h.fire('[data-kup-play="cool"]');assert.equal(h.controller.playing,true);h.flush(1000);
 assert.equal(h.selections.at(-1),invariant);assert.equal(h.controller.playing,false);
 assert.equal(h.controller.model.valid,false,'an invariant without ξ must not be painted as resolved');
 assert.match(h.host.querySelector('[data-kup-summary]').textContent,/kup.atBoundary/);
 h.controller.dispose();assert.equal(h.rafs.size,0);
});

test('minimise and reopen preserve quality, face resolution, geometry, model and viewing controls at an unchanged point',()=>{
 const h=harness();h.flush();h.flush();
 const choose=(selector,value,event='change')=>{h.host.querySelector(selector).value=value;h.fire(selector,event);};
 choose('[data-kup-depth]','.4','input');h.fire('input[name="kupAxis"][value="x"]','change');choose('[data-kup-colors]','constituents');h.flush();h.flush();
 h.controller.camera.position.set(2,1,3);
 const model=h.controller.model,group=h.renderers[0].scene.children.find(x=>x.type==='Group'),children=[...group.children],widths=children.filter(c=>c.isMesh).map(c=>c.material.map.image.width);
 let disposal=0;for(const c of children)c.geometry?.addEventListener('dispose',()=>disposal++);
 const dock=h.document.createElement('div');h.document.body.append(dock);
 h.controller.close();h.controller.dock(dock);h.controller.open();
 h.controller.setState({binary:true,carbon:.45,temperature:650,result:engine.calculate(.45,650)});h.flush();h.flush();
 assert.equal(h.controller.model,model);assert.equal(h.controller.quality,'economy');assert.equal(h.controller.surface,64);
 assert.equal(h.controller.depth,.4);assert.equal(h.controller.axis,'x');assert.equal(h.controller.colorMode,'constituents');
 assert.deepEqual(h.controller.camera.position.toArray(),[2,1,3]);
 assert.deepEqual(group.children,children,'unchanged reopen must reuse face geometries');assert.equal(disposal,0);
 assert.deepEqual(group.children.filter(c=>c.isMesh).map(c=>c.material.map.image.width),widths);
 h.controller.dispose();
});
