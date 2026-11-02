/* SPDX-License-Identifier: MIT
 * OG fork of acarcemal/faz-atlasi: deterministic presentation of a slice from
 * the SAME schematic 3D occupancy. No independent 2D phase/morphology solver.
 * Nital appearance is illustrative, uncalibrated and not a measured micrograph.
 */

export const SLICE_STRINGS={
 tr:{
  'kesit.title':'Mikroyapı kesiti',
  'kesit.phases':'Faz renkleri',
  'kesit.constituents':'Bileşen renkleri',
  'kesit.etched':'Dağlanmış görünüm · Nital',
  'kesit.grains':'Tane kimlikleri',
  'kesit.low':'Düşük · lameller çözülmez',
  'kesit.medium':'Orta · lameller seçilir',
  'kesit.high':'Yüksek · koloniye yakınlaş',
  'kesit.hot':'Sıcak hal / kalan östenit: oda sıcaklığında Nital görünümü uygulanmaz. Faz renkleri gösteriliyor.',
  'kesit.unavailable':'Kesit için çözümlenmiş ikili Fe–Fe₃C durumu seçin.',
  'kesit.assumption':'Yavaş denge soğuması varsayımı',
  'kesit.disclaimer':'Şematik · ölçeksiz · ölçülmüş mikrograf değildir',
  'kesit.scale':'Büyütme göreli; tane boyutu ve lamel aralığı fiziksel ölçekte değildir.',
  'kesit.area':'Kesit alan payı, tüm numunenin kütle veya hacim payı değildir.',
  'kesit.effects':'Yüzey dokusu ve optik etkiler',
  'kesit.download':'Bilgi şeritli PNG kaydet',
  'kesit.origin':'3B küple aynı hacim, aynı tohum ve aynı kesit'
 },
 en:{
  'kesit.title':'Microstructure section',
  'kesit.phases':'Phase colours',
  'kesit.constituents':'Constituent colours',
  'kesit.etched':'Etched appearance · Nital',
  'kesit.grains':'Grain identities',
  'kesit.low':'Low · unresolved lamellae',
  'kesit.medium':'Medium · visible lamellae',
  'kesit.high':'High · colony close-up',
  'kesit.hot':'Hot state / residual austenite: room-temperature Nital appearance is not applied. Showing phase colours.',
  'kesit.unavailable':'Select a resolved binary Fe–Fe₃C state to view its section.',
  'kesit.assumption':'Assumed slow equilibrium cooling',
  'kesit.disclaimer':'Schematic · unscaled · not a measured micrograph',
  'kesit.scale':'Magnification is relative; grain size and lamellar spacing are not physically calibrated.',
  'kesit.area':'Section area fraction is not the whole sample mass or volume fraction.',
  'kesit.effects':'Surface texture and optical effects',
  'kesit.download':'Save PNG with information strip',
  'kesit.origin':'Same volume, seed and section as the 3D cube'
 }
};

export function registerSliceTranslations(register){
 if(typeof register!=='function')return;
 register(Object.fromEntries(Object.keys(SLICE_STRINGS.tr).map(k=>[k,[SLICE_STRINGS.tr[k],SLICE_STRINGS.en[k]]])));
}
const tr=(key,lang)=>SLICE_STRINGS[lang==='en'?'en':'tr'][key]||key;
const PHASE_COLOURS={A:'#d7b876',G:'#567f9b',C:'#62446a',D:'#74a18f',L:'#bc6d4d'};
const PART_COLOURS={
 'proeutectoid-ferrite':'#e4d3a2',ferrite:'#e4d3a2','tertiary-cementite':'#3f2b3d',
 pearlite:'#8d7d4f','secondary-cementite':'#55395a',austenite:'#6f95b2',
 'primary-austenite':'#4c7898',ledeburite:'#a3647f','transformed-ledeburite':'#b58399',
 'primary-cementite':'#3a2638',liquid:'#c76c43','delta-ferrite':'#79a69c',cementite:'#70536c'
};
const rgb=hex=>{const v=parseInt(String(hex).replace('#',''),16);return [(v>>16)&255,(v>>8)&255,v&255];};
const clamp=v=>Math.max(0,Math.min(255,Math.round(v)));
function hash(x,y,seed){let h=Math.imul((x|0)^seed,0x45d9f3b)^Math.imul(y|0,0x27d4eb2d);h^=h>>>16;h=Math.imul(h,0x45d9f3b);h^=h>>>16;return (h>>>0)/4294967295;}
function grainColour(id){const hue=hash(id,3,101)*6,c=.31;const f=n=>Math.max(0,Math.min(1,Math.abs(((hue+n)%6)-3)-1));return [f(0),f(4),f(2)].map(v=>Math.round(255*(.35+c*v)));}
function normalize(slice){
 const width=slice.width|0,height=slice.height|0,total=width*height;
 if(width<1||height<1||total>4194304||slice.phaseLabels?.length!==total)throw new RangeError('Invalid section label map');
 return {width,height,total,phaseCodes:slice.phaseCodes||[],partIds:slice.partIds||[],phaseLabels:slice.phaseLabels,
  partLabels:slice.partLabels||new Uint16Array(total),grainLabels:slice.grainLabels||new Uint32Array(total)};
}

/** Return presentation pixels and identity maps. Effects only change RGB tones;
 * phase/part/grain identities are never reallocated to improve an image.
 * The crop mapping is returned explicitly for exact 3D/2D correspondence tests.
 */
export function renderSlicePixels(slice,options={}){
 const source=normalize(slice),{width,height,total}=source;
 const lang=options.lang==='en'?'en':'tr',seed=Number.isFinite(options.seed)?options.seed:(slice.seed??20261101);
 const temperature=options.temperature??slice.temperature,eutectoidTemperature=options.eutectoidTemperature??slice.eutectoidTemperature;
 const magnification=options.magnification||'medium',zoom=magnification==='high'?2.5:magnification==='low'?1:1.35;
 let mode=options.mode||'phases',warning='';
 const hasGamma=source.phaseCodes.includes('G')&&source.phaseLabels.some(v=>source.phaseCodes[v]==='G');
 if(mode==='etched'&&(temperature>eutectoidTemperature+1e-7||hasGamma)){
  mode='phases';warning=tr('kesit.hot',lang);
 }
 const pixels=new Uint8ClampedArray(total*4),phaseLabels=new Uint8Array(total),partLabels=new Uint16Array(total),grainLabels=new Uint32Array(total),sourceIndices=new Uint32Array(total);
 const phaseRGB=Object.fromEntries(Object.entries({...PHASE_COLOURS,...options.phaseColours}).map(([k,v])=>[k,rgb(v)]));
 const partRGB=Object.fromEntries(Object.entries({...PART_COLOURS,...options.partColours}).map(([k,v])=>[k,rgb(v)]));
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){
  const i=x+width*y,sx=Math.min(width-1,Math.max(0,Math.floor(width/2+(x+.5-width/2)/zoom))),sy=Math.min(height-1,Math.max(0,Math.floor(height/2+(y+.5-height/2)/zoom))),s=sx+width*sy;
  const p=source.phaseLabels[s],part=source.partLabels[s],grain=source.grainLabels[s],phase=source.phaseCodes[p],id=source.partIds[part];
  phaseLabels[i]=p;partLabels[i]=part;grainLabels[i]=grain;sourceIndices[i]=s;
  let colour;
  if(mode==='grains')colour=grainColour(grain);
  else if(mode==='constituents')colour=partRGB[id]||phaseRGB[phase]||[142,142,142];
  else if(mode!=='etched')colour=phaseRGB[phase]||[142,142,142];
  else{
   let tone;
   const lamellar=id==='pearlite'||id==='transformed-ledeburite';
   if(id==='pearlite')tone=magnification==='low'?77:phase==='C'?(magnification==='high'?231:188):(magnification==='high'?128:101);
   else if(id==='transformed-ledeburite'||id==='ledeburite')tone=phase==='C'?246:magnification==='low'?73:109;
   else if(phase==='C')tone=247;
   else if(phase==='A')tone=221;
   else tone=145;
   // All effects are deterministic and visual only. No defect-looking scratches
   // are added: a texture must not imply an inclusion absent from the identity map.
   if(options.effects!==false){
    tone+=(hash(grain,7,seed)-.5)*12+(hash(sx,sy,seed)-.5)*6;
    const nx=(x+.5-width/2)/(width/2),ny=(y+.5-height/2)/(height/2);
    tone-=Math.max(0,nx*nx+ny*ny-.2)*8;
    const adjacent=(sx>0&&source.grainLabels[s-1]!==grain)||(sy>0&&source.grainLabels[s-width]!==grain);
    if(adjacent&&!lamellar)tone*=.5;
   }
   colour=[tone,tone,tone];
  }
  // Same phase does not mean same grain. Show the existing 3D grain ownership
  // on solid phase/constituent views as a thin presentation overlay. A line is
  // not a second phase or a cementite film; all identity maps remain unchanged.
  const samePhaseGrainEdge=(sx>0&&source.grainLabels[s-1]!==grain&&source.phaseLabels[s-1]===p)
    ||(sy>0&&source.grainLabels[s-width]!==grain&&source.phaseLabels[s-width]===p);
  if(options.boundaries!==false&&mode!=='etched'&&phase&&phase!=='L'&&samePhaseGrainEdge)
    colour=colour.map(channel=>channel*.58);
  const n=i*4;pixels[n]=clamp(colour[0]);pixels[n+1]=clamp(colour[1]);pixels[n+2]=clamp(colour[2]);pixels[n+3]=255;
 }
 return {width,height,pixels,phaseLabels,partLabels,grainLabels,sourceIndices,phaseCodes:source.phaseCodes,partIds:source.partIds,mode,magnification,warning,seed};
}

/** Canvas adapter, usable by cube face textures, the standalone cut view and PNG
 * export. Set magnification:'low' and effects:false for an exact unzoomed map.
 */
export function renderSlice(canvas,model,options={}){
 const lang=options.lang==='en'?'en':'tr';
 if(model.valid===false||model.available===false||model.status&&model.status!=='resolved'){
  const ctx=canvas.getContext('2d');canvas.width=480;canvas.height=160;
  if(ctx){ctx.fillStyle='#f6f5f1';ctx.fillRect(0,0,480,160);ctx.fillStyle='#39443e';ctx.font='14px system-ui';wrap(ctx,tr('kesit.unavailable',lang),20,45,440,22);}
  return {available:false,warning:tr('kesit.unavailable',lang)};
 }
 const resolution=options.resolution||192,raw=model.slice(options.axis||'z',options.depth??1,resolution,options.extent);
 const data=renderSlicePixels(raw,{phaseColours:raw.colors?.phases,partColours:raw.colors?.constituents,...options,carbon:options.carbon??raw.carbon,temperature:options.temperature??raw.temperature,eutectoidTemperature:options.eutectoidTemperature??raw.eutectoidTemperature});
 const info=options.info!==false,font=Math.max(9,Math.min(14,data.width/28));
 canvas.width=data.width;
 const ctx=canvas.getContext('2d');if(!ctx)return {...data,available:false};
 ctx.font=`${font}px system-ui,sans-serif`;
 const notes=info?[tr('kesit.assumption',lang),tr('kesit.disclaimer',lang),...(data.warning?[data.warning]:[])]:[];
 const noteLines=notes.map(text=>wrappedLines(ctx,text,data.width-20));
 // Reserve space for the actual wrapped lines, including long EN hot-state
 // warnings. Fixed-height strips silently clipped the exported disclaimer.
 const strip=info?Math.ceil(22+font+noteLines.reduce((n,lines)=>n+lines.length*(font+4)+4,0)):0;
 canvas.height=data.height+strip;
 const image=ctx.createImageData(data.width,data.height);image.data.set(data.pixels);ctx.putImageData(image,0,0);
 if(data.mode==='etched'){
  ctx.strokeStyle='rgba(40,40,40,.35)';ctx.lineWidth=1;ctx.strokeRect(.5,.5,data.width-1,data.height-1);
 }
 if(info){
  ctx.fillStyle='#f5f3eb';ctx.fillRect(0,data.height,data.width,strip);ctx.fillStyle='#293a33';
  ctx.font=`600 ${font}px system-ui,sans-serif`;
  const locale=lang==='en'?'en-US':'tr-TR',fmt=(v,d=2)=>Number(v).toLocaleString(locale,{maximumFractionDigits:d});
  const carbon=options.carbon??raw.carbon,temperature=options.temperature??raw.temperature;
  const line=`Fe–C · ${fmt(carbon,3)} ${lang==='en'?'wt% C':'ağ.% C'} · ${fmt(temperature,1)} °C`;
  ctx.fillText(line,10,data.height+font+8);
  ctx.font=`${font}px system-ui,sans-serif`;
  let y=data.height+2*font+13;
  for(const lines of noteLines){for(const line of lines){ctx.fillText(line,10,y);y+=font+4;}y+=4;}
 }
 return {...data,available:true,canvasWidth:canvas.width,canvasHeight:canvas.height};
}
function wrap(ctx,text,x,y,maxWidth,lineHeight){
 for(const line of wrappedLines(ctx,text,maxWidth)){ctx.fillText(line,x,y);y+=lineHeight;}return y-lineHeight;
}
function wrappedLines(ctx,text,maxWidth){const lines=[];let line='';for(const word of String(text).split(' ')){const next=line?line+' '+word:word;if(line&&ctx.measureText(next).width>maxWidth){lines.push(line);line=word;}else line=next;}if(line)lines.push(line);return lines;}

export function saveSlicePNG(canvas,name='fe-c-mikroyapi-kesiti.png'){
 if(typeof document==='undefined')return null;
 const href=canvas.toDataURL('image/png'),link=document.createElement('a');link.href=href;link.download=name;link.click();return href;
}
