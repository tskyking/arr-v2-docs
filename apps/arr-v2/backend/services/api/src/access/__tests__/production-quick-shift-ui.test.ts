import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Manager quick shift open and close controls',()=>{
 browserIt('previews exclusions, positions Open left of Close, and keeps excluded starts as gray rows',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',requests:{name:string,input:any}[]=[];let openConfirmed=false;
  const operators=[1,2].map(n=>({id:`person-${n}`,username:`person-${n}`,active:true,profile:{firstName:'Person',lastName:String(n)}}));
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1100,height:820}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');requests.push({name,input});
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'marshall-mgr',role:'manager',forms:['arr'],active:true},operators,products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{},quickStartExcluded:openConfirmed?[{operator:'person-2',username:'person-2',workDate:'2026-10-23',shift:'day',team:'Team A',lateStartEnabled:true,lateStartReason:'',resume:{sourceDate:'2026-10-22',kind:'waiting',stage:'Waiting for assignment',station:'',product:''}}]:[]}});
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{eligible:2,skipped:0,enabled:true,locked:false,closeWorkDate:input.workDate,closeEligible:2,closeEnabled:true,closeLocked:false,closeTimeReached:true},swing:{eligible:0,skipped:0,enabled:false,locked:false,closeWorkDate:'2026-10-22',closeEligible:2,closeEnabled:true,closeLocked:false,closeTimeReached:true}}});
    if(name==='production-shift-quick-preview')return route.fulfill({json:{token:'open-token',workDate:input.workDate,sourceDate:'2026-10-22',shift:'day',startTime:'5:00am',expiresAt:new Date(Date.now()+15*60000).toISOString(),starts:[{operator:'person-1',username:'person-1',kind:'production',stage:'Packaging',product:'Sleeves'},{operator:'person-2',username:'person-2',kind:'waiting',stage:'Waiting for assignment',product:''}],skips:[]}});
    if(name==='production-shift-quick-confirm'){openConfirmed=true;return route.fulfill({json:{created:[{operator:'person-1'}],excluded:[{operator:'person-2'}],skipped:[]}});}
    if(name==='production-shift-quick-cancel')return route.fulfill({json:{cancelled:true}});
    if(name==='production-shift-quick-close-preview')return route.fulfill({json:{token:`close-${input.shift}-token`,throughDate:input.workDate,workDate:input.shift==='swing'?'2026-10-22':input.workDate,shift:input.shift,endTime:input.shift==='swing'?'2026-10-23T09:00:00.000Z':'2026-10-23T22:30:00.000Z',endLabel:input.shift==='swing'?'2:00am':'3:30pm',expiresAt:new Date(Date.now()+15*60000).toISOString(),closes:[{operator:'person-1',username:'person-1',status:'in_progress',kind:'production',stage:'Packaging',product:'Sleeves',start:'2026-10-23T12:00:00.000Z',end:null},{operator:'person-2',username:'person-2',status:'submitted',kind:'production',stage:'Packaging',product:'Sleeves',start:'2026-10-23T12:00:00.000Z',end:'2026-10-23T21:00:00.000Z'}],skips:[]}});
    if(name==='production-shift-quick-close-confirm')return route.fulfill({json:{closed:[{operator:'person-1'}],excluded:[{operator:'person-2'}]}});
    if(name==='production-shift-quick-close-cancel')return route.fulfill({json:{cancelled:true}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await expect.poll(()=>requests.some(v=>v.name==='production-shift-quick-status'),{timeout:3000}).toBe(true);
   const controls=page.locator('#quick-shift-controls'),manualClose=page.locator('#close-selected-shifts'),openDay=page.getByRole('button',{name:'Open Test all Day Shift 5am'}),openSwing=page.getByRole('button',{name:'Open Test all Swing Shift 3pm'}),closeDay=page.getByRole('button',{name:'Close Day 3:30pm'}),closeSwing=page.getByRole('button',{name:'Close Prior Swing 2am'});
   expect(await controls.isVisible()).toBe(true);expect(await openDay.isEnabled()).toBe(true);expect(await openSwing.isDisabled()).toBe(true);expect(await closeDay.isEnabled()).toBe(true);expect(await closeSwing.isEnabled()).toBe(true);expect(await closeSwing.getAttribute('title')).toContain('2026-10-22');
   const [openBox,closeBox,manualBox]=await Promise.all([openDay.boundingBox(),closeDay.boundingBox(),manualClose.boundingBox()]);expect(openBox).not.toBeNull();expect(closeBox).not.toBeNull();expect(manualBox).not.toBeNull();expect(openBox!.x).toBeLessThan(closeBox!.x);expect(manualBox!.y).toBeGreaterThan(openBox!.y);

   await openDay.click();let dialog=page.locator('.quick-shift-preview');await expect.poll(()=>dialog.isVisible()).toBe(true);expect(await dialog.textContent()).toContain('Will start (2)');expect(await dialog.getByLabel('Exclude Person 2 (person-2)').count()).toBe(1);await dialog.getByLabel('Exclude Person 2 (person-2)').check();await dialog.getByRole('button',{name:'Are you sure? Create shift starts'}).click();
   await expect.poll(()=>requests.some(v=>v.name==='production-shift-quick-confirm'&&v.input.token==='open-token'&&v.input.excludedOperators?.[0]==='person-2')).toBe(true);await expect.poll(()=>page.locator('[data-quick-start-excluded="person-2"]').count()).toBe(1);const gray=page.locator('[data-quick-start-excluded="person-2"]');expect(await gray.textContent()).toContain('Not started with bulk shift');expect(await gray.textContent()).toContain('Get started');expect(await gray.evaluate(el=>getComputedStyle(el).backgroundColor)).not.toBe('rgba(0, 0, 0, 0)');

   await closeDay.click();dialog=page.locator('.quick-shift-preview');await expect.poll(()=>dialog.isVisible()).toBe(true);expect(await dialog.textContent()).toContain('Will close (2)');expect(await dialog.textContent()).toContain('3:30pm');await dialog.getByLabel('Exclude Person 2 (person-2)').check();await dialog.getByRole('button',{name:'Are you sure? Close included shifts'}).click();await expect.poll(()=>requests.some(v=>v.name==='production-shift-quick-close-confirm'&&v.input.token==='close-day-token'&&v.input.excludedOperators?.[0]==='person-2')).toBe(true);

   await closeSwing.click();dialog=page.locator('.quick-shift-preview');await expect.poll(()=>dialog.isVisible()).toBe(true);expect(await dialog.textContent()).toContain('Shift work date: 2026-10-22');expect(await dialog.textContent()).toContain('Through date:');await dialog.getByRole('button',{name:'Cancel'}).click();await expect.poll(()=>requests.some(v=>v.name==='production-shift-quick-close-cancel'&&v.input.token==='close-swing-token')).toBe(true);

   await page.locator('[name="hideClosed"]').uncheck();await expect.poll(()=>page.locator('#quick-shift-controls').isHidden()).toBe(true);expect(await manualClose.isVisible()).toBe(true);
   await page.locator('[name="hideClosed"]').check();await expect.poll(()=>controls.isVisible()).toBe(true);await page.getByRole('button',{name:'All dates'}).click();await expect.poll(()=>openDay.isDisabled()).toBe(true);expect(await closeDay.isDisabled()).toBe(true);expect(await manualClose.isVisible()).toBe(true);
   await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  }finally{await browser.close();}
 },20000);
});
