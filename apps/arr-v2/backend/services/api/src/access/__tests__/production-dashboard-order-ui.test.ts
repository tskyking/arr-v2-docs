import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Insights chronological presentation',()=>{
 browserIt('shows newest FGI and recorded-shift dates first while preserving all dates',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  expect(source).toContain("const shifts=[...(out.shiftDays||[])].sort((a,b)=>a.date.localeCompare(b.date)),fgi=[...(out.fgiDays||[])].sort((a,b)=>a.date.localeCompare(b.date))");
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'';
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1200,height:900}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!;
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'manager',role:'manager',forms:['arr'],active:true},operators:[],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{}}});
    if(name==='production-dashboard')return route.fulfill({json:{shiftDays:[
     {date:'2026-10-14',shifts:2,productionMinutes:120,trainingMinutes:0,waitingMinutes:0,downtimeMinutes:0,openSegments:0,reportedCount:0,unreportedCount:0,operations:[]},
     {date:'2026-10-12',shifts:1,productionMinutes:60,trainingMinutes:0,waitingMinutes:0,downtimeMinutes:0,openSegments:0,reportedCount:0,unreportedCount:0,operations:[]},
     {date:'2026-10-16',shifts:3,productionMinutes:180,trainingMinutes:0,waitingMinutes:0,downtimeMinutes:0,openSegments:0,reportedCount:0,unreportedCount:0,operations:[]},
    ],fgiDays:[
     {date:'2026-10-13',total:1170,revision:1,provenance:'manual_demo',rows:[]},
     {date:'2026-10-16',total:1300,revision:3,provenance:'manual_demo',rows:[]},
     {date:'2026-10-14',total:1280,revision:2,provenance:'manual_demo',rows:[]},
    ]}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');
   await page.addScriptTag({content:stationQr});
   await page.addScriptTag({content:source});
   await page.getByRole('button',{name:'Insights'}).click();
   const cards=page.locator('#insight-content section.card');
   await expect.poll(()=>cards.count()).toBe(3);
   expect(await page.locator('.bar-chart .bar').evaluateAll((elements:Element[])=>elements.map((element:Element)=>element.getAttribute('title')))).toEqual([
    '2026-10-13: 1170 demo FGI units',
    '2026-10-14: 1280 demo FGI units',
    '2026-10-16: 1300 demo FGI units',
   ]);
   expect(await cards.nth(0).locator('details>summary').allTextContents()).toEqual([
    '2026-10-16 · 1,300 FGI units · revision 3',
    '2026-10-14 · 1,280 FGI units · revision 2',
    '2026-10-13 · 1,170 FGI units · revision 1',
   ]);
   expect(await cards.nth(1).locator('details>summary').allTextContents()).toEqual([
    '2026-10-16 · 3 shifts · 3.0 production hours',
    '2026-10-14 · 2 shifts · 2.0 production hours',
    '2026-10-12 · 1 shifts · 1.0 production hours',
   ]);
  }finally{await browser.close();}
 },20000);
});
