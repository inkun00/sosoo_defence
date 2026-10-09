import test from 'node:test';
import assert from 'node:assert/strict';
import {EventEmitter} from 'node:events';
import {gameScreenLayout,duelScreenLayout,observeGameScreen} from '../src/responsive-game';

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

test('duel crafting keeps both 44px rows visible after reserving space for audio controls',()=>{
 for(const [width,height] of [[568,271],[667,326],[844,281],[844,341],[1024,719]]){
  const layout=duelScreenLayout(width,height),touch=Math.max(68,Math.ceil(44/layout.scale));
  assert.ok(layout.width*layout.scale<=width+.01);
  assert.ok(layout.height*layout.scale<=height+.01);
  if(layout.compact){
   assert.ok(touch*layout.scale>=44);
   assert.ok(3*touch+369<=layout.height-8,'last crafting row must remain above the bottom margin');
  }
 }
 assert.deepEqual(duelScreenLayout(1280,720),gameScreenLayout(1280,720));
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
