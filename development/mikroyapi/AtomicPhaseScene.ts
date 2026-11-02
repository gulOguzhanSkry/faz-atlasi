import * as THREE from 'three';
import {crystalImages,exampleCarbon,carbonNeighbours,classifySite,ironRadius,interstitialSummary,siteImages,phaseCrystal,OCTAHEDRAL,TETRAHEDRAL,REFERENCE_LATTICE,CARBON_RADIUS_ANGSTROM,type PhaseCrystal,type Position,type SiteClass} from '../../domain/phase-atlas/crystal-structures.ts';
import type {LessonView} from '../../domain/phase-atlas/atomic-lessons.ts';
import {idealInterstitialRadius,carbonImages,type CarbonPopulation} from '../../domain/phase-atlas/carbon-population.ts';
import {coordinationHull} from '../../domain/phase-atlas/coordination-polyhedron.ts';
/** Drawing uses fixed reference/prototype coordinates; no atomic simulation. */
export function drawAtomicPhase(group:THREE.Group,crystal:PhaseCrystal,repeats:number,showCarbon:boolean,showHoles:boolean,showNeighbours:boolean,population?:CarbonPopulation,showVolumes=false,compact=false):void {
 const n=crystal.periodic?repeats:1,scale=1.18/(Math.max(...crystal.cell)*n);
 const world=(p:Position)=>new THREE.Vector3((p[0]-n/2)*crystal.cell[0]*scale,(p[2]-n/2)*crystal.cell[2]*scale,-(p[1]-n/2)*crystal.cell[1]*scale);
 const atoms=crystalImages(crystal,repeats);let example=exampleCarbon(crystal,repeats);
 if(population){example=population.positions[0]??population.sites.reduce((best,p)=>p.reduce((s,v,i)=>s+(v-n/2)**2,0)<best.reduce((s,v,i)=>s+(v-n/2)**2,0)?p:best,population.sites[0]);}
 if(showCarbon&&crystal.code!=='C'){for(const position of population?carbonImages(population.positions,n):example?[example]:[])atoms.push({element:'C',position,role:'example'});}
 function spheres(positions:Position[],color:string,radius:number,opacity=1,wireframe=false){
  if(!positions.length)return;
  const geometry=new THREE.SphereGeometry(radius,24,16),material=new THREE.MeshStandardMaterial({color,metalness:.2,roughness:.35,transparent:opacity<1,opacity,wireframe});
  const mesh=new THREE.InstancedMesh(geometry,material,positions.length),matrix=new THREE.Matrix4();
  positions.forEach((p,i)=>{const v=world(p);mesh.setMatrixAt(i,matrix.makeTranslation(v.x,v.y,v.z));});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();group.add(mesh);
 }
 const ideal=idealInterstitialRadius(crystal);
 const radius=ideal?ideal.iron*scale*(compact?.9:.46):crystal.code==='C'?.039/repeats:.044;
 spheres(atoms.filter(a=>a.element==='Fe').map(a=>a.position),'#809cae',radius);
 if(showCarbon)spheres(atoms.filter(a=>a.element==='C').map(a=>a.position),'#f3b74e',radius*.6);
 const lines:number[]=[];
 if(crystal.periodic)for(let axis=0;axis<3;axis++)for(let a=0;a<=n;a++)for(let b=0;b<=n;b++){
  const other=[0,1,2].filter(v=>v!==axis),p=[0,0,0],q=[0,0,0];p[other[0]]=q[other[0]]=a;p[other[1]]=q[other[1]]=b;q[axis]=n;lines.push(...world(p as unknown as Position).toArray(),...world(q as unknown as Position).toArray());
 }
 if(lines.length){const geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3));group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0x68818a,transparent:true,opacity:.45})));}
 if(crystal.periodic&&showHoles&&crystal.code!=='C'){
  const holes:Position[]=[];for(const p of crystal.interstices)for(let x=0;x<n;x++)for(let y=0;y<n;y++)for(let z=0;z<n;z++){
   const q:Position=[p[0]+x,p[1]+y,p[2]+z];const occupied=showCarbon&&(population?population.positions:example?[example]:[]).some(c=>c.every((v,i)=>Math.abs(v-q[i])<1e-8));if(!occupied)holes.push(q);
  }spheres(holes,'#3ea09c',ideal?ideal.void*scale:radius*.65,.28,true);
 }
 if(crystal.periodic&&showVolumes&&example){
  const centres=showHoles?crystal.interstices.map(p=>[p[0]+Math.floor(example![0]),p[1]+Math.floor(example![1]),p[2]+Math.floor(example![2])] as Position):[example];
  for(const centre of centres){
   const neighbours=carbonNeighbours(crystal,centre),positions=neighbours.map(p=>world(p.position)),geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(positions.flatMap(p=>p.toArray()),3));
   geometry.setIndex(coordinationHull(neighbours.map(p=>[p.position[0]*crystal.cell[0],p.position[1]*crystal.cell[1],p.position[2]*crystal.cell[2]])));
   geometry.computeVertexNormals();group.add(new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:0x48b9ac,transparent:true,opacity:.11,side:THREE.DoubleSide,depthWrite:false})));
   group.add(new THREE.LineSegments(new THREE.EdgesGeometry(geometry),new THREE.LineBasicMaterial({color:0x34998e,transparent:true,opacity:.6})));
   if(ideal)spheres([centre],'#48b9ac',ideal.void*scale,.16);
  }
 }
 if(showCarbon&&showNeighbours&&example){
  const neighbours=carbonNeighbours(crystal,example),geometry=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(neighbours.flatMap(p=>[...world(example).toArray(),...world(p.position).toArray()]),3));
  group.add(new THREE.LineSegments(geometry,new THREE.LineBasicMaterial({color:0xd18b26,transparent:true,opacity:.8})));
  // Neighbours across the boundary are included as translucent periodic images.
  spheres(neighbours.filter(p=>p.position.some(v=>v<0||v>n)).map(p=>p.position),'#809cae',radius,.45);
 }
}

/* ---------- Guided lesson drawing ---------- */
export const LESSON_COLORS={corner:'#7f9db0',edge:'#8a7ac2',face:'#3d7fb1',body:'#c47a45',octa:'#2fa69a',tetra:'#8a63c9',carbon:'#f3b74e',near:'#d36b1f',far:'#8a969b'} as const;
type Frame={world:(p:Position)=>THREE.Vector3;unit:number};
/** Cell coordinates → world, with an optional offset along world x. */
function frame(crystal:PhaseCrystal,n:number,unit:number,shift=0):Frame{
 // Compare view is meant for a front camera: cells sit side by side along world x.
 const across=new THREE.Vector3(shift,0,0);
 return {unit,world:p=>new THREE.Vector3((p[0]-n/2)*crystal.cell[0]*unit,(p[2]-n/2)*crystal.cell[2]*unit,-(p[1]-n/2)*crystal.cell[1]*unit).add(across)};
}
function addSpheres(group:THREE.Group,f:Frame,positions:Position[],color:string,radius:number,opts:{opacity?:number;clip?:THREE.Plane[];side?:THREE.Side;name?:string}={}){
 if(!positions.length||radius<=0)return;
 const opacity=opts.opacity??1,geometry=new THREE.SphereGeometry(radius,28,18);
 const material=new THREE.MeshStandardMaterial({color,metalness:.15,roughness:.4,transparent:opacity<1,opacity,depthWrite:opacity>=1,side:opts.side??THREE.FrontSide,clippingPlanes:opts.clip??null});
 const mesh=new THREE.InstancedMesh(geometry,material,positions.length),m=new THREE.Matrix4();
 positions.forEach((p,i)=>{const v=f.world(p);mesh.setMatrixAt(i,m.makeTranslation(v.x,v.y,v.z));});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.name=opts.name??'';group.add(mesh);
}
function addTetrahedra(group:THREE.Group,f:Frame,positions:Position[],radius:number){
 if(!positions.length)return;
 const geometry=new THREE.TetrahedronGeometry(radius),material=new THREE.MeshStandardMaterial({color:LESSON_COLORS.tetra,transparent:true,opacity:.55,depthWrite:false,flatShading:true});
 const mesh=new THREE.InstancedMesh(geometry,material,positions.length),m=new THREE.Matrix4();
 positions.forEach((p,i)=>{const v=f.world(p);mesh.setMatrixAt(i,m.makeTranslation(v.x,v.y,v.z));});mesh.instanceMatrix.needsUpdate=true;mesh.computeBoundingSphere();mesh.name='tetra';group.add(mesh);
}
function cellEdges(group:THREE.Group,f:Frame,n:number,opacity=.55){
 const lines:number[]=[];
 for(let axis=0;axis<3;axis++)for(let a=0;a<=n;a++)for(let b=0;b<=n;b++){const o=[0,1,2].filter(v=>v!==axis),p=[0,0,0],q=[0,0,0];p[o[0]]=q[o[0]]=a;p[o[1]]=q[o[1]]=b;q[axis]=n;lines.push(...f.world(p as unknown as Position).toArray(),...f.world(q as unknown as Position).toArray());}
 group.add(new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(lines,3)),new THREE.LineBasicMaterial({color:0x4f6870,transparent:true,opacity})));
}
/** Six planes keeping only the inside of the n³ block (world space). */
function boxPlanes(f:Frame,n:number):THREE.Plane[]{
 const a=f.world([0,0,0]),b=f.world([n,n,n]),min=a.clone().min(b),max=a.clone().max(b);
 return [new THREE.Plane(new THREE.Vector3(1,0,0),-min.x),new THREE.Plane(new THREE.Vector3(-1,0,0),max.x),new THREE.Plane(new THREE.Vector3(0,1,0),-min.y),new THREE.Plane(new THREE.Vector3(0,-1,0),max.y),new THREE.Plane(new THREE.Vector3(0,0,1),-min.z),new THREE.Plane(new THREE.Vector3(0,0,-1),max.z)];
}
function lessonCarbon(crystal:PhaseCrystal):Position|null{
 if(crystal.code==='G')return [.5,.5,.5];
 if(crystal.code==='A'||crystal.code==='D')return [.5,.5,1];
 return null;
}
function drawLessonCell(group:THREE.Group,crystal:PhaseCrystal,view:LessonView,f:Frame){
 // Cementite cell is in Å: draw Fe at 0,55 Å and C at 0,39 Å so the 16 atoms stay readable (ball-and-stick, not size).
 const n=view.repeats,R=ironRadius(crystal),iron=R!==null?R*crystal.cell[0]*f.unit:.55*f.unit;
 const atoms=crystalImages(crystal,n),fe=atoms.filter(a=>a.element==='Fe').map(a=>a.position),c=atoms.filter(a=>a.element==='C').map(a=>a.position);
 const feRadius=view.dim?iron*.32:iron*(view.shares?1:.46);
 if(view.shares&&n===1){
  // Opaque part inside the cell, translucent remainder outside: corner ⅛, edge ¼, face ½, body 1.
  const clip=boxPlanes(f,n),byClass=new Map<SiteClass,Position[]>();
  for(const p of fe){const k=classifySite(p);byClass.set(k,[...(byClass.get(k)??[]),p]);}
  for(const [k,list] of byClass){addSpheres(group,f,list,LESSON_COLORS[k],feRadius,{clip,side:THREE.DoubleSide,name:'share-'+k});addSpheres(group,f,list,LESSON_COLORS[k],feRadius*1.002,{opacity:.07,name:'ghost-'+k});}
 }else addSpheres(group,f,fe,LESSON_COLORS.corner,feRadius,{opacity:view.dim?.55:1,name:'fe'});
 if(crystal.code==='C')addSpheres(group,f,c,LESSON_COLORS.carbon,iron*.7,{name:'c'});
 cellEdges(group,f,n);
 if(R===null)return;
 // Ratios r/R are scale-free: take them from the unit-cell reference, not the Å-scaled copy.
 const summary=interstitialSummary(phaseCrystal(crystal.code)),family=crystal.code==='G'?'FCC':'BCC',feA=R*crystal.cell[0]*f.unit;
 if(view.holes!=='none'){
  const octa=siteImages(OCTAHEDRAL[family],n),carbon=view.carbon?lessonCarbon(crystal):null;
  const free=octa.filter(p=>!carbon||p.some((v,i)=>Math.abs(v-carbon[i])>1e-9));
  addSpheres(group,f,free,LESSON_COLORS.octa,summary.find(s=>s.kind==='octa')!.ratio*feA,{opacity:.42,name:'octa'});
  if(view.holes==='all')addTetrahedra(group,f,siteImages(TETRAHEDRAL[family],n),summary.find(s=>s.kind==='tetra')!.ratio*feA);
 }
 if(view.carbon){
  const carbon=lessonCarbon(crystal);if(!carbon)return;
  // Carbon drawn at its approximate covalent radius on the same scale as the ideal voids.
  const cR=CARBON_RADIUS_ANGSTROM/(REFERENCE_LATTICE[crystal.code==='G'?'G':'A'].a)*crystal.cell[0]*f.unit;
  addSpheres(group,f,[carbon],LESSON_COLORS.carbon,cR,{opacity:view.compare?1:.82,name:'c'});
  if(view.neighbours){
   const nb=carbonNeighbours(crystal,carbon),near=nb[0].distance;
   const seg=(list:typeof nb,color:string,opacity:number)=>{if(!list.length)return;const g=new THREE.BufferGeometry().setAttribute('position',new THREE.Float32BufferAttribute(list.flatMap(p=>[...f.world(carbon).toArray(),...f.world(p.position).toArray()]),3));group.add(new THREE.LineSegments(g,new THREE.LineBasicMaterial({color,transparent:true,opacity})));};
   seg(nb.filter(p=>p.distance<near*1.01),LESSON_COLORS.near,1);seg(nb.filter(p=>p.distance>=near*1.01),LESSON_COLORS.far,.7);
   const outside=nb.filter(p=>p.position.some(v=>v<-1e-9||v>n+1e-9)).map(p=>p.position);
   addSpheres(group,f,outside,LESSON_COLORS.corner,feRadius,{opacity:.35,name:'neighbour-image'});
  }
 }
}
/**
 * Draw one lesson step. Uses fixed reference geometry only; voids are the ideal hard-sphere
 * clearance. The compare view puts γ and α on one Å scale (lattice parameters at ≈912 °C).
 */
export function drawAtomicLesson(group:THREE.Group,crystal:PhaseCrystal,view:LessonView):void{
 if(view.compare){
  const unit=.78/REFERENCE_LATTICE.G.a;
  for(const [code,shift] of [['G',-.56],['A',.52]] as const){
   const c=phaseCrystal(code),scaled={...c,cell:[REFERENCE_LATTICE[code].a,REFERENCE_LATTICE[code].a,REFERENCE_LATTICE[code].a] as Position};
   drawLessonCell(group,scaled,{...view,repeats:1,neighbours:false},frame(scaled,1,unit,shift));
  }
  return;
 }
 const n=crystal.periodic?view.repeats:1;
 // Shared-atom cells get a margin: the clipped spheres reach R beyond the cell walls.
 drawLessonCell(group,crystal,{...view,repeats:n},frame(crystal,n,(view.shares?.92:1.18)/(Math.max(...crystal.cell)*n)));
}
