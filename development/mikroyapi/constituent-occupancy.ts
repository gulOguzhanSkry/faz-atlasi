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
 /** Grid fields are computed on first use: steels never need dendrite, plate or eutectic fields. */
 private seedGrid?:{n:number;cells:GrainSeed[][];maxWeight:number};
 private readonly grids=new Map<keyof Fields,Float64Array>();
 private grid(name:keyof Fields):Float64Array{return this.grids.get(name)??(this.ensure([name]),this.grids.get(name)!);}
 /** Fills every missing grid in one pass so nearest-seed and colony lookups are shared. */
 private ensure(names:(keyof Fields)[]):void{
  const todo=[...new Set(names)].filter(k=>!this.grids.has(k));if(!todo.length)return;
  const n=this.size,out=todo.map(()=>new Float64Array(n**3));
  for(let z=0,i=0;z<n;z++)for(let y=0;y<n;y++)for(let x=0;x<n;x++,i++){const f=this.probe([(x+.5)/n,(y+.5)/n,(z+.5)/n],true);for(let k=0;k<todo.length;k++)out[k][i]=f(todo[k]);}
  todo.forEach((k,j)=>this.grids.set(k,out[j]));
 }
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
  void total;
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
 /** Grain length scale (mean seed spacing) in normalised volume units. */
 private get grainScale():number{return Math.cbrt(1/Math.max(1,this.volume.seeds.length));}
 /** Deterministic trilinear value noise in [0,1]. */
 private noise(x:number,y:number,z:number,salt:number):number{
  const ix=Math.floor(x),iy=Math.floor(y),iz=Math.floor(z),fx=x-ix,fy=y-iy,fz=z-iz;
  const s=(t:number)=>t*t*(3-2*t),u=s(fx),v=s(fy),w=s(fz);
  const h=(a:number,b:number,c:number)=>hash(ix+a,iy+b,iz+c,salt);
  const l=(a:number,b:number,t:number)=>a+(b-a)*t;
  return l(l(l(h(0,0,0),h(1,0,0),u),l(h(0,1,0),h(1,1,0),u),v),l(l(h(0,0,1),h(1,0,1),u),l(h(0,1,1),h(1,1,1),u),v),w);
 }
 /** Fractal (3-octave) noise centred on 0, roughly in [-0.5,0.5]. */
 private fbm(p:Vec3,scale:number,salt:number):number{
  let sum=0,amp=.5,f=scale;for(let o=0;o<3;o++){sum+=amp*(this.noise(p[0]*f,p[1]*f,p[2]*f,salt+o*17)-.5);f*=2.03;amp*=.5;}return sum/.875;
 }
 private unitFromHash(a:number,b:number,c:number):Vec3{const u=hash(a,b,c,41)*2-1,phi=hash(a,b,c,42)*Math.PI*2,s=Math.sqrt(1-u*u);return [s*Math.cos(phi),s*Math.sin(phi),u];}
 private dendriteLimit=Infinity;
 private dendrites=new Map<number,{reach:number;caps:Float64Array;groups:Float64Array}>();
 /** Capsule list of one grain's <100> dendrite: trunks along the six cube half-axes and
  * perpendicular secondary arms; cached per grain. Layout: ax,ay,az,dx,dy,dz,len,ra,rb. */
 private dendriteOf(seed:GrainSeed,frame:[Vec3,Vec3,Vec3]){
  const cached=this.dendrites.get(seed.id);if(cached)return cached;
  const G=this.grainScale,r0=G*.055,lambda2=G*.17,o=seed.position,axes:Vec3[]=[];for(const e of frame)axes.push(e,[-e[0],-e[1],-e[2]]);
  const caps:number[]=[],groups:number[]=[];let reach=0;
  axes.forEach((dir,i)=>{
   const start=caps.length,L1=G*(.62+.3*hash(seed.id,i,61));caps.push(...o,...dir,L1,r0,r0*.3);reach=Math.max(reach,L1+r0);let armReach=r0;
   const others=axes.filter((_,j)=>(j>>1)!==(i>>1));
   for(let s=lambda2*(.6+.3*hash(seed.id,i,62));s<L1*.85;s+=lambda2){
    const base:Vec3=[o[0]+dir[0]*s,o[1]+dir[1]*s,o[2]+dir[2]*s],L2=(L1-s)*.7,ra=r0*.55*(1-.5*s/L1);
    for(const d2 of others){caps.push(...base,...d2,L2,ra,ra*.35);reach=Math.max(reach,Math.hypot(s,L2)+ra);armReach=Math.max(armReach,L2+ra);}
   }
   // Group: [start, end, trunk length, max distance of any arm point from the trunk axis].
   groups.push(start,caps.length,L1,armReach);
  });
  const out={reach,caps:Float64Array.from(caps),groups:Float64Array.from(groups)};this.dendrites.set(seed.id,out);return out;
 }
 /** Signed distance to one grain's dendrite, smooth union of its capsules. Exact: a trunk group
  * (or capsule) is skipped only when its lower bound exceeds the running result plus the blend
  * width, where the smooth minimum can no longer change the value. Groups run nearest first. */
 private dendriteSdf(seed:GrainSeed,frame:[Vec3,Vec3,Vec3],p:Vec3,limit=Infinity):number{
  const {caps,groups}=this.dendriteOf(seed,frame),k=this.grainScale*.012;
  const order:[number,number][]=[];
  for(let g=0;g<groups.length;g+=4){
   const s0=groups[g],trunkLen=groups[g+2],armReach=groups[g+3];
   const tx=p[0]-caps[s0],ty=p[1]-caps[s0+1],tz=p[2]-caps[s0+2],tt=Math.max(0,Math.min(trunkLen,tx*caps[s0+3]+ty*caps[s0+4]+tz*caps[s0+5]));
   order.push([Math.hypot(tx-caps[s0+3]*tt,ty-caps[s0+4]*tt,tz-caps[s0+5]*tt)-armReach,g]);
  }
  order.sort((x,y)=>x[0]-y[0]);
  let acc=Infinity;
  for(const [lb,g] of order){
   if(lb>Math.min(acc,limit)+k)break;
   for(let c=groups[g];c<groups[g+1];c+=9){
    const px=p[0]-caps[c],py=p[1]-caps[c+1],pz=p[2]-caps[c+2],len=caps[c+6],ra=caps[c+7],rb=caps[c+8];
    const lbc=Math.sqrt(px*px+py*py+pz*pz)-len-ra;if(lbc>Math.min(acc,limit)+k)continue;
    const t=Math.max(0,Math.min(len,px*caps[c+3]+py*caps[c+4]+pz*caps[c+5]));
    const d=Math.hypot(px-caps[c+3]*t,py-caps[c+4]*t,pz-caps[c+5]*t)-(ra+(rb-ra)*(len>0?t/len:0));
    if(!Number.isFinite(acc)){acc=d;continue;}const h=Math.max(k-Math.abs(acc-d),0)/k;acc=Math.min(acc,d)-h*h*k*.25;
   }
  }
  return acc;
 }
 private nearest(p:Vec3){
  const g=this.seedGrid??=(()=>{const n=Math.max(1,Math.round(Math.cbrt(this.volume.seeds.length/2)));const cells:GrainSeed[][]=Array.from({length:n**3},()=>[]);let maxWeight=0;
   for(const s of this.volume.seeds){const c=s.position.map(v=>Math.min(n-1,Math.floor(v*n)));cells[c[0]+n*(c[1]+n*c[2])].push(s);maxWeight=Math.max(maxWeight,s.weight);}return {n,cells,maxWeight};})();
  const n=g.n,cx=Math.min(n-1,Math.floor(p[0]*n)),cy=Math.min(n-1,Math.floor(p[1]*n)),cz=Math.min(n-1,Math.floor(p[2]*n));
  let a=Infinity,b=Infinity,id=0,id2=0;
  const visit=(s:GrainSeed)=>{const dx=s.position[0]-p[0],dy=s.position[1]-p[1],dz=s.position[2]-p[2];const d=dx*dx+dy*dy+dz*dz-s.weight;
   if(d<a||d===a&&s.id<id){b=a;id2=id;a=d;id=s.id;}else if(d<b||d===b&&s.id<id2){b=d;id2=s.id;}};
  for(let ring=0;ring<=n;ring++){
   for(let i=cx-ring;i<=cx+ring;i++)for(let j=cy-ring;j<=cy+ring;j++)for(let k=cz-ring;k<=cz+ring;k++){
    if(Math.max(Math.abs(i-cx),Math.abs(j-cy),Math.abs(k-cz))!==ring||i<0||j<0||k<0||i>=n||j>=n||k>=n)continue;
    for(const s of g.cells[i+n*(j+n*k)])visit(s);
   }
   // Any seed outside the searched cube is at least `gap` away.
   const gap=Math.max(0,Math.min(p[0]-(cx-ring)/n,(cx+ring+1)/n-p[0],p[1]-(cy-ring)/n,(cy+ring+1)/n-p[1],p[2]-(cz-ring)/n,(cz+ring+1)/n-p[2]));
   if(Number.isFinite(b)&&gap*gap-g.maxWeight>b)break;
  }
  return {a,b,id,id2};
 }
 private warped(p:Vec3):Vec3{
  // Gently warped coordinates: lamellae are not ruler-straight in real sections.
  const G=this.grainScale,amp=.35/this.lamellaFrequency;
  return [p[0]+amp*this.fbm(p,2/G,101),p[1]+amp*this.fbm(p,2/G,131),p[2]+amp*this.fbm(p,2/G,161)];
 }
 private fInterface(p:Vec3,nr:{a:number;b:number}):number{
  // Prior-grain boundary distance with irregular thickness (allotriomorphs, films).
  return (Number.isFinite(nr.b)?nr.b-nr.a:0)*(1+.7*this.fbm(p,3/this.grainScale,211));
 }
 private fDendrite(p:Vec3,nr:{id:number;id2:number},limit=Infinity):number{
  // Exact union over the two nearest grains so arms are not cut by the Voronoi facet; the
  // second grain is evaluated only where it can be closer (its own bound sphere).
  const d=this.dendriteSdf(this.seedById.get(nr.id)!,this.frame(nr.id),p,limit);
  if(!nr.id2)return d;
  const s2=this.seedById.get(nr.id2)!,den=this.dendriteOf(s2,this.frame(nr.id2));
  const bound=Math.hypot(p[0]-s2.position[0],p[1]-s2.position[1],p[2]-s2.position[2])-den.reach;
  if(bound>=Math.min(d,limit))return d;
  return Math.min(d,this.dendriteSdf(s2,this.frame(nr.id2),p,Math.min(d,limit)));
 }
 private fPlate(p:Vec3,nr:{id:number;id2:number}):number{
  // Plates of the two nearest grains, so a plate is not cut by the Voronoi facet.
  return Math.min(this.plateOf(nr.id,p),nr.id2?this.plateOf(nr.id2,p):Infinity);
 }
 private plateOf(id:number,p:Vec3):number{
  // Primary cementite: long, thin, finite plates (one to three per grain).
  const seed=this.seedById.get(id)!,[e1,e2,e3]=this.frame(id),G=this.grainScale;
  const r:Vec3=[p[0]-seed.position[0],p[1]-seed.position[1],p[2]-seed.position[2]],dot=(q:Vec3)=>r[0]*q[0]+r[1]*q[1]+r[2]*q[2];
  const plate=(nrm:Vec3,u:Vec3,w:Vec3,L:number,W:number,shift:number)=>Math.abs(dot(nrm)-shift)/G+4*Math.max(0,Math.max(Math.abs(dot(u))/L,Math.abs(dot(w))/W)-1);
  let best=plate(e3,e1,e2,G*(1.3+.5*hash(id,5,92)),G*.5,0);
  if(hash(id,5,91)<.7)best=Math.min(best,plate(e1,e2,e3,G*(1.1+.5*hash(id,5,93)),G*.4,G*.15*(hash(id,5,94)-.5)));
  if(hash(id,5,95)<.35)best=Math.min(best,plate(e2,e3,e1,G*1.1,G*.35,G*.2*(hash(id,5,96)-.5)));
  return best;
 }
 private fLamella(p:Vec3,nr:{id:number}):number{
  // Pearlite colonies: 2-5 sub-colonies per prior austenite grain, each with its own lamella normal.
  const id=nr.id,seed=this.seedById.get(id)!,G=this.grainScale;
  const colonies=2+Math.floor(hash(id,9,9)*4);let colony=0,best=Infinity;
  for(let c=0;c<colonies;c++){const off=this.unitFromHash(id,c,71),rad=G*.42*hash(id,c,72);const cx=seed.position[0]+off[0]*rad-p[0],cy=seed.position[1]+off[1]*rad-p[1],cz=seed.position[2]+off[2]*rad-p[2];const d=cx*cx+cy*cy+cz*cz;if(d<best){best=d;colony=c;}}
  const n=this.unitFromHash(id,colony,73),q=this.warped(p);
  const lam=(n[0]*q[0]+n[1]*q[1]+n[2]*q[2])*this.lamellaFrequency+hash(id,colony,74);
  return Math.abs((lam-Math.floor(lam))-.5)*2;
 }
 private fColony(p:Vec3){
  // Ledeburite: eutectic colonies grow radially; gamma rods are broken spokes whose spacing
  // coarsens with distance from the colony centre (lambda ~ rho * dAngle). The converging
  // centre uses a fine isotropic pattern instead of a sunburst.
  const Kc=Math.max(2,this.islandFrequency/3.2);let ec:Vec3=[0,0,0],eid=[0,0,0],ed=Infinity;
  const gx=Math.floor(p[0]*Kc),gy=Math.floor(p[1]*Kc),gz=Math.floor(p[2]*Kc);
  for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){
   const cx=gx+i,cy=gy+j,cz=gz+k,c:Vec3=[(cx+hash(cx,cy,cz,1))/Kc,(cy+hash(cx,cy,cz,2))/Kc,(cz+hash(cx,cy,cz,3))/Kc];
   const d=Math.hypot(p[0]-c[0],p[1]-c[1],p[2]-c[2]);if(d<ed){ed=d;ec=c;eid=[cx,cy,cz];}
  }
  return {ec,eid,Kc};
 }
 private fIsland(p:Vec3,col:{ec:Vec3;eid:number[];Kc:number}):number{
  const {ec,eid,Kc}=col,salt=eid[0]*7+eid[1]*13+eid[2]*29;
  const eFrame=this.frame(1e6+(((eid[0]*73856093)^(eid[1]*19349663)^(eid[2]*83492791))>>>0)%1e6);
  const v:Vec3=[p[0]-ec[0],p[1]-ec[1],p[2]-ec[2]],rho=Math.hypot(...v)||1e-9,rn=rho*Kc;
  const dv=(q:Vec3)=>(v[0]*q[0]+v[1]*q[1]+v[2]*q[2])/rho;
  const uz=dv(eFrame[2]),ux=dv(eFrame[0]),uy=dv(eFrame[1]);
  const Nz=10,Nphi=20,dAng=Math.sqrt(4*Math.PI/(Nz*Nphi));
  const iz0=Math.min(Nz-1,Math.floor((uz+1)/2*Nz)),phi=(Math.atan2(uy,ux)+Math.PI*2)%(Math.PI*2),ip0=Math.floor(phi/(Math.PI*2)*Nphi);
  let spokes=Infinity;
  for(let di=-1;di<=1;di++)for(let dj=-1;dj<=1;dj++){
   const iz=iz0+di;if(iz<0||iz>=Nz)continue;const ip=((ip0+dj)%Nphi+Nphi)%Nphi,spoke=iz*Nphi+ip;
   const zc=-1+(iz+.15+.7*hash(salt,spoke,81))*2/Nz,pc=(ip+.15+.7*hash(salt,spoke,82))*Math.PI*2/Nphi,sc=Math.sqrt(1-zc*zc);
   const chord=Math.hypot(ux-sc*Math.cos(pc),uy-sc*Math.sin(pc),uz-zc);
   // Finite rods: log-spaced segments along the radius; ~22 % of segments are gaps.
   const seg=Math.floor(Math.log(rn+.05)/(dAng*2.6)+hash(salt,spoke,83));
   const gap=hash(salt,spoke,seg+97)<.22?1.5:0,radius=.75+.5*hash(salt,spoke,84);
   const score=chord/(dAng*radius)+gap;if(score<spokes)spokes=score;
  }
  // Isotropic fine spots near the colony centre, blended in smoothly.
  const Kf=Kc*9,fx=Math.floor(p[0]*Kf),fy=Math.floor(p[1]*Kf),fz=Math.floor(p[2]*Kf);let spot=Infinity;
  if(rn<.4)for(let i=-1;i<=1;i++)for(let j=-1;j<=1;j++)for(let k=-1;k<=1;k++){const cx=fx+i,cy=fy+j,cz=fz+k;const d=Math.hypot(p[0]-(cx+hash(cx,cy,cz,4))/Kf,p[1]-(cy+hash(cx,cy,cz,5))/Kf,p[2]-(cz+hash(cx,cy,cz,6))/Kf)*Kf;if(d<spot)spot=d;}
  const t=Math.min(1,Math.max(0,(rn-.2)/.2)),island=rn>=.4?spokes:(1-t)*spot*1.6+t*spokes;
  return island;
 }
 /** Fine lamellae inside transformed-ledeburite islands; one orientation per eutectic colony. */
 private fFine(p:Vec3,col:{eid:number[]}):number{
  const {eid}=col,fineN=this.unitFromHash(eid[0]+3,eid[1]+5,eid[2]+7),q=this.warped(p),fineLam=(fineN[0]*q[0]+fineN[1]*q[1]+fineN[2]*q[2])*this.lamellaFrequency*1.6+hash(eid[0],eid[1],eid[2],75);
  return Math.abs((fineLam-Math.floor(fineLam))-.5)*2;
 }
 private fields(p:Vec3):Fields{
  const nr=this.nearest(p),col=this.fColony(p);
  return {interface:this.fInterface(p,nr),dendrite:this.fDendrite(p,nr),plate:this.fPlate(p,nr),lamella:this.fLamella(p,nr),fine:this.fFine(p,col),island:this.fIsland(p,col)};
 }
 /** Lazy field access for continuous sampling: only the fields a plan actually needs are computed. */
 private probe(p:Vec3,exact=false):(name:keyof Fields)=>number{
  let nr:ReturnType<ConstituentOccupancy['nearest']>|undefined,col:ReturnType<ConstituentOccupancy['fColony']>|undefined;const cache:Partial<Fields>={};
  const near=()=>nr??=this.nearest(p);
  // Continuous sampling only compares against plan cuts: the dendrite distance may stop early once
  // it is provably beyond the largest finite cut (the classification is then unchanged).
  const limit=exact?Infinity:this.dendriteLimit;
  return name=>cache[name]??=(name==='interface'?this.fInterface(p,near()):name==='dendrite'?this.fDendrite(p,near(),Number.isFinite(limit)?limit+1e-9:Infinity):name==='plate'?this.fPlate(p,near()):name==='lamella'?this.fLamella(p,near()):name==='island'?this.fIsland(p,col??=this.fColony(p)):this.fFine(p,col??=this.fColony(p)));
 }
 /** Exact, lazily evaluated fields at one point. Safe to cache across temperature changes. */
 lazyFields(p:Vec3):Fields{
  const f=this.probe(p,true),out={} as Fields;
  for(const k of ['interface','dendrite','plate','lamella','fine','island'] as const)Object.defineProperty(out,k,{get:()=>f(k),enumerable:true});
  return out;
 }
 /** Prior-austenite grain boundaries are etched lines only where the constituent has them:
  * never inside ledeburite (continuous cementite matrix), primary cementite plates or liquid. */
 drawsGrainBoundary(point:Vec3):boolean{
  const part=this.samplePart(point);
  // Dendritic structures: prior-grain facets are a construction aid, not etched boundaries.
  if(this.arrangement==='dendritic'||this.arrangement==='primary-plates')return false;
  return !['eutectic','plate','last'].includes(part.placement);
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
  this.ensure(parts.flatMap(p=>{const multi=Object.keys(p.phases).length>1;return [this.fieldFor(breakdown.arrangement,p.placement),...(!multi?[]:p.placement==='eutectic'?['island','fine'] as const:['lamella'] as const)];}));
  parts.forEach((part,k)=>{
   const field=this.fieldFor(breakdown.arrangement,part.placement),values=this.grid(field),order=this.order(field,values);
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
    const islandGrid=this.grid('island'),io=this.order('island',islandGrid);let taken=0,lastIsland=-1;
    for(let j=0;j<io.length&&taken<islands;j++){const i=io[j];if(this.partLabels[i]===k){inIsland[i]=1;taken++;lastIsland=i;}}
    plan.islandCut=lastIsland<0?{value:-Infinity,index:-1}:{value:islandGrid[lastIsland],index:lastIsland};
    // Matrix: farthest from island centres first. Islands: fine lamellae (pearlite) or uniform γ.
    const matrix=chosen.filter(i=>!inIsland[i]).sort((a,b)=>islandGrid[b]-islandGrid[a]||a-b);
    const fo=this.order('fine',this.grid('fine')),inside:number[]=[];for(const i of fo)if(inIsland[i]&&this.partLabels[i]===k)inside.push(i);
    ordered=matrix.concat(inside);
   }else{
    const lo=this.order('lamella',this.grid('lamella'));ordered=[];for(const i of lo)if(this.partLabels[i]===k)ordered.push(i);
   }
   const inner=apportion(codes.map(c=>plan.part.phases[c]!),ordered.length);let offset=0;
   codes.forEach((code,j)=>{
    const end=offset+inner[j];for(;offset<end;offset++)this.labels[ordered[offset]]=phaseIndex.get(code)!;
    phaseCells.set(code,(phaseCells.get(code)??0)+inner[j]);
    const lastCell=ordered[offset-1];
    plan.phaseCuts.push(j===codes.length-1?END:inner[j]?{value:this.internalScore(plan,plan.part.placement==='eutectic'?this.grid('island')[lastCell]:0,plan.part.placement==='eutectic'?0:this.grid('lamella')[lastCell],plan.part.placement==='eutectic'?this.grid('fine')[lastCell]:0,lastCell),index:lastCell}:{value:-Infinity,index:-1});
   });
  });
  const cuts=this.plans.filter(x=>x.field==='dendrite'&&Number.isFinite(x.cut.value)).map(x=>x.cut.value);
  this.dendriteLimit=cuts.length?Math.max(...cuts):Infinity;
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
  const f=this.probe(point);
  let k=this.plans.findIndex(plan=>before(f(plan.field),index,plan.cut));if(k<0)k=this.plans.length-1;
  const plan=this.plans[k];
  if(plan.phases.length===1)return {part:k,phase:plan.phases[0]};
  const s=plan.part.placement==='eutectic'?this.internalScore(plan,f('island'),0,f('fine'),index):this.internalScore(plan,0,f('lamella'),0,index);
  const j=plan.phaseCuts.findIndex(c=>before(s,index,c));
  return {part:k,phase:plan.phases[j<0?plan.phases.length-1:j]};
 }
 sample(point:Vec3):PhaseCode{return this.locate(point).phase;}
 samplePart(point:Vec3):ConstituentPart{return this.plans[this.locate(point).part].part;}
}
