import Phaser from 'phaser';
import {DuelScene,type DuelView} from '../src/multiplayer/scene';
import {createDuel,joinDuel,type DuelState,type DuelShot,type Side} from '../src/multiplayer/duel';
import {TOWERS} from '../src/towers';
import {towerProjectileEffectCount} from '../src/tower-projectiles';

const $=(id:string)=>document.getElementById(id)!;
let roomSerial=1,room='LOCAL-01',accepted:DuelState|null=null,displayed:DuelState|null=null;
let launches=0,impacts=0,operationLaunches=0,operationImpacts=0,expected=0,operation='준비 중',ready=false;
const weaponCounts=new Map<string,number>(),baseTime=Date.now();

function makeRoom():DuelState{
 const s=createDuel('local-left','로컬 왼쪽',1000+roomSerial,baseTime+roomSerial,10);
 joinDuel(s,'local-right','로컬 오른쪽',s.createdAt,10);
 s.status='playing';s.startedAt=s.createdAt;s.elapsed=270;s.revision=10;s.nextId=1000;
 for(const side of [0,1] as Side[])s.players[side]!.ready=true;
 TOWERS.forEach((type,i)=>{
  const owner:Side=i<6?0:1,index=i%6,x=(owner===0?1:13)+[0,2,4,6,8,9][index],y=index%2?5:1;
  s.players[owner]!.towers.push({id:100+i,typeId:type.id,x,y,unit:type.unit,cost:type.cost,enabled:true,cooldown:100});
  s.enemies.push({id:200+i,owner:(1-owner) as Side,target:owner,hero:null,level:1+Math.floor(i/3)*2,hp:9900,max:9900,x:x+(owner===0?.45:-.45),slow:0,stun:100,hits:0});
 });
 return s;
}
accepted=makeRoom();displayed=accepted;
const view=():DuelView=>({state:displayed,side:0,room,selectedType:'',shopPage:0,slots:[],selectedTower:0,message:'로컬 발사체 검증',busy:false,connected:true});
const scene=new DuelScene(view);

function updateDOM():void{
 const s=displayed;
 $('room').textContent=room||'없음';$('state').textContent=ready?s?.status??'empty':'loading';$('revision').textContent=s?String(s.revision):'—';
 $('towers').textContent=String(s?.players.reduce((count,p)=>count+(p?.towers.length??0),0)??0);
 $('launches').textContent=String(launches);$('impacts').textContent=String(impacts);$('effects').textContent=String(ready?towerProjectileEffectCount(scene):0);$('enemies').textContent=String(s?.enemies.length??0);
 $('operation').textContent=`${operation} · 예정 ${expected} / 이번 발사 ${launches-operationLaunches} / 이번 impact ${impacts-operationImpacts}`;
 $('identity').textContent=s?`identity ${room}:${s.seed}:${s.createdAt}`:'identity 없음 · 대기 중인 발사와 impact는 취소됩니다.';
 document.querySelectorAll<HTMLButtonElement>('[data-type]').forEach(button=>{const id=button.dataset.type!,type=TOWERS.find(t=>t.id===id)!;button.textContent=`${type.name} (${id}) · ${weaponCounts.get(id)??0}회`;});
}

scene.onSound=(type,typeId)=>{
 if(type==='shot'){launches++;if(typeId)weaponCounts.set(typeId,(weaponCounts.get(typeId)??0)+1);}
 else if(['hit','kill','invalid'].includes(type))impacts++;
 updateDOM();
};
scene.onAction=key=>{$('status').textContent=`장면 버튼: ${key} · 검증 도구는 위 공개 버튼을 사용합니다.`;};
scene.onCell=(x,y)=>{$('status').textContent=`선택 좌표 ${x}, ${y} · 각 종류 버튼으로 발사합니다.`;};

function startOperation(label:string,count:number):void{
 operation=label;expected=count;operationLaunches=launches;operationImpacts=impacts;$('status').textContent=label;
}
function show(s:DuelState|null):void{displayed=s;scene.redraw();updateDOM();}
function recordShots(s:DuelState,indexes:number[]):DuelShot[]{
 return indexes.map(i=>{
  const type=TOWERS[i],owner:Side=i<6?0:1,t=s.players[owner]!.towers.find(t=>t.id===100+i),e=s.enemies.find(e=>e.id===200+i);
  if(!t||!e)throw Error('타워가 회수됐습니다. 신규 방으로 이동하면 12종이 복구됩니다.');
  const before=e.hp,after=before-type.unit;e.hp=after;e.hits++;
  return {id:s.nextId++,time:s.elapsed,towerId:t.id,typeId:type.id,fromX:t.x,fromY:t.y,owner,enemyId:e.id,x:e.x,before,unit:type.unit,after,effect:type.effect};
 });
}
function fire(indexes:number[],sell=false):void{
 if(!accepted){$('status').textContent='신규 방으로 이동한 뒤 발사합니다.';return;}
 const s=structuredClone(accepted);
 try{
  const shots=recordShots(s,indexes);s.shots=shots;s.revision++;s.log=[sell?'발사 기록에 출발 좌표를 보관하고 모든 타워를 회수했습니다.':'12종 타워의 발사 기록을 전달했습니다.'];
  if(sell)for(const p of s.players)if(p)p.towers=[];
  startOperation(sell?'기록 생성 → 타워 회수 → 발사':indexes.length===12?'12종 전체 발사':TOWERS[indexes[0]].name+' 발사',shots.length);
  accepted=s;show(s);
 }catch(error){$('status').textContent=(error as Error).message;}
}

TOWERS.forEach((type,i)=>{
 const button=document.createElement('button');button.dataset.type=type.id;button.disabled=true;button.onclick=()=>fire([i]);$('weapons').append(button);
});
$('all').onclick=()=>fire(TOWERS.map((_,i)=>i));
$('sold').onclick=()=>fire(TOWERS.map((_,i)=>i),true);
$('resend').onclick=()=>{
 startOperation('같은 snapshot 재전송 · 추가 발사 0회 예상',0);show(accepted?structuredClone(accepted):null);
};
$('stale').onclick=()=>{
 if(!accepted){$('status').textContent='신규 방에서 먼저 발사합니다.';return;}
 const stale=structuredClone(accepted);stale.revision--;
 // Unseen ids make this check distinguish revision rejection from id dedupe.
 stale.shots=(stale.shots.length?stale.shots:[{id:99999,time:stale.elapsed,towerId:100,typeId:'basic',fromX:1,fromY:1,owner:0,enemyId:200,x:1.45,before:9900,unit:100,after:9800,effect:'basic'} as DuelShot]).map((shot,i)=>({...shot,id:100000+i}));
 startOperation('과거 revision 재전송 · 새 id도 재생 0회 예상',0);show(stale);
};
$('new-room').onclick=()=>{
 roomSerial++;room=`LOCAL-${String(roomSerial).padStart(2,'0')}`;accepted=makeRoom();startOperation('신규 방 이동 · 이전 발사 취소',0);show(accepted);
};
$('empty').onclick=()=>{room='';accepted=null;startOperation('방 비우기 · 남은 발사와 impact 취소',0);show(null);};
$('reset-counts').onclick=()=>{
 launches=0;impacts=0;weaponCounts.clear();startOperation('공개 카운터 초기화',0);updateDOM();
};

window.addEventListener('error',event=>{$('errors').textContent+=`${event.message}\n`;});
window.addEventListener('unhandledrejection',event=>{$('errors').textContent+=`${String(event.reason)}\n`;});
new Phaser.Game({type:Phaser.CANVAS,parent:'canvas',width:1280,height:800,scene:[scene],backgroundColor:'#111216',audio:{noAudio:true},scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH}});
const poll=window.setInterval(()=>{
 if(!ready&&scene.ready){ready=true;document.querySelectorAll<HTMLButtonElement>('button').forEach(button=>button.disabled=false);operation='12종 준비됨';$('status').textContent='실제 DuelScene 준비됨 · 네트워크 없이 로컬 상태만 사용합니다.';}
 updateDOM();
},100);
window.addEventListener('pagehide',()=>window.clearInterval(poll),{once:true});
updateDOM();
