import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Manager quick shift start controls',()=>{
 browserIt('stacks compact controls, previews before confirm, and follows Hide closed',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',requests:{name:string,input:any}[]=[];
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1100,height:820}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');requests.push({name,input});
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'marshall-mgr',role:'manager',forms:['arr'],active:true},operators:[{id:'person-1',username:'person-1',active:true,profile:{firstName:'Person',lastName:'1'}}],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{}}});
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{eligible:1,skipped:0,enabled:true,locked:false},swing:{eligible:0,skipped:0,enabled:false,locked:false}}});
    if(name==='production-shift-quick-preview')return route.fulfill({json:{token:'preview-token',workDate:input.workDate,sourceDate:'2026-10-22',shift:'day',startTime:'5:00am',expiresAt:new Date(Date.now()+15*60000).toISOString(),starts:[{username:'person-1',kind:'waiting',stage:'Waiting for assignment',product:''}],skips:[]}});
    if(name==='production-shift-quick-cancel')return route.fulfill({json:{cancelled:true}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await expect.poll(()=>requests.some(v=>v.name==='production-shift-quick-status'),{timeout:3000}).toBe(true);
   const controls=page.locator('#quick-shift-controls'),close=page.locator('#close-selected-shifts'),day=page.getByRole('button',{name:'Open Test all Day Shift 5am'}),swing=page.getByRole('button',{name:'Open Test all Swing Shift 3pm'});
   expect(await controls.isVisible()).toBe(true);expect(await day.isEnabled()).toBe(true);expect(await swing.isDisabled()).toBe(true);
   const boxes=await Promise.all([close,day,swing].map(v=>v.boundingBox()));expect(boxes.every(Boolean)).toBe(true);expect(boxes[0]!.height).toBeLessThanOrEqual(34);expect(boxes[1]!.y).toBeGreaterThan(boxes[0]!.y);expect(boxes[2]!.y).toBeGreaterThan(boxes[1]!.y);
   await day.click();const dialog=page.locator('.quick-shift-preview');await expect.poll(()=>dialog.isVisible()).toBe(true);expect(await dialog.textContent()).toContain('Will start (1)');expect(await dialog.textContent()).toContain('Waiting for assignment');expect(await page.getByRole('button',{name:'Are you sure? Create shift starts'}).isVisible()).toBe(true);
   await page.getByRole('button',{name:'Cancel'}).click();await expect.poll(()=>dialog.count()).toBe(0);await expect.poll(()=>requests.some(v=>v.name==='production-shift-quick-cancel'&&v.input.token==='preview-token')).toBe(true);
   await page.locator('[name="hideClosed"]').uncheck();await expect.poll(()=>page.locator('#quick-shift-controls').isHidden()).toBe(true);expect(await page.locator('#close-selected-shifts').isVisible()).toBe(true);
   await page.locator('[name="hideClosed"]').check();await expect.poll(()=>page.locator('#quick-shift-controls').isVisible()).toBe(true);await page.getByRole('button',{name:'All dates'}).click();await expect.poll(()=>page.getByRole('button',{name:'Open Test all Day Shift 5am'}).isDisabled()).toBe(true);expect(await page.locator('#close-selected-shifts').isVisible()).toBe(true);
  }finally{await browser.close();}
 },15000);
});
