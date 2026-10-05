const KEY='decimal-castle-hit-equations';
let enabled=true;
try{enabled=localStorage.getItem(KEY)!=='off';}catch{}
const listeners=new Set<(enabled:boolean)=>void>();
export function hitEquationsEnabled(){return enabled;}
export function setHitEquationsEnabled(value:boolean){
 enabled=value;try{localStorage.setItem(KEY,value?'on':'off');}catch{}
 for(const listener of listeners)listener(value);
}
export function onHitEquationsChange(listener:(enabled:boolean)=>void){listeners.add(listener);return()=>listeners.delete(listener);}
if(typeof window!=='undefined')window.addEventListener('storage',e=>{
 if(e.key!==KEY&&e.key!==null)return;enabled=e.newValue!=='off';for(const listener of listeners)listener(enabled);
});
