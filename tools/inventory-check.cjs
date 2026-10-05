const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const {answer}=require('./browser-helpers.cjs');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));
  await page.addInitScript(()=>{if(!localStorage.getItem('decimal-castle-v1'))localStorage.setItem('decimal-castle-v1',JSON.stringify({version:1,level:6,stars:[],sfx:false,music:false,inventory:{bricks:[600,700,1300,420,530,950,750,560,1310,100,200,300],walls:1}}));});
  const ready=async()=>{await page.goto('http://localhost:5173/?mode=adventure');await page.waitForFunction(()=>window.__gameTest?.ui.ready);};
  const action=async key=>{const c=await page.evaluate(key=>window.__gameTest.ui.getButtonBounds(key),key);assert.ok(c?.enabled,key);const b=await page.locator('canvas').boundingBox();await page.touchscreen.tap(b.x+c.x/1280*b.width,b.y+c.y/800*b.height);await page.waitForTimeout(60);};
  const cell=async(x,y)=>{const b=await page.locator('canvas').boundingBox();await page.touchscreen.tap(b.x+(40+(x+.5)*58)/1280*b.width,b.y+(118+(y+.5)*58)/800*b.height);await page.waitForTimeout(80);};
  await ready();assert.equal(await page.evaluate(()=>window.__gameTest.model.bricks.length),12);
  await action('forge');await action('brick-page:next');assert.equal(await page.evaluate(()=>window.__gameTest.state.brickPage),1);
  for(const id of [9,8,7])await action(`brick:${id}`);await action('fusion:-');await action('fuse');
  assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),2);assert.equal(await page.evaluate(()=>window.__gameTest.model.bricks.length),9);
  assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'ready');
  await page.screenshot({path:'test-results/inventory-forge-pages.png'});
  await action('wall');await cell(1,4);assert.equal(await page.evaluate(()=>window.__gameTest.model.walls.length),1);
  await cell(1,4);await page.screenshot({path:'test-results/wall-recovery-desktop.png'});await action('wall-recover');
  assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),2);await cell(8,2);
  assert.deepEqual(await page.evaluate(()=>window.__gameTest.model.walls),[{x:8,y:2}]);
  await action('type:basic');await cell(1,3);await answer(page);await action('start');
  await page.evaluate(()=>{const {model:m,scene}=window.__gameTest;m.phase='won';m.kills=12;scene.onChange();});
  await page.waitForTimeout(500);await action('next');
  assert.equal(await page.evaluate(()=>window.__gameTest.model.level.id),7);assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),2);assert.equal(await page.evaluate(()=>window.__gameTest.model.bricks.length),9);
  assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.length),0);assert.equal(await page.evaluate(()=>window.__gameTest.model.walls.length),0);
  await page.reload();await page.waitForFunction(()=>window.__gameTest?.ui.ready);
  assert.equal(await page.evaluate(()=>window.__gameTest.model.bricks.length),9);assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),2);
  await action('forge');await action('wall');await cell(1,4);await cell(1,4);
  await page.setViewportSize({width:1024,height:768});await page.waitForTimeout(150);await action('wall-recover');await cell(8,2);await cell(8,2);
  await page.screenshot({path:'test-results/wall-recovery-tablet.png'});
  assert.equal(await page.evaluate(()=>window.__gameTest.model.goals[1].done),true);
  await page.evaluate(()=>window.__gameTest.stage(7));assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),2);assert.equal(await page.evaluate(()=>window.__gameTest.model.bricks.length),9);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['inventory restore and pagination','pre-wave subtraction and wall placement','wall selection, recovery and relocation','stage transfer of bricks and all walls','reload and retry without loss or duplication','tablet touch relocation and preparation goals'],errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
