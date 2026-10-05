export interface HistoryCursor{time:number;id:string;}
export interface HistoryRow<T>{cursor:HistoryCursor;record:T;}
const prefix='decimal-history-sync-v1:',WINDOW=60000,FRESH=300000;
export async function incrementalHistory<T>(uid:string,read:(from:number,cursor?:HistoryCursor)=>Promise<HistoryRow<T>[]>,apply:(rows:T[])=>boolean,now=Date.now()){
 let saved:{after:HistoryCursor;checkedAt:number}|null=null;
 try{const v=JSON.parse(localStorage.getItem(prefix+uid)||'null');if((localStorage.getItem('decimal-learning-v1')||v?.after?.time===0)&&Number.isSafeInteger(v?.after?.time)&&typeof v?.after?.id==='string'&&Number.isFinite(v?.checkedAt))saved=v;}catch{}
 if(saved&&now>=saved.checkedAt&&now-saved.checkedAt<FRESH)return [];
 // Transactions have a 30-second timeout. Revisit one minute to include
 // writes committed after the previous query and equal-timestamp records.
 const from=Math.max(0,(saved?.after.time??0)-WINDOW),result:T[]=[];let cursor:HistoryCursor|undefined,highest=saved?.after??{time:0,id:''};
 for(;;){const page=await read(from,cursor);if(!page.length)break;
  if(page.some(r=>!Number.isSafeInteger(r.cursor.time)||r.cursor.time<from))throw Error('경기 저장 시간을 확인할 수 없어요.');
  if(!apply(page.map(r=>r.record)))throw Error('학습 기록을 브라우저에 저장하지 못했어요. 다음에 다시 가져와요.');
  result.push(...page.map(r=>r.record));const next=page.at(-1)!.cursor;
  if(cursor&&next.time===cursor.time&&next.id===cursor.id)throw Error('경기 기록 조회가 진행되지 않았어요.');
  cursor=next;if(next.time>highest.time||next.time===highest.time&&next.id>highest.id)highest=next;
  if(page.length<100)break;
 }
 // A failed import never advances the cursor, so a retry cannot lose questions.
 try{localStorage.setItem(prefix+uid,JSON.stringify({after:highest,checkedAt:now}));}catch{}
 return result;
}
