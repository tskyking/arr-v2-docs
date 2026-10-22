import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('Daily FGI WIP availability summaries',()=>{
 browserIt('shows WIP availability between each product name and FGI input before expansion',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',requests:string[]=[],summaryInputs:any[]=[];
  const products=[
   {id:'empty-product',name:'Empty Product',active:true,common:true,aliases:[]},
   {id:'data-product',name:'Data Product',active:true,common:true,aliases:[]},
   {id:'new-product',name:'New Product',active:true,common:false,aliases:[]},
  ];
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});const page=await browser.newPage({viewport:{width:1100,height:700}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{const name=route.request().url().split('/').at(-1)!;requests.push(name);const input=JSON.parse(route.request().postData()||'{}');
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'manager',role:'manager',forms:['arr'],active:true},operators:[],products,forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{}}});
    if(name==='production-fgi-list')return route.fulfill({json:{fgi:[]}});
    if(name==='production-fgi-presets')return route.fulfill({json:{rows:[{family:'Empty Product',quantity:700},{family:'Data Product',quantity:700}],provenance:'preset_1400'}});
    if(name==='production-fgi-work-context-summary'){summaryInputs.push(input);return route.fulfill({json:{workDate:input.workDate,from:'2026-10-20',to:input.workDate,days:input.days,products:input.families.map((family:string)=>({family,hasData:family==='Data Product'||family==='Empty Product'&&input.days===1,totalMinutes:family==='Data Product'?120:family==='Empty Product'&&input.days===1?30:0}))}});}
    if(name==='production-fgi-work-context')return route.fulfill({json:input.family==='Empty Product'?{workDate:input.workDate,from:'2026-10-20',to:input.workDate,days:input.days,family:input.family,totalMinutes:0,totalHours:0,operations:[]}:{workDate:input.workDate,from:'2026-10-20',to:input.workDate,days:input.days,family:input.family,totalMinutes:120,totalHours:2,operations:[{operation:'Packaging',minutes:120,hours:2,gatePasses:null,partialGatePasses:true,lagDays:0,lagSource:'default'}]}});
    if(name==='production-allocation-board')return route.fulfill({json:{from:input.from,to:input.to,products:[]}});
    if(name==='production-allocation-list')return route.fulfill({json:{allocations:[]}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await page.getByRole('button',{name:'FGI & allocations'}).click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(1);
   const emptyRow=page.locator('.fgi-row').filter({hasText:'Empty Product'}),dataRow=page.locator('.fgi-row').filter({hasText:'Data Product'});const emptyStatus=emptyRow.locator('[data-fgi-work-context-status]'),dataStatus=dataRow.locator('[data-fgi-work-context-status]');
   expect(await emptyStatus.textContent()).toBe('No WIP data');expect(await dataStatus.textContent()).toBe('WIP data available');expect(await emptyStatus.isVisible()).toBe(true);expect(await dataStatus.isVisible()).toBe(true);
   expect(await page.locator('[data-fgi-work-context][aria-expanded="true"]').count()).toBe(0);expect(requests.filter(name=>name==='production-fgi-work-context')).toHaveLength(0);
   const nameBox=await emptyRow.locator('[data-fgi-work-context]').boundingBox(),statusBox=await emptyStatus.boundingBox(),inputBox=await emptyRow.locator('[data-fgi-row]').boundingBox();expect(nameBox).not.toBeNull();expect(statusBox).not.toBeNull();expect(inputBox).not.toBeNull();expect(statusBox!.x).toBeGreaterThanOrEqual(nameBox!.x+nameBox!.width-1);expect(statusBox!.x+statusBox!.width).toBeLessThanOrEqual(inputBox!.x+1);
   await emptyRow.locator('[data-fgi-work-context]').click();await expect.poll(()=>emptyRow.locator('[data-fgi-work-context]').getAttribute('aria-expanded')).toBe('true');expect(await emptyStatus.textContent()).toBe('No WIP data');expect(await emptyRow.getByText(/No completed production hours were recorded/).isVisible()).toBe(true);
   await emptyRow.locator('[data-fgi-work-context]').click();await page.locator('#fgi-form [name=fgiWipDays]').fill('1');await page.locator('#load-fgi-wip').click();await expect.poll(()=>emptyStatus.textContent()).toBe('WIP data available');expect(requests.filter(name=>name==='production-fgi-work-context-summary')).toHaveLength(2);expect(summaryInputs.at(-1)).toMatchObject({days:1});
   await page.locator('#fgi-form [name=workDate]').fill('2026-10-21');await page.locator('#load-fgi').click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(3);expect(summaryInputs.at(-1)).toMatchObject({workDate:'2026-10-21',days:1});
   await page.locator('#fgi-form details.optional-fields').evaluate(element=>element.setAttribute('open',''));await page.locator('#fgi-form [name=productChoice]').selectOption('__other');await page.locator('#fgi-form [name=productOther]').fill('New Product');await page.locator('#add-fgi-product').click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(4);expect(summaryInputs.at(-1).families).toContain('New Product');const newStatus=page.locator('.fgi-row').filter({hasText:'New Product'}).locator('[data-fgi-work-context-status]');await expect.poll(()=>newStatus.textContent()).toBe('No WIP data');expect(await newStatus.isVisible()).toBe(true);
   await page.getByRole('button',{name:'Generate 1,400 mix'}).click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(5);expect(summaryInputs.at(-1).families).toEqual(['Empty Product','Data Product']);await expect.poll(()=>page.locator('.fgi-row').filter({hasText:'Data Product'}).locator('[data-fgi-work-context-status]').textContent()).toBe('WIP data available');
   await page.setViewportSize({width:390,height:844});expect(await emptyStatus.isVisible()).toBe(true);expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  }finally{await browser.close();}
 },20000);
});
