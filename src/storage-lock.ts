const DATABASE='decimal-storage-locks-v1',STORE='locks';
const unavailable=()=>Error('이 브라우저에서는 학습지를 안전하게 저장할 수 없어요. 일반 브라우저 창에서 다시 시도해 주세요.');
export interface StorageChange<T>{value:string;result:T;}

// The IndexedDB record is authoritative. localStorage is a synchronous mirror
// for existing readers, never the source of a later read-modify-write. Different
// browser processes can retain stale localStorage snapshots even under a mutex.
function transactionUpdate<T>(name:string,legacy:()=>string,update:(raw:string)=>StorageChange<T>,mirror:(raw:string)=>void,repair=true):Promise<T>{
 return new Promise((resolve,reject)=>{
  let factory:IDBFactory;
  try{factory=globalThis.indexedDB;if(!factory){reject(unavailable());return;}}catch{reject(unavailable());return;}
  let open:IDBOpenDBRequest,settled=false;
  const timer=setTimeout(()=>{settled=true;reject(unavailable());},10000);
  try{open=factory.open(DATABASE,1);}catch{clearTimeout(timer);reject(unavailable());return;}
  open.onupgradeneeded=()=>{if(!open.result.objectStoreNames.contains(STORE))open.result.createObjectStore(STORE);};
  open.onerror=()=>{clearTimeout(timer);if(!settled){settled=true;reject(unavailable());}};
  open.onsuccess=()=>{
   clearTimeout(timer);const database=open.result;
   if(settled){database.close();return;}
   database.onversionchange=()=>database.close();
   let transaction:IDBTransaction,result:T,failure:unknown;
   try{
    transaction=database.transaction(STORE,'readwrite');const store=transaction.objectStore(STORE),request=store.get(name);
    request.onsuccess=()=>{
     try{
      if(request.result!==undefined&&typeof request.result!=='string')throw unavailable();
      const change=update(request.result===undefined?legacy():request.result);
      if(!change||typeof change.value!=='string'||typeof (change as {then?:unknown}).then==='function')throw unavailable();
      result=change.result;
      // A quota/put failure happens before the mirror changes. If the mirror
      // fails, abort rolls back the record so a reward remains unclaimed.
      const write=store.put(change.value,name);
      write.onsuccess=()=>{try{mirror(change.value);}catch(error){failure=error;transaction.abort();}};
     }catch(error){failure=error;transaction.abort();}
    };
    transaction.oncomplete=()=>{settled=true;database.close();resolve(result);};
    transaction.onabort=()=>{
     settled=true;database.close();const reason=failure??unavailable();
     // Even a late commit failure must not leave an uncommitted mirror. Repair
     // through a new transaction, so it cannot overwrite another tab's save.
     if(repair)void transactionUpdate(name,legacy,raw=>({value:raw,result:undefined}),mirror,false).catch(()=>undefined).finally(()=>reject(reason));
     else reject(reason);
    };
   }catch{settled=true;database.close();reject(unavailable());}
  };
 });
}

/** All clients use one authoritative database, regardless of Web Locks support. */
export function storageRecordUpdate<T>(name:string,legacy:()=>string,update:(raw:string)=>StorageChange<T>,mirror:(raw:string)=>void):Promise<T>{
 return transactionUpdate(name,legacy,update,mirror);
}
