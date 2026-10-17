import assert from 'node:assert/strict';
import test from 'node:test';
import {SIEGE_HUMAN_STRIDES,siegeHumanFacing,siegeHumanMotion} from '../src/secret-siege-human-motion';

test('walking has eight distance-driven phases and loops after one physical stride',()=>{
 const frames=Array.from({length:8},(_,frame)=>siegeHumanMotion({distance:1+frame*8.5,attacking:false},99,1.5,68));
 assert.deepEqual(frames.map(pose=>pose.frame),[0,1,2,3,4,5,6,7]);
 assert.ok(frames.every(pose=>pose.action==='walk'));
 assert.deepEqual(siegeHumanMotion({distance:69,attacking:false},0,1.5),siegeHumanMotion({distance:1,attacking:false},999,1.5));
 assert.notEqual(SIEGE_HUMAN_STRIDES.guard,SIEGE_HUMAN_STRIDES.scout);
});

test('a real shot plays one eight-frame attack and then returns to idle while waiting',()=>{
 const unit={distance:300,attacking:true,lastShot:10},duration=.95;
 const frames=Array.from({length:8},(_,frame)=>siegeHumanMotion(unit,10+(frame+.1)/8*duration,1.5));
 assert.deepEqual(frames.map(pose=>pose.frame),[8,9,10,11,12,13,14,15]);
 assert.ok(frames.every(pose=>pose.action==='attack'));
 for(const elapsed of [11,12,20,100])assert.deepEqual(siegeHumanMotion(unit,elapsed,1.5),{frame:0,action:'idle'});
 assert.deepEqual(siegeHumanMotion({...unit,lastShot:undefined},10,1.5),{frame:0,action:'idle'});
 assert.deepEqual(siegeHumanMotion({...unit,lastShot:12},10,1.5),{frame:0,action:'idle'});
});

test('the fast scout finishes before its next cooldown and a later shot starts a fresh cycle',()=>{
 const unit={distance:400,attacking:true,lastShot:5};
 assert.equal(siegeHumanMotion(unit,5.01,.55).frame,8);
 assert.equal(siegeHumanMotion(unit,5.43,.55).frame,15);
 assert.deepEqual(siegeHumanMotion(unit,5.5,.55),{frame:0,action:'idle'});
 assert.equal(siegeHumanMotion({...unit,lastShot:5.55},5.56,.55).frame,8);
});

test('pause and arithmetic questions hold both walking and attack frames without a wall-clock dependency',()=>{
 const walking={distance:37,attacking:false},attacking={distance:320,attacking:true,lastShot:9.5};
 const walkingBefore=siegeHumanMotion(walking,10,1.5),attackBefore=siegeHumanMotion(attacking,10,1.5);
 for(let draw=0;draw<120;draw++){
  assert.deepEqual(siegeHumanMotion(walking,10,1.5),walkingBefore);
  assert.deepEqual(siegeHumanMotion(attacking,10,1.5),attackBefore);
 }
 assert.notDeepEqual(siegeHumanMotion({...walking,distance:walking.distance+10},10.2,1.5),walkingBefore);
 assert.notDeepEqual(siegeHumanMotion(attacking,10.2,1.5),attackBefore);
});

test('moving away after an attack returns to the actual walk phase and reduced motion stays still',()=>{
 const unit={distance:125,attacking:false,lastShot:10};
 assert.equal(siegeHumanMotion(unit,10.1,1.5).action,'walk');
 for(const attacking of [true,false])for(const elapsed of [10,10.2,20])assert.deepEqual(siegeHumanMotion({...unit,attacking},elapsed,.55,60,true),{frame:0,action:'idle'});
 assert.deepEqual(siegeHumanMotion({distance:0,attacking:false},0,1.5),{frame:0,action:'idle'});
});

test('facing follows a horizontal road or target and remains consistent on vertical segments',()=>{
 assert.equal(siegeHumanFacing(30),1);assert.equal(siegeHumanFacing(-30),-1);
 assert.equal(siegeHumanFacing(0,-1),-1);assert.equal(siegeHumanFacing(0,1),1);
 assert.equal(siegeHumanFacing(1,-1),-1);assert.equal(siegeHumanFacing(-1,1),1);
 assert.equal(siegeHumanFacing(40,-1),1);assert.equal(siegeHumanFacing(-40,1),-1);
});

test('all seven human roles have physical strides and a priest cast follows an actual heal',()=>{
 assert.deepEqual(Object.keys(SIEGE_HUMAN_STRIDES),['guard','striker','scout','knight','ranger','champion','priest']);
 assert.ok(Object.values(SIEGE_HUMAN_STRIDES).every(stride=>Number.isFinite(stride)&&stride>=60));
 const priest={distance:220,attacking:false,lastHeal:10};
 assert.deepEqual(siegeHumanMotion(priest,10,3),{frame:8,action:'attack'});
 assert.deepEqual(siegeHumanMotion(priest,10.4,3),siegeHumanMotion(priest,10.4,3));
 assert.equal(siegeHumanMotion(priest,11,3).action,'walk');
 assert.equal(siegeHumanMotion({...priest,lastHeal:12},10,3).action,'walk');
});
