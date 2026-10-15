export type PageMode='title'|'adventure'|'tutorial'|'duel'|'worksheet';
export type ProtectedPageMode=Extract<PageMode,'duel'|'worksheet'>;
export interface PageRequest{mode:PageMode;search:string;}
export interface AccountSession{currentUser:unknown|null;authStateReady():Promise<void>;}
export const ACCOUNT_CONNECTION_TIMEOUT_MS=10000;
export class AccountConnectionTimeout extends Error{
 constructor(){super('계정 서버에 연결하지 못했어요. 연결을 확인하고 다시 시도해 주세요.');this.name='AccountConnectionTimeout';}
}
export function pageRequest(search:string):PageRequest{
 const mode=new URLSearchParams(search).get('mode');
 return {mode:mode==='adventure'||mode==='tutorial'||mode==='duel'||mode==='worksheet'?mode:'title',search};
}
export function requiresAccount(mode:PageMode):mode is ProtectedPageMode{return mode==='duel'||mode==='worksheet';}
// Keep the request in memory while login is displayed. There is no URL or
// redirect destination supplied by a login form to trust or reconstruct.
export async function openAuthorizedPage(request:PageRequest,dependencies:{
 session:()=>Promise<AccountSession|null>;
 login:(mode:ProtectedPageMode)=>Promise<void>;
 load:(request:PageRequest)=>Promise<unknown>;
}):Promise<boolean>{
 if(requiresAccount(request.mode)){
  const session=await dependencies.session();
  if(session){
   let timer:ReturnType<typeof setTimeout>|undefined;
   try{await Promise.race([session.authStateReady(),new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new AccountConnectionTimeout()),ACCOUNT_CONNECTION_TIMEOUT_MS);})]);}
   finally{clearTimeout(timer);}
  }
  if(!session?.currentUser)await dependencies.login(request.mode);
  if(!session?.currentUser)return false;
 }
 await dependencies.load(request);return true;
}
// Printing waits for fonts and artwork. Check the live session after every
// preparation so a logout cannot finish a print that was already waiting.
export async function runAccountAction(hasAccess:()=>boolean,preparations:readonly (()=>Promise<unknown>)[],action:()=>void):Promise<boolean>{
 if(!hasAccess())return false;
 for(const prepare of preparations){await prepare();if(!hasAccess())return false;}
 action();return true;
}
