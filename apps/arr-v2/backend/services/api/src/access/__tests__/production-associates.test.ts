import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { expect, it } from 'vitest';
import { WorkspaceStore } from '../workspace/store.js';
import { WorkspaceService } from '../workspace/service.js';
import { hashPassword } from '../workspace/model.js';

it('creates 30 demo associates and upgrades an existing installation once without overwriting records or totals', async () => {
 const db = new PGlite();
 const query = async (sql: string, args?: unknown[]) => {
  if (sql.includes('CREATE TABLE') && !args) { await db.exec(sql); return {rows: []}; }
  return db.query(sql, args);
 };
 const store = new WorkspaceStore({query,connect:async()=>({query,release(){}})} as unknown as Pool);
 const service = new WorkspaceService(store);
 const call = (route:string, input:any) => service.execute(route,input,'');
 try {
  await call('production-catalog',{});
  for(let n=1;n<=30;n++) {
   const login = await call('production-login',{username:`person-${n}`,password:'abc@123'});
   expect(login.user.username).toBe(`person-${n}`);
   expect(login.user.role).toBe('operator');
  }
  await expect(call('production-login',{username:'person-31',password:'abc@123'})).rejects.toThrow();
  // Model an existing ten-account deployment, including one pre-existing extra account.
  await store.transaction(async tx => {
   await tx.remove('production-migration','associates-30-v1');
   for(let n=12;n<=30;n++)await tx.remove('production-operator',`person-${n}`);
   const original=await tx.get('production-operator','person-11');
   await tx.put('production-operator','person-11',{...original,active:false,password:hashPassword('preserve-custom-password')});
   await tx.put('production-entry','existing-entry',{id:'existing-entry',data:{units:47},operator:'person-1'});
  });
  const snapshot=()=>store.transaction(async tx=>({
   original:await tx.get('production-operator','person-1'),
   extra:await tx.get('production-operator','person-11'),
   sessions:await tx.list('production-session'),
   forms:await tx.list('production-form'),
   settings:await tx.get('production-settings','main'),
   totals:await tx.list('production-total'),
   entry:await tx.get('production-entry','existing-entry')
  }));
  const before=await snapshot();
  await call('production-catalog',{});
  expect(await snapshot()).toEqual(before);
  const accounts=await store.transaction(tx=>tx.list('production-operator'));
  expect(accounts).toHaveLength(30);
  const marker=await store.transaction(tx=>tx.get('production-migration','associates-30-v1'));
  await call('production-catalog',{});
  expect(await store.transaction(tx=>tx.list('production-operator'))).toEqual(accounts);
  expect(await store.transaction(tx=>tx.get('production-migration','associates-30-v1'))).toEqual(marker);
  for(let n=12;n<=30;n++) expect((await call('production-login',{username:`person-${n}`,password:'abc@123'})).user.username).toBe(`person-${n}`);
 } finally {await db.close();}
},30000);
