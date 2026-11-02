/* SPDX-License-Identifier: MIT — OG additions to acarcemal/faz-atlasi.
 * References and constituent labels only: never changes the phase boundaries.
 */
'use strict';
globalThis.FazBolgeler=(()=>{
  function references(data){
    const e=data?.invariants?.otektoid,u=data?.invariants?.otektik,c=data?.meta?.W_Fe3C,min=data?.meta?.T_min;
    if(!e||!u||![e.A,e.G,u.G,u.L,c,min,e.T,u.T].every(Number.isFinite)||!(0<=e.A&&e.A<e.G&&e.G<u.G&&u.G<u.L&&u.L<c&&min<e.T&&e.T<u.T))return null;
    const cold=[min,e.T],warm=[e.T,u.T];
    const region=(id,key,short,carbon,temperature,phases)=>({id,key,short,carbon,temperature,phases,center:{carbon:(carbon[0]+carbon[1])/2,temperature:(temperature[0]+temperature[1])/2}});
    return {compositions:[{letter:'P',carbon:e.A},{letter:'S',carbon:e.G},{letter:'E',carbon:u.G},{letter:'C',carbon:u.L}],regions:[
      region('hypoeutectoid','bolge.hypoeutectoid','α+P',[e.A,e.G],cold,['A','C']),
      region('hypereutectoid','bolge.hypereutectoid','P+θ(II)',[e.G,u.G],cold,['A','C']),
      region('hypoeutectic-cold','bolge.hypoeutectic-cold','P+θ(II)+Ld′',[u.G,u.L],cold,['A','C']),
      region('hypereutectic-cold','bolge.hypereutectic-cold','Ld′+θ(I)',[u.L,c],cold,['A','C']),
      region('hypoeutectic-warm','bolge.hypoeutectic-warm','γ+θ(II)+Ld',[u.G,u.L],warm,['G','C']),
      region('hypereutectic-warm','bolge.hypereutectic-warm','Ld+θ(I)',[u.L,c],warm,['G','C'])
    ]};
  }
  const overlap=(a,b,gap=4)=>a.x<b.x+b.width+gap&&a.x+a.width+gap>b.x&&a.y<b.y+b.height+gap&&a.y+a.height+gap>b.y;
  function layout(refs,view,frame,sx,sy,obstacles=[],label=(key)=>key){
    const lines=[],regions=[],occupied=obstacles.filter(b=>[b.x,b.y,b.width,b.height].every(Number.isFinite));
    if(!refs||frame.right-frame.left<30||frame.bottom-frame.top<44)return {lines,regions};
    const width=text=>Array.from(text).length*7.2+16;
    for(const item of refs.compositions){
      const x=sx(item.carbon);if(x<frame.left||x>frame.right||!Number.isFinite(x))continue;
      let box=null;
      // Stagger close P/S labels without shifting the scientific line position.
      for(const dy of [0,24,48]){
        const candidate={x:Math.max(frame.left+2,Math.min(x-10,frame.right-22)),y:frame.bottom-24-dy,width:20,height:20};
        if(candidate.y>frame.top&&!occupied.some(b=>overlap(candidate,b))){box=candidate;occupied.push(box);break;}
      }
      lines.push({...item,x,box});
    }
    for(const item of refs.regions){
      const left=Math.max(frame.left,sx(item.carbon[0])),right=Math.min(frame.right,sx(item.carbon[1]));
      const top=Math.max(frame.top,sy(item.temperature[1])),bottom=Math.min(frame.bottom,sy(item.temperature[0]));
      if(right-left<40||bottom-top<34)continue;
      let chosen=null;
      for(const text of [label(item.key),item.short]){
        const w=width(text);if(w>right-left-12)continue;
        for(const yFraction of [.5,.3,.7,.2,.8,.4,.6]){
          const box={x:(left+right-w)/2,y:top+(bottom-top)*yFraction-13,width:w,height:26};
          if(box.y<top+4||box.y+box.height>bottom-4||occupied.some(b=>overlap(box,b)))continue;
          chosen={...item,text,box};break;
        }
        if(chosen)break;
      }
      if(chosen){regions.push(chosen);occupied.push(chosen.box);}
    }
    return {lines,regions};
  }
  function matches(region,phases){
    if(!Array.isArray(phases)||phases.some(p=>!Number.isFinite(p.oran)||!Number.isFinite(p.w)||p.oran<0))return false;
    const positive=phases.filter(p=>p.oran>1e-10);
    return region.phases.slice().sort().join(',')===positive.map(p=>p.f).sort().join(',')&&Math.abs(phases.reduce((s,p)=>s+p.oran,0)-1)<1e-8&&Math.abs(phases.reduce((s,p)=>s+p.oran*p.w,0)-region.center.carbon)<1e-8;
  }
  return {references,layout,matches,overlap};
})();

if(typeof document!=='undefined'&&typeof KANCA!=='undefined')(()=>{
  const refs=FazBolgeler.references(D),host=document.querySelector('.diyagram-ust');
  if(!refs||!host)return;
  let accepted=false;
  try{accepted=refs.regions.every(r=>FazBolgeler.matches(r,durum(r.center.carbon,r.center.temperature).fazlar));}catch{/* fail closed */}
  const binary=()=>!KAYNAK.alt&&!Object.values(st.alas||{}).some(x=>x!==0);
  const controls=document.createElement('div');controls.className='bolgeler-controls';
  controls.innerHTML=`<label class="bolgeler-toggle"><input type="checkbox" checked><span>${esc(t('bolge.toggle'))}</span></label><details><summary>${esc(t('bolge.method'))}</summary><p>${esc(t('bolge.legend'))}</p><p>${refs.compositions.map(r=>`${r.letter}: ${fmtC(r.carbon)} C`).join(' · ')}</p><div class="bolgeler-list">${refs.regions.map(r=>`<button type="button" data-region-select="${r.id}">${esc(t(r.key))}</button>`).join('')}</div></details><p class="bolgeler-scope" role="status"></p>`;
  host.after(controls);
  const toggle=controls.querySelector('input'),scope=controls.querySelector('.bolgeler-scope');
  function select(region){if(!binary()||!accepted)return;sec(region.center.carbon,region.center.temperature);}
  controls.querySelectorAll('button').forEach(button=>button.addEventListener('click',()=>select(refs.regions.find(r=>r.id===button.dataset.regionSelect))));
  toggle.addEventListener('change',()=>guncelle());
  const ns='http://www.w3.org/2000/svg';
  function node(tag,attrs,parent,text){const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));if(text!==undefined)e.textContent=text;parent.append(e);return e;}
  function sync(){
    const enabled=binary()&&accepted;
    scope.textContent=!accepted?t('bolge.invalid'):binary()?'':t('bolge.alloy');
    toggle.disabled=!enabled;controls.querySelectorAll('button').forEach(b=>b.disabled=!enabled);
  }
  function sourceObstacles(){
    return [...svg.querySelectorAll('text.etiket,text.inv-yazi,.pin-no')].map(e=>{
      try{const b=e.getBBox();if(b.width>0)return {x:b.x-3,y:b.y-3,width:b.width+6,height:b.height+6};}catch{/* DOM test fallback */}
      const size=Number(e.getAttribute('font-size'))||12,text=e.textContent||'',width=text.length*size*.65,x=Number(e.getAttribute('x')),y=Number(e.getAttribute('y'));
      const anchor=e.getAttribute('text-anchor')||'middle';return {x:x-(anchor==='middle'?width/2:anchor==='end'?width:0)-3,y:y-size-3,width:width+6,height:size+6};
    });
  }
  function draw(){
    sync();if(!accepted||!binary()||!toggle.checked)return;
    const frame={left:M.l,right:W-M.r,top:M.t,bottom:H-M.b};
    const boxes=FazBolgeler.layout(refs,st.view,frame,sx,sy,sourceObstacles(),t);
    const layer=node('g',{class:'bolgeler-layer','aria-label':t('bolge.layer')},svg);
    for(const line of boxes.lines){
      node('line',{x1:line.x,x2:line.x,y1:frame.top,y2:frame.bottom,class:'bolgeler-reference','data-carbon':line.carbon,'pointer-events':'none'},layer);
      if(line.box){
        const group=node('g',{class:'bolgeler-letter','pointer-events':'none'},layer);
        node('rect',{...line.box,rx:4},group);node('text',{x:line.box.x+10,y:line.box.y+14,'text-anchor':'middle'},group,line.letter);
        node('title',{},group,`${line.letter}: ${fmtC(line.carbon)} C · ${t('bolge.reference')}`);
      }
    }
    for(const item of boxes.regions){
      const group=node('g',{class:'bolgeler-region',tabindex:0,role:'button','data-region':item.id,'aria-label':t('bolge.select',{name:t(item.key)})},layer);
      node('rect',{...item.box,rx:4},group);node('text',{x:item.box.x+item.box.width/2,y:item.box.y+17,'text-anchor':'middle','pointer-events':'none'},group,item.text);
      node('title',{},group,t('bolge.select',{name:t(item.key)}));
      group.addEventListener('pointerdown',e=>e.stopPropagation());
      group.addEventListener('click',e=>{e.stopPropagation();select(item);});
      group.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();e.stopPropagation();select(item);}});
    }
  }
  KANCA.ust.push(draw);KANCA.panel.push(sync);
  KANCA.uzerinde.push((_x,_y,e)=>Boolean(e?.target?.closest?.('.bolgeler-region')));
  sync();guncelle();
})();
