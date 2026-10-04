import {describe,it,expect} from 'vitest';
import {calculateAllocation,distribute,fgiPreset,productionAllocations} from '../workspace/production-allocations.js';
const source=(operator:string,minutes:number,reportedMoves:number|null)=>({sourceId:operator,sourceRevision:1,operator,username:operator,minutes,reportedMoves});
describe('demo allocation arithmetic',()=>{
 it('keeps preset totals exact with repeatable rounding and varied proportions',()=>{for(const total of [1400,14000])for(let seed=1;seed<100;seed++){let n=seed;const rand=()=>((n=n*16807%2147483647)-1)/2147483646;const p=fgiPreset(total,rand);expect(p.rows.reduce((a,r)=>a+r.quantity,0)).toBe(total);expect(p.rows.every(r=>Number.isInteger(r.quantity)&&r.quantity>=0)).toBe(true);}});
 it('allocates only supplied production minutes, not equal headcount',()=>{const result=calculateAllocation(1500,[source('a',240,null),source('b',240,null),source('c',240,null),source('d',180,null)],'time');expect(result.rows.map(r=>r.allocated)).toEqual([400,400,400,300]);});
 it('preserves 400 reported beside time estimate 250; comparison honors 400',()=>{const rows=[source('a',60,400),source('b',60,null),source('c',60,null),source('d',60,null)];expect(calculateAllocation(1000,rows,'time').rows.map(r=>r.allocated)).toEqual([250,250,250,250]);expect(calculateAllocation(1000,rows,'reported-first').rows.map(r=>r.allocated)).toEqual([400,200,200,200]);const fixed=calculateAllocation(1000,rows,'adjusted',{a:300});expect(fixed.rows.map(r=>r.allocated)).toEqual([300,234,233,233]);expect(fixed.rows[0].reportedMoves).toBe(400);});
 it('retains missing vs zero and never silently normalizes excessive reports',()=>{const result=calculateAllocation(100,[source('a',60,400),source('b',60,0),source('c',60,null)],'reported-first');expect(result.canSave).toBe(false);expect(result.rows.map(r=>r.reportedMoves)).toEqual([400,0,null]);expect(result.rows.every(r=>r.allocated===null)).toBe(true);expect(calculateAllocation(100,[source('a',60,400)],'time').canSave).toBe(true);});
 it('refuses unassigned remainder without eligible minutes',()=>{expect(calculateAllocation(100,[source('a',60,80)],'reported-first').canSave).toBe(false);expect(calculateAllocation(100,[],'time').canSave).toBe(false);expect(()=>distribute(100,[0,0])).toThrow();});
 it('rejects negative, unknown-associate, and noninteger fixed values',()=>{for(const fixed of [{a:-1},{a:.5},{b:3}] as Record<string,number>[])expect(()=>calculateAllocation(10,[source('a',60,null)],'adjusted',fixed)).toThrow();});
});
class Tx {docs=new Map<string,any>();async get(kind:string,key:string){return structuredClone(this.docs.get(kind+':'+key));}async put(kind:string,key:string,value:any){this.docs.set(kind+':'+key,structuredClone(value));}async list(kind:string){return [...this.docs].filter(([k])=>k.startsWith(kind+':')).map(([,v])=>structuredClone(v));}}
const manager:any={id:'mgr',username:'mgr',role:'manager',active:true,forms:['arr']};
describe('FGI storage and permissions',()=>{
 it('requires operational Manager role for Owner mutations',async()=>{const tx:any=new Tx(),owner={...manager,id:'owner',role:'owner'};await expect(productionAllocations(tx,owner,'production-fgi-presets',{total:1400})).rejects.toThrow();await tx.put('production-permission','owner',{operationalManager:true});expect((await productionAllocations(tx,owner,'production-fgi-presets',{total:1400})).total).toBe(1400);});
 it('retains revisions, audit, and demo provenance without accepting stale writes',async()=>{const tx:any=new Tx();const input={workDate:'2026-10-04',revision:0,rows:[{family:'Compression sleeves',quantity:10}],provenance:'simulated_preset'};await productionAllocations(tx,manager,'production-fgi-save',input);await expect(productionAllocations(tx,manager,'production-fgi-save',input)).rejects.toThrow();const {fgi}=await productionAllocations(tx,manager,'production-fgi-save',{...input,revision:1,provenance:'manual_demo',rows:[{family:'Compression sleeves',quantity:12}]});expect(fgi.revision).toBe(2);expect(fgi.history[0].total).toBe(10);expect(fgi.provenance).toBe('simulated_preset');expect((await tx.list('production-event')).length).toBe(2);});
 it('disallows lead/admin/associate mutations and unknown routes are ignored',async()=>{const tx:any=new Tx();for(const role of ['reviewer','admin'])await expect(productionAllocations(tx,{...manager,role} as any,'production-fgi-save',{})).rejects.toThrow();await expect(productionAllocations(tx,undefined,'production-fgi-list',{})).rejects.toThrow();expect(await productionAllocations(tx,manager,'production-anything',{})).toBeUndefined();});
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
