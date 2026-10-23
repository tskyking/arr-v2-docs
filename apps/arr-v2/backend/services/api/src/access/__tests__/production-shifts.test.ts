import {describe,it,expect,beforeEach,vi} from 'vitest';
import {settingsRoutes} from '../workspace/production-settings.js';
import {initialDefinition} from '../workspace/production-forms.js';
import {shiftRoutes,allocationSources,allocationSourcesForDates,shiftWorkDate} from '../workspace/production-shifts.js';
import type {WorkspaceTx} from '../workspace/store.js';
import type {User} from '../workspace/model.js';
// Clone-on-read models transaction isolation: rejected actions never mutate persisted state.
class MemoryTx { rows=new Map<string,any>();presenceCalls:any[]=[]; async get(k:string,id:string){return structuredClone(this.rows.get(k+':'+id));} async put(k:string,id:string,v:any){this.rows.set(k+':'+id,structuredClone(v));} async remove(k:string,id:string){this.rows.delete(k+':'+id);} async list(k:string){return [...this.rows].filter(([key])=>key.startsWith(k+':')).map(([,v])=>structuredClone(v));} async productionShiftPresence(from:string,to:string,teams:string[],hideClosed:boolean){this.presenceCalls.push({from,to,teams,hideClosed});return (await this.list('production-shift')).filter((r:any)=>r.workDate>=from&&r.workDate<=to&&(!teams.length||teams.includes(r.team))&&(!hideClosed||r.status!=='closed')).map((r:any)=>({id:r.id,revision:r.revision,operator:r.operator,username:r.username,workDate:r.workDate,shift:r.shift,team:r.team,status:r.status}));}}
const user=(id:string,role:string,forms=['arr'])=>({id,username:id,role,forms,active:true} as User);
const manager=user('manager','manager'),lead=user('lead','reviewer'),otherLead=user('other','reviewer'),owner=user('owner','owner'),admin=user('admin','admin');
const op={id:'person-1',username:'person-1'},other={id:'person-2',username:'person-2'};
const at=(h:number)=>`2026-10-01T${String(h).padStart(2,'0')}:00:00Z`;
const assigned={stage:'Cleaning / Decontamination',station:'W1',product:'Sleeves',productId:'sleeves'};
describe('continuous production shifts',()=>{
 let tx:MemoryTx;
 const call=(route:string,input:any={},u:User|undefined=undefined,o:any=op)=>shiftRoutes(tx as unknown as WorkspaceTx,u,o,route,input);
 const start=(extra:any={})=>call('production-shift-start',{workDate:'2026-10-01',shift:'day',team:'Team A',actualTime:at(8),assignment:assigned,...extra,data:{sopClarity:10,...extra.data}}).then(r=>r.shift);
 const action=async(r:any,a:string,extra:any={},u?:User,o:any=op)=>call('production-shift-action',{id:r.id,revision:r.revision,action:a,...(a==='end'?{confirmed:true}:{}),...extra},u,o);
 beforeEach(async()=>{tx=new MemoryTx();await tx.put('production-settings','main',{crewAssignments:{'person-1':{team:'Team A',leadId:'lead',managerId:'manager'}}});for(const u of [lead,otherLead])await tx.put('user',u.id,u);await tx.put('production-product','sleeves',{id:'sleeves',name:'Sleeves',active:true,aliases:[]});await tx.put('production-form','arr',{identity:'production-demo-arr',version:'0.1.0',definition:initialDefinition('arr')});});
 it('preserves and validates default shift through crew settings saves',async()=>{
  await tx.put('production-operator','person-1',{...op,active:true});
  const input={revision:1,settings:{teams:['Team A','Team C'],cutoffHour:3,crewAssignments:{'person-1':{team:'Team C',defaultShift:'swing'}}}};
  const result=await settingsRoutes(tx as any,owner,'production-settings-save',input);
  expect(result).toBeDefined();
  if(!result)throw new Error('Expected production-settings-save result.');
  expect(result.settings.crewAssignments['person-1'].defaultShift).toBe('swing');
  input.revision=result.settings.revision;input.settings.crewAssignments['person-1'].defaultShift='invalid';await expect(settingsRoutes(tx as any,owner,'production-settings-save',input)).rejects.toThrow('Day or Swing');
 });
 it('defaults new shifts from configured crew but preserves a chosen shift override',async()=>{
  await tx.put('production-settings','main',{crewAssignments:{'person-1':{team:'Team C',defaultShift:'swing'}}});
  let s=await start({shift:undefined});expect(s.team).toBe('Team C');expect(s.shift).toBe('swing');s=(await action(s,'end',{actualTime:at(9)})).shift;
  const next=await start({workDate:'2026-10-02',actualTime:'2026-10-02T08:00:00Z',shift:'day'});expect(next.shift).toBe('day');expect((await call('production-shift-detail',{id:s.id})).shift.shift).toBe('swing');
 });
 it.each(['associate','demo_preselected'])('accepts %s readiness without inventing an SOP score',async(source)=>{
  const s=await start({sopReady:true,sopReadySource:source,data:{sopClarity:undefined}});
  expect(s.segments[0]).toMatchObject({kind:'production',sopReadySource:source});expect(s.data.sopClarity).toBeUndefined();expect(s.history[0].after.segments[0].sopReadySource).toBe(source);
 });
 it('accepts help without a score and still blocks production until approval',async()=>{
  const s=await start({needsReadiness:true,sopReady:false,data:{sopClarity:undefined}});expect(s.segments[0].kind).toBe('training');expect(s.data.sopClarity).toBeUndefined();await expect(action(s,'begin-work',{actualTime:at(9)})).rejects.toThrow('confirmation');
 });
 it('rejects false or string readiness without a score',async()=>{
  for(const sopReady of [false,'true',null])await expect(start({sopReady,data:{sopClarity:undefined}})).rejects.toThrow('Select your SOP');expect(await tx.list('production-shift')).toHaveLength(0);
 });
 it('allows waiting to production with explicit readiness and no score',async()=>{
  let s=await start({waitingForAssignment:true,data:{sopClarity:undefined}});s=(await action(s,'changeover',{actualTime:at(9),assignment:assigned,sopReady:true,sopReadySource:'associate',data:{}})).shift;expect(s.segments[1]).toMatchObject({kind:'production',sopReadySource:'associate'});expect(s.data.sopClarity).toBeUndefined();
 });
 it('preserves optional feedback typed at changeover without requiring end-phase answers or clearing earlier notes',async()=>{
  let s=await start({data:{note:'Keep earlier note'}});
  s=(await action(s,'changeover',{actualTime:at(10),assignment:{...assigned,stage:'Packaging'},data:{quality:8,experience:7,workedWell:'Shared feedback'}})).shift;
  expect(s.data).toMatchObject({note:'Keep earlier note',quality:8,experience:7,workedWell:'Shared feedback'});
  await expect(action(s,'end',{actualTime:at(12),data:{quality:99}})).rejects.toThrow('Invalid');
  s=(await action(s,'end',{actualTime:at(12),data:{}})).shift;expect(s.data.note).toBe('Keep earlier note');expect(s.data.quality).toBe(8);
 });
 it('lets the associate save one final feedback update after ending without changing the submitted timeline',async()=>{
  let s=await start();await expect(action(s,'feedback',{data:{workedWell:'Too soon'}})).rejects.toThrow('End the shift');s=(await action(s,'end',{actualTime:at(12)})).shift;expect(s.canAddFeedback).toBe(true);expect((await call('production-shift-detail',{id:s.id},manager)).shift.canAddFeedback).toBe(false);const timeline=structuredClone(s.segments);
  await expect(action(s,'feedback',{data:{reportedMoves:999}})).rejects.toThrow('Only the displayed End-of-Day feedback fields');
  s=(await action(s,'feedback',{data:{workedWell:'Team solved a fixture issue',recognition:'Thanks for the careful handoff'}})).shift;
  expect(s.status).toBe('submitted');expect(s.canAddFeedback).toBe(false);expect(s.segments).toEqual(timeline);expect(s.data).toMatchObject({workedWell:'Team solved a fixture issue',recognition:'Thanks for the careful handoff'});expect(s.data.reportedMoves).toBeUndefined();expect(s.history.at(-1).action).toBe('feedback');
  await expect(action(s,'feedback',{data:{workedWell:'Second update'}})).rejects.toThrow('already been saved');
  await expect(action(s,'feedback',{data:{workedWell:'Unauthorized'}},undefined,other)).rejects.toThrow('unavailable');
 });
 it('preserves actual and recorded timestamps, exact form snapshot, and one shift per work date',async()=>{const s=await start();expect(s.createdAt).not.toBe(at(8));expect(s.segments[0].start).toBe('2026-10-01T08:00:00.000Z');await tx.put('production-form','arr',{version:'0.1.1'});expect((await call('production-shift-detail',{id:s.id})).shift.formSnapshot.definition.fields[0].key).toBe('workDate');await expect(start()).rejects.toThrow('already exists');await expect(start({workDate:'2026-10-02'})).rejects.toThrow('existing open');});
 it('atomically moves boundaries and rejects overlaps, gaps, stale revisions, negative counts',async()=>{let s=await start();s=(await action(s,'changeover',{actualTime:at(10),assignment:{...assigned,stage:'Packaging'},reportedMoves:0})).shift;expect(s.segments[0].end).toBe(s.segments[1].start);expect(s.segments[0].reportedMoves).toBe(0);const bad=structuredClone(s.segments);bad[1].start=at(9);await expect(action(s,'correct',{segments:bad,reason:'fix'})).rejects.toThrow('shared boundary');expect((await call('production-shift-detail',{id:s.id})).shift.revision).toBe(s.revision);const good=structuredClone(s.segments);good[0].end=at(9);good[1].start=at(9);const next=(await action(s,'correct',{segments:good,reason:'Actual changeover'})).shift;expect(next.history.at(-1).before.segments[0].end).not.toBe(next.segments[0].end);await expect(action(s,'end',{actualTime:at(11)})).rejects.toThrow('changed');await expect(action(next,'end',{actualTime:at(11),reportedMoves:-1})).rejects.toThrow('nonnegative');});
 it('returns a fast non-closed presence projection and ranked net product hours for the applied window',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-01T12:00:00Z'));
  try{
   const base=await start();
   const segments=Array.from({length:11},(_,i)=>({
    ...base.segments[0],id:`segment-${i+1}`,product:`Product ${i+1}`,
    start:`2026-10-01T${String(8+Math.floor(i/6)).padStart(2,'0')}:${String((i%6)*10).padStart(2,'0')}:00.000Z`,
    end:i===10?null:`2026-10-01T${String(8+Math.floor((i+1)/6)).padStart(2,'0')}:${String(((i+1)%6)*10).padStart(2,'0')}:00.000Z`,
    extras:i===10?{countType:'not_counted',unit:'units',interruptionMinutes:20}:{countType:'not_counted',unit:'units'},
   }));
   await tx.put('production-shift',base.id,{...base,segments});
   const rankingMinutes=[120,119,118,117,116,115,114,113,112,60.49,60.1],rankingProducts=['Top 1','Top 2','Top 3','Top 4','Top 5','Top 6','Top 7','Top 8','Top 9','Zulu','Alpha'];
   await tx.put('production-shift','ranking-shift',{...base,id:'ranking-shift',operator:'person-2',username:'person-2',status:'closed',segments:rankingMinutes.map((minutes,i)=>{const start=Date.parse('2026-10-01T08:00:00.000Z')+i*1000;return{...base.segments[0],id:`ranking-${i}`,product:rankingProducts[i],start:new Date(start).toISOString(),end:new Date(start+minutes*60000).toISOString(),extras:{countType:'not_counted',unit:'units'}};})});
   await tx.put('production-shift','closed-shift',{...base,id:'closed-shift',status:'closed',segments:[{...segments[0],id:'closed-segment'}]});
   const presence=await call('production-shift-presence',{from:'2026-10-01',to:'2026-10-01',hideClosed:true},manager);
   expect(tx.presenceCalls).toEqual([{from:'2026-10-01',to:'2026-10-01',teams:[],hideClosed:true}]);
   expect(presence.shifts).toEqual([{id:base.id,revision:base.revision,operator:'person-1',username:'person-1',workDate:'2026-10-01',shift:'day',team:'Team A',status:'in_progress'}]);
   expect(JSON.stringify(presence)).not.toContain('segments');expect(JSON.stringify(presence)).not.toContain('formSnapshot');
   const list=await call('production-shift-list',{from:'2026-10-01',to:'2026-10-01'},manager);
   expect(list.productHours['person-1'].items).toHaveLength(10);expect(list.productHours['person-1'].hasMore).toBe(true);
   expect(list.productHours['person-1'].items[0]).toEqual({product:'Product 11',minutes:120});
   expect(list.productHours['person-2'].items[9]).toEqual({product:'Zulu',minutes:60});expect(list.productHours['person-2'].hasMore).toBe(true);
   const associateList=await call('production-shift-list',{from:'2026-10-01',to:'2026-10-01'});
   expect(associateList.productHours).toBeUndefined();
  }finally{vi.useRealTimers();}
 });
 it('readiness is a narrow automatic exception; production blocked until associate then lead confirms',async()=>{let s=await start({needsReadiness:true,data:{recognition:'Private appreciation'}});const list=await call('production-shift-list',{from:'2026-10-01',to:'2026-10-01'},lead);expect(list.shifts).toHaveLength(0);expect(list.readiness).toHaveLength(1);expect(JSON.stringify(list)).not.toContain('Private appreciation');await expect(call('production-shift-detail',{id:s.id},otherLead)).rejects.toThrow('unavailable');await expect(action(s,'begin-work',{actualTime:at(9)})).rejects.toThrow('confirmation');await expect(action(s,'changeover',{actualTime:at(9),assignment:assigned})).rejects.toThrow('readiness');await expect(action(s,'readiness-confirm',{},lead)).rejects.toThrow('Associate');s=(await action(s,'readiness-ready')).shift;const confirmed=await action(s,'readiness-confirm',{},lead);expect(confirmed.shift).toBeUndefined();s=(await call('production-shift-detail',{id:s.id})).shift;s=(await action(s,'begin-work',{actualTime:at(9)})).shift;s=(await action(s,'end',{actualTime:at(12),reportedMoves:100})).shift;const sources=await allocationSources(tx as any,'2026-10-01','sleeves','Cleaning / Decontamination');expect(sources).toHaveLength(1);expect(sources[0].minutes).toBe(180);expect(s.segments[0].kind).toBe('training');});
 it('shared correction defaults on, revocable, read-only share cannot mutate; recognition filtered from audit',async()=>{let s=await start({data:{recognition:'Keep private',recognitionPeople:['person-2']}});await expect(call('production-shift-detail',{id:s.id},lead)).rejects.toThrow();s=(await action(s,'share',{leadId:'lead'},manager)).shift;const view=(await call('production-shift-detail',{id:s.id},lead)).shift;expect(view.canCorrect).toBe(true);expect(JSON.stringify(view)).not.toContain('Keep private');await expect(action(s,'end',{actualTime:at(12)},lead)).rejects.toThrow('reason');s=(await action(s,'share',{leadId:'lead',allowCorrections:false},manager)).shift;await expect(action(s,'end',{actualTime:at(12),reason:'Absent'},lead)).rejects.toThrow('permission');s=(await action(s,'retract',{leadId:'lead'},manager)).shift;await expect(call('production-shift-detail',{id:s.id},lead)).rejects.toThrow();});
 it('Owner visibility alone is not operational; manager can cross crew; completed shift requires reopen',async()=>{let s=await start();expect((await call('production-shift-detail',{id:s.id},owner)).shift.canManage).toBe(false);await expect(action(s,'end',{actualTime:at(12),reason:'Assist'},owner)).rejects.toThrow('permission');await expect(action(s,'end',{actualTime:at(12),reason:'Assist'},admin)).rejects.toThrow('permission');await expect(action(s,'close',{},manager)).rejects.toThrow('complete');await tx.put('production-permission','owner',{operationalManager:true});s=(await action(s,'end',{actualTime:at(12),reason:'On behalf'},owner)).shift;s=(await action(s,'close',{},manager)).shift;await expect(action(s,'correct',{segments:s.segments,reason:'Fix'},manager)).rejects.toThrow('Reopen');s=(await action(s,'reopen',{reason:'Check times'},manager)).shift;expect(s.status).toBe('needs_attention');expect(s.history.at(-1).role).toBe('manager');await expect(call('production-shift-detail',{id:s.id},undefined,other)).rejects.toThrow();});
 it('bulk close validates the entire selection before writing any shifts',async()=>{let s=await start();s=(await action(s,'end',{actualTime:at(12)})).shift;await expect(call('production-shift-close-many',{shifts:[{id:s.id,revision:s.revision},{id:'missing',revision:1}]},manager)).rejects.toThrow('changed');expect((await call('production-shift-detail',{id:s.id})).shift.status).toBe('submitted');const result=await call('production-shift-close-many',{shifts:[{id:s.id,revision:s.revision}]},manager);expect(result.shifts[0].status).toBe('closed');});
 it('ending during preparation does not leave a false readiness waiting queue',async()=>{let s=await start({needsReadiness:true});s=(await action(s,'end',{actualTime:at(9)})).shift;expect(s.readiness.status).toBe('cancelled');expect((await call('production-shift-list',{from:'2026-10-01',to:'2026-10-01'},lead)).readiness).toHaveLength(0);expect(await allocationSources(tx as any,'2026-10-01','Sleeves','Cleaning / Decontamination')).toEqual([]);});
 it('reopened submitted shifts can be corrected and resubmitted without inventing another open segment',async()=>{let s=await start();s=(await action(s,'end',{actualTime:at(12)})).shift;s=(await action(s,'reopen',{reason:'Actual end was earlier'},manager)).shift;const segments=structuredClone(s.segments);segments[0].end=at(11);s=(await action(s,'correct',{segments,reason:'Corrected against operator report'},manager)).shift;s=(await action(s,'submit',{},manager)).shift;expect(s.status).toBe('submitted');expect(s.segments).toHaveLength(1);expect((await allocationSources(tx as any,'2026-10-01','Sleeves','Cleaning / Decontamination'))[0].minutes).toBe(180);});
 it('uses pinned required questions when the live form changes and audits answer corrections',async()=>{const definition=initialDefinition('arr');definition.fields.push({key:'wrapup',label:'Wrap up',type:'text',phase:'eod',required:true,active:true,page:1,options:[]});await tx.put('production-form','arr',{version:'0.1.0',definition});let s=await start();await tx.put('production-form','arr',{version:'0.1.1',definition:initialDefinition('arr')});await expect(action(s,'end',{actualTime:at(12)})).rejects.toThrow('Wrap up');s=(await action(s,'end',{actualTime:at(12),data:{wrapup:'Complete'}})).shift;s=(await action(s,'reopen',{reason:'Edit text'},manager)).shift;s=(await action(s,'correct',{segments:s.segments,data:{wrapup:'Corrected'},reason:'Clarification'},manager)).shift;expect(s.history.at(-1).before.data.wrapup).toBe('Complete');expect(s.history.at(-1).after.data.wrapup).toBe('Corrected');});
 it('unmatched products are not trusted as caller-supplied catalog ids; later alias mapping is reflected in allocation sources',async()=>{let s=await start({assignment:{...assigned,product:'Sleevs',productId:'malicious-existing-id'}});expect(s.segments[0].productId).not.toBe('malicious-existing-id');s=(await action(s,'end',{actualTime:at(9)})).shift;await tx.put('production-product','sleeves',{id:'sleeves',name:'Sleeves',active:true,aliases:['Sleevs']});expect((await allocationSources(tx as any,'2026-10-01','Sleeves','Cleaning / Decontamination'))[0].minutes).toBe(60);});

 it('hides restricted recognition changes and unpublished form drafts from shared leads and ungranted Admins',async()=>{const form=await tx.get('production-form','arr');form.draft={definition:{secret:'Unpublished sensitive draft'}};form.versions=[{notes:'Old internal wording'}];await tx.put('production-form','arr',form);let s=await start({data:{recognition:'Initial private'}});expect(JSON.stringify(s.formSnapshot)).not.toContain('Unpublished');s=(await action(s,'share',{leadId:'lead'},manager)).shift;s=(await action(s,'correct',{segments:s.segments,data:{recognition:'Private changed'},reason:'Private changed'},manager)).shift;for(const u of [lead,admin]){const result=await call('production-shift-detail',{id:s.id},u);expect(JSON.stringify(result)).not.toContain('Initial private');expect(JSON.stringify(result)).not.toContain('Private changed');expect(JSON.stringify(result)).not.toContain('Unpublished');}expect(JSON.stringify((await call('production-shift-detail',{id:s.id},owner)))).toContain('Private changed');});
 it('edits Gate Passes and Gate Holds for one production segment without changing its timeline',async()=>{
  let s=await start();
  s=(await action(s,'changeover',{actualTime:at(10),assignment:{...assigned,stage:'Packaging'},reportedMoves:4,extras:{rejected:1}})).shift;
  const first=s.segments[0],second=structuredClone(s.segments[1]);
  s=(await action(s,'segment-counts',{segmentId:first.id,gatePasses:12,gateHolds:3})).shift;
  expect(s.segments[0]).toMatchObject({id:first.id,start:first.start,end:first.end,reportedMoves:12,extras:{rejected:3}});
  expect(s.segments[1]).toEqual(second);
  s=(await action(s,'segment-counts',{segmentId:first.id,gatePasses:'',gateHolds:''})).shift;
  expect(s.segments[0].reportedMoves).toBeNull();expect(s.segments[0].extras.rejected).toBeUndefined();
  await expect(action(s,'segment-counts',{segmentId:first.id,gatePasses:-1,gateHolds:0})).rejects.toThrow('Gate Passes');
 });
 it('records optional segment counts and downtime without treating missing as zero or double subtracting training',async()=>{let s=await start({needsReadiness:true});s=(await action(s,'readiness-ready')).shift;await action(s,'readiness-confirm',{},lead);s=(await call('production-shift-detail',{id:s.id})).shift;s=(await action(s,'begin-work',{actualTime:at(9)})).shift;s=(await action(s,'end',{actualTime:at(12),reportedMoves:0,extras:{countType:'exact',rejected:2,rework:3,lot:'Fictional lot',exception:'Short stoppage',interruptionMinutes:30}})).shift;const rows=await allocationSources(tx as any,'2026-10-01','Sleeves','Cleaning / Decontamination');expect(rows).toHaveLength(1);expect(rows[0]).toMatchObject({grossMinutes:180,downtimeMinutes:30,minutes:150,reportedMoves:0});expect(s.segments[1].extras.lot).toBe('Fictional lot');});
 it('validates future dates, explicit SOP choice, and workdate corrections; reopened associates can correct their own shift',async()=>{await expect(start({workDate:'2099-01-01'})).rejects.toThrow('future');await expect(start({data:{sopClarity:undefined}})).rejects.toThrow('Select your SOP');let s=await start();s=(await action(s,'end',{actualTime:at(12)})).shift;await expect(action(s,'correct',{segments:s.segments,reason:'Not reopened'})).rejects.toThrow('permission');s=(await action(s,'reopen',{reason:'Please fix'},manager)).shift;expect((await call('production-shift-detail',{id:s.id})).shift.canCorrect).toBe(true);s=(await action(s,'correct',{segments:s.segments,workDate:'2026-09-30',reason:'Wrong date'})).shift;expect(s.workDate).toBe('2026-09-30');s=(await action(s,'submit')).shift;expect(s.status).toBe('submitted');});

 it('keeps original workdate across midnight and defaults before the configured Pacific cutoff',async()=>{expect(shiftWorkDate('2026-10-02T07:30:00Z',3)).toBe('2026-10-01');expect(shiftWorkDate('2026-10-02T10:00:00Z',3)).toBe('2026-10-02');expect(shiftWorkDate('2026-10-02T10:00:00Z',4)).toBe('2026-10-01');let s=await start({workDate:undefined,shift:'swing',actualTime:'2026-10-02T07:30:00Z'});expect(s.workDate).toBe('2026-10-01');s=(await action(s,'end',{actualTime:'2026-10-02T09:00:00Z'})).shift;expect(s.workDate).toBe('2026-10-01');expect((await allocationSources(tx as any,s.workDate,'Sleeves','Cleaning / Decontamination'))[0].minutes).toBe(90);});
 it('requires explicit end confirmation and rejects interruption longer than elapsed production',async()=>{let s=await start();await expect(action(s,'end',{actualTime:at(9),confirmed:false})).rejects.toThrow('confirm End Shift');await expect(action(s,'end',{actualTime:at(9),extras:{interruptionMinutes:61}})).rejects.toThrow('exceed');expect((await call('production-shift-detail',{id:s.id})).shift.segments[0].end).toBeNull();s=(await action(s,'end',{actualTime:at(9),extras:{interruptionMinutes:60}})).shift;expect((await allocationSources(tx as any,s.workDate,'Sleeves','Cleaning / Decontamination'))[0].minutes).toBe(0);});
 it('cannot convert pending SOP training to production through a correction payload or forged false flag',async()=>{let s=await start({needsReadiness:true});const changed=structuredClone(s.segments);changed[0].kind='production';s=(await action(s,'correct',{segments:changed,needsReadiness:false,reason:'Attempted kind edit'})).shift;expect(s.segments[0].kind).toBe('training');await expect(action(s,'changeover',{actualTime:at(9),assignment:assigned,needsReadiness:false})).rejects.toThrow('readiness');await expect(action(s,'begin-work',{actualTime:at(9),needsReadiness:false})).rejects.toThrow('confirmation');});

 it('rejects impossible actual dates and beyond-tolerance future clock edits',async()=>{await expect(start({actualTime:'2026-02-30T08:00:00Z'})).rejects.toThrow('valid work date');await expect(start({actualTime:new Date(Date.now()+600000).toISOString()})).rejects.toThrow('future');});
 it('preserves not-counted versus an explicit zero and rejects contradictory count descriptors',async()=>{let s=await start();await expect(action(s,'end',{actualTime:at(9),reportedMoves:0,extras:{countType:'not_counted'}})).rejects.toThrow('Leave moves blank');await expect(action(s,'end',{actualTime:at(9),extras:{countType:'exact'}})).rejects.toThrow('Enter moves');s=(await action(s,'changeover',{actualTime:at(9),assignment:assigned,extras:{countType:'not_counted'}})).shift;s=(await action(s,'end',{actualTime:at(10),reportedMoves:0,extras:{countType:'exact'}})).shift;const rows=await allocationSources(tx as any,s.workDate,'Sleeves','Cleaning / Decontamination');expect(rows.map(r=>r.reportedMoves)).toEqual([null,0]);});

 it('collects completed production across an inclusive source window while preserving blank versus zero Gate Passes',async()=>{
  let first=await start();first=(await action(first,'end',{actualTime:at(9),reportedMoves:undefined,extras:{countType:'not_counted'}})).shift;
  let second=await start({workDate:'2026-10-02',actualTime:'2026-10-02T08:00:00Z'});second=(await action(second,'end',{actualTime:'2026-10-02T09:00:00Z',reportedMoves:0,extras:{countType:'exact'}})).shift;
  await tx.put('production-shift','open-outside',{...second,id:'open-outside',workDate:'2026-10-03',segments:[{...second.segments[0],id:'open',end:null,reportedMoves:99}]});
  const rows=await allocationSourcesForDates(tx as any,'2026-10-01','2026-10-02','Sleeves','Cleaning / Decontamination');
  expect(rows.map(r=>[r.sourceDate,r.reportedMoves,r.minutes])).toEqual([['2026-10-01',null,60],['2026-10-02',0,60]]);
 });

 it('validates corrections against historical questions across phases and permits clearing optional answers',async()=>{let s=await start({data:{mood:7,note:'Temporary note'}});s=(await action(s,'correct',{segments:s.segments,data:{mood:8,note:''},reason:'Correct initial response'})).shift;expect(s.data.mood).toBe(8);expect(s.data.note).toBeUndefined();await expect(action(s,'correct',{segments:s.segments,data:{mood:99},reason:'Invalid scale'})).rejects.toThrow('Invalid');s=(await action(s,'share',{leadId:'lead'},manager)).shift;await expect(action(s,'correct',{segments:s.segments,data:{recognition:'Injected'},reason:'Try'},lead)).rejects.toThrow('restricted');});

 it('accepts the full long-catalog product name without truncation or trusting an arbitrary id',async()=>{const name='Fictional specialized device model '.repeat(14);await tx.put('production-product','long-candidate',{id:'long-candidate',name,active:true,aliases:[]});const s=await start({assignment:{...assigned,product:name}});expect(s.segments[0].product).toBe(name);expect(s.segments[0].originalProduct).toBe(name.trim());expect(s.segments[0].productId).toBe('long-candidate');});

 it('preserves UI interruptionMinutes and enforces configured crews rather than arbitrary request values',async()=>{await tx.put('production-settings','main',{teams:['Configured Crew'],crewAssignments:{}});await expect(start({team:'Invented Crew'})).rejects.toThrow('configured crew');let s=await start({team:'Configured Crew'});s=(await action(s,'end',{actualTime:at(9),data:{interruptionMinutes:20}})).shift;expect(s.segments[0].extras.interruptionMinutes).toBe(20);expect((await allocationSources(tx as any,s.workDate,'Sleeves','Cleaning / Decontamination'))[0].minutes).toBe(40);});

 it('read/comment-only lead can add consultation notes but cannot change source answers or review unshared shifts',async()=>{let s=await start();await expect(action(s,'comment',{note:'Not shared'},lead)).rejects.toThrow('unavailable');s=(await action(s,'share',{leadId:'lead',allowCorrections:false},manager)).shift;const view=(await call('production-shift-detail',{id:s.id},lead)).shift;expect(view.canComment).toBe(true);expect(view.canCorrect).toBe(false);s=(await action(s,'comment',{note:'Internal consultation only'},lead)).shift;expect(s.status).toBe('in_progress');expect(s.data.note).toBeUndefined();expect(s.history.at(-1).reason).toBe('Internal consultation only');s=(await action(s,'reviewed',{},lead)).shift;expect(s.history.at(-1).action).toBe('reviewed');await expect(action(s,'comment',{note:'Owner without operational role'},owner)).rejects.toThrow('supervisor');});

 it('records repeated waiting periods without catalog entries, production minutes, or readiness queues',async()=>{
  let s=await start({waitingForAssignment:true,assignment:null,data:{sopClarity:undefined,note:'Await dispatch'}});
  expect(s.segments[0]).toMatchObject({kind:'waiting',product:'',stage:'Waiting for assignment',reportedMoves:null});expect(s.readiness).toBeNull();
  expect(await tx.list('production-unmatched')).toEqual([]);
  await expect(action(s,'changeover',{actualTime:at(9),assignment:assigned})).rejects.toThrow('SOP understanding');
  s=(await action(s,'changeover',{actualTime:at(9),assignment:assigned,data:{sopClarity:10}})).shift;
  s=(await action(s,'changeover',{actualTime:at(10),waitingForAssignment:true,reportedMoves:50})).shift;
  s=(await action(s,'changeover',{actualTime:at(11),assignment:assigned,needsReadiness:true})).shift;
  expect(s.segments.map((v:any)=>v.kind)).toEqual(['waiting','production','waiting','training']);
  s=(await action(s,'readiness-ready')).shift;await action(s,'readiness-confirm',{},lead);s=(await call('production-shift-detail',{id:s.id})).shift;
  s=(await action(s,'begin-work',{actualTime:at(12)})).shift;s=(await action(s,'end',{actualTime:at(13)})).shift;
  const rows=await allocationSources(tx as any,s.workDate,'Sleeves','Cleaning / Decontamination');expect(rows.map(v=>v.minutes)).toEqual([60,60]);expect(rows[0].reportedMoves).toBe(50);expect(s.data.note).toBe('Await dispatch');
  const correction=structuredClone(s.segments);correction[0].kind='production';correction[0].product='Sleeves';
  s=(await action(s,'reopen',{reason:'Review'},manager)).shift;s=(await action(s,'correct',{segments:correction,reason:'Preserve waiting kind'},manager)).shift;expect(s.segments[0].kind).toBe('waiting');expect(s.segments[0].product).toBe('');
 });
 it('can end while still waiting and abandon preparation for waiting without granting production readiness',async()=>{
  let s=await start({needsReadiness:true});s=(await action(s,'changeover',{actualTime:at(9),waitingForAssignment:true,needsReadiness:true})).shift;expect(s.readiness).toBeNull();
  s=(await action(s,'end',{actualTime:at(10),reportedMoves:999,extras:{rejected:99},data:{recognition:'End reflection'}})).shift;
  expect(s.status).toBe('submitted');expect(s.segments[1].reportedMoves).toBeNull();expect(s.segments[1].extras).toBeUndefined();expect(s.data.recognition).toBe('End reflection');expect(await allocationSources(tx as any,s.workDate,'Sleeves','Cleaning / Decontamination')).toEqual([]);
  expect((await call('production-shift-list',{from:s.workDate,to:s.workDate},lead)).readiness).toEqual([]);
 });
 it('previews, locks, and confirms a 15-minute manager quick start while preserving final segment kind',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-02T18:00:00Z'));
  try{
   await tx.put('production-settings','main',{teams:['Team A'],crewAssignments:{'person-1':{team:'Team A',defaultShift:'day'},'person-2':{team:'Team A',defaultShift:'day'},'person-3':{team:'Team A',defaultShift:'day'}}});
   for(const operator of ['person-1','person-2','person-3'])await tx.put('production-operator',operator,{id:operator,username:operator,active:true});
   const form=await tx.get('production-form','arr');
   const source=(operator:string,kind:'production'|'waiting'|'training',stage:string,product:string)=>({id:`source-${operator}`,operator,username:operator,workDate:'2026-10-01',shift:'day',team:'Team A',status:'closed',revision:2,segments:[{id:`segment-${operator}`,kind,start:'2026-10-01T12:00:00.000Z',end:'2026-10-01T20:00:00.000Z',stage,station:kind==='production'?'Station 1':'',product,productId:kind==='production'?'sleeves':undefined,reportedMoves:null}],data:{},formSnapshot:form,createdAt:'2026-10-01T12:00:00.000Z',updatedAt:'2026-10-01T20:00:00.000Z',shares:{},readiness:null,history:[]});
   await tx.put('production-shift','source-person-1',source('person-1','production','Cleaning / Decontamination','Sleeves'));
   await tx.put('production-shift','source-person-2',source('person-2','waiting','Waiting for assignment',''));
   await tx.put('production-shift','source-person-3',source('person-3','training','Packaging','Sleeves'));
   const status=await call('production-shift-quick-status',{workDate:'2026-10-02'},manager);
   expect(status.day).toMatchObject({eligible:3,enabled:true});expect(status.swing.enabled).toBe(false);
   const preview=await call('production-shift-quick-preview',{workDate:'2026-10-02',shift:'day'},manager);
   expect(preview.expiresAt).toBe('2026-10-02T18:15:00.000Z');expect(preview.starts.map((v:any)=>[v.username,v.kind,v.stage,v.product])).toEqual([['person-1','production','Cleaning / Decontamination','Sleeves'],['person-2','waiting','Waiting for assignment',''],['person-3','training','Packaging','Sleeves']]);
   await expect(call('production-shift-start',{workDate:'2026-10-02',shift:'day',actualTime:'2026-10-02T18:00:00Z',waitingForAssignment:true,data:{}},undefined,op)).rejects.toThrow('Manager is preparing');
   const result=await call('production-shift-quick-confirm',{token:preview.token},manager);
   expect(result.created).toHaveLength(3);expect(result.created.map((v:any)=>v.segments[0].kind)).toEqual(['production','waiting','training']);
   expect(result.created.every((v:any)=>v.segments[0].start==='2026-10-02T12:00:00.000Z')).toBe(true);
   expect(result.created[0].history[0].reason).toBe('Quick shift start for all Day at 5am by - manager');
   expect(await tx.get('production-shift-quick-lock','2026-10-02:day')).toBeUndefined();
  }finally{vi.useRealTimers();}
 });
 it('uses the exact Pacific 5am start across both DST transition dates',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-11-02T20:00:00Z'));
  try{
   const form=await tx.get('production-form','arr');
   for(const [operator,sourceDate] of [['person-4','2026-03-07'],['person-5','2026-10-31']]){await tx.put('production-operator',operator,{id:operator,username:operator,active:true});await tx.put('production-shift',`source-${operator}`,{id:`source-${operator}`,operator,username:operator,workDate:sourceDate,shift:'day',team:'Team A',status:'closed',revision:1,segments:[{id:`segment-${operator}`,kind:'production',start:`${sourceDate}T13:00:00.000Z`,end:`${sourceDate}T20:00:00.000Z`,stage:'Packaging',station:'P1',product:'Sleeves',productId:'sleeves',reportedMoves:null}],data:{},formSnapshot:form,createdAt:`${sourceDate}T13:00:00.000Z`,updatedAt:`${sourceDate}T20:00:00.000Z`,shares:{},readiness:null,history:[]});}
   const spring=await call('production-shift-quick-preview',{workDate:'2026-03-08',shift:'day'},manager),springResult=await call('production-shift-quick-confirm',{token:spring.token},manager);
   const fall=await call('production-shift-quick-preview',{workDate:'2026-11-01',shift:'day'},manager),fallResult=await call('production-shift-quick-confirm',{token:fall.token},manager);
   expect(springResult.created[0].segments[0].start).toBe('2026-03-08T12:00:00.000Z');expect(fallResult.created[0].segments[0].start).toBe('2026-11-01T13:00:00.000Z');
  }finally{vi.useRealTimers();}
 });
 it('rejects confirmation when a displayed source shift changes after preview',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-02T18:00:00Z'));
  try{
   await tx.put('production-operator','person-6',{id:'person-6',username:'person-6',active:true});const form=await tx.get('production-form','arr'),source:any={id:'source-person-6',operator:'person-6',username:'person-6',workDate:'2026-10-01',shift:'day',team:'Team A',status:'closed',revision:1,segments:[{id:'segment-person-6',kind:'production',start:'2026-10-01T12:00:00.000Z',end:'2026-10-01T20:00:00.000Z',stage:'Packaging',station:'P1',product:'Sleeves',productId:'sleeves',reportedMoves:null}],data:{},formSnapshot:form,createdAt:'2026-10-01T12:00:00.000Z',updatedAt:'2026-10-01T20:00:00.000Z',shares:{},readiness:null,history:[]};await tx.put('production-shift',source.id,source);
   const preview=await call('production-shift-quick-preview',{workDate:'2026-10-02',shift:'day'},manager);source.revision=2;source.segments[0].stage='Cleaning / Decontamination';await tx.put('production-shift',source.id,source);
   await expect(call('production-shift-quick-confirm',{token:preview.token},manager)).rejects.toThrow('changed after the preview');expect((await tx.list('production-shift')).filter((v:any)=>v.workDate==='2026-10-02')).toEqual([]);
  }finally{vi.useRealTimers();}
 });
 it('limits quick starts to active person-1 through person-30 and rechecks activity at confirmation',async()=>{
  vi.useFakeTimers();vi.setSystemTime(new Date('2026-10-02T18:00:00Z'));
  try{
   const form=await tx.get('production-form','arr'),make=(operator:string)=>({id:`source-${operator}`,operator,username:operator,workDate:'2026-10-01',shift:'day',team:'Team A',status:'closed',revision:1,segments:[{id:`segment-${operator}`,kind:'production',start:'2026-10-01T12:00:00.000Z',end:'2026-10-01T20:00:00.000Z',stage:'Packaging',station:'P1',product:'Sleeves',productId:'sleeves',reportedMoves:null}],data:{},formSnapshot:form,createdAt:'2026-10-01T12:00:00.000Z',updatedAt:'2026-10-01T20:00:00.000Z',shares:{},readiness:null,history:[]});
   for(const operator of ['person-7','person-31']){await tx.put('production-operator',operator,{id:operator,username:operator,active:true});await tx.put('production-shift',`source-${operator}`,make(operator));}
   const status=await call('production-shift-quick-status',{workDate:'2026-10-02'},manager);expect(status.day.eligible).toBe(1);
   const preview=await call('production-shift-quick-preview',{workDate:'2026-10-02',shift:'day'},manager);expect(preview.starts.map((v:any)=>v.username)).toEqual(['person-7']);await tx.put('production-operator','person-7',{id:'person-7',username:'person-7',active:false});
   const result=await call('production-shift-quick-confirm',{token:preview.token},manager);expect(result.created).toEqual([]);expect(result.skipped).toEqual([{username:'person-7',reason:'The associate account is no longer active or eligible.'}]);
  }finally{vi.useRealTimers();}
 });

});
