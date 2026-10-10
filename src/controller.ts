import Phaser from 'phaser';
import {LEVELS,EFFECTS,Effect,FINAL_STAGE} from './levels';
import {Defense,Event as BattleEvent} from './model';
import {Field} from './scene';
import {GameUI,Panel,UIState,Control} from './ui';
import {decimal,numberText,FusionOperation,purchaseBalanceText} from './math';
import {loadSave,writeSave} from './save';
import {Sound} from './audio';
import {mountGameAudioControls,type GameAudioKind} from './game-audio-controls';
import {hitEquationsEnabled,setHitEquationsEnabled} from './combat-preferences';
import {GAME_WIDTH,GAME_HEIGHT} from './layout';
import {world,TILE,key as cellKey,type Cell} from './path';
import {isDifficulty,DIFFICULTIES} from './difficulty';
import {towerType,TOWERS,parseMoney} from './towers';
import {playCinematic} from './cinematic';
import {playBossFinale} from './boss-finale';
import {BossFinaleFlow} from './boss-finale-flow';
import {observeGameScreen} from './responsive-game';
import {recordLearning} from './learning';
import {TutorialSession} from './tutorial';
import {mountTutorialGuide,type TutorialTargetRect} from './tutorial-guide';
import './game.css';

const app=document.querySelector<HTMLDivElement>('#app')!;
app.innerHTML=`<main id="game-shell" aria-label="소수의 성 디펜스 게임"><div id="field"></div></main>
<div id="accessible-controls" class="sr-only" aria-label="게임 조작"></div>
<p id="accessible-state" class="sr-only"></p><p id="accessible-notice" class="sr-only" role="status" aria-live="polite"></p>
<div id="modal" class="modal hidden" role="dialog" aria-modal="true" aria-label="게임 도움말"><div class="modal-card"><button id="modal-close" class="modal-close" aria-label="닫기">×</button><div id="modal-body"></div></div></div>
<p class="portrait-note">태블릿을 가로로 돌리면 더 크게 플레이할 수 있어요.</p>`;
const $=(id:string)=>document.getElementById(id)!;
const tutorialMode=new URLSearchParams(location.search).get('mode')==='tutorial';
let tutorial=tutorialMode?new TutorialSession():undefined;
const savedAdventure=loadSave(),save=tutorial?{...savedAdventure,level:1,resumeStage:1,stars:Array(FINAL_STAGE).fill(0),inventory:tutorial.model.inventory,difficulty:'practice' as const,started:false,campaignCompleted:false}:savedAdventure;
const sound=new Sound();sound.sfx=save.sfx;sound.setMusic(save.music);let movie=false;
let tutorialGuide:ReturnType<typeof mountTutorialGuide>|undefined;
function savePreferences(){return writeSave(tutorial?{...loadSave(),sfx:save.sfx,music:save.music}:save);}
let settingsAudioControls:ReturnType<typeof mountGameAudioControls>|undefined;
function changeAudio(kind:GameAudioKind,enabled:boolean){
 sound.resume();save[kind]=enabled;
 if(kind==='sfx')sound.sfx=enabled;else sound.setMusic(enabled);
 if(!savePreferences())notify('이 브라우저에서는 소리 설정을 저장할 수 없어요.');
 gameAudioControls.sync();settingsAudioControls?.sync();sound.play('ui');
}
const gameAudioControls=mountGameAudioControls($('game-shell'),{
 getState:()=>({sfx:save.sfx,music:save.music}),
 change:changeAudio,
});
if(!tutorial)save.started=true;
let model:Defense=tutorial?.model??new Defense(LEVELS[save.resumeStage-1],save.inventory,save.difficulty),unit=model.level.units[0],effect:Effect='basic',selected=0,speed=1;
let selectedWall:Cell|null=null,brickPage=0,inventorySignature='';
let towerTypeId='basic',shopPage=0,purchaseInput='',purchaseMessage='',purchaseHelp=false;
let slots:(number|null)[]=[null,null,null],panel:Panel=null,equation='',hint='',message='',lastHit:BattleEvent|undefined,resultShown=false;
let fusionOperation:FusionOperation='+';
let resumeAfterPanel=false,resumeAfterHTML=false,resumeAfterWall=false,controlsSignature='';
const field=new Field(model);const learningSession=crypto.randomUUID();let learningQuestion=0;
let bossFinale=new BossFinaleFlow();
function purchaseLearning(outcome:'wrong'|'help'|'correct',q=model.pendingPurchase){if(q&&!tutorial)recordLearning({a:q.before,b:q.cost,operation:'-',digits:q.digits,context:'money'},outcome,learningSession+':purchase:'+learningQuestion);}
const state=():UIState=>({model,save,unit,effect,selected,selectedWall,brickPage,speed,mode:field.mode,panel,slots,fusionOperation,equation,hint,message,towerTypeId,shopPage,purchaseInput,purchaseMessage,purchaseHelp});
const ui=new GameUI(state);
ui.fieldPoint=(x,y)=>field.worldToScreen(x,y);
function persistInventory(){
 if(tutorial)return;
 const inventory=model.inventory,signature=JSON.stringify(inventory);if(signature===inventorySignature)return;
 save.inventory=inventory;inventorySignature=signature;
 if(!writeSave(save))notify('이 브라우저에서는 벽돌·성벽 저장이 제한되어 있어요.');
}
function update(){
 if(tutorial){tutorial.sync();if(tutorial.completed){field.presentationHeld=true;field.input.enabled=false;}}
 if(selectedWall&&!model.walls.some(w=>w.x===selectedWall!.x&&w.y===selectedWall!.y)){selectedWall=null;field.selectedWall=undefined;field.clearWallPreview();}
 // The model can win before its last projectile lands. Hold the result until
 // that impact and the boss's farewell have both been shown.
 const finaleHeld=bossFinale.hold(model.level.id,model.bossDefeated);
 if(finaleHeld){movie=true;field.presentationHeld=true;field.input.enabled=false;}
 sound.setPaused(movie||model.phase==='paused');
 sound.setTrack(model.phase==='won'?'victory':model.phase==='lost'?'defeat':model.phase==='ready'||model.phase==='review'?'title':model.level.id>=10?'boss':'battle');
 persistInventory();brickPage=Math.max(0,Math.min(brickPage,Math.ceil(model.bricks.length/6)-1));
 if(!tutorial&&!finaleHeld&&['won','review','lost'].includes(model.phase)&&!resultShown){
  resultShown=true;resumeAfterPanel=false;ui.clearNotification();
  if(model.phase==='won'){save.stars[model.level.id-1]=Math.max(save.stars[model.level.id-1],model.stars);save.level=Math.max(save.level,Math.min(FINAL_STAGE,model.level.id+1));save.resumeStage=Math.min(FINAL_STAGE,model.level.id+1);if(model.level.id===FINAL_STAGE&&model.bossDefeated)save.campaignCompleted=true;if(!writeSave(save))notify('이 브라우저에서는 진행 저장이 제한되어 있어요.');}
  panel='result';field.input.enabled=false;
  if(model.phase!=='review'&&!(model.phase==='won'&&model.level.id===FINAL_STAGE&&model.bossDefeated))sound.play(model.phase==='won'?'victory':'defeat');
  if(model.phase==='won'&&model.level.id===FINAL_STAGE&&model.bossDefeated){movie=true;sound.setPaused(true);void playCinematic('ending',save,()=>{movie=false;ui.refresh(true);update();});}
 }
 slots=slots.map(id=>model.bricks.some(b=>b.id===id)?id:null);ui.refresh();
 $('accessible-state').textContent=`레벨 ${save.level}, ${model.level.id}단계 ${model.level.name}, 맵 ${model.map.name}, ${DIFFICULTIES[model.difficulty].name} 난이도, 돈 ${numberText(model.money,model.level.digits)}, 성 체력 ${model.castle}, 방어 ${model.kills}/${model.enemyCount}, 타워 ${model.towers.length}/${model.balance.towerLimit}, 성벽 배치 ${model.walls.length}/${model.balance.wallLimit}. ${equation||model.level.hint}${model.pendingWall?` 성벽 미리보기 ${model.pendingWall.x+1}열 ${model.pendingWall.y+1}행: ${model.pendingWall.message}`:''}`;
 updateTutorialGuide();
}
function finalBossImpact(x:number,y:number){
 if(!bossFinale.begin())return;
 const owner=bossFinale,canvas=document.querySelector('#field canvas') as HTMLCanvasElement|null,rect=canvas?.getBoundingClientRect();
 const impact=field.worldToScreen(x,y),origin=rect?{x:(rect.left+impact.x/game.scale.width*rect.width)/window.innerWidth,y:(rect.top+impact.y/game.scale.height*rect.height)/window.innerHeight}:{x:.5,y:.45};
 let completed=false;
 const finish=()=>{if(completed)return;completed=true;if(owner!==bossFinale)return;owner.finish();movie=false;field.presentationHeld=false;field.input.enabled=!panel&&$('modal').classList.contains('hidden');ui.refresh(true);update();};
 void playBossFinale(save,origin,finish).catch(finish);
}
function notify(text:string){message=text;$('accessible-notice').textContent=text;ui.notify(text);}
function nextWallCell(){return model.path()?.find(c=>model.previewWall(c).valid);}
function beginWallPlacement(){
 // Transfer the forge's pause ownership without briefly restarting combat.
 const resumeBattle=resumeAfterPanel||model.phase==='playing';panel=null;resumeAfterPanel=false;field.input.enabled=true;
 if(field.mode.kind!=='wall'){resumeAfterWall=resumeBattle;if(model.phase==='playing')model.togglePause();}
 model.cancelWall();selected=0;selectedWall=null;field.selected=undefined;field.selectedWall=undefined;field.mode={kind:'wall',unit,effect};field.clearWallPreview();
 const first=nextWallCell();
 if(!first){leaveWallPlacement();notify(model.walls.length>=model.balance.wallLimit?`성벽 ${model.balance.wallLimit}개를 모두 설치했어요. 남은 성벽은 보관해요.`:'지금은 설치할 수 있는 길 칸이 없어요. 성벽은 보관해요.');return;}
 field.focusCell(first);document.querySelector('canvas')?.focus();
 notify(`초록색 길을 한 번 누르면 바로 설치해요. 남은 성벽 ${model.wallStock}개 · Esc로 보관`);
}
function leaveWallPlacement(resume=true){
 model.cancelWall();field.mode.kind='inspect';field.clearWallPreview();if(resume&&resumeAfterWall&&model.phase==='paused')model.togglePause();resumeAfterWall=false;
}
function setPanel(next:Panel,resumeBattle=false){
 ui.clearNotification();
 if(!panel){resumeAfterPanel=resumeBattle||model.phase==='playing';if(model.phase==='playing')model.togglePause();}
 panel=next;field.input.enabled=false;message='';update();
}
function closePanel(){if(panel==='purchase')model.cancelPurchase();if(panel==='forge')tutorial?.closeForge();panel=null;field.input.enabled=true;if(resumeAfterPanel&&model.phase==='paused')model.togglePause();resumeAfterPanel=false;update();}
function openHTML(content:string){
 settingsAudioControls?.dispose();settingsAudioControls=undefined;
 resumeAfterHTML=model.phase==='playing'||resumeAfterPanel;
 if(model.phase==='playing')model.togglePause();resumeAfterPanel=false;panel=null;field.input.enabled=false;
 $('modal-body').innerHTML=content;$('modal').classList.remove('hidden');$('modal-close').focus();update();
}
function closeHTML(){
 if($('modal').classList.contains('hidden'))return;
 settingsAudioControls?.dispose();settingsAudioControls=undefined;
 $('modal').classList.add('hidden');field.input.enabled=true;if(resumeAfterHTML&&model.phase==='paused')model.togglePause();resumeAfterHTML=false;update();document.querySelector('canvas')?.focus();
}
function stage(n:number){
 if(tutorial){restartTutorial();return;}
 settingsAudioControls?.dispose();settingsAudioControls=undefined;
 if(n<1||n>FINAL_STAGE)return;ui.clearNotification();resumeAfterHTML=false;resumeAfterPanel=false;resumeAfterWall=false;model.cancelWall();field.clearWallPreview();$('modal').classList.add('hidden');
 persistInventory();fusionOperation='+';selectedWall=null;brickPage=0;towerTypeId='basic';shopPage=0;purchaseInput='';purchaseMessage='';purchaseHelp=false;
 save.resumeStage=n;save.started=true;writeSave(save);
 bossFinale=new BossFinaleFlow();model=new Defense(LEVELS[n-1],save.inventory,save.difficulty);field.setModel(model);field.input.enabled=true;unit=model.level.units[0];effect='basic';field.mode={kind:'inspect',unit,effect};selected=0;slots=[null,null,null];panel=null;equation='';hint='';message='';lastHit=undefined;resultShown=false;speed=1;ui.refresh(true);update();
}
function event(ev:BattleEvent){
 // Damage and learning state update immediately; impact audio follows the flight.
 if(!movie&&!['hit','kill','invalid'].includes(ev.type))sound.play(ev.type==='money'&&(ev.data as {reason?:string}|undefined)?.reason==='purchase'?'build':ev.type,ev.type==='shot'?(ev.data as {typeId?:string}|undefined)?.typeId:undefined);ui.animate(ev);
 if(ev.type==='hit'){lastHit=ev;if(model.level.id<=4){equation=ev.message;hint=(ev.data as {hint:string}).hint;}}
 if(ev.type==='money'){equation=ev.message.split(' · ')[0];hint=ev.message.split(' · ')[1]||'';if((ev.data as {reason?:string}|undefined)?.reason==='purchase'){ui.showPurchaseEquation(equation);$('accessible-notice').textContent=`${ev.message} · 전체 잔액 ${numberText(model.money,model.level.digits)} 코인`;}}
 if(ev.type==='wall'&&ev.message.includes(' = ')){equation=ev.message.split(' · ')[0];hint=ev.message.includes(' − ')?'소수점을 맞추어 같은 자리끼리 뺐어요.':'소수점을 맞추어 같은 자리끼리 더했어요.';message='합성 성공! 성벽 한 개를 얻었어요.';if(field.mode.kind==='wall')notify(`${equation} · 합성 성공! 초록 길을 눌러 놓아요.`);}
 else if(panel==='purchase'&&ev.type==='notice'){purchaseMessage=ev.message;$('accessible-notice').textContent=ev.message;}
 else if(ev.type==='wall-impact')$('accessible-notice').textContent=ev.message;
 else if(['notice','invalid','wall','wall-break','brick','leak'].includes(ev.type))notify(ev.message);
 update();
}
function help(){openHTML(`<p class="eyebrow">모험 안내서</p><h2>소수점을 맞추고 성을 지켜요</h2><ol class="help-list"><li><b>타워 설치</b> 오른쪽에서 타워를 선택하고 길 옆의 빈 바닥을 누르세요. 간격 제한 없이 이웃한 빈 칸에도 설치할 수 있어요. 단계가 올라갈 때마다 모든 타워의 가격 범위가 조금씩 올라가며 높은 등급일수록 비싸요. 보유 코인에서 가격을 빼는 문제를 맞혀야 설치돼요. 혼자 모험에서는 방어 시작 전에만 설치할 수 있어요. 전투 중 회수한 타워도 다시 설치할 수 없으니 시작 전에 배치를 확인해요. 오답·취소에는 돈을 쓰지 않아요. 후반에는 길이 짧아져 입구의 큰 공격, 중간의 감속, 출구의 작은 공격을 조합해야 유리해요. 1:1 대전은 2분 동안 타워 구입 문제와 영웅 부화 문제를 선택해 풀고, 이어지는 3분 동안 비축한 타워를 배치하고 영웅을 원하는 타이밍에 소환해요.</li><li><b>자동 공격</b> 타워는 전투 중 자동으로 공격해요. 설치한 타워를 누르면 공격력과 사거리를 확인하거나 회수할 수 있어요. 체력보다 큰 공격은 피해를 주지 못해요.</li><li><b>정확히 0 만들기</b> 체력 1.3에 1 포탄을 쏘면 0.3이 남아요. 0.1 포탄 타워가 남은 체력을 마무리해요. 큰 공격과 작은 공격 타워를 길 전체에 나누어 배치해요.</li><li><b>성벽 제작</b> 획득한 벽돌과 성벽은 다음 단계에도 보관돼요. 방어 시작 전에 ‘성벽 제작’에서 준비하세요. 전투 중 열면 전투가 멈춰요. 벽돌 세 개를 □ + □ = □에 넣어 덧셈으로 만들어요. 단계가 높아지면 두 자리 소수와 받아올림이 있는 식을 연습해요. 식이 맞으면 제작창이 닫히고 길에 바로 설치할 수 있어요. 성벽은 몬스터가 없는 길 위에만 설치할 수 있어요. 입구와 불꽃에는 놓을 수 없어요. 새 성벽의 내구도는 3이고, 몬스터가 부딪힐 때마다 1씩 줄어요. 몬스터는 뒤로 튕기고 성벽에는 균열이 생겨요. 세 번째 충돌에 성벽이 부서져 길이 열려요. 성벽 충돌은 몬스터의 소수 체력을 깎지 않아요. 초록색 길을 한 번 누르면 바로 설치돼요. 재고가 남으면 계속 놓을 수 있고, ‘완료 · 남은 성벽 보관’이나 Esc로 배치를 끝내요. 잘못된 칸은 성벽을 쓰지 않아요. 설치할 칸을 고르는 동안 전투가 멈춰요. 설치한 성벽을 누르고 ‘성벽 회수 · 다시 배치’로 옮길 수 있어요. 회수해도 남은 내구도는 그대로예요.</li><li><b>공격과 돈의 단위</b> 12종 타워는 각각 공격력이 고정돼요. 기본 포탑 0.1, 서리탑 0.15, 투석기 1.2, 룬 쇠뇌 2.35처럼 달라요. 0.01 바늘탑으로 작은 나머지를 마무리해요. 체력·공격력·돈·타워 가격·벽돌은 모두 소수 두 자리까지만 사용해요. 기본 등급은 간단한 계산, 상위 등급은 받아내림이 필요한 가격을 우선 제공해요. 한 마리 돈 보상은 최대 9이고, 실제 피해를 준 타격이 적을수록 보상이 커져요.</li><li><b>난이도 선택</b> 메뉴에서 난이도 선택을 열어 연습·표준·도전을 고르세요. 방어 시작 전에 타워와 성벽을 모두 회수한 상태에서 바꿀 수 있어요. 선택은 저장돼요. 타워 제작소에서 전체 타워와 바늘탑의 설치 수를 확인하세요. 성벽은 연습 6개·표준 4개·도전 3개까지 동시에 놓을 수 있어요. 부서지지 않은 성벽만 재고에 보관해요.</li><li><b>진급과 저장</b> 성 체력은 5개이며 몬스터가 통과할 때 1개씩 줄고, 5개가 모두 소진돼야 패배해요. 2분이 지나도 남은 몬스터는 추가로 방어해요. 방어와 학습 목표를 모두 달성하면 다음 레벨이 열려요. 성을 지켜도 목표가 남으면 패배 대신 학습 목표 연습을 안내해요. 레벨·해금·별점은 같은 브라우저에 저장하고, 벽돌·성벽도 저장돼요. 돈·타워 배치는 단계마다 새로 시작하고 부서지지 않은 성벽은 남은 내구도 그대로 재고로 돌아와요.</li></ol><p>키보드: 방향키로 맵 칸 선택, Enter로 설치·선택, Space로 일시정지, F로 성벽 제작, Esc로 닫기.</p>`);}
function calculation(){
 const learned=lastHit?.data as {before:number;damage:number}|undefined;if(learned&&!tutorial)recordLearning({a:learned.before,b:learned.damage,operation:'-',digits:model.level.digits,context:'battle'},'help',learningSession+':hit:'+lastHit!.message);
 const d=lastHit?.data as {before:number;damage:number;after:number;hint:string}|undefined;
 openHTML(`<p class="eyebrow">전투 속 계산 기록</p><h2>같은 자리끼리 계산해요</h2><p>${model.level.hint}</p>${d?`<div class="help-equation">${lastHit!.message}</div><pre class="vertical-math">  ${decimal(d.before,model.level.digits).padStart(6)}\n− ${decimal(d.damage,model.level.digits).padStart(6)}\n─────────\n  ${decimal(d.after,model.level.digits).padStart(6)}</pre><p>${d.hint}</p>`:'<p>타워가 실제로 공격한 뒤 최근 공격의 계산을 이곳에서 확인할 수 있어요.</p>'}${equation?`<p class="math-record">최근 기록: ${equation}</p>`:''}<p>0.1은 0.01 열 개, 1은 0.1 열 개와 같아요.<br>0.7 = 0.70처럼 끝에 0을 붙여 생각할 수 있어요.<br>모든 소수 계산은 소수 두 자리까지만 사용해요.</p>`);
}
function settings(){
 openHTML(`<p class="eyebrow">게임 설정</p><div id="settings-audio"></div><label class="setting"><span>몬스터 피격 뺄셈식 <small id="setting-equations-state">${hitEquationsEnabled()?'ON':'OFF'}</small></span><input id="setting-hit-equations" type="checkbox" role="switch" ${hitEquationsEnabled()?'checked':''}/></label><p>설정은 같은 브라우저에 자동 저장돼요.</p>`);
 settingsAudioControls=mountGameAudioControls($('settings-audio'),{variant:'settings',getState:()=>({sfx:save.sfx,music:save.music}),change:changeAudio});
 $('setting-hit-equations').onchange=()=>{const enabled=($('setting-hit-equations') as HTMLInputElement).checked;setHitEquationsEnabled(enabled);$('setting-equations-state').textContent=enabled?'ON':'OFF';};
}
function credits(){openHTML('<p class="eyebrow">소수의 성</p><h2>모험을 만든 재료들</h2><p>초등학교 4학년 소수의 덧셈과 뺄셈을 배우는 11단계 디펜스입니다.</p><p>Phaser 3 (MIT). 던전 바닥·UI·타워·성벽·아이콘·돌 슬라임·발사·명중 효과 등 현재 게임의 모든 이미지 에셋을 내장 OpenAI imagegen으로 새로 제작했습니다. 언더다크 디펜스의 던전 분위기와 카드형 UI를 참고했습니다.</p><p>학습 자료: 한대희(4-2)지도서 3단원.<br>소수의 계산은 정수 단위로 정확하게 처리합니다.</p><a href="/CREDITS.txt" target="_blank" rel="noopener">에셋 출처·라이선스·생성 프롬프트 보기 ↗</a>');}
function action(key:string){
 if(movie)return;
 if(tutorial&&!tutorialActionAllowed(key)){notify('아래 안내의 순서대로 먼저 연습해요.');return;}
 sound.resume();sound.play('ui');
 if(field.mode.kind==='wall'&&!['wall-cancel','wall','forge','pause'].includes(key))leaveWallPlacement();
 if(key.startsWith('type:')||key==='wall'){selectedWall=null;field.selectedWall=undefined;}
 if(key.startsWith('type:')){const type=towerType(key.slice(5));if(!type||type.unlock>model.level.id)return;if(!model.canBuild){notify('타워는 방어 시작 전에만 설치해요.');return;}if(tutorial&&!tutorial.selectTower(type.id))return;towerTypeId=type.id;unit=type.unit;effect=type.effect;field.mode={kind:'tower',typeId:type.id,unit,effect};selected=0;field.selected=undefined;field.hover({x:1,y:3});notify(`${type.name} · 공격력 ${numberText(unit)} · 빈 칸에 설치해요.`);}
 else if(key.startsWith('shop-page:'))shopPage=key.endsWith('next')&&ui.cycleShopPages?(shopPage+1)%ui.shopPageCount:Math.max(0,Math.min(ui.shopPageCount-1,shopPage+(key.endsWith('next')?1:-1)));
 else if(key.startsWith('purchase-key:')){if(panel!=='purchase')return;const char=key.slice(13);if(char==='backspace')purchaseInput=purchaseInput.slice(0,-1);else if(char==='dot'){if(!purchaseInput.includes('.'))purchaseInput=(purchaseInput||'0')+'.';}else if(/^\d$/.test(char)&&purchaseInput.length<12&&(!purchaseInput.includes('.')||purchaseInput.split('.')[1].length<2))purchaseInput+=char;purchaseMessage='';}
 else if(key.startsWith('difficulty:')){const chosen=key.split(':')[1];if(isDifficulty(chosen)&&model.setDifficulty(chosen)){save.difficulty=chosen;if(!writeSave(save))notify('이 브라우저에서는 난이도 저장이 제한되어 있어요.');}}
 else if(key.startsWith('slot:')){slots[+key.split(':')[1]]=null;message='';}
 else if(key.startsWith('brick-page:'))brickPage+=key.endsWith('next')?1:-1;
 else if(key==='fusion:+'){fusionOperation='+';message='';}
 else if(key.startsWith('brick:')){const id=+key.split(':')[1],i=slots.indexOf(null);if(i<0)notify('슬롯을 눌러 비운 뒤 다른 벽돌을 골라요.');else if(!slots.includes(id)&&model.bricks.some(b=>b.id===id)){slots[i]=id;message='';}}
 else if(key.startsWith('stage:')){const n=+key.split(':')[1];if(n<=save.level)stage(n);}
 else switch(key){
  case 'start':if(tutorial?tutorial.start():model.start()){field.mode.kind='inspect';field.clearWallPreview();sound.play('start');}break;
  case 'pause':if(field.mode.kind==='wall')notify('성벽을 놓거나 ‘완료 · 남은 성벽 보관’을 누르면 전투가 이어져요.');else model.togglePause();break;
  case 'speed':speed=speed===1?2:1;break;
  case 'online':{const url=new URL(location.href);url.searchParams.set('mode','duel');location.assign(url.href);break;}
  case 'home':{persistInventory();sound.setMusic(false);const url=new URL(location.href);url.searchParams.delete('mode');location.assign(url.href);break;}
  case 'tutorial':if(tutorial)restartTutorial();else{persistInventory();sound.setMusic(false);const url=new URL(location.href);url.searchParams.set('mode','tutorial');location.assign(url.href);}break;
  case 'sell':model.sellTower(selected);selected=0;field.selected=undefined;break;
  case 'cancel':field.mode.kind='inspect';break;
  case 'inspect-back':selected=0;selectedWall=null;field.selected=undefined;field.selectedWall=undefined;field.mode.kind='inspect';break;
  case 'purchase-help':purchaseHelp=!purchaseHelp;if(purchaseHelp)purchaseLearning('help');break;
  case 'purchase-cancel':closePanel();break;
  case 'purchase-confirm':if(panel==='purchase'){const q=model.pendingPurchase;if(q&&parseMoney(purchaseInput)!==q.before-q.cost)purchaseLearning('wrong',q);if(model.answerPurchase(purchaseInput)){purchaseLearning('correct',q);const t=model.towers.at(-1)!;if(sound.sfx)void sound.preloadTowerShots([t.typeId]);closePanel();selected=t.id;field.selected=t.id;field.mode.kind='inspect';field.drawTerrain();}}break;
  case 'forge':{if(tutorial&&!tutorial.openForge())return;const resume=field.mode.kind==='wall'&&resumeAfterWall;if(field.mode.kind==='wall')leaveWallPlacement(false);slots=slots.map(id=>model.bricks.some(b=>b.id===id)?id:null);setPanel('forge',resume);break;}
  case 'fuse':{const ids=slots.filter((s):s is number=>s!==null),values=ids.map(id=>model.bricks.find(b=>b.id===id)?.value);if(!tutorial&&values.length===3&&new Set(ids).size===3&&values.every(v=>v!==undefined)){const [a,b,c]=values as number[];recordLearning({a,b,operation:'+',digits:model.level.digits,context:'wall'},a+b===c?'correct':'wrong');}if(model.fuse(ids)){slots=[null,null,null];beginWallPlacement();}break;}
  case 'wall':if(model.wallStock)beginWallPlacement();break;
  case 'wall-recover':if(selectedWall&&model.recoverWall(selectedWall)){beginWallPlacement();field.drawTerrain();notify('회수한 성벽을 다시 놓을 칸을 골라요. 취소하면 재고에 보관해요.');}break;
  case 'wall-cancel':leaveWallPlacement();notify(`배치를 마쳤어요. 남은 성벽 ${model.wallStock}개는 보관돼요.`);break;
  case 'goals':setPanel('goals');break;
  case 'menu':setPanel('menu');break;
  case 'difficulty':setPanel('difficulty');break;
  case 'levels':setPanel('map');break;
  case 'close':closePanel();break;
  case 'help':help();break;
  case 'calculation':calculation();break;
  case 'popup-calculation':calculation();break;
  case 'settings':settings();break;
  case 'credits':credits();break;
  case 'retry':stage(model.level.id);break;
  case 'next':if(model.phase==='won'&&model.level.id<FINAL_STAGE)stage(model.level.id+1);break;
 }
 field.flush();update();
}
ui.onAction=action;
function tutorialActionAllowed(key:string){
 if(!tutorial)return true;
 if(['menu','home','tutorial','help','settings','credits','close','purchase-cancel','cancel','inspect-back'].includes(key))return true;
 switch(tutorial.step){
  case 'tower':case 'place-tower':return key==='type:basic';
  case 'purchase':return key.startsWith('purchase-');
  case 'forge':return key==='forge';
  case 'fusion':return key==='forge'||key==='fuse'||key==='fusion:+'||/^(brick:|slot:|brick-page:)/.test(key);
  case 'wall':return key==='wall'||key==='wall-cancel';
  case 'start':return key==='start';
  case 'battle':return key==='pause'||key==='calculation'||key==='popup-calculation';
  default:return false;
 }
}
function tutorialNext(){
 if(!tutorial)return;
 if(tutorial.step==='welcome'){tutorial.begin();update();}
 else if(tutorial.step==='forge')action('forge');
 else if(tutorial.step==='start')action('start');
 else if(tutorial.step==='wall')action('wall');
 else if(tutorial.step==='place-tower')action('type:basic');
 else if(tutorial.step==='battle')action('pause');
}
function restartTutorial(){
 if(!tutorial)return;
 tutorial.dispose();tutorial=new TutorialSession();model=tutorial.model;
 settingsAudioControls?.dispose();settingsAudioControls=undefined;$('modal').classList.add('hidden');
 resumeAfterHTML=false;resumeAfterPanel=false;resumeAfterWall=false;panel=null;
 slots=[null,null,null];selected=0;selectedWall=null;brickPage=0;shopPage=0;purchaseInput='';purchaseMessage='';purchaseHelp=false;equation='';hint='';message='';lastHit=undefined;resultShown=false;speed=1;fusionOperation='+';
 field.setModel(model);field.mode={kind:'inspect',unit:100,effect:'basic'};field.input.enabled=true;field.presentationHeld=false;field.selected=undefined;field.selectedWall=undefined;
 ui.clearNotification();$('accessible-notice').textContent='';ui.refresh(true);update();
}
function tutorialRect(target:{x:number;y:number;w:number;h:number}):TutorialTargetRect|null{
 const canvas=field.game?.canvas,box=canvas?.getBoundingClientRect();if(!box||!box.width)return null;
 return {left:box.left+(target.x-target.w/2)/game.scale.width*box.width,top:box.top+(target.y-target.h/2)/game.scale.height*box.height,width:target.w/game.scale.width*box.width,height:target.h/game.scale.height*box.height};
}
function updateTutorialGuide(){
 if(!tutorial||!tutorialGuide)return;
 const guide=tutorial.guide;
 let actionLabel=guide.button;
 if(tutorial.step==='place-tower'&&field.mode.kind!=='tower')actionLabel='기본 포탑 다시 선택';
 if(tutorial.step==='wall'&&field.mode.kind!=='wall')actionLabel='성벽 설치 이어하기';
 if(tutorial.step==='battle')actionLabel=model.phase==='paused'?'전투 계속':'일시 정지';
 const status=tutorial.step==='battle'?`성벽 충돌 ${tutorial.model.tutorialWallImpacts}/3 · 몬스터 처치 ${model.kills}/1`:undefined;
 tutorialGuide.update({index:tutorial.progress.current,total:tutorial.progress.total,title:guide.title,instruction:guide.text,actionLabel,complete:tutorial.completed,status,note:tutorial.step==='welcome'?'모험 진행·코인·벽돌은 그대로 유지돼요.':undefined});
 if(!ui.ready||!$('modal').classList.contains('hidden')||panel==='menu'){tutorialGuide.highlight(null);return;}
 let control:string|undefined,cell:Readonly<Cell>|undefined;
 switch(guide.focus){
  case 'tower':control='type:basic';break;
  case 'field':if(field.mode.kind==='tower')cell=tutorial.suggestedTowerCell;else control='type:basic';break;
  case 'purchase':control='purchase-confirm';break;
  case 'forge':control='forge';break;
  case 'fusion':{
   const index=slots.findIndex(id=>id===null);
   if(index<0)control='fuse';else{const value=[200,300,500][index],brick=model.bricks.find(b=>b.value===value&&!slots.includes(b.id));control=brick?'brick:'+brick.id:undefined;}
   break;
  }
  case 'wall':if(field.mode.kind==='wall')cell=tutorial.suggestedWallCell;else control='wall';break;
  case 'start':control='start';break;
 }
 let rect:TutorialTargetRect|null=null;
 if(control){const bounds=ui.getButtonBounds(control);if(bounds)rect=tutorialRect(bounds);}
 if(cell){const xy=world(cell),center=field.worldToScreen(xy.x,xy.y),edge=field.worldToScreen(xy.x+TILE/2,xy.y+TILE/2);rect=tutorialRect({x:center.x,y:center.y,w:Math.abs(edge.x-center.x)*2,h:Math.abs(edge.y-center.y)*2});}
 tutorialGuide.highlight(rect);
}
ui.onControls=(controls:Map<string,Control>)=>{
 const popupKey=(id:string)=>['close','fuse','wall','levels','help','tutorial','settings','credits','retry','next','difficulty','online','home','popup-calculation'].includes(id)||/^(slot:|brick:|brick-page:|stage:|fusion:|difficulty:|purchase-)/.test(id);
 const active=[...controls].filter(([id])=>$('modal').classList.contains('hidden')&&(!panel||popupKey(id))&&(!tutorial||tutorialActionAllowed(id)));
 const signature=active.map(([id,c])=>`${id}:${c.label}:${c.enabled}`).join('|');if(signature===controlsSignature)return;controlsSignature=signature;
 const focus=(document.activeElement as HTMLElement)?.dataset.action;
 $('accessible-controls').replaceChildren();for(const [id,c]of active){const b=document.createElement('button');b.type='button';b.textContent=c.label||id;b.dataset.action=id;b.disabled=!c.enabled;b.onclick=c.run;$('accessible-controls').append(b);if(id===focus)b.focus();}
};
field.onChange=update;field.onEvent=event;field.onImpactAudio=type=>{if(!movie)sound.play(type);};field.onFinalBossImpact=finalBossImpact;field.onSelect=id=>{selected=id;selectedWall=null;field.selectedWall=undefined;update();};field.onWallSelect=c=>{selected=0;selectedWall=c;update();};
field.beforeCellAction=c=>{
 if(!tutorial)return true;
 const valid=tutorial.step==='place-tower'&&field.mode.kind==='tower'&&cellKey(c)===cellKey(tutorial.suggestedTowerCell)||tutorial.step==='wall'&&field.mode.kind==='wall'&&cellKey(c)===cellKey(tutorial.suggestedWallCell);
 if(!valid)notify('빛나는 칸과 아래 안내를 따라 연습해요.');return valid;
};
field.onWallPlace=c=>{
 model.cancelWall();const placed=model.placeWall(c);field.flush();
 if(!placed){field.focusCell(c);update();return;}
 field.drawTerrain();const next=nextWallCell();
 if(next){field.focusCell(next);notify(`성벽 설치 완료! 남은 ${model.wallStock}개도 길을 눌러 놓아요.`);}
 else{leaveWallPlacement();selectedWall={...c};field.selectedWall=selectedWall;field.focusCell(c);notify(model.wallStock?`설치를 마쳤어요. 남은 성벽 ${model.wallStock}개는 보관해요.`:'성벽 설치 완료! 준비한 성벽을 모두 놓았어요.');}
 update();
};
field.onPurchase=(c,id)=>{if(model.requestPurchase(c,id)){learningQuestion++;purchaseInput='';purchaseMessage='';purchaseHelp=false;setPanel('purchase');const q=model.pendingPurchase!;$('accessible-notice').textContent=`${purchaseBalanceText(q.wallet,q.before,q.digits)}. ${towerType(id)!.name} 설치 문제: ${numberText(q.before,q.digits)}에서 ${numberText(q.cost,q.digits)}를 빼면 남는 코인은 얼마인가요?`;document.querySelector<HTMLCanvasElement>('canvas')?.focus();}};
const originalUpdate=field.update.bind(field);field.update=(time:number,delta:number)=>originalUpdate(time,delta*speed);
const game=new Phaser.Game({type:Phaser.AUTO,parent:'field',width:GAME_WIDTH,height:GAME_HEIGHT,backgroundColor:'#111216',scene:[field,ui],scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},audio:{noAudio:true}});
if(tutorial){tutorialGuide=mountTutorialGuide(app,{next:tutorialNext,restart:restartTutorial,exit:()=>action('home'),adventure:()=>{sound.setMusic(false);const url=new URL(location.href);url.searchParams.set('mode','adventure');location.assign(url.href);}});updateTutorialGuide();}
observeGameScreen(game,$('field'),layout=>{field.setScreenLayout(layout);ui.setScreenLayout(layout);shopPage=Math.min(shopPage,ui.shopPageCount-1);ui.refresh(true);updateTutorialGuide();});
game.events.once('ready',()=>{game.canvas.setAttribute('aria-label','소수의 성: 타워와 성벽을 배치하는 게임 화면');game.canvas.setAttribute('tabindex','0');});
$('modal-close').onclick=closeHTML;$('modal').onclick=e=>{if(e.target===$('modal'))closeHTML();};
document.addEventListener('keydown',e=>{
 if(movie)return;
 if(panel==='purchase'&&!(e.target as HTMLElement)?.closest('button,input')){if(/^\d$/.test(e.key)){e.preventDefault();action('purchase-key:'+e.key);return;}if(e.key==='.'||e.key==='Decimal'){e.preventDefault();action('purchase-key:dot');return;}if(e.key==='Backspace'){e.preventDefault();action('purchase-key:backspace');return;}if(e.key==='Enter'){e.preventDefault();action('purchase-confirm');return;}}
 if(e.key==='Escape'){if(!$('modal').classList.contains('hidden'))closeHTML();else if(panel)closePanel();else if(field.mode.kind==='wall')action('wall-cancel');else{field.mode.kind='inspect';field.clearWallPreview();update();}}
 const input=(e.target as HTMLElement)?.closest('button,input,select,textarea');if(input||!$('modal').classList.contains('hidden'))return;
 if(e.code==='Space'&&!panel){e.preventDefault();action('pause');}else if(e.key.toLowerCase()==='f'&&!panel)action('forge');
});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&!movie&&model.phase==='playing'){model.togglePause();update();}});
window.addEventListener('pagehide',()=>{tutorialGuide?.dispose();tutorial?.dispose();settingsAudioControls?.dispose();gameAudioControls.dispose();sound.dispose();});
if(import.meta.env.DEV)Object.assign(window,{__gameTest:{get model(){return model;},scene:field,ui,stage,get state(){return state();}}});

