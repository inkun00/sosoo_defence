/** Pages dispose audio, peers and subscriptions on pagehide. A history-cache
 * restore must reopen the saved page rather than reuse that disposed runtime. */
export function reloadOnCachedRestore(target:EventTarget,reload:()=>void){
 let reloading=false;
 const restored=(event:Event)=>{
  if(reloading||(event as PageTransitionEvent).persisted!==true)return;
  reloading=true;target.removeEventListener('pageshow',restored);reload();
 };
 target.addEventListener('pageshow',restored);
 return ()=>target.removeEventListener('pageshow',restored);
}
