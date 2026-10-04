import {check,id,now,text,type User} from './model.js';
import {validDate,workToday,dayOffset,productionConfig} from './production-model.js';
import type {WorkspaceTx} from './store.js';
import {definitionAnswers,initialDefinition} from './production-forms.js';
import {resolveProduct} from './production-catalog.js';

type Operator={id:string;username:string};
export type ShiftSegment={id:string;kind:'production'|'training';start:string;end:string|null;stage:string;station:string;product:string;productId?:string;reportedMoves:number|null;extras?:{countType:string;unit:string;rejected?:number;rework?:number;lot?:string;exception?:string;interruptionMinutes?:number}};
export type ProductionShift={id:string;operator:string;username:string;workDate:string;shift:string;team:string;status:'in_progress'|'submitted'|'needs_attention'|'closed';revision:number;segments:ShiftSegment[];data:Record<string,any>;formSnapshot:any;createdAt:string;updatedAt:string;shares:Record<string,{assignedAt:string;allowCorrections:boolean;retractedAt?:string}>;readiness:any;history:any[]};
const stamp=(v:any)=>{check(typeof v==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v)),'Enter an actual date and time including time zone.');check(Date.parse(v)<=Date.now()+300000,'Actual work time cannot be in the future.');validDate(v.slice(0,10));return new Date(v).toISOString();};
const count=(v:any):number|null=>{if(v===undefined||v===null||v==='')return null;check(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0,'Reported moves must be a nonnegative whole number or left blank.');return v;};
export function shiftWorkDate(at:string,cutoff=3){const d=new Date(at);const date=workToday(d);const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:productionConfig.timezone,hour:'2-digit',hourCycle:'h23'}).format(d));return hour<cutoff?dayOffset(date,-1):date;}
const assignment=(a:any)=>{check(a&&typeof a==='object','Choose an assignment.');const product=text(a.product,600),stage=text(a.stage,120);check(product&&stage,'Product and operation are required.');check(productionConfig.stages.includes(stage),'Choose a valid production operation.');return {product,stage,station:text(a.station||'',120),...(a.productId?{productId:text(a.productId,100)}:{})};};
function extras(value:any,moves:number|null){
 const d=value||{};check(typeof d==='object'&&!Array.isArray(d),'Invalid optional segment details.');
 const countType=d.countType|| (moves===null?'not_counted':'estimated');check(['exact','estimated','not_counted','not_applicable'].includes(countType),'Choose a count type.');
 check(!['exact','estimated'].includes(countType)||moves!==null,'Enter moves for a counted quantity, or choose Not counted.');check(!['not_counted','not_applicable'].includes(countType)||moves===null,'Leave moves blank when not counted or not applicable.');
 const out:any={countType,unit:text(d.unit||'units',40)};
 for(const key of ['rejected','rework','interruptionMinutes'])if(d[key]!==undefined&&d[key]!==null&&d[key]!==''){const n=typeof d[key]==='string'?Number(d[key]):d[key];check(typeof n==='number'&&Number.isFinite(n)&&n>=0&&(key==='interruptionMinutes'||Number.isSafeInteger(n)),`Invalid ${key}.`);out[key]=n;}
 for(const key of ['lot','exception'])if(d[key]!==undefined&&d[key]!=='')out[key]=text(d[key],1000);
 return out;
}
function timeline(segments:ShiftSegment[],complete=false){check(segments.length>0&&segments.length<=250,'A shift needs between 1 and 250 segments.');const keys=new Set<string>();for(let i=0;i<segments.length;i++){const s=segments[i];check(!keys.has(s.id),'Duplicate segment.');keys.add(s.id);check(s.end===null?i===segments.length-1&&!complete:Date.parse(s.end)>=Date.parse(s.start),'Segment end must follow its start; only the last segment may remain open.');if(s.end&&s.extras?.interruptionMinutes!==undefined)check(s.extras.interruptionMinutes<=(Date.parse(s.end)-Date.parse(s.start))/60000,'Interruption minutes cannot exceed segment duration.');if(i)check(segments[i-1].end===s.start,'Segments must meet at a shared boundary. Correct the previous end and next start together; overlaps and gaps are not allowed.');}}
export async function allocationSources(tx:WorkspaceTx,date:string,family:string,operation:string){
 const rows:any[]=[],catalog=await tx.list<any>('production-product');const norm=(v:string)=>v.trim().toLowerCase();
 for(const r of await tx.list<ProductionShift>('production-shift'))if(r.workDate===date)for(const s of r.segments){
  const product=catalog.find(p=>p.id===s.productId)||catalog.find(p=>norm(p.name)===norm(s.product)||p.aliases?.some((a:string)=>norm(a)===norm(s.product)));
  if(s.kind==='production'&&s.end&&(product?.name===family||product?.id===family||(!product&&(s.productId||s.product)===family))&&s.stage===operation){const grossMinutes=(Date.parse(s.end)-Date.parse(s.start))/60000,downtimeMinutes=s.extras?.interruptionMinutes||0,minutes=Math.max(0,grossMinutes-downtimeMinutes);rows.push({sourceId:`${r.id}:${s.id}`,sourceRevision:r.revision,operator:r.operator,username:r.username,minutes,grossMinutes,downtimeMinutes,reportedMoves:s.reportedMoves});}
 }return rows;
}
export async function shiftRoutes(tx:WorkspaceTx,u:User|undefined,o:Operator|undefined,route:string,input:any):Promise<any>{
 if(!route.startsWith('production-shift-'))return undefined;
 check(u||o,'Please sign in.',401);
 const p=u?await tx.get('production-permission',u.id):null;
 const formAccess=!!u&&(u.role==='owner'||u.forms.includes('arr'));
 const manager=formAccess&&(u!.role==='manager'||u!.role==='owner'&&p?.operationalManager===true);
 const staffView=formAccess&&u!.role!=='reviewer';
 const recognition=formAccess&&(u!.role==='manager'||u!.role==='owner'||u!.role==='admin'&&p?.recognition===true);
 const settings=await tx.get('production-settings','main')||{};
 const actor=u?.username||o!.username;
 const resolvedAssignment=async(a:any)=>({...assignment(a),productId:undefined,...await resolveProduct(tx,text(a.product,600),actor)});
 const answers=(r:ProductionShift,d:any,phase:string)=>{const values=definitionAnswers(r.formSnapshot?.definition||initialDefinition('arr'),d||{},phase);if(u?.role==='reviewer'){delete values.recognition;delete values.recognitionPeople;}return values;};
 const correctedAnswers=(r:ProductionShift,d:any)=>{
  check(d&&typeof d==='object'&&!Array.isArray(d),'Invalid shift answers.');
  if(u?.role==='reviewer')check(d.recognition===undefined&&d.recognitionPeople===undefined,'Recognition information is restricted.');
  const definition=r.formSnapshot?.definition||initialDefinition('arr');
  const fields=definition.fields.filter((f:any)=>Object.prototype.hasOwnProperty.call(d,f.key));
  const values=definitionAnswers({...definition,fields:fields.map((f:any)=>({...f,phase:'all'}))},d);
  const result={...r.data};for(const f of fields)if(f.active){if(values[f.key]===undefined)delete result[f.key];else result[f.key]=values[f.key];}return result;
 };
 const share=(r:ProductionShift)=>!!u&&formAccess&&r.shares[u.id]&&!r.shares[u.id].retractedAt;
 const own=(r:ProductionShift)=>!u&&o?.id===r.operator;
 const visible=(r:ProductionShift)=>own(r)||staffView||share(r);
 const correct=(r:ProductionShift)=>manager||!!(u&&share(r)&&r.shares[u.id].allowCorrections);
 const confirm=(r:ProductionShift)=>manager||!!(u&&formAccess&&u.role==='reviewer'&&r.readiness?.leadId===u.id);
 const narrow=(r:ProductionShift)=>({id:r.id,revision:r.revision,operator:r.operator,username:r.username,workDate:r.workDate,team:r.team,readiness:structuredClone(r.readiness),assignment:(()=>{const s=r.segments.at(-1)!;return{stage:s.stage,station:s.station,product:s.product,start:s.start,kind:s.kind};})(),canConfirmReadiness:confirm(r)});
 const safe=(r:ProductionShift)=>{const c=structuredClone(r) as any;if(u&&!recognition){delete c.data.recognition;delete c.data.recognitionPeople;c.history=c.history.map((h:any)=>({at:h.at,by:h.by,role:h.role,action:h.action,reason:h.recognitionChanged?'Restricted recognition details':h.reason}));}if(!u)delete c.shares;if(u?.role==='reviewer')c.shares={[u.id]:c.shares[u.id]};c.canCorrect=correct(r)||own(r)&&['in_progress','needs_attention'].includes(r.status);c.canManage=manager;c.canComment=manager||!!share(r);c.canReview=manager||!!share(r);c.canConfirmReadiness=confirm(r);return c;};
 const record=async()=>{const r=await tx.get<ProductionShift>('production-shift',text(input.id,100));check(r&&(visible(r)||confirm(r)),'Shift unavailable.',404);return r;};
 const save=async(r:ProductionShift,action:string,before:any,reason='')=>{r.revision++;r.updatedAt=now();r.history.push({at:r.updatedAt,by:actor,role:manager?'manager':u?.role||'operator',action,reason,recognitionChanged:JSON.stringify([before?.data?.recognition,before?.data?.recognitionPeople])!==JSON.stringify([r.data.recognition,r.data.recognitionPeople]),before,after:{status:r.status,segments:structuredClone(r.segments),readiness:structuredClone(r.readiness),data:structuredClone(r.data),workDate:r.workDate}});await tx.put('production-shift',r.id,r);return visible(r)?{shift:safe(r)}:{readiness:narrow(r)};};
 const newReadiness=(operatorId:string)=>{const a=settings.crewAssignments?.[operatorId]||{};return{status:'waiting_associate',requestedAt:now(),leadId:a.leadId||null,managerId:a.managerId||null};};
 if(route==='production-shift-start'){
  check(!u&&o,'Use your associate account to begin a shift.',403);const actualStart=stamp(input.actualTime),date=input.workDate?validDate(input.workDate):shiftWorkDate(actualStart,settings.cutoffHour??3),key=id();check(date<=workToday(),'Work date cannot be in the future.');check(input.needsReadiness===true||typeof input.data?.sopClarity==='number','Select your SOP understanding or request SOP review before starting.');
  check(!(await tx.list<ProductionShift>('production-shift')).some(r=>r.operator===o.id&&r.workDate===date),'A shift already exists for this work date. Open it to continue.',409);
  const open=(await tx.list<ProductionShift>('production-shift')).some(r=>r.operator===o.id&&r.segments.some(s=>!s.end));check(!open,'Finish the existing open shift first.',409);
  check(productionConfig.shifts.some(s=>s.id===(input.shift||'day')),'Choose a valid shift.');const start=actualStart,a=await resolvedAssignment(input.assignment),form=await tx.get('production-form','arr');const crew=settings.crewAssignments?.[o.id];check((settings.teams||productionConfig.teams).includes(crew?.team||input.team||'Team A'),'Choose a configured crew.');
  const r:ProductionShift={id:key,operator:o.id,username:o.username,workDate:date,shift:text(input.shift||'day',30),team:crew?.team||text(input.team||'Team A',100),status:'in_progress',revision:0,segments:[{id:id(),kind:input.needsReadiness?'training':'production',start,end:null,...a,reportedMoves:null}],data:definitionAnswers(form?.definition||initialDefinition('arr'),input.data||{},'bod'),formSnapshot:structuredClone({identity:form?.identity||'production-demo-arr',version:form?.version||'0.1.0',definition:form?.definition||initialDefinition('arr')}),createdAt:now(),updatedAt:now(),shares:{},readiness:input.needsReadiness?newReadiness(o.id):null,history:[]};
  return save(r,'start',null);
 }
 if(route==='production-shift-close-many'){
  check(manager,'Supervisor role required.',403);check(Array.isArray(input.shifts)&&input.shifts.length>0&&input.shifts.length<=100,'Select 1 to 100 shifts.');
  const records:ProductionShift[]=[];const seen=new Set<string>();
  for(const item of input.shifts){check(!seen.has(item.id),'Duplicate shift selection.');seen.add(item.id);const r=await tx.get<ProductionShift>('production-shift',text(item.id,100));check(r&&r.revision===item.revision,'A selected shift changed. Refresh before closeout.',409);check(r.status==='submitted'&&r.segments.every(s=>s.end),'Incomplete or unsubmitted shifts cannot be closed.');records.push(r);}
  const shifts=[];for(const r of records){const before={status:r.status,segments:structuredClone(r.segments),readiness:structuredClone(r.readiness),data:structuredClone(r.data),workDate:r.workDate};r.status='closed';shifts.push((await save(r,'close',before)).shift);}return{shifts};
 }
 if(route==='production-shift-list'){
  const from=validDate(input.from||dayOffset(workToday(),-14)),to=validDate(input.to||workToday());check(from<=to,'Invalid date range.');const shifts=[],readiness=[];
  for(const r of await tx.list<ProductionShift>('production-shift'))if(r.workDate>=from&&r.workDate<=to&&(!input.teams?.length||input.teams.includes(r.team))){if(visible(r))shifts.push(safe(r));if(r.readiness&&['waiting_associate','waiting_confirmation'].includes(r.readiness.status)&&confirm(r))readiness.push(narrow(r));}
  return{shifts,readiness,canManage:manager};
 }
 const r=await record();
 if(route==='production-shift-detail')return visible(r)?{shift:safe(r)}:{readiness:narrow(r)};
 check(route==='production-shift-action','Unknown shift operation.',404);check(input.revision===r.revision,'Shift changed. Refresh before saving.',409);
 const action=text(input.action,60),before={status:r.status,segments:structuredClone(r.segments),readiness:structuredClone(r.readiness),data:structuredClone(r.data),workDate:r.workDate};
 if(action==='readiness-confirm'){
  check(confirm(r),'Lead or supervisor confirmation required.',403);check(r.readiness?.status==='waiting_confirmation','Associate must confirm readiness first.');r.readiness={...r.readiness,status:'confirmed',confirmedAt:now(),confirmedBy:actor,note:text(input.note||'',1000)};return save(r,action,before);
 }
 check(visible(r),'Shift unavailable.',404);
 if(action==='share'||action==='retract'){
  check(manager,'Supervisor role required.',403);const lead=await tx.get<User>('user',text(input.leadId,100));check(lead?.active&&lead.role==='reviewer'&&lead.forms.includes('arr'),'Choose an active ARR lead.');
  if(action==='share')r.shares[lead.id]={assignedAt:now(),allowCorrections:input.allowCorrections!==false};else{check(r.shares[lead.id],'No existing share.');r.shares[lead.id].retractedAt=now();}return save(r,action,before);
 }
 if(action==='comment'){check(manager||share(r),'Shared lead or supervisor access required.',403);const note=text(input.note,1500);check(note,'Enter a note.');return save(r,action,before,note);}
 if(action==='reviewed'){check(u&&(manager||share(r)),'Shared lead or supervisor access required.',403);return save(r,action,before);}
 if(action==='close'){check(manager,'Supervisor role required.',403);check(r.status==='submitted'&&r.segments.every(s=>s.end),'Only submitted, complete shifts can be closed.');r.status='closed';return save(r,action,before);}
 if(action==='reopen'){check(correct(r),'Correction permission required.',403);check(r.status==='closed'||r.status==='submitted','Shift is already open.');check(text(input.reason,1000),'Enter a correction reason.');r.status='needs_attention';return save(r,action,before,text(input.reason,1000));}
 if(action==='submit'){check(correct(r)||own(r)&&['in_progress','needs_attention'].includes(r.status),'Correction permission required.',403);timeline(r.segments,true);r.status='submitted';return save(r,action,before,text(input.reason||'',1000));}
 if(action==='needs_attention'){check(manager,'Supervisor role required.',403);check(r.status!=='closed','Reopen this shift first.');r.status='needs_attention';return save(r,action,before,text(input.reason||'',1000));}
 if(action==='readiness-ready'){check(own(r),'Associate confirmation required.',403);check(r.readiness?.status==='waiting_associate','No pending preparation.');r.readiness.status='waiting_confirmation';r.readiness.associateConfirmedAt=now();return save(r,action,before);}
 check(correct(r)||own(r)&&['in_progress','needs_attention'].includes(r.status),'Correction permission required.',403);check(r.status!=='closed','Reopen this shift before making corrections.',409);
 const reason=text(input.reason||'',1000);if(u||action==='correct')check(reason,'Enter a brief correction reason.');
 if(action==='correct'){
  if(input.workDate!==undefined){const date=validDate(input.workDate);check(date<=workToday(),'Work date cannot be in the future.');check(!(await tx.list<ProductionShift>('production-shift')).some(v=>v.id!==r.id&&v.operator===r.operator&&v.workDate===date),'A shift already exists for this work date.');r.workDate=date;}
  check(Array.isArray(input.segments)&&input.segments.length===r.segments.length,'Correct the existing segments together.');
  const next:ShiftSegment[]=await Promise.all(input.segments.map(async(s:any,i:number)=>{const old=r.segments[i];check(s.id===old.id,'Segment identities and order cannot change.');return{...old,...await resolvedAssignment(s),start:stamp(s.start),end:s.end===null?null:stamp(s.end),reportedMoves:count(s.reportedMoves),extras:extras(s.extras??old.extras,count(s.reportedMoves))};}));timeline(next,r.status==='submitted');r.segments=next;if(input.data)r.data=correctedAnswers(r,input.data);return save(r,action,before,reason);
 }
 const last=r.segments.at(-1)!;check(!last.end,'This shift has no active assignment.');const actual=stamp(input.actualTime);check(actual>=last.start,'Actual time cannot be before the current assignment start.');
 if(action==='begin-work'){check(last.kind==='training'&&r.readiness?.status==='confirmed','Lead or supervisor readiness confirmation is required before production begins.');last.end=actual;r.segments.push({...last,id:id(),kind:'production',start:actual,end:null,reportedMoves:null,extras:undefined});}
 else if(action==='changeover'){
  check(last.kind!=='training'||r.readiness?.status==='confirmed'||input.needsReadiness===true,'Confirm SOP readiness before beginning production.');const a=await resolvedAssignment(input.assignment);last.end=actual;last.reportedMoves=count(input.reportedMoves);last.extras=extras(input.extras||{...input.data,rejected:input.data?.rejects,interruptionMinutes:input.data?.interruptionMinutes??input.data?.downtimeMinutes},last.reportedMoves);r.segments.push({id:id(),kind:input.needsReadiness?'training':'production',start:actual,end:null,...a,reportedMoves:null});r.readiness=input.needsReadiness?newReadiness(r.operator):null;r.data={...r.data,...answers(r,input.data,'changeover')};
 }else if(action==='end'){check(input.confirmed===true,'Review the shift timeline and confirm End Shift before submission.');last.end=actual;last.reportedMoves=count(input.reportedMoves);last.extras=extras(input.extras||{...input.data,rejected:input.data?.rejects,interruptionMinutes:input.data?.interruptionMinutes??input.data?.downtimeMinutes},last.reportedMoves);r.status='submitted';if(r.readiness&&r.readiness.status!=='confirmed')r.readiness={...r.readiness,status:'cancelled',cancelledAt:now()};r.data={...r.data,...answers(r,input.data,'eod')};}
 else check(false,'Unknown shift action.');
 timeline(r.segments,r.status==='submitted');return save(r,action,before,reason);
}
