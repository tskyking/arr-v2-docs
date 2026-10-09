import {chromium,webkit} from '@playwright/test';
import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const assets=new URL('../services/api/src/access/public/',import.meta.url);
const server=createServer(async(req,res)=>{try{if(req.url.includes('/v2/')){res.setHeader('Content-Type','application/json');return res.end(JSON.stringify({user:null}));}const name=req.url.split('?')[0].split('/api/access-demo/')[1];if(!name||name.includes('..')){res.writeHead(404);return res.end();}res.setHeader('Content-Type',name.endsWith('.js')?'text/javascript':name.endsWith('.css')?'text/css':'text/html');res.end(await readFile(new URL(name,assets)));}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(0,'127.0.0.1',r));const base=`http://127.0.0.1:${server.address().port}/api/access-demo/production.html`;
try{for(const [name,type,viewport] of [['iphone-webkit',webkit,{width:390,height:844}],['android-chromium',chromium,{width:412,height:915}]]){
 const browser=await type.launch(name.includes('chromium')?{channel:'chrome'}:{});const page=await browser.newPage({viewport});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.addInitScript(()=>{
  window.stops=0;window.scanValue='';window.cameraMode='ready';
  const stream=()=>{const s=new MediaStream();Object.defineProperty(s,'getTracks',{value:()=>[{stop(){window.stops++}}]});return s;};
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia:async()=>{if(window.cameraMode==='denied')throw new DOMException('Denied','NotAllowedError');if(window.cameraMode==='pending')return new Promise(r=>window.grant=()=>r(stream()));return stream();}}});
  Object.defineProperty(HTMLVideoElement.prototype,'readyState',{get:()=>4});Object.defineProperty(HTMLVideoElement.prototype,'videoWidth',{get:()=>1280});Object.defineProperty(HTMLVideoElement.prototype,'videoHeight',{get:()=>720});HTMLMediaElement.prototype.play=async()=>{};
  window.BarcodeDetector=class{async detect(){if(window.failDetector)throw Error('unsupported');return window.scanValue?[{rawValue:window.scanValue}]:[];}};
 });
 await page.goto(base);await page.locator('#login-form').waitFor();
 await page.evaluate(async()=>{main.innerHTML='<div id="panel"><div id="shift-create"></div></div>';S.user={id:'person-23',username:'person-23',role:'operator',team:'Team C'};S.catalog={config:{teams:['Team A','Team B','Team C'],stages:STAGES}};X.products=ARRStationQR.list().map(a=>({name:a.product,common:true,active:true}));await startShiftForm();});
 await page.locator('[name=actualTime]').fill('2026-09-26T05:00');
 // Every printed code fills the correct fields without overwriting a deliberate time.
 await page.evaluate(()=>{const f=$('#shift-start-form');for(const a of ARRStationQR.list()){applyStationQr(f,a);if($('[name=stage]',f).value!==a.stage||$('[name=actualTime]',f).value!=='2026-09-26T05:00')throw Error('Wrong assignment/time');const c=$('[name=productChoice]',f);if((c.value==='__other'?$('[name=productOther]',f).value:c.value)!==a.product)throw Error('Wrong product');}});
 await page.locator('#access-station-qr').click();await page.locator('#station-scan-panel').waitFor({state:'visible'});
 const box=await page.locator('#station-scan-panel').boundingBox();assert.ok(box.width<=viewport.width&&box.height<=viewport.height+1);assert.equal(await page.locator('#station-scan-video').evaluate(e=>getComputedStyle(e).objectFit),'contain');
 await page.screenshot({path:`${process.env.QR_SCREENSHOT_DIR||'/tmp'}/${name}-scanner.png`});
 await page.evaluate(()=>window.scanValue='ARR-STATION:1:unknown');await page.waitForFunction(()=>$('#station-scan-status').textContent.includes('Unrecognized'));
 await page.evaluate(()=>window.scanValue='ARR-STATION:1:inspection-arthroscopic-shaver-blades');await page.locator('#station-scan-panel').waitFor({state:'hidden'});assert.equal(await page.evaluate(()=>window.stops),1);
 assert.match(await page.locator('#station-qr-result').textContent(),/Arthroscopic/);assert.equal(await page.locator('[name=actualTime]').inputValue(),'2026-09-26T05:00');
 // Cancel while permission request is pending: late stream is stopped and never applied.
 await page.evaluate(()=>{window.scanValue='';window.cameraMode='pending';});await page.locator('#access-station-qr').click();await page.locator('#cancel-station-scan').click();await page.evaluate(()=>window.grant());await page.waitForFunction(()=>!S.busy);assert.equal(await page.evaluate(()=>window.stops),2);assert.equal(await page.locator('#station-scan-panel').evaluate(e=>e.open),false);
 await page.evaluate(()=>window.cameraMode='denied');await page.locator('#access-station-qr').click();await page.waitForFunction(()=>$('#notice').textContent.includes('permission was denied'));assert.equal(await page.locator('#station-scan-panel').evaluate(e=>e.open),false);
 // Native detector throwing switches to jsQR rather than looping forever.
 await page.evaluate(()=>{window.cameraMode='ready';window.failDetector=true;window.jsQR=()=>({data:'ARR-STATION:1:packaging-compression-sleeves'});CanvasRenderingContext2D.prototype.drawImage=()=>{};});await page.locator('#access-station-qr').click();await page.waitForFunction(()=>$('#station-qr-result').textContent.includes('Packaging'));assert.equal(await page.evaluate(()=>window.stops),3);
 await page.evaluate(()=>{main.innerHTML='<div id="station-qr-validation"></div>';stationQrValidation();});assert.equal(await page.locator('.station-qr-catalog li').count(),15);await page.locator('#station-qr-check-input').fill('ARR-STATION:1:packaging-manifolds');await page.locator('#station-qr-check').click();assert.match(await page.locator('#station-qr-check-result').textContent(),/Recognized: Packaging — Manifolds/);
 assert.deepEqual(errors,[]);console.log(name+': PASS (mapping, layout, success, unknown, cancellation/late grant, denial, fallback, validation)');await browser.close();
}}finally{server.close();}
