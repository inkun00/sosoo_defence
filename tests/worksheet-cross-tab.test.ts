import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {IDBFactory} from 'fake-indexeddb';
import {worksheetCode} from '../src/worksheet';

const cache=new Map<string,string>();let failStorage=false;
Object.defineProperty(globalThis,'localStorage',{configurable:true,value:{getItem:(key:string)=>cache.get(key)??null,setItem:(key:string,value:string)=>{if(failStorage)throw Error('quota');cache.set(key,value);}}});
Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
beforeEach(()=>{cache.clear();failStorage=false;Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});});

// Separate module instances reproduce separate tabs' module-local queues while
// their origin's localStorage and IndexedDB are shared.
const a=await import(new URL('../src/worksheet-store.ts?storage-tab=a',import.meta.url).href) as typeof import('../src/worksheet-store');
const b=await import(new URL('../src/worksheet-store.ts?storage-tab=b',import.meta.url).href) as typeof import('../src/worksheet-store');
test('Web Locks 없는 서로 다른 탭의 학습지 생성은 모두 저장된다',async()=>{
 const sheets=await Promise.all([a.getOrCreateWorksheet(4,true),b.getOrCreateWorksheet(4,true),a.getOrCreateWorksheet(4,true),b.getOrCreateWorksheet(4,true)]);
 assert.equal(new Set(sheets.map(s=>s.id)).size,4);
 assert.deepEqual(new Set(a.loadWorkbook().sheets.map(s=>s.id)),new Set(sheets.map(s=>s.id)));
});
test('서로 다른 탭의 기본 생성은 한 학습지만 보관한다',async()=>{
 const sheets=await Promise.all([a.getOrCreateWorksheet(4),b.getOrCreateWorksheet(4),a.getOrCreateWorksheet(4),b.getOrCreateWorksheet(4)]);
 assert.equal(new Set(sheets.map(s=>s.id)).size,1);assert.equal(a.loadWorkbook().sheets.length,1);
});
test('두 탭에서 같은 학습지 암호를 제출하면 한 영웅만 지급한다',async()=>{
 const sheet=await a.getOrCreateWorksheet(4,true),code=worksheetCode(sheet);
 const results=await Promise.allSettled([a.redeemWorksheet(sheet.id,code,()=>0),b.redeemWorksheet(sheet.id,code,()=>0)]);
 assert.equal(results.filter(r=>r.status==='fulfilled').length,1);
 assert.equal(a.loadWorkbook().collection.length,1);assert.equal(a.loadWorkbook().sheets[0].claimedHero,'hero-1-0');
});
test('두 탭에서 서로 다른 학습지 암호를 제출하면 영웅이 중복되지 않는다',async()=>{
 const sheets=await Promise.all([a.getOrCreateWorksheet(4,true),b.getOrCreateWorksheet(4,true)]);
 const rewards=await Promise.all([a.redeemWorksheet(sheets[0].id,worksheetCode(sheets[0]),()=>0),b.redeemWorksheet(sheets[1].id,worksheetCode(sheets[1]),()=>0)]);
 assert.deepEqual(new Set(rewards.map(r=>r.hero.id)),new Set(['hero-1-0','hero-1-1']));
 assert.equal(a.loadWorkbook().sheets.filter(s=>s.claimedHero).length,2);assert.equal(a.loadWorkbook().collection.length,2);
});
test('영웅 선택과 다른 탭의 생성·보상은 서로의 데이터를 지우지 않는다',async()=>{
 const previous=await a.getOrCreateWorksheet(4,true);await a.redeemWorksheet(previous.id,worksheetCode(previous),()=>0);
 const next=await b.getOrCreateWorksheet(4,true);
 await Promise.all([a.selectWorksheetHero('hero-1-0'),b.redeemWorksheet(next.id,worksheetCode(next),()=>0),a.getOrCreateWorksheet(4,true)]);
 const book=a.loadWorkbook();assert.equal(book.sheets.length,3);assert.equal(book.collection.length,2);assert.equal(book.selectedHero,'hero-1-0');
});
test('저장 실패로 잠금이 남지 않고 다른 탭에서 다시 지급할 수 있다',async()=>{
 const sheet=await a.getOrCreateWorksheet(4,true),code=worksheetCode(sheet);failStorage=true;
 await assert.rejects(a.redeemWorksheet(sheet.id,code,()=>0),/저장 공간/);
 assert.equal(a.loadWorkbook().collection.length,0);assert.equal(a.loadWorkbook().sheets[0].claimedHero,null);
 failStorage=false;await b.redeemWorksheet(sheet.id,code,()=>0);assert.equal(a.loadWorkbook().collection.length,1);
});
test('다른 탭의 오래된 localStorage snapshot은 저장·보상의 원본이 되지 않는다',async()=>{
 const sheets=await Promise.all([a.getOrCreateWorksheet(4,true),b.getOrCreateWorksheet(4,true)]),stale=cache.get('decimal-workbook-v1')!;
 await a.redeemWorksheet(sheets[0].id,worksheetCode(sheets[0]),()=>0);cache.set('decimal-workbook-v1',stale);
 await b.redeemWorksheet(sheets[1].id,worksheetCode(sheets[1]),()=>0);assert.equal(b.loadWorkbook().collection.length,2);assert.equal(new Set(b.ownedHeroIds()).size,2);
 cache.set('decimal-workbook-v1',stale);await a.getOrCreateWorksheet(4,true);assert.equal(a.loadWorkbook().sheets.length,3);assert.equal(a.loadWorkbook().collection.length,2);
});
test('재로딩 초기 동기화는 authoritative 레코드로 동기 loadWorkbook을 복원한다',async()=>{
 const sheet=await a.getOrCreateWorksheet(4,true);await a.redeemWorksheet(sheet.id,worksheetCode(sheet),()=>0);const saved=JSON.stringify(a.loadWorkbook());
 cache.set('decimal-workbook-v1',JSON.stringify({version:1,sheets:[],collection:[],selectedHero:null}));assert.equal(b.loadWorkbook().collection.length,0);
 await b.syncWorkbook();assert.equal(JSON.stringify(b.loadWorkbook()),saved);
});
test('기존 학습지와 암호·중복 획득 이력·선택 영웅을 처음 migration에 모두 보존한다',async()=>{
 const first=await a.getOrCreateWorksheet(4,true),next=await b.getOrCreateWorksheet(4,true);await a.redeemWorksheet(first.id,worksheetCode(first),()=>0);
 const legacy=a.loadWorkbook();legacy.collection[0].copies=3;legacy.collection[0].obtainedAt=1700000000000;legacy.selectedHero=null;
 const saved=JSON.stringify(legacy);cache.set('decimal-workbook-v1',saved);Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});
 await b.syncWorkbook();assert.equal(JSON.stringify(b.loadWorkbook()),saved);assert.equal(b.loadWorkbook().sheets.find(s=>s.id===next.id)!.codeHash,next.codeHash);
 await assert.rejects(b.redeemWorksheet(first.id,worksheetCode(first),()=>0),/이미/);assert.equal(b.loadWorkbook().collection[0].copies,3);
 await b.redeemWorksheet(next.id,worksheetCode(next),()=>0);assert.equal(b.loadWorkbook().collection.length,2);assert.equal(b.loadWorkbook().collection[0].copies,3);
});
