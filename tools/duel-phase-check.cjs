const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=path.resolve('test-results/duel-phases');
fs.mkdirSync(output,{recursive:true});
const url=process.env.DUEL_PHASE_URL||'http://127.0.0.1:5173/tools/duel-purchase-preview.html';
const errors=[],checks=[];
let screens=0;
let currentPage,currentLabel;
async function check(page,name,fn){assert.ok(await page.evaluate(fn),name);checks.push(name);}
async function control(page,id){
 await page.waitForFunction(id=>window.__duelPhaseTest.scene.controls.get(id)?.enabled,id);
 const c=await page.evaluate(id=>{const c=window.__duelPhaseTest.scene.controls.get(id);return{x:c.x,y:c.y};},id);
 const canvas=page.locator('canvas'),box=await canvas.boundingBox(),size=await canvas.evaluate(e=>({width:e.width,height:e.height}));
 const x=box.x+c.x*box.width/size.width,y=box.y+c.y*box.height/size.height;
 await page.evaluate(({id,x,y,c})=>{window.__duelPhaseRequests??=[];window.__duelPhaseRequests.push({id,x,y,c});},{id,x,y,c});
 await page.mouse.move(x,y);await page.waitForTimeout(100);
 await page.mouse.click(x,y,{delay:80});
 await page.waitForTimeout(260);
}
async function recipe(page){
 const slots=await page.evaluate(()=>{const board=window.__duelPhaseTest.peer.state.players[0].board;for(let a=0;a<16;a++)for(let b=0;b<16;b++)for(let c=0;c<16;c++)if(a!==b&&a!==c&&b!==c&&board[a]+board[b]===board[c])return[a,b,c];throw Error('No addition');});
 for(const i of slots){
  for(let pageIndex=0;pageIndex<8;pageIndex++){
   if(await page.evaluate(i=>window.__duelPhaseTest.scene.controls.has('block:'+i),i))break;
   await control(page,'blocks:page');
  }
  await control(page,'block:'+i);
 }
 await control(page,'fuse');
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
   await check(page,label+' hero addition available',()=>window.__duelPhaseTest.scene.controls.has('fuse')&&[...window.__duelPhaseTest.scene.controls].some(([id,c])=>id.startsWith('block:')&&c.enabled));
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
   await control(page,'hatch');
   assert.equal(await page.locator('[data-hero]').count(),3);
   await page.locator('[data-hero="hero-1-0"]').click();await page.waitForTimeout(260);
   await check(page,label+' hatch reserves hero before combat',()=>window.__duelPhaseTest.peer.state.players[0].heroStock['hero-1-0']===1&&window.__duelPhaseTest.peer.state.enemies.length===0);
   // Preserve an unfinished final egg and an open question through the boundary.
   await recipe(page);await control(page,'type:basic');
   await page.evaluate(()=>window.__duelPhaseTest.advanceToBattle());
   await check(page,label+' battle hides all question controls',()=>window.__duelPhaseTest.peer.state.status==='playing'&&!window.__duelPhaseTest.scene.controls.has('fuse')&&![...window.__duelPhaseTest.scene.controls.keys()].some(id=>id.startsWith('block:'))&&!window.__duelPhaseTest.peer.state.players[0].quote);
   assert.equal(await page.locator('.duel-purchase-panel').isVisible(),false);
   await check(page,label+' reserved hero and final egg preserved',()=>window.__duelPhaseTest.peer.state.players[0].heroStock['hero-1-0']===1&&window.__duelPhaseTest.peer.state.players[0].egg===1);
   await page.screenshot({path:path.join(output,label+'-battle.png')});
   await control(page,'type:basic');await cell(page,3,2);
   await check(page,label+' reserved tower placed without money',()=>window.__duelPhaseTest.peer.state.players[0].towers.length===1&&window.__duelPhaseTest.peer.state.players[0].stock.basic===0&&window.__duelPhaseTest.peer.state.players[0].money===0);
   await cell(page,3,2);await control(page,'sell');
   await check(page,label+' reclaimed tower returns to inventory',()=>window.__duelPhaseTest.peer.state.players[0].towers.length===0&&window.__duelPhaseTest.peer.state.players[0].stock.basic===1);
   await control(page,'summon:hero-1-0');
   await check(page,label+' stock hero consumes one at friendly castle',()=>window.__duelPhaseTest.peer.state.players[0].heroStock['hero-1-0']===0&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.hero==='hero-1-0'&&e.pathDistance>=1&&e.pathDistance<2));
   await control(page,'summon-reward');
   await check(page,label+' collected hero manually summoned',()=>window.__duelPhaseTest.peer.state.players[0].rewardUsed&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.rewardSummon));
   await control(page,'hatch');await page.locator('.modal:not(.hidden) [data-hero="hero-1-1"]').click();await page.waitForTimeout(260);
   await check(page,label+' final egg can be selected in battle',()=>window.__duelPhaseTest.peer.state.players[0].egg===0&&window.__duelPhaseTest.peer.state.enemies.some(e=>e.owner===0&&e.hero==='hero-1-1'));
   await page.waitForFunction(()=>JSON.parse(document.getElementById('landscape-proof').textContent).screenReady);
   const geometry=await page.evaluate(()=>JSON.parse(document.getElementById('landscape-proof').textContent));
   assert.ok(geometry.controls.every(c=>c.x-c.w/2>=0&&c.x+c.w/2<=1280&&c.y-c.h/2>=0),label+' controls in canvas');
   if(label==='phone-landscape'){
    const box=await page.locator('canvas').boundingBox();
    const scale=box.width/1280;
    assert.ok(geometry.controls.filter(c=>c.enabled).every(c=>Math.min(c.w,c.h)*scale>=43.9),label+' touch controls at least44px');
   }
   fs.writeFileSync(path.join(output,label+'-geometry.json'),JSON.stringify(geometry,null,2));
   await page.screenshot({path:path.join(output,label+'-deployed.png')});await page.close();
  }
  assert.deepEqual(errors,[],'browser runtime errors');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors},null,2));
  console.log(JSON.stringify({passed:checks.length,screens,errors,output},null,2));
 }catch(e){
  console.error('Failed screen',currentLabel,e);
  if(currentPage&&!currentPage.isClosed()){
   await currentPage.screenshot({path:path.join(output,currentLabel+'-failure.png')});
   const state=await currentPage.evaluate(()=>({phase:window.__duelPhaseTest?.peer.state.status,player:window.__duelPhaseTest?.peer.state.players[0],inputEnabled:window.__duelPhaseTest?.scene.input?.enabled,busy:window.__duelPhaseTest?.view().busy,canvas:{width:document.querySelector('canvas')?.width,height:document.querySelector('canvas')?.height},modal:[...document.querySelectorAll('.modal')].map(e=>({className:e.className,phase:e.dataset.phase})),controls:[...(window.__duelPhaseTest?.scene.controls??[])].map(([id,c])=>({id,x:c.x,y:c.y,enabled:c.enabled,hit:document.elementFromPoint(document.querySelector('canvas').getBoundingClientRect().x+c.x*document.querySelector('canvas').getBoundingClientRect().width/document.querySelector('canvas').width,document.querySelector('canvas').getBoundingClientRect().y+c.y*document.querySelector('canvas').getBoundingClientRect().height/document.querySelector('canvas').height)?.outerHTML.slice(0,300)}))}));
   const inputs=await currentPage.evaluate(()=>({requests:window.__duelPhaseRequests,clicks:window.__duelPhaseClicks}));
   fs.writeFileSync(path.join(output,currentLabel+'-failure.json'),JSON.stringify({checks,errors,state,inputs},null,2));
  }
  throw e;
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
