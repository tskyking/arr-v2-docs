import {check,id,now,text,type User} from './model.js';
import {validDate,workToday,dayOffset,productionConfig} from './production-model.js';
import type {WorkspaceTx} from './store.js';
import {definitionAnswers,initialDefinition} from './production-forms.js';
import {resolveProduct} from './production-catalog.js';

type Operator={id:string;username:string};
export type ShiftSegment={id:string;kind:'production'|'training'|'waiting';start:string;end:string|null;stage:string;station:string;product:string;productId?:string;reportedMoves:number|null;sopReadySource?:'associate'|'demo_preselected'|'legacy_score';extras?:{countType:string;unit:string;rejected?:number;rework?:number;lot?:string;exception?:string;interruptionMinutes?:number}};
export type ProductionShift={id:string;operator:string;username:string;workDate:string;shift:string;team:string;status:'in_progress'|'submitted'|'needs_attention'|'closed';revision:number;segments:ShiftSegment[];data:Record<string,any>;formSnapshot:any;createdAt:string;updatedAt:string;shares:Record<string,{assignedAt:string;allowCorrections:boolean;retractedAt?:string}>;readiness:any;history:any[];queueInitialOrderKey?:string};
type QuickStartItem={operator:string;username:string;team:string;kind:ShiftSegment['kind'];stage:string;station:string;product:string;productId?:string;sourceId:string;sourceRevision:number};
type QuickStartLock={token:string;managerId:string;managerUsername:string;workDate:string;shift:'day'|'swing';starts:QuickStartItem[];expiresAt:string;createdAt:string};
type ShiftOrder={managerId:string;workDate:string;shift:string;operators:string[];updatedAt:string};
const fictionalAssociate=/^person-(?:[1-9]|[12]\d|30)$/;
const movableAssociate=/^person-\d+$/;
const TEST_C_REASON='This is a +2hour shift of steps for this associate for data collection during testing of other functions - not actual time worked on this station by this employee';
const stamp=(v:any)=>{check(typeof v==='string'&&/^\d{4}-\d\d-\d\dT.*(?:Z|[+-]\d\d:\d\d)$/.test(v)&&Number.isFinite(Date.parse(v)),'Enter an actual date and time including time zone.');check(Date.parse(v)<=Date.now()+300000,'Actual work time cannot be in the future.');validDate(v.slice(0,10));return new Date(v).toISOString();};
const count=(v:any,label='Gate Passes'):number|null=>{if(v===undefined||v===null||v==='')return null;check(typeof v==='number'&&Number.isSafeInteger(v)&&v>=0,`${label} must be a nonnegative whole number or left blank.`);return v;};
export function shiftWorkDate(at:string,cutoff=3){const d=new Date(at);const date=workToday(d);const hour=Number(new Intl.DateTimeFormat('en-US',{timeZone:productionConfig.timezone,hour:'2-digit',hourCycle:'h23'}).format(d));return hour<cutoff?dayOffset(date,-1):date;}
const assignment=(a:any)=>{check(a&&typeof a==='object','Choose an assignment.');const product=text(a.product,600),stage=text(a.stage,120);check(product&&stage,'Product and operation are required.');check(productionConfig.stages.includes(stage),'Choose a valid production operation.');return {product,stage,station:text(a.station||'',120),...(a.productId?{productId:text(a.productId,100)}:{})};};
const pacificShiftStart=(date:string,shift:'day'|'swing')=>{const [year,month,day]=date.split('-').map(Number),hour=shift==='day'?5:15,desired=Date.UTC(year,month-1,day,hour);let candidate=desired;const formatter=new Intl.DateTimeFormat('en-US',{timeZone:productionConfig.timezone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'});for(let i=0;i<4;i++){const parts=Object.fromEntries(formatter.formatToParts(new Date(candidate)).filter(p=>p.type!=='literal').map(p=>[p.type,p.value])),shown=Date.UTC(Number(parts.year),Number(parts.month)-1,Number(parts.day),Number(parts.hour),Number(parts.minute),Number(parts.second));if(shown===desired)return new Date(candidate).toISOString();candidate+=desired-shown;}check(false,'Could not resolve the configured Pacific shift start.');return'';};
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
export async function allocationSourcesForDates(tx:WorkspaceTx,from:string,to:string,family:string,operation:string){
 const rows:any[]=[],catalog=await tx.list<any>('production-product');const norm=(v:string)=>v.trim().toLowerCase();
 for(const r of await tx.list<ProductionShift>('production-shift'))if(r.workDate>=from&&r.workDate<=to)for(const s of r.segments){
  const product=catalog.find(p=>p.id===s.productId)||catalog.find(p=>norm(p.name)===norm(s.product)||p.aliases?.some((a:string)=>norm(a)===norm(s.product)));
  if(s.kind==='production'&&s.end&&(product?.name===family||product?.id===family||(!product&&(s.productId||s.product)===family))&&s.stage===operation){const grossMinutes=(Date.parse(s.end)-Date.parse(s.start))/60000,downtimeMinutes=s.extras?.interruptionMinutes||0,minutes=Math.max(0,grossMinutes-downtimeMinutes);rows.push({sourceId:`${r.id}:${s.id}`,sourceRevision:r.revision,sourceDate:r.workDate,sourceStart:s.start,operator:r.operator,username:r.username,minutes,grossMinutes,downtimeMinutes,reportedMoves:s.reportedMoves});}
 }rows.sort((a,b)=>a.sourceDate.localeCompare(b.sourceDate)||a.sourceStart.localeCompare(b.sourceStart)||a.sourceId.localeCompare(b.sourceId));return rows.map(({sourceStart,...row})=>row);
}
export async function allocationSources(tx:WorkspaceTx,date:string,family:string,operation:string){
 return allocationSourcesForDates(tx,date,date,family,operation);
}
export async function shiftRoutes(tx:WorkspaceTx,u:User|undefined,o:Operator|undefined,route:string,input:any):Promise<any>{
 if(!route.startsWith('production-shift-'))return undefined;
 check(u||o,'Please sign in.',401);
 const p=u?await tx.get('production-permission',u.id):null;
 const formAccess=!!u&&(u.role==='owner'||u.forms.includes('arr'));
 const manager=formAccess&&(u!.role==='manager'||u!.role==='owner'&&p?.operationalManager===true);
 const fullShiftView=!!u&&(u.role==='owner'||u.role==='admin');
 const recognition=formAccess&&(u!.role==='manager'||u!.role==='owner'||u!.role==='admin'&&p?.recognition===true);
 const settings=await tx.get('production-settings','main')||{};
 const actor=u?.username||o!.username;
 const crewAssignment=(operator:string)=>settings.crewAssignments?.[operator]||{};
 const assignedIds=(operator:string,plural:'managerIds'|'leadIds',singular:'managerId'|'leadId')=>{const value=crewAssignment(operator);return[...new Set([...(Array.isArray(value[plural])?value[plural]:[]),...(value[singular]?[value[singular]]:[])])];};
 const assignedSupervisor=(operator:string)=>!!u&&u.role==='manager'&&assignedIds(operator,'managerIds','managerId').includes(u.id);
 const assignedLead=(operator:string)=>!!u&&formAccess&&['lead','reviewer'].includes(u.role)&&assignedIds(operator,'leadIds','leadId').includes(u.id);
 const supervisorAccess=(operator:string)=>manager&&(u!.role==='owner'||assignedSupervisor(operator));
 const waitingAssignment=()=>({stage:'Waiting for assignment',station:'',product:'',productId:undefined});
 const resolvedAssignment=async(a:any)=>({...assignment(a),productId:undefined,...await resolveProduct(tx,text(a.product,600),actor)});
 const answers=(r:ProductionShift,d:any,phase:string,waiting=false)=>{
  const original=r.formSnapshot?.definition||initialDefinition('arr');
  const definition=waiting?{...original,fields:original.fields.filter((f:any)=>!['stage','product','sopClarity','readiness'].includes(f.key))}:original;
  // Enforce required questions for this action, then retain explicitly supplied
  // optional feedback shown in the shared changeover/End Shift form.
  const values=definitionAnswers(definition,d||{},phase);
  const optional=definition.fields.filter((f:any)=>!f.required&&f.phase!=='bod').map((f:any)=>({...f,phase:'all'}));
  Object.assign(values,definitionAnswers({...definition,fields:optional},d||{}));
  if(u?.role==='reviewer'){delete values.recognition;delete values.recognitionPeople;}return values;
 };
 const finalFeedbackAnswers=(r:ProductionShift,d:any)=>{
  check(d&&typeof d==='object'&&!Array.isArray(d),'Invalid final feedback.');
  const definition=r.formSnapshot?.definition||initialDefinition('arr');
  const excluded=new Set(['workDate','shift','stage','product','team','entryType','segmentStart','segmentEnd','newStage','newProduct','helpNeeded','helpDetail','qualityStatus','sopClarity','units','reportedMoves','rejected','rejects','rework','lot','downtimeMinutes','interruptionMinutes','countType','unit','exception','workException']);
  const fields=definition.fields.filter((f:any)=>f.active!==false&&!excluded.has(f.key)&&(!f.phase||f.phase==='all'||f.phase==='eod'));
  const allowed=new Set(fields.map((f:any)=>f.key));for(const key of Object.keys(d))check(allowed.has(key),'Only the displayed End-of-Day feedback fields may be saved.');
  return definitionAnswers({...definition,fields},d,'eod');
 };
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
 const visible=(r:ProductionShift)=>own(r)||fullShiftView||supervisorAccess(r.operator)||assignedLead(r.operator);
 const correct=(r:ProductionShift)=>supervisorAccess(r.operator);
 const confirm=(r:ProductionShift)=>supervisorAccess(r.operator)||assignedLead(r.operator);
 const narrow=(r:ProductionShift)=>({id:r.id,revision:r.revision,operator:r.operator,username:r.username,workDate:r.workDate,shift:r.shift,team:r.team,readiness:structuredClone(r.readiness),assignment:(()=>{const s=r.segments.at(-1)!;return{stage:s.stage,station:s.station,product:s.product,start:s.start,kind:s.kind};})(),canConfirmReadiness:confirm(r)});
 const safe=(r:ProductionShift)=>{const c=structuredClone(r) as any;delete c.queueInitialOrderKey;if(u&&!recognition){delete c.data.recognition;delete c.data.recognitionPeople;c.history=c.history.map((h:any)=>({at:h.at,by:h.by,role:h.role,action:h.action,reason:h.recognitionChanged?'Restricted recognition details':h.reason}));}if(!u)delete c.shares;if(u&&['lead','reviewer'].includes(u.role))c.shares={[u.id]:c.shares[u.id]};c.canCorrect=correct(r)||own(r)&&['in_progress','needs_attention'].includes(r.status);c.canAddFeedback=own(r)&&r.status==='submitted'&&!r.history.some((h:any)=>h.action==='feedback');c.canManage=supervisorAccess(r.operator);c.canComment=supervisorAccess(r.operator)||assignedLead(r.operator)&&!!share(r);c.canReview=supervisorAccess(r.operator)||assignedLead(r.operator)&&!!share(r);c.canConfirmReadiness=confirm(r);return c;};
 const productHours=(records:ProductionShift[])=>{
  const totals:Record<string,Map<string,number>>={};
  for(const r of records)for(const s of r.segments){if(s.kind!=='production'||!s.product)continue;const end=s.end?Date.parse(s.end):Date.now(),start=Date.parse(s.start);if(!Number.isFinite(start)||!Number.isFinite(end)||end<start)continue;const minutes=Math.max(0,(end-start)/60000-(s.extras?.interruptionMinutes||0));const byProduct=totals[r.operator]??=new Map<string,number>();byProduct.set(s.product,(byProduct.get(s.product)||0)+minutes);}
  return Object.fromEntries(Object.entries(totals).map(([operator,byProduct])=>{const all=[...byProduct].map(([product,minutes])=>({product,minutes})).sort((a,b)=>b.minutes-a.minutes||a.product.localeCompare(b.product));return[operator,{items:all.slice(0,10).map(v=>({...v,minutes:Math.round(v.minutes)})),hasMore:all.length>10}];}));
 };
 const record=async()=>{const r=await tx.get<ProductionShift>('production-shift',text(input.id,100));check(r&&(visible(r)||confirm(r)),'Shift unavailable.',404);return r;};
 const save=async(r:ProductionShift,action:string,before:any,reason='')=>{r.revision++;r.updatedAt=now();r.history.push({at:r.updatedAt,by:actor,role:manager?'manager':u?.role||'operator',action,reason,recognitionChanged:JSON.stringify([before?.data?.recognition,before?.data?.recognitionPeople])!==JSON.stringify([r.data.recognition,r.data.recognitionPeople]),before,after:{status:r.status,segments:structuredClone(r.segments),readiness:structuredClone(r.readiness),data:structuredClone(r.data),workDate:r.workDate,shift:r.shift}});await tx.put('production-shift',r.id,r);const groupChanged=before&&(before.workDate!==r.workDate||before.shift!==r.shift);if(r.status!=='in_progress'||groupChanged){const groups=new Set<string>();if(r.status!=='in_progress')groups.add(`${r.workDate}:${r.shift}`);if(before&&(r.status!=='in_progress'||groupChanged))groups.add(`${before.workDate}:${before.shift||r.shift}`);for(const order of await tx.list<ShiftOrder>('production-shift-order'))if(order.operators.includes(r.operator)&&groups.has(`${order.workDate}:${order.shift}`)){order.operators=order.operators.filter(value=>value!==r.operator);if(order.operators.length)await tx.put('production-shift-order',`${order.managerId}:${order.workDate}:${order.shift}`,order);else await tx.remove('production-shift-order',`${order.managerId}:${order.workDate}:${order.shift}`);}}return visible(r)?{shift:safe(r)}:{readiness:narrow(r)};};
 const newReadiness=(operatorId:string)=>{const managerIds=assignedIds(operatorId,'managerIds','managerId'),leadIds=assignedIds(operatorId,'leadIds','leadId');return{status:'waiting_associate',requestedAt:now(),leadIds,managerIds,leadId:leadIds[0]||null,managerId:managerIds[0]||null};};
 const quickPlan=async(workDate:string,shift:'day'|'swing')=>{
  const sourceDate=dayOffset(workDate,-1),records=await tx.list<ProductionShift>('production-shift'),active=new Set((await tx.list<any>('production-operator')).filter(v=>v.active!==false&&fictionalAssociate.test(v.username)).map(v=>v.id)),byOperator=new Map<string,ProductionShift>();
  for(const r of records)if(r.workDate===sourceDate&&r.shift===shift&&r.status==='closed'&&active.has(r.operator)&&supervisorAccess(r.operator)){const prior=byOperator.get(r.operator);if(!prior||(r.updatedAt||'').localeCompare(prior.updatedAt||'')>0)byOperator.set(r.operator,r);}
  const starts:QuickStartItem[]=[],skips:any[]=[];
  for(const source of [...byOperator.values()].sort((a,b)=>a.username.localeCompare(b.username,undefined,{numeric:true}))){
   const final=source.segments.at(-1),existing=records.find(r=>r.operator===source.operator&&r.workDate===workDate),open=records.find(r=>r.operator===source.operator&&r.segments.some(s=>!s.end));
   if(existing){skips.push({username:source.username,reason:'A shift already exists for this work date.'});continue;}if(open){skips.push({username:source.username,reason:'Another shift is still open.'});continue;}
   if(!final||final.kind!=='waiting'&&(!final.product||!productionConfig.stages.includes(final.stage))){skips.push({username:source.username,reason:'The prior final segment cannot be resumed safely.'});continue;}
   starts.push({operator:source.operator,username:source.username,team:source.team,kind:final.kind,stage:final.stage,station:final.station,product:final.product,productId:final.productId,sourceId:source.id,sourceRevision:source.revision});
  }
  return{sourceDate,starts,skips};
 };
 const activeQuickLocks=async()=>{const locks=await tx.list<QuickStartLock>('production-shift-quick-lock'),active:QuickStartLock[]=[];for(const lock of locks)if(Date.parse(lock.expiresAt)>Date.now())active.push(lock);else await tx.remove('production-shift-quick-lock',`${lock.workDate}:${lock.shift}`);return active;};
 const shiftGroup=(r:any)=>`${r.workDate}:${r.shift}`;
 const queueStart=(r:any)=>Date.parse(r.queueStart||r.segments?.[0]?.start||r.createdAt||'')||0;
 const defaultQueueCompare=(a:any,b:any)=>queueStart(b)-queueStart(a)||(a.queueInitialOrderKey&&b.queueInitialOrderKey?String(b.queueInitialOrderKey).localeCompare(String(a.queueInitialOrderKey),undefined,{numeric:true,sensitivity:'base'}):0)||String(b.createdAt||'').localeCompare(String(a.createdAt||''))||String(a.id).localeCompare(String(b.id));
 const orderedForManager=(records:any[],orders:ShiftOrder[])=>{const output=[...records],byGroup=new Map<string,{positions:number[];rows:any[]}>();records.forEach((r,index)=>{const key=shiftGroup(r),group=byGroup.get(key)||{positions:[],rows:[]};group.positions.push(index);group.rows.push(r);byGroup.set(key,group);});for(const [key,group] of byGroup){const defaults=[...group.rows].sort(defaultQueueCompare),order=orders.find(v=>`${v.workDate}:${v.shift}`===key),ranked=new Map((order?.operators||[]).map((operator,index)=>[operator,index])),movable=(v:any)=>v.status==='in_progress'&&movableAssociate.test(v.operator),activeDefaults=defaults.filter(movable),unranked=activeDefaults.filter(v=>!ranked.has(v.operator)),rankedActive=activeDefaults.filter(v=>ranked.has(v.operator)).sort((a,b)=>ranked.get(a.operator)!-ranked.get(b.operator)!),active=[...unranked,...rankedActive];let cursor=0;const arranged=defaults.map(v=>movable(v)?active[cursor++]:v);group.positions.forEach((position,index)=>output[position]=arranged[index]);}return output;};
 const managerOrders=async()=>manager&&u?(await tx.list<ShiftOrder>('production-shift-order')).filter(v=>v.managerId===u.id):[];
 if(route==='production-shift-order-move'){
  check(manager&&u,'Supervisor role required.',403);const workDate=validDate(input.workDate);check(input.shift==='day'||input.shift==='swing','Choose Day or Swing shift.');check(input.direction==='up'||input.direction==='down','Choose Up or Down.');const shift: 'day'|'swing'=input.shift,operator=text(input.operator,100),direction: 'up'|'down'=input.direction;check(Array.isArray(input.visibleOperators)&&input.visibleOperators.length>0&&input.visibleOperators.length<=250,'Choose the visible in-progress associates.');const requested=input.visibleOperators.map((v:any)=>text(v,100));check(new Set(requested).size===requested.length&&requested.includes(operator),'Invalid visible associate order.');
  const records=(await tx.list<ProductionShift>('production-shift')).filter(r=>r.workDate===workDate&&r.shift===shift&&visible(r)),orders=await managerOrders(),current=orderedForManager(records,orders).filter(r=>r.status==='in_progress'&&movableAssociate.test(r.operator)),byOperator=new Map(current.map(r=>[r.operator,r]));check(requested.every((value:string)=>byOperator.has(value))&&byOperator.has(operator),'Only visible In-progress associates can be reordered.',409);const visibleOrder=current.filter(r=>requested.includes(r.operator)).map(r=>r.operator);check(visibleOrder.length===requested.length,'The visible shift list changed. Refresh before reordering.',409);const at=visibleOrder.indexOf(operator),next=direction==='up'?at-1:at+1;check(next>=0&&next<visibleOrder.length,'This associate is already at that edge.');[visibleOrder[at],visibleOrder[next]]=[visibleOrder[next],visibleOrder[at]];let cursor=0;const visibleSet=new Set(visibleOrder),fullOrder=current.map(r=>visibleSet.has(r.operator)?visibleOrder[cursor++]:r.operator),record:ShiftOrder={managerId:u.id,workDate,shift,operators:fullOrder,updatedAt:now()};await tx.put('production-shift-order',`${u.id}:${workDate}:${shift}`,record);return{orderedOperators:visibleOrder};
 }
 if(route==='production-shift-quick-status'){
  check(manager,'Supervisor role required.',403);const workDate=validDate(input.workDate);check(workDate<=workToday(),'Work date cannot be in the future.');const locks=await activeQuickLocks();const result:any={};
  for(const shift of ['day','swing'] as const){const plan=await quickPlan(workDate,shift),lock=locks.find(v=>v.workDate===workDate&&v.shift===shift&&Date.parse(v.expiresAt)>Date.now());result[shift]={eligible:plan.starts.length,skipped:plan.skips.length,enabled:plan.starts.length>0&&!lock,locked:!!lock};}return result;
 }
 if(route==='production-shift-quick-preview'){
  check(manager&&u,'Supervisor role required.',403);const workDate=validDate(input.workDate),shift=input.shift==='swing'?'swing':'day';check(workDate<=workToday(),'Work date cannot be in the future.');const key=`${workDate}:${shift}`,existing=(await activeQuickLocks()).find(v=>v.workDate===workDate&&v.shift===shift);check(!existing,'Another Manager already has this quick-start preview open.',409);
  const plan=await quickPlan(workDate,shift);check(plan.starts.length>0,'No eligible associates are available for this quick start.',409);const lock:QuickStartLock={token:id(),managerId:u.id,managerUsername:actor,workDate,shift,starts:structuredClone(plan.starts),createdAt:now(),expiresAt:new Date(Date.now()+15*60000).toISOString()};await tx.put('production-shift-quick-lock',key,lock);
  return{token:lock.token,workDate,sourceDate:plan.sourceDate,shift,startTime:shift==='day'?'5:00am':'3:00pm',expiresAt:lock.expiresAt,starts:plan.starts.map(({operator,sourceId,sourceRevision,...v})=>v),skips:plan.skips};
 }
 if(route==='production-shift-quick-cancel'){
  check(manager&&u,'Supervisor role required.',403);const token=text(input.token,100),locks=await activeQuickLocks(),lock=locks.find(v=>v.token===token&&v.managerId===u.id);if(lock)await tx.remove('production-shift-quick-lock',`${lock.workDate}:${lock.shift}`);return{cancelled:!!lock};
 }
 if(route==='production-shift-quick-confirm'){
  check(manager&&u,'Supervisor role required.',403);const token=text(input.token,100),locks=await activeQuickLocks(),lock=locks.find(v=>v.token===token);check(lock&&lock.managerId===u.id,'This quick-start preview is unavailable or expired. Create a new preview.',409);
  for(const item of lock.starts){const source=await tx.get<ProductionShift>('production-shift',item.sourceId);check(source?.revision===item.sourceRevision&&source.status==='closed','A prior shift changed after the preview. Cancel and create a new preview.',409);}
  const records=await tx.list<ProductionShift>('production-shift'),operators=await tx.list<any>('production-operator'),activeById=new Map(operators.filter(v=>v.active!==false&&fictionalAssociate.test(v.username)).map(v=>[v.id,v])),form=await tx.get('production-form','arr'),created:any[]=[],skipped:any[]=[];const reason=`Quick shift start for all ${lock.shift==='day'?'Day':'Swing'} at ${lock.shift==='day'?'5am':'3pm'} by - ${actor}`,start=pacificShiftStart(lock.workDate,lock.shift);
  for(const item of lock.starts){const operator:any=activeById.get(item.operator);if(!operator){skipped.push({username:item.username,reason:'The associate account is no longer active or eligible.'});continue;}if(!supervisorAccess(item.operator)){skipped.push({username:item.username,reason:'The associate is no longer assigned to this Supervisor.'});continue;}if(records.some(r=>r.operator===item.operator&&r.workDate===lock.workDate)){skipped.push({username:item.username,reason:'A shift already exists for this work date.'});continue;}if(records.some(r=>r.operator===item.operator&&r.segments.some(s=>!s.end))){skipped.push({username:item.username,reason:'Another shift is still open.'});continue;}const readiness=item.kind==='training'?newReadiness(item.operator):null,queueInitialOrderKey=[operator.profile?.firstName,operator.profile?.lastName].filter(Boolean).join(' ').trim()||operator.username;const segment:ShiftSegment={id:id(),kind:item.kind,start,end:null,stage:item.stage,station:item.station,product:item.product,productId:item.productId,reportedMoves:null,...(item.kind==='production'?{sopReadySource:'demo_preselected' as const}:{})};const r:ProductionShift={id:id(),operator:item.operator,username:item.username,workDate:lock.workDate,shift:lock.shift,team:item.team,status:'in_progress',revision:0,segments:[segment],data:{},formSnapshot:structuredClone({identity:form?.identity||'production-demo-arr',version:form?.version||'0.1.0',definition:form?.definition||initialDefinition('arr')}),createdAt:now(),updatedAt:now(),shares:{},readiness,history:[],queueInitialOrderKey};created.push((await save(r,'start',null,reason)).shift);}
  await tx.remove('production-shift-quick-lock',`${lock.workDate}:${lock.shift}`);return{created,skipped};
 }
 if(route==='production-shift-start'){
  check(!u&&o,'Use your associate account to begin a shift.',403);const actualStart=stamp(input.actualTime),date=input.workDate?validDate(input.workDate):shiftWorkDate(actualStart,settings.cutoffHour??3),key=id();check(date<=workToday(),'Work date cannot be in the future.');const quickLocks=await activeQuickLocks();check(!quickLocks.some(v=>v.workDate===date&&v.starts.some(item=>item.operator===o.id)),'A Manager is preparing this shift start. Please come back shortly; after it opens, update your shift if today’s assignment is different.',409);check(input.waitingForAssignment===true||input.needsReadiness===true||input.sopReady===true||typeof input.data?.sopClarity==='number','Select your SOP understanding or request SOP review before starting.');
  check(!(await tx.list<ProductionShift>('production-shift')).some(r=>r.operator===o.id&&r.workDate===date),'A shift already exists for this work date. Open it to continue.',409);
  const open=(await tx.list<ProductionShift>('production-shift')).some(r=>r.operator===o.id&&r.segments.some(s=>!s.end));check(!open,'Finish the existing open shift first.',409);
  const defaultShift=settings.crewAssignments?.[o.id]?.defaultShift||'day';check(productionConfig.shifts.some(s=>s.id===(input.shift||defaultShift)),'Choose a valid shift.');const start=actualStart,a=input.waitingForAssignment===true?waitingAssignment():await resolvedAssignment(input.assignment),form=await tx.get('production-form','arr');const crew=settings.crewAssignments?.[o.id];check((settings.teams||productionConfig.teams).includes(crew?.team||input.team||'Team A'),'Choose a configured crew.');
  const r:ProductionShift={id:key,operator:o.id,username:o.username,workDate:date,shift:text(input.shift||defaultShift,30),team:crew?.team||text(input.team||'Team A',100),status:'in_progress',revision:0,segments:[{id:id(),kind:input.waitingForAssignment===true?'waiting':input.needsReadiness?'training':'production',start,end:null,...a,reportedMoves:null,...(input.waitingForAssignment!==true&&!input.needsReadiness&&(input.sopReady===true||typeof input.data?.sopClarity==='number')?{sopReadySource:input.sopReady===true?(input.sopReadySource==='demo_preselected'?'demo_preselected' as const:'associate' as const):'legacy_score' as const}:{})}],data:definitionAnswers(input.waitingForAssignment===true?{...(form?.definition||initialDefinition('arr')),fields:(form?.definition||initialDefinition('arr')).fields.filter((f:any)=>!['stage','product','sopClarity','readiness'].includes(f.key))}:form?.definition||initialDefinition('arr'),input.data||{},'bod'),formSnapshot:structuredClone({identity:form?.identity||'production-demo-arr',version:form?.version||'0.1.0',definition:form?.definition||initialDefinition('arr')}),createdAt:now(),updatedAt:now(),shares:{},readiness:input.waitingForAssignment!==true&&input.needsReadiness?newReadiness(o.id):null,history:[]};
  return save(r,'start',null);
 }
 if(route==='production-shift-close-many'){
  check(manager,'Supervisor role required.',403);check(Array.isArray(input.shifts)&&input.shifts.length>0&&input.shifts.length<=100,'Select 1 to 100 shifts.');
  const records:ProductionShift[]=[];const seen=new Set<string>();
  for(const item of input.shifts){check(!seen.has(item.id),'Duplicate shift selection.');seen.add(item.id);const r=await tx.get<ProductionShift>('production-shift',text(item.id,100));check(r&&visible(r)&&supervisorAccess(r.operator)&&r.revision===item.revision,'A selected shift changed or is unavailable. Refresh before closeout.',409);check(r.status==='submitted'&&r.segments.every(s=>s.end),'Incomplete or unsubmitted shifts cannot be closed.');records.push(r);}
  const shifts=[];for(const r of records){const before={status:r.status,segments:structuredClone(r.segments),readiness:structuredClone(r.readiness),data:structuredClone(r.data),workDate:r.workDate,shift:r.shift};r.status='closed';shifts.push((await save(r,'close',before)).shift);}return{shifts};
 }
 if(route==='production-shift-presence'){
  check(u&&(fullShiftView||formAccess),'Staff access required.',403);const from=validDate(input.from||dayOffset(workToday(),-14)),to=validDate(input.to||workToday());check(from<=to,'Invalid date range.');const teams=Array.isArray(input.teams)?input.teams.map((v:any)=>text(v,100)):[];
  const shifts=(await tx.productionShiftPresence(from,to,teams,input.hideClosed===true)).filter((r:any)=>visible(r));return{shifts:(manager?orderedForManager(shifts,await managerOrders()):shifts).map((r:any)=>{const c={...r};delete c.queueStart;delete c.queueInitialOrderKey;return c;})};
 }
 if(route==='production-shift-list'){
  const from=validDate(input.from||dayOffset(workToday(),-14)),to=validDate(input.to||workToday());check(from<=to,'Invalid date range.');const readiness=[],visibleRecords:ProductionShift[]=[];
  for(const r of await tx.list<ProductionShift>('production-shift'))if(r.workDate>=from&&r.workDate<=to&&(!input.teams?.length||input.teams.includes(r.team))){if(visible(r))visibleRecords.push(r);if(r.readiness&&['waiting_associate','waiting_confirmation'].includes(r.readiness.status)&&confirm(r))readiness.push(narrow(r));}
  const ordered=manager?orderedForManager(visibleRecords,await managerOrders()):visibleRecords;return{shifts:ordered.map(safe),readiness,canManage:manager,...(manager?{productHours:productHours(visibleRecords)}:{})};
 }
 if(route==='production-shift-leads'){
  const operator=text(input.operator,100);check(supervisorAccess(operator),'Assigned Supervisor access required.',403);const ids=assignedIds(operator,'leadIds','leadId'),users=await tx.list<User>('user');return{leads:users.filter(v=>ids.includes(v.id)&&v.active&&['lead','reviewer'].includes(v.role)&&v.forms.includes('arr')).map(v=>({id:v.id,username:v.username}))};
 }
 const r=await record();
 if(route==='production-shift-detail')return visible(r)?{shift:safe(r)}:{readiness:narrow(r)};
 check(route==='production-shift-action','Unknown shift operation.',404);check(input.revision===r.revision,'Shift changed. Refresh before saving.',409);
 const action=text(input.action,60),before={status:r.status,segments:structuredClone(r.segments),readiness:structuredClone(r.readiness),data:structuredClone(r.data),workDate:r.workDate,shift:r.shift};
 if(action==='readiness-confirm'){
  check(confirm(r),'Lead or supervisor confirmation required.',403);check(r.readiness?.status==='waiting_confirmation','Associate must confirm readiness first.');r.readiness={...r.readiness,status:'confirmed',confirmedAt:now(),confirmedBy:actor,note:text(input.note||'',1000)};return save(r,action,before);
 }
 check(visible(r),'Shift unavailable.',404);
 if(action==='share'||action==='retract'){
  check(supervisorAccess(r.operator),'Assigned Supervisor access required.',403);const lead=await tx.get<User>('user',text(input.leadId,100));check(lead?.active&&['lead','reviewer'].includes(lead.role)&&lead.forms.includes('arr')&&assignedIds(r.operator,'leadIds','leadId').includes(lead.id),'Choose a currently assigned ARR Lead.');
  if(action==='share')r.shares[lead.id]={assignedAt:now(),allowCorrections:false};else{check(r.shares[lead.id],'No existing share.');r.shares[lead.id].retractedAt=now();}return save(r,action,before);
 }
 if(action==='comment'){check(supervisorAccess(r.operator)||assignedLead(r.operator)&&share(r),'Assigned shared Lead or Supervisor access required.',403);const note=text(input.note,1500);check(note,'Enter a note.');return save(r,action,before,note);}
 if(action==='reviewed'){check(supervisorAccess(r.operator)||assignedLead(r.operator)&&share(r),'Assigned shared Lead or Supervisor access required.',403);return save(r,action,before);}
 if(action==='feedback'){check(own(r),'Associate access required.',403);check(r.status==='submitted','End the shift before saving final feedback.');check(!r.history.some((h:any)=>h.action==='feedback'),'Final feedback has already been saved.',409);r.data={...r.data,...finalFeedbackAnswers(r,input.data)};return save(r,action,before);}
 if(action==='close'){check(manager,'Supervisor role required.',403);check(r.status==='submitted'&&r.segments.every(s=>s.end),'Only submitted, complete shifts can be closed.');r.status='closed';return save(r,action,before);}
 if(action==='reopen'){check(correct(r),'Correction permission required.',403);check(r.status==='closed'||r.status==='submitted','Shift is already open.');check(text(input.reason,1000),'Enter a correction reason.');r.status='needs_attention';return save(r,action,before,text(input.reason,1000));}
 if(action==='submit'){check(correct(r)||own(r)&&['in_progress','needs_attention'].includes(r.status),'Correction permission required.',403);timeline(r.segments,true);r.status='submitted';return save(r,action,before,text(input.reason||'',1000));}
 if(action==='needs_attention'){check(manager,'Supervisor role required.',403);check(r.status!=='closed','Reopen this shift first.');r.status='needs_attention';return save(r,action,before,text(input.reason||'',1000));}
 if(action==='readiness-ready'){check(own(r),'Associate confirmation required.',403);check(r.readiness?.status==='waiting_associate','No pending preparation.');r.readiness.status='waiting_confirmation';r.readiness.associateConfirmedAt=now();return save(r,action,before);}
 if(action==='test-c-plus-two'){
  check(supervisorAccess(r.operator),'Assigned Supervisor access required.',403);check(r.status==='in_progress','Test C +2 requires an In-progress shift.');const last=r.segments.at(-1);check(last&&!last.end&&last.kind==='production'&&last.product&&productionConfig.stages.includes(last.stage),'Test C +2 requires a current production station.');const boundary=new Date(Date.parse(last.start)+2*60*60*1000);check(Number.isFinite(boundary.getTime())&&Date.now()>=boundary.getTime(),'The current station must have at least two hours elapsed.');const index=productionConfig.stages.indexOf(last.stage),nextStage=productionConfig.stages[(index+1)%productionConfig.stages.length],at=boundary.toISOString();last.end=at;r.segments.push({id:id(),kind:'production',start:at,end:null,stage:nextStage,station:nextStage,product:last.product,...(last.productId?{productId:last.productId}:{}),reportedMoves:null,sopReadySource:'demo_preselected'});r.readiness=null;timeline(r.segments,false);return save(r,action,before,TEST_C_REASON);
 }
 check(correct(r)||own(r)&&['in_progress','needs_attention'].includes(r.status),'Correction permission required.',403);check(r.status!=='closed','Reopen this shift before making corrections.',409);
 const reason=text(input.reason||'',1000);if(u||action==='correct')check(reason,'Enter a brief correction reason.');
 if(action==='segment-counts'){
  const segment=r.segments.find(s=>s.id===text(input.segmentId,100));check(segment,'Choose an existing station segment.');check(segment.kind==='production','Gate quantities apply only to production stations.');
  const gatePasses=count(input.gatePasses,'Gate Passes'),gateHolds=count(input.gateHolds,'Gate Holds'),details:any={...(segment.extras||{})};
  if(gateHolds===null)delete details.rejected;else details.rejected=gateHolds;details.countType=gatePasses===null?'not_counted':details.countType==='exact'?'exact':'estimated';
  segment.reportedMoves=gatePasses;segment.extras=extras(details,gatePasses);return save(r,action,before,reason);
 }
 if(action==='correct'){
  if(input.workDate!==undefined){const date=validDate(input.workDate);check(date<=workToday(),'Work date cannot be in the future.');check(!(await tx.list<ProductionShift>('production-shift')).some(v=>v.id!==r.id&&v.operator===r.operator&&v.workDate===date),'A shift already exists for this work date.');r.workDate=date;}
  check(Array.isArray(input.segments)&&input.segments.length===r.segments.length,'Correct the existing segments together.');
  const next:ShiftSegment[]=await Promise.all(input.segments.map(async(s:any,i:number)=>{const old=r.segments[i];check(s.id===old.id,'Segment identities and order cannot change.');return{...old,...(old.kind==='waiting'?waitingAssignment():await resolvedAssignment(s)),start:stamp(s.start),end:s.end===null?null:stamp(s.end),reportedMoves:old.kind==='waiting'?null:count(s.reportedMoves),extras:old.kind==='waiting'?undefined:extras(s.extras??old.extras,count(s.reportedMoves))};}));timeline(next,r.status==='submitted');r.segments=next;if(input.data)r.data=correctedAnswers(r,input.data);return save(r,action,before,reason);
 }
 const last=r.segments.at(-1)!;check(!last.end,'This shift has no active assignment.');const actual=stamp(input.actualTime);check(actual>=last.start,'Actual time cannot be before the current assignment start.');
 if(action==='begin-work'){check(last.kind==='training'&&r.readiness?.status==='confirmed','Lead or supervisor readiness confirmation is required before production begins.');last.end=actual;r.segments.push({...last,id:id(),kind:'production',start:actual,end:null,reportedMoves:null,extras:undefined});}
 else if(action==='changeover'){
  check(last.kind!=='training'||r.readiness?.status==='confirmed'||input.needsReadiness===true||input.waitingForAssignment===true,'Confirm SOP readiness before beginning production.');if(last.kind==='waiting'&&input.waitingForAssignment!==true)check(input.needsReadiness===true||input.sopReady===true||typeof input.data?.sopClarity==='number','Select your SOP understanding or request SOP review for the new assignment.');const a=input.waitingForAssignment===true?waitingAssignment():await resolvedAssignment(input.assignment);last.end=actual;last.reportedMoves=last.kind==='waiting'?null:count(input.reportedMoves);last.extras=last.kind==='waiting'?undefined:extras(input.extras||{...input.data,rejected:input.data?.rejects,interruptionMinutes:input.data?.interruptionMinutes??input.data?.downtimeMinutes},last.reportedMoves);r.segments.push({id:id(),kind:input.waitingForAssignment===true?'waiting':input.needsReadiness?'training':'production',start:actual,end:null,...a,reportedMoves:null,...(input.waitingForAssignment!==true&&!input.needsReadiness&&(input.sopReady===true||typeof input.data?.sopClarity==='number')?{sopReadySource:input.sopReady===true?(input.sopReadySource==='demo_preselected'?'demo_preselected' as const:'associate' as const):'legacy_score' as const}:{})});r.readiness=input.waitingForAssignment!==true&&input.needsReadiness?newReadiness(r.operator):null;r.data={...r.data,...answers(r,input.data,'changeover',input.waitingForAssignment===true)};
 }else if(action==='end'){check(input.confirmed===true,'Review the shift timeline and confirm End Shift before submission.');last.end=actual;last.reportedMoves=last.kind==='waiting'?null:count(input.reportedMoves);last.extras=last.kind==='waiting'?undefined:extras(input.extras||{...input.data,rejected:input.data?.rejects,interruptionMinutes:input.data?.interruptionMinutes??input.data?.downtimeMinutes},last.reportedMoves);r.status='submitted';if(r.readiness&&r.readiness.status!=='confirmed')r.readiness={...r.readiness,status:'cancelled',cancelledAt:now()};r.data={...r.data,...answers(r,input.data,'eod',last.kind==='waiting')};}
 else check(false,'Unknown shift action.');
 timeline(r.segments,r.status==='submitted');return save(r,action,before,reason);
}
