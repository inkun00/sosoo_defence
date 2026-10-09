import test from 'node:test';
import assert from 'node:assert/strict';
import {Defense} from '../src/model';
import {LEVELS} from '../src/levels';
import {TOWERS} from '../src/towers';
import {COLS,ROWS,world} from '../src/path';
import {createDuel,joinDuel,applyDuel,advanceDuel} from '../src/multiplayer/duel';

test('solo projectile events identify every firing weapon for sound playback',()=>{
 for(const spec of TOWERS){
  const m=new Defense(LEVELS.at(-1)!),start=world(m.map.start),cell=Array.from({length:COLS*ROWS},(_,i)=>({x:i%COLS,y:Math.floor(i/COLS)})).find(c=>m.candidate(c)&&Math.hypot(world(c).x-start.x,world(c).y-start.y)<100)!;
  assert.ok(cell);m.towers=[{...cell,id:90,typeId:spec.id,unit:spec.unit,effect:spec.effect,enabled:true,cooldown:0,cost:spec.cost}];m.start();m.spawn();m.enemies[0].hp=m.enemies[0].max=9990;m.enemies[0].stun=1;m.events=[];m.step(.01);
  const shot=m.events.find(e=>e.type==='shot')?.data as {typeId:string;unit:number}|undefined;assert.equal(shot?.typeId,spec.id);assert.equal(shot?.unit,spec.unit);
 }
});

test('duel snapshots retain each projectile sound identity after its tower is sold',()=>{
 for(const spec of TOWERS){
  const now=100000,s=createDuel('a','왼쪽',17,now);joinDuel(s,'b','오른쪽',now);applyDuel(s,0,{type:'ready'},now,'a');applyDuel(s,1,{type:'ready'},now,'b');assert.equal(s.status,'preparing');s.players.forEach(p=>p!.lastSeen=now+60000);advanceDuel(s,now+60000);assert.equal(s.status,'playing');
  s.players[0].towers=[{id:70,typeId:spec.id,x:3,y:2,unit:spec.unit,cost:spec.cost,enabled:true,cooldown:0}];s.enemies=[{id:90,owner:1,target:0,hero:null,level:1,hp:9990,max:9990,x:3,slow:0,stun:1,hits:0}];advanceDuel(s,now+60100);
  assert.equal(s.shots[0]?.typeId,spec.id);assert.ok(applyDuel(s,0,{type:'sell',towerId:70},now+60100,'sell').ok);assert.equal(s.players[0].towers.length,0);assert.equal(JSON.parse(JSON.stringify(s)).shots[0].typeId,spec.id);
 }
});
