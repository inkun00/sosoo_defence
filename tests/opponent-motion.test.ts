import {test} from 'node:test';
import assert from 'node:assert/strict';
import {sampleOpponentMotion,type OpponentMood} from '../src/multiplayer/opponent-motion';

const moods:OpponentMood[]=['idle','thinking','cast','hurt','victory','defeat'];
test('평소에는 시전 포즈를 빠르게 반복하지 않고 몇 초간 대기 자세를 유지한다',()=>{
 for(let level=1;level<=10;level++)for(let time=0;time<=4000;time+=100){
  const pose=sampleOpponentMotion('idle',time,time,level);
  assert.equal(pose.frame,0);assert.equal(pose.blend,0);
 }
});
test('대기 동작은 긴 시간 동안 호흡·시선·지팡이 자세를 다양하게 이어간다',()=>{
 for(let level=1;level<=10;level++){
  const frames=new Set<number>();let previous=-1,changes=0;
  for(let time=0;time<=54000;time+=50){
   const pose=sampleOpponentMotion('idle',time,time,level),visible=pose.blend>.5?pose.nextFrame:pose.frame;
   frames.add(visible);if(previous!==visible)changes++;previous=visible;
  }
  assert.ok([0,1,2,3,4,5].every(frame=>frames.has(frame)));
  assert.ok(changes<24,'포즈를 매초 반복하지 않는다');
 }
});
test('피격·기쁨·시전은 한 번 반응한 뒤 반복 점프나 흔들림 없이 자세를 유지한다',()=>{
 for(const mood of ['hurt','victory','cast'] as const)for(let time=3000;time<=15000;time+=100){
  const pose=sampleOpponentMotion(mood,time,time,10);
  assert.equal(pose.frame,mood==='hurt'?6:mood==='victory'?8:4);assert.equal(pose.blend,0);
  assert.ok(Math.abs(pose.dy)<1e-9);assert.ok(Math.abs(pose.angle)<=.55);
 }
 assert.equal(sampleOpponentMotion('defeat',5000,5000).frame,11);
});
test('모든 레벨의 움직임은 작은 범위 안에서 유한한 좌표와 투명도를 유지한다',()=>{
 for(const mood of moods)for(let level=1;level<=10;level++)for(let time=0;time<=20000;time+=20){
  const pose=sampleOpponentMotion(mood,time,time,level);
  assert.ok(Number.isInteger(pose.frame)&&pose.frame>=0&&pose.frame<12);
  assert.ok(Number.isInteger(pose.nextFrame)&&pose.nextFrame>=0&&pose.nextFrame<12);
  assert.ok(pose.blend>=0&&pose.blend<=1);assert.ok(Math.abs(pose.dx)<=4);
  assert.ok(pose.dy>=-4&&pose.dy<=2);assert.ok(Math.abs(pose.angle)<=4);
  assert.ok(pose.scaleX>=.98&&pose.scaleX<=1.02);assert.ok(pose.scaleY>=.98&&pose.scaleY<=1.02);
 }
});
test('호흡과 자세 연결의 프레임 사이 이동량이 작고 좌표가 튀지 않는다',()=>{
 for(const mood of moods){
  let previous=sampleOpponentMotion(mood,0,0,5);
  for(let time=16;time<55000;time+=16){
   const next=sampleOpponentMotion(mood,time,time,5);
   assert.ok(Math.abs(next.dx-previous.dx)<.2);assert.ok(Math.abs(next.dy-previous.dy)<.3);
   assert.ok(Math.abs(next.angle-previous.angle)<.2);assert.ok(Math.abs(next.scaleY-previous.scaleY)<.005);
   previous=next;
  }
 }
});
test('동작 줄이기 설정은 포즈 교체·호흡·기울임을 모두 멈춘다',()=>{
 for(const mood of moods){const first=sampleOpponentMotion(mood,0,0,1,true);
  for(const time of [1000,10000,50000])assert.deepEqual(sampleOpponentMotion(mood,time,time,10,true),first);
  assert.deepEqual([first.dx,first.dy,first.angle,first.scaleX,first.scaleY,first.blend],[0,0,0,1,1,0]);
 }
});
