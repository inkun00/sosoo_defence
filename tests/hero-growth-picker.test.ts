import test from 'node:test';
import assert from 'node:assert/strict';
import {heroGrowthPickerHTML,bindHeroGrowthPicker} from '../src/multiplayer/hero-growth-picker';

test('growth picker offers only three heroes at the selected affordable level with cost and remainder',()=>{
 const html=heroGrowthPickerHTML(12,7);
 assert.equal((html.match(/data-hero="/g)??[]).length,3);
 assert.equal((html.match(/<option /g)??[]).length,10);
 assert.match(html,/data-level="7"/);assert.match(html,/<p class="hero-growth-summary" role="status">소환석 12개<\/p>/);
 assert.match(html,/소환석 5개가 남아요/);assert.match(html,/Lv\.1 최대 12명 \/ Lv\.10 최대 1명/);
 assert.doesNotMatch(html,/성장량| · 성장 |영웅 1명 비용|같은 레벨 최대/);
 assert.match(html,/소환석 7개 소모 · 소환 ▶/);
 for(const variant of [0,1,2])assert.ok(html.includes('data-hero="hero-7-'+variant+'"'));
 assert.doesNotMatch(html,/worksheet-heroes-v1|비축 ▶/);
});

test('the selected level clamps to remaining growth after summoning while low-level quantities remain available',()=>{
 const html=heroGrowthPickerHTML(3,7);
 assert.equal((html.match(/<option /g)??[]).length,3);assert.match(html,/data-level="3"/);
 assert.match(html,/<p class="hero-growth-summary" role="status">소환석 3개<\/p>/);assert.match(html,/소환석 0개가 남아요/);assert.match(html,/Lv\.1 최대 3명 \/ Lv\.3 최대 1명/);
 assert.ok(html.includes('data-hero="hero-3-0"'));
});

test('exhausted growth disables all summon choices and a zero-growth catalogue can still browse ten levels',()=>{
 const empty=heroGrowthPickerHTML(0,10);assert.match(empty,/<p class="hero-growth-summary" role="status">소환석 0개<\/p>/);assert.match(empty,/소환석을 모두 사용했어요/);
 assert.equal((empty.match(/data-hero="[^"]+" disabled/g)??[]).length,3);assert.equal((empty.match(/<option /g)??[]).length,1);
 const book=heroGrowthPickerHTML(0,10,true);assert.equal((book.match(/<option /g)??[]).length,10);assert.equal((book.match(/data-hero="/g)??[]).length,3);
 assert.match(book,/data-level="10"/);assert.match(book,/준비 중 덧셈 정답마다 소환석을 1개씩/);
 assert.doesNotMatch(book,/성장량| · 성장 /);
});

test('opening touch cannot summon a newly shown card, but intentional taps, mouse and keyboard can',()=>{
 const card=Object.assign(new EventTarget(),{dataset:{hero:'hero-2-0'},onclick:null as((event:MouseEvent)=>void)|null});
 card.addEventListener('click',event=>card.onclick?.(event as MouseEvent));
 const root={querySelectorAll:(selector:string)=>selector==='[data-hero]'?[card]:[],querySelector:()=>null} as unknown as HTMLElement;
 const summons:string[]=[];bindHeroGrowthPicker(root,()=>{},id=>summons.push(id));
 const fire=(type:string,properties:object={})=>{const event=Object.assign(new Event(type,{cancelable:true}),properties);card.dispatchEvent(event);return event;};
 const touchClick={detail:1,pointerType:'touch',sourceCapabilities:{firesTouchEvents:true}};
 assert.equal(fire('click',touchClick).defaultPrevented,true);assert.equal(summons.length,0);
 fire('touchstart');assert.equal(fire('click',touchClick).defaultPrevented,false);assert.equal(summons.length,1);
 assert.equal(fire('click',touchClick).defaultPrevented,true);assert.equal(summons.length,1);
 fire('pointerdown',{pointerType:'touch'});fire('pointercancel');assert.equal(fire('click',touchClick).defaultPrevented,true);
 fire('touchstart');fire('touchcancel');assert.equal(fire('click',touchClick).defaultPrevented,true);
 fire('click',{detail:0});fire('click',{detail:1,pointerType:'mouse',sourceCapabilities:{firesTouchEvents:false}});
 assert.deepEqual(summons,['hero-2-0','hero-2-0','hero-2-0']);
});

test('level navigation ignores an opening touch click and accepts a touch begun on its button',()=>{
 const next=Object.assign(new EventTarget(),{dataset:{heroLevel:'3'},onclick:null as((event:MouseEvent)=>void)|null});
 next.addEventListener('click',event=>next.onclick?.(event as MouseEvent));
 const root={querySelectorAll:(selector:string)=>selector==='[data-hero-level]'?[next]:[],querySelector:()=>null} as unknown as HTMLElement;
 const levels:number[]=[];bindHeroGrowthPicker(root,level=>levels.push(level),()=>{});
 const click=()=>next.dispatchEvent(Object.assign(new Event('click',{cancelable:true}),{detail:1,sourceCapabilities:{firesTouchEvents:true}}));
 assert.equal(click(),false);assert.deepEqual(levels,[]);
 next.dispatchEvent(new Event('touchstart'));assert.equal(click(),true);assert.deepEqual(levels,[3]);
});
