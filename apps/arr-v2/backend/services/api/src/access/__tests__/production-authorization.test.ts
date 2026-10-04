import { PGlite } from '@electric-sql/pglite';
import type { Pool } from 'pg';
import { beforeAll, afterAll, describe, expect, it } from 'vitest';
import { WorkspaceStore } from '../workspace/store.js';
import { WorkspaceService } from '../workspace/service.js';
import { hashPassword } from '../workspace/model.js';
import {workToday,dayOffset} from '../workspace/production-model.js';

/** Independent QA: disposable database and fictional identities only. */
describe('Production alpha independent authorization QA', () => {
  let db: PGlite, store: WorkspaceStore, service: WorkspaceService;
  const sessions: Record<string, string> = {};
  const operators: Record<string, string> = {};
  const staffPassword = 'qa-local-only-strong-password';
  const call = (route: string, input: any = {}, staff = '', operator = '') =>
    (service.execute as any)(route, input, sessions[staff] || staff, undefined, operators[operator] || operator);
  beforeAll(async () => {
    db = new PGlite();
    const query = async (sql: string, args?: unknown[]) => {
      if (sql.includes('CREATE TABLE') && !args) { await db.exec(sql); return { rows: [] }; }
      return db.query(sql, args);
    };
    store = new WorkspaceStore({ query, connect: async () => ({ query, release() {} }) } as unknown as Pool);
    service = new WorkspaceService(store);
    await store.init();
    await store.transaction(async tx => {
      await service.seed(tx);
      for (const [name, role, forms] of [
        ['owner','owner',[]], ['manager','manager',['arr','prr']],
        ['manager-prr','manager',['prr']], ['reviewer','reviewer',['arr','prr']],
        ['reviewer-other','reviewer',['arr','prr']], ['admin','admin',['arr','prr']],
      ] as [string,string,string[]][]) {
        await tx.put('user',name,{ id:name,username:name,email:`${name}@example.test`,role,forms,active:true,generation:1,password:hashPassword(staffPassword) });
      }
    });
    for (const name of ['owner','manager','manager-prr','reviewer','reviewer-other','admin']) {
      sessions[name] = (await call('login',{username:name,password:staffPassword})).token;
    }
    for (const name of ['person-1','person-2']) {
      operators[name] = (await call('production-login',{username:name,password:'abc@123'})).token;
      expect(operators[name]).toBeTruthy();
    }
  }, 30000);
  afterAll(async () => { await db?.close(); });

  it('does not accept demo operator credential for staff accounts', async () => {
    await expect(call('login',{username:'owner',password:'abc@123'})).rejects.toThrow();
    await expect(call('production-login',{username:'owner',password:'abc@123'})).rejects.toThrow();
    await expect(call('production-login',{username:'person-31',password:'abc@123'})).rejects.toThrow();
  });
  it('does not accept operator token as staff session', async () => {
    await expect(call('dashboard',{},operators['person-1'])).rejects.toThrow();
    await expect(call('user-save',{username:'intruder',role:'owner'},operators['person-1'])).rejects.toThrow();
    await expect(call('production-permission',{userId:'person-1',recognition:true,updates:true},'', 'person-1')).rejects.toThrow();
  });
  it('requires A+ to assign restricted Admin permissions', async () => {
    for (const staff of ['manager','reviewer','admin']) {
      await expect(call('production-permission',{userId:'admin',recognition:true,updates:true},staff)).rejects.toThrow();
    }
  });
  const data = {workDate:'2026-01-02',shift:'day',stage:'Cleaning / Decontamination',product:'EP catheters',team:'Team A',entryType:'bod',mood:7.5,readiness:8,sopClarity:8,resources:8,recognition:'QA confidential helpful action',recognitionPeople:['person-2']};
  const entryOf = (r:any) => r.entry || r.request || r;
  const listOf = (r:any) => r.entries || r.requests || r.items || [];
  let serial=0;
  async function submit(form='arr',operator='person-1',extra:any={}) {
    if(form==='arr'){
      // Historical check-ins remain readable/shareable, but the current API may not
      // create disconnected ARR records. Seed the legacy fixture explicitly.
      const key='historical-qa-'+(++serial),stamp='2026-01-02T12:00:00Z';
      await store.transaction(tx=>tx.put('production-entry',key,{id:key,reference:'ARR-'+key,form:'arr',formIdentity:'production-demo-arr',formVersion:'0.1.0',operator,username:operator,data:{...data,...extra},status:'submitted',revision:1,submittedAt:stamp,updatedAt:stamp,dataSource:'interactive_demo',lateEntry:false,history:[{at:stamp,by:operator,action:'submitted',note:'',visibility:'worker'}],shares:{}}));
      return entryOf(await call('production-detail',{id:key},'',operator));
    }
    return entryOf(await call('production-submit',{form,formVersion:'0.1.1',idempotencyKey:'independent-qa-'+(++serial),data:{...data,proposal:'Fictional ergonomic improvement',categories:['Ergonomic'],...extra}},'',operator));
  }
  const detail=(id:string,staff='',operator='')=>call('production-detail',{id},staff,operator).then(entryOf);
  const action=async(id:string,operation:string,staff='manager',extra:any={})=>{
    const r=await detail(id,staff);
    return call('production-action',{id,revision:r.revision,action:operation,...extra},staff).then(entryOf);
  };
  it('binds submissions to operator session and exact new form identity/version', async()=>{
    const r=await submit('prr','person-1',{operator:'person-2',dataSource:'authorized_pilot',status:'implemented'});
    expect(r.operator).not.toBe('person-2'); expect(r.formVersion).toBe('0.1.1');
    expect(r.formIdentity).not.toBe('arr'); expect(r.dataSource).toBe('interactive_demo');
    const stored=await detail(r.id,'','person-1'); expect(stored.id).toBe(r.id);
    await expect(detail(r.id,'','person-2')).rejects.toThrow();
    const others=listOf(await call('production-list',{from:'2026-01-01',to:'2026-01-03'},'','person-2'));
    expect(others.some((x:any)=>x.id===r.id)).toBe(false);
    await expect(call('production-submit',{form:'prr',formVersion:'0.9.9',idempotencyKey:'invalid-version',data:{...data,proposal:'Invalid version proposal',categories:['Training']}},'','person-1')).rejects.toThrow();
  });
  it('retry is idempotent within operator identity', async()=>{
    const input={form:'prr',formVersion:'0.1.1',idempotencyKey:'same-retry-key',data:{...data,proposal:'Retry proposal',categories:['Training']}};
    const first=entryOf(await call('production-submit',input,'','person-1'));
    const retry=entryOf(await call('production-submit',input,'','person-1'));
    expect(retry.id).toBe(first.id);
    const other=entryOf(await call('production-submit',input,'','person-2'));
    expect(other.id).not.toBe(first.id);
  });
  it('denies unassigned leads and out-of-form staff even with known record ID', async()=>{
    const r=await submit();
    await expect(detail(r.id,'reviewer')).rejects.toThrow();
    await expect(detail(r.id,'manager-prr')).rejects.toThrow();
    const visible=listOf(await call('production-list',{from:'2026-01-01',to:'2026-01-03'},'reviewer'));
    expect(visible.some((x:any)=>x.id===r.id)).toBe(false);
    await action(r.id,'share','manager',{leadId:'reviewer'});
    const lead=await detail(r.id,'reviewer');
    expect(lead.id).toBe(r.id);expect(JSON.stringify(lead)).not.toContain('QA confidential helpful action');
    expect(lead.data.recognitionPeople).toBeUndefined();
    await expect(detail(r.id,'reviewer-other')).rejects.toThrow();
    await expect(action(r.id,'implemented','reviewer')).rejects.toThrow();
    await expect(action(r.id,'update','reviewer',{note:'must not publish'})).rejects.toThrow();
    await action(r.id,'retract','manager',{leadId:'reviewer'});
    await expect(detail(r.id,'reviewer')).rejects.toThrow();
  });
  it('Admin recognition requires individual A+ grant and can be revoked',async()=>{
    const r=await submit();
    expect(JSON.stringify(await detail(r.id,'admin'))).not.toContain('QA confidential helpful action');
    await call('production-permission',{userId:'admin',recognition:true,updates:false},'owner');
    expect(JSON.stringify(await detail(r.id,'admin'))).toContain('QA confidential helpful action');
    await call('production-permission',{userId:'admin',recognition:false,updates:false},'owner');
    expect(JSON.stringify(await detail(r.id,'admin'))).not.toContain('QA confidential helpful action');
  });
  it('keeps original proposal while publishing separate worker update; A+ is not automatic signer',async()=>{
    const r=await submit('prr');
    await action(r.id,'update','owner',{note:'A refined fictional proposal'});
    const own=await detail(r.id,'','person-1');
    expect(own.data.proposal).toBe('Fictional ergonomic improvement');
    expect(JSON.stringify(own)).toContain('A refined fictional proposal');
    await expect(action(r.id,'implemented','owner')).rejects.toThrow();
    await expect(action(r.id,'implemented','admin')).rejects.toThrow();
  });
  it('Manager may implement before lead comments without removing granted completed access',async()=>{
    const r=await submit('prr');
    await action(r.id,'share','manager',{leadId:'reviewer'});
    await action(r.id,'implemented','manager',{note:'Implemented in fictional demo'});
    const lead=await detail(r.id,'reviewer');expect(lead.status).toBe('implemented');
    expect(lead.shares?.reviewer?.assignedAt || JSON.stringify(lead).includes('assignedAt')).toBeTruthy();
    await action(r.id,'retract','manager',{leadId:'reviewer'});
    await expect(detail(r.id,'reviewer')).rejects.toThrow();
  });

  it('keeps lead discussion internal while allowing worker follow-up comments',async()=>{
    const r=await submit('prr');await action(r.id,'share','manager',{leadId:'reviewer'});
    let latest=await detail(r.id,'reviewer');
    await call('production-comment',{id:r.id,revision:latest.revision,note:'Internal lead context QA ONLY'},'reviewer');
    expect(JSON.stringify(await detail(r.id,'manager'))).toContain('Internal lead context QA ONLY');
    expect(JSON.stringify(await detail(r.id,'','person-1'))).not.toContain('Internal lead context QA ONLY');
    latest=await detail(r.id,'','person-1');
    await call('production-comment',{id:r.id,revision:latest.revision,note:'Worker intent clarification'},'','person-1');
    expect(JSON.stringify(await detail(r.id,'manager'))).toContain('Worker intent clarification');
  });
  it('preserves independent viewed/reviewed state and rejects stale decisions',async()=>{
    const r=await submit();await detail(r.id,'manager');
    const other=await detail(r.id,'admin');expect(other.review.reviewedAt).toBeFalsy();
    await action(r.id,'reviewed','manager');
    expect((await detail(r.id,'manager')).review.reviewedAt).toBeTruthy();
    expect((await detail(r.id,'admin')).review.reviewedAt).toBeFalsy();
    const hidden=listOf(await call('production-list',{from:'2026-01-01',to:'2026-01-03',hideReviewed:true},'manager'));
    expect(hidden.some((x:any)=>x.id===r.id)).toBe(false);
    const adminVisible=listOf(await call('production-list',{from:'2026-01-01',to:'2026-01-03',hideReviewed:true},'admin'));
    expect(adminVisible.some((x:any)=>x.id===r.id)).toBe(true);
    await expect(call('production-action',{id:r.id,revision:r.revision,action:'reviewed'},'admin')).rejects.toThrow();
  });
  it('keeps Manager crew preference as a filter rather than an access restriction',async()=>{
    const r=await submit();
    await call('production-permission',{userId:'manager',recognition:true,updates:true,teams:['Team B']},'owner');
    try {
      expect((await detail(r.id,'manager')).id).toBe(r.id);
      await expect(call('production-action',{id:r.id,revision:r.revision,action:'share',leadId:'reviewer'},'manager')).resolves.toBeDefined();
      const visible=listOf(await call('production-list',{from:'2026-01-01',to:'2026-01-03'},'manager'));
      expect(visible.some((x:any)=>x.id===r.id)).toBe(true);
    } finally {await call('production-permission',{userId:'manager',recognition:true,updates:true,teams:[]},'owner');}
  });
  it('rejects reuse of an idempotency key with changed answers',async()=>{
    const input={form:'prr',formVersion:'0.1.1',idempotencyKey:'different-payload-key',data:{...data,proposal:'Original proposal',categories:['Training']}};
    await call('production-submit',input,'','person-1');
    await expect(call('production-submit',{...input,data:{...input.data,proposal:'Changed proposal'}},'','person-1')).rejects.toThrow();
  });

  it('restricts ARR totals by form permissions, not Manager crew preferences',async()=>{
    const range={from:dayOffset(workToday(),-50),to:workToday()};
    expect((await call('production-dashboard',range,'manager')).syntheticDays.length).toBe(30);
    expect((await call('production-dashboard',range,'manager-prr')).syntheticDays).toEqual([]);
    await call('production-permission',{userId:'manager',recognition:true,updates:true,teams:['Team B']},'owner');
    try {expect((await call('production-dashboard',range,'manager')).syntheticDays.length).toBe(30);}
    finally {await call('production-permission',{userId:'manager',recognition:true,updates:true,teams:[]},'owner');}
  });

  it('links only own ARR origins and PRR follow-ups, never another operator record',async()=>{
    const origin=await submit('arr','person-1');
    const input={form:'prr',formVersion:'0.1.1',idempotencyKey:'linked-proposal',sourceEntryId:origin.id,data:{...data,proposal:'Own linked idea',categories:['Training']}};
    const proposal=entryOf(await call('production-submit',input,'','person-1'));
    expect(proposal.sourceEntryId).toBe(origin.id);
    await expect(call('production-submit',{...input,idempotencyKey:'other-origin'},'','person-2')).rejects.toThrow();
    const followup=entryOf(await call('production-submit',{...input,idempotencyKey:'own-followup',sourceEntryId:undefined,relatedId:proposal.id},'','person-1'));
    expect(followup.relatedId).toBe(proposal.id);
    await expect(call('production-submit',{...input,idempotencyKey:'other-followup',sourceEntryId:undefined,relatedId:proposal.id},'','person-2')).rejects.toThrow();
  });

  it('operator logout invalidates its token without affecting another operator session',async()=>{
    const login=await call('production-login',{username:'person-3',password:'abc@123'});
    const token=login.token;
    expect((await call('production-catalog',{},'',token)).user.username).toBe('person-3');
    await call('production-logout',{},'',token);
    await expect(call('production-list',{},'',token)).rejects.toThrow();
    expect((await call('production-catalog',{},'','person-1')).user.username).toBe('person-1');
  });

  it('stores unfinished drafts privately per operator and form',async()=>{
    await call('production-draft',{form:'arr',data:{note:'Private unfinished fictional draft'}},'','person-1');
    expect(JSON.stringify(await call('production-draft',{form:'arr'},'','person-1'))).toContain('Private unfinished fictional draft');
    expect(JSON.stringify(await call('production-draft',{form:'arr'},'','person-2'))).not.toContain('Private unfinished fictional draft');
    expect(JSON.stringify(await call('production-draft',{form:'prr'},'','person-1'))).not.toContain('Private unfinished fictional draft');
    await expect(call('production-draft',{form:'arr'},'manager')).rejects.toThrow();
  });

  it('Owner can deactivate an associate without losing records or reviving old sessions',async()=>{
    const record=await submit('arr','person-2');
    const listed=await call('production-associate-list',{},'owner');const account=listed.operators.find((x:any)=>x.id==='person-2');
    for(const staff of ['manager','reviewer','admin'])await expect(call('production-associate-save',{id:account.id,revision:account.revision,active:false},staff)).rejects.toThrow();
    await call('production-associate-save',{id:account.id,revision:account.revision,active:false},'owner');
    await expect(call('production-list',{},'','person-2')).rejects.toThrow();
    await expect(call('production-login',{username:'person-2',password:'abc@123'})).rejects.toThrow();
    expect((await detail(record.id,'manager')).operator).toBe('person-2');
    const disabled=(await call('production-associate-list',{},'owner')).operators.find((x:any)=>x.id==='person-2');
    await call('production-associate-save',{id:disabled.id,revision:disabled.revision,active:true},'owner');
    await expect(call('production-list',{},'','person-2')).rejects.toThrow();
    expect((await call('production-login',{username:'person-2',password:'abc@123'})).token).toBeTruthy();
    expect(JSON.stringify(await call('production-associate-list',{},'owner'))).not.toContain('hash');
  });

});
