import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory,IDBObjectStore} from 'fake-indexeddb';
import {storageRecordUpdate} from '../src/storage-lock';
beforeEach(()=>{Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});});
function database(){return new Promise<IDBDatabase>((resolve,reject)=>{const request=indexedDB.open('decimal-storage-locks-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('locks');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});}
const storageUpdate=<T>(name:string,fn:()=>T)=>storageRecordUpdate(name,()=>'',raw=>({value:raw,result:fn()}),()=>undefined);
test('기존 readwrite transaction이 끝나기 전에는 다른 연결의 저장 콜백을 실행하지 않는다',async()=>{
 const db=await database(),transaction=db.transaction('locks','readwrite'),store=transaction.objectStore('locks');let entered=false,waiting=true;
 const hold=()=>{const request=store.get('hold');request.onsuccess=()=>{if(waiting)hold();};};hold();
 const update=storageUpdate('workbook',()=>{entered=true;return 'saved';});
 await new Promise(resolve=>setTimeout(resolve,15));assert.equal(entered,false);
 waiting=false;transaction.abort();assert.equal(await update,'saved');assert.equal(entered,true);db.close();
});
test('저장 콜백 오류는 그대로 전달하고 다음 탭의 transaction을 막지 않는다',async()=>{
 const expected=Error('quota');await assert.rejects(storageUpdate('workbook',()=>{throw expected;}),e=>e===expected);
 assert.equal(await storageUpdate('workbook',()=>42),42);
});
test('Web Locks와 IndexedDB 모두 없으면 데이터를 수정하지 않고 실패한다',async()=>{
 Reflect.deleteProperty(globalThis,'indexedDB');let changed=false;
 await assert.rejects(storageUpdate('workbook',()=>{changed=true;}),/안전하게 저장/);assert.equal(changed,false);
});
test('IndexedDB 접근 거부도 임계구간 실행 전에 실패한다',async()=>{
 Object.defineProperty(globalThis,'indexedDB',{configurable:true,get(){throw Error('denied');}});let changed=false;
 await assert.rejects(storageUpdate('workbook',()=>{changed=true;}),/안전하게 저장/);assert.equal(changed,false);
});
test('이미 사용 불가능한 IndexedDB 버전에서는 저장 콜백을 실행하지 않는다',async()=>{
 const request=indexedDB.open('decimal-storage-locks-v1',2);await new Promise<void>(resolve=>{request.onsuccess=()=>{request.result.close();resolve();};});let changed=false;
 await assert.rejects(storageUpdate('workbook',()=>{changed=true;}),/안전하게 저장/);assert.equal(changed,false);
});
test('Web Locks가 있어도 같은 authoritative IndexedDB 레코드를 읽고 쓴다',async()=>{
 let requested=false,mirror='legacy';Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async()=>{requested=true;}}}});
 assert.equal(await storageRecordUpdate('workbook',()=>mirror,raw=>({value:raw+'1',result:raw}),raw=>{mirror=raw;}),'legacy');
 mirror='stale';assert.equal(await storageRecordUpdate('workbook',()=>mirror,raw=>({value:raw+'2',result:raw}),raw=>{mirror=raw;}),'legacy1');
 assert.equal(mirror,'legacy12');assert.equal(requested,false);
});
test('동기 mirror 저장 실패는 IndexedDB 변경도 롤백한다',async()=>{
 let mirror='legacy';await storageRecordUpdate('workbook',()=>mirror,raw=>({value:raw,result:null}),raw=>{mirror=raw;});
 await assert.rejects(storageRecordUpdate('workbook',()=>mirror,()=>({value:'uncommitted',result:1}),()=>{throw Error('quota');}),/quota/);
 assert.equal(await storageRecordUpdate('workbook',()=>mirror,raw=>({value:raw,result:raw}),raw=>{mirror=raw;}),'legacy');assert.equal(mirror,'legacy');
});
test('이전 snapshot mirror를 다음 저장의 원본으로 사용하지 않는다',async()=>{
 let mirror='0';for(let n=1;n<=6;n++){mirror='stale';assert.equal(await storageRecordUpdate('counter',()=> '0',raw=>({value:String(Number(raw)+1),result:Number(raw)+1}),raw=>{mirror=raw;}),n);}assert.equal(mirror,'6');
});
test('IndexedDB put 실패에서는 mirror도 기존 record도 변경하지 않는다',async()=>{
 let mirror='legacy';await storageRecordUpdate('workbook',()=>mirror,raw=>({value:raw,result:null}),raw=>{mirror=raw;});
 const original=IDBObjectStore.prototype.put;
 IDBObjectStore.prototype.put=function(value,key){if(value==='uncommitted')throw new DOMException('quota','QuotaExceededError');return original.call(this,value,key);};
 try{await assert.rejects(storageRecordUpdate('workbook',()=>mirror,()=>({value:'uncommitted',result:1}),raw=>{mirror=raw;}),e=>(e as Error).name==='QuotaExceededError');assert.equal(mirror,'legacy');}
 finally{IDBObjectStore.prototype.put=original;}
 assert.equal(await storageRecordUpdate('workbook',()=>mirror,raw=>({value:raw,result:raw}),raw=>{mirror=raw;}),'legacy');
});
