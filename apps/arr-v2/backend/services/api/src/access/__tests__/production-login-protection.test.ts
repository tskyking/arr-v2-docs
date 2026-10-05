import {afterAll,beforeAll,describe,expect,it} from 'vitest';
import {createServer,type Server} from 'node:http';
import {PGlite} from '@electric-sql/pglite';
import type {Pool} from 'pg';
import {AccessStore} from '../store.js';
import {createAccessHandler} from '../handler.js';
import {AccessError,sha256} from '../domain.js';
import {protectProductionLogin,ProductionLoginRejected} from '../workspace/production-login-protection.js';

it('failure windows expire without extension, success resets current windows, and service errors are not credential failures',async()=>{
 const rows=new Map<string,any>();const tx:any={get:async(k:string,id:string)=>structuredClone(rows.get(id)),put:async(k:string,id:string,v:any)=>rows.set(id,structuredClone(v)),remove:async(k:string,id:string)=>rows.delete(id)};
 const fail=async()=>{throw new AccessError(401,'Invalid credentials');};
 for(let i=0;i<8;i++)expect(await protectProductionLogin(tx,' Person-1 ','ip',fail,1000)).toBeInstanceOf(ProductionLoginRejected);
 expect((await protectProductionLogin(tx,'person-1','ip',async()=>({ok:true}),1001)).error.status).toBe(429);
 expect(await protectProductionLogin(tx,'person-1','ip',async()=>({ok:true}),901001)).toEqual({ok:true});expect(rows.size).toBe(0);
 await protectProductionLogin(tx,'person-1','ip',fail,902000);expect(rows.size).toBe(2);await protectProductionLogin(tx,'PERSON-1','ip',async()=>({ok:true}),902001);expect(rows.size).toBe(0);
 await expect(protectProductionLogin(tx,'person-1','ip',async()=>{throw new Error('DB unavailable');},903000)).rejects.toThrow('DB unavailable');expect(rows.size).toBe(0);
});

describe('shared-facility-IP HTTP acceptance with durable failure counters',()=>{
 let db:PGlite,server:Server,base:string,pool:Pool;
 // PGlite has one connection: lease it for each transaction to model PostgreSQL
 // row-lock transaction isolation; standalone queries cannot interleave a transaction.
 let tail=Promise.resolve();
 const acquire=async()=>{let release!:()=>void;const previous=tail;tail=new Promise<void>(r=>release=r);await previous;return release;};
 const call=(name:string,password='abc@123',ip='203.0.113.20',extra={})=>fetch(base+'v2/production-login',{method:'POST',headers:{'Content-Type':'application/json','X-ARR-Request':'1','X-Forwarded-For':ip},body:JSON.stringify({username:name,password,...extra})});
 beforeAll(async()=>{
  db=new PGlite();const raw=async(sql:string,args?:unknown[])=>{if(sql.includes('CREATE TABLE')&&!args){await db.exec(sql);return{rows:[]};}return db.query(sql,args);};
  pool={query:async(sql:string,args?:unknown[])=>{const release=await acquire();try{return await raw(sql,args);}finally{release();}},connect:async()=>{const release=await acquire();return{query:raw,release};}} as unknown as Pool;
  const store=new AccessStore(pool);await store.init();
  const handlers=[createAccessHandler(store,true),createAccessHandler(new AccessStore(pool),true)];let next=0;
  server=createServer(async(req,res)=>{const path=new URL(req.url!,'http://local').pathname.replace(/^\/api/,'');if(!await handlers[next++%2](req,res,path)){res.writeHead(404);res.end();}});
  await new Promise<void>(resolve=>server.listen(0,'127.0.0.1',resolve));base=`http://127.0.0.1:${(server.address() as any).port}/api/access-demo/`;
  // Old exhausted buckets must not keep legitimate associates locked out on upgrade.
  await pool.query("INSERT INTO tschutes_arr_limits VALUES ($1,999,now()+interval '1 hour'),($2,999,now()+interval '1 hour')",['v2:production-login:'+sha256('203.0.113.20'),'v2:bounded:production-login']);
 },30000);
 afterAll(async()=>{server?.closeAllConnections();if(server)await new Promise<void>(r=>server.close(()=>r()));await db?.close();});
 it('accepts 30 simultaneous associates through one IP and 300 valid logins in the hour, preserving sessions',async()=>{
  for(let wave=0;wave<10;wave++){
   await Promise.all(Array.from({length:30},async()=>{for(const route of ['catalog','logout']){const r=await fetch(base+'v2/'+route,{method:'POST',headers:{'Content-Type':'application/json','X-ARR-Request':'1','X-Forwarded-For':'203.0.113.20'},body:'{}'});expect(r.status).toBe(200);}}));
   const responses=await Promise.all(Array.from({length:30},(_,i)=>call(`person-${i+1}`)));
   expect(responses.map(r=>r.status)).toEqual(Array(30).fill(200));
   for(let i=0;i<30;i++){expect((await responses[i].json()).user.username).toBe(`person-${i+1}`);const cookie=responses[i].headers.get('set-cookie');expect(cookie).toContain('production_operator=');expect(cookie).toContain('HttpOnly');
    if(wave===0){const view=await fetch(base+'v2/production-catalog',{method:'POST',headers:{'Content-Type':'application/json','X-ARR-Request':'1','X-Forwarded-For':'203.0.113.20',Cookie:cookie!.split(';')[0]},body:'{}'});expect(view.status).toBe(200);expect((await view.json()).user.username).toBe(`person-${i+1}`);}
   }
  }
  expect((await pool.query("SELECT count(*)::int n FROM tschutes_v2_documents WHERE kind='production-login-failure'")).rows[0].n).toBe(0);
 },60000);
 it('serializes concurrent failures across handlers and isolates the account-plus-IP lock from other associates',async()=>{
  const bad=await Promise.all(Array.from({length:20},()=>call('PERSON-1','wrong','203.0.113.21',{productionLoginIpHash:'forged',ip:'forged'})));
  expect(bad.filter(r=>r.status===401)).toHaveLength(8);expect(bad.filter(r=>r.status===429)).toHaveLength(12);
  expect((await call('person-1','abc@123','203.0.113.21')).status).toBe(429);
  expect((await call('person-2','abc@123','203.0.113.21')).status).toBe(200);
  // Rotating IPs cannot escape the account-wide budget.
  for(let i=0;i<22;i++)expect((await call('person-1','wrong',`198.51.100.${i+1}`)).status).toBe(401);
  expect((await call('person-1','wrong','198.51.100.100')).status).toBe(429);
  // Unknown usernames receive the same failure/lock behavior, with no session issued.
  for(let i=0;i<8;i++)expect((await call('unknown-person','wrong','203.0.113.21')).status).toBe(401);
  const locked=await call('unknown-person','wrong','203.0.113.21');expect(locked.status).toBe(429);expect(locked.headers.get('set-cookie')).toBeNull();
  const windows=(await pool.query("SELECT data FROM tschutes_v2_documents WHERE kind='production-login-failure'")).rows;
  expect(windows.some((r:any)=>r.data.count===30)).toBe(true);
 },30000);
});
