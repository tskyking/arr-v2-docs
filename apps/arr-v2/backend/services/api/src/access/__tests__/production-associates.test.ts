import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { expect, it } from 'vitest';
import { WorkspaceStore } from '../workspace/store.js';
import { WorkspaceService } from '../workspace/service.js';
import { hashPassword } from '../workspace/model.js';
import {production} from '../workspace/production.js';

const firstNames = ['Amy','Ben','Cal','Dan','Ed','Fay','Hal','Ivy','Joy','Kim','Leo','Max','Nev','Obe','Pat','Que','Ray','Sky','Ty','Uma','Val','Van','Vic','Viv','Von','Wes','Xia','Yan','Zac','Zoe'];
const expectedProfile = (n:number) => ({firstName:firstNames[n-1],lastName:`-${n}`,email:`${firstNames[n-1]}-${n}@demo.com`});

it('creates 30 profiled demo associates and accepts either alias or email without changing passwords', async () => {
 const db = new PGlite();
 const query = async (sql: string, args?: unknown[]) => {
  if (sql.includes('CREATE TABLE') && !args) { await db.exec(sql); return {rows: []}; }
  return db.query(sql, args);
 };
 const store = new WorkspaceStore({query,connect:async()=>({query,release(){}})} as unknown as Pool);
 const service = new WorkspaceService(store);
 const call = (route:string, input:any) => service.execute(route,input,'');
 try {
  const catalog = await call('production-catalog',{});
  expect(catalog.operators.map((o:any)=>o.username)).toEqual(Array.from({length:30},(_,i)=>`person-${i+1}`));
  expect(catalog.operators.every((o:any)=>o.profile===undefined)).toBe(true);
  for(let n=1;n<=30;n++) {
   const expected={id:`person-${n}`,username:`person-${n}`,profile:expectedProfile(n)};
   const aliasLogin = await call('production-login',{username:`person-${n}`,password:'abc@123'});
   expect(aliasLogin.user).toMatchObject({...expected,role:'operator'});
   const signedInCatalog=await service.execute('production-catalog',{},'',undefined,aliasLogin.token);
   expect(signedInCatalog.operators[n-1]).toMatchObject(expected);
   const emailLogin = await call('production-login',{username:expectedProfile(n).email.toUpperCase(),password:'abc@123'});
   expect(emailLogin.user).toMatchObject({...expected,role:'operator'});
  }
  await expect(call('production-login',{username:'Amy-1@demo.com',password:'wrong-password'})).rejects.toThrow();
  await expect(call('production-login',{username:'unknown@demo.com',password:'abc@123'})).rejects.toThrow();
  await expect(call('production-login',{username:'person-31',password:'abc@123'})).rejects.toThrow();
  await expect(store.transaction(tx=>production(tx,{id:'owner',username:'owner',role:'owner',forms:['arr','prr']} as any,'production-associate-save',{id:'person-31',active:true},'',null))).rejects.toThrow('person-1 through person-30');
  // Model an existing ten-account deployment, including one pre-existing extra account.
  await store.transaction(async tx => {
   await tx.remove('production-migration','associates-30-v1');
   await tx.remove('production-migration','associate-profiles-v1');
   for(let n=12;n<=30;n++)await tx.remove('production-operator',`person-${n}`);
   for(let n=1;n<=11;n++){
    const current:any=await tx.get('production-operator',`person-${n}`);
    const {profile:ignored,...withoutProfile}=current;
    await tx.put('production-operator',`person-${n}`,withoutProfile);
   }
   const original:any=await tx.get('production-operator','person-11');
   await tx.put('production-operator','person-11',{...original,active:false,password:hashPassword('preserve-custom-password')});
   await tx.put('production-entry','existing-entry',{id:'existing-entry',data:{units:47},operator:'person-1'});
  });
  const preserved=await store.transaction(async tx=>({
   person1:await tx.get<any>('production-operator','person-1'),
   person11:await tx.get<any>('production-operator','person-11'),
   sessions:await tx.list('production-session'),
   forms:await tx.list('production-form'),
   settings:await tx.get('production-settings','main'),
   totals:await tx.list('production-total'),
   entry:await tx.get('production-entry','existing-entry')
  }));
  await call('production-catalog',{});
  const accounts:any[]=await store.transaction(tx=>tx.list('production-operator'));
  expect(accounts).toHaveLength(30);
  for(let n=1;n<=30;n++)expect(accounts.find(v=>v.id===`person-${n}`)?.profile).toEqual(expectedProfile(n));
  const upgraded1=accounts.find(v=>v.id==='person-1');
  const upgraded11=accounts.find(v=>v.id==='person-11');
  expect(upgraded1.password).toEqual(preserved.person1.password);
  expect(upgraded11.password).toEqual(preserved.person11.password);
  expect(upgraded11.active).toBe(false);
  expect(await store.transaction(async tx=>({
   sessions:await tx.list('production-session'),forms:await tx.list('production-form'),settings:await tx.get('production-settings','main'),totals:await tx.list('production-total'),entry:await tx.get('production-entry','existing-entry')
  }))).toEqual({sessions:preserved.sessions,forms:preserved.forms,settings:preserved.settings,totals:preserved.totals,entry:preserved.entry});
  const markers=await store.transaction(async tx=>({associates:await tx.get('production-migration','associates-30-v1'),profiles:await tx.get('production-migration','associate-profiles-v1')}));
  await call('production-catalog',{});
  expect(await store.transaction(tx=>tx.list('production-operator'))).toEqual(accounts);
  expect(await store.transaction(async tx=>({associates:await tx.get('production-migration','associates-30-v1'),profiles:await tx.get('production-migration','associate-profiles-v1')}))).toEqual(markers);
  for(let n=12;n<=30;n++) expect((await call('production-login',{username:expectedProfile(n).email,password:'abc@123'})).user.username).toBe(`person-${n}`);
 } finally {await db.close();}
},30000);
