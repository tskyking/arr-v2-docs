import {describe,it,expect} from 'vitest';
import {calculateAllocation,calculateOperationTargets,DEFAULT_ALLOCATION_PROFILE,distribute,fgiPreset,FGI_BASE,productionAllocations} from '../workspace/production-allocations.js';
import {productionConfig} from '../workspace/production-model.js';
const source=(operator:string,minutes:number,reportedMoves:number|null)=>({sourceId:operator,sourceRevision:1,operator,username:operator,minutes,reportedMoves});
describe('demo allocation arithmetic',()=>{
 it('keeps preset totals exact with repeatable rounding and varied proportions',()=>{for(const total of [1400,14000])for(let seed=1;seed<100;seed++){let n=seed;const rand=()=>((n=n*16807%2147483647)-1)/2147483646;const p=fgiPreset(total,rand);expect(p.rows.reduce((a,r)=>a+r.quantity,0)).toBe(total);expect(p.rows.every(r=>Number.isInteger(r.quantity)&&r.quantity>=0)).toBe(true);}});
 it('uses the observation-weighted product mix for 300- and 30-associate demo days',()=>{const full=[['Disposable pulse-ox sensors',3220],['Manifolds',2520],['Compression sleeves',2380],['Air-transfer products',1820],['ECG leads/patient cables',980],['Tourniquet cuffs',840],['Arthroscopic shaver blades',465],['Bits/burs/blades',423],['Laryngoscope blades',296],['Trocars/cannulas',275],['Harmonic scalpels/shears',190],['LigaSure/vessel sealers',169],['Ablation devices',127],['Suture passers/retrievers',127],['Reusable pulse-ox sensors',84],['EP devices/diagnostic catheters',63],['Shaver handpieces/accessories',21]];expect(FGI_BASE).toEqual(full);expect(fgiPreset(14000,()=>.5).rows.map(r=>[r.family,r.quantity])).toEqual(full);expect(fgiPreset(1400,()=>.5).rows.map(r=>[r.family,r.quantity])).toEqual([['Disposable pulse-ox sensors',322],['Manifolds',252],['Compression sleeves',238],['Air-transfer products',182],['ECG leads/patient cables',98],['Tourniquet cuffs',84],['Arthroscopic shaver blades',47],['Bits/burs/blades',42],['Laryngoscope blades',30],['Trocars/cannulas',27],['Harmonic scalpels/shears',19],['LigaSure/vessel sealers',17],['Ablation devices',13],['Suture passers/retrievers',13],['Reusable pulse-ox sensors',8],['EP devices/diagnostic catheters',6],['Shaver handpieces/accessories',2]]);});
 it('allocates only supplied production minutes, not equal headcount',()=>{const result=calculateAllocation(1500,[source('a',240,null),source('b',240,null),source('c',240,null),source('d',180,null)],'time');expect(result.rows.map(r=>r.allocated)).toEqual([400,400,400,300]);});
 it('preserves 400 reported beside time estimate 250; comparison honors 400',()=>{const rows=[source('a',60,400),source('b',60,null),source('c',60,null),source('d',60,null)];expect(calculateAllocation(1000,rows,'time').rows.map(r=>r.allocated)).toEqual([250,250,250,250]);expect(calculateAllocation(1000,rows,'reported-first').rows.map(r=>r.allocated)).toEqual([400,200,200,200]);const fixed=calculateAllocation(1000,rows,'adjusted',{a:300});expect(fixed.rows.map(r=>r.allocated)).toEqual([300,234,233,233]);expect(fixed.rows[0].reportedMoves).toBe(400);});
 it('retains missing vs zero and never silently normalizes excessive reports',()=>{const result=calculateAllocation(100,[source('a',60,400),source('b',60,0),source('c',60,null)],'reported-first');expect(result.canSave).toBe(false);expect(result.rows.map(r=>r.reportedMoves)).toEqual([400,0,null]);expect(result.rows.every(r=>r.allocated===null)).toBe(true);expect(calculateAllocation(100,[source('a',60,400)],'time').canSave).toBe(true);});
 it('refuses unassigned remainder without eligible minutes',()=>{expect(calculateAllocation(100,[source('a',60,80)],'reported-first').canSave).toBe(false);expect(calculateAllocation(100,[],'time').canSave).toBe(false);expect(()=>distribute(100,[0,0])).toThrow();});
 it('rejects negative, unknown-associate, and noninteger fixed values',()=>{for(const fixed of [{a:-1},{a:.5},{b:3}] as Record<string,number>[])expect(()=>calculateAllocation(10,[source('a',60,null)],'adjusted',fixed)).toThrow();});
 it('compounds integer-safe operation targets backward from FGI using the approved process order',()=>{
  expect(DEFAULT_ALLOCATION_PROFILE.map(v=>[v.operation,v.lagDays,v.localScrapRateBps])).toEqual([
   ['Receiving and Sorting',5,2000],['Cleaning / Decontamination',4,500],['Inspection',3,400],['Functional Testing',2,300],['Repair / Reassembly',2,300],['Final Quality Review',1,200],['Packaging',0,0],
  ]);
  expect(calculateOperationTargets(100,DEFAULT_ALLOCATION_PROFILE).map(v=>v.target)).toEqual([154,123,116,111,107,103,100]);
 });
 it('applies a nonzero final Packaging scrap rate before compounding upstream targets',()=>{
  const profile=DEFAULT_ALLOCATION_PROFILE.map(v=>({...v}));profile.at(-1)!.localScrapRateBps=1000;
  const targets=calculateOperationTargets(100,profile);
  expect(targets.at(-1)!.target).toBe(112);
  expect(targets.at(-2)!.target).toBe(115);
 });
});
class Tx {docs=new Map<string,any>();async get(kind:string,key:string){return structuredClone(this.docs.get(kind+':'+key));}async put(kind:string,key:string,value:any){this.docs.set(kind+':'+key,structuredClone(value));}async list(kind:string){return [...this.docs].filter(([k])=>k.startsWith(kind+':')).map(([,v])=>structuredClone(v));}}
const manager:any={id:'mgr',username:'mgr',role:'manager',active:true,forms:['arr']};
describe('FGI storage and permissions',()=>{
 it('requires operational Manager role for Owner mutations',async()=>{const tx:any=new Tx(),owner={...manager,id:'owner',role:'owner'};await expect(productionAllocations(tx,owner,'production-fgi-presets',{total:1400})).rejects.toThrow();await tx.put('production-permission','owner',{operationalManager:true});expect((await productionAllocations(tx,owner,'production-fgi-presets',{total:1400})).total).toBe(1400);});
 it('retains revisions, audit, and demo provenance without accepting stale writes',async()=>{const tx:any=new Tx();const input={workDate:'2026-10-04',revision:0,rows:[{family:'Compression sleeves',quantity:10}],provenance:'simulated_preset'};await productionAllocations(tx,manager,'production-fgi-save',input);await expect(productionAllocations(tx,manager,'production-fgi-save',input)).rejects.toThrow();const {fgi}=await productionAllocations(tx,manager,'production-fgi-save',{...input,revision:1,provenance:'manual_demo',rows:[{family:'Compression sleeves',quantity:12}]});expect(fgi.revision).toBe(2);expect(fgi.history[0].total).toBe(10);expect(fgi.provenance).toBe('simulated_preset');expect((await tx.list('production-event')).length).toBe(2);});
 it('disallows lead/admin/associate mutations and unknown routes are ignored',async()=>{const tx:any=new Tx();for(const role of ['reviewer','admin'])await expect(productionAllocations(tx,{...manager,role} as any,'production-fgi-save',{})).rejects.toThrow();await expect(productionAllocations(tx,undefined,'production-fgi-list',{})).rejects.toThrow();expect(await productionAllocations(tx,manager,'production-anything',{})).toBeUndefined();});
 it('stores a reusable versioned product hourly-rate profile with a 4.667 midpoint default',async()=>{
  const tx:any=new Tx();
  expect(await productionAllocations(tx,manager,'production-fgi-rate-profile-get',{})).toEqual({profile:{revision:0,defaultUnitsPerHour:4.667,rates:[]},demo:true});
  const first=await productionAllocations(tx,manager,'production-fgi-rate-profile-save',{revision:0,rates:[{family:'Compression sleeves',unitsPerHour:12.5},{family:'EP devices/diagnostic catheters',unitsPerHour:1.25}]});
  expect(first.profile).toMatchObject({revision:1,defaultUnitsPerHour:4.667,rates:[{family:'Compression sleeves',unitsPerHour:12.5},{family:'EP devices/diagnostic catheters',unitsPerHour:1.25}],by:'mgr'});
  await expect(productionAllocations(tx,manager,'production-fgi-rate-profile-save',{revision:0,rates:[]})).rejects.toThrow('rate profile changed');
  const second=await productionAllocations(tx,manager,'production-fgi-rate-profile-save',{revision:1,rates:[{family:'Compression sleeves',unitsPerHour:15} ]});
  expect(second.profile).toMatchObject({revision:2,rates:[{family:'Compression sleeves',unitsPerHour:15}],history:[{revision:1,rates:[{family:'Compression sleeves',unitsPerHour:12.5},{family:'EP devices/diagnostic catheters',unitsPerHour:1.25}]}]});
  expect((await tx.list('production-event')).some((value:any)=>value.action==='FGI hourly rate profile saved'&&value.details.revision===2)).toBe(true);
  await expect(productionAllocations(tx,{...manager,role:'admin'},'production-fgi-rate-profile-save',{revision:2,rates:[]})).rejects.toThrow('Manager/Supervisor operational role');
 });
 it('combines a selected WIP window by operation with saved product lags and no associate rankings',async()=>{
  const tx:any=new Tx();await tx.put('production-allocation-run','saved-run',{family:'Laryngoscope blades',from:'2026-10-09',to:'2026-10-11',audit:{appliedProfile:DEFAULT_ALLOCATION_PROFILE.map(v=>v.operation==='Receiving and Sorting'?{...v,lagDays:9}:v)}});
  await tx.put('production-shift','shift-a',{id:'shift-a',revision:1,operator:'a',username:'a',workDate:'2026-10-09',segments:[{id:'receive',kind:'production',start:'2026-10-09T08:00:00Z',end:'2026-10-09T15:30:00Z',product:'Laryngoscope blades',stage:'Receiving and Sorting',reportedMoves:null,extras:{countType:'not_counted',unit:'units',interruptionMinutes:30}}]});
  await tx.put('production-shift','shift-b',{id:'shift-b',revision:1,operator:'b',username:'b',workDate:'2026-10-10',segments:[{id:'quality',kind:'production',start:'2026-10-10T15:00:00Z',end:'2026-10-10T18:03:00Z',product:'Laryngoscope blades',stage:'Final Quality Review',reportedMoves:80}]});
  await tx.put('production-shift','shift-c',{id:'shift-c',revision:1,operator:'c',username:'c',workDate:'2026-10-11',segments:[{id:'pack',kind:'production',start:'2026-10-11T20:00:00Z',end:'2026-10-11T22:01:00Z',product:'Laryngoscope blades',stage:'Packaging',reportedMoves:null},{id:'training',kind:'training',start:'2026-10-11T22:01:00Z',end:'2026-10-11T23:01:00Z',product:'Laryngoscope blades',stage:'Packaging',reportedMoves:999}]});
  await tx.put('production-shift','outside-window',{id:'outside-window',revision:1,operator:'d',username:'d',workDate:'2026-10-08',segments:[{id:'inspect',kind:'production',start:'2026-10-08T08:00:00Z',end:'2026-10-08T10:00:00Z',product:'Laryngoscope blades',stage:'Inspection',reportedMoves:30}]});
  await tx.put('production-shift','default-lag',{id:'default-lag',revision:1,operator:'e',username:'e',workDate:'2026-10-11',segments:[{id:'default-pack',kind:'production',start:'2026-10-11T08:00:00Z',end:'2026-10-11T09:00:00Z',product:'Surgical tubing',stage:'Packaging',reportedMoves:10},{id:'zero-net-inspection',kind:'production',start:'2026-10-11T09:00:00Z',end:'2026-10-11T10:00:00Z',product:'Surgical tubing',stage:'Inspection',reportedMoves:99,extras:{interruptionMinutes:60}}]});
  const out=await productionAllocations(tx,manager,'production-fgi-work-context',{workDate:'2026-10-11',family:'Laryngoscope blades',days:3});
  const fallback=await productionAllocations(tx,manager,'production-fgi-work-context',{workDate:'2026-10-11',family:'Surgical tubing',days:3});
  await expect(productionAllocations(tx,manager,'production-fgi-work-context',{workDate:'2026-10-11',family:'Laryngoscope blades',days:31})).rejects.toThrow('1 to 30');
  await expect(productionAllocations(tx,{...manager,role:'admin'},'production-fgi-work-context',{workDate:'2026-10-11',family:'Laryngoscope blades',days:3})).rejects.toThrow('Manager operational role');
  expect(out).toMatchObject({from:'2026-10-09',to:'2026-10-11',days:3,family:'Laryngoscope blades',totalMinutes:724,segmentCount:3,shiftCount:3});
  expect(out.operations.map((v:any)=>[v.operation,v.minutes,v.gatePasses,v.partialGatePasses,v.lagDays,v.lagSource])).toEqual([['Receiving and Sorting',420,null,true,9,'saved'],['Final Quality Review',183,80,false,1,'saved'],['Packaging',121,null,true,0,'saved']]);
  expect(fallback.operations.map((v:any)=>[v.operation,v.lagDays,v.lagSource])).toEqual([['Packaging',0,'default']]);
  expect(JSON.stringify(out)).not.toContain('username');expect(JSON.stringify(out)).not.toContain('operator');expect(JSON.stringify(out)).not.toContain('Inspection');
 });
 it('summarizes WIP availability and private Manager associate context in one request',async()=>{
  const tx:any=new Tx();await tx.put('production-operator','person-1',{id:'person-1',username:'person-1',active:true,profile:{firstName:'Amy',lastName:'Example'}});await tx.put('production-operator','person-3',{id:'person-3',username:'person-3',active:true,profile:{firstName:'Cal',lastName:'Example'}});await tx.put('production-product','data-product',{id:'data-product',name:'Data Product',aliases:['Data Alias']});await tx.put('production-shift','summary-shift',{id:'summary-shift',revision:1,operator:'person-1',username:'person-1',workDate:'2026-10-11',segments:[{id:'worked',kind:'production',start:'2026-10-11T08:00:00Z',end:'2026-10-11T09:00:00Z',product:'Data Alias',stage:'Packaging',extras:{interruptionMinutes:10}},{id:'zero-net',kind:'production',start:'2026-10-11T09:00:00Z',end:'2026-10-11T10:00:00Z',product:'Empty Product',stage:'Packaging',extras:{interruptionMinutes:60}},{id:'legacy-stage',kind:'production',start:'2026-10-11T10:00:00Z',end:'2026-10-11T10:30:00Z',product:'Empty Product',stage:'Legacy operation'},{id:'case-only',kind:'production',start:'2026-10-11T10:00:00Z',end:'2026-10-11T10:30:00Z',product:'case product',stage:'Packaging'},{id:'training',kind:'training',start:'2026-10-11T10:30:00Z',end:'2026-10-11T11:00:00Z',product:'Empty Product',stage:'Packaging'}]});await tx.put('production-shift','summary-second-associate',{id:'summary-second-associate',revision:1,operator:'person-3',username:'person-3',workDate:'2026-10-11',segments:[{id:'worked',kind:'production',start:'2026-10-11T12:00:00Z',end:'2026-10-11T12:20:00Z',product:'Data Product',stage:'Packaging'}]});
  await tx.put('production-product','complete-product',{id:'complete-product',name:'Complete Product',aliases:[]});await tx.put('production-shift','complete-shift',{id:'complete-shift',revision:1,operator:'person-2',username:'person-2',workDate:'2026-10-11',segments:productionConfig.stages.map((stage,index)=>({id:`complete-${index}`,kind:'production',start:`2026-10-11T${String(index+1).padStart(2,'0')}:00:00Z`,end:`2026-10-11T${String(index+2).padStart(2,'0')}:00:00Z`,product:'Complete Product',stage}))});await tx.put('production-shift','unknown-cross-product',{id:'unknown-cross-product',revision:1,operator:'person-2',username:'person-2',workDate:'2026-10-11',segments:[{id:'unknown-data',kind:'production',start:'2026-10-11T20:00:00Z',end:'2026-10-11T20:10:00Z',product:'Data Product',stage:'Packaging'}]});
  await tx.put('production-shift','prior-day-data',{id:'prior-day-data',revision:1,operator:'person-1',username:'person-1',workDate:'2026-10-10',segments:[{id:'prior-worked',kind:'production',start:'2026-10-10T08:00:00Z',end:'2026-10-10T09:00:00Z',product:'Data Product',stage:'Packaging'}]});
  const out=await productionAllocations(tx,manager,'production-fgi-work-context-summary',{workDate:'2026-10-11',days:3,families:['Data Product','Empty Product','Complete Product']});
  expect(out).toMatchObject({from:'2026-10-09',to:'2026-10-11',days:3,products:[{family:'Data Product',hasData:true,totalMinutes:140,selectedDateMinutes:80,allOperationsHaveData:false,missingOperations:productionConfig.stages.filter(stage=>stage!=='Packaging'),associateCount:3,associates:[{name:'Amy Example',minutes:110,operations:[{operation:'Packaging',minutes:110}]},{name:'Cal Example',minutes:20,operations:[{operation:'Packaging',minutes:20}]},{name:'Mfg. Associate 1 (profile unavailable)',minutes:10,operations:[{operation:'Packaging',minutes:10}]}]},{family:'Empty Product',hasData:false,totalMinutes:0,selectedDateMinutes:0,allOperationsHaveData:false,missingOperations:productionConfig.stages,associateCount:0,associates:[]},{family:'Complete Product',hasData:true,totalMinutes:420,selectedDateMinutes:420,allOperationsHaveData:true,missingOperations:[],associateCount:1,associates:[{name:'Mfg. Associate 1 (profile unavailable)',minutes:420,operations:productionConfig.stages.slice().reverse().map(operation=>({operation,minutes:60}))}]}]});expect(out.products.every((value:any)=>Object.keys(value).sort().join(',')==='allOperationsHaveData,associateCount,associates,family,hasData,missingOperations,selectedDateMinutes,totalMinutes')).toBe(true);expect(JSON.stringify(out)).not.toContain('"operator"');expect(JSON.stringify(out)).not.toContain('"username"');expect(JSON.stringify(out)).not.toContain('person-1');expect(JSON.stringify(out)).not.toContain('person-2');
  const many=await productionAllocations(tx,manager,'production-fgi-work-context-summary',{workDate:'2026-10-11',days:3,families:Array.from({length:101},(_,index)=>`Product ${index}`)});expect(many.products).toHaveLength(101);
  const caseSensitive=await productionAllocations(tx,manager,'production-fgi-work-context-summary',{workDate:'2026-10-11',days:3,families:['Case Product','case product']});expect(caseSensitive.products.map(({family,hasData,totalMinutes,selectedDateMinutes}:any)=>({family,hasData,totalMinutes,selectedDateMinutes}))).toEqual([{family:'Case Product',hasData:false,totalMinutes:0,selectedDateMinutes:0},{family:'case product',hasData:true,totalMinutes:30,selectedDateMinutes:30}]);
  await expect(productionAllocations(tx,{...manager,role:'admin'},'production-fgi-work-context-summary',{workDate:'2026-10-11',days:3,families:['Data Product']})).rejects.toThrow('Manager operational role');
 });
});
describe('allocation lifecycle and stale containment',()=>{
 async function setup(){
  const tx:any=new Tx();
  await tx.put('production-shift','shift-a',{id:'shift-a',revision:1,operator:'a',username:'a',workDate:'2026-10-04',segments:[{id:'training',kind:'training',start:'2026-10-04T07:00:00Z',end:'2026-10-04T08:00:00Z',product:'Compression sleeves',stage:'washing',reportedMoves:999},{id:'production',kind:'production',start:'2026-10-04T08:00:00Z',end:'2026-10-04T11:00:00Z',product:'Compression sleeves',stage:'washing',reportedMoves:400},{id:'open',kind:'production',start:'2026-10-04T11:00:00Z',end:null,product:'Compression sleeves',stage:'washing',reportedMoves:null}]});
  await tx.put('production-shift','shift-b',{id:'shift-b',revision:1,operator:'b',username:'b',workDate:'2026-10-04',segments:[{id:'production',kind:'production',start:'2026-10-04T07:00:00Z',end:'2026-10-04T11:00:00Z',product:'Compression sleeves',stage:'washing',reportedMoves:null}]});
  await productionAllocations(tx,manager,'production-fgi-save',{workDate:'2026-10-04',revision:0,rows:[{family:'Compression sleeves',quantity:700}],provenance:'manual_demo'});
  const input={workDate:'2026-10-04',family:'Compression sleeves',operation:'washing',method:'time'};
  const {preview}=await productionAllocations(tx,manager,'production-allocation-preview',input);
  const {allocation}=await productionAllocations(tx,manager,'production-allocation-save',{...input,fingerprint:preview.fingerprint,revision:0});
  return {tx,input,preview,allocation};
 }
 const range={from:'2026-10-04',to:'2026-10-04'};
 it('excludes training/open intervals; invalidates shift correction everywhere and requires explicit revised save',async()=>{
  const {tx,input,preview,allocation}=await setup();expect(preview.rows.map((r:any)=>r.minutes)).toEqual([180,240]);expect(preview.rows.map((r:any)=>r.allocated)).toEqual([300,400]);expect(allocation.stale).toBe(false);
  const shift=await tx.get('production-shift','shift-a');shift.segments[1].end='2026-10-04T10:00:00Z';shift.revision++;await tx.put('production-shift','shift-a',shift);
  const {allocations}=await productionAllocations(tx,manager,'production-allocation-list',range);expect(allocations[0].stale).toBe(true);expect(allocations[0].current).toBe(null);expect(allocations[0].preview.rows[0].allocated).toBe(300);
  const {csv}=await productionAllocations(tx,manager,'production-allocation-export',range);expect(csv).toContain('STALE HISTORICAL—NOT CURRENT');expect(csv).not.toContain('"300"');
  await expect(productionAllocations(tx,manager,'production-allocation-save',{...input,fingerprint:preview.fingerprint,revision:1})).rejects.toThrow('Source data changed');
  const refreshed=await productionAllocations(tx,manager,'production-allocation-preview',input);expect((await productionAllocations(tx,manager,'production-allocation-list',range)).allocations[0].stale).toBe(true);
  const saved=await productionAllocations(tx,manager,'production-allocation-save',{...input,fingerprint:refreshed.preview.fingerprint,revision:1});expect(saved.allocation.stale).toBe(false);expect(saved.allocation.revision).toBe(2);expect(saved.allocation.history[0].preview.fingerprint).toBe(preview.fingerprint);expect(saved.allocation.history[0].historical).toBe(true);
 });
 it('invalidates on FGI correction and product catalog remapping',async()=>{
  const {tx}=await setup();await productionAllocations(tx,manager,'production-fgi-save',{workDate:'2026-10-04',revision:1,rows:[{family:'Compression sleeves',quantity:701}],provenance:'manual_demo'});expect((await productionAllocations(tx,manager,'production-allocation-list',range)).allocations[0].current).toBe(null);
  const second=await setup();await second.tx.put('production-product','family-1',{id:'family-1',name:'Compression sleeves',revision:2,aliases:['sleeve'],active:true});expect((await productionAllocations(second.tx,manager,'production-allocation-list',range)).allocations[0].stale).toBe(false);const shift=await second.tx.get('production-shift','shift-a');await second.tx.put('production-shift','shift-c',{...shift,id:'shift-c',operator:'c',username:'c',segments:[{...shift.segments[1],product:'Sleeve typo'}]});expect((await productionAllocations(second.tx,manager,'production-allocation-list',range)).allocations[0].stale).toBe(false);await second.tx.put('production-product','family-1',{id:'family-1',name:'Compression sleeves',revision:3,aliases:['sleeve','Sleeve typo'],active:true});expect((await productionAllocations(second.tx,manager,'production-allocation-list',range)).allocations[0].stale).toBe(true);
 });
 it('review-only revisions, same-value FGI saves, and unrelated catalog edits do not invalidate',async()=>{
  const {tx}=await setup();const shift=await tx.get('production-shift','shift-a');shift.revision++;shift.status='closed';shift.history=[{action:'reviewed'}];await tx.put('production-shift','shift-a',shift);
  await productionAllocations(tx,manager,'production-fgi-save',{workDate:'2026-10-04',revision:1,rows:[{family:'Compression sleeves',quantity:700}],provenance:'manual_demo',context:'Context-only update'});
  await tx.put('production-product','unrelated',{id:'unrelated',name:'Unrelated demo product',revision:99,aliases:[],active:true});
  expect((await productionAllocations(tx,manager,'production-allocation-list',range)).allocations[0].stale).toBe(false);
  shift.segments[1].reportedMoves=401;shift.revision++;await tx.put('production-shift','shift-a',shift);expect((await productionAllocations(tx,manager,'production-allocation-list',range)).allocations[0].stale).toBe(true);
 });
 it('does not quietly carry forward prior manager fixed adjustments',async()=>{
  const {tx,input}=await setup();const adjusted={...input,method:'adjusted',adjustments:{a:500}};const {preview}=await productionAllocations(tx,manager,'production-allocation-preview',adjusted);await productionAllocations(tx,manager,'production-allocation-save',{...adjusted,fingerprint:preview.fingerprint,revision:1});
  const refreshed=await productionAllocations(tx,manager,'production-allocation-preview',{...input,method:undefined});expect(refreshed.preview.method).toBe('time');expect(refreshed.preview.adjustments).toEqual({});expect(refreshed.preview.rows[0].allocated).toBe(300);
 });
});

describe('lag-adjusted seven-day allocation runs',()=>{
 const range={from:'2026-10-01',to:'2026-10-07'};
 async function setupBoard(){
  const tx:any=new Tx();
  await tx.put('production-fgi','2026-10-01',{id:'2026-10-01',workDate:'2026-10-01',revision:2,provenance:'manual_demo',rows:[{family:'Sleeves',quantity:60},{family:'Sensors',quantity:40}]});
  await tx.put('production-fgi','2026-10-07',{id:'2026-10-07',workDate:'2026-10-07',revision:1,provenance:'manual_demo',rows:[{family:'Sleeves',quantity:40},{family:'Sensors',quantity:10}]});
  return tx;
 }
 async function addSources(tx:any){for(const [operator,minutes,reportedMoves] of [['a',60,null],['b',180,0]] as const)await tx.put('production-shift','shift-'+operator,{id:'shift-'+operator,revision:4,operator,username:operator,workDate:'2026-10-01',segments:productionConfigForTest().map((operation,i)=>({id:`${operator}-${i}`,kind:'production',start:`2026-10-01T0${i}:00:00Z`,end:new Date(Date.parse(`2026-10-01T0${i}:00:00Z`)+minutes*60000).toISOString(),product:'Sleeves',stage:operation,reportedMoves}))});}
 it('builds a manager-only board with a seven-day default while accepting another valid range',async()=>{
  const tx=await setupBoard();
  await tx.put('production-allocation-run','existing',{id:'existing',from:range.from,to:range.to,family:'Sensors',revision:3,operations:[{operation:'Packaging',target:50,allocations:[]}]});
  const board=await productionAllocations(tx,manager,'production-allocation-board',range);
  expect(board.products).toEqual([
   {family:'Sleeves',fgi:100,totalOperations:7,allocatedOperations:0,remainingOperations:7,currentRunRevision:0,stale:false},
   {family:'Sensors',fgi:50,totalOperations:7,allocatedOperations:1,remainingOperations:6,currentRunRevision:3,stale:true},
  ]);
  expect((await productionAllocations(tx,manager,'production-allocation-board',{from:'2026-10-01',to:'2026-10-06'})).products[0].fgi).toBe(60);
  await expect(productionAllocations(tx,manager,'production-allocation-board',{from:'2026-10-07',to:'2026-10-01'})).rejects.toThrow('date range');
  for(const role of ['admin','reviewer','associate'])await expect(productionAllocations(tx,{...manager,role} as any,'production-allocation-board',range)).rejects.toThrow();
 });
 it('expands in process order with lagged source windows, applied assumptions, prior exact-run allocations, and balanced proposals',async()=>{
  const tx=await setupBoard();
  await addSources(tx);
  await tx.put('production-allocation-run','prior',{id:'prior',from:range.from,to:range.to,family:'Sleeves',revision:2,operations:[{operation:'Packaging',target:100,allocations:[{operator:'a',username:'a',allocated:25},{operator:'b',username:'b',allocated:75}]}]});
  const result=await productionAllocations(tx,manager,'production-allocation-expand',{...range,family:'Sleeves',profileOverrides:{'Cleaning / Decontamination':{lagDays:6,localScrapRateBps:1000}}});
  expect(result.operations.map((v:any)=>v.operation)).toEqual(productionConfigForTest());
  expect(result.defaultProfile).toEqual(DEFAULT_ALLOCATION_PROFILE);expect(result.profileAssumption).toContain('demo');
  expect(result.appliedProfile[1]).toMatchObject({operation:'Cleaning / Decontamination',lagDays:6,localScrapRateBps:1000});
  expect(result.operations[1].sourceWindow).toEqual({from:'2026-09-25',to:'2026-10-01'});
  expect(result.operations[0].associates.map((v:any)=>[v.operator,v.minutes,v.hours,v.gatePasses,v.proposed])).toEqual([['a',60,1,null,41],['b',180,3,0,121]]);
  expect(result.operations.at(-1).priorAllocations.map((v:any)=>v.allocated)).toEqual([25,75]);expect(result.operations.at(-1).associates.map((v:any)=>v.priorAllocated)).toEqual([25,75]);
  for(const operation of result.operations)expect(operation.associates.reduce((n:number,v:any)=>n+v.proposed,0)).toBe(operation.target);
  expect(result.fingerprint).toMatch(/^[a-f0-9]{64}$/);expect(result.fgiRevisions).toEqual([{workDate:'2026-10-01',revision:2},{workDate:'2026-10-07',revision:1}]);
  const arrayOverride=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves',profileOverrides:[{operation:'Packaging',lagDays:1,localScrapRateBps:100}]});
  expect(arrayOverride.appliedProfile.at(-1)).toMatchObject({lagDays:1,localScrapRateBps:100});
 });
 it('returns a non-allocatable operation instead of throwing when all eligible minutes net to zero',async()=>{
  const tx=await setupBoard();
  await tx.put('production-shift','zero-minutes',{id:'zero-minutes',revision:1,operator:'a',username:'a',workDate:'2026-09-26',segments:[{id:'receiving',kind:'production',start:'2026-09-26T08:00:00Z',end:'2026-09-26T09:00:00Z',product:'Sleeves',stage:'Receiving and Sorting',reportedMoves:null,extras:{interruptionMinutes:60}}]});
  const result=await productionAllocations(tx,manager,'production-allocation-expand',{...range,family:'Sleeves'});
  expect(result.operations[0].canAllocate).toBe(false);
  expect(result.operations[0].associates).toEqual([]);
  await expect(productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Sleeves',revision:0,fingerprint:result.fingerprint,profileOverrides:result.appliedProfile,adjustmentReason:'Should not save without eligible time.',operations:result.operations.map((operation:any)=>({operation:operation.operation,target:operation.target,allocations:operation.associates.map((associate:any,index:number)=>({operator:associate.operator,allocated:index===0?operation.target:0}))}))})).rejects.toThrow('positive eligible production time');
 });
 it('excludes zero-net-minute associates when other associates have eligible time',async()=>{
  const tx=await setupBoard();await addSources(tx);const zero=await tx.get('production-shift','shift-a');zero.id='shift-c';zero.operator='c';zero.username='c';zero.segments=zero.segments.map((segment:any)=>({...segment,id:'c-'+segment.id,extras:{interruptionMinutes:60}}));await tx.put('production-shift','shift-c',zero);
  const preview=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves'});
  expect(preview.operations.every((operation:any)=>operation.associates.map((associate:any)=>associate.operator).join(',')==='a,b')).toBe(true);
  const operations=preview.operations.map((operation:any)=>({operation:operation.operation,target:operation.target,allocations:operation.associates.map((associate:any)=>({operator:associate.operator,allocated:associate.proposed}))}));
  operations[0].allocations.push({operator:'c',allocated:0});
  await expect(productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Sleeves',revision:0,fingerprint:preview.fingerprint,profileOverrides:preview.appliedProfile,adjustmentReason:'Zero-minute associate must remain ineligible.',operations})).rejects.toThrow('one final allocation');
 });
 it('rejects a zero-FGI run when no operation has positive eligible production time',async()=>{
  const tx=await setupBoard(),fgi=await tx.get('production-fgi','2026-10-01');fgi.rows.push({family:'Zero product',quantity:0});await tx.put('production-fgi','2026-10-01',fgi);
  const preview=await productionAllocations(tx,manager,'production-allocation-expand',{...range,family:'Zero product'});
  expect(preview.operations.every((operation:any)=>operation.canAllocate===false)).toBe(true);
  await expect(productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Zero product',revision:0,fingerprint:preview.fingerprint,profileOverrides:preview.appliedProfile,adjustmentReason:'No eligible production time.',operations:preview.operations.map((operation:any)=>({operation:operation.operation,target:operation.target,allocations:[]}))})).rejects.toThrow('positive eligible production time');
 });
 it('restores the saved lag and scrap profile when reopening without explicit overrides',async()=>{
  const tx=await setupBoard();await addSources(tx);
  const profileOverrides=DEFAULT_ALLOCATION_PROFILE.map(v=>({...v}));profileOverrides.at(-1)!.lagDays=1;profileOverrides.at(-1)!.localScrapRateBps=100;
  const preview=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves',profileOverrides});
  await productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Sleeves',revision:0,fingerprint:preview.fingerprint,profileOverrides,adjustmentReason:'Preserve custom assumptions.',operations:preview.operations.map((operation:any)=>({operation:operation.operation,target:operation.target,allocations:operation.associates.map((associate:any)=>({operator:associate.operator,allocated:associate.proposed}))}))});
  const reopened=await productionAllocations(tx,manager,'production-allocation-expand',{...range,family:'Sleeves'});
  expect(reopened.appliedProfile.at(-1)).toMatchObject({operation:'Packaging',lagDays:1,localScrapRateBps:100});
  expect(reopened.stale).toBe(false);
 });
 it('validates and atomically versions complete runs, rejects overlaps, and exposes source staleness by fingerprint',async()=>{
  const tx=await setupBoard();await addSources(tx);
  const preview=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves'});
  const operations=preview.operations.map((operation:any)=>({operation:operation.operation,target:operation.target,allocations:operation.associates.map((v:any)=>({operator:v.operator,username:v.username,allocated:v.proposed}))}));
  const invalid=structuredClone(operations);invalid[0].allocations[0].allocated=-1;
  await expect(productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Sleeves',fingerprint:preview.fingerprint,revision:0,operations:invalid,adjustmentReason:'Manager review'})).rejects.toThrow('nonnegative');
  expect(await tx.list('production-allocation-run')).toEqual([]);
  const operationTargets=operations.map(({operation,target}:any)=>({operation,target})),finalAllocations=Object.fromEntries(operations.map((v:any)=>[v.operation,v.allocations]));
  const saved=await productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Sleeves',fingerprint:preview.fingerprint,revision:0,operations:operationTargets,finalAllocations,adjustmentReason:'Manager reviewed proposed allocation'});
  expect(saved.run.revision).toBe(1);expect(saved.run.operations).toHaveLength(7);expect(saved.run.audit).toMatchObject({defaultProfile:DEFAULT_ALLOCATION_PROFILE,appliedProfile:DEFAULT_ALLOCATION_PROFILE,fgiRevisions:preview.fgiRevisions});
  expect((await productionAllocations(tx,manager,'production-allocation-expand',{...range,family:'Sleeves'})).stale).toBe(false);
  expect((await tx.list('production-event')).at(-1).details).toMatchObject({fingerprint:preview.fingerprint,fgiRevisions:preview.fgiRevisions});
  await expect(productionAllocations(tx,manager,'production-allocation-run-save',{from:'2026-10-02',to:'2026-10-08',family:'Sleeves',fingerprint:'x',revision:0,operations,adjustmentReason:'Overlap'})).rejects.toThrow('overlaps');
  const shift=await tx.get('production-shift','shift-a');shift.revision++;await tx.put('production-shift','shift-a',shift);
  const revisionOnly=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves'});expect(revisionOnly.fingerprint).toBe(preview.fingerprint);expect(revisionOnly.stale).toBe(false);
  shift.revision++;shift.segments[0].end=new Date(Date.parse(shift.segments[0].start)+120*60000).toISOString();shift.segments[0].extras={interruptionMinutes:60};await tx.put('production-shift','shift-a',shift);
  const sameNetMinutes=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves'});expect(sameNetMinutes.fingerprint).toBe(preview.fingerprint);expect(sameNetMinutes.stale).toBe(false);expect(sameNetMinutes.sourceRevisions[0].sources[0]).toMatchObject({grossMinutes:120,downtimeMinutes:60,minutes:60});
  expect((await productionAllocations(tx,manager,'production-allocation-board',range)).products.find((product:any)=>product.family==='Sleeves').stale).toBe(false);
  shift.revision++;shift.segments[0].reportedMoves=9;await tx.put('production-shift','shift-a',shift);
  const refreshed=await productionAllocations(tx,manager,'production-allocation-calculate',{...range,family:'Sleeves'});expect(refreshed.fingerprint).not.toBe(preview.fingerprint);expect(refreshed.stale).toBe(true);expect(refreshed.savedFingerprint).toBe(preview.fingerprint);
  expect((await productionAllocations(tx,manager,'production-allocation-board',range)).products.find((product:any)=>product.family==='Sleeves').stale).toBe(true);
  await expect(productionAllocations(tx,manager,'production-allocation-run-save',{...range,family:'Sleeves',fingerprint:preview.fingerprint,revision:1,operations,adjustmentReason:'Stale'})).rejects.toThrow('Source or FGI data changed');
 });
});

function productionConfigForTest(){return ['Receiving and Sorting','Cleaning / Decontamination','Inspection','Functional Testing','Repair / Reassembly','Final Quality Review','Packaging'];}
