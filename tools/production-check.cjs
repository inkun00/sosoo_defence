const {chromium}=require('playwright');const assert=require('node:assert/strict');const {launchOptions}=require('./browser-helpers.cjs');
(async()=>{
 const browser=await chromium.launch(launchOptions());
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800}}),errors=[];context.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});});
  const click=async(p,x,y)=>{const b=await p.locator('canvas').boundingBox();await p.mouse.click(b.x+x/1280*b.width,b.y+y/800*b.height);await p.waitForTimeout(70);};
  const cell=(p,x,y)=>click(p,40+(x+.5)*58,118+(y+.5)*58);
  const answer=async p=>{const notice=await p.locator('#accessible-notice').textContent(),values=notice.match(/\d+\.\d+/g);assert.ok(values?.length>=2,notice);const cash=n=>Math.round(Number(n)*1000);await p.keyboard.type(((cash(values[0])-cash(values[1]))/1000).toFixed(2));await click(p,805,692);};
  const page=await context.newPage();await page.goto('http://localhost:4173/?mode=adventure');await page.locator('[data-action="type:basic"]').waitFor({state:'attached'});assert.equal(await page.evaluate(()=>window.__gameTest),undefined);
  await click(page,1135,196);await cell(page,1,3);assert.equal(await page.locator('[data-action="purchase-confirm"]').count(),1);await answer(page);assert.equal(await page.locator('[data-action="toggle"]').count(),1);
  await click(page,1135,770);await page.waitForFunction(()=>/방어 [1-9]/.test(document.getElementById('accessible-state').textContent),{},{timeout:45000});
  await click(page,1135,705);assert.equal(await page.locator('[data-action="fusion:-"]').count(),1);await click(page,1058,184);await page.screenshot({path:'test-results/production-canvas.png'});
  const late=await context.newPage();await late.addInitScript(()=>localStorage.setItem('decimal-castle-v1',JSON.stringify({version:1,level:7,stars:[3,3,3,3,3,3],sfx:false,music:false})));await late.goto('http://localhost:4173/?mode=adventure');await late.locator('[data-action="type:basic"]').waitFor({state:'attached'});assert.match(await late.locator('#accessible-state').textContent(),/7단계/);
  for(const [y,x,cy] of [[196,1,3],[340,3,3],[484,1,5]]){await click(late,1135,y);await cell(late,x,cy);await answer(late);}
  await click(late,1215,633);await click(late,1135,196);await cell(late,1,7);await answer(late);await click(late,1135,770);await late.waitForTimeout(15000);await late.screenshot({path:'test-results/canvas-preview.png'});
  await click(late,1200,34);await click(late,640,277);assert.equal(await late.locator('[data-action^="stage:"]').count(),10);await late.screenshot({path:'test-results/production-canvas-map.png'});
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['production fixed-tower shop and subtraction gate','correct answer installs and actual combat kills','production subtraction forge dialog','old saved stage-7 restored with new economy','four fixed-power towers and 10-stage map','debug interface omitted'],errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
