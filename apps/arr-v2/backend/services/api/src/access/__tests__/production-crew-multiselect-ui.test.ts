import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Administration crew visibility routing',()=>{
 browserIt('renders multi-select staff assignments, bulk select/clear controls, and saves arrays',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',requests:{name:string,input:any}[]=[],operators=Array.from({length:170},(_,index)=>{const n=index+1;return{id:`person-${n}`,username:`person-${n}`,active:true,profile:{firstName:n===1?'Amy':`Person ${n}`,lastName:n===1?'One':'Associate'}};}),crewAssignments=Object.fromEntries(operators.map((operator,index)=>[operator.id,{team:'Team A',defaultShift:index%2?'swing':'day',managerIds:index===0?['manager-1','manager-2']:[],leadIds:index===0?['lead-1']:[]} ]));
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1180,height:860}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');requests.push({name,input});
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'admin',username:'admin',role:'admin',forms:['arr'],active:true},operators,products:[],forms:[],config:{teams:['Team A'],crewAssignments},capabilities:{operationalManager:false}}});
    if(name==='production-settings-get')return route.fulfill({json:{settings:{revision:4,teams:['Team A'],crewAssignments},staff:[{id:'manager-1',username:'herman-mgr',role:'manager',forms:['arr']},{id:'manager-2',username:'marshall-mgr',role:'manager',forms:['arr']},{id:'lead-1',username:'lead-one',role:'reviewer',forms:['arr']},{id:'lead-2',username:'lead-two',role:'reviewer',forms:['arr']},{id:'manager-no-arr',username:'manager-no-arr',role:'manager',forms:[]},{id:'lead-no-arr',username:'lead-no-arr',role:'reviewer',forms:[]}],permissions:[]}});
    if(name==='production-product-list')return route.fulfill({json:{products:[],unmatched:[]}});
    if(name==='production-associate-list')return route.fulfill({json:{operators:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:false}});
    if(name==='production-settings-save')return route.fulfill({json:{settings:{revision:5,...input.settings}}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await page.getByRole('button',{name:'Administration'}).click();await expect.poll(()=>page.locator('#crew-form').count()).toBe(1);await page.getByText('Crews & readiness routing',{exact:true}).click();
   expect(await page.locator('[data-crew-user]').count()).toBe(170);expect(await page.locator('[name="managerIds"][value="manager-no-arr"], [name="leadIds"][value="lead-no-arr"]').count()).toBe(0);const first=page.locator('[data-crew-user="person-1"]'),managerSummary=first.locator('[data-staff-multi="managerIds"] summary');expect(await first.locator('[data-staff-multi="managerIds"] [data-selected-count]').textContent()).toBe('2 selected');expect(await managerSummary.getAttribute('aria-label')).toBe('person-1 Supervisors: 2 selected');expect(await first.locator('[name="managerIds"][value="manager-1"]').getAttribute('aria-label')).toBe('herman-mgr · Supervisors for person-1');await managerSummary.focus();await page.keyboard.press('Enter');expect(await first.locator('[data-staff-multi="managerIds"]').getAttribute('open')).not.toBeNull();
   await page.locator('[name="bulkManager"]').selectOption('manager-2');await page.locator('[data-bulk-staff="managerIds"][data-bulk-mode="select"]').click();expect(await page.locator('[name="managerIds"][value="manager-2"]:checked').count()).toBe(170);
   await page.locator('[data-bulk-staff="managerIds"][data-bulk-mode="clear"]').click();expect(await page.locator('[name="managerIds"][value="manager-2"]:checked').count()).toBe(0);
   await page.locator('[name="bulkManager"]').selectOption('manager-1');await page.locator('[data-bulk-staff="managerIds"][data-bulk-mode="select"]').click();await page.locator('[name="bulkLead"]').selectOption('lead-2');await page.locator('[data-bulk-staff="leadIds"][data-bulk-mode="select"]').click();
   await page.getByRole('button',{name:'Save crew and visibility assignments'}).click();await expect.poll(()=>requests.some(v=>v.name==='production-settings-save')).toBe(true);const saved=[...requests].reverse().find(v=>v.name==='production-settings-save')!.input.settings.crewAssignments;expect(Object.keys(saved)).toHaveLength(170);expect(saved['person-1'].managerIds).toEqual(['manager-1']);expect(saved['person-170'].managerIds).toEqual(['manager-1']);expect(saved['person-1'].leadIds).toEqual(['lead-1','lead-2']);expect(saved['person-170'].leadIds).toEqual(['lead-2']);expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth)).toBe(true);
  }finally{await browser.close();}
 },25000);
});
