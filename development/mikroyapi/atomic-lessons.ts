import type {PhaseCode} from './equilibrium.ts';
/**
 * Guided atomic lesson: pure data. Text lives in the UI dictionary (keys below);
 * every number shown in a step is computed from crystal-structures.ts at render time.
 */
export type LessonStepId='lattice'|'cell'|'interstices'|'compare'|'free';
export type Badge='reference'|'ideal'|'calculated'|'conceptual';
export interface LessonView {
 repeats:number;               // unit cells per axis
 shares:boolean;               // clip shared atoms to the cell and colour them by corner/edge/face/body
 holes:'none'|'octa'|'all';    // interstices drawn to ideal scale
 carbon:boolean;               // one example C on an octahedral site
 neighbours:boolean;           // C–Fe neighbour lines (2 near + 4 far in BCC)
 dim:boolean;                  // shrink and fade Fe so voids and C stand out
 compare:boolean;              // γ and α side by side on one Å scale
}
export interface LessonStep {id:LessonStepId;titleKey:string;bodyKey:string;badges:Badge[];view:LessonView|null}
const base:LessonView={repeats:1,shares:false,holes:'none',carbon:false,neighbours:false,dim:false,compare:false};
export function lessonSteps(code:PhaseCode):LessonStep[]{
 const cubic=code==='A'||code==='D'||code==='G';
 const step=(id:LessonStepId,badges:Badge[],view:Partial<LessonView>|null,body:string=id):LessonStep=>({id,titleKey:`kup.lesson.${id}.title`,bodyKey:`kup.lesson.${body}.body`,badges,view:view&&{...base,...view}});
 if(code==='L')return [step('free',[],null)];
 if(!cubic)return [
  step('lattice',['reference'],{repeats:2},'latticeC'),
  step('cell',['reference'],{carbon:true},'cellC'),
  step('free',[],null),
 ];
 const bcc=code!=='G';
 return [
  step('lattice',['reference'],{repeats:2}),
  step('cell',['reference','ideal'],{shares:true}),
  step('interstices',['ideal'],{holes:'all',carbon:true,neighbours:bcc,dim:true},bcc?'intersticesBcc':'interstices'),
  step('compare',['ideal','calculated'],{holes:'octa',carbon:true,dim:true,compare:true}),
  step('free',[],null),
 ];
}
/** Text keys required by the steps above, for dictionary completeness checks. */
export function lessonKeys():string[]{
 const keys=new Set<string>();for(const code of ['G','A','D','C','L'] as const)for(const s of lessonSteps(code)){keys.add(s.titleKey);keys.add(s.bodyKey);}
 return [...keys].sort();
}
