import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Manager cross-team Production queue filter',()=>{
 browserIt('defaults to All crews when assigned associates span multiple teams',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',listInputs:any[]=[];
  const operators=[
   {id:'person-1',username:'person-1',active:true,profile:{firstName:'Amy',lastName:'One'}},
   {id:'person-11',username:'person-11',active:true,profile:{firstName:'Lee',lastName:'Eleven'}},
  ];
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1100,height:800}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!;
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'marshall',username:'marshall-mgr',role:'manager',forms:['arr'],active:true,team:'Team A'},operators,products:[],forms:[],config:{teams:['Team A','Team B'],crewAssignments:{'person-1':{team:'Team A',defaultShift:'day',managerIds:['marshall']},'person-11':{team:'Team B',defaultShift:'day',managerIds:['marshall']}}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list'){listInputs.push(JSON.parse(route.request().postData()||'{}'));return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{}}});}
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{eligible:0,enabled:false},swing:{eligible:0,enabled:false}}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await expect.poll(()=>listInputs.length).toBeGreaterThan(0);
   expect(await page.locator('[name="team"]').inputValue()).toBe('');
   expect(listInputs.at(-1).teams).toBeUndefined();
  }finally{await browser.close();}
 },20000);
});
