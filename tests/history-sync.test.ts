import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {incrementalHistory,HistoryCursor,HistoryRow} from '../src/multiplayer/history-sync';
const storage=new Map<string,string>();
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(k:string)=>storage.get(k)??null,setItem:(k:string,v:string)=>storage.set(k,v)},configurable:true});
beforeEach(()=>storage.clear());
const checkpoint='decimal-history-sync-v1:';
test('첫 동기화는 같은 저장 시각의 기록도 문서 ID로 끝까지 가져오고 5분 내 재조회하지 않는다',async()=>{
 const rows=Array.from({length:205},(_,i)=>({cursor:{time:100000,id:String(i).padStart(3,'0')},record:i}));let calls=0;const imported:number[]=[];
 const read=async(from:number,c?:HistoryCursor)=>{calls++;return rows.filter(r=>r.cursor.time>=from&&(!c||r.cursor.id>c.id)).slice(0,100);};
 const apply=(rows:number[])=>{storage.set('decimal-learning-v1','{}');imported.push(...rows);return true;};
 await incrementalHistory('a',read,apply,1000000);assert.equal(calls,3);assert.equal(imported.length,205);
 assert.deepEqual(await incrementalHistory('a',read,apply,1100000),[]);assert.equal(calls,3);
 const saved=JSON.parse(storage.get(checkpoint+'a')!);assert.deepEqual(saved.after,rows.at(-1)!.cursor);
});
test('추가 동기화는 최근 1분만 겹쳐 읽고 늦게 저장된 기록을 놓치지 않는다',async()=>{
 storage.set('decimal-learning-v1','{}');storage.set(checkpoint+'a',JSON.stringify({after:{time:200000,id:'z'},checkedAt:500000}));let from=-1;
 const returned=await incrementalHistory('a',async(start)=>{from=start;return [{cursor:{time:180000,id:'late'},record:'late'},{cursor:{time:240000,id:'new'},record:'new'}];},()=>true,1000000);
 assert.equal(from,140000);assert.deepEqual(returned,['late','new']);assert.equal(JSON.parse(storage.get(checkpoint+'a')!).after.time,240000);
});
test('오답 가져오기 실패 또는 브라우저 저장 실패는 동기화 위치를 진행하지 않는다',async()=>{
 const read=async():Promise<HistoryRow<number>[]>=>[{cursor:{time:100000,id:'a'},record:1}];
 await assert.rejects(incrementalHistory('a',read,()=>false,1000000),/저장하지/);assert.equal(storage.has(checkpoint+'a'),false);
 let retry=0;await incrementalHistory('a',async()=>{retry++;return [];},()=>true,1000001);assert.equal(retry,1);
});
test('계정별 조회 위치를 분리하고 학습 기록을 지운 브라우저는 전체 기록을 다시 가져온다',async()=>{
 storage.set(checkpoint+'a',JSON.stringify({after:{time:500000,id:'a'},checkedAt:999999}));const starts:number[]=[];
 await incrementalHistory('a',async(from)=>{starts.push(from);return [];},()=>true,1000000);
 await incrementalHistory('b',async(from)=>{starts.push(from);return [];},()=>true,1000000);assert.deepEqual(starts,[0,0]);
});
