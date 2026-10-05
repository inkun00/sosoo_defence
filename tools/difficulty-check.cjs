const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {answer}=require('./browser-helpers.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
  await page.addInitScript(()=>{if(!localStorage.getItem('decimal-castle-v1'))localStorage.setItem('decimal-castle-v1',JSON.stringify({version:1,level:6,stars:[3],sfx:false,inventory:{bricks:[600,700,1300],walls:5}}));});
  const ready=async()=>{await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.__gameTest?.ui.ready);};
  const action=async(key,touch=false)=>{const c=await page.evaluate(key=>window.__gameTest.ui.getButtonBounds(key),key);assert.ok(c?.enabled,key);const b=await page.locator('canvas').boundingBox(),x=b.x+c.x/1280*b.width,y=b.y+c.y/800*b.height;if(touch)await page.touchscreen.tap(x,y);else await page.mouse.click(x,y);await page.waitForTimeout(80);};
  const cell=async(x,y)=>{const b=await page.locator('canvas').boundingBox();await page.mouse.click(b.x+(40+(x+.5)*58)/1280*b.width,b.y+(118+(y+.5)*58)/800*b.height);};
  await ready();assert.equal(await page.evaluate(()=>window.__gameTest.model.difficulty),'standard');
  const initial=await page.evaluate(()=>({money:window.__gameTest.model.money,inventory:window.__gameTest.model.inventory}));
  await action('menu');await action('difficulty');assert.equal(await page.locator('[data-action="difficulty:challenge"]').count(),1);
  await action('difficulty:challenge');assert.equal(await page.evaluate(()=>window.__gameTest.model.difficulty),'challenge');
  assert.deepEqual(await page.evaluate(()=>({money:window.__gameTest.model.money,inventory:window.__gameTest.model.inventory})),initial);
  await page.screenshot({path:'test-results/difficulty-desktop.png'});await page.reload();await page.waitForFunction(()=>window.__gameTest?.ui.ready);
  assert.equal(await page.evaluate(()=>window.__gameTest.model.difficulty),'challenge');assert.equal(await page.evaluate(()=>window.__gameTest.model.level.id),6);
  await action('type:needle');await cell(1,3);await answer(page);await action('type:needle');await cell(3,3);await answer(page);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.length),2);
  assert.equal(await page.locator('[data-action="type:needle"]').isDisabled(),true,'precision cap disables placement choice');
  const before=await page.evaluate(()=>window.__gameTest.model.money);await cell(2,5);assert.equal(await page.evaluate(()=>window.__gameTest.model.money),before);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.length),2);
  await action('menu');await action('difficulty');assert.equal(await page.locator('[data-action="difficulty:practice"]').isDisabled(),true,'cannot change after building');await action('close');
  await action('start');await action('menu');await action('difficulty');assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'paused');assert.equal(await page.locator('[data-action="difficulty:standard"]').isDisabled(),true,'cannot change during battle');await action('close');assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'playing');
  await page.evaluate(()=>window.__gameTest.stage(10));assert.equal(await page.evaluate(()=>window.__gameTest.model.difficulty),'challenge');
  await page.setViewportSize({width:1024,height:768});await action('menu',true);await action('difficulty',true);await action('difficulty:practice',true);
  assert.equal(await page.evaluate(()=>window.__gameTest.model.difficulty),'practice');
  const c=await page.evaluate(()=>window.__gameTest.ui.getButtonBounds('difficulty:practice')),b=await page.locator('canvas').boundingBox();assert.ok(c.h*b.width/1280>=44);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
  await page.screenshot({path:'test-results/difficulty-tablet.png'});assert.deepEqual(errors,[]);
  console.log(JSON.stringify({status:'passed',checks:['legacy save defaults to standard','canvas menu and three choices','selection preserves money and inventory','saved selection after reload and stage change','precision cap and disabled shop controls','blocked purchase does not charge','no change after building or during battle, correct resume','tablet touch, readable layout, 44px buttons'],errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
