import {HostPeer} from '../src/multiplayer/peer';
import {DUEL_MAPS,duelMap} from '../src/multiplayer/duel-maps';
const mapChoice=document.getElementById('map') as HTMLSelectElement;
for(const map of DUEL_MAPS){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;mapChoice.append(option);}
const button=document.getElementById('connect') as HTMLButtonElement;
const result=document.getElementById('result')!;
let host:HostPeer|undefined,guest:HostPeer|undefined;
const lines:string[]=[];
function note(text:string){lines.push(text);result.textContent=lines.join('\n');}
function candidates(code:string){
 const encoded=code.slice(5),bytes=Uint8Array.from(atob(encoded),c=>c.charCodeAt(0));
 const description=JSON.parse(new TextDecoder().decode(bytes)).sdp.sdp as string;
 return [...new Set([...description.matchAll(/^a=candidate:.* typ (\w+)/gm)].map(m=>m[1]))].join(', ');
}
button.onclick=async()=>{
 button.disabled=true;host?.dispose();guest?.dispose();lines.length=0;
 try{
  host=new HostPeer({uid:'network-test-host',name:'연결 호스트'});
  guest=new HostPeer({uid:'network-test-guest',name:'연결 참가자'});
  note(`자동 연결 설정: 양쪽 STUN ${host.pc.getConfiguration().iceServers?.length}개 · 경로 정책 ${host.pc.getConfiguration().iceTransportPolicy}`);
  const offer=await host.create(mapChoice.value);note('호스트 접속 주소 유형: '+candidates(offer));
  const answer=await guest.join(offer);note('참가자 접속 주소 유형: '+candidates(answer));
  await host.accept(answer);
  await new Promise<void>((resolve,reject)=>{
   const timeout=setTimeout(()=>reject(Error('두 수호자가 연결되지 않았어요.')),30000);
   const check=()=>{if(host?.connected&&guest?.connected&&host.state?.players[1]&&guest.state?.players[1]){clearTimeout(timeout);resolve();}};
   host!.onState=check;guest!.onState=check;check();
  });
  const pair=await host.connectionInfo();note(`선택된 실제 경로: ${pair?.local} ↔ ${pair?.remote} · ${pair?.protocol}`);
  if(host.state?.mapId!==mapChoice.value||guest.state?.mapId!==mapChoice.value)throw Error('양쪽 맵이 일치하지 않아요.');
  note('PASS · 양쪽 같은 맵 · '+duelMap(mapChoice.value).name);
  await host.send({type:'ready'});const ready=await guest.send({type:'ready'});
  if(!ready.ok||host.state?.status!=='preparing')throw Error('준비 메시지를 교환하지 못했어요.');
  note('PASS · 실제 데이터 채널에서 양쪽 준비 완료 · 60초 문제풀이 시작');
  const started=host.state!.preparationStartedAt;
  host.onState=s=>{if(s.status==='playing'){note(`PASS · 호스트 전투 시작: ${s.startedAt-started}ms · 코인 ${s.players[0].money}/${s.players[1]!.money}`);host!.onState=()=>{};}};
  guest.onState=s=>{if(s.status==='playing'){note(`PASS · 참가자 전투 시작: ${s.startedAt-started}ms · 코인 ${s.players[0].money}/${s.players[1]!.money}`);guest!.onState=()=>{};}};
 }catch(error){note('FAIL · '+(error as Error).message);host?.dispose();guest?.dispose();}
 finally{button.disabled=false;}
};
window.addEventListener('pagehide',()=>{host?.dispose();guest?.dispose();});
