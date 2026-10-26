import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Production sign-in session state',()=>{
 browserIt('recomputes default shift dates after logout and next-day login',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'';
  const manager={id:'manager',username:'marshall-mgr',role:'manager',forms:['arr'],active:true};
  let authenticated=true;
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1100,height:820}});
  try{
   await page.addInitScript((initialNow:number)=>{
    const NativeDate=Date;
    class TestDate extends NativeDate{
     constructor(value?:string|number|Date){super(value===undefined?(globalThis as any).__testNow:value instanceof NativeDate?value.getTime():value);}
     static now(){return (globalThis as any).__testNow;}
    }
    Object.setPrototypeOf(TestDate,NativeDate);
    (globalThis as any).__testNow=initialNow;
    (globalThis as any).Date=TestDate;
   },Date.parse('2026-10-25T12:08:00.000Z'));
   await page.route('https://arr.test/v2/*',async route=>{
    const name=route.request().url().split('/').at(-1)!;
    if(name==='production-catalog')return route.fulfill({json:{user:authenticated?manager:null,operators:[],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:authenticated?{operationalManager:true}:{}}});
    if(name==='login'||name==='production-login'){authenticated=true;return route.fulfill({json:{ok:true}});}
    if(name==='logout'||name==='production-logout'){authenticated=false;return route.fulfill({json:{ok:true}});}
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{}}});
    if(name==='production-shift-quick-status')return route.fulfill({json:{day:{eligible:0,enabled:false,closeEligible:0,closeEnabled:false,closeTimeReached:false},swing:{eligible:0,enabled:false,closeEligible:0,closeEnabled:false,closeTimeReached:false}}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');
   await page.addScriptTag({content:stationQr});
   await page.addScriptTag({content:source});
   await expect.poll(()=>page.locator('#shift-filters [name="to"]').inputValue()).toBe('2026-10-25');

   await page.evaluate(()=>{(globalThis as any).__testNow=Date.parse('2026-10-26T12:08:00.000Z');});
   await page.getByRole('button',{name:'Sign out'}).click();
   await page.getByRole('button',{name:'Staff workspace'}).click();
   await page.locator('#login-form [name="username"]').fill('marshall-mgr');
   await page.locator('#login-form [name="password"]').fill('synthetic-test-password');
   await page.locator('#login-form').getByRole('button',{name:'Sign in'}).click();

   await expect.poll(()=>page.locator('#shift-filters [name="to"]').inputValue()).toBe('2026-10-26');
   expect(await page.locator('#shift-filters [name="from"]').inputValue()).toBe('2026-10-13');
   expect(await page.locator('#shift-filters [name="hideClosed"]').isChecked()).toBe(true);
  }finally{await browser.close();}
 },20000);
});
