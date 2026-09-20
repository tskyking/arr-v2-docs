// Fictional, loopback-only regression: two accounts in the same browser session.
import { chromium, expect } from '@playwright/test';
const base = process.env.TSCHUTES_BASE || 'http://127.0.0.1:19339/api/access-demo/';
if (!['localhost', '127.0.0.1'].includes(new URL(base).hostname)) throw Error('Loopback only');
if (!process.env.TSCHUTES_TEST_OWNER_PASSWORD) throw Error('Set local test owner password');
const browser = await chromium.launch({ headless: true, ...(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH}: {}) });
try {
 const owner = await browser.newPage();
 owner.setDefaultTimeout(15000);
 const worker = await browser.newPage();
 worker.setDefaultTimeout(15000);
 const errors = [];
 for (const page of [owner, worker]) page.on('pageerror', e => errors.push(e.message));
 const api = (page, route, input={}) => page.evaluate(async ({route,input}) => {
  const r = await fetch('v2/'+route, {method:'POST',headers:{'Content-Type':'application/json','X-ARR-Request':'1'},body:JSON.stringify(input)});
  const result = await r.json(); if (!r.ok) throw Error(result.error); return result;
 }, {route,input});
 await owner.goto(base+'#staff');
 await owner.locator('#login [name=username]').fill('owner');
 await owner.locator('#login [name=password]').fill(process.env.TSCHUTES_TEST_OWNER_PASSWORD);
 await owner.getByRole('button',{name:'Sign in',exact:true}).click();
 await owner.getByRole('heading',{name:'A+ owner workspace'}).waitFor();
 const suffix=Date.now();
 const names=['revr1_'+suffix,'revr2_'+suffix];
 const links=[];
 for (const username of names) {
  await api(owner,'user-save',{username,email:username+'@example.com',role:'reviewer',forms:['arr'],active:true});
 }
 await owner.reload();
 await owner.getByRole('button',{name:'Accounts',exact:true}).click();
 owner.on('dialog',dialog=>dialog.accept());
 for (const username of names) {
  await owner.getByRole('button',{name:new RegExp('^'+username+' ·')}).click();
  await owner.getByRole('button',{name:'Issue manual setup link (private delivery)',exact:true}).click();
  await expect(owner.locator('#manual-setup-link')).toContainText('link for '+username);
  links.push(await owner.getByRole('textbox',{name:'Setup link for '+username,exact:true}).inputValue());
 }
 // The URL base is deliberately replaced to keep all operations local.
 const password='local-only-account-password';
 for (let i=0;i<names.length;i++) {
  await worker.goto(base+'#activate='+links[i].split('#activate=')[1]);
  await expect(worker.locator('#app')).toContainText('Account: '+names[i]);
  await worker.locator('#activate [name=password]').fill(password);
  await worker.getByRole('button',{name:'Set password',exact:true}).click();
  await expect(worker.locator('#login [name=username]')).toHaveValue(names[i]);
  const cookies=await worker.context().cookies();
  if(cookies.some(c=>c.name==='tschutes_workspace')) throw Error('Old session cookie retained');
  await worker.locator('#login [name=password]').fill(password);
  await worker.getByRole('button',{name:'Sign in',exact:true}).click();
  await expect(worker.locator('#login')).toHaveCount(0);
  if ((await api(worker,'catalog')).user.username!==names[i]) throw Error('Wrong account session');
 }
 await worker.goto(base+'#activate='+links[1].split('#activate=')[1]);
 await expect(worker.getByRole('heading',{name:'Setup link unavailable'})).toBeVisible();
 await expect(worker.locator('#activate')).toHaveCount(0);
 expect(errors).toEqual([]);
 console.log('PASS: labeled A+ links; verified setup identities; revr1 -> revr2 in same browser; cleared cookie; correct prefilled login; used-link rejection; no browser errors.');
} finally { await browser.close(); }
