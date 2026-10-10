import {HostPeer} from '../src/multiplayer/peer';
import {DUEL_MAPS,duelMap} from '../src/multiplayer/duel-maps';
import {decimalBoard} from '../src/multiplayer/decimal-boards';
import {duelHeroLearningLevel,DUEL_PREPARATION_SECONDS} from '../src/multiplayer/duel';
import {additionSlots} from '../src/multiplayer/computer-peer';
import {worksheetHeroSpec,heroEffectStats} from '../src/multiplayer/heroes';
import {peerConfiguration,resolvePeerConfiguration} from '../src/multiplayer/peer-network';
import {loadPeerConfiguration} from '../src/multiplayer/relay-store';
import {auth} from '../src/multiplayer/firebase';
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
  const mode=(document.getElementById('network') as HTMLSelectElement).value;
  let configuration=peerConfiguration();
  if(mode==='failure')configuration=await resolvePeerConfiguration(async()=>{throw Error('fixture service unavailable');});
  if(mode==='timeout')configuration=await resolvePeerConfiguration(()=>new Promise(()=>{}),100);
  if(mode==='service'||mode==='relay'){await auth?.authStateReady();configuration=await loadPeerConfiguration();}
  const relayCount=configuration.iceServers?.filter(server=>(typeof server.urls==='string'?[server.urls]:server.urls).some(url=>/^turns?:/i.test(url))).length??0;
  if(mode==='relay'){if(!relayCount)throw Error('실제 TURN 서비스가 설정되지 않아 중계 경로를 검증할 수 없어요.');configuration.iceTransportPolicy='relay';}
  host=new HostPeer({uid:'network-test-host',name:'연결 호스트',accountLevel:1,rewardHeroes:['hero-1-0','hero-4-1'],rewardHero:'hero-1-0'},configuration);
  guest=new HostPeer({uid:'network-test-guest',name:'연결 참가자',accountLevel:8,rewardHeroes:['hero-2-2','hero-10-1'],rewardHero:'hero-2-2'},structuredClone(configuration));
  note(`자동 연결 설정: STUN 2개 · TURN ${relayCount}개 · 경로 정책 ${host.pc.getConfiguration().iceTransportPolicy}`);
  if(mode==='failure'||mode==='timeout')note('PASS · 자격 서비스 오류/지연 뒤 직접 연결 후보 유지');
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
  for(const state of [host.state!,guest.state!]){
   if(state.players[0].accountLevel!==1||state.players[1]!.accountLevel!==8)throw Error('개인 계정 레벨이 접속 중 바뀌었어요.');
   for(const player of state.players)if(duelHeroLearningLevel(player!)!==1||JSON.stringify(player!.board)!==JSON.stringify(decimalBoard(state.seed,player!.round,1)))throw Error('영웅 덧셈의 첫 1단계 문제판이 일치하지 않아요.');
   if(JSON.stringify(state.players[0].board)!==JSON.stringify(state.players[1]!.board))throw Error('첫 문제판이 계정 레벨에 따라 달라졌어요.');
  }
  note('PASS · 실제 데이터 채널에서 Lv.1/Lv.8 계정 유지 · 계정과 무관한 같은 1단계 영웅 문제판');
  await host.send({type:'ready',heroId:'hero-4-1'});const ready=await guest.send({type:'ready',heroId:'hero-10-1'});
  if(!ready.ok||host.state?.status!=='preparing')throw Error('준비 메시지를 교환하지 못했어요. '+ready.message);
  note(`PASS · 실제 데이터 채널에서 양쪽 준비 완료 · ${DUEL_PREPARATION_SECONDS}초 문제풀이 시작`);
  if(host.state!.enemies.length!==0||host.state!.players[0].rewardHero!=='hero-4-1'||host.state!.players[1]!.rewardHero!=='hero-10-1')throw Error('준비 중에는 선택한 학습지 영웅을 대기시켜야 해요.');
  note('PASS · 선택과 준비 원자 처리 · 학습지 영웅은 전투 소환을 기다림');
  for(const [target,stage] of [[5,2],[10,3],[15,4]]){
   while(host.state!.players[0].solved<target){
    await new Promise(resolve=>setTimeout(resolve,250));const player=host.state!.players[0],slots=additionSlots(player.board);
    if(!slots)throw Error('영웅 덧셈의 정답을 찾지 못했어요.');const solved=await host.send({type:'fuse',round:player.round,slots,operation:'+'});if(!solved.ok)throw Error(solved.message);
   }
   await guest.send({type:'tick'});
   for(const state of [host.state!,guest.state!]){
    const player=state.players[0],other=state.players[1]!;
    if(player.solved!==target||player.egg!==target||duelHeroLearningLevel(player)!==stage||JSON.stringify(player.board)!==JSON.stringify(decimalBoard(state.seed,player.round,stage)))throw Error('개인 정답수에 따른 학습 단계·성장량이 양쪽에 일치하지 않아요.');
    if(other.solved!==0||other.egg!==0||duelHeroLearningLevel(other)!==1)throw Error('한 사람의 정답이 상대의 학습 진도를 올렸어요.');
   }
   note(`PASS · 데이터 채널에서 호스트 정답 ${target}개 → ${stage}단계 · 성장량 ${target} · 참가자 1단계 유지`);
  }
  const positions=JSON.stringify(host.state!.enemies.map(enemy=>[enemy.id,enemy.pathDistance,enemy.hp]));
  let frozenChecked=false,snapshotChecked=false,battleChecked=false;
  const started=host.state!.preparationStartedAt;
  host.onState=s=>{
   if(!frozenChecked&&s.status==='preparing'&&s.preparationElapsed>=3){frozenChecked=true;note((JSON.stringify(s.enemies.map(enemy=>[enemy.id,enemy.pathDistance,enemy.hp]))===positions?'PASS':'FAIL')+' · 준비 중 영웅 위치·체력 고정');}
   if(s.status==='playing'&&!battleChecked){
    battleChecked=true;note(`PASS · 호스트 전투 시작: ${s.startedAt-started}ms · 코인 ${s.players[0].money}/${s.players[1]!.money} · 성장량 ${s.players[0].egg}/${s.players[1]!.egg}`);host!.onState=()=>{};
    void(async()=>{
     await new Promise(resolve=>setTimeout(resolve,250));const first=await host!.send({type:'summon-reward'}),second=await guest!.send({type:'summon-reward'});if(!first.ok||!second.ok)throw Error(first.message+' '+second.message);
     const heroes=host!.state!.enemies.filter(enemy=>enemy.rewardSummon),high=heroes.find(enemy=>enemy.owner===1&&enemy.hero==='hero-10-1'),spec=worksheetHeroSpec('hero-10-1')!;
     if(heroes.length!==2||!heroes.some(enemy=>enemy.owner===0&&enemy.hero==='hero-4-1')||!high||high.vitalityBonus!==Math.round(spec.hp*heroEffectStats(spec.level).amount/10)*10)throw Error('전투 중 학습지 영웅의 수동 소환·체력 강화가 일치하지 않아요.');
     if(host!.state!.players[0].egg!==15||host!.state!.players[1]!.egg!==0)throw Error('학습지 영웅 소환이 성장량을 소비했어요.');
     note('PASS · 전투 중 양쪽 학습지 영웅 한 명씩 수동 소환 · 체력 강화 · 성장량 보존');
    })().catch(error=>note('FAIL · '+(error as Error).message));
   }
  };
  guest.onState=s=>{
   if(!snapshotChecked&&s.status==='preparing'&&s.preparationElapsed>=1){snapshotChecked=true;note((s.players[0].rewardHero==='hero-4-1'&&s.players[1]!.rewardHero==='hero-10-1'&&JSON.stringify(s.enemies.map(enemy=>[enemy.id,enemy.pathDistance,enemy.hp]))===positions?'PASS':'FAIL')+' · 참가자 선택 영웅 대기 상태 일치');}
   if(s.status==='playing'){note(`PASS · 참가자 전투 시작: ${s.startedAt-started}ms · 코인 ${s.players[0].money}/${s.players[1]!.money} · 출전 영웅 ${s.enemies.filter(enemy=>enemy.rewardSummon).length}`);guest!.onState=()=>{};}
  };
 }catch(error){note('FAIL · '+(error as Error).message);host?.dispose();guest?.dispose();}
 finally{button.disabled=false;}
};
window.addEventListener('pagehide',()=>{host?.dispose();guest?.dispose();});
