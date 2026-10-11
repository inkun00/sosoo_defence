const {chromium}=require('playwright');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {launchOptions}=require('./browser-helpers.cjs');
const dir=path.resolve('test-results/duel-zoom'),errors=[],results=[];
const url=process.env.DUEL_ZOOM_URL||'http://127.0.0.1:5173/tools/duel-purchase-preview.html';
async function reveal(page,x,y){
 await page.evaluate(({x,y})=>{const v=document.getElementById('duel-viewport'),c=document.querySelector('canvas'),b=c.getBoundingClientRect(),r=v.getBoundingClientRect();v.scrollTo({left:v.scrollLeft+b.left+x*b.width/c.width-r.left-v.clientWidth/2,top:v.scrollTop+b.top+y*b.height/c.height-r.top-v.clientHeight/2});},{x,y});
 await page.waitForTimeout(100);return page.evaluate(({x,y})=>{const c=document.querySelector('canvas'),b=c.getBoundingClientRect();return {x:b.left+x*b.width/c.width,y:b.top+y*b.height/c.height};},{x,y});
}
async function control(page,id,touch){
 await page.waitForFunction(id=>{const api=window.__duelPhaseTest;return !api.view().busy&&api.scene.input.enabled&&api.scene.controls.get(id)?.enabled;},id);
 const before=await page.evaluate(()=>window.__zoomActions.length);
 const c=await page.evaluate(id=>{const c=window.__duelPhaseTest.scene.controls.get(id);if(!c?.enabled)throw Error('Disabled '+id);return{x:c.x,y:c.y};},id),p=await reveal(page,c.x,c.y);
 if(touch)await page.touchscreen.tap(p.x,p.y);else{await page.mouse.move(p.x,p.y);await page.waitForTimeout(100);await page.mouse.click(p.x,p.y,{delay:80});}
 await page.waitForFunction(({id,before})=>window.__zoomActions.slice(before).includes(id),{id,before});
 await page.waitForTimeout(100);
 assert.deepEqual(await page.evaluate(before=>window.__zoomActions.slice(before),before),[id],'one action per '+(touch?'tap: ':'click: ')+id);
}
(async()=>{
 fs.mkdirSync(dir,{recursive:true});const browser=await chromium.launch({headless:true,...launchOptions()});
 try{
  for(const [name,width,height,touch]of [['desktop',1366,913,false],['reference',982,861,false],['large',1920,1080,false],['portrait',390,844,true],['landscape',844,390,true],['small',568,320,true]]){
   const context=await browser.newContext({viewport:{width,height},hasTouch:touch,isMobile:touch,reducedMotion:'reduce'}),page=await context.newPage();page.setDefaultTimeout(15000);page.on('pageerror',e=>errors.push(name+': '+e.message));
   await page.goto(url);
   await page.waitForFunction(()=>window.__duelPhaseTest?.scene.ready&&JSON.parse(document.getElementById('landscape-proof').textContent||'{}').screenReady);
   const geometry=await page.evaluate(async()=>{
    const {duelScreenLayout}=await import('/src/responsive-game.ts'),v=document.getElementById('duel-viewport'),r=v.getBoundingClientRect(),c=document.querySelector('canvas'),b=c.getBoundingClientRect(),base=duelScreenLayout(r.width,r.height);
    return {viewport:{width:r.width,height:r.height},canvas:{width:b.width,height:b.height,left:b.left,top:b.top,logicalWidth:c.width,logicalHeight:c.height},base:{width:1280*base.scale,height:base.height*base.scale},scroll:{width:v.scrollWidth,height:v.scrollHeight,clientWidth:v.clientWidth,clientHeight:v.clientHeight},touchAction:getComputedStyle(c).touchAction,capture:window.__duelPhaseTest.scene.game.input.touch.capture};
   });
   assert.ok(Math.abs(geometry.canvas.width/geometry.base.width-1.3)<.002,name+' width enlarged30%');
   assert.ok(Math.abs(geometry.canvas.height/geometry.base.height-1.3)<.002,name+' height enlarged30%');
   assert.ok(Math.abs(geometry.canvas.width/geometry.canvas.height-geometry.canvas.logicalWidth/geometry.canvas.logicalHeight)<.002,name+' artwork aspect ratio');
   assert.ok(geometry.scroll.width>=geometry.canvas.width-1&&geometry.scroll.height>=geometry.canvas.height-1);
   assert.equal(geometry.touchAction,'pan-x pan-y');assert.equal(geometry.capture,false);
   await page.evaluate(()=>{const s=window.__duelPhaseTest.scene,action=s.onAction,cell=s.onCell;window.__zoomActions=[];window.__zoomCells=[];s.onAction=id=>{window.__zoomActions.push(id);action(id);};s.onCell=(x,y)=>{window.__zoomCells.push([x,y]);cell(x,y);};});
   if(touch){
    const v=await page.locator('#duel-viewport').boundingBox(),vertical=geometry.scroll.height>geometry.scroll.clientHeight+5;
    await page.evaluate(()=>document.getElementById('duel-viewport').scrollTo(0,0));await page.waitForTimeout(100);
    const start={x:v.x+Math.min(v.width/2,200),y:v.y+Math.min(v.height*.7,200)},delta=90,cdp=await context.newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[start]});
    for(let i=1;i<=6;i++){await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{x:start.x-(vertical?0:delta*i/6),y:start.y-(vertical?delta*i/6:0)}]});await page.waitForTimeout(30);}
    await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});await page.waitForTimeout(400);
    const swipe=await page.evaluate(()=>({x:document.getElementById('duel-viewport').scrollLeft,y:document.getElementById('duel-viewport').scrollTop,actions:window.__zoomActions,cells:window.__zoomCells}));
    assert.ok(vertical?swipe.y>20:swipe.x>20,name+' native touch scroll');assert.deepEqual(swipe.actions,[]);assert.deepEqual(swipe.cells,[]);
    geometry.swipe=swipe;
   }
   await control(page,'ready',touch);await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.status==='preparing');
   await control(page,'type:basic',touch);await page.locator('.duel-purchase-panel').waitFor({state:'visible'});
   const panel=await page.evaluate(()=>{const p=document.querySelector('.duel-purchase-panel').getBoundingClientRect(),c=document.querySelector('canvas').getBoundingClientRect(),area=window.__duelPhaseTest.scene.getPurchaseArea(),scale=c.width/1280;return {left:p.left,top:p.top,width:p.width,height:p.height,expectedLeft:c.left+area.x*scale,expectedTop:c.top+area.y*scale,expectedWidth:area.width*scale,expectedHeight:area.height*scale};});
   assert.ok(Math.abs(panel.left-panel.expectedLeft)<2&&Math.abs(panel.top-panel.expectedTop)<2&&Math.abs(panel.width-panel.expectedWidth)<2&&Math.abs(panel.height-panel.expectedHeight)<2,name+' DOM keypad tracks scaled canvas');
   await page.locator('.duel-purchase-panel [data-cancel]').click();await page.waitForFunction(()=>!window.__duelPhaseTest.peer.state.players[0].quote);
   if(touch){
    const before=await page.evaluate(()=>window.__zoomCells.length),boardY=await page.evaluate(()=>window.__duelPhaseTest.scene.boardY),point=await reveal(page,37+3.5*38,boardY+2.5*38);
    await page.touchscreen.tap(point.x,point.y);await page.waitForTimeout(100);
    assert.deepEqual(await page.evaluate(before=>window.__zoomCells.slice(before),before),[[3,2]],name+' one cell per native tap');
    // Safari lacks sourceCapabilities; both tagged and untagged compatibility
    // mouse events must leave the accepted touch tap as a single placement.
    await page.evaluate(point=>{const canvas=document.querySelector('canvas');for(const tagged of [true,false])for(const type of ['mousedown','mouseup']){const event=new MouseEvent(type,{clientX:point.x,clientY:point.y,button:0,buttons:type==='mousedown'?1:0,bubbles:true,cancelable:true});if(tagged)Object.defineProperty(event,'sourceCapabilities',{value:{firesTouchEvents:true}});canvas.dispatchEvent(event);} },point);
    await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.__zoomCells.length),before+1,name+' suppresses compatibility mouse taps');
    await page.mouse.move(point.x,point.y);await page.mouse.click(point.x,point.y,{delay:80});await page.waitForTimeout(100);
    assert.equal(await page.evaluate(()=>window.__zoomCells.length),before+2,name+' physical mouse still works after touch');
   }
   const index=await page.evaluate(()=>{const p=window.__duelPhaseTest.peer.state.players[0];return p.board.indexOf(p.heroQuestion.a+p.heroQuestion.b);});
   while(!await page.evaluate(i=>window.__duelPhaseTest.scene.controls.has('block:'+i),index))await control(page,'blocks:page',touch);
   await control(page,'block:'+index,touch);await control(page,'fuse',touch);await page.waitForFunction(()=>window.__duelPhaseTest.peer.state.players[0].solved===1);
   assert.equal(await page.evaluate(()=>window.__duelPhaseTest.peer.state.players[0].egg),1);
   await page.evaluate(()=>document.getElementById('duel-viewport').scrollTo(0,0));await page.waitForTimeout(100);await page.screenshot({path:path.join(dir,name+'-top.png')});
   await page.evaluate(()=>{const v=document.getElementById('duel-viewport');v.scrollTop=v.scrollHeight;});await page.waitForTimeout(100);await page.screenshot({path:path.join(dir,name+'-bottom.png')});
   if(name==='portrait'){
    await page.setViewportSize({width:844,height:390});await page.waitForFunction(()=>{const p=JSON.parse(document.getElementById('landscape-proof').textContent||'{}');return p.screenReady&&p.viewport?.[0]===844;});
    await control(page,'type:basic',true);await page.locator('.duel-purchase-panel').waitFor({state:'visible'});await page.locator('[data-cancel]').click();
    assert.equal(await page.evaluate(()=>window.__duelPhaseTest.peer.state.players[0].solved),1);
   }
   results.push({name,geometry,panel});await context.close();console.log('PASS '+name+' exact30%, aspect, scrolling and real answer input');
  }
  assert.deepEqual(errors,[]);fs.writeFileSync(path.join(dir,'report.json'),JSON.stringify({status:'PASS',results,errors},null,2));console.log(JSON.stringify({status:'PASS',viewports:results.length}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
