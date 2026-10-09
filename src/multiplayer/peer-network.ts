import {validRelayConfiguration} from './relay';
/** ICE prefers working direct routes and can relay restrictive networks. */
export function peerConfiguration(relay?:unknown,now=Date.now()):RTCConfiguration{
 const servers=validRelayConfiguration(relay,now)?.iceServers??[];
 return {
  iceTransportPolicy:'all',
  iceServers:[
   {urls:'stun:stun.l.google.com:19302'},
   {urls:'stun:stun1.l.google.com:19302'},
   ...servers
  ]
 };
}

/** A missing/degraded credential service must not block LAN/STUN connections. */
export async function resolvePeerConfiguration(request:()=>Promise<unknown>,timeoutMs=4000):Promise<RTCConfiguration>{
 let timer:ReturnType<typeof setTimeout>|undefined;
 try{
  const response=await Promise.race([Promise.resolve().then(request),new Promise<null>(resolve=>{timer=setTimeout(()=>resolve(null),timeoutMs);})]);
  return peerConfiguration(response);
 }catch{return peerConfiguration();}
 finally{clearTimeout(timer);}
}

/** Publish the candidates gathered so far even when a STUN request stalls. */
export function gatherPeerCandidates(pc:RTCPeerConnection,timeoutMs=15000):Promise<void>{
 return new Promise((resolve,reject)=>{
  let timer:ReturnType<typeof setTimeout>|undefined,settled=false;
  const finish=()=>{
   if(settled)return;settled=true;clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',change);
   if(/^a=candidate:/m.test(pc.localDescription?.sdp??''))resolve();
   else reject(Error('접속 주소를 찾지 못했어요. 인터넷 연결을 확인하고 새 방으로 다시 시도해 주세요.'));
  };
  const change=()=>{if(pc.iceGatheringState==='complete')finish();};
  if(pc.iceGatheringState==='complete'){finish();return;}
  pc.addEventListener('icegatheringstatechange',change);timer=setTimeout(finish,timeoutMs);
 });
}
