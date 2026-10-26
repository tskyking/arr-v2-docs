import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');
const placeholder={operator:'person-1',username:'person-1',workDate:'2026-10-26',shift:'day',team:'Team A',lateStartEnabled:true,lateStartReason:'',resume:{sourceDate:'2026-10-24',kind:'production',stage:'Packaging',station:'P1',product:'Sleeves'}};
const started={id:'late-shift',revision:1,operator:'person-1',username:'person-1',workDate:'2026-10-26',shift:'day',team:'Team A',status:'in_progress',segments:[{id:'segment',kind:'production',start:'2026-10-26T13:20:00.000Z',end:null,stage:'Packaging',station:'P1',product:'Sleeves',reportedMoves:null}],data:{},shares:{},readiness:null,history:[],canCorrect:true,canManage:true};

describe('Not started late shift controls',()=>{
 browserIt('shows shared Manager and associate rows and confirms a current-time start from the last matching shift',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]),body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'';
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  try{
   for(const role of ['manager','operator'] as const){
    let confirmed=false;const requests:{name:string,input:any}[]=[];const page=await browser.newPage({viewport:{width:1100,height:820}});
    await page.route('https://arr.test/v2/production-*',async route=>{const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');requests.push({name,input});
     if(name==='production-catalog')return route.fulfill({json:{user:role==='manager'?{id:'manager-two',username:'tim-mgr',role:'manager',forms:['arr'],active:true}:{id:'person-1',username:'person-1',role:'operator',forms:[],active:true},operators:[{id:'person-1',username:'person-1',active:true,profile:{firstName:'Amy',lastName:'Demo'}}],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{'person-1':{team:'Team A',managerIds:['manager','manager-two']}}},capabilities:{operationalManager:role==='manager'}}});
     if(name==='production-product-list')return route.fulfill({json:{products:[]}});
     if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
     if(name==='production-shift-list')return route.fulfill({json:{shifts:confirmed?[started]:[],readiness:[],canManage:role==='manager',productHours:{},quickStartExcluded:confirmed?[]:[placeholder]}});
     if(name==='production-shift-quick-status')return route.fulfill({json:{day:{eligible:0,enabled:false,closeEligible:0,closeEnabled:false},swing:{eligible:0,enabled:false,closeEligible:0,closeEnabled:false}}});
     if(name==='production-shift-late-start-preview')return route.fulfill({json:{token:`late-${role}`,operator:'person-1',username:'person-1',team:'Team A',workDate:'2026-10-26',shift:'day',startTime:'2026-10-26T13:20:00.000Z',sourceDate:'2026-10-24',expiresAt:new Date(Date.now()+15*60000).toISOString(),assignment:{kind:'production',stage:'Packaging',station:'P1',product:'Sleeves'}}});
     if(name==='production-shift-late-start-confirm'){confirmed=true;return route.fulfill({json:{shift:started}});}
     if(name==='production-shift-late-start-cancel')return route.fulfill({json:{cancelled:true}});
     return route.fulfill({json:{}});
    });
    await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
    if(role==='operator')await page.locator('#view-shift-history').click();
    const gray=page.locator('[data-quick-start-excluded="person-1"]');await expect.poll(()=>gray.count()).toBe(1);expect(await gray.textContent()).toContain('Not started');expect(await gray.textContent()).toContain('Get started');const notStarted=gray.locator('.pill').first(),getStarted=gray.getByRole('button',{name:'Get started'}),notBox=await notStarted.boundingBox(),getBox=await getStarted.boundingBox();expect(notBox).not.toBeNull();expect(getBox).not.toBeNull();expect(getBox!.y).toBeGreaterThan(notBox!.y);expect(await getStarted.isEnabled()).toBe(true);
    if(role==='operator'){const rowBox=await gray.boundingBox(),listBox=await page.locator('#shift-list').boundingBox();expect(rowBox).not.toBeNull();expect(listBox).not.toBeNull();expect(rowBox!.y-listBox!.y).toBeLessThan(8);}
    await getStarted.click();let dialog=page.locator('.late-start-preview');await expect.poll(()=>dialog.isVisible()).toBe(true);let text=await dialog.textContent();expect(text).toContain('Amy Demo (person-1)');expect(text).toContain('2026-10-26');expect(text).toContain('6:20 AM');expect(text).toContain('closed 2026-10-24 day shift');expect(text).toContain('Packaging');expect(text).toContain('P1');expect(text).toContain('Sleeves');if(role==='manager'){await dialog.getByRole('button',{name:'Cancel'}).click();await expect.poll(()=>requests.some(value=>value.name==='production-shift-late-start-cancel'&&value.input.token==='late-manager')).toBe(true);await getStarted.click();dialog=page.locator('.late-start-preview');await expect.poll(()=>dialog.isVisible()).toBe(true);text=await dialog.textContent();expect(text).toContain('Start now:');}await dialog.getByRole('button',{name:'Are you sure? Get started'}).click();
    await expect.poll(()=>requests.some(value=>value.name==='production-shift-late-start-confirm'&&value.input.token===`late-${role}`)).toBe(true);await expect.poll(()=>gray.count()).toBe(0);await expect.poll(()=>page.locator('[data-shift="late-shift"]').count()).toBe(1);await page.close();
   }
  }finally{await browser.close();}
 },30000);
});
