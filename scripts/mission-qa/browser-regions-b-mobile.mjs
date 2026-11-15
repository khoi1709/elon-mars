import puppeteer from 'puppeteer-core';
import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
const url='http://127.0.0.1:3000/?mission=frontiers', key='ares-cradle-mission-v2';
const out='C:/Hackathon/scratch/2026-11/week-46/2026-11-14_browser-regions-b';
const files=['src/main.tsx','src/game/mission/MissionGame.tsx','src/game/mission/activities/ActivityPanel.tsx','src/game/mission/activities/rules.ts','src/game/mission/state.ts','src/game/mission/store.ts','src/game/mission/content.ts','src/game/mission/contract.ts','src/game/mission/world/MissionWorld.tsx','src/game/mission/world/FieldCamp.tsx','src/game/mission/presentation/cinematics/MissionCinematic.tsx','src/game/mission/presentation/cinematics/timeline.ts'];
const hash=async p=>createHash('sha256').update(await readFile(p)).digest('hex');
const fingerprint=async()=>Object.fromEntries(await Promise.all(files.map(async p=>[p,await hash(p)])));
const report={url,viewport:{width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true},profile:'fresh temporary Edge profile, default Puppeteer context',screenshots:[],errors:[],warnings:[],checks:[]};
const wait=ms=>new Promise(r=>setTimeout(r,ms));
await mkdir(out,{recursive:true});
const browser=await puppeteer.launch({executablePath:'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',headless:true});
let page;
const save=()=>page.evaluate(k=>{const raw=localStorage.getItem(k);return raw===null?null:JSON.parse(raw)},key);
const shot=async name=>{const path=`${out}/${name}`;await page.screenshot({path,type:'png'});report.screenshots.push(path);await writeFile(`${out}/mobile-result.json`,JSON.stringify(report,null,2));};
async function click(label){for(const b of await page.$$('button')){const text=await b.evaluate(e=>(e.getAttribute('aria-label')||e.getAttribute('title')||e.innerText||e.textContent||'').trim().replace(/\s+/g,' '));if(text.includes(label)){await b.click();await wait(250);return text}}throw new Error(`Button not found: ${label}`)}
try{
 report.sourceSha256Before=await fingerprint();
 page=await browser.newPage();
 page.on('pageerror',e=>report.errors.push(`pageerror: ${e.message}`));
 page.on('console',m=>{if(m.type()==='error')report.errors.push(`console.error: ${m.text()}`);else if(m.type()==='warning')report.warnings.push(m.text())});
 page.on('requestfailed',r=>report.errors.push(`requestfailed: ${r.url()} ${r.failure()?.errorText}`));
 await page.setViewport({width:390,height:844,deviceScaleFactor:1,isMobile:true,hasTouch:true});
 await page.goto(url,{waitUntil:'domcontentloaded',timeout:30000});await page.waitForSelector('.mission-start-screen',{timeout:20000});await shot('mobile-01-title.png');
 let found=false;for(const b of await page.$$('.start-region')){if((await b.evaluate(e=>e.innerText||e.textContent||'')).includes('Old Lake Shore')){await b.tap();found=true;break}}if(!found)throw new Error('Volcano start option missing on mobile.');
 await click('Begin field mission');await page.waitForSelector('.mission-cinematic__skip',{timeout:15000});await click('Skip scene');await page.waitForSelector('.mission-stage canvas',{timeout:25000});await wait(1000);await shot('mobile-02-world.png');
 const state0=await save();const viewport=await page.evaluate(()=>({innerWidth,innerHeight,clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,scrollHeight:document.documentElement.scrollHeight,controls:[...document.querySelectorAll('.touch-controls button')].map(b=>{const r=b.getBoundingClientRect();return{label:b.getAttribute('aria-label')||b.innerText,x:r.x,y:r.y,width:r.width,height:r.height,visible:r.width>0&&r.height>0}})}));
 report.checks.push({type:'mobile-world-layout',startRegion:state0?.startRegion,started:state0?.started,leoBefore:state0?.leo,viewport,documentHorizontalOverflow:viewport.scrollWidth>viewport.clientWidth,allTouchButtonsVisible:viewport.controls.every(c=>c.visible),allTouchButtonsAtLeast48px:viewport.controls.every(c=>c.width>=48&&c.height>=48)});
 const down=await page.$('button[aria-label="Move up"]');if(!down)throw new Error('Touch Move up control absent.');
 const before=(await save()).leo;await down.tap();await wait(700);const after=(await save()).leo;report.checks.push({type:'real-touch-movement-tap',before:{x:before.x,z:before.z},after:{x:after.x,z:after.z},poseChanged:before.x!==after.x||before.z!==after.z});
 await click('Open map');await page.waitForSelector('[role="dialog"]',{timeout:5000});await shot('mobile-03-map.png');await click('Close panel');
 await click('Pause mission');await page.waitForSelector('[role="dialog"]',{timeout:5000});
 const reduced=await page.$('input[type="checkbox"]');if(reduced){await reduced.click();await wait(300);const current=await save();report.checks.push({type:'pause-reduced-motion-control',visibleText:await page.$eval('input[type="checkbox"]',e=>e.parentElement?.innerText||''),savedValue:current?.settings?.reducedMotion});}
 await shot('mobile-04-pause.png');await click('Return to field');
 const afterUI=await page.evaluate(()=>({clientWidth:document.documentElement.clientWidth,scrollWidth:document.documentElement.scrollWidth,viewportWidth:innerWidth,stage:document.querySelector('.mission-stage')?.getBoundingClientRect().toJSON()}));report.checks.push({type:'return-to-world',layout:afterUI});
 report.sourceSha256After=await fingerprint();report.sourceStableDuringRun=JSON.stringify(report.sourceSha256Before)===JSON.stringify(report.sourceSha256After);
}catch(e){report.error=String(e?.stack??e);report.lastSave=page?await save().catch(()=>null):null;report.sourceSha256After=await fingerprint().catch(x=>({error:String(x)}));report.sourceStableDuringRun=JSON.stringify(report.sourceSha256Before)===JSON.stringify(report.sourceSha256After);if(page)await shot('mobile-99-failure.png').catch(()=>{});}
finally{await writeFile(`${out}/mobile-result.json`,JSON.stringify(report,null,2)).catch(()=>{});await browser.close();}
console.log(JSON.stringify(report,null,2));
if(report.error||!report.sourceStableDuringRun)process.exitCode=1;
