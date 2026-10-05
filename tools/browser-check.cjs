const {chromium}=require('playwright');const assert=require('node:assert/strict');
const {launchOptions,action,cell,answer}=require('./browser-helpers.cjs');
(async()=>{
 const browser=await chromium.launch(launchOptions());
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[],images=[];
  context.on('page',p=>{p.on('pageerror',e=>errors.push(String(e)));p.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});});
  page.on('pageerror',e=>errors.push(String(e)));page.on('request',r=>{if(new URL(r.url()).pathname.endsWith('.png'))images.push(new URL(r.url()).pathname);});
  await page.goto('http://localhost:5173');await page.waitForFunction(()=>window.__gameTest?.ui.ready);
  assert.equal(new Set(images).size,17);assert.ok(images.every(p=>p.startsWith('/assets/dungeon/')));
  assert.equal(await page.evaluate(()=>['a','b'].reduce((n,s)=>n+window.__gameTest.scene.textures.get('dungeon-tower-heads-'+s+'-v1').getFrameNames().length,0)),12);
  assert.equal(await page.locator('[data-action^="unit:"]').count(),0,'no separate attack-unit selector');
  await action(page,'type:basic');await cell(page,1,3);
  const basic=await page.evaluate(()=>window.__gameTest.model.pendingPurchase);assert.equal(basic.before,8800);assert.equal(basic.cost,100);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.length),0);
  await page.screenshot({path:'test-results/purchase-basic.png'});await page.keyboard.type('99');await action(page,'purchase-confirm');
  assert.equal(await page.evaluate(()=>window.__gameTest.model.money),basic.before);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.length),0);assert.ok(await page.evaluate(()=>window.__gameTest.state.purchaseMessage));
  await page.keyboard.press('Backspace');await page.keyboard.press('Backspace');await answer(page);assert.equal(await page.evaluate(()=>window.__gameTest.model.money),8700);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers[0].typeId),'basic');
  await action(page,'type:double');await cell(page,2,3);assert.equal(await page.evaluate(()=>window.__gameTest.model.pendingPurchase),null);assert.equal(await page.evaluate(()=>window.__gameTest.model.money),8700);assert.match(await page.locator('#accessible-notice').textContent(),/한 칸/);
  await cell(page,3,3);await action(page,'purchase-cancel');assert.equal(await page.evaluate(()=>window.__gameTest.model.money),8700);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.length),1);
  await cell(page,1,3);await action(page,'toggle');assert.equal(await page.evaluate(()=>window.__gameTest.model.towers[0].enabled),false);await action(page,'toggle');
  await action(page,'start');await action(page,'pause');await action(page,'menu');await action(page,'help');await page.locator('#modal-close').click();assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'paused');
  await action(page,'pause');await page.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;for(let i=0;i<110;i++)m.step(.1);s.update(0,0);});assert.ok(await page.evaluate(()=>window.__gameTest.model.successfulHits>0));
  await page.evaluate(()=>window.__gameTest.stage(10));await action(page,'type:basic');await cell(page,1,3);await answer(page);await action(page,'start');
  await action(page,'shop-page:next');await action(page,'type:rune');await cell(page,3,3);const q=await page.evaluate(()=>window.__gameTest.model.pendingPurchase);
  assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'paused');assert.ok(q.borrowing.filter(p=>p<1000).length>=2);
  const elapsed=await page.evaluate(()=>window.__gameTest.model.elapsed);await page.waitForTimeout(200);assert.equal(await page.evaluate(()=>window.__gameTest.model.elapsed),elapsed);
  await action(page,'purchase-help');await page.screenshot({path:'test-results/purchase-advanced.png'});await answer(page);assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'playing');assert.equal(await page.evaluate(()=>window.__gameTest.model.towers.at(-1).unit),2350);
  await action(page,'shop-page:prev');await action(page,'type:needle');await cell(page,2,5);await action(page,'purchase-cancel');assert.equal(await page.evaluate(()=>window.__gameTest.model.phase),'playing');
  await page.evaluate(()=>window.__gameTest.stage(6));await page.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;m.bricks=[{id:91,value:600},{id:92,value:700},{id:93,value:1300}];s.onChange();});
  await action(page,'forge');await action(page,'fusion:-');for(const id of [93,92,91])await action(page,'brick:'+id);await action(page,'fuse');assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),1);assert.equal(await page.evaluate(()=>window.__gameTest.model.bricks.length),0);
  await action(page,'wall');await cell(page,1,4);await cell(page,1,4);await action(page,'wall-recover');await cell(page,8,2);assert.equal(await page.evaluate(()=>window.__gameTest.model.inventory.walls),1);
  await action(page,'menu');await action(page,'levels');assert.equal(await page.locator('[data-action^="stage:"]').count(),10);await action(page,'close');
  await page.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;m.phase='won';m.kills=12;s.onChange();});await page.waitForTimeout(500);await action(page,'next');assert.equal(await page.evaluate(()=>window.__gameTest.model.level.id),7);await page.reload();await page.waitForFunction(()=>window.__gameTest?.ui.ready);assert.equal(await page.evaluate(()=>window.__gameTest.model.level.id),7);assert.equal(await page.evaluate(()=>window.__gameTest.model.wallStock),1);
  await page.setViewportSize({width:1024,height:768});await action(page,'type:frost',true);await cell(page,1,3,true);await action(page,'purchase-help',true);await page.screenshot({path:'test-results/purchase-tablet.png'});await answer(page,true);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers[0].unit),150);
  await cell(page,1,3,true);await action(page,'toggle',true);assert.equal(await page.evaluate(()=>window.__gameTest.model.towers[0].enabled),false);
  for(const size of [{width:1440,height:900},{width:1366,height:768},{width:1280,height:800},{width:1024,height:768}]){await page.setViewportSize(size);await page.waitForFunction(()=>Math.abs(document.querySelector('canvas').getBoundingClientRect().width-Math.min(innerWidth,innerHeight*1.6))<2);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));}
  await action(page,'type:basic',true);await cell(page,3,3,true);const key=await page.evaluate(()=>window.__gameTest.ui.getButtonBounds('purchase-key:5')),bounds=await page.locator('canvas').boundingBox();assert.ok(key.h*bounds.width/1280>=44);await action(page,'purchase-cancel',true);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['17 generated image sources, 12 head frames','fixed tower types with no attack selector','basic simple wallet subtraction','wrong answer keeps money and placement','keyboard correct answer installs once','cancel before battle preserves money','adjacent tower rejected without charge; one-cell gap accepted','tower firing toggle and HUD separation','manual pause through help','actual combat damage','legendary borrowing question and fixed 2.35 damage','battle pause while calculating','resume after correct answer and cancellation','subtraction wall fusion and materials','wall recovery and inventory','10-stage map, result and saved stage','tablet touch answer and fixed 0.15 tower','four viewports without scrolling','44px numeric keypad'],errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
