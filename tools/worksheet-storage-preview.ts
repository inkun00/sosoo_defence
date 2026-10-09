import {getOrCreateWorksheet,loadWorkbook,redeemWorksheet,selectWorksheetHero,syncWorkbook} from '../src/worksheet-store';
import {worksheetCode} from '../src/worksheet';

// Local-only fixture: use a new dev-server origin. It backs up any workbook and
// learning values before reset and can restore them after the two-tab exercise.
if(!['127.0.0.1','localhost'].includes(location.hostname))throw Error('로컬 저장 검증 페이지예요.');
Object.defineProperty(navigator,'locks',{configurable:true,value:undefined});
const name=new URLSearchParams(location.search).get('tab')??'A',id=crypto.randomUUID(),channel=new BroadcastChannel('decimal-workbook-storage-qa-v1');
const backupKey='decimal-workbook-storage-qa-backup-v1',keys=['decimal-workbook-v1','decimal-learning-v1'];
let action='ready',phase='ready',error='',successes=0,failures=0,held=false;
interface Command{action:'generate'|'same-redeem'|'different-redeem'|'select-redeem';at:number;ids?:string[];hero?:string;}
document.getElementById('app')!.innerHTML=`<h1>학습지 두 탭 저장 검증 · ${name}</h1><p>Web Locks 없이 실제 IndexedDB transaction을 사용합니다.</p><div id="buttons"><button id="qa-reset">검증 초기화</button><button id="qa-generate">두 탭 동시에 5장씩 생성</button><button id="qa-same-redeem">같은 학습지 동시 보상</button><button id="qa-different-redeem">서로 다른 학습지 동시 보상</button><button id="qa-select-redeem">영웅 선택과 보상 동시 실행</button><button id="qa-hold">이 탭에서 저장 잠금 유지</button><button id="qa-release">잠금 해제</button><button id="qa-restore">기존 저장 복원</button></div><pre id="storage-proof" aria-live="polite"></pre>`;
const style=document.createElement('style');style.textContent='body{font:16px system-ui;background:#111827;color:#ffe8b0;padding:20px}#buttons{display:flex;gap:10px;flex-wrap:wrap}button{min-height:44px;padding:10px;border:1px solid #d1a456;background:#263348;color:inherit;border-radius:6px}pre{white-space:pre-wrap;overflow-wrap:anywhere;line-height:1.5}';document.head.append(style);
function proof(){const book=loadWorkbook();document.getElementById('storage-proof')!.textContent=JSON.stringify({tab:name,id,storage:'IndexedDB authoritative',webLocks:!!navigator.locks,indexedDB:!!globalThis.indexedDB,action,phase,error,successes,failures,held,sheets:book.sheets.length,sheetIds:book.sheets.map(s=>s.id),claimed:book.sheets.filter(s=>s.claimedHero).length,heroes:book.collection.map(h=>h.heroId),selected:book.selectedHero},null,2);}
function launch(command:Command){channel.postMessage(command);receive(command);}
function receive(command:Command){if(!command?.action||!Number.isFinite(command.at))return;action=command.action;phase='scheduled';error='';successes=0;failures=0;proof();setTimeout(()=>void run(command),Math.max(0,command.at-Date.now()));}
async function run(command:Command){phase='running';proof();try{
 if(command.action==='generate'){const results=await Promise.allSettled(Array.from({length:5},()=>getOrCreateWorksheet(4,true)));successes=results.filter(r=>r.status==='fulfilled').length;failures=results.length-successes;error=results.filter((r):r is PromiseRejectedResult=>r.status==='rejected').map(r=>(r.reason as Error).message).join('; ');}
 else if(command.action==='select-redeem'&&name==='A'){await selectWorksheetHero(command.hero??null);successes=1;}
 else{const sheetId=command.ids?.[command.action==='different-redeem'&&name!=='A'?1:0],sheet=loadWorkbook().sheets.find(s=>s.id===sheetId);if(!sheet)throw Error('보상을 받을 검증 학습지가 없어요.');await redeemWorksheet(sheet.id,worksheetCode(sheet),()=>0);successes=1;}
 }catch(e){failures=1;error=(e as Error).message;}finally{phase='done';proof();}}
channel.onmessage=event=>receive(event.data as Command);
const bind=(button:string,fn:()=>void)=>document.getElementById(button)!.addEventListener('click',fn);
function removeDatabase(){return new Promise<void>((resolve,reject)=>{const request=indexedDB.deleteDatabase('decimal-storage-locks-v1');request.onsuccess=()=>resolve();request.onerror=()=>reject(request.error);request.onblocked=()=>{phase='database-blocked';proof();};});}
bind('qa-reset',()=>void(async()=>{action='reset';phase='resetting';proof();try{await syncWorkbook();if(!localStorage.getItem(backupKey))localStorage.setItem(backupKey,JSON.stringify(keys.map(key=>[key,localStorage.getItem(key)])));await removeDatabase();for(const key of keys)localStorage.removeItem(key);await syncWorkbook();phase='done';error='';}catch(e){phase='failed';error=(e as Error).message;}proof();})());
bind('qa-generate',()=>launch({action:'generate',at:Date.now()+700}));
bind('qa-same-redeem',()=>launch({action:'same-redeem',at:Date.now()+700,ids:loadWorkbook().sheets.filter(s=>!s.claimedHero).slice(0,1).map(s=>s.id)}));
bind('qa-different-redeem',()=>launch({action:'different-redeem',at:Date.now()+700,ids:loadWorkbook().sheets.filter(s=>!s.claimedHero).slice(0,2).map(s=>s.id)}));
bind('qa-select-redeem',()=>launch({action:'select-redeem',at:Date.now()+700,ids:loadWorkbook().sheets.filter(s=>!s.claimedHero).slice(0,1).map(s=>s.id),hero:loadWorkbook().collection[0]?.heroId}));
bind('qa-hold',()=>{const request=indexedDB.open('decimal-storage-locks-v1',1);request.onupgradeneeded=()=>request.result.createObjectStore('locks');request.onerror=()=>{error=request.error?.message??'잠금 실패';proof();};request.onsuccess=()=>{const db=request.result,transaction=db.transaction('locks','readwrite'),store=transaction.objectStore('locks');held=true;action='hold';phase='holding';proof();const hold=()=>{const next=store.get('hold');next.onsuccess=()=>{if(held)hold();};};transaction.oncomplete=transaction.onabort=()=>{held=false;db.close();proof();};hold();};});
bind('qa-release',()=>{held=false;phase='done';proof();});
bind('qa-restore',()=>void(async()=>{action='restore';phase='restoring';proof();try{const backup=JSON.parse(localStorage.getItem(backupKey)??'null') as [string,string|null][]|null;await removeDatabase();if(backup)for(const [key,value] of backup){if(value===null)localStorage.removeItem(key);else localStorage.setItem(key,value);}await syncWorkbook();localStorage.removeItem(backupKey);phase='done';error='';}catch(e){phase='failed';error=(e as Error).message;}proof();})());
window.addEventListener('pagehide',()=>{held=false;channel.close();});await syncWorkbook();setInterval(proof,200);proof();
