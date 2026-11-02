/* SPDX-License-Identifier: MIT
 * OG additions to Faz Atlası (acarcemal). Source phases: unchanged CALPHAD
 * durum(), Fei–Brosh data. This partitions mass along an idealised cooling
 * history, not a kinetic/morphology prediction. No textbook constants mixed in.
 */
'use strict';
globalThis.FazBilesenMotoru = (() => {
  const codes = ['A','G','C','D','L'], eps = 1e-8;
  function create(data, solver) {
    const inv=data.invariants, e=inv.otektoid, u=inv.otektik, r=inv.peritektik;
    const c=data.meta.W_Fe3C;
    const landmarks={ferrite:e.A,eutectoid:e.G,cementite:c,austeniteAtEutectic:u.G,eutectic:u.L,eutectoidT:e.T,eutecticT:u.T};
    const valid=()=>[e.A,e.G,u.G,u.L,c,e.T,u.T].every(Number.isFinite)&&0<=e.A&&e.A<e.G&&e.G<u.G&&u.G<u.L&&u.L<c&&e.T<u.T;
    const inRange=(w,T)=>Number.isFinite(w)&&Number.isFinite(T)&&w>=0&&w<=c&&T>=data.meta.T_min&&T<=data.meta.T_max;
    function eventAt(w,T) {
      const near=(v)=>Math.abs(T-v.T)<=1e-7;
      if(near(e)&&w>=e.A&&w<=c)return 'eutectoid';
      if(near(u)&&w>=u.G&&w<=c)return 'eutectic';
      if(r&&near(r)&&w>=r.D&&w<=r.L)return 'peritectic';
      return null;
    }
    const mix=(x,a,b)=>[(b-x)/(b-a),(x-a)/(b-a)];
    function state(w,T,xi) {
      if(!valid()||!inRange(w,T))return {status:'unavailable',phases:[],reason:'range'};
      const event=eventAt(w,T);
      if(event&&(xi===undefined||xi===null))return {status:'needs-progress',event,phases:[]};
      if(event&&(!Number.isFinite(xi)||xi<0||xi>1))return {status:'unavailable',event,phases:[],reason:'progress'};
      if(!event){
        const source=solver(w,T), phases=source.fazlar.map(p=>({...p}));
        if(!balanced(phases,w))return {status:'unavailable',phases:[],reason:'balance'};
        return {status:'resolved',phases,source};
      }
      let before,after,compositions;
      if(event==='eutectoid'){
        const pre=w<=e.G?{A:mix(w,e.A,e.G)[0],G:mix(w,e.A,e.G)[1]}:{G:mix(w,e.G,c)[0],C:mix(w,e.G,c)[1]};
        const post=mix(w,e.A,c); before=pre;after={A:post[0],C:post[1]};compositions={A:e.A,G:e.G,C:c};
      }else if(event==='eutectic'){
        before=w<=u.L?{G:mix(w,u.G,u.L)[0],L:mix(w,u.G,u.L)[1]}:{L:mix(w,u.L,c)[0],C:mix(w,u.L,c)[1]};
        const post=mix(w,u.G,c);after={G:post[0],C:post[1]};compositions={G:u.G,L:u.L,C:c};
      }else{
        const pre=mix(w,r.D,r.L);before={D:pre[0],L:pre[1]};
        after=w<=r.G?{D:mix(w,r.D,r.G)[0],G:mix(w,r.D,r.G)[1]}:{G:mix(w,r.G,r.L)[0],L:mix(w,r.G,r.L)[1]};
        compositions={D:r.D,G:r.G,L:r.L};
      }
      const phases=codes.map(f=>({f,oran:(1-xi)*(before[f]||0)+xi*(after[f]||0),w:compositions[f]})).filter(p=>p.oran>0);
      return balanced(phases,w)?{status:'resolved',event,xi,phases}:{status:'unavailable',phases:[],reason:'balance'};
    }
    function balanced(phases,w) {
      return phases.length>0&&phases.every(p=>codes.includes(p.f)&&Number.isFinite(p.oran)&&Number.isFinite(p.w)&&p.oran>=0&&p.oran<=1)&&Math.abs(phases.reduce((s,p)=>s+p.oran,0)-1)<eps&&Math.abs(phases.reduce((s,p)=>s+p.oran*p.w,0)-w)<eps;
    }
    function calculate(w,T,xi) {
      const result=state(w,T,xi);
      if(result.status!=='resolved')return {...result,parts:[],formulas:[],notes:[result.reason||'progress']};
      const P=Object.fromEntries(result.phases.map(p=>[p.f,p.oran]));
      const composition=f=>result.phases.find(p=>p.f===f)?.w;
      const parts=[],formulas=[],notes=['history','scope'];
      const add=(id,phases)=>parts.push({id,phases,fraction:Object.values(phases).reduce((s,v)=>s+v,0)});
      const remainder=(id)=>add(id,Object.fromEntries(codes.filter(f=>P[f]!==undefined).map(f=>[f,(P[f]||0)-parts.reduce((s,p)=>s+(p.phases[f]||0),0)])));
      const lever=(id,x,a,b,value)=>formulas.push({id,text:`(${b.toFixed(6)} − ${x.toFixed(6)}) / (${b.toFixed(6)} − ${a.toFixed(6)})`,value});
      function phasesOnly(reason='phases') {
        const ids={A:T<e.T?'ferrite':'proeutectoid-ferrite',G:P.L?'primary-austenite':'austenite',C:reason==='fallback'?'cementite':P.L?'primary-cementite':T<e.T?'tertiary-cementite':'secondary-cementite',D:'delta-ferrite',L:'liquid'};
        return {...result,basis:'phases',parts:result.phases.map(p=>({id:ids[p.f],fraction:p.oran,phases:{[p.f]:p.oran}})),formulas:[],notes:['history','scope',reason]};
      }
      if(result.event==='peritectic'||P.D||P.L&&result.event!=='eutectic'||T>u.T)return phasesOnly();
      if(result.event==='eutectic'){
        if(w<u.L){const q=(u.L-w)/(u.L-u.G);add('primary-austenite',{G:q});lever('primary-austenite',w,u.G,u.L,q);}
        if(w>u.L){const q=(w-u.L)/(c-u.L);add('primary-cementite',{C:q});formulas.push({id:'primary-cementite',text:`(${w.toFixed(6)} − ${u.L.toFixed(6)}) / (${c.toFixed(6)} − ${u.L.toFixed(6)})`,value:q});}
        add('liquid',{L:P.L||0});remainder('ledeburite');notes.push('eutectic-progress');
      }else if(T>e.T){
        if(w<=u.G)return phasesOnly('above');
        if(w<u.L){
          const q=(u.L-w)/(u.L-u.G),cg=composition('G');
          const sec=cg<u.G?q*(u.G-cg)/(c-cg):0;
          add('primary-austenite',{G:q-sec});add('secondary-cementite',{C:sec});
          formulas.push({id:'ledeburite',text:`(${w.toFixed(6)} − ${u.G.toFixed(6)}) / (${u.L.toFixed(6)} − ${u.G.toFixed(6)})`,value:1-q});
          formulas.push({id:'secondary-cementite',text:`${q.toFixed(6)} × (${u.G.toFixed(6)} − Cγ(T)) / (Cθ − Cγ(T))`,value:sec});
        }else if(w>u.L){const q=(w-u.L)/(c-u.L);add('primary-cementite',{C:q});lever('ledeburite',w,u.L,c,1-q);}
        remainder('ledeburite');notes.push('white-iron','merged-secondary');
      }else if(w<=e.A)return phasesOnly('dilute');
      else if(w<=u.G){
        if(w<e.G){
          const q=(e.G-w)/(e.G-e.A),ca=composition('A')??e.A;
          const tertiary=ca<e.A?q*(e.A-ca)/(c-ca):0;
          add('proeutectoid-ferrite',{A:q-tertiary});add('tertiary-cementite',{C:tertiary});
          lever('proeutectoid-ferrite',w,e.A,e.G,q);formulas.push({id:'pearlite',text:`(${w.toFixed(6)} − ${e.A.toFixed(6)}) / (${e.G.toFixed(6)} − ${e.A.toFixed(6)})`,value:1-q});
          if(tertiary>0)notes.push('tertiary');
        }else if(w>e.G){const q=(w-e.G)/(c-e.G);add('secondary-cementite',{C:q});formulas.push({id:'secondary-cementite',text:`(${w.toFixed(6)} − ${e.G.toFixed(6)}) / (${c.toFixed(6)} − ${e.G.toFixed(6)})`,value:q});}
        if(result.event==='eutectoid'){add('austenite',{G:P.G||0});notes.push('eutectoid-progress');}
        remainder('pearlite');
        formulas.push({id:'pearlite-alpha',text:`(${c.toFixed(6)} − ${e.G.toFixed(6)}) / (${c.toFixed(6)} − ${e.A.toFixed(6)})`,value:(c-e.G)/(c-e.A)});
      }else{
        const ca=composition('A')??e.A;
        if(w<u.L){
          const q=(u.L-w)/(u.L-u.G),sec=q*(u.G-e.G)/(c-e.G),p=q-sec;
          // At Ae1 the parent γ inside each origin has the same C: one ξ applies
          // to both primary and eutectic γ. Preserve their ancestry separately.
          const progress=result.event==='eutectoid'?xi:1;
          const alpha=(c-e.G)/(c-ca);
          add('pearlite',{A:p*progress*alpha,C:p*progress*(1-alpha)});
          add('secondary-cementite',{C:sec});
          if(result.event==='eutectoid')add('austenite',{G:p*(1-progress)});
          formulas.push({id:'primary-austenite',text:`(${u.L.toFixed(6)} − ${w.toFixed(6)}) / (${u.L.toFixed(6)} − ${u.G.toFixed(6)})`,value:q},{id:'secondary-cementite',text:`${q.toFixed(6)} × (${u.G.toFixed(6)} − ${e.G.toFixed(6)}) / (${c.toFixed(6)} − ${e.G.toFixed(6)})`,value:sec});
        }else if(w>u.L){const q=(w-u.L)/(c-u.L);add('primary-cementite',{C:q});lever('transformed-ledeburite',w,u.L,c,1-q);}
        remainder('transformed-ledeburite');notes.push('white-iron','merged-secondary');
        if(result.event==='eutectoid')notes.push('cast-progress');
      }
      for(const part of parts){
        for(const f of Object.keys(part.phases)){
          if(!Number.isFinite(part.phases[f])||part.phases[f]<-eps)return phasesOnly('fallback');
          if(part.phases[f]<0)part.phases[f]=0;
        }
        part.fraction=Object.values(part.phases).reduce((s,v)=>s+v,0);
      }
      const kept=parts.filter(p=>p.fraction>1e-14);
      if(codes.some(f=>Math.abs(kept.reduce((s,p)=>s+(p.phases[f]||0),0)-(P[f]||0))>eps))return phasesOnly('fallback');
      for(const part of kept)if(!formulas.some(f=>f.id===part.id)){
        const contributions=Object.entries(part.phases).filter(([,v])=>v>0);
        formulas.push({id:part.id,text:contributions.map(([f,v])=>`m(${f}) = ${v.toFixed(8)}`).join(' + '),value:part.fraction});
      }
      return {...result,basis:'slow-cooling',parts:kept,formulas,notes};
    }
    return {state,calculate,landmarks};
  }
  return {create};
})();

/* Classic-script integration: no build, module loader, network or CDN required. */
if(typeof document!=='undefined'&&typeof KANCA!=='undefined')(()=>{
  const originalSolver=durum,engine=FazBilesenMotoru.create(D,originalSolver);
  globalThis.FazBilesen=engine;
  const card=document.createElement('section');card.id='kBilesen';card.className='bilesen-kart';
  card.setAttribute('aria-label',t('bilesen.title'));
  document.getElementById('kBolge').after(card);
  // The source header decorator assumes every .kart-bas has a registered help
  // topic. Use our own stable header to avoid repeated collapse buttons.
  card.innerHTML=`<div class="bilesen-heading"><h3>${esc(t('bilesen.title'))}</h3><span class="meta">${esc(t('bilesen.assumption'))}</span></div><div class="bilesen-body"><div data-bilesen-progress></div><div data-bilesen-result></div></div>`;
  const progressHost=card.querySelector('[data-bilesen-progress]'),resultHost=card.querySelector('[data-bilesen-result]');
  let progressKey='',controlsKey='',xi,open=false;
  const binary=()=>!KAYNAK.alt&&!Object.values(st.alas||{}).some(x=>x!==0);
  const pointKey=()=>`${st.C}:${st.T}`;
  engine.setProgress=value=>{
    if(value!==undefined&&(!Number.isFinite(value)||value<0||value>1))return false;
    progressKey=pointKey();xi=value;
    const range=progressHost.querySelector('input');if(range&&value!==undefined)range.value=String(value);
    guncelle();return true;
  };
  // One resolved state is shared by the source phase card and the constituent
  // card at an invariant. Without ξ, hide the ambiguous source fraction card.
  durum=function(w,T){
    if(binary()&&progressKey===`${w}:${T}`&&xi!==undefined){
      const state=engine.state(w,T,xi);
      if(state.status==='resolved'&&state.event){const source=originalSolver(w,T);return {...source,r:{...source.r,p:state.phases.map(p=>p.f)},fazlar:state.phases};}
    }
    return originalSolver(w,T);
  };
  function render(){
    if(pointKey()!==progressKey){progressKey=pointKey();xi=undefined;}
    const enabled=binary();
    document.getElementById('kYapi').hidden=enabled;
    const result=enabled?engine.calculate(st.C,st.T,xi):null;
    globalThis.FazBilesenSecimi={result,carbon:st.C,temperature:st.T,binary:enabled};
    document.getElementById('kOran').hidden=enabled&&result.status!=='resolved';
    card.classList.toggle('bilesen-disabled',!enabled);
    let body='';
    const nextControls=enabled&&result.event?`${pointKey()}:${result.event}`:'';
    if(nextControls!==controlsKey){
      controlsKey=nextControls;
      progressHost.innerHTML=nextControls?`<div class="bilesen-progress"><label for="bilesenXi">${esc(t('bilesen.progress',{event:t('bilesen.event.'+result.event)}))}</label><p class="kucuk soluk">${esc(t('bilesen.progressNote'))}</p><input id="bilesenXi" type="range" min="0" max="1" step="0.01" value="0" aria-label="${esc(t('bilesen.progressInput'))}"><output for="bilesenXi"></output><button type="button" data-xi-start>${esc(t('bilesen.start'))}</button></div>`:'';
      const range=progressHost.querySelector('input');
      if(range)range.addEventListener('input',()=>{xi=Number(range.value);guncelle();});
      progressHost.querySelector('button')?.addEventListener('click',()=>{xi=0;range.value='0';guncelle();});
    }
    const output=progressHost.querySelector('output');if(output)output.textContent=xi===undefined?t('bilesen.chooseProgress'):fmt(xi,2);
    if(!enabled)body=`<p class="kucuk soluk">${esc(t('bilesen.alloy'))}</p>`;
    else if(result.status==='unavailable')body=`<p role="status">${esc(t('bilesen.unavailable'))}</p>`;
    else{
      if(result.status==='needs-progress')body+=`<p role="status">${esc(t('bilesen.chooseProgress'))}</p>`;
      else{
        body+=`<p class="bilesen-point">${fmtC(st.C)} C · ${fmtT(st.T)} · ${esc(t('bilesen.mass'))}</p><div class="bilesen-bar" aria-hidden="true">${result.parts.map(p=>`<i class="bc-${p.id}" style="flex-basis:${p.fraction*100}%"></i>`).join('')}</div>`;
        body+=result.parts.map(p=>`<div class="bilesen-row"><i class="bilesen-dot bc-${p.id}" aria-hidden="true"></i><span>${esc(t('bilesen.part.'+p.id))}</span><strong>${fmtP(p.fraction)}</strong>${Object.keys(p.phases).length>1?`<small>${esc(t('bilesen.inner'))}: ${Object.entries(p.phases).filter(([,v])=>v>0).map(([f,v])=>`${FAZ[f].kisa} ${fmtP(v/p.fraction)}`).join(' + ')}</small>`:''}</div>`).join('');
        body+=`<details class="bilesen-method" ${open?'open':''}><summary>${esc(t('bilesen.method'))}</summary>${result.formulas.map(f=>`<p><b>${esc(t('bilesen.part.'+f.id))}</b><br><code>${esc(f.text)} = ${fmtP(f.value)}</code></p>`).join('')}${result.notes.map(n=>`<p>${esc(t('bilesen.note.'+n))}</p>`).join('')}<p><a href="https://www.phase-trans.msm.cam.ac.uk/2008/Steel_Microstructure/SM.html" target="_blank" rel="noopener">${esc(t('bilesen.source'))} ↗</a></p></details>`;
      }
    }
    resultHost.innerHTML=body;
    card.querySelector('details')?.addEventListener('toggle',event=>{open=event.currentTarget.open;});
  }
  KANCA.panel.push(render);render();
})();
