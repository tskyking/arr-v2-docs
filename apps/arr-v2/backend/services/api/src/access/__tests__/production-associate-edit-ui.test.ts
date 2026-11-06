import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {chromium} from '@playwright/test';
import {describe,expect,it} from 'vitest';

const publicPath=new URL('../public/',import.meta.url);
const browserCandidates=[process.env.CHROME_PATH,chromium.executablePath(),'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome','/usr/bin/google-chrome'].filter((value):value is string=>Boolean(value));
const browserExecutable=browserCandidates.find(existsSync);
const browserIt=browserExecutable?it:it.skip;
const file=(name:string)=>readFile(new URL(name,publicPath),'utf8');

describe('owner associate profile editing UI',()=>{
 browserIt('edits through an accessible explicit-save dialog and preserves errors and action order',async()=>{
  const [html,css,stationQr,source]=await Promise.all([file('production.html'),file('production.css'),file('station-qr.js'),file('production.js')]);
  const body=html.match(/<body>([\s\S]*)<\/body>/)?.[1]||'',requests:{name:string,input:any}[]=[];
  let operator:any={id:'person-1',username:'person-1',active:true,revision:4,profile:{firstName:'Amy',lastName:'One',email:'amy.one@demo.com'}},role:'owner'|'admin'='owner',saveAttempt=0,releaseSuccess:()=>void=()=>{};
  const browser=await chromium.launch({headless:true,executablePath:browserExecutable});
  const page=await browser.newPage({viewport:{width:1000,height:800}});
  try{
   await page.route('https://arr.test/v2/production-*',async route=>{
    const name=route.request().url().split('/').at(-1)!,input=JSON.parse(route.request().postData()||'{}');requests.push({name,input});
    if(name==='production-catalog')return route.fulfill({json:{user:{id:role,username:role,role,forms:['arr','prr'],active:true},operators:[operator],products:[],forms:[],config:{teams:['Team A'],crewAssignments:{}},capabilities:{operationalManager:false}}});
    if(name==='production-associate-list')return route.fulfill({json:{operators:[operator]}});
    if(name==='production-product-list')return route.fulfill({json:{products:[],unmatched:[]}});
    if(name==='production-settings-get')return route.fulfill({json:{settings:{revision:1,teams:['Team A'],crewAssignments:{}},staff:[],permissions:[]}});
    if(name==='production-shift-presence')return route.fulfill({json:{shifts:[]}});
    if(name==='production-shift-list')return route.fulfill({json:{shifts:[],readiness:[],canManage:false}});
    if(name==='production-associate-profile-save'){
     saveAttempt++;
     if(saveAttempt===1)return route.fulfill({status:400,json:{error:'Email already belongs to another associate.'}});
     await new Promise<void>(resolve=>{releaseSuccess=resolve;});
     operator={...operator,profile:input.profile,revision:operator.revision+1};
     return route.fulfill({json:{operator}});
    }
    return route.fulfill({json:{}});
   });
   await page.route('https://arr.test/',route=>route.fulfill({contentType:'text/html',body:`<style>${css}</style>${body}`}));
   await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});
   await page.getByRole('button',{name:'Administration'}).click();await expect.poll(()=>page.locator('#associate-admin [data-associate-row]').count()).toBe(1);await page.getByText('Associate demo-account access',{exact:true}).click();
   const row=page.locator('[data-associate-row="person-1"]');
   expect(await row.getByRole('button').allTextContents()).toEqual(['Edit','Deactivate']);
   const edit=row.getByRole('button',{name:'Edit Amy One'});await edit.focus();await page.keyboard.press('Enter');
   let dialog=page.getByRole('dialog',{name:'Edit associate profile'});expect(await dialog.isVisible()).toBe(true);
   expect(await dialog.getByLabel('First name').inputValue()).toBe('Amy');expect(await dialog.getByLabel('Last name').inputValue()).toBe('One');expect(await dialog.getByLabel('Email').inputValue()).toBe('amy.one@demo.com');
   await dialog.getByLabel('First name').fill('Draft');expect(requests.some(value=>value.name==='production-associate-profile-save')).toBe(false);
   await dialog.getByRole('button',{name:'Cancel'}).click();expect(await dialog.count()).toBe(0);expect(requests.some(value=>value.name==='production-associate-profile-save')).toBe(false);

   await edit.click();dialog=page.getByRole('dialog',{name:'Edit associate profile'});await dialog.getByLabel('First name').fill('Alicia');await dialog.getByLabel('Last name').fill('Example');await dialog.getByLabel('Email').fill('taken@example.test');await dialog.getByRole('button',{name:'Save associate profile'}).click();
   expect(await dialog.isVisible()).toBe(true);expect(await dialog.getByRole('alert').textContent()).toContain('Email already belongs');expect(await dialog.getByLabel('First name').inputValue()).toBe('Alicia');expect(await dialog.getByLabel('Email').inputValue()).toBe('taken@example.test');

   await dialog.getByLabel('Email').fill('alicia@example.test');const save=dialog.getByRole('button',{name:'Save associate profile'}),saving=save.click();await expect.poll(()=>save.isDisabled()).toBe(true);expect(await dialog.getByRole('button',{name:'Cancel'}).isDisabled()).toBe(true);
   const pending=requests.filter(value=>value.name==='production-associate-profile-save').at(-1);expect(pending?.input).toEqual({id:'person-1',revision:4,profile:{firstName:'Alicia',lastName:'Example',email:'alicia@example.test'}});
   releaseSuccess();await saving;await expect.poll(()=>page.getByRole('dialog').count()).toBe(0);expect(await row.textContent()).toContain('Alicia Example');expect(await row.textContent()).toContain('alicia@example.test');expect(await row.getByRole('button').allTextContents()).toEqual(['Edit','Deactivate']);expect(await page.locator('#notice').textContent()).toContain('Associate profile updated');

   role='admin';await page.goto('https://arr.test/');await page.addScriptTag({content:stationQr});await page.addScriptTag({content:source});await page.getByRole('button',{name:'Administration'}).click();await expect.poll(()=>page.locator('#associate-admin [data-associate-row]').count()).toBe(1);expect(await page.locator('#associate-admin [data-associate-row] button').count()).toBe(0);
  }finally{await browser.close();}
 },20000);
});
