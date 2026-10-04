import {beforeEach,describe,it,expect} from 'vitest';
import {seedProducts,resolveProduct,catalogRoutes as rawCatalogRoutes} from '../workspace/production-catalog.js';
import {ensureProductionForms,simplifyProductionARR,formRoutes as rawFormRoutes,initialDefinition,definitionAnswers,legacyProductionDefinition,definitionForProductionEntry} from '../workspace/production-forms.js';
import {settingsRoutes as rawSettingsRoutes} from '../workspace/production-settings.js';
import {production} from '../workspace/production.js';
import {productionConfig,productionAnswers} from '../workspace/production-model.js';
import {sha256} from '../workspace/model.js';
const catalogRoutes=(...args:Parameters<typeof rawCatalogRoutes>):Promise<any>=>rawCatalogRoutes(...args);
const formRoutes=(...args:Parameters<typeof rawFormRoutes>):Promise<any>=>rawFormRoutes(...args);
const settingsRoutes=(...args:Parameters<typeof rawSettingsRoutes>):Promise<any>=>rawSettingsRoutes(...args);
class Tx {docs=new Map<string,any>();async get(kind:string,key:string){return structuredClone(this.docs.get(kind+':'+key));}async put(kind:string,key:string,value:any){this.docs.set(kind+':'+key,structuredClone(value));}async list(kind:string){return [...this.docs].filter(([k])=>k.startsWith(kind+':')).map(([,v])=>structuredClone(v));}async entries(kind:string){return [...this.docs].filter(([k])=>k.startsWith(kind+':')).map(([k,data])=>({key:k.slice(kind.length+1),data:structuredClone(data)}));}async remove(kind:string,key:string){this.docs.delete(kind+':'+key);}}
const user=(role:string,forms=['arr','prr'])=>({id:role,username:role,role,active:true,forms}) as any;
const owner=user('owner'),admin=user('admin'),manager=user('manager'),lead=user('reviewer');
const date='2026-01-02';
const answers={workDate:date,shift:'day',stage:'Cleaning / Decontamination',product:'Compression sleeves',team:'Team A',entryType:'bod',mood:7.5,readiness:8,sopClarity:10,resources:8};
let tx:any;
beforeEach(async()=>{tx=new Tx();await tx.put('production-settings','main',productionConfig);await tx.put('production-migration','associates-30-v1',{});for(const u of [owner,admin,manager,lead])await tx.put('user',u.id,u);for(const form of ['arr','prr'])await tx.put('production-form',form,{id:form,identity:`production-demo-${form}`,version:'0.1.0',publishedAt:'2026-01-01T00:00:00Z',revision:1,definition:initialDefinition(form),versions:[{version:'0.1.0',definition:initialDefinition(form),at:'2026-01-01T00:00:00Z'}]});await ensureProductionForms(tx);await seedProducts(tx);await tx.put('production-operator','person-1',{id:'person-1',username:'person-1',active:true});await tx.put('production-session',sha256('qa-token'),{user:'person-1',expires:'2099-01-01T00:00:00Z'});});
const call=(route:string,input:any={},u:any=owner)=>production(tx,u,route,input,u?'':'qa-token');
describe('consolidated catalog',()=>{
 it('seeds a curated common list and long candidates once, with search',async()=>{const before=await tx.list('production-product');expect(before.length).toBeGreaterThan(350);expect(before.filter((p:any)=>p.common).length).toBeGreaterThanOrEqual(17);await seedProducts(tx);expect(await tx.list('production-product')).toEqual(before);const result=await catalogRoutes(tx,undefined,true,'production-product-list',{query:'compression'});expect(result.products.some((p:any)=>p.name==='Compression sleeves')).toBe(true);expect(result.unmatched).toEqual([]);});
 it('does not silently catalog unmatched text; preserves wording through mapping',async()=>{const count=(await tx.list('production-product')).length;const result=await resolveProduct(tx,'Compresion sleeves','person-1');expect(result.unmatched).toBe(true);expect((await tx.list('production-product')).length).toBe(count);await resolveProduct(tx,'compresion sleeves','person-1');const entries=await tx.list('production-unmatched');expect(entries).toHaveLength(1);await catalogRoutes(tx,admin,true,'production-product-resolve',{id:entries[0].id,productId:'family-1'});const resolved=await resolveProduct(tx,'Compresion sleeves','person-1');expect(resolved.product).toBe('Compression sleeves');expect(resolved.originalProduct).toBe('Compresion sleeves');expect((await tx.get('production-unmatched',entries[0].id)).name).toBe('Compresion sleeves');expect((await catalogRoutes(tx,admin,true,'production-product-list',{})).unmatched).toHaveLength(0);});
 it('enforces catalog edit roles and revision checks',async()=>{for(const u of [manager,lead])await expect(catalogRoutes(tx,u,true,'production-product-save',{})).rejects.toThrow();const p=await tx.get('production-product','family-1');await catalogRoutes(tx,admin,true,'production-product-save',{...p,aliases:['sleeve demo']});await expect(catalogRoutes(tx,admin,true,'production-product-save',p)).rejects.toThrow();expect((await resolveProduct(tx,'SLEEVE DEMO','person-1')).productId).toBe('family-1');await expect(catalogRoutes(tx,undefined,false,'production-product-list',{})).rejects.toThrow();});
});
describe('versioned production definitions',()=>{
 it('Admin drafts, only Owner publishes; ARR and PRR advance independently',async()=>{const f=await tx.get('production-form','arr');const changed=structuredClone(f.definition);changed.title='Alpha revised ARR';changed.fields.push({key:'customFeedback',label:'Custom feedback',type:'textarea',page:2,required:false,options:[],active:true,phase:'all'});await formRoutes(tx,admin,'production-form-draft',{form:'arr',revision:1,definition:changed});expect((await tx.get('production-form','arr')).version).toBe('0.1.0');expect((await tx.get('production-form','arr')).definition.title).not.toBe(changed.title);await expect(formRoutes(tx,admin,'production-form-publish',{form:'arr',revision:2})).rejects.toThrow();const {form}=await formRoutes(tx,owner,'production-form-publish',{form:'arr',revision:2});expect(form.version).toBe('0.1.1');expect(form.versions[0].definition.title).toBe(f.definition.title);expect((await tx.get('production-form','prr')).version).toBe('0.1.0');await expect(formRoutes(tx,owner,'production-form-publish',{form:'arr',revision:2})).rejects.toThrow();});
 it('pins prior submission definition and rejects old-version new submissions after publish',async()=>{const original=(await call('production-submit',{form:'arr',formVersion:'0.1.0',idempotencyKey:'original-snapshot',data:answers},null)).entry;const f=await tx.get('production-form','arr');const def=structuredClone(f.definition);def.title='New title after original entry';await formRoutes(tx,admin,'production-form-draft',{form:'arr',revision:1,definition:def});await formRoutes(tx,owner,'production-form-publish',{form:'arr',revision:2});const read=(await call('production-detail',{id:original.id},null)).entry;expect(read.definition).toEqual(original.definition);expect(read.formVersion).toBe('0.1.0');await expect(call('production-submit',{form:'arr',formVersion:'0.1.0',idempotencyKey:'stale-form-attempt',data:answers},null)).rejects.toThrow();});
 it('whitelists fields so ARR never carries PRR proposal/cost and reverse',()=>{const arr=productionAnswers('arr',{...answers,estimatedCost:'Unsure',proposal:'wrong form',expectedValue:'999',supporters:'other'},initialDefinition('arr'));for(const key of ['estimatedCost','proposal','expectedValue','supporters'])expect(arr[key]).toBeUndefined();const prr=productionAnswers('prr',{...answers,proposal:'A useful proposal',categories:['Training'],estimatedCost:'Unsure'},initialDefinition('prr'));expect(prr.estimatedCost).toBe('Unsure');expect(prr.mood).toBeUndefined();expect(prr.sopClarity).toBeUndefined();expect(prr.entryType).toBeUndefined();});
 it('validates configured custom fields without inventing defaults',()=>{const def=initialDefinition('prr');def.fields.push({key:'readinessChoice',label:'Preparation choice',type:'select',page:2,required:true,options:['ready','review'],active:true,phase:'all'});expect(()=>definitionAnswers(def,{proposal:'Idea',categories:['Training']})).toThrow('Preparation choice');expect(definitionAnswers(def,{proposal:'Idea',categories:['Training'],readinessChoice:'review'}).readinessChoice).toBe('review');expect(()=>definitionAnswers(def,{proposal:'Idea',categories:['Training'],readinessChoice:'other'})).toThrow();});
});
describe('minimal crew and operational permissions',()=>{
 it('only admin/owner edit settings, validate assignments and do not grant recognition implicitly',async()=>{for(const u of [manager,lead])await expect(settingsRoutes(tx,u,'production-settings-get',{})).rejects.toThrow();const settings={cutoffHour:3,teams:['Team A'],crewAssignments:{'person-1':{team:'Team A',managerId:'manager',leadId:'reviewer'}}};const saved=await settingsRoutes(tx,admin,'production-settings-save',{revision:1,settings});expect(saved.settings.crewAssignments['person-1'].leadId).toBe('reviewer');expect((await settingsRoutes(tx,admin,'production-settings-get',{})).permissions).toEqual([]);await expect(settingsRoutes(tx,admin,'production-settings-save',{revision:1,settings})).rejects.toThrow();await expect(settingsRoutes(tx,admin,'production-settings-save',{revision:2,settings:{...settings,crewAssignments:{'person-1':{team:'Team A',managerId:'reviewer'}}}})).rejects.toThrow();});
 it('Owner needs explicit operational role; Admin cannot grant it',async()=>{await expect(call('production-fgi-presets',{total:1400})).rejects.toThrow();await expect(call('production-permission',{userId:'owner',recognition:true,updates:true,operationalManager:true},admin)).rejects.toThrow();await call('production-permission',{userId:'owner',recognition:true,updates:true,operationalManager:true});expect((await call('production-catalog')).capabilities.operationalManager).toBe(true);expect((await call('production-fgi-presets',{total:1400})).total).toBe(1400);await call('production-permission',{userId:'owner',recognition:true,updates:true,operationalManager:false});await expect(call('production-fgi-presets',{total:1400})).rejects.toThrow();await expect(call('production-permission',{userId:'admin',recognition:true,updates:true,operationalManager:true})).rejects.toThrow();});
});
describe('publication and alias review regression',()=>{
 it('does not expose unpublished draft text through public or operator catalog',async()=>{
  const f=await tx.get('production-form','arr');const definition={...f.definition,title:'UNPUBLISHED INTERNAL DRAFT TITLE'};await formRoutes(tx,admin,'production-form-draft',{form:'arr',revision:1,definition,summary:'UNPUBLISHED CHANGE NOTES'});
  const publicCatalog=await production(tx,undefined,'production-catalog',{},'');const operatorCatalog=await call('production-catalog',{},null);
  for(const catalog of [publicCatalog,operatorCatalog]){expect(JSON.stringify(catalog.forms)).not.toContain('UNPUBLISHED');expect(catalog.forms[0].draft).toBeUndefined();expect(catalog.forms[0].versions).toBeUndefined();}
  expect(JSON.stringify(await formRoutes(tx,admin,'production-form-admin',{form:'arr'}))).toContain('UNPUBLISHED');
 });
 it('prevents new product names colliding with aliases and stale unmatched ambiguity',async()=>{
  await resolveProduct(tx,'Sleeve alternate','person-1');const unmatched=(await tx.list('production-unmatched'))[0];const p=await tx.get('production-product','family-1');await catalogRoutes(tx,admin,true,'production-product-save',{...p,aliases:['Already mapped alias','Sleeve alternate']});
  await expect(catalogRoutes(tx,admin,true,'production-product-resolve',{id:unmatched.id,name:'Already mapped alias'})).rejects.toThrow('alias already exists');
  await expect(catalogRoutes(tx,admin,true,'production-product-resolve',{id:unmatched.id,productId:'family-2'})).rejects.toThrow('already maps');
  const good=await catalogRoutes(tx,admin,true,'production-product-resolve',{id:unmatched.id,productId:'family-1'});expect(good.product.id).toBe('family-1');
 });
});
describe('current operational dashboard sources',()=>{
 it('shows new shift and FGI days with distinct labels; zero stays counted and missing stays unknown',async()=>{
  await tx.put('production-shift','dashboard-shift',{id:'dashboard-shift',workDate:date,operator:'person-1',username:'person-1',team:'Team A',status:'submitted',data:{recognition:'NEVER SHOW IN AGGREGATE'},history:[{private:'NEVER SHOW IN AGGREGATE'}],segments:[
   {kind:'training',start:'2026-01-02T07:00:00Z',end:'2026-01-02T08:00:00Z',stage:'Cleaning / Decontamination',product:'Compression sleeves',reportedMoves:999},
   {kind:'production',start:'2026-01-02T08:00:00Z',end:'2026-01-02T09:00:00Z',stage:'Cleaning / Decontamination',product:'Compression sleeves',reportedMoves:0,extras:{interruptionMinutes:15}},
   {kind:'production',start:'2026-01-02T09:00:00Z',end:'2026-01-02T10:00:00Z',stage:'Packaging',product:'Compression sleeves',reportedMoves:null},
   {kind:'production',start:'2026-01-02T10:00:00Z',end:null,stage:'Packaging',product:'Compression sleeves',reportedMoves:null}
  ]});
  await call('production-fgi-save',{workDate:date,revision:0,rows:[{family:'Compression sleeves',quantity:1400}],provenance:'manual_demo'},manager);
  const dashboard=await call('production-dashboard',{from:date,to:date},admin);expect(dashboard.demo).toBe(true);expect(dashboard.shiftDays).toHaveLength(1);expect(dashboard.shiftDays[0]).toMatchObject({shifts:1,productionMinutes:105,trainingMinutes:60,downtimeMinutes:15,reportedMoves:0,reportedCount:1,unreportedCount:1,openSegments:1,demo:true});expect(dashboard.fgiDays[0]).toMatchObject({date,total:1400,demo:true,label:'Authoritative demo FGI'});expect(dashboard.fgiDays[0].rows).toEqual([{family:'Compression sleeves',quantity:1400}]);expect(JSON.stringify(dashboard)).not.toContain('NEVER SHOW');
  const otherCrew=await call('production-dashboard',{from:date,to:date,teams:['Team B']},manager);expect(otherCrew.shiftDays).toEqual([]);expect(otherCrew.fgiDays[0].total).toBe(1400);
  const prrOnly=await call('production-dashboard',{from:date,to:date},user('manager',['prr']));expect(prrOnly.shiftDays).toEqual([]);expect(prrOnly.fgiDays).toEqual([]);
  await expect(call('production-dashboard',{from:date,to:date},lead)).rejects.toThrow();
 });
});
describe('deployed alpha definition migration',()=>{
 it('archives original phase-specific 0.1.0 before advancing metadata-only forms once',async()=>{
  for(const form of ['arr','prr'])await tx.put('production-form',form,{id:form,identity:`production-demo-${form}`,version:'0.1.0',publishedAt:'2026-01-01T00:00:00Z'});
  const raw={id:'historic-raw',form:'arr',formIdentity:'production-demo-arr',formVersion:'0.1.0',operator:'person-1',username:'person-1',revision:1,data:{...answers,estimatedCost:'Unsure'},status:'submitted',submittedAt:'2026-01-02T01:00:00Z',history:[],shares:{}};
  await tx.put('production-entry',raw.id,raw);await ensureProductionForms(tx);
  const upgraded=await tx.get('production-form','arr');expect(upgraded.version).toBe('0.1.1');expect(upgraded.versions.map((v:any)=>v.version)).toEqual(['0.1.0','0.1.1']);expect(upgraded.versions[0].at).toBe('2026-01-01T00:00:00Z');expect(upgraded.definition.fields.find((f:any)=>f.key==='mood').label).toBe('How is your workday looking?');
  const old=await definitionForProductionEntry(tx,raw);expect(old!.fields.find(f=>f.key==='mood')!.label).toBe('How is your workday looking as you get started?');expect((old!.fields.find(f=>f.key==='mood') as any).defaultValue).toBe(5);expect(old!.fields.some(f=>f.key==='estimatedCost')).toBe(false);
  const shown=(await call('production-detail',{id:raw.id},null)).entry;expect(shown.formVersion).toBe('0.1.0');expect(shown.definition.fields.find((f:any)=>f.key==='sopClarity').label).toBe('How clear are the SOP and quality expectations?');expect(shown.data.estimatedCost).toBeUndefined();expect(await tx.get('production-entry',raw.id)).toEqual(raw);
  const snapshot=await tx.list('production-form');const eventCount=(await tx.list('production-event')).length;await ensureProductionForms(tx);expect(await tx.list('production-form')).toEqual(snapshot);expect((await tx.list('production-event')).length).toBe(eventCount);
 });
 it('does not silently reinterpret unknown versions or unrelated form identities',async()=>{
  expect(await definitionForProductionEntry(tx,{form:'arr',formIdentity:'county-arr',formVersion:'0.1.0'})).toBeUndefined();
  expect(await definitionForProductionEntry(tx,{form:'arr',formIdentity:'production-demo-arr',formVersion:'0.9.9'})).toBeUndefined();
  const changeover=legacyProductionDefinition('arr','changeover');expect(changeover.fields.find(f=>f.key==='sopClarity')!.label).toBe('How clear were the SOP and quality expectations?');expect(changeover.fields.some(f=>f.key==='newProduct')).toBe(true);expect(changeover.fields.some(f=>f.key==='mood')).toBe(false);
 });
});
describe('continuous ARR is the only new shift entry path',()=>{
 it('rejects disconnected ARR submissions from both current and stale clients without writing records',async()=>{
  const f=await tx.get('production-form','arr');await tx.put('production-form','arr',{...f,version:'0.1.1'});
  const before=await tx.list('production-entry');
  for(const version of ['0.1.0','0.1.1'])for(const entryType of ['bod','changeover','eod'])await expect(call('production-submit',{form:'arr',formVersion:version,idempotencyKey:`blocked-${version}-${entryType}`,data:{...answers,entryType}},null)).rejects.toThrow('continuous shift workflow');
  expect(await tx.list('production-entry')).toEqual(before);expect(await tx.list('production-idempotency')).toEqual([]);
  const result=await call('production-submit',{form:'prr',formVersion:'0.1.0',idempotencyKey:'prr-still-supported',data:{...answers,proposal:'Valid current PRR suggestion',categories:['Training']}},null);expect(result.entry.form).toBe('prr');
 });
 it('can replay an already successful historical ARR request without creating another record',async()=>{
  const input={form:'arr',formVersion:'0.1.0',idempotencyKey:'historical-successful-retry',data:answers};
  const first=(await call('production-submit',input,null)).entry;
  const f=await tx.get('production-form','arr');await tx.put('production-form','arr',{...f,version:'0.1.1'});
  const replay=(await call('production-submit',input,null)).entry;expect(replay.id).toBe(first.id);expect(await tx.list('production-entry')).toHaveLength(1);
  await expect(call('production-submit',{...input,data:{...answers,mood:9}},null)).rejects.toThrow('different answers');
 });
});


describe('approved ARR usability definition migration',()=>{
 it('removes future redundant exception once, preserving history, drafts and other questions',async()=>{
  const definition=initialDefinition('arr');definition.fields.push({key:'localQuestion',label:'Local custom question',type:'text',page:1,required:false,options:[],active:true});
  const draft={definition:structuredClone(definition),by:'admin',summary:'Unpublished work'};
  const original={id:'arr',identity:'production-demo-arr',version:'0.1.1',revision:4,definition,versions:[{version:'0.1.1',definition:structuredClone(definition)}],draft};
  await tx.put('production-form','arr',original);
  const historic={id:'historic-shift',formSnapshot:structuredClone(original),data:{exception:'Existing historical context'}};await tx.put('production-shift',historic.id,historic);
  const prr=await tx.get('production-form','prr');
  await simplifyProductionARR(tx);const updated=await tx.get('production-form','arr');
  expect(updated.version).toBe('0.1.2');expect(updated.revision).toBe(5);expect(updated.definition.fields.find((f:any)=>f.key==='exception')).toMatchObject({active:false,required:false});
  expect(updated.definition.fields.find((f:any)=>f.key==='localQuestion').active).toBe(true);
  expect(updated.versions[0].definition).toEqual(definition);expect(updated.draft).toEqual(draft);expect(await tx.get('production-shift',historic.id)).toEqual(historic);expect(await tx.get('production-form','prr')).toEqual(prr);
  const events=await tx.list('production-event');expect(events.at(-1)).toMatchObject({before:original,after:updated});
  await simplifyProductionARR(tx);expect(await tx.get('production-form','arr')).toEqual(updated);expect(await tx.list('production-event')).toEqual(events);
 });
 it('does not add unnecessary versions when the question was already removed',async()=>{
  const definition=initialDefinition('arr');definition.fields=definition.fields.filter(f=>f.key!=='exception');const original={id:'arr',version:'0.1.3',revision:2,definition};await tx.put('production-form','arr',original);await simplifyProductionARR(tx);expect(await tx.get('production-form','arr')).toEqual(original);
 });
});
