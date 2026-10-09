const {chromium}=require('playwright');const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  const context=await browser.newContext({viewport:{width:1280,height:800},hasTouch:true}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(String(e)));await page.goto('http://localhost:5173/?mode=adventure');await page.waitForFunction(()=>window.__gameTest?.ui.ready);
  await page.evaluate(()=>{window.__gameTest.stage(6);const {model:m,scene:s}=window.__gameTest;['siege','frost','lightning','sniper'].forEach((id,i)=>{m.requestPurchase([{x:1,y:3},{x:3,y:3},{x:1,y:5},{x:1,y:7}][i],id);const q=m.pendingPurchase;m.answerPurchase(((q.before-q.cost)/1000).toFixed(2));});s.drawTerrain();m.start();m.spawn();const e=m.enemies[0];e.hp=e.max=12340;e.kind='golem';e.x=190;e.y=340;e.stun=100;m.towers.forEach(t=>{t.enabled=false;t.cooldown=100;});s.update(0,0);});
  assert.equal(await page.evaluate(()=>window.__gameTest.scene.textures.get('dungeon-fx-impact-v1').frameTotal),25);
  assert.equal(await page.evaluate(()=>window.__gameTest.scene.textures.get('dungeon-fx-utility-v1').frameTotal),25);
  const rows=[];
  for(const effect of ['basic','slow','stun','range']){
   const before=await page.evaluate(()=>window.__gameTest.model.enemies[0].hp);
   await page.evaluate(effect=>{const {model:m,scene:s}=window.__gameTest;m.phase='playing';const t=m.towers.find(t=>t.effect===effect);t.enabled=true;t.cooldown=0;s.update(0,16);t.enabled=false;},effect);
   await page.waitForFunction(effect=>[...window.__gameTest.scene.battleEffects].some(o=>o.anims?.currentAnim?.key==='impact-'+effect&&o.anims.currentFrame.index>=3),effect);
   await page.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;m.phase='paused';s.update(0,0);});
   const state=await page.evaluate(effect=>{const {model:m,scene:s}=window.__gameTest,o=[...s.battleEffects].find(o=>o.anims?.currentAnim?.key==='impact-'+effect);return {effect,hp:m.enemies[0].hp,frame:o.frame.name,width:o.displayWidth,count:s.battleEffects.size,elapsed:m.elapsed};},effect);
   const unit=await page.evaluate(effect=>window.__gameTest.model.towers.find(t=>t.effect===effect).unit,effect);assert.equal(state.hp,before-unit);assert.equal(state.width,unit>=1000?108:72);rows.push(state);
   await page.waitForTimeout(100);assert.equal(await page.evaluate(effect=>[...window.__gameTest.scene.battleEffects].find(o=>o.anims?.currentAnim?.key==='impact-'+effect).frame.name,effect),state.frame);
   await page.screenshot({path:`test-results/combat-${effect}.png`});
   await page.evaluate(()=>{window.__gameTest.model.phase='playing';window.__gameTest.scene.update(0,0);});await page.waitForTimeout(650);
   assert.equal(await page.evaluate(()=>window.__gameTest.model.enemies[0].hp),state.hp,'VFX does not add damage');
  }
  await page.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;const t=m.towers[0];m.enemies[0].hp=t.unit;t.enabled=true;t.cooldown=0;s.update(0,16);t.enabled=false;});
  await page.waitForFunction(()=>[...window.__gameTest.scene.battleEffects].some(o=>o.anims?.currentAnim?.key==='fx-defeat'));
  await page.evaluate(()=>{window.__gameTest.model.phase='paused';window.__gameTest.scene.update(0,0);});assert.equal(await page.evaluate(()=>window.__gameTest.model.kills),1);
  await page.screenshot({path:'test-results/combat-defeat.png'});await page.setViewportSize({width:1024,height:768});await page.screenshot({path:'test-results/combat-tablet.png'});
  await page.evaluate(()=>{window.__gameTest.stage(6);const {model:m,scene:s}=window.__gameTest;m.requestPurchase({x:1,y:3},'siege');const q=m.pendingPurchase;m.answerPurchase(((q.before-q.cost)/1000).toFixed(2));s.drawTerrain();m.start();m.spawn();const e=m.enemies[0];e.hp=e.max=600;e.x=190;e.y=340;e.stun=100;s.update(0,16);m.towers[0].enabled=false;});
  await page.waitForTimeout(230);assert.equal(await page.evaluate(()=>window.__gameTest.model.enemies[0].hp),600);assert.equal(await page.evaluate(()=>window.__gameTest.model.invalidHits),1);
  assert.equal(await page.evaluate(()=>[...window.__gameTest.scene.battleEffects].filter(o=>o.anims?.currentAnim?.key?.startsWith('impact-')).length),0,'invalid shot has no damage burst');
  await page.evaluate(()=>window.__gameTest.stage(7));assert.equal(await page.evaluate(()=>window.__gameTest.scene.battleEffects.size),0,'stage change cleans up effects');
  const reduced=await context.newPage();await reduced.emulateMedia({reducedMotion:'reduce'});await reduced.goto('http://localhost:5173/?mode=adventure');await reduced.waitForFunction(()=>window.__gameTest?.ui.ready);
  await reduced.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;m.requestPurchase({x:1,y:3},'basic');const q=m.pendingPurchase;m.answerPurchase(((q.before-q.cost)/1000).toFixed(2));s.drawTerrain();m.start();m.spawn();m.enemies[0].x=170;m.enemies[0].y=280;m.enemies[0].stun=100;s.update(0,16);m.towers[0].enabled=false;});await reduced.waitForTimeout(200);
  assert.equal(await reduced.evaluate(()=>window.__gameTest.scene.cameras.main.shakeEffect.isRunning),false);assert.equal(await reduced.evaluate(()=>[...window.__gameTest.scene.battleEffects].filter(o=>o.anims?.currentAnim).length),0);
  assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['two generated 24-frame atlases','four distinct animated impacts','correct damage, no extra VFX damage','paused sprite frames and effects','stone defeat burst','tablet rendering','invalid-shot rejection','stage cleanup','reduced-motion effects'],rows,errors},null,2));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
