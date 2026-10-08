import test from 'node:test';
import assert from 'node:assert/strict';
import {createDuel,type DuelShot,type DuelState} from '../src/multiplayer/duel';
import {DuelShotStream} from '../src/multiplayer/shot-stream';

function shot(id:number,time=10):DuelShot{return {id,time,towerId:2,typeId:'basic',owner:0,enemyId:3,x:4,before:500,unit:100,after:400,effect:'basic'};}
function state(shots:DuelShot[]=[],revision=1,elapsed=10):DuelState{return {...createDuel('a','left',17,100000),revision,elapsed,shots};}
const ids=(shots:DuelShot[])=>shots.map(s=>s.id);

test('fresh shot records are ordered, deduplicated and leave the snapshot untouched',()=>{
 const stream=new DuelShotStream(),s=state([shot(8),shot(5),shot(7),shot(5)]),before=JSON.stringify(s);
 assert.deepEqual(ids(stream.take('room',s)),[5,7,8]);assert.equal(JSON.stringify(s),before);
 assert.equal(stream.identity,'room:17:100000');
});

test('same snapshot and later snapshots never replay consumed records after list expiry',()=>{
 const stream=new DuelShotStream(),s=state([shot(5)]);
 assert.deepEqual(ids(stream.take('room',s)),[5]);assert.deepEqual(stream.take('room',s),[]);
 assert.deepEqual(stream.take('room',state([],2)),[]);
 assert.deepEqual(ids(stream.take('room',state([shot(5),shot(6)],3))),[6]);
});

test('an older revision is ignored without consuming ids from that stale snapshot',()=>{
 const stream=new DuelShotStream();assert.deepEqual(ids(stream.take('room',state([shot(5)],4))),[5]);
 assert.deepEqual(stream.take('room',state([shot(100)],3)),[]);
 assert.deepEqual(ids(stream.take('room',state([shot(6)],5))),[6]);
});

test('burst selection returns only the last twelve and consumes omitted ids',()=>{
 const stream=new DuelShotStream(),shots=Array.from({length:20},(_,i)=>shot(i+1)).reverse();
 assert.deepEqual(ids(stream.take('room',state(shots))),Array.from({length:12},(_,i)=>i+9));
 assert.deepEqual(stream.take('room',state(shots.slice(-8),2)),[]);
 assert.deepEqual(ids(stream.take('room',state([shot(20),shot(21)],3))),[21]);
});

test('freshness accepts the 2.4-second boundary and consumes stale and future ids',()=>{
 const stream=new DuelShotStream(),s=state([shot(1,0),shot(2,.001),shot(3,-.001),shot(4,2.5)],1,2.4);
 assert.deepEqual(ids(stream.take('room',s)),[1,2]);
 assert.deepEqual(stream.take('room',state([shot(3,2.4),shot(4,2.5)],2,2.5)),[]);
 assert.deepEqual(ids(stream.take('room',state([shot(5,2.5)],3,2.5))),[5]);
});

test('room, seed and creation time changes independently reset consumed ids and revisions',()=>{
 const stream=new DuelShotStream(),a=state([shot(5)],50);
 assert.deepEqual(ids(stream.take('first',a)),[5]);
 const b=state([shot(1)],0);assert.deepEqual(ids(stream.take('second',b)),[1]);assert.equal(stream.identity,'second:17:100000');
 const c={...b,seed:18};assert.deepEqual(ids(stream.take('second',c)),[1]);assert.equal(stream.identity,'second:18:100000');
 const d={...c,createdAt:100001};assert.deepEqual(ids(stream.take('second',d)),[1]);assert.equal(stream.identity,'second:18:100001');
});

test('null and explicit reset clear identity and permit a fresh room stream',()=>{
 const stream=new DuelShotStream(),s=state([shot(3)],9);
 stream.take('room',s);assert.deepEqual(stream.take('room',null),[]);assert.equal(stream.identity,'');
 assert.deepEqual(ids(stream.take('room',state([shot(3)],0))),[3]);
 stream.reset();assert.equal(stream.identity,'');assert.deepEqual(ids(stream.take('room',state([shot(1)],0))),[1]);
});

test('a mutable host state uses values rather than object identity to track shots',()=>{
 const stream=new DuelShotStream(),s=state([shot(1)]);assert.deepEqual(ids(stream.take('room',s)),[1]);
 s.revision++;s.shots.push(shot(2));assert.deepEqual(ids(stream.take('room',s)),[2]);
 s.revision++;s.shots=[];assert.deepEqual(stream.take('room',s),[]);
});
