const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=path.resolve('test-results/duel-phases');
fs.mkdirSync(output,{recursive:true});
const url=process.env.DUEL_PHASE_URL||'http://127.0.0.1:5173/tools/duel-purchase-preview.html';
const errors=[],checks=[],retries=[];
let screens=0;
let currentPage,currentLabel;
async function check(page,name,fn){assert.ok(await page.evaluate(fn),name);checks.push(name);}
async function control(page,id){
 for(let attempt=0;attempt<2;attempt++){
  await page.waitForFunction(id=>window.__duelPhaseTest.scene.input.enabled&&window.__duelPhaseTest.scene.controls.get(id)?.enabled,id);
  const before=await page.evaluate(()=>window.__duelPhaseClicks.length);
  const c=await page.evaluate(id=>{const c=window.__duelPhaseTest.scene.controls.get(id);return{x:c.x,y:c.y};},id);
  const canvas=page.locator('canvas'),box=await canvas.boundingBox(),size=await canvas.evaluate(e=>({width:e.width,height:e.height}));
  const x=box.x+c.x*box.width/size.width,y=box.y+c.y*box.height/size.height;
  await page.evaluate(({id,x,y,c,attempt})=>{window.__duelPhaseRequests??=[];window.__duelPhaseRequests.push({id,x,y,c,attempt});},{id,x,y,c,attempt});
  await page.mouse.move(x,y);await page.waitForTimeout(100);
  await page.mouse.click(x,y,{delay:80});
  try{
   await page.waitForFunction(({id,before})=>window.__duelPhaseClicks.slice(before).some(click=>click.key===id),{id,before},{timeout:1500});
   await page.waitForTimeout(260);return;
  }catch(error){
   if(attempt)throw error;
   // Retry only an unreceived pointer action, never an accepted summon or fuse.
   await page.evaluate(({id,before})=>{window.__duelPhaseRetries??=[];window.__duelPhaseRetries.push({id,unreceived:true,clicks:window.__duelPhaseClicks.slice(before)});},{id,before});
  }
 }
}
async function recipe(page){
 const planned=await page.evaluate(()=>{const p=window.__duelPhaseTest.peer.state.players[0],board=p.board;for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&board[a]+board[b]===board[c])return{slots:[a,b,c],round:p.round};throw Error('No addition');});
 assert.deepEqual(await page.evaluate(()=>window.__duelPhaseTest.view().slots),[],'recipe starts after previous selection clears');
 for(const [selected,i] of planned.slots.entries()){
  for(let pageIndex=0;pageIndex<8;pageIndex++){
   if(await page.evaluate(i=>window.__duelPhaseTest.scene.controls.has('block:'+i),i))break;
   await control(page,'blocks:page');
  }
  await control(page,'block:'+i);
  await page.waitForFunction(i=>window.__duelPhaseTest.view().slots.includes(i),i,{timeout:1500});
  assert.deepEqual(await page.evaluate(()=>window.__duelPhaseTest.view().slots),planned.slots.slice(0,selected+1),'clicked block becomes the next selected slot');
 }
 await control(page,'fuse');
 await page.waitForFunction(round=>window.__duelPhaseTest.peer.state.players[0].round===round+1&&window.__duelPhaseTest.view().slots.length===0,planned.round,{timeout:3000});
}
async function cell(page,x,y){
 const canvas=page.locator('canvas'),box=await canvas.boundingBox(),size=await canvas.evaluate(e=>({width:e.width,height:e.height}));
 const boardY=await page.evaluate(()=>window.__duelPhaseTest.scene.boardY);
 await page.mouse.click(box.x+(37+(x+.5)*38)*box.width/size.width,box.y+(boardY+(y+.5)*38)*box.height/size.height);
 await page.waitForTimeout(260);
}
(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  for(const [label,width,height] of [['desktop',1280,800],['tablet',1024,768],['phone-landscape',844,390]]){
   if(process.env.DUEL_PHASE_SCREEN&&process.env.DUEL_PHASE_SCREEN!==label)continue;
   screens++;
   const page=await browser.newPage({viewport:{width,height},hasTouch:label!=='desktop'});
   currentPage=page;currentLabel=label;page.setDefaultTimeout(10000);
   page.on('pageerror',e=>errors.push(`${label}: ${e.message}`));
   await page.goto(url);
   await page.waitForFunction(()=>window.__duelPhaseTest?.scene.ready);
   await page.waitForFunction(()=>JSON.parse(document.getElementById('landscape-proof').textContent||'{}').screenReady);
   await page.evaluate(()=>{const scene=window.__duelPhaseTest.scene,original=scene.onAction;window.__duelPhaseClicks=[];scene.onAction=key=>{window.__duelPhaseClicks.push({key,x:scene.input.activePointer.x,y:scene.input.activePointer.y});return original(key);};});
   await page.evaluate(()=>{const p=window.__duelPhaseTest.peer.state.players[0];p.rewardRoster=['hero-3-2'];p.rewardHero='hero-3-2';window.__duelPhaseTest.scene.redraw();});
   await control(page,'ready');
   await check(page,label+' preparation started',()=>window.__duelPhaseTest.peer.state.status==='preparing');
   await check(page,label+' preparation starts with 17.6 coins',()=>window.__duelPhaseTest.peer.state.players[0].money===17600);
   await check(page,label+' hero addition available',()=>window.__duelPhaseTest.scene.controls.has('fuse')&&[...window.__duelPhaseTest.scene.controls].some(([id,c])=>id.startsWith('block:')&&c.enabled));
   await check(page,label+' preparation only accumulates growth',()=>!window.__duelPhaseTest.scene.controls.has('hatch'));
   await page.screenshot({path:path.join(output,label+'-preparation.png')});
   await control(page,'type:basic');
   await page.locator('.duel-purchase-panel').waitFor({state:'visible'});
   await page.locator('.duel-purchase-panel [data-cancel]').click();await page.waitForTimeout(260);
   await check(page,label+' tower cancel returns to hero problems',()=>!window.__duelPhaseTest.peer.state.players[0].quote&&window.__duelPhaseTest.scene.controls.has('fuse'));
   await control(page,'type:basic');
   await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.players[0].quote);
   const answer=await page.evaluate(()=>{const q=window.__duelPhaseTest.peer.state.players[0].quote;return String((q.before-q.cost)/1000);});
   await page.locator('.duel-purchase-answer input').fill('0');
   await page.locator('.duel-purchase-confirm').click();await page.waitForTimeout(260);
   await check(page,label+' wrong tower answer preserves stock',()=>!window.__duelPhaseTest.peer.state.players[0].stock.basic);
   await page.locator('.duel-purchase-answer input').fill(answer);
   await page.locator('.duel-purchase-confirm').click();await page.waitForTimeout(260);
   await check(page,label+' correct tower answer stocks one',()=>window.__duelPhaseTest.peer.state.players[0].stock.basic===1);
   await check(page,label+' tower form does not select underlying hero blocks',()=>window.__duelPhaseTest.view().slots.length===0);
   await recipe(page);
   await recipe(page);
   await check(page,label+' correct additions accumulate without hatching',()=>window.__duelPhaseTest.peer.state.players[0].egg===2&&Object.values(window.__duelPhaseTest.peer.state.players[0].heroStock??{}).every(count=>count===0)&&window.__duelPhaseTest.peer.state.enemies.length===0);
   // Exercise the unlimited-growth artwork boundary without making twelve UI recipes.
   await page.evaluate(()=>{const api=window.__duelPhaseTest;api.peer.state.players[0].egg=11;api.scene.redraw();});
   await recipe(page);
   await check(page,label+' growth above ten keeps addition enabled and clamps egg artwork',()=>{const api=window.__duelPhaseTest;return api.peer.state.players[0].egg===12&&api.scene.ui.list.some(o=>o.texture?.key==='duel-eggs'&&o.frame?.name==='egg-10');});
   await page.evaluate(()=>{const api=window.__duelPhaseTest;api.peer.state.players[0].egg=6;api.scene.redraw();});
   // Preserve accumulated growth and cancel an unfinished tower question at the boundary.
   await control(page,'type:basic');
   await page.evaluate(()=>window.__duelPhaseTest.advanceToBattle());
   await check(page,label+' battle hides all question controls',()=>window.__duelPhaseTest.peer.state.status==='playing'&&!window.__duelPhaseTest.scene.controls.has('fuse')&&![...window.__duelPhaseTest.scene.controls.keys()].some(id=>id.startsWith('block:'))&&!window.__duelPhaseTest.peer.state.players[0].quote);
   assert.equal(await page.locator('.duel-purchase-panel').isVisible(),false);
   await check(page,label+' accumulated growth preserved for battle',()=>window.__duelPhaseTest.peer.state.players[0].egg===6&&Object.values(window.__duelPhaseTest.peer.state.players[0].heroStock??{}).every(count=>count===0));
   await page.screenshot({path:path.join(output,label+'-battle.png')});
   await control(page,'type:basic');await cell(page,3,2);
   await check(page,label+' reserved tower placed without money',()=>window.__duelPhaseTest.peer.state.players[0].towers.length===1&&window.__duelPhaseTest.peer.state.players[0].stock.basic===0&&window.__duelPhaseTest.peer.state.players[0].money===0);
   await cell(page,3,2);await control(page,'sell');
   await check(page,label+' reclaimed tower returns to inventory',()=>window.__duelPhaseTest.peer.state.players[0].towers.length===0&&window.__duelPhaseTest.peer.state.players[0].stock.basic===1);
   await control(page,'hatch');
   assert.equal(await page.locator('.modal:not(.hidden) [data-hero]').count(),3);
   assert.equal(await page.locator('[data-hero-level-select] option').count(),6);
   assert.match(await page.locator('.hero-growth-example').innerText(),/Lv\.1 최대 6명 \/ Lv\.6 최대 1명/);
   await check(page,label+' growth picker locks canvas input',()=>!window.__duelPhaseTest.scene.input.enabled);
   await page.locator('[data-hero-level-select]').selectOption('2');
   assert.equal(await page.locator('.modal:not(.hidden) [data-hero]').count(),3);
   assert.match(await page.locator('.hero-growth-summary').innerText(),/비용 2 · 같은 레벨 최대 3명/);
   await page.screenshot({path:path.join(output,label+'-growth-picker.png')});
   const pickerTouch=await page.locator('.hero-level-nav button,.hero-level-nav select,.hero-growth-picker [data-hero]').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return{width:r.width,height:r.height};}));
   assert.ok(pickerTouch.every(r=>Math.min(r.width,r.height)>=44),label+' picker touch controls at least44px');
   await page.locator('[data-hero="hero-2-0"]').click();await page.waitForTimeout(260);
   await check(page,label+' first level two hero uses two of six growth at friendly castle',()=>window.__duelPhaseTest.peer.state.players[0].egg===4&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.hero==='hero-2-0'&&e.pathDistance>=1&&e.pathDistance<2));
   await page.locator('[data-hero="hero-2-1"]').click();await page.waitForTimeout(260);
   await check(page,label+' remaining growth can summon second level two hero',()=>window.__duelPhaseTest.peer.state.players[0].egg===2&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.hero==='hero-2-1'));
   await page.locator('[data-hero="hero-2-2"]').click();await page.waitForTimeout(260);
   await check(page,label+' six growth can summon three level two heroes',()=>window.__duelPhaseTest.peer.state.players[0].egg===0&&window.__duelPhaseTest.peer.state.enemies.filter(e=>e.owner===0&&e.hero?.startsWith('hero-2-')).length===3);
   assert.equal(await page.locator('.modal:not(.hidden) [data-hero]:enabled').count(),0);
   await page.locator('[data-close-heroes]').click();await page.waitForTimeout(260);
   await page.evaluate(()=>{const api=window.__duelPhaseTest;api.peer.state.players[0].egg=12;api.scene.redraw();});
   await control(page,'hatch');
   assert.equal(await page.locator('[data-hero-level-select] option').count(),10);
   await page.locator('[data-hero-level-select]').selectOption('6');
   assert.equal(await page.locator('.modal:not(.hidden) [data-hero]').count(),3);
   assert.match(await page.locator('.hero-growth-summary').innerText(),/비용 6 · 같은 레벨 최대 2명/);
   assert.match(await page.locator('.hero-growth-example').innerText(),/성장량 6이 남아요/);
   await page.locator('[data-hero-level-select]').selectOption('10');
   await page.screenshot({path:path.join(output,label+'-growth-picker-high.png')});
   await page.locator('[data-hero="hero-10-2"]').click();await page.waitForTimeout(260);
   await check(page,label+' twelve growth summons level ten and preserves two',()=>window.__duelPhaseTest.peer.state.players[0].egg===2&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.hero==='hero-10-2'));
   assert.equal(await page.locator('[data-hero-level-select] option').count(),2);
   assert.equal(await page.locator('.hero-growth-picker').getAttribute('data-level'),'2');
   await page.locator('[data-hero="hero-2-0"]').click();await page.waitForTimeout(260);
   await check(page,label+' high summon remainder is still spendable',()=>window.__duelPhaseTest.peer.state.players[0].egg===0&&window.__duelPhaseTest.peer.state.enemies.filter(e=>e.owner===0&&e.hero==='hero-2-0').length===2);
   await page.locator('[data-close-heroes]').click();await page.waitForTimeout(260);
   await control(page,'summon-reward');
   await check(page,label+' collected hero stays separate from growth',()=>window.__duelPhaseTest.peer.state.players[0].rewardUsed&&window.__duelPhaseTest.peer.state.players[0].egg===0&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.rewardSummon));
   await page.evaluate(()=>{const api=window.__duelPhaseTest;api.peer.state.players[0].heroStock={'hero-5-0':1};api.scene.redraw();});
   await control(page,'summon:hero-5-0');
   await check(page,label+' legacy hero stock still summons without growth cost',()=>window.__duelPhaseTest.peer.state.players[0].heroStock['hero-5-0']===0&&window.__duelPhaseTest.peer.state.players[0].egg===0&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.hero==='hero-5-0'&&!e.rewardSummon));
   await page.waitForFunction(()=>JSON.parse(document.getElementById('landscape-proof').textContent).screenReady);
   const geometry=await page.evaluate(()=>JSON.parse(document.getElementById('landscape-proof').textContent));
   assert.ok(geometry.controls.every(c=>c.x-c.w/2>=0&&c.x+c.w/2<=1280&&c.y-c.h/2>=0),label+' controls in canvas');
   if(label==='phone-landscape'){
    const box=await page.locator('canvas').boundingBox();
    const scale=box.width/1280;
    assert.ok(geometry.controls.filter(c=>c.enabled).every(c=>Math.min(c.w,c.h)*scale>=43.9),label+' touch controls at least44px');
   }
   fs.writeFileSync(path.join(output,label+'-geometry.json'),JSON.stringify(geometry,null,2));
   const screenRetries=await page.evaluate(()=>window.__duelPhaseRetries??[]);retries.push(...screenRetries.map(retry=>({screen:label,...retry})));
   await page.screenshot({path:path.join(output,label+'-deployed.png')});await page.close();
  }
  assert.deepEqual(errors,[],'browser runtime errors');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors,retries},null,2));
  console.log(JSON.stringify({passed:checks.length,screens,errors,retries,output},null,2));
 }catch(e){
  console.error('Failed screen',currentLabel,e);
  if(currentPage&&!currentPage.isClosed()){
   await currentPage.screenshot({path:path.join(output,currentLabel+'-failure.png')});
   const state=await currentPage.evaluate(()=>({phase:window.__duelPhaseTest?.peer.state.status,player:window.__duelPhaseTest?.peer.state.players[0],inputEnabled:window.__duelPhaseTest?.scene.input?.enabled,busy:window.__duelPhaseTest?.view().busy,canvas:{width:document.querySelector('canvas')?.width,height:document.querySelector('canvas')?.height},modal:[...document.querySelectorAll('.modal')].map(e=>({className:e.className,phase:e.dataset.phase})),controls:[...(window.__duelPhaseTest?.scene.controls??[])].map(([id,c])=>({id,x:c.x,y:c.y,enabled:c.enabled,hit:document.elementFromPoint(document.querySelector('canvas').getBoundingClientRect().x+c.x*document.querySelector('canvas').getBoundingClientRect().width/document.querySelector('canvas').width,document.querySelector('canvas').getBoundingClientRect().y+c.y*document.querySelector('canvas').getBoundingClientRect().height/document.querySelector('canvas').height)?.outerHTML.slice(0,300)}))}));
   const inputs=await currentPage.evaluate(()=>({requests:window.__duelPhaseRequests,clicks:window.__duelPhaseClicks,retries:window.__duelPhaseRetries}));
   fs.writeFileSync(path.join(output,currentLabel+'-failure.json'),JSON.stringify({checks,errors,state,inputs},null,2));
  }
  throw e;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
