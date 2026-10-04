/** Demo-only FGI and versioned estimates. Operation allocations are never additive FGI. */
import {check,id,now,sha256,text,type User} from './model.js';
import {validDate,workToday,dayOffset} from './production-model.js';
import type {WorkspaceTx} from './store.js';
import {allocationSources} from './production-shifts.js';
export const FGI_BASE = [
 ['Compression sleeves',5040],['Disposable pulse-ox sensors',2520],['ECG leads/patient cables',1400],['Tourniquet cuffs',728],['Air-transfer products',672],['Manifolds',672],['Arthroscopic shaver blades',616],['Bits/burs/blades',560],['Laryngoscope blades',392],['Trocars/cannulas',364],['Harmonic scalpels/shears',252],['LigaSure/vessel sealers',224],['Ablation devices',168],['Suture passers/retrievers',168],['Reusable pulse-ox sensors',112],['EP devices/diagnostic catheters',84],['Shaver handpieces/accessories',28]
] as const;
type Source={sourceId:string;sourceRevision:number;operator:string;username:string;minutes:number;grossMinutes?:number;downtimeMinutes?:number;reportedMoves:number|null};
export type AllocationRow={operator:string;username:string;minutes:number;reportedMoves:number|null;partialReported:boolean;allocated:number|null};
/** Stable largest remainder; ties follow input order. Never manufactures weight. */
export function distribute(total:number,weights:number[]):number[] {
 check(Number.isSafeInteger(total)&&total>=0,'Enter a nonnegative whole quantity.');
 check(weights.every(n=>Number.isFinite(n)&&n>=0),'Invalid allocation minutes.');
 const sum=weights.reduce((a,b)=>a+b,0);check(sum>0||total===0,'No eligible production minutes to distribute the remainder.');
 if(!sum)return weights.map(()=>0);
 const exact=weights.map(w=>total*w/sum),out=exact.map(Math.floor);
 const order=exact.map((n,i)=>({i,r:n-out[i]})).sort((a,b)=>b.r-a.r||a.i-b.i);
 const remaining=total-out.reduce((a,b)=>a+b,0);for(let n=0;n<remaining;n++)out[order[n].i]++;
 return out;
}
export function fgiPreset(total:number,random= Math.random) {
 check(total===1400||total===14000,'Choose the 1,400 or 14,000 demo preset.');
 const weights=FGI_BASE.map(([,n])=>n<=168&&random()<.12?0:n*(.85+random()*.3));
 const quantities=distribute(total,weights);
 return {demo:true,provenance:'simulated_preset',total,rows:FGI_BASE.map(([family],i)=>({family,quantity:quantities[i]}))};
}
export function calculateAllocation(total:number,sources:Source[],method:string,adjustments:Record<string,number>={}) {
 check(['time','reported-first','adjusted'].includes(method),'Unknown allocation method.');
 const map=new Map<string,AllocationRow>();
 for(const s of sources){check(Number.isFinite(s.minutes)&&s.minutes>=0,'Invalid source duration.');const r=map.get(s.operator)||{operator:s.operator,username:s.username,minutes:0,reportedMoves:null,partialReported:false,allocated:null};r.minutes+=s.minutes;if(s.reportedMoves===null||s.reportedMoves===undefined)r.partialReported=true;else {check(Number.isSafeInteger(s.reportedMoves)&&s.reportedMoves>=0,'Invalid source report.');r.reportedMoves=(r.reportedMoves??0)+s.reportedMoves;}map.set(s.operator,r);}
 const rows=[...map.values()].sort((a,b)=>a.operator.localeCompare(b.operator));const issues:string[]=[];
 const reported=rows.reduce((n,r)=>n+(r.reportedMoves??0),0);
 if(reported>total)issues.push('Reported moves exceed FGI—review context. Moves and FGI may concern different stages or days.');
 check(adjustments&&typeof adjustments==='object'&&!Array.isArray(adjustments),'Invalid adjustments.');
 check(method==='adjusted'||Object.keys(adjustments).length===0,'Choose Manager adjustments to set fixed estimates.');
 for(const [key,value] of Object.entries(adjustments)){check(rows.some(r=>r.operator===key),'Adjustment refers to an ineligible associate.');check(Number.isSafeInteger(value)&&value>=0,'Adjustments must be nonnegative whole units.');}
 let fixed=0;const remaining:AllocationRow[]=[];
 for(const r of rows){const value=method==='adjusted'?adjustments[r.operator]:method==='reported-first'?r.reportedMoves:undefined;if(value!==undefined&&value!==null){r.allocated=value;fixed+=value;}else remaining.push(r);}
 let canSave=true;
 if(fixed>total){issues.push('Needs review: fixed estimates exceed available FGI. Choose time-based allocation or revise fixed estimates.');canSave=false;}
 else if(total>fixed&&!remaining.some(r=>r.minutes>0)){issues.push('Needs review: no eligible unassigned production minutes for the remainder.');canSave=false;}
 else {const parts=distribute(total-fixed,remaining.map(r=>r.minutes));remaining.forEach((r,i)=>r.allocated=parts[i]);}
 if(!rows.length){issues.push('No eligible completed production segments.');canSave=false;}
 if(!canSave)for(const r of rows)r.allocated=null;
 return {rows,issues,canSave};
}
const allocId=(date:string,family:string,operation:string)=>sha256(JSON.stringify([date,family,operation]));
const quantity=(n:any)=>{check(Number.isSafeInteger(n)&&n>=0&&n<=100000000,'Enter a whole quantity from 0 to 100,000,000.');return n as number;};
async function event(tx:WorkspaceTx,u:User,action:string,recordId:string,details:any){const key=id();await tx.put('production-event',key,{id:key,by:u.username,actingRole:u.role==='owner'?'manager':u.role,action,recordId,details,at:now()});}
async function currentPreview(tx:WorkspaceTx,input:any){
 const workDate=validDate(input.workDate),family=text(input.family,600),operation=text(input.operation,200);check(family&&operation,'Choose product family and operation.');
 const fgi=await tx.get('production-fgi',workDate);const line=fgi?.rows.find((r:any)=>r.family===family);check(line,'Enter demo FGI for this family and date first.');
 const sources:Source[]=(await allocationSources(tx,workDate,family,operation)).sort((a:Source,b:Source)=>a.sourceId.localeCompare(b.sourceId));
 const catalog=(await tx.list('production-product')).map(p=>({id:p.id,revision:p.revision,name:p.name,aliases:p.aliases,active:p.active})).sort((a,b)=>a.id.localeCompare(b.id));
 const snapshot={fgiRevision:fgi.revision,quantity:line.quantity,provenance:fgi.provenance,sources,catalog};
 // Review/share/closeout revisions and unrelated catalog edits do not alter estimates.
 // Effective product mappings are reflected by allocationSources membership. Full revisions
 // remain in the audit snapshot while the validity check follows calculation inputs only.
 const fingerprint=sha256(JSON.stringify({quantity:line.quantity,provenance:fgi.provenance,sources:sources.map(s=>({sourceId:s.sourceId,operator:s.operator,minutes:s.minutes,grossMinutes:s.grossMinutes??s.minutes,downtimeMinutes:s.downtimeMinutes??0,reportedMoves:s.reportedMoves??null}))}));
 const method=input.method||'time',adjustments=input.adjustments||{},context=text(input.context||'',2000);
 return {id:allocId(workDate,family,operation),workDate,family,operation,method,total:line.quantity,...calculateAllocation(line.quantity,sources,method,adjustments),fingerprint,snapshot,adjustments,context,demo:true,label:'Demo-FGI-Alloc',warning:'Estimated attribution, not measured individual output. Do not sum across operations as finished goods.'};
}
async function present(tx:WorkspaceTx,a:any){
 let stale=true;try{const current=await currentPreview(tx,{workDate:a.preview.workDate,family:a.preview.family,operation:a.preview.operation,method:'time'});stale=current.fingerprint!==a.preview.fingerprint;}catch{stale=true;}
 // The durable old revision is retained; current eligibility is always checked at read time.
 return {...a,stale,status:stale?'Needs refresh—source data changed.':'Current estimate',current:stale?null:a.preview,history:(a.history||[]).map((h:any)=>({...h,historical:true,status:'Historical allocation revision—not current'}))};
}
export async function productionAllocations(tx:WorkspaceTx,u:User|undefined,route:string,input:any):Promise<any|undefined>{
 if(!['production-fgi-presets','production-fgi-list','production-fgi-save','production-allocation-preview','production-allocation-save','production-allocation-list','production-allocation-export'].includes(route))return undefined;
 check(u&&u.active&&(u.role==='owner'||['manager','admin'].includes(u.role)&&u.forms.includes('arr')),'Management access required.',403);
 const permission=await tx.get('production-permission',u.id);const operational=u.role==='manager'||u.role==='owner'&&permission?.operationalManager===true;
 const mutation=()=>check(operational,'Manager/Supervisor operational role required.',403);
 if(route==='production-fgi-presets'){mutation();return fgiPreset(input.total);}
 if(route==='production-fgi-save'){
  mutation();const workDate=validDate(input.workDate),old=await tx.get('production-fgi',workDate);check(input.revision===(old?.revision||0),'FGI changed. Refresh before saving.',409);
  check(Array.isArray(input.rows)&&input.rows.length>0&&input.rows.length<=5000,'Provide product-family quantities.');
  const rows=input.rows.map((r:any)=>({family:text(r.family,600),quantity:quantity(r.quantity)}));check(rows.every((r:any)=>r.family)&&new Set(rows.map((r:any)=>r.family)).size===rows.length,'Use unique nonempty product families.');
  check(['manual_demo','simulated_preset'].includes(input.provenance),'Keep demo source provenance.');
  // Editing generated data cannot strip its origin. Manual clear/start must be a separate date/revision with explicit source context.
  const provenance=old?.provenance==='simulated_preset'?'simulated_preset':input.provenance;
  const fgi={id:workDate,workDate,revision:(old?.revision||0)+1,rows,total:rows.reduce((a:number,r:any)=>a+r.quantity,0),provenance,demo:true,label:'Authoritative demo FGI',context:text(input.context||'',2000),by:u.username,at:now(),history:old?[...(old.history||[]),{...old,history:undefined}]:[]};
  await tx.put('production-fgi',workDate,fgi);await event(tx,u,'demo FGI saved',workDate,{revision:fgi.revision,provenance});return {fgi,demo:true};
 }
 if(route==='production-allocation-preview'){mutation();return {preview:await currentPreview(tx,input),demo:true};}
 if(route==='production-allocation-save'){
  mutation();const preview=await currentPreview(tx,input);check(preview.canSave,'Resolve the allocation calculation before saving.');check(input.fingerprint===preview.fingerprint,'Source data changed. Refresh preview before saving.',409);
  const old=await tx.get('production-allocation',preview.id);check(input.revision===(old?.revision||0),'Allocation changed. Refresh before saving.',409);
  const allocation={id:preview.id,revision:(old?.revision||0)+1,preview,by:u.username,at:now(),demo:true,history:old?[...(old.history||[]),{...old,history:undefined}]:[]};
  await tx.put('production-allocation',allocation.id,allocation);await event(tx,u,'demo allocation revision saved',allocation.id,{revision:allocation.revision,method:preview.method,adjustments:preview.adjustments});return {allocation:await present(tx,allocation),demo:true};
 }
 const from=validDate(input.from||dayOffset(workToday(),-14)),to=validDate(input.to||workToday());check(from<=to,'Choose a valid date range.');
 if(route==='production-fgi-list')return{fgi:(await tx.list('production-fgi')).filter(r=>r.workDate>=from&&r.workDate<=to).sort((a,b)=>a.workDate.localeCompare(b.workDate)),demo:true};
 const allocations=[];for(const a of await tx.list('production-allocation'))if(a.preview.workDate>=from&&a.preview.workDate<=to)allocations.push(await present(tx,a));
 if(route==='production-allocation-list')return{allocations,demo:true};
 const quote=(s:any)=>{let value=String(s??'');if(/^[=+@\-\t\r]/.test(value))value="'"+value;return '"'+value.replace(/"/g,'""')+'"';};
 const lines=[['DEMO','Work date','Family','Operation','Revision','Status','Associate','Production minutes','Demo-SR-Moves','Demo-FGI-Alloc (estimate)']];
 for(const a of allocations)for(const r of a.preview.rows)lines.push(['DEMO',a.preview.workDate,a.preview.family,a.preview.operation,String(a.revision),a.stale?'STALE HISTORICAL—NOT CURRENT':'Current estimate',r.username,String(r.minutes),r.reportedMoves===null?'Not counted':String(r.reportedMoves),a.stale?'':String(r.allocated)]);
 return {csv:lines.map(row=>row.map(quote).join(',')).join('\r\n'),demo:true,filename:'DEMO-allocation-estimates.csv'};
}
