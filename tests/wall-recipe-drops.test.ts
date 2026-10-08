import {test} from 'node:test';
import assert from 'node:assert/strict';
import {Defense,type Tower} from '../src/model';
import {LEVELS} from '../src/levels';
import {recipe,reward} from '../src/math';
import {drawWallRecipe} from '../src/wall-recipe-store';
import {wallRecipeKey,wallRecipePool} from '../src/wall-recipes';
import {loadSave,writeSave} from '../src/save';

function withStorage(run:(data:Map<string,string>)=>void){
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage'),data=new Map<string,string>();
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>data.get(key)??null,setItem:(key:string,value:string)=>data.set(key,value),removeItem:(key:string)=>data.delete(key)}});
 try{run(data);}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
}
function defeat(m:Defense){m.spawn();const e=m.enemies.at(-1)!;m.damage(e,{unit:e.hp,effect:'basic'} as Tower);}

test('새 방어와 재도전에서도 최근 여덟 수식은 반복하지 않고 정답 세트가 남는다',()=>withStorage(data=>{
 for(const level of LEVELS.slice(1)){
  const recent:string[]=[];
  for(let round=0;round<20;round++){
   const m=new Defense(level);for(let kill=1;kill<=9;kill++)defeat(m);
   assert.equal(m.bricks.length,6);
   for(let group=0;group<2;group++){
    const values=m.bricks.slice(group*3,group*3+3).map(b=>b.value) as [number,number,number],key=wallRecipeKey(values);
    assert.ok(!recent.includes(key),`stage ${level.id}: ${key}`);assert.ok(recipe(...values));assert.ok(recipe(values[2],values[1],values[0],'-'));
    recent.push(key);if(recent.length>8)recent.shift();
   }
  }
 }
 assert.ok(data.has('decimal-wall-recipes-v1'));
}));

test('벽돌 개수·드롭 시점·코인 보상과 전투 난수는 기존 규칙을 유지한다',()=>withStorage(()=>{
 for(const level of LEVELS){
  const m=new Defense(level),reference=new Defense(level);let money=level.budget;
  for(let kill=1;kill<=12;kill++){
   defeat(m);const brick=level.id>=2&&(kill<=3||kill>=7&&kill<=9);
   assert.equal(m.events.at(-1)?.type,'kill');assert.equal(m.events.at(-2)?.type,brick?'brick':'money');
   if(!brick)money+=reward(level.hp[kill-1],1,level.units,level.id);
   assert.equal(m.money,money);
  }
  assert.equal(m.bricks.length,level.id===1?0:6);assert.equal(m.random(),reference.random());
 }
}));

test('생성 재료와 기존 재료는 저장·단계 이동 후에도 덧셈과 뺄셈으로 합성된다',()=>withStorage(()=>{
 const m=new Defense(LEVELS[8],{bricks:[100,200,300],walls:0});for(let i=0;i<9;i++)defeat(m);
 const save=loadSave();save.inventory=m.inventory;assert.ok(writeSave(save));const next=new Defense(LEVELS[9],loadSave().inventory);
 assert.deepEqual(next.bricks.map(b=>b.value),m.bricks.map(b=>b.value));
 const original=next.bricks.slice(0,3),first=next.bricks.slice(3,6),second=next.bricks.slice(6,9);
 assert.ok(next.fuse(original.map(b=>b.id)));assert.ok(next.fuse([first[2].id,first[1].id,first[0].id],'-'));assert.ok(next.fuse(second.map(b=>b.id)));
 assert.equal(next.bricks.length,0);assert.equal(next.wallStock,3);
}));

test('고정 난수에서도 기록으로 중복을 피하며 손상된 기록은 게임을 막지 않는다',()=>withStorage(data=>{
 data.set('decimal-wall-recipes-v1','{bad');const recent:string[]=[];
 for(let i=0;i<35;i++){
  const key=wallRecipeKey(drawWallRecipe(2,0,()=>0));assert.ok(!recent.includes(key));recent.push(key);if(recent.length>8)recent.shift();
 }
 data.set('decimal-wall-recipes-v1',JSON.stringify({version:1,stages:{2:['oops','100:200:999','1:2:3','100:200:300']}}));
 const values=drawWallRecipe(2,0,()=>1);assert.ok(recipe(...values));assert.notEqual(wallRecipeKey(values),'100:200:300');
}));

test('후반의 세 계산 유형은 두 세트씩 드롭해도 재도전에서 계속 순환한다',()=>withStorage(()=>{
 for(const stage of [10,11])for(let round=0;round<3;round++){
  const m=new Defense(LEVELS[stage-1]);for(let kill=1;kill<=9;kill++)defeat(m);
  for(let group=0;group<2;group++){
   const values=m.bricks.slice(group*3,group*3+3).map(b=>b.value) as [number,number,number],variant=(round*2+group)%3;
   assert.ok(wallRecipePool(stage,variant).some(v=>wallRecipeKey(v)===wallRecipeKey(values)));
  }
 }
}));

test('브라우저 저장이 차단되어도 새 수식 세트 생성과 중복 방지가 계속된다',()=>{
 const previous=Object.getOwnPropertyDescriptor(globalThis,'localStorage');
 Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:()=>{throw Error('blocked');},setItem:()=>{throw Error('blocked');}}});
 try{const first=drawWallRecipe(6,0,()=>0),second=drawWallRecipe(6,1,()=>0);assert.notEqual(wallRecipeKey(first),wallRecipeKey(second));assert.ok(recipe(...first));assert.ok(recipe(...second));}finally{if(previous)Object.defineProperty(globalThis,'localStorage',previous);else Reflect.deleteProperty(globalThis,'localStorage');}
});
