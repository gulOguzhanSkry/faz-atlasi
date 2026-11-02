import {GrainVolume,type GrainSeed,type Vec3} from './grain-volume.ts';
import type {EquilibriumResult,PhaseCode} from '../equilibrium.ts';
import type {Arrangement,ConstituentBreakdown,ConstituentId,ConstituentPart,Placement} from '../constituents.ts';
import type {OccupancyBudget} from './phase-occupancy.ts';

/** Illustrative constituent colours; phase colours stay in PHASE_COLORS. */
export const CONSTITUENT_COLORS:Record<ConstituentId,string>={
 'proeutectoid-ferrite':'#e4d3a2',ferrite:'#e4d3a2','tertiary-cementite':'#3f2b3d',pearlite:'#8d7d4f',
 'secondary-cementite':'#55395a',austenite:'#6f95b2','primary-austenite':'#4c7898',ledeburite:'#a3647f',
 'transformed-ledeburite':'#b58399','primary-cementite':'#3a2638',liquid:'#c76c43','delta-ferrite':'#79a69c',
 cementite:'#70536c','primary-solid':'#8b8f8c',
};
export interface ConstituentBudget {id:ConstituentId;label:string;massFraction:number;drawingFraction:number;cells:number;belowResolution:boolean}
interface Cut {value:number;index:number}
interface PartPlan {part:ConstituentPart;cut:Cut;field:FieldName;phases:PhaseCode[];phaseCuts:Cut[];islandCut?:Cut}
type FieldName='interface'|'dendrite'|'plate';
interface Fields {interface:number;dendrite:number;plate:number;lamella:number;fine:number;island:number}

const finite=(n:number)=>Number.isFinite(n);
const before=(value:number,index:number,cut:Cut)=>value<cut.value||value===cut.value&&index<=cut.index;
const END:Cut={value:Infinity,index:Infinity};
function hash(a:number,b:number,c:number,d=0):number {
 let h=Math.imul(a|0,0x27d4eb2d)^Math.imul(b|0,0x165667b1)^Math.imul(c|0,0x9e3779b1)^Math.imul(d|0,0x85ebca6b);
 h^=h>>>15;h=Math.imul(h,0x2c1b3c6d);h^=h>>>12;h=Math.imul(h,0x297a2d39);h^=h>>>15;return (h>>>0)/4294967296;
}
/** Largest-remainder rounding; the counts always sum to `total`. */
function apportion(weights:number[],total:number):number[]{
 const sum=weights.reduce((a,b)=>a+b,0);if(!(sum>0))return weights.map((_,i)=>i===0?total:0);
 const raw=weights.map(w=>w/sum*total),out=raw.map(Math.floor);
 const order=raw.map((r,i)=>({i,r:r-out[i]})).sort((a,b)=>b.r-a.r||a.i-b.i);
 for(let left=total-out.reduce((a,b)=>a+b,0),k=0;k<left;k++)out[order[k].i]++;return out;
}

/**
 * Schematic microconstituent placement. NOT a phase-field or kinetics model.
 *  - grain boundary constituents (proeutectoid α, secondary θ) follow prior γ boundaries;
 *  - pearlite: one lamellar colony orientation per prior γ grain, θ lamellae thin;
 *  - ledeburite: θ matrix with rounded γ / pearlite islands ("leopard skin");
 *  - primary γ: six-armed dendrite cores; primary θ: one plate per grain.
 * Grid counts follow the mass budgets exactly; continuous sampling reproduces
 * the grid labels at voxel centres and resolves boundaries between them.
 */
export class ConstituentOccupancy {
 readonly size:number;
 readonly labels:Uint8Array;readonly partLabels:Uint8Array;
 readonly phases:PhaseCode[]=[];
 parts:ConstituentPart[]=[];budgets:OccupancyBudget[]=[];partBudgets:ConstituentBudget[]=[];
 arrangement:Arrangement='grain-boundary';
 private readonly field:Record<FieldName,Float64Array>;
 private readonly lamella:Float64Array;private readonly fine:Float64Array;private readonly island:Float64Array;
 private readonly seedById=new Map<number,GrainSeed>();
 private plans:PartPlan[]=[];
 private readonly lamellaFrequency:number;private readonly islandFrequency:number;
 constructor(readonly volume:GrainVolume,size=32,surfaceDetail=128){
  if(!Number.isInteger(size)||size<16||size>64||size**3*volume.seeds.length>110000000)throw new RangeError('Occupancy work budget exceeded');
  if(!finite(surfaceDetail)||surfaceDetail<16)throw new RangeError('Invalid surface detail');
  this.size=size;const n=size,total=n**3;
  for(const s of volume.seeds)this.seedById.set(s.id,s);
  // Keep at least ~5 surface samples per lamella period to avoid moiré.
  this.lamellaFrequency=Math.min(22,surfaceDetail/5);this.islandFrequency=Math.min(11,surfaceDetail/9);
  this.labels=new Uint8Array(total);this.partLabels=new Uint8Array(total);
  this.field={interface:new Float64Array(total),dendrite:new Float64Array(total),plate:new Float64Array(total)};
  this.lamella=new Float64Array(total);this.fine=new Float64Array(total);this.island=new Float64Array(total);
  for(let z=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=x+n*(y+n*z),f=this.fields([(x+.5)/n,(y+.5)/n,(z+.5)/n]);
   this.field.interface[i]=f.interface;this.field.dendrite[i]=f.dendrite;this.field.plate[i]=f.plate;
   this.lamella[i]=f.lamella;this.fine[i]=f.fine;this.island[i]=f.island;
  }
 }

 private frames=new Map<number,[Vec3,Vec3,Vec3]>();
 private frame(id:number):[Vec3,Vec3,Vec3]{
  const cached=this.frames.get(id);if(cached)return cached;
  // Deterministic per-grain orientation (crystal frame of the prior γ grain).
  const u=hash(id,1,7)*2-1,phi=hash(id,2,7)*Math.PI*2,psi=hash(id,3,7)*Math.PI*2,s=Math.sqrt(1-u*u);
  const a:Vec3=[s*Math.cos(phi),s*Math.sin(phi),u];
  const ref:Vec3=Math.abs(a[2])<.9?[0,0,1]:[1,0,0];
  const cross=(p:Vec3,q:Vec3):Vec3=>[p[1]*q[2]-p[2]*q[1],p[2]*q[0]-p[0]*q[2],p[0]*q[1]-p[1]*q[0]];
  const norm=(p:Vec3):Vec3=>{const l=Math.hypot(...p);return [p[0]/l,p[1]/l,p[2]/l];};
  let b=norm(cross(a,ref)),c=cross(a,b);
  b=[b[0]*Math.cos(psi)+c[0]*Math.sin(psi),b[1]*Math.cos(psi)+c[1]*Math.sin(psi),b[2]*Math.cos(psi)+c[2]*Math.sin(psi)];c=cross(a,b);
  const out:[Vec3,Vec3,Vec3]=[a,b,c];this.frames.set(id,out);return out;
 }
 private fields(p:Vec3):Fields{
  let a=Infinity,b=Infinity,id=0;
  for(const s of this.volume.seeds){const dx=s.position[0]-p[0],dy=s.position[1]-p[1],dz=s.position[2]-p[2];const d=dx*dx+dy*dy+dz*dz-s.weight;if(d<a){b=a;a=d;id=s.id;}else if(d<b)b=d;}
  const seed=this.seedById.get(id)!,[e1,e2,e3]=this.frame(id);
  const r:Vec3=[p[0]-seed.position[0],p[1]-seed.position[1],p[2]-seed.position[2]],len=Math.hypot(...r);
  const dot=(q:Vec3)=>r[0]*q[0]+r[1]*q[1]+r[2]*q[2];
  // Six <100> dendrite arms: distance shrinks along the grain's cube axes.
  let star=1;if(len>0){const u1=dot(e1)/len,u2=dot(e2)/len,u3=dot(e3)/len,m=u1**4+u2**4+u3**4;star=1-.55*(m-1/3)/(2/3);}
  const lam=(dot(e1)*this.lamellaFrequency+hash(id,4,7));const fineLam=(dot(e2)*this.lamellaFrequency*1.6+hash(id,5,7));
  // Jittered lattice of eutectic islands (normalised nearest-centre distance).
  const K=this.islandFrequency;let island=Infinity;
  const gx=Math.floor(p[0]*K),gy=Math.floor(p[1]*K),gz=Math.floor(p[2]*K);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
   const cx=gx+i,cy=gy+j,cz=gz+k;
   // Full-cell jitter: any section plane cuts islands at unbiased offsets.
   const ox=(cx+hash(cx,cy,cz,1))/K,oy=(cy+hash(cx,cy,cz,2))/K,oz=(cz+hash(cx,cy,cz,3))/K;
   const d=Math.hypot(p[0]-ox,p[1]-oy,p[2]-oz)*K;if(d<island)island=d;
  }
  return {
   interface:Number.isFinite(b)?b-a:0,
   dendrite:Math.sqrt(Math.max(0,a+seed.weight))*star,
   plate:Math.abs(dot(e3)),
   lamella:Math.abs((lam-Math.floor(lam))-.5)*2,
   fine:Math.abs((fineLam-Math.floor(fineLam))-.5)*2,
   island,
  };
 }
 private fieldFor(arrangement:Arrangement,placement:Placement):FieldName{
  if(placement==='plate')return 'plate';
  return arrangement==='dendritic'||arrangement==='primary-plates'?'dendrite':'interface';
 }

 private orders=new Map<string,Uint32Array>();
 /** Cell indices sorted by (value, index); cached per volume. */
 private order(name:string,values:Float64Array):Uint32Array{
  let o=this.orders.get(name);
  if(!o){o=Uint32Array.from({length:values.length},(_,i)=>i);o.sort((a,b)=>values[a]-values[b]||a-b);this.orders.set(name,o);}
  return o;
 }
 apply(result:EquilibriumResult,breakdown:ConstituentBreakdown):void{
  if(result.status!=='resolved')throw new Error('Cannot draw unresolved equilibrium');
  const parts=breakdown.parts;
  if(!parts.length||parts.length>32)throw new Error('Invalid constituent list');
  const positive=result.phases.filter(p=>p.fraction>0);
  for(const p of positive){const s=parts.reduce((a,x)=>a+(x.phases[p.code]??0),0);if(Math.abs(s-p.fraction)>1e-8)throw new Error('Constituents do not reproduce the phase budget');}
  for(const x of parts)for(const code of Object.keys(x.phases) as PhaseCode[])if(!positive.some(p=>p.code===code))throw new Error('Constituent uses a phase absent from the equilibrium result');
  if(Math.abs(parts.reduce((s,p)=>s+p.fraction,0)-1)>1e-8||parts.some(p=>!(p.fraction>0)))throw new Error('Invalid constituent budget');
  const n=this.size,total=n**3,phaseIndex=new Map<PhaseCode,number>();
  this.phases.splice(0,this.phases.length);
  for(const code of ['C','L','A','D','G'] as PhaseCode[])if(positive.some(p=>p.code===code)){phaseIndex.set(code,this.phases.length);this.phases.push(code);}
  const counts=apportion(parts.map(p=>p.fraction),total),phaseCells=new Map<PhaseCode,number>();
  this.plans=[];this.parts=parts;this.arrangement=breakdown.arrangement;
  const NONE=255;this.partLabels.fill(NONE);
  const members:number[][]=parts.map(()=>[]);
  parts.forEach((part,k)=>{
   const field=this.fieldFor(breakdown.arrangement,part.placement),values=this.field[field],order=this.order(field,values);
   const last=k===parts.length-1,want=last?Infinity:counts[k],chosen=members[k];
   for(let j=0;j<order.length&&chosen.length<want;j++){const i=order[j];if(this.partLabels[i]===NONE){this.partLabels[i]=k;chosen.push(i);}}
   const cut:Cut=last?END:chosen.length?{value:values[chosen.at(-1)!],index:chosen.at(-1)!}:{value:-Infinity,index:-1};
   // θ first inside a constituent (lamellae / matrix), then the remaining phase.
   const codes=(Object.keys(part.phases) as PhaseCode[]).sort((a,b)=>(a==='C'?0:1)-(b==='C'?0:1)||this.phases.indexOf(a)-this.phases.indexOf(b));
   this.plans.push({part,cut,field,phases:codes,phaseCuts:[]});
  });
  this.plans.forEach((plan,k)=>{
   const chosen=members[k],codes=plan.phases;
   if(codes.length===1){for(const i of chosen)this.labels[i]=phaseIndex.get(codes[0])!;phaseCells.set(codes[0],(phaseCells.get(codes[0])??0)+chosen.length);plan.phaseCuts.push(END);return;}
   let ordered:number[];
   if(plan.part.placement==='eutectic'){
    const islands=Math.round((plan.part.islandShare??0)*chosen.length),inIsland=new Uint8Array(total);
    const io=this.order('island',this.island);let taken=0,lastIsland=-1;
    for(let j=0;j<io.length&&taken<islands;j++){const i=io[j];if(this.partLabels[i]===k){inIsland[i]=1;taken++;lastIsland=i;}}
    plan.islandCut=lastIsland<0?{value:-Infinity,index:-1}:{value:this.island[lastIsland],index:lastIsland};
    // Matrix: farthest from island centres first. Islands: fine lamellae (pearlite) or uniform γ.
    const matrix=chosen.filter(i=>!inIsland[i]).sort((a,b)=>this.island[b]-this.island[a]||a-b);
    const fo=this.order('fine',this.fine),inside:number[]=[];for(const i of fo)if(inIsland[i]&&this.partLabels[i]===k)inside.push(i);
    ordered=matrix.concat(inside);
   }else{
    const lo=this.order('lamella',this.lamella);ordered=[];for(const i of lo)if(this.partLabels[i]===k)ordered.push(i);
   }
   const inner=apportion(codes.map(c=>plan.part.phases[c]!),ordered.length);let offset=0;
   codes.forEach((code,j)=>{
    const end=offset+inner[j];for(;offset<end;offset++)this.labels[ordered[offset]]=phaseIndex.get(code)!;
    phaseCells.set(code,(phaseCells.get(code)??0)+inner[j]);
    const lastCell=ordered[offset-1];
    plan.phaseCuts.push(j===codes.length-1?END:inner[j]?{value:this.internalScore(plan,this.island[lastCell],this.lamella[lastCell],this.fine[lastCell],lastCell),index:lastCell}:{value:-Infinity,index:-1});
   });
  });
  this.budgets=this.phases.map(code=>{const p=positive.find(x=>x.code===code)!,cells=phaseCells.get(code)??0;return {code,massFraction:p.fraction,drawingFraction:cells/total,cells,belowResolution:cells===0};});
  this.partBudgets=parts.map((p,k)=>{const cells=members[k].length;return {id:p.id,label:p.label,massFraction:p.fraction,drawingFraction:cells/total,cells,belowResolution:cells===0};});
 }
 private internalScore(plan:PartPlan,island:number,lamella:number,fine:number,index:number):number{
  if(plan.part.placement==='eutectic'){
   const inIsland=plan.islandCut?before(island,index,plan.islandCut):false;
   // Matrix cells (far from island centres) are cementite first; then lamellae inside islands.
   return inIsland?fine:-1-island;
  }
  return lamella;
 }
 private locate(point:Vec3):{part:number;phase:PhaseCode}{
  if(!this.plans.length||point.length!==3||point.some(x=>!finite(x)||x<0||x>1))throw new RangeError('Invalid occupancy sample');
  const n=this.size,[x,y,z]=point.map(v=>Math.min(n-1,Math.floor(v*n))),index=x+n*(y+n*z);
  if(this.plans.length===1&&this.plans[0].phases.length===1)return {part:0,phase:this.plans[0].phases[0]};
  const f=this.fields(point);
  let k=this.plans.findIndex(plan=>before(f[plan.field],index,plan.cut));if(k<0)k=this.plans.length-1;
  const plan=this.plans[k];
  if(plan.phases.length===1)return {part:k,phase:plan.phases[0]};
  const s=this.internalScore(plan,f.island,f.lamella,f.fine,index);
  const j=plan.phaseCuts.findIndex(c=>before(s,index,c));
  return {part:k,phase:plan.phases[j<0?plan.phases.length-1:j]};
 }
 sample(point:Vec3):PhaseCode{return this.locate(point).phase;}
 samplePart(point:Vec3):ConstituentPart{return this.plans[this.locate(point).part].part;}
}
