/** Wire values only: the shared TURN signing secret never reaches the browser. */
export interface RelayServer{urls:string[];username:string;credential:string;}
export interface RelayConfiguration{available:boolean;expiresAt:number;iceServers:RelayServer[];}
export const RELAY_TTL_SECONDS=1200;

/** Restrict server-owned URLs to WebRTC TURN URLs, without embedded credentials. */
export function relayURLs(value:unknown):string[]{
 if(!Array.isArray(value)||value.length<1||value.length>8)return [];
 const urls:string[]=[];
 for(const url of value){
  if(typeof url!=='string'||url.length>256)return [];
  const match=/^(turn|turns):(?:\[([0-9a-f:.]+)\]|([a-z0-9](?:[a-z0-9.-]*[a-z0-9])?))(?::([0-9]{1,5}))?(?:\?transport=(udp|tcp))?$/i.exec(url);
  if(!match||match[4]!==undefined&&(Number(match[4])<1||Number(match[4])>65535)||match[1].toLowerCase()==='turns'&&match[5]?.toLowerCase()==='udp')return [];
  if(match[2]){try{new URL(`https://[${match[2]}]`);}catch{return [];}}
  if(match[3]&&match[3].split('.').some(part=>!part||part.length>63||part.startsWith('-')||part.endsWith('-')))return [];
  urls.push(url);
 }
 return [...new Set(urls)];
}

export function validRelayConfiguration(value:unknown,now=Date.now()):RelayConfiguration|null{
 if(!value||typeof value!=='object')return null;
 const response=value as Record<string,unknown>;
 if(response.available!==true||!Number.isSafeInteger(response.expiresAt)||Number(response.expiresAt)<=now+30000||Number(response.expiresAt)>now+1800000||!Array.isArray(response.iceServers)||response.iceServers.length<1||response.iceServers.length>4)return null;
 const iceServers:RelayServer[]=[];
 for(const raw of response.iceServers){
  if(!raw||typeof raw!=='object')return null;
  const server=raw as Record<string,unknown>,urls=relayURLs(server.urls);
  if(!urls.length||typeof server.username!=='string'||server.username.length<1||server.username.length>256||/[\s\x00-\x1f]/.test(server.username)||typeof server.credential!=='string'||server.credential.length<20||server.credential.length>256||!/^[A-Za-z0-9+/]+=*$/.test(server.credential))return null;
  iceServers.push({urls,username:server.username,credential:server.credential});
 }
 return {available:true,expiresAt:Number(response.expiresAt),iceServers};
}
