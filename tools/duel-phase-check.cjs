const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const output=path.resolve('test-results/preparation-popup');
fs.mkdirSync(output,{recursive:true});
const url=process.env.PREPARATION_POPUP_URL||process.env.DUEL_PHASE_URL||'http://127.0.0.1:5173/tools/duel-purchase-preview.html';
const checks=[],errors=[],geometry=[];
const screens=[['pc',1049,884],['desktop',1365,768],['phone-landscape',844,390],['phone-portrait',390,844]];
let currentPage,currentLabel;

async function check(page,name,fn,arg){
 const result=await page.evaluate(fn,arg);
 assert.ok(result,name);
 checks.push(name);
}
async function control(page,id,touch=false){
 await page.waitForFunction(id=>window.__duelPhaseTest.scene.input.enabled&&window.__duelPhaseTest.scene.controls.get(id)?.enabled,id);
 const logical=await page.evaluate(id=>{const c=window.__duelPhaseTest.scene.controls.get(id);return{x:c.x,y:c.y};},id);
 const box=await page.locator('canvas').boundingBox();
 const dimensions=await page.locator('canvas').evaluate(e=>({width:e.width,height:e.height}));
 const point={x:box.x+logical.x*box.width/dimensions.width,y:box.y+logical.y*box.height/dimensions.height};
 assert.ok(point.x>=0&&point.x<=await page.evaluate(()=>innerWidth)&&point.y>=0&&point.y<=await page.evaluate(()=>innerHeight),id+' is reachable without scrolling');
 if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y,{delay:60});
}
async function fitted(page,label,phase){
 const result=await page.evaluate(()=>{
  const canvas=document.querySelector('canvas'),viewport=document.getElementById('duel-viewport'),field=document.getElementById('field');
  const box=canvas.getBoundingClientRect(),v=viewport.getBoundingClientRect();
  const mapTop=window.__duelPhaseTest.scene.boardY,mapHeight=15*38,mapLeft=37,mapWidth=24*38;
  const scale=box.width/canvas.width;
  const map={left:box.left+mapLeft*scale,right:box.left+(mapLeft+mapWidth)*scale,top:box.top+mapTop*scale,bottom:box.top+(mapTop+mapHeight)*scale};
  return {size:[innerWidth,innerHeight],phase:window.__duelPhaseTest.peer.state.status,canvas:{left:box.left,right:box.right,top:box.top,bottom:box.bottom,width:box.width,height:box.height,logicalHeight:canvas.height},map,viewport:{left:v.left,right:v.right,top:v.top,bottom:v.bottom},scroll:{documentX:document.documentElement.scrollWidth-document.documentElement.clientWidth,documentY:document.documentElement.scrollHeight-document.documentElement.clientHeight,viewportX:viewport.scrollWidth-viewport.clientWidth,viewportY:viewport.scrollHeight-viewport.clientHeight,fieldX:field.scrollWidth-field.clientWidth,fieldY:field.scrollHeight-field.clientHeight},controls:[...window.__duelPhaseTest.scene.controls].map(([id,c])=>({id,x:c.x,y:c.y,w:c.w,h:c.h,enabled:c.enabled}))};
 });
 geometry.push({label,phase,...result});
 assert.ok(Object.values(result.scroll).every(n=>n<=1),label+' '+phase+' has no document or game scrolling '+JSON.stringify(result.scroll));
 assert.ok(result.canvas.left>=-1&&result.canvas.top>=-1&&result.canvas.right<=result.size[0]+1&&result.canvas.bottom<=result.size[1]+1,label+' '+phase+' entire canvas fits one viewport');
 assert.ok(result.map.left>=result.viewport.left-1&&result.map.right<=result.viewport.right+1&&result.map.top>=result.viewport.top-1&&result.map.bottom<=result.viewport.bottom+1,label+' '+phase+' both battlefields fully fit');
 assert.ok(result.controls.every(c=>c.x-c.w/2>=-.1&&c.x+c.w/2<=1280.1&&c.y-c.h/2>=-.1&&c.y+c.h/2<=result.canvas.logicalHeight+.1),label+' '+phase+' all canvas controls fit');
 const enabled=result.controls.filter(c=>c.enabled);
 assert.ok(enabled.every((a,i)=>enabled.slice(i+1).every(b=>Math.min(a.x+a.w/2,b.x+b.w/2)-Math.max(a.x-a.w/2,b.x-b.w/2)<=.1||Math.min(a.y+a.h/2,b.y+b.h/2)-Math.max(a.y-a.h/2,b.y-b.h/2)<=.1)),label+' '+phase+' enabled canvas controls do not overlap');
 checks.push(label+' '+phase+' map, canvas, controls and page fit one viewport without scrolling');
 return result;
}
async function popupFits(page,label){
 const box=await page.locator('.duel-preparation-panel').boundingBox();
 assert.ok(box,label+' preparation popup visible');
 const size=await page.evaluate(()=>({width:innerWidth,height:innerHeight}));
 assert.ok(box.x>=-1&&box.y>=-1&&box.x+box.width<=size.width+1&&box.y+box.height<=size.height+1,label+' popup fits viewport');
 const contents=await page.locator('.duel-preparation-card').evaluate(card=>{const box=card.getBoundingClientRect();return {box:{left:box.left,right:box.right,top:box.top,bottom:box.bottom},scroll:{x:card.scrollWidth-card.clientWidth,y:card.scrollHeight-card.clientHeight},controls:[...card.querySelectorAll('button,input')].filter(e=>e.getClientRects().length&&!e.closest('[hidden]')).map(e=>{const r=e.getBoundingClientRect();return {label:e.getAttribute('aria-label')||e.textContent,left:r.left,right:r.right,top:r.top,bottom:r.bottom,width:r.width,height:r.height};})};});
 assert.ok(contents.scroll.x<=1&&contents.scroll.y<=1,label+' preparation card has no clipped or scrolling content '+JSON.stringify(contents.scroll));
 assert.ok(contents.controls.every(c=>c.left>=contents.box.left-1&&c.right<=contents.box.right+1&&c.top>=contents.box.top-1&&c.bottom<=contents.box.bottom+1&&c.left>=-1&&c.right<=size.width+1&&c.top>=-1&&c.bottom<=size.height+1),label+' preparation controls fully visible');
 assert.ok(contents.controls.every(c=>Math.min(c.width,c.height)>=43.9),label+' preparation controls meet 44px touch size');
 checks.push(label+' popup fits viewport');
}
async function snapshot(page,label,suffix){await page.screenshot({path:path.join(output,label+'-'+suffix+'.png')});}
async function cell(page,x,y,touch){
 const boardY=await page.evaluate(()=>window.__duelPhaseTest.scene.boardY);
 const box=await page.locator('canvas').boundingBox(),dimensions=await page.locator('canvas').evaluate(e=>({width:e.width,height:e.height}));
 const point={x:box.x+(37+(x+.5)*38)*box.width/dimensions.width,y:box.y+(boardY+(y+.5)*38)*box.height/dimensions.height};
 if(touch)await page.touchscreen.tap(point.x,point.y);else await page.mouse.click(point.x,point.y,{delay:60});
}

async function activate(locator,touch){if(touch)await locator.tap();else await locator.click();}
async function currentPlayer(page){return page.evaluate(()=>{const api=window.__duelPhaseTest;return structuredClone(api.peer.state.players[api.view().side]);});}
async function answerIndex(page,correct=true){return page.evaluate(correct=>{const api=window.__duelPhaseTest,p=api.peer.state.players[api.view().side];return p.board.findIndex(n=>correct?n===p.heroQuestion.a+p.heroQuestion.b:n!==p.heroQuestion.a+p.heroQuestion.b);},correct);}
async function assertClock(page,label,text,phase,state,active){
 const actual=await page.evaluate(()=>{const ui=window.__duelPhaseTest.scene.ui,timer=ui.getByName('duel-phase-timer');return {text:timer?.text,phase:timer?.getData('phase'),state:timer?.getData('state'),active:timer?.getData('active'),oldTimers:['duel-preparation-timer','duel-battle-timer','duel-total-timer'].some(name=>ui.getByName(name))};});
 assert.deepEqual(actual,{text,phase,state,active,oldTimers:false},label+' uses one current-phase clock');checks.push(label+' uses one current-phase clock '+text+' '+phase);
}
async function towerCards(page,label){
 await check(page,label+' tower cards use matching cropped artwork and real effects',async()=>{
  const {TOWERS}=await import('/src/towers.ts'),{artURL}=await import('/src/art.ts'),effects={slow:'감속 40% · 3초',stun:'기절 25% · 1.5초',range:'장거리 · 사거리 4칸'};
  const cards=[...document.querySelectorAll('.duel-preparation-tower:not([hidden])')];
  return cards.length===6&&cards.every(button=>{
   const t=TOWERS.find(t=>t.id===button.dataset.prepareType),art=button.querySelector('[data-tower-art]'),head=button.querySelector('[data-tower-art-head]'),base=button.querySelector('[data-tower-art-base]'),effect=button.querySelector('[data-tower-effect]');
   return t&&art?.dataset.towerId===t.id&&art.dataset.towerSheet===t.sheet&&art.dataset.towerFrame===String(t.frame)&&head?.getAttribute('viewBox')===`${t.frame%3*256} ${Math.floor(t.frame/3)*256} 256 256`&&head.querySelector('image')?.getAttribute('href')===artURL('tower-heads-'+t.sheet+'-v1')&&base?.getAttribute('viewBox')==='0 0 256 256'&&base.querySelector('image')?.getAttribute('href')===artURL('turret-parts-v1')&&getComputedStyle(head).overflow==='hidden'&&getComputedStyle(base).overflow==='hidden'&&effect?.hidden===(t.effect==='basic')&&effect.textContent===(effects[t.effect]||'');
  });
 });
}
async function exercise(page,label,side,touch){
 const popup=page.locator('.duel-preparation-panel');
 assert.equal(await popup.isVisible(),false,label+' no preparation popup before ready');
 await assertClock(page,label+' waiting','03:00','preparation','waiting',false);
 await control(page,'ready',touch);
 await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.status==='preparing');
 await popup.waitFor({state:'visible'});
 if(side===1){
  await page.evaluate(()=>window.__duelPhaseTest.selectSide(1));
  await popup.waitFor({state:'visible'});
  await activate(popup.locator('[data-preparation-tab="heroes"]'),touch);
  await page.waitForFunction(()=>!window.__duelPhaseTest.peer.state.players[1].quote&&!window.__duelPhaseTest.view().busy);
 }
 await page.evaluate(()=>window.__duelPhaseTest.advancePreparation(0));
 await assertClock(page,label+' preparation','03:00','preparation','active',true);
 await fitted(page,label,'preparing-popup');
 await popupFits(page,label);
 await check(page,label+' popup disables canvas input',()=>!window.__duelPhaseTest.scene.input.enabled);
 await check(page,label+' map has no preparation arithmetic controls',()=>![...window.__duelPhaseTest.scene.controls.keys()].some(id=>id==='fuse'||id.startsWith('block:')||id.startsWith('slot:')));
 assert.equal(await popup.locator('[data-answer-index]').count(),16,label+' has sixteen answer candidates');
 assert.match(await popup.locator('[data-preparation-question]').innerText(),/\+/);
 assert.match(await popup.locator('[data-preparation-progress]').innerText(),/다음 단계.*\d개|최고 단계/,label+' shows every-five progression');
 assert.ok((await popup.innerText()).includes('소환석'),label+' shows summon stone count');
 checks.push(label+' popup has fixed addition, 16 choices, progress and summon stones');
 await snapshot(page,label,'hero-popup');

 const original=await currentPlayer(page);
 const wrong=await answerIndex(page,false);
 await activate(popup.locator('[data-answer-index="'+wrong+'"]'),touch);
 await activate(popup.locator('[data-preparation-confirm]'),touch);
 await page.waitForFunction(round=>!window.__duelPhaseTest.view().busy&&window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].round===round,original.round);
 const afterWrong=await currentPlayer(page);
 assert.deepEqual({round:afterWrong.round,egg:afterWrong.egg,solved:afterWrong.solved,question:afterWrong.heroQuestion,board:afterWrong.board,money:afterWrong.money},{round:original.round,egg:original.egg,solved:original.solved,question:original.heroQuestion,board:original.board,money:original.money},label+' wrong hero answer preserves board, round, coins and growth');
 assert.ok(afterWrong.fusionWrongAttempts>=(original.fusionWrongAttempts||0)+1,label+' wrong answer records attempt');
 checks.push(label+' wrong answer preserves current hero problem');

 const correct=await answerIndex(page,true);
 await activate(popup.locator('[data-answer-index="'+correct+'"]'),touch);
 const fuseCalls=await page.evaluate(()=>window.__duelPhaseTest.sentActions.filter(item=>(item.action?.type||item.type)==='fuse').length);
 await page.evaluate(()=>window.__duelPhaseTest.setSendDelay(500));
 await popup.locator('[data-preparation-confirm]').focus();
 await page.keyboard.press('Enter');
 await page.waitForFunction(()=>window.__duelPhaseTest.view().busy);
 assert.equal(await popup.locator('[data-preparation-confirm]').isDisabled(),true,label+' confirm disabled while sending');
 assert.equal(await popup.locator('[data-answer-index]:enabled').count(),0,label+' choices disabled while sending');
 await page.keyboard.press('Enter');
 const disabledBox=await popup.locator('[data-answer-index="'+correct+'"] ').boundingBox();
 if(touch)await page.touchscreen.tap(disabledBox.x+disabledBox.width/2,disabledBox.y+disabledBox.height/2);else await page.mouse.click(disabledBox.x+disabledBox.width/2,disabledBox.y+disabledBox.height/2);
 await page.waitForFunction(round=>!window.__duelPhaseTest.view().busy&&window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].round===round+1,original.round);
 await page.evaluate(()=>window.__duelPhaseTest.setSendDelay(0));
 const afterBusy=await currentPlayer(page);
 assert.equal(afterBusy.egg,original.egg+1,label+' keyboard plus busy duplicates awards exactly one stone');
 assert.equal(afterBusy.solved,original.solved+1,label+' keyboard plus busy duplicates advances exactly one round');
 assert.equal(await page.evaluate(()=>window.__duelPhaseTest.sentActions.filter(item=>(item.action?.type||item.type)==='fuse').length),fuseCalls+1,label+' busy keyboard and pointer submit exactly one action');
 checks.push(label+' keyboard confirm and busy touch prevention advance one round');
 for(let i=1;i<5;i++){
  const before=await currentPlayer(page),index=await answerIndex(page,true);
  await activate(popup.locator('[data-answer-index="'+index+'"]'),touch);
  await activate(popup.locator('[data-preparation-confirm]'),touch);
  await page.waitForFunction(round=>window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].round===round+1&&!window.__duelPhaseTest.view().busy,before.round);
 }
 const grown=await currentPlayer(page);
 assert.equal(grown.solved,original.solved+5,label+' five correct answers count');
 assert.equal(grown.egg,original.egg+5,label+' five correct answers earn five stones');
 assert.equal(await page.evaluate(async()=>{const api=window.__duelPhaseTest,{duelHeroLearningLevel}=await import('/src/multiplayer/duel.ts');return duelHeroLearningLevel(api.peer.state.players[api.view().side]);}),Math.min(4,1+Math.floor(grown.solved/5)),label+' learning stage follows every five answers');
 checks.push(label+' five correct answers advance the learning stage');

 await activate(popup.locator('[data-preparation-tab="towers"]'),touch);
 await towerCards(page,label+' page1');
 await activate(popup.locator('[data-preparation-page="next"]'),touch);
 await towerCards(page,label+' page2');
 await activate(popup.locator('[data-preparation-page="prev"]'),touch);
 await activate(popup.locator('[data-prepare-type="basic"]'),touch);
 await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].quote&&!window.__duelPhaseTest.view().busy);
 const quoted=await currentPlayer(page),q=quoted.quote;
 assert.equal(await popup.locator('[data-preparation-buy]').innerText(),'정답 제출',label+' tower submit label');
 assert.equal(await popup.locator('[data-preparation-cancel]').innerText(),'취소',label+' tower cancel label');
 assert.equal(quoted.money,grown.money,label+' opening tower calculation preserves wallet');
 assert.ok(q.before<=q.wallet&&q.cost<=q.before,label+' tower calculation uses available coins');
 assert.match(await popup.locator('[data-preparation-equation]').innerText(),/−|-/);
 await popup.locator('input[name="answer"]').fill('0');
 await activate(popup.locator('[data-preparation-buy]'),touch);
 await page.waitForFunction(()=>!window.__duelPhaseTest.view().busy);
 const wrongTower=await currentPlayer(page);
 assert.equal(wrongTower.quote.nonce,q.nonce,label+' wrong tower answer keeps quote');
 assert.equal(wrongTower.money,grown.money,label+' wrong tower answer keeps all coins');
 assert.deepEqual(wrongTower.stock,grown.stock,label+' wrong tower answer does not award a tower');
 await popup.locator('input[name="answer"]').fill('');
 for(const key of String((q.before-q.cost)/1000))await activate(popup.locator('[data-preparation-key="'+key+'"]'),touch);
 assert.equal(await popup.locator('input[name="answer"]').inputValue(),String((q.before-q.cost)/1000),label+' decimal keypad inputs exact answer');
 await activate(popup.locator('[data-preparation-buy]'),touch);
 await page.waitForFunction(()=>!window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].quote&&!window.__duelPhaseTest.view().busy);
 const bought=await currentPlayer(page);
 assert.equal(bought.money,q.wallet-q.cost,label+' correct answer deducts only tower cost');
 assert.equal(bought.stock.basic,(grown.stock.basic||0)+1,label+' correct answer stocks one tower');
 assert.equal(bought.egg,grown.egg,label+' tower purchase preserves stones');
 checks.push(label+' tower subtraction accepts touch keypad and stocks one tower');
 await snapshot(page,label,'tower-popup');
 await popupFits(page,label+' tower-picker');

 await activate(popup.locator('[data-prepare-type="basic"]'),touch);
 await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].quote&&!window.__duelPhaseTest.view().busy);
 await popupFits(page,label+' tower-calculation');
 await activate(popup.locator('[data-preparation-tab="heroes"]'),touch);
 await page.waitForFunction(()=>!window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].quote&&!window.__duelPhaseTest.view().busy);
 const switched=await currentPlayer(page);
 assert.equal(switched.money,bought.money,label+' switching back to heroes preserves coins');
 assert.equal(switched.egg,bought.egg,label+' switching back to heroes preserves stones');
 assert.equal(await popup.locator('[data-answer-index]').count(),16,label+' hero grid returns after tab switch');
 checks.push(label+' hero/tower switches preserve coins and earned growth');

 await activate(popup.locator('[data-preparation-close]'),touch);
 await popup.waitFor({state:'hidden'});
 await check(page,label+' manual popup closure restores keyboard focus to map',()=>document.activeElement===document.querySelector('canvas'));
 await fitted(page,label,'preparing-map');
 await check(page,label+' closing preparation restores map input',()=>window.__duelPhaseTest.scene.input.enabled);
 await control(page,'prepare:heroes',touch);
 await popup.waitFor({state:'visible'});
 assert.equal((await currentPlayer(page)).egg,bought.egg,label+' reopening preserves stones');
 checks.push(label+' popup can close for map view and reopen');
 await activate(popup.locator('[data-preparation-tab="towers"]'),touch);
 await activate(popup.locator('[data-prepare-type="basic"]'),touch);
 await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].quote&&!window.__duelPhaseTest.view().busy);
 const boundaryBefore=await page.evaluate(()=>window.__duelPhaseTest.peer.state.players.map(p=>({stock:structuredClone(p.stock),egg:p.egg,money:p.money})));
 const at179=await page.evaluate(()=>{const api=window.__duelPhaseTest;api.advancePreparation(179);return {status:api.peer.state.status,elapsed:api.peer.state.preparationElapsed,popup:api.preparationPanel.visible};});
 assert.equal(at179.status,'preparing',label+' remains preparing at 179 seconds');
 assert.equal(at179.elapsed,179,label+' exact preparation time at 179 seconds');
 assert.equal(await popup.isVisible(),true,label+' popup remains visible at 179 seconds');
 await assertClock(page,label+' 179 seconds','00:01','preparation','active',true);
 assert.equal(await popup.locator('[data-preparation-clock]').innerText(),'00:01',label+' popup shows one second left');
 await page.evaluate(()=>window.__duelPhaseTest.advancePreparation(180));
 await popup.waitFor({state:'hidden'});
 await check(page,label+' automatic popup closure restores keyboard focus to map',()=>document.activeElement===document.querySelector('canvas'));
 await assertClock(page,label+' 180 seconds','03:00','battle','active',true);
 const boundaryAfter=await page.evaluate(()=>{const api=window.__duelPhaseTest;return {status:api.peer.state.status,elapsed:api.peer.state.preparationElapsed,players:api.peer.state.players.map(p=>({stock:structuredClone(p.stock),egg:p.egg,money:p.money,quote:p.quote,escrow:p.escrow}))};});
 assert.equal(boundaryAfter.status,'playing',label+' battle starts at 180 seconds');
 assert.equal(boundaryAfter.elapsed,180,label+' preparation time clamps to exactly three minutes');
 boundaryAfter.players.forEach((p,index)=>{assert.equal(p.money,0,label+' player '+index+' unused coins discarded');assert.equal(p.escrow,0,label+' player '+index+' escrow discarded');assert.equal(p.quote,null,label+' player '+index+' unfinished calculation closes');assert.deepEqual(p.stock,boundaryBefore[index].stock,label+' player '+index+' tower stock survives');assert.equal(p.egg,boundaryBefore[index].egg,label+' player '+index+' summon stones survive');});
 await check(page,label+' battle restores map input with no arithmetic controls',()=>window.__duelPhaseTest.scene.input.enabled&&![...window.__duelPhaseTest.scene.controls.keys()].some(id=>id==='fuse'||id.startsWith('block:')||id.startsWith('slot:')||id==='prepare:heroes'));
 await fitted(page,label,'playing');
 await snapshot(page,label,'battle');
 checks.push(label+' exact three-minute transition closes popup, discards unspent money and keeps earned tower stock/stones');

 const location=await page.evaluate(async()=>{const api=window.__duelPhaseTest,{validDuelCell}=await import('/src/multiplayer/duel.ts');for(let y=api.view().side===0?0:8;y<(api.view().side===0?7:15);y++)for(let x=2;x<=21;x++)if(validDuelCell(api.peer.state,api.view().side,x,y))return{x,y};throw Error('No legal own-lane cell');});
 const beforeBuild=await currentPlayer(page);
 await control(page,'type:basic',touch);
 await cell(page,location.x,location.y,touch);
 await page.waitForFunction(count=>window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].towers.length===count+1,beforeBuild.towers.length);
 const afterBuild=await currentPlayer(page),placed=afterBuild.towers.find(t=>t.x===location.x&&t.y===location.y);
 assert.ok(placed.prepared,label+' reserved stock installs as a prepared tower');
 assert.equal(afterBuild.stock.basic,beforeBuild.stock.basic-1,label+' free placement consumes one stock');
 assert.equal(afterBuild.money,0,label+' free placement requires zero battle coins');
 await cell(page,location.x,location.y,touch);
 await control(page,'sell',touch);
 await page.waitForFunction(count=>window.__duelPhaseTest.peer.state.players[window.__duelPhaseTest.view().side].towers.length===count,beforeBuild.towers.length);
 const recovered=await currentPlayer(page);
 assert.equal(recovered.stock.basic,beforeBuild.stock.basic,label+' recovered prepared tower returns to stock');
 assert.equal(recovered.money,0,label+' recovering prepared tower creates no coins');
 checks.push(label+' zero-coin battle permits own-lane stock placement and recovery');
 await page.evaluate(()=>{const api=window.__duelPhaseTest;api.peer.state.players[api.view().side].heroStock={'hero-5-0':1,'hero-6-1':1,'hero-7-2':1,'hero-8-0':1};api.scene.redraw();});
 await fitted(page,label,'playing-legacy-heroes');
 if(await page.evaluate(()=>window.__duelPhaseTest.scene.controls.get('heroes:next')?.enabled)){
  await control(page,'heroes:next',touch);
  await fitted(page,label,'playing-legacy-heroes-next');
  await control(page,'heroes:prev',touch);
 }
}

(async()=>{
 const browser=await chromium.launch({headless:true,args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'],executablePath:'C:/Users/user/AppData/Local/ms-playwright/chromium_headless_shell-1228/chrome-headless-shell-win64/chrome-headless-shell.exe'});
 try{
  for(const [label,width,height]of screens){
   const requestedScreen=process.env.PREPARATION_POPUP_SCREEN||process.env.DUEL_PHASE_SCREEN;
   if(requestedScreen&&requestedScreen!==label)continue;
   for(const side of [0,1]){
    if(process.env.PREPARATION_POPUP_SIDE&&Number(process.env.PREPARATION_POPUP_SIDE)!==side)continue;
    currentLabel=label+'-side-'+side;
    const page=await browser.newPage({viewport:{width,height},hasTouch:label.startsWith('phone')});
    currentPage=page;page.setDefaultTimeout(10000);
    page.on('pageerror',error=>errors.push(currentLabel+': '+error.message));
    await page.goto(url);
    await page.waitForFunction(()=>window.__duelPhaseTest?.scene.ready);
    await page.waitForFunction(()=>JSON.parse(document.getElementById('landscape-proof').textContent||'{}').screenReady);
    await fitted(page,currentLabel,'waiting');
    await exercise(page,currentLabel,side,label.startsWith('phone'));
    console.log(currentLabel+' passed');
    await page.close();
   }
  }
  assert.deepEqual(errors,[],'no browser runtime errors');
  fs.writeFileSync(path.join(output,'results.json'),JSON.stringify({checks,errors,geometry},null,2));
  console.log(JSON.stringify({passed:checks.length,errors,output},null,2));
 }catch(error){
  if(currentPage&&!currentPage.isClosed()){
   await snapshot(currentPage,currentLabel,'failure');
   const state=await currentPage.evaluate(()=>({status:window.__duelPhaseTest?.peer.state.status,side:window.__duelPhaseTest?.view().side,player:window.__duelPhaseTest?.peer.state.players[window.__duelPhaseTest?.view().side||0],body:document.body.innerText,popup:document.querySelector('.duel-preparation-panel')?.outerHTML,controls:[...(window.__duelPhaseTest?.scene.controls||[])].map(([id,c])=>({id,x:c.x,y:c.y,w:c.w,h:c.h,enabled:c.enabled}))}));
   fs.writeFileSync(path.join(output,currentLabel+'-failure.json'),JSON.stringify({error:String(error),checks,errors,geometry,state},null,2));
  }
  throw error;
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
