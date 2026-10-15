import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

const html=readFileSync(new URL('../index.html',import.meta.url),'utf8');
const script=html.match(/<script id="startup-guard">([\s\S]*?)<\/script>/)![1];
function startup(url='https://sosoo-defence.vercel.app/?mode=adventure',online=true){
 const elements=new Map<string,{hidden:boolean;textContent:string;childElementCount:number;onclick?:()=>void}>();
 for(const id of ['app','startup-help','startup-title','startup-message','startup-retry'])elements.set(id,{hidden:id==='startup-help',textContent:'',childElementCount:0});
 const links=[{href:'https://sosoo-defense-20261005.web.app/',hidden:false},{href:'https://sosoo-defense-20261005.firebaseapp.com/',hidden:false}];
 const listeners=new Map<string,(event:unknown)=>void>(),timers=new Map<number,()=>void>();let nextTimer=0,mutation=()=>{},disconnected=false,reloads=0;
 const source=new URL(url),location={search:source.search,hash:source.hash,host:source.host,reload:()=>{reloads++;}};
 runInNewContext(script,{
  document:{getElementById:(id:string)=>elements.get(id),querySelectorAll:()=>links},location,navigator:{onLine:online},URL,
  window:{addEventListener:(type:string,callback:(event:unknown)=>void)=>listeners.set(type,callback)},
  setTimeout:(callback:()=>void,ms:number)=>{assert.equal(ms,8000);timers.set(++nextTimer,callback);return nextTimer;},clearTimeout:(id:number)=>timers.delete(id),
  MutationObserver:class{constructor(callback:()=>void){mutation=callback;}observe(){}disconnect(){disconnected=true;}},
 });
 return {elements,links,emit:(type:string,event:unknown)=>listeners.get(type)?.(event),tick:()=>{for(const [id,callback]of timers){timers.delete(id);callback();}},render:()=>{elements.get('app')!.childElementCount=1;if(!disconnected)mutation();},reloads:()=>reloads};
}
test('startup recovery stays hidden on a successful load and also dismisses a slow-loading notice',()=>{
 const fast=startup();assert.equal(fast.elements.get('startup-help')!.hidden,true);fast.render();fast.tick();assert.equal(fast.elements.get('startup-help')!.hidden,true);
 const slow=startup();slow.tick();assert.equal(slow.elements.get('startup-help')!.hidden,false);slow.render();assert.equal(slow.elements.get('startup-help')!.hidden,true);
});
test('failed initial JavaScript or stylesheet shows self-contained recovery without loading another asset',()=>{
 for(const target of [{tagName:'SCRIPT'},{tagName:'LINK',rel:'stylesheet'}]){
  const fixture=startup();fixture.emit('error',{target});assert.equal(fixture.elements.get('startup-help')!.hidden,false);
  fixture.elements.get('startup-retry')!.onclick!();assert.equal(fixture.reloads(),1);
 }
});
test('missing images and optional resources after startup do not cover a functioning game',()=>{
 const image=startup();image.emit('error',{target:{tagName:'IMG'}});assert.equal(image.elements.get('startup-help')!.hidden,true);
 const ready=startup();ready.render();ready.emit('error',{target:{tagName:'LINK',rel:'stylesheet'}});assert.equal(ready.elements.get('startup-help')!.hidden,true);
});
test('official alternative links keep the requested protected mode and do not accept a redirect host',()=>{
 const fixture=startup('https://sosoo-defence.vercel.app/?mode=worksheet&id=sheet&print=1&return=https%3A%2F%2Fevil.example#selection');
 for(const [index,link]of fixture.links.entries()){
  const target=new URL(link.href);assert.equal(target.origin,index===0?'https://sosoo-defense-20261005.web.app':'https://sosoo-defense-20261005.firebaseapp.com');
  assert.equal(target.searchParams.get('mode'),'worksheet');assert.equal(target.searchParams.get('id'),'sheet');assert.equal(target.searchParams.get('print'),'1');assert.equal(target.hash,'#selection');
 }
 const mirror=startup('https://sosoo-defense-20261005.web.app/?mode=duel');assert.equal(mirror.links[0].hidden,true);assert.equal(mirror.links[1].hidden,false);
});
test('account initialization failure names the account connection and cannot disappear after late DOM work',()=>{
 const fixture=startup();fixture.emit('decimal-startup-failed',{detail:{kind:'account'}});
 assert.equal(fixture.elements.get('startup-help')!.hidden,false);assert.match(fixture.elements.get('startup-title')!.textContent,/계정 서버/);
 fixture.render();assert.equal(fixture.elements.get('startup-help')!.hidden,false);
});
test('offline startup explains connection loss',()=>{
 const fixture=startup(undefined,false);fixture.tick();assert.match(fixture.elements.get('startup-message')!.textContent,/인터넷 연결이 끊어졌어요/);
});
