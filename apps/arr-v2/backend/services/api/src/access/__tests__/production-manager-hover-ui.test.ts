import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

function shift(index:number){
 const id=`shift-${index}`,operator=`person-${index}`;
 return {id,revision:1,operator,username:operator,workDate:'2026-10-20',shift:'day',team:'Team A',status:'in_progress',createdAt:'2026-10-20T15:00:00.000Z',updatedAt:'2026-10-20T18:00:00.000Z',data:{},formSnapshot:{definition:{fields:[]}},shares:{},readiness:null,history:[],canCorrect:false,canAddFeedback:false,canManage:true,canComment:true,canReview:true,segments:[
  {id:`${id}-1`,kind:'production',stage:'Receiving and Sorting',station:'R1',product:'Product 3',start:'2026-10-20T15:00:00.000Z',end:'2026-10-20T16:00:00.000Z',reportedMoves:null,extras:{countType:'not_counted',unit:'units'}},
  {id:`${id}-2`,kind:'production',stage:'Cleaning / Decontamination',station:'C1',product:'Product 2',start:'2026-10-20T16:00:00.000Z',end:'2026-10-20T17:00:00.000Z',reportedMoves:null,extras:{countType:'not_counted',unit:'units'}},
  {id:`${id}-3`,kind:'production',stage:'Packaging',station:'P1',product:'Product 1',start:'2026-10-20T17:00:00.000Z',end:null,reportedMoves:null,extras:{countType:'not_counted',unit:'units'}},
 ]};
}

describe('Manager staged shift queue and hover previews',()=>{
 browserIt('shows names before details, ranks product hours, and previews the current timeline only while collapsed',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'';
  const shifts=Array.from({length:40},(_,i)=>shift(i+1));
  const previewStages=['Receiving and Sorting','Cleaning / Decontamination','Packaging'];
  (shifts[0] as any).segments=Array.from({length:30},(_,i)=>{const start=Date.parse('2026-10-20T15:00:00.000Z')+i*600000;return{...shifts[0].segments[0],id:`shift-1-${i+1}`,stage:previewStages[i%3],product:`Product ${(i%3)+1}`,start:new Date(start).toISOString(),end:i===29?null:new Date(start+600000).toISOString()};});
  const operators=shifts.map((s,i)=>({id:s.operator,username:s.username,active:true,profile:{firstName:'Person',lastName:String(i+1),email:`person-${i+1}@demo.com`}}));
  const productItems=Array.from({length:10},(_,i)=>({product:`Product ${i+1}`,minutes:600-i*30}));
  const productHours=Object.fromEntries(shifts.map(s=>[s.operator,{items:productItems,hasMore:true}]));
  const fullRoutes:any[]=[];
  const requests:string[]=[];
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1280,height:900}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!;requests.push(name);
    if(name==='production-catalog')return route.fulfill({json:{user:{id:'manager',username:'manager',role:'manager',forms:['arr'],active:true},operators,products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:true}}});
    if(name==='production-product-list')return route.fulfill({json:{products:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:shifts.map(({segments,data,formSnapshot,shares,readiness,history,...s})=>s)}});
    if(name==='production-shift-list'){fullRoutes.push(route);return;}
    if(name==='production-shift-detail'){const input=JSON.parse(route.request().postData()||'{}');return route.fulfill({json:{shift:shifts.find(s=>s.id===input.id)}});}
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');
   await page.addScriptTag({content:stationQr});
   await page.addScriptTag({content:source});
   await expect.poll(()=>requests.includes('production-shift-presence'),{timeout:3000}).toBe(true);
   await expect.poll(()=>requests.includes('production-shift-list'),{timeout:3000}).toBe(true);
   expect(requests.indexOf('production-shift-presence')).toBeLessThan(requests.indexOf('production-shift-list'));
   await expect.poll(()=>page.locator('[data-shift][data-presence-only="true"]').count()).toBe(40);
   expect(await page.getByText('Person 1 (person-1)',{exact:true}).isVisible()).toBe(true);
   expect(await page.getByText('Loading current work…',{exact:true}).first().isVisible()).toBe(true);
   expect(fullRoutes).toHaveLength(1);
   await fullRoutes[0].fulfill({json:{shifts,readiness:[],canManage:true,productHours}});
   await expect.poll(()=>page.locator('[data-shift][data-presence-only="true"]').count()).toBe(0);
   expect(await page.locator('[data-shift]').count()).toBe(40);

   const first=page.locator('[data-shift="shift-1"]');
   const hoursTarget=first.locator('.associate-hours-target');
   await hoursTarget.hover();
   const hours=hoursTarget.locator('.associate-hours-preview');
   expect(await hours.isVisible()).toBe(true);
   expect(await hours.locator('[data-product-hours-row]').count()).toBe(10);
   expect(await hours.locator('[data-product-hours-row]').first().textContent()).toContain('Product 1');
   expect(await hours.locator('.more-products-indicator').textContent()).toBe('…');

   const current=first.locator('.current-hover-target');
   await current.hover();
   const timeline=current.locator('.current-timeline-preview');
   expect(await timeline.isVisible()).toBe(true);
   expect(await timeline.textContent()).toContain('Receiving and Sorting');
   expect(await timeline.textContent()).toContain('Cleaning / Decontamination');
   expect(await timeline.textContent()).toContain('Packaging');
   expect(await timeline.evaluate(node=>getComputedStyle(node).pointerEvents)).toBe('auto');
   expect(await timeline.evaluate(node=>node.scrollHeight>node.clientHeight)).toBe(true);
   const triggerBox=await current.boundingBox(),timelineBox=await timeline.boundingBox();expect(triggerBox).not.toBeNull();expect(timelineBox).not.toBeNull();
   await page.mouse.move(triggerBox!.x+triggerBox!.width/2,triggerBox!.y+triggerBox!.height/2);await page.mouse.move(timelineBox!.x+20,timelineBox!.y+20,{steps:12});expect(await timeline.isVisible()).toBe(true);
   await page.mouse.wheel(0,500);await expect.poll(()=>timeline.evaluate(node=>node.scrollTop)).toBeGreaterThan(0);
   await page.mouse.move(1200,850);
   expect(await timeline.isHidden()).toBe(true);

   await first.click();
   await expect.poll(()=>first.getAttribute('aria-expanded')).toBe('true');
   await current.hover();
   expect(await timeline.isHidden()).toBe(true);
   await page.waitForTimeout(1100);
   const presenceBefore=requests.filter(name=>name==='production-shift-presence').length;
   await page.locator('[name="hideClosed"]').uncheck();
   await expect.poll(()=>requests.filter(name=>name==='production-shift-presence').length).toBe(presenceBefore+1);
   await expect.poll(()=>fullRoutes.length).toBe(2);
   await expect.poll(()=>page.locator('[data-shift][data-presence-only="true"]').count()).toBe(40);
   await fullRoutes[1].fulfill({json:{shifts,readiness:[],canManage:true,productHours}});
   await expect.poll(()=>page.locator('[data-shift][data-presence-only="true"]').count()).toBe(0);
   await page.waitForTimeout(50);
   await first.click();
   await expect.poll(()=>first.getAttribute('aria-expanded'),{timeout:3000}).toBe('true');
   await page.waitForTimeout(1100);
   await first.click();
   await expect.poll(()=>first.getAttribute('aria-expanded'),{timeout:3000}).toBe('false');
   await page.setViewportSize({width:390,height:844});
   await hoursTarget.hover();
   expect(await hours.isHidden()).toBe(true);
   expect(await timeline.isHidden()).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth-document.documentElement.clientWidth)).toBe(0);
  }finally{await browser.close();}
 },20000);

 browserIt('keeps Manager hover aggregates and timeline previews out of reviewer rows',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',record=shift(1);const requests:string[]=[];
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});const page=await browser.newPage({viewport:{width:1280,height:900}});
  try{
   await page.route('https://arr.test/v2/production-*',route=>{const name=route.request().url().split('/').at(-1)!;requests.push(name);if(name==='production-catalog')return route.fulfill({json:{user:{id:'lead',username:'lead',role:'reviewer',forms:['arr'],active:true},operators:[{id:'person-1',username:'person-1',profile:{firstName:'Person',lastName:'1',email:'person-1@demo.com'}}],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:false}}});if(name==='production-product-list')return route.fulfill({json:{products:[]}});if(name==='production-shift-list')return route.fulfill({json:{shifts:[record],readiness:[],canManage:false}});return route.fulfill({json:{}});});
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await expect.poll(()=>page.locator('[data-shift]').count()).toBe(1);
   expect(await page.locator('.associate-hours-preview').count()).toBe(0);expect(await page.locator('.current-timeline-preview').count()).toBe(0);expect(requests).not.toContain('production-shift-presence');
  }finally{await browser.close();}
 },15000);
});
