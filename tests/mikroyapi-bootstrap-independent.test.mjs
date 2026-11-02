import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {parseHTML} from 'linkedom';
import {data} from './source-solver.mjs';

test('inspector bootstrap stays lazy and disables both entry points in alloy mode',()=>{
 const {window,document}=parseHTML('<html><body><section id="kBilesen"></section></body></html>');
 // Linkedom currently exposes a getter-only select.value; browsers have a setter.
 const selectedValue=Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype,'value');
 const selected=new WeakMap();
 Object.defineProperty(window.HTMLSelectElement.prototype,'value',{configurable:true,get(){return selected.has(this)?selected.get(this):selectedValue.get.call(this);},set(value){selected.set(this,String(value));}});
 const imports=[],context={document,window,CustomEvent:window.CustomEvent,console,D:data,DIL:'en',st:{C:.45,T:650,alas:{}},KAYNAK:{alt:null},KANCA:{panel:[]},t:k=>k,esc:String,sozlukEkle(){},FazBilesen:{calculate(){return {status:'resolved',phases:[],parts:[]};}},sec(){},gecisler(){return [];}};
 runInNewContext(readFileSync(new URL('../web/mikroyapi/bootstrap.js',import.meta.url),'utf8'),context,{importModuleDynamically:specifier=>{imports.push(specifier);throw new Error('Unexpected eager module load');}});
 assert.equal(imports.length,0);assert.equal(context.FazMikroyapi.controller,null);
 assert.equal(document.querySelectorAll('.kup-dialog').length,1);
 assert.equal(document.querySelector('[data-kup-quality]').value,'fine','new inspectors default to the requested 192-grain preset');
 const entries=[document.querySelector('[data-kup-open]'),document.querySelector('.kup-dock')];
 for(const entry of entries)assert.equal(entry.disabled,false);
 for(const alloy of ['isopleth','correction']){
  if(alloy==='isopleth')context.KAYNAK.alt={};else{context.KAYNAK.alt=null;context.st.alas={Cr:.5};}
  context.KANCA.panel.forEach(f=>f());for(const entry of entries)assert.equal(entry.disabled,true);
  assert.match(document.querySelector('.kup-entry p').textContent,/kup.alloy/);
 }
 context.st.alas={Cr:0};context.KANCA.panel.forEach(f=>f());
 for(const entry of entries)assert.equal(entry.disabled,false);
 assert.equal(imports.length,0,'state changes must not load the model or Three.js');
});
