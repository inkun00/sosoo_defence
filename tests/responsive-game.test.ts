import test,{type TestContext} from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {gameScreenLayout,duelScreenLayout,duelScreenDisplayLayout,observeDuelScreen,observeGameScreen,type GameScreenLayout} from '../src/responsive-game';

test('short landscape phones use a compact logical height with one uniform scale',()=>{
 for(const [width,height] of [[568,320],[667,375],[844,390],[915,412],[932,430]]){
  const layout=gameScreenLayout(width,height);
  assert.equal(layout.compact,true);assert.ok(layout.height>=600&&layout.height<=800);
  assert.ok(layout.width*layout.scale<=width+.01);assert.ok(layout.height*layout.scale<=height+.01);
  assert.ok(layout.width*layout.scale/width>=.95);
  const oldScale=Math.min(width/1280,height/800);
  assert.ok(layout.scale>oldScale);
 }
});
test('tablets, desktop and portrait keep the original composition',()=>{
 for(const [width,height] of [[1024,768],[1180,820],[1366,1024],[1575,884],[390,844]]){
  const layout=gameScreenLayout(width,height);assert.equal(layout.compact,false);assert.equal(layout.height,800);
  assert.equal(layout.scale,Math.min(width/1280,height/800));
 }
});
test('a shorter browser toolbar viewport never crops the canvas or stretches artwork',()=>{
 const expanded=gameScreenLayout(844,390),shortened=gameScreenLayout(844,330);
 assert.equal(expanded.height,600);assert.equal(shortened.height,600);
 assert.ok(shortened.scale<expanded.scale);assert.ok(shortened.width*shortened.scale<=844);
 assert.equal(shortened.height*shortened.scale,330);
});
test('invalid measurements remain finite while the game waits for a visible parent',()=>{
 for(const [width,height] of [[0,0],[NaN,Infinity],[-2,320]]){
  const layout=gameScreenLayout(width,height);assert.ok(layout.scale>0&&Number.isFinite(layout.scale));
  assert.ok(Number.isFinite(layout.height));
 }
});

test('duel keeps independent upper and lower fields and both 44px answer rows visible',()=>{
 for(const [width,height] of [[568,271],[667,326],[844,281],[844,341],[1024,719],[390,844],[375,667],[700,1200],[720,1280],[768,1024],[1024,650]]){
  const layout=duelScreenLayout(width,height),touch=Math.max(68,Math.ceil(44/layout.scale));
  assert.ok(layout.width*layout.scale<=width+.01);
  assert.ok(layout.height*layout.scale<=height+.01);
  if(layout.compact){
   assert.ok(touch*layout.scale>=44);
   assert.ok(3*touch+673<=layout.height-8,'both fields and last answer row remain above the bottom margin');
  }
 }
 for(const [width,height] of [[1280,720],[1024,768]]){
  const layout=duelScreenLayout(width,height);assert.equal(layout.height,1104);
  assert.equal(layout.scale,Math.min(width/1280,height/1104));
 }
 assert.ok(duelScreenLayout(390,844).compact,'narrow portrait duel pages answers into two touch rows');
 assert.ok(duelScreenLayout(768,1024).compact,'four answer rows reflow before minimum touch height would clip');
 assert.ok(duelScreenLayout(1024,650).compact,'short screens reflow even when aspect ratio is below the adventure threshold');
 assert.equal(gameScreenLayout(390,844).compact,false,'adventure layout stays independent');
});

test('duel display is exactly 30% larger on both axes without changing the fitted composition',()=>{
 for(const [width,height] of [[982,813],[1280,752],[1024,720],[844,342],[390,844],[568,271],[768,1024]]){
  const base=duelScreenLayout(width,height),display=duelScreenDisplayLayout(width,height);
  const {scale:baseScale,...baseComposition}=base,{scale:displayScale,...displayComposition}=display;
  assert.deepEqual(displayComposition,baseComposition,'logical size, paging and measured viewport remain unchanged');
  assert.ok(Math.abs(displayScale/baseScale-1.3)<1e-12);
  assert.ok(Math.abs(display.width*displayScale/(base.width*baseScale)-1.3)<1e-12);
  assert.ok(Math.abs(display.height*displayScale/(base.height*baseScale)-1.3)<1e-12);
  assert.ok(Math.abs((display.width*displayScale)/(display.height*displayScale)-base.width/base.height)<1e-12,'one scale preserves artwork proportions');
  assert.ok(display.width*displayScale>width||display.height*displayScale>height,'the enlarged composition uses scroll space instead of silently clamping back to FIT');
 }
 for(const [width,height] of [[0,0],[NaN,Infinity],[-2,320]]){
  const layout=duelScreenDisplayLayout(width,height);assert.ok(Number.isFinite(layout.scale)&&layout.scale>0);
 }
});

function duelObserverEnvironment(t:TestContext){
 const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),originalObserver=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
 const target=()=>{
  const listeners=new Map<string,Set<()=>void>>();
  return {listeners,addEventListener(type:string,listener:()=>void){const set=listeners.get(type)??new Set();set.add(listener);listeners.set(type,set);},removeEventListener(type:string,listener:()=>void){listeners.get(type)?.delete(listener);},emit(type:string){for(const listener of [...listeners.get(type)??[]])listener();}};
 };
 const windowTarget=target(),visualViewport=target(),observers:StubResizeObserver[]=[],disposers:Array<()=>void>=[];
 class StubResizeObserver{
  observed:unknown;disconnects=0;
  constructor(readonly callback:()=>void){observers.push(this);}
  observe(value:unknown){this.observed=value;}
  disconnect(){this.disconnects++;}
 }
 Object.defineProperty(globalThis,'window',{configurable:true,value:{...windowTarget,visualViewport}});
 Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:StubResizeObserver});
 t.after(()=>{for(const dispose of disposers)dispose();if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');if(originalObserver)Object.defineProperty(globalThis,'ResizeObserver',originalObserver);else Reflect.deleteProperty(globalThis,'ResizeObserver');});
 const screen=(width:number,height:number,booted=true)=>{
  let box={width,height,left:12,top:48};
  const viewport={...target(),scrollLeft:0,scrollTop:0,getBoundingClientRect:()=>box};
  const field={style:{width:'',height:''},dataset:{} as Record<string,string>,getBoundingClientRect:()=>{throw Error('The enlarged field must never drive the display calculation');}};
  const events=new EventEmitter(),calls:string[]=[],layouts:GameScreenLayout[]=[];
  let parent={width:0,height:0},bounds={left:0,top:0};
  const expectedParent=()=>({width:parseFloat(field.style.width),height:parseFloat(field.style.height)});
  const scale={width:1280,height:1104,
   getParentBounds(){parent=expectedParent();const layout=duelScreenDisplayLayout(box.width,box.height);assert.deepEqual(parent,{width:layout.width*layout.scale,height:layout.height*layout.scale},'inner dimensions are applied before FIT reads its parent');calls.push('bounds');},
   setGameSize(width:number,height:number){assert.deepEqual(parent,expectedParent());this.width=width;this.height=height;calls.push('size');},
   refresh(){assert.deepEqual(parent,expectedParent(),'canvas refresh uses the current enlarged parent');calls.push('refresh');},
   updateBounds(){bounds={left:box.left-viewport.scrollLeft,top:box.top-viewport.scrollTop};calls.push('scroll-bounds');},
  };
  const game={isBooted:booted,scale,events};
  const dispose=observeDuelScreen(game as unknown as Parameters<typeof observeDuelScreen>[0],viewport as unknown as HTMLElement,field as unknown as HTMLElement,layout=>{assert.deepEqual(expectedParent(),{width:layout.width*layout.scale,height:layout.height*layout.scale});layouts.push(layout);calls.push('changed');});
  disposers.push(dispose);
  return {viewport,field,events,game,calls,layouts,dispose,observer:observers.at(-1)!,setBox(width:number,height:number){box={...box,width,height};},get parent(){return parent;},get bounds(){return bounds;}};
 };
 return {windowTarget,visualViewport,observers,screen};
}

test('duel observer sizes the inner field before boot and FIT, follows rotation, and refreshes scrolled pointer bounds',t=>{
 const env=duelObserverEnvironment(t),screen=env.screen(390,844,false);
 assert.equal(screen.observer.observed,screen.viewport,'observe the fixed scroll viewport rather than the changing field');
 assert.equal(screen.field.dataset.screenLayout,'compact');assert.deepEqual(screen.calls,['changed']);
 assert.equal(screen.layouts[0].pixelWidth,390);assert.equal(screen.layouts[0].pixelHeight,844);
 screen.calls.length=0;screen.game.isBooted=true;screen.events.emit('ready');
 assert.deepEqual(screen.calls,['bounds','size','changed','refresh'],'ready retries FIT even though viewport measurements are unchanged');
 assert.equal(screen.game.scale.height,duelScreenLayout(390,844).height);

 screen.calls.length=0;screen.setBox(1024,720);env.visualViewport.emit('resize');
 assert.equal(screen.field.dataset.screenLayout,'standard');assert.equal(screen.game.scale.height,1104);
 assert.deepEqual(screen.calls,['bounds','size','changed','refresh']);
 screen.calls.length=0;screen.setBox(1280,752);env.windowTarget.emit('resize');
 assert.deepEqual(screen.calls,['bounds','changed','refresh'],'same logical height still updates its physical 30% enlargement');
 const layout=screen.layouts.at(-1)!;assert.equal(layout.scale,duelScreenLayout(1280,752).scale*1.3);
 screen.calls.length=0;for(let i=0;i<5;i++){screen.observer.callback();env.windowTarget.emit('resize');env.visualViewport.emit('resize');}
 assert.deepEqual(screen.calls,[],'inner sizing and repeated notifications cannot cause resize feedback');

 screen.viewport.scrollLeft=53;screen.viewport.scrollTop=217;screen.viewport.emit('scroll');
 assert.deepEqual(screen.calls,['scroll-bounds'],'scroll changes input bounds without changing composition or refreshing FIT');
 assert.deepEqual(screen.bounds,{left:12-53,top:48-217});
 const logicalPoint={x:700,y:900},pointer={x:screen.bounds.left+logicalPoint.x*layout.scale,y:screen.bounds.top+logicalPoint.y*layout.scale};
 assert.ok(Math.abs((pointer.x-screen.bounds.left)/layout.scale-logicalPoint.x)<1e-9);
 assert.ok(Math.abs((pointer.y-screen.bounds.top)/layout.scale-logicalPoint.y)<1e-9,'a scrolled control still maps to its logical pointer coordinate');

 screen.calls.length=0;screen.setBox(0,0);screen.observer.callback();assert.deepEqual(screen.calls,[],'hidden viewport does not resize the game');
 screen.dispose();screen.dispose();assert.equal(screen.observer.disconnects,1);assert.equal(screen.events.listenerCount('ready'),0);assert.equal(screen.events.listenerCount('destroy'),0);assert.equal(screen.viewport.listeners.get('scroll')?.size,0);
 screen.setBox(844,342);screen.observer.callback();screen.viewport.emit('scroll');env.windowTarget.emit('resize');env.visualViewport.emit('resize');screen.events.emit('ready');
 assert.deepEqual(screen.calls,[],'disposed callbacks cannot restore stale geometry');
 assert.equal(env.windowTarget.listeners.get('resize')?.size,0);assert.equal(env.visualViewport.listeners.get('resize')?.size,0);
});

test('concurrent duel observers retain independent viewport sizes and dispose on game destruction',t=>{
 const env=duelObserverEnvironment(t),first=env.screen(982,813),second=env.screen(844,342);
 assert.notEqual(first.observer,second.observer);assert.equal(first.observer.observed,first.viewport);assert.equal(second.observer.observed,second.viewport);
 first.calls.length=0;second.calls.length=0;first.dispose();
 assert.equal(env.windowTarget.listeners.get('resize')?.size,1);assert.equal(env.visualViewport.listeners.get('resize')?.size,1);
 first.setBox(390,844);second.setBox(568,271);env.windowTarget.emit('resize');
 assert.deepEqual(first.calls,[]);assert.deepEqual(second.calls,['bounds','size','changed','refresh']);
 assert.equal(second.layouts.at(-1)!.pixelWidth,568);assert.equal(second.layouts.at(-1)!.pixelHeight,271);
 second.calls.length=0;second.events.emit('destroy');second.dispose();
 assert.equal(second.observer.disconnects,1);assert.equal(second.events.listenerCount('ready'),0);assert.equal(second.events.listenerCount('destroy'),0);
 assert.equal(second.viewport.listeners.get('scroll')?.size,0);assert.equal(env.windowTarget.listeners.get('resize')?.size,0);assert.equal(env.visualViewport.listeners.get('resize')?.size,0);
 for(const observer of env.observers)observer.callback();first.viewport.emit('scroll');second.viewport.emit('scroll');env.windowTarget.emit('resize');env.visualViewport.emit('resize');second.events.emit('ready');
 assert.deepEqual(first.calls,[]);assert.deepEqual(second.calls,[],'destroyed and manually disposed games both ignore queued callbacks');
});

test('FIT reads fresh parent bounds before both same-height rotation and game-size changes, then disposes listeners',t=>{
 const originalWindow=Object.getOwnPropertyDescriptor(globalThis,'window'),originalObserver=Object.getOwnPropertyDescriptor(globalThis,'ResizeObserver');
 const target=()=>{
  const listeners=new Map<string,Set<()=>void>>();
  return {listeners,addEventListener(type:string,listener:()=>void){const set=listeners.get(type)??new Set();set.add(listener);listeners.set(type,set);},removeEventListener(type:string,listener:()=>void){listeners.get(type)?.delete(listener);},emit(type:string){for(const listener of listeners.get(type)??[])listener();}};
 };
 const windowTarget=target(),viewportTarget=target(),events=new EventEmitter(),calls:string[]=[];
 let box={width:844,height:390},parent={...box},observerCallback=()=>{},disconnects=0,observed:unknown,dispose:(()=>void)|undefined;
 const field={dataset:{} as Record<string,string>,getBoundingClientRect:()=>box};
 class StubResizeObserver{
  constructor(callback:()=>void){observerCallback=callback;}
  observe(value:unknown){observed=value;}
  disconnect(){disconnects++;}
 }
 const scale={width:1280,height:600,
  getParentBounds(){parent={...box};calls.push(`bounds:${parent.width}x${parent.height}`);},
  setGameSize(width:number,height:number){assert.deepEqual(parent,box,'FIT must read the new parent before resizing its game size');calls.push(`size:${width}x${height}`);this.width=width;this.height=height;},
  refresh(){assert.deepEqual(parent,box,'FIT must not scale using the previous viewport size');calls.push(`refresh:${parent.width}x${parent.height}`);},
 };
 Object.defineProperty(globalThis,'window',{configurable:true,value:{...windowTarget,visualViewport:viewportTarget}});
 Object.defineProperty(globalThis,'ResizeObserver',{configurable:true,value:StubResizeObserver});
 t.after(()=>{dispose?.();if(originalWindow)Object.defineProperty(globalThis,'window',originalWindow);else Reflect.deleteProperty(globalThis,'window');if(originalObserver)Object.defineProperty(globalThis,'ResizeObserver',originalObserver);else Reflect.deleteProperty(globalThis,'ResizeObserver');});
 dispose=observeGameScreen({isBooted:true,scale,events} as unknown as Parameters<typeof observeGameScreen>[0],field as unknown as HTMLElement,layout=>calls.push(`changed:${layout.pixelWidth}x${layout.pixelHeight}`));
 assert.equal(observed,field);assert.equal(field.dataset.screenLayout,'compact');
 assert.deepEqual(calls,['bounds:844x390','changed:844x390','refresh:844x390']);

 calls.length=0;box={width:915,height:412};observerCallback();
 assert.equal(scale.height,600,'both landscape sizes retain the same logical height');
 assert.deepEqual(calls,['bounds:915x412','changed:915x412','refresh:915x412']);

 calls.length=0;box={width:1024,height:768};viewportTarget.emit('resize');
 assert.equal(field.dataset.screenLayout,'standard');
 assert.deepEqual(calls,['bounds:1024x768','size:1280x800','changed:1024x768','refresh:1024x768']);
 calls.length=0;windowTarget.emit('resize');assert.deepEqual(calls,[],'duplicate geometry does not trigger another reflow');
 assert.equal(events.listenerCount('ready'),1);assert.equal(windowTarget.listeners.get('resize')?.size,1);assert.equal(viewportTarget.listeners.get('resize')?.size,1);

 events.emit('destroy');dispose();assert.equal(disconnects,1);assert.equal(events.listenerCount('ready'),0);
 assert.equal(windowTarget.listeners.get('resize')?.size,0);assert.equal(viewportTarget.listeners.get('resize')?.size,0);
 box={width:932,height:430};observerCallback();windowTarget.emit('resize');viewportTarget.emit('resize');events.emit('ready');assert.deepEqual(calls,[],'queued observer callbacks and later ready events are ignored after disposal');
});
