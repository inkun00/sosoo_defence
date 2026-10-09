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
  host=new HostPeer({uid:'network-test-host',name:'연결 호스트',rewardHeroes:['hero-1-0','hero-4-1'],rewardHero:'hero-1-0'});
  guest=new HostPeer({uid:'network-test-guest',name:'연결 참가자',rewardHeroes:['hero-2-2','hero-10-1'],rewardHero:'hero-2-2'});
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
  await host.send({type:'ready',heroId:'hero-4-1'});const ready=await guest.send({type:'ready',heroId:'hero-10-1'});
  if(!ready.ok||host.state?.status!=='preparing')throw Error('준비 메시지를 교환하지 못했어요. '+ready.message);
  note('PASS · 실제 데이터 채널에서 양쪽 준비 완료 · 60초 문제풀이 시작');
  const heroes=host.state!.enemies.filter(enemy=>enemy.rewardSummon);
  if(heroes.length!==2||host.state!.enemies.length!==2||heroes[0].hero!=='hero-4-1'||heroes[1].hero!=='hero-10-1')throw Error('선택한 영웅 한 명씩 즉시 출전하지 않았어요.');
  if(heroes[1].hp!==13290||heroes[1].max!==13290||heroes[1].vitalityBonus!==4190)throw Error('체력 강화가 출전 상태에 반영되지 않았어요.');
  note('PASS · 선택과 준비 원자 처리 · 양쪽 선택 영웅 한 명씩 즉시 출전 · 동반 병사 없음');
  note('PASS · 최고 레벨 체력 강화 46% · 체력 9.1 → 13.29 · 추가 체력 상태 포함');
  const positions=JSON.stringify(host.state!.enemies.map(enemy=>[enemy.id,enemy.pathDistance,enemy.hp]));
  let frozenChecked=false,snapshotChecked=false;
  const started=host.state!.preparationStartedAt;
  host.onState=s=>{
   if(!frozenChecked&&s.status==='preparing'&&s.preparationElapsed>=3){frozenChecked=true;note((JSON.stringify(s.enemies.map(enemy=>[enemy.id,enemy.pathDistance,enemy.hp]))===positions?'PASS':'FAIL')+' · 준비 중 영웅 위치·체력 고정');}
   if(s.status==='playing'){note(`PASS · 호스트 전투 시작: ${s.startedAt-started}ms · 코인 ${s.players[0].money}/${s.players[1]!.money} · 출전 영웅 ${s.enemies.filter(enemy=>enemy.rewardSummon).length}`);host!.onState=()=>{};}
  };
  guest.onState=s=>{
   if(!snapshotChecked&&s.status==='preparing'&&s.preparationElapsed>=1){snapshotChecked=true;note((s.players[0].rewardHero==='hero-4-1'&&s.players[1]!.rewardHero==='hero-10-1'&&JSON.stringify(s.enemies.map(enemy=>[enemy.id,enemy.pathDistance,enemy.hp]))===positions&&s.enemies.find(enemy=>enemy.hero==='hero-10-1')?.vitalityBonus===4190?'PASS':'FAIL')+' · 참가자 선택 영웅·체력 강화·즉시 출전 상태 일치');}
   if(s.status==='playing'){note(`PASS · 참가자 전투 시작: ${s.startedAt-started}ms · 코인 ${s.players[0].money}/${s.players[1]!.money} · 출전 영웅 ${s.enemies.filter(enemy=>enemy.rewardSummon).length}`);guest!.onState=()=>{};}
  };
 }catch(error){note('FAIL · '+(error as Error).message);host?.dispose();guest?.dispose();}
 finally{button.disabled=false;}
};
window.addEventListener('pagehide',()=>{host?.dispose();guest?.dispose();});
