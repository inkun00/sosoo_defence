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

test('duel fits the full map and action strip on desktop, tablet and rotated phones',()=>{
 for(const [width,height] of [[568,271],[667,326],[844,281],[844,341],[1024,719],[390,844],[375,667],[700,1200],[720,1280],[768,1024],[1024,650],[1280,720],[982,813],[1280,752],[1920,1080]]){
  const layout=duelScreenLayout(width,height);
  assert.equal(layout.height,800,'moving preparation into a popup removes the lower crafting canvas');
  assert.equal(layout.scale,Math.min(width/1280,height/800),'both axes use one fitted scale');
  assert.ok(layout.width*layout.scale<=width+.01,'the complete map fits horizontally');
  assert.ok(layout.height*layout.scale<=height+.01,'the bottom action strip fits vertically');
  assert.ok(Math.abs(layout.width*layout.scale-width)<.01||Math.abs(layout.height*layout.scale-height)<.01,'FIT uses all available space on at least one axis');
 }
 assert.ok(duelScreenLayout(390,844).compact);
 assert.ok(duelScreenLayout(768,1024).compact);
 assert.ok(duelScreenLayout(1024,600).compact);
 assert.equal(duelScreenLayout(1024,768).compact,false);
 assert.equal(gameScreenLayout(390,844).compact,false,'adventure layout stays independent');
});

test('duel display follows the fitted layout without enlargement or narrow-screen height growth',()=>{
 for(const [width,height] of [[982,813],[1280,752],[1024,720],[844,342],[390,844],[568,271],[768,1024],[240,320],[320,132]]){
  const base=duelScreenLayout(width,height),display=duelScreenDisplayLayout(width,height);
  assert.deepEqual(display,base);
  assert.equal(display.height,800);
  assert.ok(display.width*display.scale<=width+.01);
  assert.ok(display.height*display.scale<=height+.01);
  assert.ok(Math.abs((display.width*display.scale)/(display.height*display.scale)-1280/800)<1e-12,'one scale preserves artwork proportions');
 }
 for(const [width,height] of [[0,0],[NaN,Infinity],[-2,320]]){
  const layout=duelScreenDisplayLayout(width,height);assert.ok(Number.isFinite(layout.scale)&&layout.scale>0);assert.equal(layout.height,800);
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
  const viewport={...target(),getBoundingClientRect:()=>box};
  const field={style:{width:'',height:''},dataset:{} as Record<string,string>,getBoundingClientRect:()=>{throw Error('The fitted field must never drive the display calculation');}};
  const events=new EventEmitter(),calls:string[]=[],layouts:GameScreenLayout[]=[];
  let parent={width:0,height:0};
  const expectedParent=()=>({width:parseFloat(field.style.width),height:parseFloat(field.style.height)});
  const scale={width:1280,height:1104,
   getParentBounds(){parent=expectedParent();const layout=duelScreenDisplayLayout(box.width,box.height);assert.deepEqual(parent,{width:layout.width*layout.scale,height:layout.height*layout.scale},'inner dimensions are applied before FIT reads its parent');calls.push('bounds');},
   setGameSize(width:number,height:number){assert.deepEqual(parent,expectedParent());this.width=width;this.height=height;calls.push('size');},
   refresh(){assert.deepEqual(parent,expectedParent(),'canvas refresh uses the current fitted parent');calls.push('refresh');},
  };
  const game={isBooted:booted,scale,events};
  const dispose=observeDuelScreen(game as unknown as Parameters<typeof observeDuelScreen>[0],viewport as unknown as HTMLElement,field as unknown as HTMLElement,layout=>{assert.deepEqual(expectedParent(),{width:layout.width*layout.scale,height:layout.height*layout.scale});layouts.push(layout);calls.push('changed');});
  disposers.push(dispose);
  return {viewport,field,events,game,calls,layouts,dispose,observer:observers.at(-1)!,setBox(width:number,height:number){box={...box,width,height};},get parent(){return parent;}};
 };
 return {windowTarget,visualViewport,observers,screen};
}

test('duel observer fits before boot, follows rotation and toolbar changes without overflow or feedback',t=>{
 const env=duelObserverEnvironment(t),screen=env.screen(390,844,false);
 assert.equal(screen.observer.observed,screen.viewport,'observe the fixed viewport rather than the fitted field');
 assert.equal(screen.field.dataset.screenLayout,'compact');assert.deepEqual(screen.calls,['changed']);
 assert.equal(screen.layouts[0].pixelWidth,390);assert.equal(screen.layouts[0].pixelHeight,844);
 screen.calls.length=0;screen.game.isBooted=true;screen.events.emit('ready');
 assert.deepEqual(screen.calls,['bounds','size','changed','refresh'],'ready retries FIT even though viewport measurements are unchanged');
 assert.equal(screen.game.scale.height,800);

 screen.calls.length=0;screen.setBox(1024,720);env.visualViewport.emit('resize');
 assert.equal(screen.field.dataset.screenLayout,'standard');assert.equal(screen.game.scale.height,800);
 assert.deepEqual(screen.calls,['bounds','changed','refresh']);
 screen.calls.length=0;screen.setBox(1280,752);env.windowTarget.emit('resize');
 assert.deepEqual(screen.calls,['bounds','changed','refresh'],'same logical height still updates its fitted physical size');
 assert.equal(screen.layouts.at(-1)!.scale,duelScreenLayout(1280,752).scale);
 screen.calls.length=0;for(let i=0;i<5;i++){screen.observer.callback();env.windowTarget.emit('resize');env.visualViewport.emit('resize');}
 assert.deepEqual(screen.calls,[],'inner sizing and repeated notifications cannot cause resize feedback');

 for(const [width,height,event] of [[844,342,'resize'],[342,844,'resize'],[844,281,'resize']] as const){
  screen.calls.length=0;screen.setBox(width,height);env.visualViewport.emit(event);
  const layout=screen.layouts.at(-1)!;
  assert.ok(parseFloat(screen.field.style.width)<=width+.01);assert.ok(parseFloat(screen.field.style.height)<=height+.01);
  assert.equal(screen.game.scale.height,800);assert.equal(layout.scale,Math.min(width/1280,height/800));
  assert.deepEqual(screen.calls,['bounds','changed','refresh']);
 }
 screen.calls.length=0;screen.viewport.emit('scroll');assert.deepEqual(screen.calls,[],'the fitted viewport has no scrolling input listener');
 assert.equal(screen.viewport.listeners.get('scroll'),undefined);
 screen.setBox(0,0);screen.observer.callback();assert.deepEqual(screen.calls,[],'hidden viewport does not resize the game');
 screen.dispose();screen.dispose();assert.equal(screen.observer.disconnects,1);assert.equal(screen.events.listenerCount('ready'),0);assert.equal(screen.events.listenerCount('destroy'),0);
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
 assert.deepEqual(first.calls,[]);assert.deepEqual(second.calls,['bounds','changed','refresh']);
 assert.equal(second.layouts.at(-1)!.pixelWidth,568);assert.equal(second.layouts.at(-1)!.pixelHeight,271);
 second.calls.length=0;second.events.emit('destroy');second.dispose();
 assert.equal(second.observer.disconnects,1);assert.equal(second.events.listenerCount('ready'),0);assert.equal(second.events.listenerCount('destroy'),0);
 assert.equal(second.viewport.listeners.get('scroll'),undefined);assert.equal(env.windowTarget.listeners.get('resize')?.size,0);assert.equal(env.visualViewport.listeners.get('resize')?.size,0);
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
