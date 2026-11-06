import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { WorkspaceStore } from '../workspace/store.js';
import { WorkspaceService } from '../workspace/service.js';
import { hashPassword } from '../workspace/model.js';

describe('demo associate profile editing', () => {
  let db: PGlite, store: WorkspaceStore, service: WorkspaceService;
  const sessions: Record<string,string> = {};
  const password='qa-local-only-strong-password';
  const call=(route:string,input:any={},staff='',operatorToken='')=>(service.execute as any)(route,input,sessions[staff]||staff,undefined,operatorToken);

  beforeAll(async()=>{
    db=new PGlite();
    const query=async(sql:string,args?:unknown[])=>{
      if(sql.includes('CREATE TABLE')&&!args){await db.exec(sql);return{rows:[]};}
      return db.query(sql,args);
    };
    store=new WorkspaceStore({query,connect:async()=>({query,release(){}})} as unknown as Pool);
    service=new WorkspaceService(store);
    await store.init();
    await store.transaction(async tx=>{
      await service.seed(tx);
      for(const role of ['owner','admin','manager'] as const)await tx.put('user',role,{id:role,username:role,email:`${role}@example.test`,role,forms:['arr','prr'],active:true,generation:1,password:hashPassword(password)});
    });
    for(const role of ['owner','admin','manager'])sessions[role]=(await call('login',{username:role,password})).token;
    await call('production-catalog');
  },30000);

  afterAll(async()=>{await db?.close();});

  it('lets only A+ update a profile while preserving identity, access, password, records, assignments, and sessions',async()=>{
    const login=await call('production-login',{username:'Amy-1@demo.com',password:'abc@123'});
    await store.transaction(async tx=>{
      const account:any=await tx.get('production-operator','person-1');
      await tx.put('production-operator','person-1',{...account,team:'Team B',custom:{keep:true}});
      await tx.put('production-entry','profile-preservation',{id:'profile-preservation',operator:'person-1',revision:7});
      const settings:any=await tx.get('production-settings','main');
      await tx.put('production-settings','main',{...settings,crewAssignments:{...settings.crewAssignments,'person-1':{team:'Team B',managerIds:['manager'],leadIds:[]}}});
      await tx.put('production-event','existing-audit',{id:'existing-audit',action:'existing history',operator:'person-1'});
    });
    const listed=await call('production-associate-list',{},'owner'),before=listed.operators.find((value:any)=>value.id==='person-1');
    const storedBefore:any=await store.transaction(tx=>tx.get('production-operator','person-1'));
    for(const staff of ['admin','manager'])await expect(call('production-associate-profile-save',{id:'person-1',revision:before.revision,profile:{firstName:'Alicia',lastName:'Example',email:'alicia@example.test'}},staff)).rejects.toThrow('A+');

    const result=await call('production-associate-profile-save',{id:'person-1',revision:before.revision,profile:{firstName:'  Alicia  ',lastName:'  Example  ',email:'  Alicia.New@Example.Test  '}},'owner');
    expect(result.operator).toEqual({id:'person-1',username:'person-1',profile:{firstName:'Alicia',lastName:'Example',email:'alicia.new@example.test'},active:true,revision:before.revision+1});
    const storedAfter:any=await store.transaction(tx=>tx.get('production-operator','person-1'));
    expect(storedAfter).toEqual({...storedBefore,team:'Team B',custom:{keep:true},profile:result.operator.profile,revision:before.revision+1});
    expect(await store.transaction(tx=>tx.get('production-entry','profile-preservation'))).toEqual({id:'profile-preservation',operator:'person-1',revision:7});
    expect((await store.transaction(tx=>tx.get<any>('production-settings','main'))).crewAssignments['person-1']).toEqual({team:'Team B',managerIds:['manager'],leadIds:[]});
    expect(await store.transaction(tx=>tx.get('production-event','existing-audit'))).toEqual({id:'existing-audit',action:'existing history',operator:'person-1'});
    expect((await call('production-catalog',{},'',login.token)).user).toMatchObject({username:'person-1',profile:result.operator.profile});
    await expect(call('production-login',{username:'Amy-1@demo.com',password:'abc@123'})).rejects.toThrow('incorrect');
    expect((await call('production-login',{username:'ALICIA.NEW@EXAMPLE.TEST',password:'abc@123'})).user.username).toBe('person-1');
    expect((await call('production-login',{username:'person-1',password:'abc@123'})).user.profile).toEqual(result.operator.profile);
    const events:any[]=await store.transaction(tx=>tx.list('production-event'));
    expect(events.find(event=>event.action==='associate profile updated'&&event.operator==='person-1')).toMatchObject({by:'owner',action:'associate profile updated',operator:'person-1',before:{profile:before.profile,revision:before.revision},after:{profile:result.operator.profile,revision:before.revision+1}});
  });

  it('rejects invalid, duplicate, unknown, and stale profile changes without mutation',async()=>{
    const listed=await call('production-associate-list',{},'owner'),first=listed.operators.find((value:any)=>value.id==='person-1'),second=listed.operators.find((value:any)=>value.id==='person-2');
    const unchanged=()=>store.transaction(tx=>tx.get('production-operator','person-2'));
    const before=await unchanged();
    for(const profile of [
      {firstName:'',lastName:'Example',email:'valid@example.test'},
      {firstName:'Valid',lastName:'',email:'valid@example.test'},
      {firstName:'Valid',lastName:'Example',email:'not-an-email'},
      {firstName:'x'.repeat(81),lastName:'Example',email:'valid@example.test'},
      {firstName:'Valid',lastName:'Example',email:first.profile.email.toUpperCase()},
    ])await expect(call('production-associate-profile-save',{id:'person-2',revision:second.revision,profile},'owner')).rejects.toThrow();
    await expect(call('production-associate-profile-save',{id:'person-31',revision:1,profile:{firstName:'Valid',lastName:'Example',email:'valid@example.test'}},'owner')).rejects.toThrow('person-1 through person-30');
    await expect(call('production-associate-profile-save',{id:'person-2',revision:second.revision-1,profile:{firstName:'Valid',lastName:'Example',email:'valid@example.test'}},'owner')).rejects.toMatchObject({status:409,message:'Associate changed. Refresh before saving.'});
    expect(await unchanged()).toEqual(before);
  });
});
