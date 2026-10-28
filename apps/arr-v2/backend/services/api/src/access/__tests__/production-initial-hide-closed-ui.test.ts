import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');
const row=(id:string,status:'in_progress'|'closed')=>({id,revision:1,operator:id==='open'?'person-1':'person-2',username:id==='open'?'person-1':'person-2',workDate:'2026-10-27',shift:'day',team:'Team A',status,createdAt:'2026-10-27T12:00:00.000Z',updatedAt:'2026-10-27T20:00:00.000Z',data:{},formSnapshot:{definition:{fields:[]}},shares:{},readiness:null,history:[],canCorrect:true,canManage:true,canComment:true,canReview:true,segments:[{id:`${id}-segment`,kind:'production',stage:'Packaging',station:'Packaging',product:'Product 1',start:'2026-10-27T12:00:00.000Z',end:status==='closed'?'2026-10-27T20:00:00.000Z':null,reportedMoves:null}]});

describe('initial Manager Hide closed filter',()=>{
 browserIt('applies the checked default to both initial queue requests and rows',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]),body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',shifts=[row('open','in_progress'),row('closed','closed')],listInputs:any[]=[];
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable}),page=await browser.newPage({viewport:{width:1200,height:800}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'marshall-mgr',username:'marshall-mgr',role:'manager',forms:['arr'],active:true},operators:[{id:'person-1',username:'person-1',active:true},{id:'person-2',username:'person-2',active:true}],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:input.hideClosed===true?shifts.filter(value=>value.status!=='closed'):shifts}});
    if(name==='production-shift-list'){listInputs.push(input);return route.fulfill({json:{shifts:input.hideClosed===true?shifts.filter(value=>value.status!=='closed'):shifts,readiness:[],canManage:true,productHours:{}}});}
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{eligible:0,enabled:false},swing:{eligible:0,enabled:false}}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await expect.poll(()=>listInputs.length).toBe(1);expect(listInputs[0].hideClosed).toBe(true);expect(await page.locator('[name="hideClosed"]').isChecked()).toBe(true);expect(await page.locator('[data-shift="open"]').count()).toBe(1);expect(await page.locator('[data-shift="closed"]').count()).toBe(0);
   await page.locator('[name="hideClosed"]').uncheck();await expect.poll(()=>listInputs.length).toBe(2);expect(listInputs[1].hideClosed).toBe(false);await expect.poll(()=>page.locator('[data-shift="closed"]').count()).toBe(1);
   await page.locator('[name="hideClosed"]').check();await expect.poll(()=>listInputs.length).toBe(3);expect(listInputs[2].hideClosed).toBe(true);await expect.poll(()=>page.locator('[data-shift="closed"]').count()).toBe(0);
  }finally{await browser.close();}
 },15000);
});
