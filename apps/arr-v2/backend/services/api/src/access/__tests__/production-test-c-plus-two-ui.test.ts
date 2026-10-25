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

function shift(id:string,operator:string,hours:number){const now=Date.now(),start=new Date(now-hours*3600000).toISOString();return{id,revision:1,operator,username:operator,workDate:new Intl.DateTimeFormat('en-CA',{timeZone:'America/Los_Angeles',year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date()),shift:'day',team:'Team A',status:'in_progress',createdAt:start,updatedAt:start,data:{},formSnapshot:{definition:{fields:[]}},shares:{},readiness:null,history:[],canCorrect:true,canAddFeedback:false,canManage:true,canComment:true,canReview:true,testCPlusTwoCutoff:new Date(now+3600000).toISOString(),segments:[{id:`${id}-1`,kind:'production',stage:'Cleaning / Decontamination',station:'C1',product:'Product 1',productId:'product-1',start,end:null,reportedMoves:null}]};}

describe('Manager Test C +2 queue control',()=>{
 browserIt('stays visible but disabled before two hours and advances exact two-hour slices after confirmation',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'';
  const waiting=shift('waiting','person-3',5);waiting.segments[0]={...waiting.segments[0],kind:'waiting',stage:'Waiting for assignment',station:'',product:'',productId:''};
  const training=shift('training','person-4',5);training.segments[0]={...training.segments[0],kind:'training',stage:'Training / SOP preparation'};
  const nearClose=shift('near-close','person-5',3);nearClose.testCPlusTwoCutoff=new Date(Date.parse(nearClose.segments[0].start)+60*60000).toISOString();
  const closed:any=shift('closed','person-6',5);closed.status='closed';closed.canCorrect=false;closed.segments[0].end=new Date().toISOString();
  const shifts:any[]=[shift('eligible','person-1',5),shift('immature','person-2',1),nearClose,waiting,training,closed],requests:any[]=[];
  const operators=shifts.map((s,i)=>({id:s.operator,username:s.username,active:true,profile:{firstName:'Person',lastName:String(i+1),email:`person-${i+1}@demo.com`}}));
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});const page=await browser.newPage({viewport:{width:1280,height:800}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'manager',role:'manager',forms:['arr'],active:true},operators,products:[],forms:[],config:{teams:['Team A'],stages,crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:shifts.map(({segments,data,formSnapshot,shares,readiness,history,...s})=>s)}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts,readiness:[],canManage:true,productHours:{}}});
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{enabled:false},swing:{enabled:false}}});
    if(name==='production-shift-action'){requests.push(input);const index=shifts.findIndex(s=>s.id===input.id),record=shifts[index],segments=record.segments.map((v:any)=>({...v})),last=segments.at(-1)!,boundary=new Date(Date.parse(last.start)+2*3600000).toISOString(),next=stages[(stages.indexOf(last.stage)+1)%stages.length];last.end=boundary;segments.push({...last,id:`${record.id}-${segments.length+1}`,stage:next,station:next,start:boundary,end:null,reportedMoves:null});shifts[index]={...record,revision:record.revision+1,segments};return route.fulfill({json:{shift:shifts[index]}});}
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});await expect.poll(()=>page.locator('[data-test-c-plus-two]').count()).toBe(3);expect(await page.locator('[name="hideClosed"]').isChecked()).toBe(true);expect(await page.locator('[data-shift="closed"]').count()).toBe(0);
   expect(await page.locator('[data-test-c-plus-two="waiting"], [data-test-c-plus-two="training"]').count()).toBe(0);const active=page.locator('[data-test-c-plus-two="eligible"]'),inactive=page.locator('[data-test-c-plus-two="immature"]'),nearCloseButton=page.locator('[data-test-c-plus-two="near-close"]');expect(await active.isEnabled()).toBe(true);expect(await inactive.isDisabled()).toBe(true);expect(await nearCloseButton.isDisabled()).toBe(true);expect(Number(await inactive.evaluate(el=>getComputedStyle(el).opacity))).toBeLessThan(1);expect(Number(await nearCloseButton.evaluate(el=>getComputedStyle(el).opacity))).toBeLessThan(1);expect((await active.boundingBox())!.x).toBeGreaterThan((await page.locator('[data-shift="eligible"] .current-segment-row').boundingBox())!.x);
   page.once('dialog',dialog=>dialog.accept());await active.click();await expect.poll(()=>requests.length).toBe(1);expect(requests[0]).toEqual({id:'eligible',revision:1,action:'test-c-plus-two'});await expect.poll(()=>page.locator('[data-shift="eligible"]').textContent()).toContain('Inspection');expect(await page.locator('[data-test-c-plus-two="eligible"]').isEnabled()).toBe(true);
   page.once('dialog',dialog=>dialog.accept());await page.locator('[data-test-c-plus-two="eligible"]').click();await expect.poll(()=>requests.length).toBe(2);await expect.poll(()=>page.locator('[data-shift="eligible"]').textContent()).toContain('Functional Testing');expect(await page.locator('[data-test-c-plus-two="eligible"]').isDisabled()).toBe(true);await page.locator('[name="hideClosed"]').uncheck();await expect.poll(()=>page.locator('[data-shift="closed"]').count()).toBe(1);await page.locator('[name="hideClosed"]').check();await expect.poll(()=>page.locator('[data-shift="closed"]').count()).toBe(0);await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  }finally{await browser.close();}
 },25000);
});
