/** Demo-only FGI and versioned estimates. Operation allocations are never additive FGI. */
import {check,id,now,sha256,text,type User} from './model.js';
import {validDate,workToday,dayOffset,productionConfig} from './production-model.js';
import type {WorkspaceTx} from './store.js';
import {allocationSources,allocationSourcesForDates} from './production-shifts.js';
export type ProductOperationProfile={operation:string;lagDays:number;localScrapRateBps:number};
export const DEFAULT_ALLOCATION_PROFILE:ProductOperationProfile[]=productionConfig.stages.map((operation,i)=>({operation,lagDays:[5,4,3,2,2,1,0][i],localScrapRateBps:[2000,500,400,300,300,200,0][i]}));
export function calculateOperationTargets(fgi:number,profile:ProductOperationProfile[]){
 check(Number.isSafeInteger(fgi)&&fgi>=0,'FGI must be a nonnegative whole quantity.');
 let target=fgi;const out=new Array(profile.length);
 for(let i=profile.length-1;i>=0;i--){const p=profile[i];check(Number.isSafeInteger(p.localScrapRateBps)&&p.localScrapRateBps>=0&&p.localScrapRateBps<10000,'Scrap rate must be from 0 to 9,999 basis points.');const numerator=BigInt(target)*10000n,denominator=BigInt(10000-p.localScrapRateBps),next=(numerator+denominator-1n)/denominator;check(next<=BigInt(Number.MAX_SAFE_INTEGER),'Operation target exceeds safe integer range.');target=Number(next);out[i]={...p,target};}
 return out;
}
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
const runId=(from:string,to:string,family:string)=>sha256(JSON.stringify([from,to,family]));
function appliedProfile(overrides:any):ProductOperationProfile[]{
 check(overrides===undefined||overrides&&typeof overrides==='object','Invalid profile overrides.');
 let values:Record<string,any>={};
 if(Array.isArray(overrides)){for(const item of overrides){check(item&&typeof item==='object'&&!Array.isArray(item),'Invalid profile override.');const operation=text(item.operation,200);check(productionConfig.stages.includes(operation),'Profile override has an unknown operation.');check(!values[operation],'Duplicate profile override.');values[operation]=item;}}
 else values=overrides||{};
 for(const key of Object.keys(values))check(productionConfig.stages.includes(key),'Profile override has an unknown operation.');
 return DEFAULT_ALLOCATION_PROFILE.map(p=>{const value=values[p.operation]||{};const lagDays=value.lagDays??p.lagDays,localScrapRateBps=value.localScrapRateBps??p.localScrapRateBps;check(Number.isSafeInteger(lagDays)&&lagDays>=0&&lagDays<=365,'Lag days must be a whole number from 0 to 365.');check(Number.isSafeInteger(localScrapRateBps)&&localScrapRateBps>=0&&localScrapRateBps<10000,'Scrap rate must be from 0 to 9,999 basis points.');return{operation:p.operation,lagDays,localScrapRateBps};});
}
async function currentRunPreview(tx:WorkspaceTx,from:string,to:string,familyInput:any,overrides:any){
 const family=text(familyInput,600);check(family,'Choose a product family.');const prior=(await tx.list<any>('production-allocation-run')).find(r=>r.from===from&&r.to===to&&r.family===family),profile=appliedProfile(overrides===undefined?prior?.audit?.appliedProfile:overrides);
 const fgiRecords=(await tx.list<any>('production-fgi')).filter(r=>r.workDate>=from&&r.workDate<=to).sort((a,b)=>a.workDate.localeCompare(b.workDate));
 let fgi=0;for(const record of fgiRecords)for(const row of record.rows||[])if(row.family===family)fgi+=row.quantity;check(Number.isSafeInteger(fgi)&&fgi>=0,'Invalid aggregate FGI.');check(fgiRecords.some(r=>r.rows?.some((v:any)=>v.family===family)),'No FGI exists for this product in the selected range.');
 const fgiRevisions=fgiRecords.map(r=>({workDate:r.workDate,revision:r.revision}));
 const targets=calculateOperationTargets(fgi,profile),operations=[] as any[],sourceFingerprint=[] as any[];
 for(const target of targets){const sourceWindow={from:dayOffset(from,-target.lagDays),to:dayOffset(to,-target.lagDays)};const sources=await allocationSourcesForDates(tx,sourceWindow.from,sourceWindow.to,family,target.operation);sourceFingerprint.push({operation:target.operation,sourceWindow,sources:sources.map((s:any)=>({sourceId:s.sourceId,sourceRevision:s.sourceRevision,sourceDate:s.sourceDate,operator:s.operator,username:s.username,minutes:s.minutes,grossMinutes:s.grossMinutes,downtimeMinutes:s.downtimeMinutes,reportedMoves:s.reportedMoves}))});
  const byAssociate=new Map<string,any>();for(const s of sources){const row=byAssociate.get(s.operator)||{operator:s.operator,username:s.username,minutes:0,gatePasses:null,partialGatePasses:false};row.minutes+=s.minutes;if(s.reportedMoves===null||s.reportedMoves===undefined)row.partialGatePasses=true;else row.gatePasses=(row.gatePasses??0)+s.reportedMoves;byAssociate.set(s.operator,row);}
  const associates=[...byAssociate.values()].filter(v=>v.minutes>0).sort((a,b)=>a.operator.localeCompare(b.operator)),canAllocate=associates.length>0;const proposed=canAllocate?distribute(target.target,associates.map(v=>v.minutes)):[],priorAllocations=structuredClone(prior?.operations?.find((v:any)=>v.operation===target.operation)?.allocations||[]),priorByAssociate=new Map(priorAllocations.map((v:any)=>[v.operator,v.allocated]));associates.forEach((v,i)=>{v.hours=v.minutes/60;v.eligibleMinutes=v.minutes;v.eligibleHours=v.hours;v.priorAllocated=priorByAssociate.get(v.operator)??null;v.proposed=proposed[i];});
  operations.push({...target,sourceWindow,associates,priorAllocations,canAllocate});
 }
 const fingerprintSources=sourceFingerprint.map(({sources,...operation}:any)=>({...operation,sources:sources.map(({sourceId,operator,minutes,reportedMoves}:any)=>({sourceId,operator,minutes,reportedMoves}))}));
 const fingerprint=sha256(JSON.stringify({from,to,family,fgi,appliedProfile:profile,sources:fingerprintSources}));
 return{id:runId(from,to,family),from,to,family,fgi,defaultProfile:structuredClone(DEFAULT_ALLOCATION_PROFILE),appliedProfile:profile,profileAssumption:'demo assumptions only: editable per allocation run.',fgiRevisions,sourceRevisions:sourceFingerprint,fingerprint,savedFingerprint:prior?.fingerprint||null,stale:!!prior&&prior.fingerprint!==fingerprint,revision:prior?.revision||0,operations,demo:true};
}
export async function productionAllocations(tx:WorkspaceTx,u:User|undefined,route:string,input:any):Promise<any|undefined>{
 const runRoutes=['production-allocation-board','production-allocation-expand','production-allocation-calculate','production-allocation-run-save'];
 if(!['production-fgi-presets','production-fgi-list','production-fgi-save','production-allocation-preview','production-allocation-save','production-allocation-list','production-allocation-export',...runRoutes].includes(route))return undefined;
 check(u&&u.active&&(u.role==='owner'||['manager','admin'].includes(u.role)&&u.forms.includes('arr')),'Management access required.',403);
 const permission=await tx.get('production-permission',u.id);const operational=u.role==='manager'||u.role==='owner'&&permission?.operationalManager===true;
 const mutation=()=>check(operational,'Manager/Supervisor operational role required.',403);
 if(runRoutes.includes(route)){
  check(operational,'Manager operational role required.',403);
  const from=validDate(input.from),to=validDate(input.to),rangeDays=(Date.parse(to+'T12:00:00Z')-Date.parse(from+'T12:00:00Z'))/86400000+1;check(Number.isInteger(rangeDays)&&rangeDays>=1&&rangeDays<=366,'Choose a valid FGI date range of 1 to 366 days.');
  if(route==='production-allocation-board'){
   const totals=new Map<string,number>();
   for(const fgi of await tx.list<any>('production-fgi'))if(fgi.workDate>=from&&fgi.workDate<=to)for(const row of fgi.rows||[])totals.set(row.family,(totals.get(row.family)||0)+row.quantity);
   const runs=await tx.list<any>('production-allocation-run');
   const products=await Promise.all([...totals].map(async([family,fgi])=>{const run=runs.find(r=>r.from===from&&r.to===to&&r.family===family);const allocatedOperations=run?.operations?.length||0;let stale=false;if(run)try{stale=(await currentRunPreview(tx,from,to,family,undefined)).stale;}catch{stale=true;}return{family,fgi,totalOperations:productionConfig.stages.length,allocatedOperations,remainingOperations:productionConfig.stages.length-allocatedOperations,currentRunRevision:run?.revision||0,stale};}));products.sort((a,b)=>b.fgi-a.fgi||a.family.localeCompare(b.family));
   return{from,to,products,demo:true};
  }
  if(route==='production-allocation-expand'||route==='production-allocation-calculate')return currentRunPreview(tx,from,to,input.family,input.profileOverrides);
  if(route==='production-allocation-run-save'){
   const family=text(input.family,600);check(family,'Choose a product family.');const runs=await tx.list<any>('production-allocation-run');const old=runs.find(r=>r.from===from&&r.to===to&&r.family===family);
   check(!runs.some(r=>r.family===family&&!(r.from===from&&r.to===to)&&r.from<=to&&r.to>=from),'This product already has a saved allocation run whose date range overlaps the selected range.',409);
   check(input.revision===(old?.revision||0),'Allocation run changed. Refresh before saving.',409);
   const preview=await currentRunPreview(tx,from,to,family,input.profileOverrides);check(input.fingerprint===preview.fingerprint,'Source or FGI data changed. Refresh before saving.',409);
   check(Array.isArray(input.operations)&&input.operations.length===productionConfig.stages.length,'Provide final allocations for every operation.');const operations=[] as any[];
   for(let i=0;i<preview.operations.length;i++){const expected=preview.operations[i],submitted=input.operations[i];check(expected.canAllocate,'Operation requires positive eligible production time before allocation.');check(submitted?.operation===expected.operation,'Keep final allocations in approved process order.');check(submitted.target===expected.target,'Operation target changed. Refresh before saving.',409);const submittedAllocations=submitted.allocations??submitted.finalAllocations??(Array.isArray(input.finalAllocations)?input.finalAllocations.find((v:any)=>v.operation===expected.operation)?.allocations:input.finalAllocations?.[expected.operation]);check(Array.isArray(submittedAllocations),'Provide final associate allocations.');
    const eligible=new Map(expected.associates.map((v:any)=>[v.operator,v]));check(submittedAllocations.length===eligible.size,'Provide one final allocation for every eligible associate.');const seen=new Set<string>(),allocations=[] as any[];let total=0;
    for(const value of submittedAllocations){const operator=text(value.operator,100);check(!seen.has(operator),'Duplicate associate allocation.');seen.add(operator);const source:any=eligible.get(operator);check(source,'Allocation includes an ineligible associate.');check(Number.isSafeInteger(value.allocated)&&value.allocated>=0,'Final allocations must be nonnegative whole quantities.');total+=value.allocated;allocations.push({operator,username:source.username,allocated:value.allocated});}
    check(total===expected.target,'Final associate allocations must balance exactly to the operation target.');operations.push({operation:expected.operation,target:expected.target,lagDays:expected.lagDays,localScrapRateBps:expected.localScrapRateBps,sourceWindow:expected.sourceWindow,allocations});
   }
   const adjustmentReason=text(input.adjustmentReason,2000);check(adjustmentReason,'Enter an adjustment reason.');const audit={fingerprint:preview.fingerprint,defaultProfile:preview.defaultProfile,appliedProfile:preview.appliedProfile,fgiRevisions:preview.fgiRevisions,sourceRevisions:preview.sourceRevisions};
   const run={id:preview.id,from,to,family,fgi:preview.fgi,revision:(old?.revision||0)+1,fingerprint:preview.fingerprint,operations,adjustmentReason,audit,by:u.username,at:now(),demo:true,history:old?[...(old.history||[]),{...old,history:undefined}]:[]};
   await tx.put('production-allocation-run',run.id,run);await event(tx,u,'production allocation run saved',run.id,{revision:run.revision,fingerprint:run.fingerprint,defaultProfile:audit.defaultProfile,appliedProfile:audit.appliedProfile,fgiRevisions:audit.fgiRevisions,sourceRevisions:audit.sourceRevisions,adjustmentReason});return{run,demo:true};
  }
 }
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
