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

describe('Daily FGI WIP hours and row filters',()=>{
 browserIt('shows hour/completeness pills and filters rows without losing their FGI',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',requests:string[]=[],summaryInputs:any[]=[],saveInputs:any[]=[];
  const products=[
   {id:'empty-product',name:'Empty Product',active:true,common:true,aliases:[]},
   {id:'data-product',name:'Data Product',active:true,common:true,aliases:[]},
   {id:'complete-product',name:'Complete Product',active:true,common:true,aliases:[]},
   {id:'new-product',name:'New Product',active:true,common:false,aliases:[]},
  ];
  const summary=(family:string,days:number)=>family==='Empty Product'&&days===1?{family,hasData:true,totalMinutes:30}:family==='Data Product'?{family,hasData:true,totalMinutes:125,allOperationsHaveData:false,missingOperations:['Receiving and Sorting','Inspection']}:family==='Complete Product'?{family,hasData:true,totalMinutes:420,allOperationsHaveData:true,missingOperations:[]}:{family,hasData:false,totalMinutes:0,allOperationsHaveData:false,missingOperations:stages};
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});const page=await browser.newPage({viewport:{width:1100,height:760}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{const name=route.request().url().split('/').at(-1)!;requests.push(name);const input=JSON.parse(route.request().postData()||'{}');
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'manager',role:'manager',forms:['arr'],active:true},operators:[],products,forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:true,productHours:{}}});
    if(name==='production-fgi-list')return route.fulfill({json:{fgi:[{workDate:input.from,revision:1,provenance:'manual_demo',rows:[{family:'Empty Product',quantity:100},{family:'Data Product',quantity:200},{family:'Complete Product',quantity:0}]}]}});
    if(name==='production-fgi-presets')return route.fulfill({json:{rows:[{family:'Empty Product',quantity:700},{family:'Data Product',quantity:700}],provenance:'preset_1400'}});
    if(name==='production-fgi-save'){saveInputs.push(input);return route.fulfill({json:{fgi:{workDate:input.workDate,revision:saveInputs.length+1,provenance:input.provenance,rows:input.rows}}});}
    if(name==='production-fgi-work-context-summary'){summaryInputs.push(input);return route.fulfill({json:{workDate:input.workDate,from:'2026-10-20',to:input.workDate,days:input.days,products:input.families.map((family:string)=>summary(family,input.days))}});}
    if(name==='production-fgi-work-context'){const value=summary(input.family,input.days),operations=value.hasData?stages.filter(stage=>!(value.missingOperations||[]).includes(stage)).map(operation=>({operation,minutes:60,hours:1,gatePasses:null,partialGatePasses:true,lagDays:0,lagSource:'default'})):[];return route.fulfill({json:{workDate:input.workDate,from:'2026-10-20',to:input.workDate,days:input.days,family:input.family,totalMinutes:value.totalMinutes,totalHours:value.totalMinutes/60,operations}});}
    if(name==='production-allocation-board')return route.fulfill({json:{from:input.from,to:input.to,products:[]}});
    if(name==='production-allocation-list')return route.fulfill({json:{allocations:[]}});
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await page.getByRole('button',{name:'FGI & allocations'}).click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(1);
   const emptyRow=page.locator('.fgi-row').filter({hasText:'Empty Product'}),dataRow=page.locator('.fgi-row').filter({hasText:'Data Product'}),completeRow=page.locator('.fgi-row').filter({hasText:'Complete Product'});
   await expect.poll(()=>emptyRow.locator('[data-fgi-work-context-status]').textContent()).toBe('No WIP data');expect(await dataRow.locator('[data-fgi-work-context-status]').textContent()).toBe('WIP Hours = 2.1');expect(await completeRow.locator('[data-fgi-work-context-status]').textContent()).toBe('WIP Hours = 7.0');
   expect(await dataRow.locator('[data-fgi-work-context-status]').getAttribute('class')).toContain('partial-data');expect(await completeRow.locator('[data-fgi-work-context-status]').getAttribute('class')).toContain('complete-data');expect(await dataRow.getByRole('button',{name:'Missing'}).isVisible()).toBe(true);expect(await completeRow.getByRole('button',{name:'Missing'}).count()).toBe(0);
   const main=dataRow.locator('.fgi-row-main'),toggle=dataRow.locator('[data-fgi-work-context]'),badges=dataRow.locator('[data-fgi-work-context-badges]'),input=dataRow.locator('[data-fgi-row]'),boxes=await Promise.all([toggle.boundingBox(),badges.boundingBox(),input.boundingBox()]);expect(await main.evaluate(node=>[...node.children].map(child=>child.tagName))).toEqual(['BUTTON','SPAN','INPUT']);expect(boxes.every(Boolean)).toBe(true);expect(boxes[0]!.x+boxes[0]!.width).toBeLessThanOrEqual(boxes[1]!.x);expect(boxes[1]!.x+boxes[1]!.width).toBeLessThanOrEqual(boxes[2]!.x);
   const missingButton=dataRow.getByRole('button',{name:'Missing'}),missingItems=dataRow.locator('[role=tooltip] li');expect(await missingItems.allTextContents()).toEqual(['Receiving and Sorting','Inspection']);await missingButton.focus();expect(await dataRow.locator('[role=tooltip]').isVisible()).toBe(true);await missingButton.hover();expect(await dataRow.locator('[role=tooltip]').isVisible()).toBe(true);
   expect(requests.filter(name=>name==='production-fgi-work-context')).toHaveLength(0);await toggle.click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context').length).toBe(1);expect(await dataRow.locator('[data-fgi-work-context-status]').getAttribute('class')).toContain('partial-data');expect(await dataRow.getByRole('button',{name:'Missing'}).isVisible()).toBe(true);await toggle.click();expect(requests.filter(name=>name==='production-fgi-work-context')).toHaveLength(1);
   await page.getByRole('button',{name:'Save demo FGI'}).click();await expect.poll(()=>saveInputs.length).toBe(1);expect(saveInputs[0].rows).toEqual([{family:'Empty Product',quantity:100},{family:'Data Product',quantity:200},{family:'Complete Product',quantity:0}]);
   expect(await page.locator('#fgi-total').textContent()).toContain('300');expect(await page.locator('#hide-wip-products summary').textContent()).toContain('None');const options=page.locator('[data-hide-wip-product]');expect(await options.count()).toBe(2);expect(await options.evaluateAll(elements=>elements.map(element=>(element as HTMLInputElement).value))).toEqual(['Data Product','Complete Product']);
   await page.locator('#hide-no-wip').check();expect(await emptyRow.isHidden()).toBe(true);expect(await page.locator('#fgi-total').textContent()).toContain('200');expect(await page.locator('#fgi-hidden-wip').textContent()).not.toContain('Empty Product');
   await dataRow.locator('[data-fgi-row]').fill('250');await page.locator('#hide-wip-products').evaluate(element=>element.setAttribute('open',''));const dataOption=page.locator('[data-hide-wip-product][value="Data Product"]');await dataOption.focus();await page.keyboard.press('Space');expect(await dataOption.isChecked()).toBe(true);expect(await page.evaluate(()=>document.activeElement?.getAttribute('value'))).toBe('Data Product');await page.keyboard.press('Tab');expect(await page.evaluate(()=>document.activeElement?.getAttribute('value'))).toBe('Complete Product');expect(await dataRow.isHidden()).toBe(true);expect(await page.locator('#fgi-total').textContent()).toContain('Preview total: 0');expect(await page.locator('#fgi-hidden-wip').textContent()).toContain('Data Product');expect(await page.locator('#fgi-hidden-wip').textContent()).toContain('FGI 250 preview');expect(await page.locator('#fgi-hidden-wip').textContent()).toContain('200 saved');
   await page.getByRole('button',{name:'Save demo FGI'}).click();await expect.poll(()=>saveInputs.length).toBe(2);expect(saveInputs[1].rows).toContainEqual({family:'Data Product',quantity:250});expect(saveInputs[1].rows).toContainEqual({family:'Complete Product',quantity:0});await expect.poll(()=>page.locator('#fgi-hidden-wip').textContent()).toContain('FGI 250 saved');
   await page.locator('#fgi-hidden-wip').getByRole('button',{name:'Show Data Product again'}).click();expect(await dataRow.isVisible()).toBe(true);expect(await page.locator('#fgi-total').textContent()).toContain('250');expect(await page.locator('#fgi-hidden-wip').textContent()).not.toContain('Data Product');
   await page.locator('[data-hide-wip-product][value="Complete Product"]').check();await page.locator('#clear-fgi').click();expect(await page.locator('#fgi-hidden-wip').textContent()).toContain('Complete Product');expect(await page.locator('#fgi-hidden-wip').textContent()).toContain('FGI Not entered preview');expect(await page.locator('#fgi-hidden-wip').textContent()).toContain('0 saved');
   await page.locator('#fgi-form [name=fgiWipDays]').fill('1');await page.locator('#load-fgi-wip').click();await expect.poll(()=>emptyRow.locator('[data-fgi-work-context-status]').textContent()).toBe('WIP Hours = 0.5');expect(await emptyRow.locator('[data-fgi-work-context-status]').getAttribute('class')).toContain('partial-data');expect(await emptyRow.locator('[role=tooltip]').textContent()).toContain('Completeness unavailable');expect(summaryInputs.at(-1)).toMatchObject({days:1});
   await page.locator('#fgi-form [name=workDate]').fill('2026-10-18');await page.locator('#load-fgi').click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(3);expect(summaryInputs.at(-1)).toMatchObject({workDate:'2026-10-18',days:1});
   await page.locator('#fgi-form details.optional-fields').evaluate(element=>element.setAttribute('open',''));await page.locator('#fgi-form [name=productChoice]').selectOption('__other');await page.locator('#fgi-form [name=productOther]').fill('New Product');await page.locator('#add-fgi-product').click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(4);
   await page.getByRole('button',{name:'Generate 1,400 mix'}).click();await expect.poll(()=>requests.filter(name=>name==='production-fgi-work-context-summary').length).toBe(5);expect(summaryInputs.at(-1).families).toEqual(['Empty Product','Data Product']);
   await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  }finally{await browser.close();}
 },30000);
});
