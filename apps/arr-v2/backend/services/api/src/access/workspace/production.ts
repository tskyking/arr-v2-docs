import {seedProducts,catalogRoutes,resolveProduct} from './production-catalog.js';
import {ensureProductionForms,formRoutes,definitionForProductionEntry} from './production-forms.js';
import {settingsRoutes} from './production-settings.js';
import {shiftRoutes} from './production-shifts.js';
import {productionAllocations} from './production-allocations.js';
import { scryptSync } from 'node:crypto';
import {check,id,now,text,secret,sha256,verifyPassword,publicUser,type User} from './model.js';
import {productionConfig,productionAnswers,workToday,dayOffset,lateEod,validDate,scoreFields,type ProductionEntry} from './production-model.js';
import type {WorkspaceTx} from './store.js';
type Operator={id:string;username:string;role:'operator';active:boolean;password:{salt:string;hash:string}};
const formOK=(u:User,f:string)=>u.role==='owner'||u.forms.includes(f);
const opSafe=(o:Operator)=>({id:o.id,username:o.username,role:o.role,demo:true});
async function audit(tx:WorkspaceTx,by:string,action:string,note:string) {const key=id();await tx.put('production-event',key,{id:key,by,action,note,at:now()});}
async function seed(tx:WorkspaceTx) {
 if(await tx.get('production-settings','main'))return;
 for(let n=1;n<=10;n++) {const key=`person-${n}`,salt=secret();await tx.put('production-operator',key,{id:key,username:key,role:'operator',active:true,password:{salt,hash:scryptSync('abc@123',salt,64).toString('hex')}});}
 for(const form of ['arr','prr']) await tx.put('production-form',form,{id:form,identity:`production-demo-${form}`,version:'0.1.0',publishedAt:now()});
 await tx.put('production-settings','main',productionConfig);
 let date=workToday();for(let n=0;n<30;n++){do {date=dayOffset(date,-1);} while([0,6].includes(new Date(date+'T12:00:00Z').getUTCDay()));await tx.put('production-total',date,{date,units:1400+Math.round(Math.sin(n*1.7)*330),dataSource:'synthetic_seed',team:'Team A',provenance:'fictional group total',note:n===3?'Fictional facility interruption':n===9?'Fictional training support':'Fictional production history'});}
}
/** Runs under the workspace transaction lock. Never resets an existing account or production total. */
async function expandDemoAssociates(tx:WorkspaceTx) {
 const migration='associates-30-v1';
 if(await tx.get('production-migration',migration))return;
 for(let n=11;n<=30;n++) {
  const key=`person-${n}`;
  if(await tx.get('production-operator',key))continue;
  const salt=secret();
  await tx.put('production-operator',key,{id:key,username:key,role:'operator',active:true,password:{salt,hash:scryptSync('abc@123',salt,64).toString('hex')}});
 }
 await tx.put('production-migration',migration,{completedAt:now(),associateCount:30});
}
export async function production(tx:WorkspaceTx,u:User|undefined,route:string,input:any,operatorToken:string,photo?:string|null):Promise<any> {
 await seed(tx);
 await expandDemoAssociates(tx);
 await seedProducts(tx);
 await ensureProductionForms(tx);
 const session=operatorToken?await tx.get('production-session',sha256(operatorToken)):undefined;
 const operator:Operator|undefined=session&&session.expires>now()?await tx.get('production-operator',session.user):undefined;
 const o=operator?.active?operator:undefined;
 const permissions=u?await tx.get('production-permission',u.id):undefined;
 const operationalManager=!!u&&(u.role==='manager'||u.role==='owner'&&permissions?.operationalManager===true);
 const recognition=!!u&&(u.role==='owner'||u.role==='manager'||u.role==='admin'&&permissions?.recognition===true);
 const publishing=!!u&&(u.role==='owner'||u.role==='manager'||u.role==='admin'&&permissions?.updates===true);
 const scope=async(r:ProductionEntry)=>{if(!u)return o?.id===r.operator;if(!formOK(u,r.form))return false;const p=await tx.get('production-permission',u.id);if(u.role!=='manager'&&p?.teams?.length&&!p.teams.includes(r.data.team))return false;return u.role!=='reviewer'||!!(r.shares[u.id]&&!r.shares[u.id].retractedAt);};
 const safe=async(r:ProductionEntry)=>{
  const copy=structuredClone(r) as any;if(!copy.definition){copy.definition=await definitionForProductionEntry(tx,r);if(!copy.definition)copy.definitionUnavailable=true;}delete copy.photo;if(copy.form==='arr'){for(const key of ['estimatedCost','expectedValue','expectedResult','proposal','categories','supporters','applicableArea'])if(!copy.definition?.fields?.some((f:any)=>f.key===key&&f.active))delete copy.data[key];}copy.hasPhoto=!!r.photo;
  if(u&&!recognition) {delete copy.data.recognition;delete copy.data.recognitionPeople;delete copy.data.supporters;}
  if(u?.role==='reviewer') {copy.history=copy.history.filter((h:any)=>h.visibility==='worker'||h.by===u.username);copy.shares={[u.id]:copy.shares[u.id]};}
  if(!u) {copy.history=copy.history.filter((h:any)=>h.visibility==='worker');delete copy.shares;} else copy.review=await tx.get('production-review',`${r.id}:${u.id}`)||{viewedAt:null,reviewedAt:null};
  copy.canManage=operationalManager;copy.canPublish=publishing;return copy;
 };
 const get=async()=>{const r=await tx.get<ProductionEntry>('production-entry',text(input.id,100));check(r&&await scope(r),'Entry unavailable.',404);return r;};
 const change=async()=>{const r=await get();check(input.revision===r.revision,'Entry changed. Refresh before saving.',409);return r;};
 const save=async(r:ProductionEntry,action:string,note:string,visibility:'worker'|'internal'='internal')=>{r.revision++;r.updatedAt=now();r.history.push({at:r.updatedAt,by:u?.username||o!.username,action,note,visibility});await tx.put('production-entry',r.id,r);await audit(tx,u?.username||o!.username,action,r.id);return {entry:await safe(r)};};
 if(route==='production-login') {
  const username=text(input.username,80).toLowerCase();const found=await tx.get<Operator>('production-operator',username);
  check(found?.active&&verifyPassword(input.password,found.password),'Username or password is incorrect.',401);
  const token=secret();await tx.put('production-session',sha256(token),{user:found.id,expires:new Date(Date.now()+4*3600000).toISOString()});await audit(tx,username,'demo operator login','');return{token,user:opSafe(found)};
 }
 if(route==='production-logout'){if(operatorToken)await tx.remove('production-session',sha256(operatorToken));return{ok:true};}
 if(route==='production-catalog')return{user:u?publicUser(u):o?opSafe(o):null,config:{...productionConfig,...await tx.get('production-settings','main')},products:(await tx.list('production-product')).filter(p=>p.active&&p.common),forms:(await tx.list('production-form')).map(f=>({id:f.id,identity:f.identity,version:f.version,publishedAt:f.publishedAt,definition:f.definition})),operators:(await tx.list<Operator>('production-operator')).filter(v=>v.active).map(v=>({id:v.id,username:v.username})),capabilities:{recognition,publishing,operationalManager},demo:true};
 check(u||o,'Please sign in.',401);
 for(const dispatch of [()=>catalogRoutes(tx,u,!!(u||o),route,input),()=>formRoutes(tx,u,route,input),()=>settingsRoutes(tx,u,route,input),()=>shiftRoutes(tx,u,o,route,input),()=>productionAllocations(tx,u,route,input)]) {const result=await dispatch();if(result!==undefined)return result;}
 if(route==='production-associate-list') {
  check(u&&(u.role==='owner'||u.role==='admin'),'Administrator access required.',403);
  return{operators:(await tx.list<Operator>('production-operator')).map(v=>({id:v.id,username:v.username,active:v.active,revision:(v as any).revision||1})).sort((a,b)=>a.username.localeCompare(b.username,undefined,{numeric:true}))};
 }
 if(route==='production-associate-save') {
  check(u?.role==='owner','A+ manages associate access.',403);
  const username=text(input.id||input.username,80).toLowerCase();check(/^person-[1-9][0-9]{0,3}$/.test(username),'Use a fictional person-number username.');
  const existing=await tx.get('production-operator',username);check(typeof input.active==='boolean','Specify active status.');
  if(existing)check(input.revision===(existing.revision||1),'Associate changed. Refresh before saving.',409);
  const salt=existing?undefined:secret();const account=existing||{id:username,username,role:'operator',password:{salt,hash:scryptSync('abc@123',salt!,64).toString('hex')}};
  const before={active:existing?.active,revision:existing?.revision||0};account.active=input.active;account.revision=(existing?.revision||1)+1;
  await tx.put('production-operator',username,account);if(!account.active)await tx.removeForUser('production-session',username);
  const key=id();await tx.put('production-event',key,{id:key,at:now(),by:u.username,action:'associate access updated',operator:username,before,after:{active:account.active,revision:account.revision}});
  return{operator:{id:username,username,active:account.active,revision:account.revision}};
 }
 if(route==='production-permission') {
  check(u?.role==='owner','Owner access required.',403);const userId=text(input.userId,100);const target=await tx.get<User>('user',userId);check(target&&target.role!=='reviewer','Choose a Manager or Admin account.');
  check(typeof input.recognition==='boolean'&&typeof input.updates==='boolean','Specify permission flags.');const teams=input.teams===undefined?[]:input.teams;check(Array.isArray(teams)&&teams.every((t:any)=>productionConfig.teams.includes(t)),'Invalid team scope.');
  check(input.operationalManager===undefined||typeof input.operationalManager==='boolean','Invalid operational role.');check(!input.operationalManager||target.role==='owner','Additional operational role is for Owner accounts.');await tx.put('production-permission',userId,{...await tx.get('production-permission',userId),recognition:input.recognition,updates:input.updates,teams,...(input.operationalManager!==undefined?{operationalManager:input.operationalManager}:{})});await audit(tx,u.username,'permissions updated',userId);return{ok:true};
 }
 if(route==='production-submit') {
  check(!u&&o,'Use an operator account to submit.',403);check(['arr','prr'].includes(input.form),'Unknown form.');const f=await tx.get('production-form',input.form);
  const key=text(input.idempotencyKey,100);check(key.length>=8,'A submission key is required.');const hash=sha256(JSON.stringify({form:input.form,version:input.formVersion,data:input.data,photo:photo||null,sourceEntryId:input.sourceEntryId||null,relatedId:input.relatedId||null}));const previous=await tx.get('production-idempotency',`${o.id}:${key}`);
  if(previous){check(previous.hash===hash,'Submission key already used for different answers.',409);return{entry:await safe((await tx.get<ProductionEntry>('production-entry',previous.id))!)};}
  check(input.form!=='arr'||f.version==='0.1.0','ARR now uses the continuous shift workflow. Reload and use Start shift, Change assignment, or End shift.',409);
  check(input.formVersion===f.version,'Form version changed. Reload the form.',409);
  const data=productionAnswers(input.form,input.data,f.definition);const definition=structuredClone(f.definition);const configured=await tx.get('production-settings','main');check(configured.teams.includes(data.team),'Choose a valid crew.');const product=await resolveProduct(tx,data.product,o.username);Object.assign(data,product);const stamp=now();const rid=id();const r:ProductionEntry={definition,id:rid,reference:`${input.form.toUpperCase()}-${rid.slice(0,8).toUpperCase()}`,form:input.form,formIdentity:f.identity,formVersion:f.version,operator:o.id,username:o.username,data,status:input.form==='prr'?'under review':'submitted',revision:1,submittedAt:stamp,updatedAt:stamp,dataSource:'interactive_demo',lateEntry:lateEod(data,stamp),history:[{at:stamp,by:o.username,action:'submitted',note:'',visibility:'worker'}],shares:{}};
  for(const k of ['sourceEntryId','relatedId'] as const) if(input[k]) {check(input.form==='prr','Links apply to PRR proposals.');const linked=await tx.get<ProductionEntry>('production-entry',text(input[k],100));check(linked&&linked.operator===o.id&&linked.form===(k==='sourceEntryId'?'arr':'prr'),'Linked entry unavailable.',404);r[k]=linked.id;}
  if(photo)r.photo=photo;await tx.put('production-entry',rid,r);await tx.put('production-idempotency',`${o.id}:${key}`,{id:rid,hash});await tx.remove('production-draft',`${o.id}:${input.form}`);return{entry:await safe(r)};
 }
 if(route==='production-draft') {
  check(!u&&o,'Use an operator account.',403);check(['arr','prr'].includes(input.form),'Unknown form.');const key=`${o.id}:${input.form}`;
  if(input.data===undefined)return{draft:await tx.get('production-draft',key)||null};check(input.data&&typeof input.data==='object'&&JSON.stringify(input.data).length<30000,'Draft too large.');await tx.put('production-draft',key,{form:input.form,data:input.data,updatedAt:now(),formVersion:(await tx.get('production-form',input.form)).version});return{ok:true};
 }
 if(route==='production-detail') {const r=await get();if(u){const key=`${r.id}:${u.id}`,old=await tx.get('production-review',key);await tx.put('production-review',key,{...old,viewedAt:old?.viewedAt||now(),lastViewedAt:now()});}return{entry:await safe(r)};}
 if(route==='production-comment') {const r=await change();const note=text(input.note,1500);check(note,'Enter a comment.');return save(r,'comment',note,u?'internal':'worker');}
 if(route==='production-action') {
  check(u,'Staff access required.',403);const r=await change();const action=text(input.action,80),note=text(input.note||'',2000);
  if(action==='reviewed'){const key=`${r.id}:${u.id}`,old=await tx.get('production-review',key);await tx.put('production-review',key,{...old,viewedAt:old?.viewedAt||now(),reviewedAt:now()});return save(r,'reviewed','');}
  if(['share','retract'].includes(action)){check(u.role==='manager'||u.role==='owner','Manager access required.',403);const lead=await tx.get<User>('user',text(input.leadId,100));check(lead?.active&&lead.role==='reviewer'&&formOK(lead,r.form),'Choose an active lead assigned to this form.');if(action==='share')r.shares[lead.id]={assignedAt:now()};else{check(r.shares[lead.id],'No lead assignment.');r.shares[lead.id].retractedAt=now();}return save(r,action,lead.username);}
  if(action==='update'){check(publishing,'Not authorized to publish worker updates.',403);check(note,'Enter the refined proposal.');r.proposalUpdate=note;return save(r,'Suggestion updated',note,'worker');}
  check(operationalManager,'Manager access required.',403);check(r.form==='prr','ARR check-ins use Reviewed, not approval.');check(['under review','approved','deferred','declined','implemented'].includes(action),'Unknown decision.');r.status=action;return save(r,action,note,'worker');
 }
 if(route==='production-leads'){check(u&&(u.role==='manager'||u.role==='owner'),'Manager access required.',403);return{leads:(await tx.list<User>('user')).filter(v=>v.active&&v.role==='reviewer'&&(u.role==='owner'||v.forms.some(f=>u.forms.includes(f)))).map(v=>({id:v.id,username:v.username,forms:v.forms}))};}
 if(route==='production-list'||route==='production-dashboard') {
  const from=validRange(input.from,dayOffset(workToday(),-2)),to=validRange(input.to,workToday());check(from<=to&&Date.parse(to)-Date.parse(from)<=366*86400000,'Choose a date range of at most one year.');
  const records:ProductionEntry[]=[];for(const r of await tx.list<ProductionEntry>('production-entry')) if(r.data.workDate>=from&&r.data.workDate<=to&&(!input.form||r.form===input.form)&&(!input.dataSource||input.dataSource==='combined'||r.dataSource===input.dataSource)&&await scope(r))records.push(r);
  if(route==='production-list'){const out=[];for(const r of records){const s=await safe(r);if(input.hideReviewed&&s.review?.reviewedAt)continue;out.push(s);}return{entries:out.slice(0,500),truncated:out.length>500,user:u?publicUser(u):opSafe(o!),from,to};}
  check(u&&u.role!=='reviewer','Management dashboard access required.',403);
  const days=new Map<string,any>();for(const r of records.filter(r=>r.form==='arr')){const key=r.data.workDate;const d=days.get(key)||{date:key,reportedUnits:0,reportedCount:0,entries:0,dataSource:'interactive_demo'};d.reportedUnits+=r.data.units||0;if(typeof r.data.units==='number')d.reportedCount++;d.entries++;days.set(key,d);}
  const averages:Record<string,number|null>={};for(const k of scoreFields){const values=records.filter(r=>r.form==='arr'&&typeof r.data[k]==='number').map(r=>r.data[k]);averages[k]=values.length?Math.round(values.reduce((a,b)=>a+b,0)/values.length*10)/10:null;}
  // Current continuous shifts and authoritative demo FGI are distinct from legacy check-ins.
  // Deliberately return only aggregate operational facts, never recognition or audit payloads.
  check(input.teams===undefined||Array.isArray(input.teams)&&input.teams.every((t:any)=>typeof t==='string'),'Invalid crew filters.');
  const shiftMap=new Map<string,any>();
  if(formOK(u,'arr')&&input.dataSource!=='synthetic_seed')for(const r of await tx.list('production-shift')){
   if(r.workDate<from||r.workDate>to||input.teams?.length&&!input.teams.includes(r.team))continue;
   const d=shiftMap.get(r.workDate)||{date:r.workDate,shifts:0,statusCounts:{},productionMinutes:0,trainingMinutes:0,downtimeMinutes:0,openSegments:0,reportedMoves:0,reportedCount:0,unreportedCount:0,demo:true,operations:[]};
   d.shifts++;d.statusCounts[r.status]=(d.statusCounts[r.status]||0)+1;
   for(const segment of r.segments||[]){
    if(!segment.end){d.openSegments++;continue;}
    const gross=Math.max(0,(Date.parse(segment.end)-Date.parse(segment.start))/60000);if(!Number.isFinite(gross))continue;
    if(segment.kind==='training'){d.trainingMinutes+=gross;continue;}
    const downtime=Math.min(gross,Math.max(0,Number(segment.extras?.interruptionMinutes)||0)),minutes=gross-downtime;
    d.productionMinutes+=minutes;d.downtimeMinutes+=downtime;
    let operation=d.operations.find((op:any)=>op.operation===segment.stage&&op.product===segment.product);
    if(!operation){operation={operation:segment.stage,product:segment.product,productionMinutes:0,reportedMoves:0,reportedCount:0};d.operations.push(operation);}operation.productionMinutes+=minutes;
    if(typeof segment.reportedMoves==='number'&&Number.isFinite(segment.reportedMoves)){d.reportedMoves+=segment.reportedMoves;d.reportedCount++;operation.reportedMoves+=segment.reportedMoves;operation.reportedCount++;}else d.unreportedCount++;
   }
   shiftMap.set(r.workDate,d);
  }
  const shiftDays=[...shiftMap.values()].sort((a,b)=>a.date.localeCompare(b.date));
  const fgiDays=formOK(u,'arr')&&input.dataSource!=='synthetic_seed'?(await tx.list('production-fgi')).filter(r=>r.workDate>=from&&r.workDate<=to).sort((a,b)=>a.workDate.localeCompare(b.workDate)).map(r=>({date:r.workDate,total:r.total,rows:r.rows,revision:r.revision,provenance:r.provenance,demo:true,label:'Authoritative demo FGI'})):[];
  const synthetic=input.dataSource==='interactive_demo'||!formOK(u,'arr')||u.role!=='manager'&&permissions?.teams?.length&&!permissions.teams.includes('Team A')?[]:(await tx.list('production-total')).filter(d=>d.date>=from&&d.date<=to);return{shiftDays,fgiDays,demo:true,shiftProvenance:'Recorded operation moves may count the same physical unit at successive operations; they are not unique finished goods. Open intervals are not estimated.',days:[...days.values()].sort((a,b)=>a.date.localeCompare(b.date)),syntheticDays:synthetic.sort((a,b)=>a.date.localeCompare(b.date)),totals:{entries:records.length,reportedCount:[...days.values()].reduce((a,d)=>a+d.reportedCount,0),reportedUnits:[...days.values()].reduce((a,d)=>a+d.reportedUnits,0)},averages,sourceCounts:{interactive_demo:records.length,synthetic_seed:synthetic.length},provenance:'Operator-reported estimates; synthetic series is a separate fictional group total.'};
 }
 check(false,'Unknown production operation.',404);
}
function validRange(value:any,fallback:string){return validDate(value||fallback);}
