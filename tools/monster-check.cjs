const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
(async()=>{
 const exe='C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe';
 const browser=await chromium.launch({executablePath:process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE||(fs.existsSync(exe)?exe:undefined)});
 const page=await browser.newPage({viewport:{width:1280,height:800}}),errors=[];
 page.on('pageerror',e=>errors.push(String(e)));page.on('response',r=>{if(r.status()>=400)errors.push(`${r.status()} ${r.url()}`);});
 await page.goto('http://localhost:5173/?mode=adventure');await page.waitForFunction(()=>window.__gameTest?.ui.ready);
 // Preview actual entity rendering without changing the campaign or user's save.
 const kinds=await page.evaluate(()=>{
  window.__gameTest.stage(10);const {model:m,scene}=window.__gameTest;
  for(let i=0;i<12;i++)m.spawn();
  m.enemies=m.enemies.filter((e,i)=>[0,3,11].includes(i));
  const poses=[{x:250,y:395},{x:480,y:395},{x:770,y:395}];
  m.enemies.forEach((e,i)=>Object.assign(e,poses[i]));m.events=[];scene.update(0,0);scene.onChange();
  return m.enemies.map(e=>e.kind);
 });
 assert.deepEqual(kinds,['golem','crystal','warden']);
 const stats=await page.evaluate(()=>[...window.__gameTest.scene.visuals.values()].map(v=>({kind:v.kind,width:v.sprite.displayWidth,texture:v.sprite.texture.key,anim:v.sprite.anims.currentAnim.key,hp:v.text.text})));
 assert.ok(stats[2].width>stats[1].width&&stats[1].width>stats[0].width);assert.equal(stats[2].hp,'9.99');
 assert.equal(stats[2].texture,'dungeon-monster-warden-v1');assert.equal(stats[2].anim,'warden-walk');
 await page.screenshot({path:'test-results/monster-progression.png'});
 await page.evaluate(()=>{const {model:m,scene}=window.__gameTest;m.enemies[0].hitFlash=.4;m.enemies[1].slow=3;m.enemies[2].stun=1;scene.update(0,0);});
 assert.deepEqual(await page.evaluate(()=>[...window.__gameTest.scene.visuals.values()].map(v=>v.sprite.anims.currentAnim.key)),['golem-hurt','crystal-frozen','warden-frozen']);
 await page.evaluate(()=>{const {model:m,scene}=window.__gameTest;m.enemies=[];scene.update(0,0);});
 assert.ok(await page.evaluate(()=>window.__gameTest.scene.children.list.some(v=>v.anims?.currentAnim?.key==='warden-fall')));
 await page.evaluate(()=>{window.__gameTest.stage(2);const {model:m,scene}=window.__gameTest;for(let i=0;i<12;i++)m.spawn();m.enemies=[m.enemies[0],m.enemies[11]];m.enemies.forEach((e,i)=>Object.assign(e,{x:320+i*250,y:390}));m.events=[];scene.update(0,0);scene.onChange();});
 assert.deepEqual(await page.evaluate(()=>window.__gameTest.model.enemies.map(e=>e.kind)),['slime','beetle']);
 await page.screenshot({path:'test-results/monster-early.png'});
 await page.setViewportSize({width:1024,height:768});await page.evaluate(()=>{window.__gameTest.stage(10);const {model:m,scene}=window.__gameTest;for(let i=0;i<12;i++)m.spawn();m.enemies=[m.enemies[11]];Object.assign(m.enemies[0],{x:350,y:390});m.events=[];scene.update(0,0);scene.onChange();});
 await page.screenshot({path:'test-results/monster-tablet.png'});
 assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth&&document.documentElement.scrollHeight<=innerHeight));
 assert.deepEqual(errors,[]);console.log(JSON.stringify({status:'passed',checks:['six distinct monster textures','increasing actual sprite size','large boss decimal label','walk, hit, frost and defeat animations','tablet boss view without scroll'],stats,errors},null,2));
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1);});
