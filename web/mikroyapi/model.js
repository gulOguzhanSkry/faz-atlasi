/* SPDX-License-Identifier: MIT — shared geometry for the cube and 2D section.
 * The placement preserves source MASS budgets as illustrative voxel occupancy;
 * it is not a physical volume fraction or kinetic/phase-field simulation. */
import {GrainVolume,generateGrainSeeds} from './tane-hacmi.js';
import {ConstituentOccupancy,CONSTITUENT_COLORS,isFerriteBand} from './bilesen-yerlesimi.js?v=1.3.1';
import {PhaseOccupancy,PHASE_COLORS} from './faz-yerlesimi.js';
export {CONSTITUENT_COLORS,PHASE_COLORS};
export const QUALITY={economy:{grains:24,surface:64,occupancy:24,distance:.12},balanced:{grains:96,surface:128,occupancy:32,distance:.07},fine:{grains:192,surface:192,occupancy:40,distance:.055},maximum:{grains:384,surface:256,occupancy:48,distance:.04}};
const placements={'proeutectoid-ferrite':'boundary',ferrite:'boundary','tertiary-cementite':'boundary',pearlite:'lamellar','secondary-cementite':'boundary',austenite:'core','primary-austenite':'core',ledeburite:'eutectic','transformed-ledeburite':'eutectic','primary-cementite':'plate',liquid:'last','delta-ferrite':'core',cementite:'boundary'};
export function adaptState(result,carbon,temperature,invariants){
 if(result?.status!=='resolved')return null;
 const phases=result.phases.filter(p=>p.oran>0).map(p=>({code:p.f,fraction:p.oran,carbon:p.w}));
 const parts=result.parts.filter(p=>p.fraction>0).map(p=>({id:p.id,label:p.id,fraction:p.fraction,phases:Object.fromEntries(Object.entries(p.phases).filter(([,v])=>v>0)),placement:placements[p.id]||'phase'}));
 const primary=parts.some(p=>p.id==='primary-austenite'||p.id==='ledeburite'||p.id==='transformed-ledeburite');
 const plates=parts.some(p=>p.id==='primary-cementite');
 for(const part of parts)if(part.placement==='eutectic'){
   const other=part.fraction-(part.phases.C||0);
   // Existing source budget decides the island/matrix amount. No fixed ratio.
   const L=result.landmarks,theta=L?.cementite??invariants?.otektoid?.C,eutectic=L?.eutectic??invariants?.otektik?.L,eutectoid=L?.eutectoid??invariants?.otektoid?.G;
   const pearliteShare=(theta-eutectic)/(theta-eutectoid);
   part.islandShare=part.id==='transformed-ledeburite'&&Number.isFinite(pearliteShare)?Math.min(1,Math.max(other/part.fraction,pearliteShare)):Math.min(1,Math.max(0,other/part.fraction));
 }
 return {phaseResult:{status:'resolved',carbon,temperature,phases},breakdown:{basis:result.basis||'phases',arrangement:plates?'primary-plates':primary?'dendritic':'grain-boundary',parts,title:'',formulas:[],notes:[]}};
}
const GEOMETRY_PIXEL_BUDGET=640000;
export function createModel(options={}){
 const seed=options.seed??20261101,quality=QUALITY[options.quality]?options.quality:'balanced',config=QUALITY[quality];
 const generated=generateGrainSeeds({seed,count:config.grains,minimumDistance:config.distance,maxAttempts:50000});
 if(generated.status!=='complete')throw new Error('Grain seed budget exhausted');
 const volume=new GrainVolume(generated.seeds);
 let constituent=null,phase=null,active=null,valid=false,result=null,carbon=.45,temperature=650,revision=0;
 const cache=new Map(),geometryCache=new Map();
 function setState(next,w=next?.carbon??carbon,T=next?.temperature??temperature){
   result=next;carbon=w;temperature=T;cache.clear();revision++;
   const adapted=adaptState(next,w,T,options.invariants);valid=Boolean(adapted);if(!valid){active=null;return false;}
   try{
     // Solid-state grain-boundary states (also above A1, e.g. α+γ or γ+θ) use the constituent engine,
     // so ferrite grains, facet thickness and boundary rules match the slow-cooled view.
     if(next.basis==='slow-cooling'||adapted.breakdown.arrangement==='grain-boundary'){
       constituent??=new ConstituentOccupancy(volume,config.occupancy,config.surface);
       constituent.apply(adapted.phaseResult,adapted.breakdown);active=constituent;
     }else{
       phase??=new PhaseOccupancy(volume,config.occupancy);phase.apply(adapted.phaseResult);active=phase;
     }
   }catch{valid=false;active=null;return false;}
   return true;
 }
 function sample(p){
   const grain=volume.sample(p);
   if(!valid||!active)return {grain,phase:'',part:''};
   const found=active instanceof ConstituentOccupancy?active.locate(p):null;
   const code=found?found.phase:active.sample(p),part=found?active.parts[found.part].id:result.parts.find(p=>(p.phases[code]||0)>0)?.id||code;
   return {grain,phase:code,part};
 }
 /* zoom > 1 samples the central 1/zoom window of the section at full resolution
  * (true magnification: new detail, not enlarged pixels). */
 function slice(axis='z',depth=1,resolution=config.surface,extent={u:1,v:1},zoom=1){
   if(!['x','y','z'].includes(axis)||!Number.isFinite(depth)||depth<0||depth>1||!Number.isInteger(resolution)||resolution<8||resolution>1024||!(zoom>=1&&zoom<=64))throw new RangeError('Invalid section');
   const key=`${revision}:${axis}:${depth}:${resolution}:${extent.u}:${extent.v}:${zoom}`;
   if(cache.has(key))return cache.get(key);
   const n=resolution,total=n*n,phaseCodes=['A','G','C','D','L'],partIds=result?.parts?.map(p=>p.id)||[];
   const phaseLabels=new Uint8Array(total),partLabels=new Uint16Array(total),grainLabels=new Uint32Array(total),etchedBoundary=new Uint8Array(total).fill(1);phaseLabels.fill(255);partLabels.fill(65535);
   // Appearance layer (display only): boundary ownership for drawing lines, and the
   // box-filtered lamella pattern of pearlite. NaN where a pixel is not lamellar.
   const boundaryLabels=new Uint32Array(total),coverage=new Float32Array(total).fill(NaN),thetaShare=new Float32Array(total).fill(NaN),periods=new Float32Array(total).fill(NaN),apparent=new Float32Array(total).fill(NaN),angle=new Float32Array(total).fill(NaN);
   const coord=(u,v)=>[(.5+((u+.5)/n-.5)/zoom)*extent.u,(.5+((v+.5)/n-.5)/zoom)*extent.v];
   const pixel=Math.max(extent.u,extent.v)/(n*zoom),U=axis==='x'?[0,1,0]:[1,0,0],V=axis==='z'?[0,1,0]:[0,0,1];
   const geometryKey=`${axis}:${depth}:${resolution}:${extent.u}:${extent.v}:${zoom}`;
   let geometry=geometryCache.get(geometryKey);
   if(active instanceof ConstituentOccupancy&&!geometry){
     geometry=[];
     for(let v=0;v<n;v++)for(let u=0;u<n;u++){
       const [a,b]=coord(u,v),p=axis==='x'?[depth,a,b]:axis==='y'?[a,depth,b]:[a,b,depth];
       geometry.push({point:p,grain:volume.sample(p),fields:active.lazyFields(p)});
     }
     // Budget by pixels, not entries: six cube faces plus one magnified 512² section fit;
     // larger working sets are dropped instead of exhausting memory.
     let cached=0;for(const g of geometryCache.values())cached+=g.length;
     if(geometryCache.size>=7||cached+geometry.length>GEOMETRY_PIXEL_BUDGET)geometryCache.clear();geometryCache.set(geometryKey,geometry);
   }
   const noBoundaries=active instanceof ConstituentOccupancy&&(active.arrangement==='dendritic'||active.arrangement==='primary-plates');
   const before=(value,index,cut)=>value<cut.value||value===cut.value&&index<=cut.index;
   for(let v=0;v<n;v++)for(let u=0;u<n;u++){
     const [a,b]=coord(u,v),p=axis==='x'?[depth,a,b]:axis==='y'?[a,depth,b]:[a,b,depth],i=u+n*v,s=active instanceof ConstituentOccupancy&&geometry?{grain:0,phase:'',part:''}:sample(p);
     if(active instanceof ConstituentOccupancy&&geometry){
       const g=geometry[i],fields=g.fields,index=g.point.map(x=>Math.min(active.size-1,Math.floor(x*active.size))).reduce((s,x,k)=>s+x*active.size**k,0);
       let k=active.plans.findIndex(plan=>before(fields[plan.field],index,plan.cut));if(k<0)k=active.plans.length-1;
       const plan=active.plans[k],score=active.internalScore(plan,fields.island,fields.lamella,fields.fine,index);
       let phaseIndex=plan.phaseCuts.findIndex(cut=>before(score,index,cut));if(phaseIndex<0)phaseIndex=plan.phases.length-1;
       s.grain=g.grain;s.phase=plan.phases[phaseIndex];s.part=plan.part.id;
       // Prior-austenite boundaries are not etched through ledeburite, primary plates, liquid or dendritic castings.
       etchedBoundary[i]=noBoundaries||['eutectic','plate','last'].includes(plan.part.placement)?0:1;
       // Proeutectoid ferrite replaces the prior γ boundary with ferrite–ferrite boundaries.
       if(!noBoundaries&&isFerriteBand(plan.part))boundaryLabels[i]=0x40000000|(g.ferrite??=active.ferriteGrain(g.point));else boundaryLabels[i]=g.grain;
       if(plan.phases.length>1){
         const look=active.lamellarAppearance(g.point,U,V,pixel,{part:k,fields});
         if(look){coverage[i]=look.coverage;thetaShare[i]=look.thetaShare;periods[i]=look.periodsPerPixel;apparent[i]=look.apparentRatio;angle[i]=look.angle;}
       }
     }else boundaryLabels[i]=s.grain;
     phaseLabels[i]=s.phase?phaseCodes.indexOf(s.phase):255;partLabels[i]=partIds.indexOf(s.part)<0?65535:partIds.indexOf(s.part);grainLabels[i]=s.grain;
   }
   const out={width:n,height:n,axis,depth,phaseLabels,phaseCodes,partLabels,partIds,parts:result?.parts||[],grainLabels,etchedBoundary,boundaryLabels,coverage,thetaShare,periodsPerPixel:periods,apparentRatio:apparent,lamellaAngle:angle,zoom,pixelUm:active instanceof ConstituentOccupancy?pixel*active.unitUm:null,seed,carbon,temperature,eutectoidTemperature:options.eutectoidTemperature??options.invariants?.otektoid?.T??result?.landmarks?.eutectoidT,valid,colors:{phases:PHASE_COLORS,constituents:CONSTITUENT_COLORS}};
   // Six faces plus one section per frame, bounded cache.
   if(cache.size>10)cache.clear();cache.set(key,out);return out;
 }
 return {volume,seed,quality,config,setState,sample,slice,get result(){return result;},get valid(){return valid;},get active(){return active;},get carbon(){return carbon;},get temperature(){return temperature;}};
}
