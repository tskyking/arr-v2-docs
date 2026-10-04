/** Loopback-only acceptance checks for reused production administration. Creates fictional QA records only. */
import {chromium,expect} from '@playwright/test';
import {readFileSync,mkdirSync} from 'node:fs';
import AdmZip from 'adm-zip';
const credentialPath=process.env.PRODUCTION_QA_CREDENTIALS||'/tmp/production-alpha-consolidated-20261004-credentials.json';
if(!credentialPath.startsWith('/tmp/production-alpha-'))throw Error('Local fixture credentials required.');
const credentials=JSON.parse(readFileSync(credentialPath,'utf8'));
const base=process.env.PRODUCTION_QA_BASE||'http://127.0.0.1:19351/api/access-demo/';
if(!/^http:\/\/(127\.0\.0\.1|localhost):\d+\/api\/access-demo\/$/.test(base))throw Error('Local endpoint only.');
const artifacts='/tmp/production-consolidated-admin-qa';mkdirSync(artifacts,{recursive:true});
const browser=await chromium.launch({headless:true,channel:'chrome'});
const errors=[],passed=[];let phase='startup';
const username='qa-admincheck-'+Date.now(),password='Local-test-only!79',title='Fictional production ticket '+Date.now();
function step(name){phase=name;console.log('CHECK '+name);}
async function page(){const p=await browser.newPage({viewport:{width:1440,height:1000}});p.setDefaultTimeout(15000);p.on('pageerror',e=>errors.push(e.message));p.on('dialog',d=>d.accept());return p;}
async function noCounty(p){const body=await p.locator('body').innerText();if(/T[- ]?schutes|Deschutes|Parking Permit Review|Access Request Review|County/i.test(body))throw Error('County wording remains in active production administration.');}
async function login(p,name,pw){await p.waitForFunction(()=>!busy);await p.locator('#login [name=username]').fill(name);await p.locator('#login [name=password]').fill(pw);await p.getByRole('button',{name:'Sign in',exact:true}).click();await expect(p.locator('#identity-band')).toContainText(name);}
const owner=await page(),worker=await page();
try{
 step('Owner accounts surface and production labeling');
 await owner.goto(base+'workspace.html?production=1&tab=accounts#staff');await login(owner,'owner',credentials.password);
 await expect(owner.getByRole('heading',{name:'Accounts and form assignments'})).toBeVisible();await noCounty(owner);const protectedOwner=owner.locator('.account-table tr').filter({has:owner.getByRole('button',{name:/^owner ·/})});await expect(protectedOwner.getByRole('button',{name:'Suspend',exact:true})).toHaveCount(0);await expect(protectedOwner.getByRole('button',{name:'Delete',exact:true})).toHaveCount(0);passed.push(phase);
 step('Create fictional Reviewer account via Owner UI');
 await owner.getByRole('button',{name:'Add account',exact:true}).click();await owner.locator('#account-form [name=username]').fill(username);await owner.locator('#account-form [name=email]').fill(username+'@example.test');await owner.locator('#account-form [name=role]').selectOption('reviewer');await owner.locator('#account-form [name=forms][value=arr]').check();await owner.getByRole('button',{name:'Save approved account',exact:true}).click();await expect(owner.locator('#message')).toContainText('Account saved');
 await owner.getByRole('button',{name:'Accounts',exact:true}).click();await owner.getByRole('button',{name:new RegExp('^'+username+' ·')}).click();
 await owner.getByRole('button',{name:'Issue manual setup link (private delivery)',exact:true}).click();
 const setup=await owner.getByRole('textbox',{name:'Setup link for '+username,exact:true}).inputValue();const link=new URL(setup);
 if(link.searchParams.get('production')!=='1'||!link.hash.startsWith('#activate='))throw Error('Setup link lost production context.');
 passed.push(phase);
 step('Production-context password setup and one-time use');
 const localLink=base+'workspace.html?production=1'+link.hash;
 await worker.goto(localLink);await expect(worker.locator('#app')).toContainText('Account: '+username);await noCounty(worker);
 await worker.locator('#activate [name=password]').fill(password);await worker.locator('#activate [name=passwordConfirm]').fill(password);await worker.getByRole('button',{name:'Set password',exact:true}).click();await expect(worker.locator('#login [name=username]')).toHaveValue(username);await login(worker,username,password);await noCounty(worker);
 const reuse=await page();await reuse.goto(localLink);await expect(reuse.getByRole('heading',{name:'Setup link unavailable'})).toBeVisible();await noCounty(reuse);await reuse.close();passed.push(phase);
 step('Staff enhancement ticket creation');
 await worker.getByRole('button',{name:'New ticket',exact:true}).click();await worker.getByLabel('Ticket title',{exact:true}).fill(title);await worker.getByLabel('Describe the enhancement or bug',{exact:true}).fill('Fictional acceptance request: simplify the production work-note display.');await worker.getByRole('button',{name:'Submit ticket',exact:true}).click();await expect(worker.locator('#ticket-table')).toContainText(title);await noCounty(worker);passed.push(phase);
 step('Owner review and editable Word brief');
 await owner.getByRole('button',{name:'Tickets',exact:true}).click();await owner.getByRole('button',{name:'Refresh tickets',exact:true}).click();await owner.getByRole('button',{name:title,exact:true}).click();await owner.waitForFunction(()=>!busy);await owner.getByLabel('Owner-edited requirements',{exact:true}).fill('Reviewed fictional production work-note improvement.');await owner.getByLabel('Private Owner notes',{exact:true}).fill('Private QA note must not be in Word export.');await owner.locator('#ticket-inline-detail').getByLabel('Ticket status',{exact:true}).selectOption('approved');await owner.getByLabel('I reviewed the latest submitter revision; use the Owner requirements above').check();await owner.getByRole('button',{name:'Save Owner review',exact:true}).click();await expect(owner.locator('#ticket-table')).toContainText('Reviewed fictional production work-note improvement.');await owner.waitForFunction(()=>!busy);await owner.getByLabel('Select ticket '+title,{exact:true}).check();await owner.getByRole('button',{name:'Prepare implementation brief',exact:true}).click();await owner.waitForFunction(()=>!busy);await owner.getByRole('button',{name:'Generate saved brief for selected tickets',exact:true}).click();await expect(owner.getByLabel('Saved brief')).toBeVisible();
 await owner.waitForFunction(()=>!busy);const downloadPromise=owner.waitForEvent('download');await owner.getByRole('button',{name:'Download Word (.docx)',exact:true}).first().click();const download=await downloadPromise;const wordPath=artifacts+'/fictional-production-brief.docx';await download.saveAs(wordPath);const doc=new AdmZip(wordPath).readAsText('word/document.xml');if(!doc.includes('Reviewed fictional production work-note improvement.')||doc.includes('Private QA note'))throw Error('Word brief snapshot/privacy failed.');await noCounty(owner);await owner.screenshot({path:artifacts+'/production-ticket-archive.png',fullPage:true});passed.push(phase);
 step('Suspend, deny login, resume, and deactivate fictional account');
 await owner.goto(base+'workspace.html?production=1&tab=accounts#staff');await owner.reload();await expect(owner.getByRole('heading',{name:'Accounts and form assignments'})).toBeVisible();await owner.waitForFunction(()=>!busy);let row=owner.locator('.account-table tr').filter({has:owner.getByRole('button',{name:new RegExp('^'+username+' ·')})});await row.getByRole('button',{name:'Suspend',exact:true}).click();await expect(row).toContainText('suspended');
 await worker.reload();await expect(worker.locator('#login')).toBeVisible();await worker.locator('#login [name=username]').fill(username);await worker.locator('#login [name=password]').fill(password);await worker.getByRole('button',{name:'Sign in',exact:true}).click();await expect(worker.locator('#message')).toContainText('Suspended Role');await noCounty(worker);
 await row.getByRole('button',{name:'Unsuspend/Resume',exact:true}).click();await login(worker,username,password);await expect(worker.locator('#message')).toContainText('suspension has been retracted');
 await owner.getByRole('button',{name:new RegExp('^'+username+' ·')}).click();await owner.locator('#account-form [name=active]').uncheck();await owner.getByRole('button',{name:'Save approved account',exact:true}).click();await expect(owner.locator('#message')).toContainText('Account saved');await worker.reload();await expect(worker.locator('#login')).toBeVisible();await noCounty(owner);passed.push(phase);
 if(errors.length)throw Error('Browser errors: '+errors.join('; '));
 console.log(JSON.stringify({passed,pageErrors:errors,artifacts},null,2));
}catch(error){await owner.screenshot({path:artifacts+'/failure-owner.png',fullPage:true}).catch(()=>{});await worker.screenshot({path:artifacts+'/failure-worker.png',fullPage:true}).catch(()=>{});console.error('FAILED phase: '+phase+'; owner message: '+await owner.locator('#message').innerText().catch(()=>'')+'; worker message: '+await worker.locator('#message').innerText().catch(()=>''));throw error;}finally{await browser.close();}
