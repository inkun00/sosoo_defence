const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const exe='C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe';
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync(exe)?exe:undefined)});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://localhost:5173/?mode=adventure');await page.waitForFunction(()=>window.__gameTest?.ui.ready);
 await page.evaluate(()=>{
  window.__gameTest.stage(6);const {model:m,scene:s}=window.__gameTest;
  ['siege','frost','lightning','sniper'].forEach((id,i)=>{m.requestPurchase([{x:1,y:3},{x:3,y:3},{x:1,y:5},{x:1,y:7}][i],id);const q=m.pendingPurchase;m.answerPurchase(((q.before-q.cost)/1000).toFixed(3));});
  s.drawTerrain();m.start();m.spawn();m.towers.forEach(t=>t.cooldown=100);m.enemies[0].hp=m.enemies[0].max=100000;m.enemies[0].stun=100;
 });
 await page.waitForTimeout(400);
 const stats=await page.evaluate(()=>{
  const {model:m,scene:s}=window.__gameTest,t=m.towers[0],v=s.towerArt.get(t.id),e=m.enemies[0];
  const tx=30+(t.x+.5)*58,ty=46+(t.y+.5)*58;
  const wrap=d=>Math.atan2(Math.sin(d),Math.cos(d));
  const result={directions:[],recoil:0,pausedRecoil:0,restRecoil:0,projectileOrigin:null};
  for(const [dx,dy]of [[0,-80],[90,-12.2],[0,80],[-90,-12.2]]){
   e.x=tx+dx;e.y=ty+dy;for(let i=0;i<36;i++)s.update(0,16);
   const desired=Math.atan2(e.y-.8-(ty-13),e.x-tx)+Math.PI/2;
   result.directions.push({angle:v.angle,error:Math.abs(wrap(v.angle-desired)),baseRotation:v.base.rotation});
  }
  const before=v.angle;m.toggleTower(t.id);e.x=tx+90;e.y=ty-12.2;for(let i=0;i<36;i++)s.update(0,16);
  const off=s.towerArt.get(t.id);result.offHeld=Math.abs(wrap(off.angle-before))<1e-8;m.toggleTower(t.id);s.update(0,16);
  const current=s.towerArt.get(t.id);current.angle=1.2;current.pivot.rotation=1.2;s.drawTerrain();result.rebuildHeld=s.towerArt.get(t.id).angle===1.2;
  m.towers.slice(1).forEach(t=>t.enabled=false);e.hp=e.max=t.unit;e.x=tx+85;e.y=ty-12.2;t.cooldown=0;m.events=[];s.update(0,16);
  const shot=s.children.list.find(o=>o.name==='battle-projectile'&&o.frame?.name==='projectile-basic');
  const firing=s.towerArt.get(t.id),muzzle=firing.pivot.getWorldTransformMatrix().transformPoint(0,-29+firing.head.y);
  result.projectileOrigin=shot?Math.hypot(shot.x-muzzle.x,shot.y-muzzle.y):Infinity;
  result.killingShotAimed=Math.abs(wrap(firing.angle-Math.PI/2))<1e-6;result.kills=m.kills;
  s.update(0,55);result.recoil=s.towerArt.get(t.id).head.y;m.phase='paused';s.update(0,100);result.pausedRecoil=s.towerArt.get(t.id).head.y;
  m.phase='playing';s.update(0,100);s.update(0,100);result.restRecoil=s.towerArt.get(t.id).head.y;
  return result;
 });
 stats.directions.forEach(d=>{assert.ok(d.error<1e-5);assert.equal(d.baseRotation,0);});
 assert.ok(stats.offHeld&&stats.rebuildHeld&&stats.killingShotAimed);assert.equal(stats.kills,1);assert.ok(stats.projectileOrigin<.01);
 assert.ok(stats.recoil>3.9);assert.equal(stats.pausedRecoil,stats.recoil);assert.equal(stats.restRecoil,0);
 await page.evaluate(()=>{
  window.__gameTest.stage(6);const {model:m,scene:s}=window.__gameTest;
  ['siege','frost','lightning','sniper'].forEach((id,i)=>{m.requestPurchase([{x:1,y:3},{x:3,y:3},{x:1,y:5},{x:1,y:7}][i],id);const q=m.pendingPurchase;m.answerPurchase(((q.before-q.cost)/1000).toFixed(3));});
  s.drawTerrain();m.start();m.spawn();m.towers.forEach(t=>t.cooldown=100);const e=m.enemies[0];e.hp=e.max=12680;e.x=172;e.y=334;e.stun=100;
  for(let i=0;i<36;i++)s.update(0,16);s.onChange();
 });
 await page.waitForTimeout(300);await page.screenshot({path:'test-results/turret-tracking.png'});
 const heads=await page.evaluate(()=>[...window.__gameTest.scene.towerArt.values()].map(v=>v.head.frame.name));assert.deepEqual(heads,['siege','frost','lightning','sniper']);
 await page.setViewportSize({width:1024,height:768});await page.screenshot({path:'test-results/turret-tracking-tablet.png'});
 const reduced=await browser.newPage();await reduced.emulateMedia({reducedMotion:'reduce'});await reduced.goto('http://localhost:5173/?mode=adventure');await reduced.waitForFunction(()=>window.__gameTest?.ui.ready);
 const reducedResult=await reduced.evaluate(()=>{const {model:m,scene:s}=window.__gameTest;m.requestPurchase({x:1,y:3},'basic');const q=m.pendingPurchase;m.answerPurchase(((q.before-q.cost)/1000).toFixed(3));s.drawTerrain();m.start();m.spawn();m.towers[0].cooldown=100;const e=m.enemies[0];e.x=175;e.y=236.8;e.stun=100;s.update(0,16);const v=s.towerArt.get(m.towers[0].id);return {angle:v.angle,headY:v.head.y};});
 assert.ok(Math.abs(reducedResult.angle-Math.PI/2)<1e-5);assert.equal(reducedResult.headY,0);
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['four directional aim changes','base stays fixed','OFF and pause hold position','orientation retained across redraw','killing shot aim and real muzzle origin','recoil and recovery','four generated turret heads','tablet rendering','reduced-motion aiming'],stats,errors},null,2));await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
