import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');
const stages=['Receiving and Sorting','Cleaning / Decontamination','Inspection','Functional Testing','Repair / Reassembly','Final Quality Review','Packaging'];

function shift(id:string,operator:string,stage='Cleaning / Decontamination',kind='production'){
 const now=Date.now(),start=new Date(now-4*3600000).toISOString();
 return{id,revision:1,operator,username:operator,workDate:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),shift:'day',team:'Team A',status:'in_progress',createdAt:start,updatedAt:start,data:{},formSnapshot:{definition:{fields:[]}},shares:{},readiness:null,history:[],canCorrect:true,canAddFeedback:false,canManage:true,canComment:true,canReview:true,testCPlusTwoCutoff:new Date(now+8*3600000).toISOString(),segments:[{id:`${id}-1`,kind,stage,station:stage,product:'Product 1',productId:'product-1',start,end:null,reportedMoves:null}]};
}

describe('Manager Test C +n bulk changeover',()=>{
 browserIt('places the action with filters and confirms an editable-duration preview with exclusions',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'';
  const shifts:any[]=[shift('first','person-1'),shift('second','person-2'),shift('waiting','person-3','Waiting for assignment','waiting')],previewRequests:any[]=[],confirmRequests:any[]=[];
  const operators=shifts.map((s,i)=>({id:s.operator,username:s.username,active:true,profile:{firstName:'Person',lastName:String(i+1),email:`person-${i+1}@demo.com`}}));
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});const page=await browser.newPage({viewport:{width:1280,height:900}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'manager',role:'manager',forms:['arr'],active:true},operators,products:[],forms:[],config:{teams:['Team A'],stages,crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:shifts.map(({segments,data,formSnapshot,shares,readiness,history,...s})=>s)}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts,readiness:[],canManage:true,productHours:{}}});
    if(name==='production-shift-detail')return route.fulfill({json:{shift:shifts.find(s=>s.id===input.id)}});
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{enabled:false},swing:{enabled:false}}});
    if(name==='production-shift-test-c-bulk-preview'){previewRequests.push(input);return route.fulfill({json:{token:'bulk-token',hours:input.hours,expiresAt:new Date(Date.now()+15*60000).toISOString(),advances:[{id:'first',operator:'person-1',username:'person-1',fromStage:'Cleaning / Decontamination',toStage:'Inspection',product:'Product 1'},{id:'second',operator:'person-2',username:'person-2',fromStage:'Cleaning / Decontamination',toStage:'Inspection',product:'Product 1'}],skips:[{id:'waiting',operator:'person-3',username:'person-3',reason:'The current assignment is not an active production station.'}]}});}
    if(name==='production-shift-test-c-bulk-confirm'){confirmRequests.push(input);const first=shifts[0],last={...first.segments[0],end:new Date(Date.parse(first.segments[0].start)+1.5*3600000).toISOString()},next={...last,id:'first-2',stage:'Inspection',station:'Inspection',start:last.end,end:null};shifts[0]={...first,revision:2,segments:[last,next]};return route.fulfill({json:{advanced:[shifts[0]],excluded:[{operator:'person-2',username:'person-2'}]}});}
    if(name==='production-shift-test-c-bulk-cancel')return route.fulfill({json:{cancelled:true}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   const apply=page.getByRole('button',{name:'Apply filters'}),refresh=page.getByRole('button',{name:'Refresh'}),allDates=page.getByRole('button',{name:'All dates'}),bulk=page.getByRole('button',{name:'Test C +2 All in progress'});
   await expect.poll(()=>bulk.count()).toBe(1);expect(await bulk.isVisible()).toBe(true);expect(await page.evaluate(([a,b,c,d])=>a.compareDocumentPosition(b)&Node.DOCUMENT_POSITION_FOLLOWING&&b.compareDocumentPosition(c)&Node.DOCUMENT_POSITION_FOLLOWING&&c.compareDocumentPosition(d)&Node.DOCUMENT_POSITION_FOLLOWING,[await apply.elementHandle(),await refresh.elementHandle(),await allDates.elementHandle(),await bulk.elementHandle()])).toBeTruthy();
   await page.locator('[data-shift="first"]').click();await expect.poll(()=>page.locator('#segment-action').count()).toBe(1);await page.locator('#segment-action [name="actualTime"]').fill('2026-11-11T10:30');await page.waitForTimeout(1200);let discardPrompt='';page.once('dialog',dialog=>{discardPrompt=dialog.message();return dialog.dismiss();});await bulk.click();await page.waitForTimeout(100);expect(discardPrompt).toContain('Discard unsaved shift changes');expect(await page.getByRole('dialog',{name:'Test C changeover for all in progress'}).count()).toBe(0);expect(previewRequests).toHaveLength(0);page.once('dialog',dialog=>dialog.accept());
   await bulk.click();const dialog=page.getByRole('dialog',{name:'Test C changeover for all in progress'});await expect.poll(()=>dialog.count()).toBe(1);expect(await dialog.isVisible()).toBe(true);const hours=dialog.getByLabel('Hours to add before changeover');expect(await hours.inputValue()).toBe('2');expect(await hours.getAttribute('max')).toBe('9.5');expect(await dialog.textContent()).toContain('through 9.5 hours');await hours.fill('1.5');await dialog.getByRole('button',{name:'Review changeover'}).click();
   await expect.poll(()=>previewRequests.length).toBe(1);expect(previewRequests[0]).toEqual({hours:1.5,visibleShifts:shifts.map(s=>({id:s.id,revision:1}))});await expect.poll(()=>dialog.textContent()).toContain('Will change (2)');expect(await dialog.textContent()).toContain('Will skip (1)');expect(await dialog.getByText('Cleaning / Decontamination → Inspection').count()).toBe(2);
   await dialog.getByLabel('Exclude Person 2').check();await dialog.getByRole('button',{name:'Confirm Test C +1.5 changeover'}).click();await expect.poll(()=>confirmRequests.length).toBe(1);expect(confirmRequests[0]).toEqual({token:'bulk-token',excludedOperators:['person-2']});await expect.poll(()=>dialog.count()).toBe(0);await expect.poll(()=>page.locator('[data-shift="first"]').textContent()).toContain('Inspection');await expect.poll(()=>page.locator('#notice').textContent()).toContain('1 associate changed');
  }finally{await browser.close();}
 },25000);
});
