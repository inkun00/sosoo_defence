import {loadSave,writeSave} from './save';
import {secretSiegeUnlocked,recordSecretSiegeVictory,secretSiegeResumeStage,secretSiegeStageUnlocked,secretSiegeStageRecord,selectSecretSiegeStage,markSecretSiegeEndingSeen,secretSiegeEconomy,persistSecretSiegeEconomy} from './secret-siege-progress';
import {STARTER_BUDGET,type SiegeEconomy} from './secret-siege-research';
import {SIEGE_STAGE_COUNT,siegeStage} from './secret-siege-stages';
import {SecretSiege,SIEGE_RECRUIT_INCREMENT} from './secret-siege-model';
import {SecretSiegeField} from './secret-siege-field';
import {ARMY,SIEGE_ARMY_LIMIT,SIEGE_DURATION,type ArmyId,type SiegeQuestion} from './secret-siege-types';
import {numberText} from './math';
import {DIFFICULTIES} from './difficulty';
import {Sound} from './audio';
import {mountGameAudioControls} from './game-audio-controls';
import {GameMotion,navigateWithMotion} from './game-motion';
import {mountPreparationSkin} from './multiplayer/preparation-skin';
import {siegeArmySpriteHTML} from './secret-siege-sprites';
import {recordLearning} from './learning';
import './game.css';
import './secret-siege.css';

const app=document.querySelector<HTMLElement>('#app')!,save=loadSave();
if(!secretSiegeUnlocked(save)){
 app.innerHTML='<main class="siege-locked"><h1>아직 숨겨진 길을 찾지 못했어요</h1><p>11단계에서 저주 마법사를 처치하고 방어와 학습 목표를 모두 달성하면 열려요.</p><a href="/?mode=adventure">모험 이어하기</a><a href="/?mode=title">시작 화면으로</a></main>';
}else mount();

function mount(){
 let model=new SecretSiege(save.difficulty,secretSiegeResumeStage(save),secretSiegeEconomy(save)),serial=0,disposed=false,held=false,endingActive=false,resultPending=false,frame=0,last=0,viewTime=0;
 let rosterTab:'basic'|'elite'='basic',noticeUntil=0;
 let savedCoins=model.money,economyBlocked=false,economyConflict=false,economyError='',saveRetryAt=0;
 const session=crypto.randomUUID(),sound=new Sound(),motion=new GameMotion(),listeners=new AbortController();
 const signal=listeners.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 sound.sfx=save.sfx;sound.setMusic(save.music);sound.setTrack('boss-dread');
 app.innerHTML=`<main id="siege-shell" class="siege-shell duel-preparation-panel" aria-label="비밀 원정 · 저주의 성 공략">
  <header class="siege-header" data-preparation-surface="panel"><div><p class="siege-eyebrow">비밀 원정 · 10개의 성채 · ${DIFFICULTIES[save.difficulty].name}</p><h1 id="siege-heading"></h1></div><nav aria-label="원정 메뉴"><button id="siege-stage-map">원정 지도</button><button id="siege-help">작전 안내</button><button id="siege-pause" disabled>일시정지</button><button id="siege-home">나가기</button></nav></header>
  <section class="siege-resources" aria-label="원정 현황"><span class="siege-wallet">원정 코인 <b id="siege-money">9.90</b><small id="siege-earned">타워 보상 +0.00</small></span><span>병력 <b id="siege-count">0 / 12</b></span><span>마법사 타워 <b id="siege-tower-count">4 / 4</b></span><span id="siege-enemy-resource">남은 몬스터 <b id="siege-monster-count">0</b><small id="siege-monster-next"></small></span><span id="siege-boss-resource" hidden>부활 마법사 <b id="siege-boss-health"></b><small id="siege-boss-phase"></small></span><span>저주 핵 <b id="siege-castle">9.99</b></span><strong id="siege-clock">출정 준비</strong></section>
  <div class="siege-layout"><section class="siege-map" data-preparation-surface="panel" aria-label="공략 전장"><canvas id="siege-canvas" width="1200" height="620" aria-label="아군이 왼쪽에서 출발해 마법사의 공격 타워 네 기와 성채를 공략하는 전장"></canvas><p id="siege-notice" role="status" aria-live="polite">마법사의 공격 타워 4기를 돌파하세요. 방패병이 앞장서고 정찰병이 작은 나머지를 마무리해요.</p></section>
  <aside class="siege-command" aria-label="군대 편성 및 출격"><div class="siege-command-title"><h2>해방군 편성</h2><span id="siege-clear-record"></span></div><div class="siege-roster-tabs" role="tablist" aria-label="해방군 병과"><button id="siege-basic-tab" type="button" role="tab" aria-selected="true" aria-controls="siege-basic-roster" data-roster-tab="basic" data-preparation-surface="active">기본 병력</button><button id="siege-elite-tab" type="button" role="tab" aria-selected="false" aria-controls="siege-elite-roster" tabindex="-1" data-roster-tab="elite">정예 병력 <span id="siege-elite-count">0 / 4</span></button></div><div class="siege-rosters">${(['basic','elite'] as const).map(group=>`<section id="siege-${group}-roster" class="siege-roster" data-roster="${group}" role="tabpanel" aria-labelledby="siege-${group}-tab" ${group==='elite'?'hidden':''}>${ARMY.filter(spec=>group==='basic'?spec.researchCost===0:spec.researchCost>0).map(spec=>`<article class="siege-unit-card" data-preparation-surface="panel" data-army="${spec.id}">${siegeArmySpriteHTML(spec.row,'siege-portrait')}<div class="siege-unit-copy"><h3>${spec.name}</h3><small class="siege-unit-stats"><span>체력 ${numberText(spec.hp,2)}</span><span>공격 ${numberText(spec.attack,2)}</span><span>대기 <b id="reserve-${spec.id}">0</b>명</span></small></div><div class="siege-unit-detail"><p>${spec.supportHeal?`자동 회복 +${numberText(spec.supportHeal,2)} · ${spec.supportCooldown}초`:spec.description}</p><span id="army-unlock-${spec.id}" class="siege-unit-unlock"></span></div><div class="siege-unit-actions"><button data-research="${spec.id}" data-preparation-surface="active" ${spec.researchCost===0?'hidden':''}><span>연구 · ${numberText(spec.researchCost,2)} 코인</span></button><button data-recruit="${spec.id}"><span>훈련 · ${numberText(spec.cost,2)} 코인</span></button><button data-deploy="${spec.id}" disabled><span>출격</span></button></div></article>`).join('')}</section>`).join('')}</div>
   <div class="siege-command-actions"><button id="siege-rally" disabled><span>회복 지원 · 3회</span></button><button id="siege-start" data-preparation-surface="active"><span>출정</span></button></div><p class="siege-hint" id="siege-plan-hint">돌격대 또는 방패대와 정찰대를 함께 편성하세요.</p></aside></div>
  <p id="siege-accessible" class="sr-only" aria-live="off"></p>
  <dialog id="siege-dialog" class="siege-dialog" aria-labelledby="siege-dialog-title" data-preparation-surface="panel"><button id="siege-dialog-close" class="siege-close" aria-label="닫기">×</button><div id="siege-dialog-body"></div></dialog>
 </main>`;
 const root=document.getElementById('siege-shell')!,$=(id:string)=>document.getElementById(id)!;
 const canvas=$('siege-canvas') as HTMLCanvasElement,field=new SecretSiegeField(canvas,model);
 const dialog=$('siege-dialog') as HTMLDialogElement,body=$('siege-dialog-body');
 const skin=mountPreparationSkin(root);
 const audio=mountGameAudioControls(root,{getState:()=>({sfx:save.sfx,music:save.music}),change:(kind,enabled)=>{
  sound.resume();save[kind]=enabled;if(kind==='sfx')sound.sfx=enabled;else sound.setMusic(enabled);
  const current=loadSave();current.sfx=save.sfx;current.music=save.music;writeSave(current);
 }});
 let dialogReturn:HTMLElement|null=null,infoPaused=false;
 function text(id:string,value:string){const element=$(id);if(element.textContent!==value)element.textContent=value;}
 function enabled(id:string,value:boolean){const element=$(id) as HTMLButtonElement;element.disabled=!value;}
 function notice(message:string,important=false){if(!message||!important&&performance.now()<noticeUntil)return;if(important)noticeUntil=performance.now()+4500;text('siege-notice',message);}
 function commitEconomy(economy:SiegeEconomy&{revision:number},updateModel=true):boolean{
  const current=loadSave(),stored=secretSiegeEconomy(current);
  economyConflict=stored.revision!==economy.revision;
  economyError=economyConflict?'다른 창에서 원정 기록이 바뀌어 전투를 멈췄어요. 원정 지도에서 현재 단계를 다시 준비해 주세요.':'';
  if(!economyConflict&&(!persistSecretSiegeEconomy(current,economy)||!writeSave(current)))economyError='코인을 저장하지 못했어요. 저장 공간을 확인한 뒤 다시 시도해 주세요.';
  if(economyError){if(economyConflict)economyBlocked=true;notice(economyError,true);return false;}
  save.secretSiege=current.secretSiege;savedCoins=economy.coins;
  if(updateModel)model.economyRevision=secretSiegeEconomy(current).revision;
  return true;
 }
 function syncEconomy():boolean{
  if(model.money===savedCoins)return true;
  economyBlocked=!commitEconomy(model.currentEconomy);return !economyBlocked;
 }
 function roster(group:'basic'|'elite',focus=false){
  rosterTab=group;root.dataset.rosterTab=group;
  for(const name of ['basic','elite'] as const){const tab=$('siege-'+name+'-tab') as HTMLButtonElement;tab.setAttribute('aria-selected',String(name===group));tab.tabIndex=name===group?0:-1;tab.dataset.preparationSurface=name===group?'active':'button';$('siege-'+name+'-roster').hidden=name!==group;}
  skin.sync();if(focus)$('siege-'+group+'-tab').focus({preventScroll:true});
 }
 function researchArmy(id:ArmyId){
  const spec=ARMY.find(army=>army.id===id);if(!spec||held||economyBlocked||!model.canResearch(id))return;
  if(!model.research(id,economy=>commitEconomy(economy,false))){refresh();return;}
  sound.play('correct');
  notice(`${spec.name} 연구 완료! 병사는 별도 훈련비를 내고 준비하세요. 연구는 다음 원정에도 유지돼요.`,true);refresh();
 }
 function showDialog(kind:string,html:string){
  dialogReturn=document.activeElement as HTMLElement;dialog.dataset.kind=kind;body.innerHTML=html;
  if(!dialog.open)dialog.showModal();skin.sync();
  const input=body.querySelector<HTMLInputElement>('input');(input??$('siege-dialog-close')).focus();
  motion.reveal(dialog);
 }
 function closeDialog(){
  if(dialog.dataset.kind==='question')model.cancelQuestion();
  if(dialog.open)dialog.close();body.replaceChildren();
  if(infoPaused&&model.phase==='paused')model.togglePause();infoPaused=false;
  dialogReturn?.focus();refresh();
 }
 function guide(){
  if(model.pendingQuestion||held)return;
  infoPaused=model.phase==='playing';if(infoPaused)model.togglePause();
  const boss=model.boss;
  showDialog('guide',`<p class="siege-eyebrow">10개의 성채를 해방하는 원정</p><h2 id="siege-dialog-title">${boss?'마지막 성채에서 마법사가 부활했어요':'연구한 병과를 훈련해 성채를 공략하세요'}</h2><p>${boss?`부활한 마법사 · 체력 <b>${numberText(boss.maxHp,2)}</b> · 마력탄 공격 <b>${numberText(boss.attack,2)}</b>. 네 타워를 돌파하면 마법사가 직접 해방군을 공격해요. 마법사와 성채를 모두 쓰러뜨려야 마지막 원정이 끝나요.`:'열 개의 성채에서 악의 세력이 버티고 있어요. 인간 해방군과 함께 방어선을 돌파하세요. 성에서 나오는 몬스터도 우리 부대를 막아섭니다.'}</p><ol><li>정예 병과는 <b>출정 전 준비 중에 연구비를 한 번</b> 내고 개발해요. 연구 완료는 영구히 유지되며, 타워를 파괴해도 병과가 자동으로 열리지 않아요.</li><li><b>연구비와 병사 훈련비는 별도예요.</b> 연구만으로 병사가 생기지는 않아요. 원하는 병사를 한 명씩 훈련하고, 출정 후 <b>출격</b>을 누르세요. 훈련할 때마다 다음 가격에 ${numberText(SIEGE_RECRUIT_INCREMENT,2)} 코인이 더해지며 출격할 때 다시 내지 않아요.</li><li>타워를 파괴하면 원정 코인을 얻어요. <b>얻은 코인과 지출한 비용은 즉시 저장</b>되며 다음 단계로 그대로 이어져요. 다음 원정의 기본 병력을 훈련할 <b>준비금 ${numberText(STARTER_BUDGET,2)} 코인</b>을 지킬 수 있을 때만 연구·훈련할 수 있어요.</li><li>패배·재시작·새로고침 후에도 <b>훈련에 쓴 비용과 타워에서 얻은 보상을 반영한 현재 코인</b>을 그대로 유지해요. 완료한 연구는 유지되며 병력은 다시 편성해요. 단계를 바꾸어도 시작 코인을 다시 지급하지 않아요.</li><li>성에서 출격한 몬스터와 마주치면 부대가 자동으로 싸워요. 방패대로 후방 병력을 지키고 사제의 자동 회복과 <b>회복 지원 3회</b>를 활용하세요.${boss?' 마법사의 시전과 위험 표시를 살피고 회복 시점을 신중하게 정하세요.':''}</li></ol><p>문제를 푸는 동안 전투 시간은 흐르지 않아요. 저장된 원정 코인은 <b>${numberText(secretSiegeEconomy(save).coins,2)} 코인</b>이에요.</p><button id="siege-guide-done" data-preparation-surface="active">군대 편성으로</button>`);
  $('siege-guide-done').onclick=closeDialog;
 }
 function question(q:SiegeQuestion){
  const spec=ARMY.find(unit=>unit.id===q.armyId),title=q.kind==='recruit'?`${spec!.name} 병사 훈련`:'덧셈으로 회복 지원';
  showDialog('question',`<p class="siege-eyebrow">계산 중에는 전투가 멈춰요</p><h2 id="siege-dialog-title">${title}</h2><p>${q.kind==='recruit'?'병사 한 명의 훈련비를 내면 남는 원정 코인은 얼마일까요?':'두 수를 더해 회복 신호를 보내세요. 살아 있는 아군의 체력을 0.6씩 회복해요.'}</p><p class="siege-equation">${numberText(q.a,2)} ${q.operation==='-'?'−':'+'} ${numberText(q.b,2)} = ?</p><form id="siege-answer-form"><label for="siege-answer">${q.kind==='recruit'?'남은 코인':'덧셈의 답'}</label><div class="siege-answer-surface" data-preparation-surface="panel"><input id="siege-answer" name="answer" inputmode="decimal" autocomplete="off" maxlength="12" enterkeyhint="done" placeholder="소수점을 맞춰 입력하세요"></div><div class="siege-keypad">${['7','8','9','4','5','6','1','2','3','.','0','⌫'].map(key=>`<button type="button" data-answer-key="${key}" aria-label="${key==='⌫'?'한 글자 지우기':key==='.'?'소수점':key}">${key}</button>`).join('')}</div><p id="siege-answer-message" role="status" class="siege-answer-message"></p><div class="siege-dialog-actions"><button type="submit" data-preparation-surface="active">정답 제출</button><button type="button" id="siege-answer-cancel">취소</button></div></form>`);
  const input=$('siege-answer') as HTMLInputElement;
  body.querySelectorAll<HTMLButtonElement>('[data-answer-key]').forEach(button=>button.onclick=()=>{
   const key=button.dataset.answerKey!;input.value=key==='⌫'?input.value.slice(0,-1):key==='.'?(input.value.includes('.')?input.value:(input.value||'0')+'.'):input.value.length<12?input.value+key:input.value;input.focus();
  });
  $('siege-answer-cancel').onclick=closeDialog;
  $('siege-answer-form').onsubmit=event=>{
   event.preventDefault();if(model.pendingQuestion?.id!==q.id)return;
   let stored=true;
   const correct=model.answer(input.value,economy=>stored=commitEconomy(economy,false));
   if(!stored){text('siege-answer-message',economyError+' 코인과 병력은 그대로예요.');input.focus();refresh();return;}
   recordLearning({a:q.a,b:q.b,operation:q.operation,digits:2,context:q.kind==='recruit'?'money':'battle'},correct?'correct':'wrong',session+':siege:'+serial+':'+q.id);
   sound.play(correct?'correct':'wrong');
   if(correct){dialog.close();body.replaceChildren();dialogReturn?.focus();refresh();}
   else{text('siege-answer-message','소수점을 나란히 맞추고 다시 계산해 보세요. 코인과 병력은 그대로예요.');input.select();}
  };
 }
 function refresh(){
  const playing=model.phase==='playing',finished=model.phase==='won'||model.phase==='lost',active=model.units.filter(unit=>unit.hp>0);
  text('siege-money',numberText(model.money,2));text('siege-count',`${model.armyCount} / ${SIEGE_ARMY_LIMIT}`);text('siege-castle',numberText(model.castle,2));
  text('siege-earned',`타워 보상 +${numberText(model.earnedCoins,2)}`);
  const enemies=model.monsters.filter(monster=>monster.hp>0).length,unspawned=finished?0:Math.max(0,model.monsterLimit-model.monsterSpawned);
  text('siege-monster-count',String(enemies+unspawned));
  text('siege-monster-next',`전장 ${enemies} · `+(finished?'전투 종료':unspawned&&enemies>=model.monsterAliveLimit?'출격 대기':unspawned&&Number.isFinite(model.nextMonsterIn)?`${model.monsterSpawned?'다음':'첫'} 출격 ${Math.max(0,Math.ceil(model.nextMonsterIn))}초`:'추가 출격 없음'));
  const towers=model.targets.filter(target=>target.kind==='tower');text('siege-tower-count',`${towers.filter(target=>target.hp>0).length} / ${towers.length}`);
  const boss=model.boss,bossState=model.bossState;$('siege-boss-resource').hidden=!boss;
  if(boss){
   text('siege-boss-health',numberText(boss.hp,2));
   text('siege-boss-phase',bossState?.phase==='dormant'?'대기':bossState?.phase==='enraged'?'격노':boss.hp===0?'격파':'교전');
   $('siege-boss-resource').dataset.phase=bossState?.phase??'dormant';
   $('siege-boss-resource').dataset.spellPhase=bossState?.spell?.phase??'none';
   $('siege-boss-resource').dataset.spellCount=String(bossState?.spellCount??0);
   canvas.setAttribute('aria-label','인간 해방군이 성에서 출격한 몬스터와 네 타워를 돌파한 뒤 부활한 마법사와 성채를 공략하는 최종 전장');
  }else canvas.setAttribute('aria-label','인간 해방군과 성에서 출격한 몬스터가 싸우며 마법사의 네 타워와 성채를 공략하는 전장');
  const left=Math.max(0,Math.ceil(SIEGE_DURATION-model.elapsed));
  text('siege-clock',model.phase==='ready'?'출정 준비':`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`);
  const elites=ARMY.filter(spec=>spec.researchCost>0),availableElites=elites.filter(spec=>model.armyUnlocked(spec.id));
  text('siege-elite-count',`연구 ${availableElites.length} / ${elites.length}`);
  for(const spec of ARMY){
   text('reserve-'+spec.id,String(model.reserve[spec.id]));
   const recruit=root.querySelector<HTMLButtonElement>(`[data-recruit="${spec.id}"]`)!,deploy=root.querySelector<HTMLButtonElement>(`[data-deploy="${spec.id}"]`)!,research=root.querySelector<HTMLButtonElement>(`[data-research="${spec.id}"]`)!;
   const unlocked=model.armyUnlocked(spec.id),card=root.querySelector<HTMLElement>(`[data-army="${spec.id}"]`)!;card.dataset.locked=String(!unlocked);
   const cost=model.recruitCost(spec.id),protectedCoins=model.money-cost+model.remainingTowerRewards<STARTER_BUDGET;
   const recruitLabel=recruit.querySelector(':scope > span:not(.duel-preparation-skin)');if(recruitLabel)recruitLabel.textContent=`훈련 · ${numberText(cost,2)} 코인`;
   const trainingReason=!unlocked?'먼저 병과를 연구하세요.':model.money<cost?'훈련 코인이 부족해요.':model.armyCount>=SIEGE_ARMY_LIMIT?'병력은 대기 병사를 포함해 12명까지예요.':protectedCoins?`다음 원정 준비금 ${numberText(STARTER_BUDGET,2)} 코인을 남겨야 해요.`:'';
   recruit.title=trainingReason;recruit.setAttribute('aria-label',`${spec.name} 병사 훈련 ${numberText(cost,2)} 코인${trainingReason?' · '+trainingReason:''}`);
   research.hidden=spec.researchCost===0||unlocked;research.disabled=held||economyBlocked||!model.canResearch(spec.id);deploy.hidden=!unlocked;
   text('army-unlock-'+spec.id,!unlocked?model.phase!=='ready'?'연구는 출정 전 준비 중에 가능':model.canResearch(spec.id)?'1회 연구 · 병사 훈련비 별도':`연구 후 준비금 ${numberText(STARTER_BUDGET,2)} 코인 유지`:spec.researchCost>0?protectedCoins?`연구 완료 · 준비금 ${numberText(STARTER_BUDGET,2)} 유지`:'영구 연구 완료 · 훈련비 별도':protectedCoins?`다음 원정 준비금 ${numberText(STARTER_BUDGET,2)} 유지`:'');
   research.title=model.phase!=='ready'?'연구는 출정 전 준비 중에만 할 수 있어요.':`연구비 ${numberText(spec.researchCost,2)} 코인을 한 번 내고, 다음 원정 준비금 ${numberText(STARTER_BUDGET,2)} 코인을 남겨요. 병사 훈련비는 별도예요.`;
   recruit.disabled=held||economyBlocked||!model.canRecruit(spec.id);
   deploy.disabled=!playing||held||economyBlocked||!!model.pendingQuestion||!model.reserve[spec.id];
  }
  enabled('siege-pause',!held&&!finished&&model.phase!=='ready'&&!model.pendingQuestion);
  text('siege-pause',model.phase==='paused'?'계속하기':'일시정지');
  enabled('siege-rally',!held&&!economyBlocked&&model.canRally);text('siege-rally',`회복 지원 · ${model.ralliesLeft}회`);
  enabled('siege-start',!held&&!economyBlocked&&(model.phase==='ready'||finished));text('siege-start',finished?'다시 원정':'출정');
  text('siege-heading',`${model.stageId} / ${SIEGE_STAGE_COUNT} · ${model.stage.name}`);
  const record=secretSiegeStageRecord(save,model.stageId);
  text('siege-clear-record',`${save.secretSiege?.stages.length??0} / ${SIEGE_STAGE_COUNT} 해방${record?' · '+'★'.repeat(record.stars):''}`);
  enabled('siege-stage-map',!held&&!model.pendingQuestion);
  text('siege-plan-hint',model.phase==='paused'?'전투를 멈췄어요. 계속하기를 누르면 진격해요.':finished?`저장 코인 ${numberText(secretSiegeEconomy(save).coins,2)} · 연구는 영구 유지, 편성은 다시 준비해요.`:`연구비 1회 · 훈련비 병사마다. 다음 원정 준비금 ${numberText(STARTER_BUDGET,2)} 코인을 남겨요.`);
  text('siege-accessible',`비밀 원정 ${model.stageId}단계 ${model.stage.name}, ${model.phase}, 원정 코인 ${numberText(model.money)}, 타워 보상 ${numberText(model.earnedCoins)}, 출격 병력 ${active.length}명, 대기 병력 ${Object.values(model.reserve).reduce((a,b)=>a+b,0)}명, 마법사 타워 ${towers.filter(target=>target.hp>0).length}기, 영구 연구 완료 정예 병과 ${availableElites.length}개, 적 몬스터 ${enemies}마리 및 추가 출격 ${unspawned}마리, ${boss?`부활한 마법사 체력 ${numberText(boss.hp)}, 공격력 ${numberText(boss.attack)}, 상태 ${bossState?.phase}, `:''}저주 핵 체력 ${numberText(model.castle)}, 정답 ${model.correctAnswers}개.`);
  skin.sync();
 }
 function beginStage(stageId:number){
  if(!syncEconomy()&&!economyConflict)return;
  const current=loadSave();if(!selectSecretSiegeStage(current,stageId))return;
  if(!writeSave(current)){notice('원정 준비를 저장하지 못했어요. 다시 시도해 주세요.',true);return;}save.secretSiege=current.secretSiege;
  serial++;held=false;resultPending=false;infoPaused=false;motion.clear();if(dialog.open)dialog.close();body.replaceChildren();
  model=new SecretSiege(save.difficulty,stageId,secretSiegeEconomy(current));savedCoins=model.money;economyBlocked=economyConflict=false;economyError='';field.setModel(model);viewTime=0;last=0;noticeUntil=0;roster('basic');sound.setTrack('boss-dread');notice(`${stageId}단계 · ${model.stage.subtitle} · 저장 코인 ${numberText(model.money,2)}과 연구를 이어가요.`);refresh();
 }
 function retry(){beginStage(model.stageId);}
 function stageMap(){
  if(model.pendingQuestion||held)return;
  if(!syncEconomy()&&!economyConflict)return;
  save.secretSiege=loadSave().secretSiege;
  if(dialog.open)closeDialog();infoPaused=model.phase==='playing';if(infoPaused)model.togglePause();
  const liberated=save.secretSiege?.stages.length??0;
  showDialog('map',`<section class="siege-stage-map" data-completed="${liberated===SIEGE_STAGE_COUNT}"><p class="siege-eyebrow">${liberated===SIEGE_STAGE_COUNT?'빛을 되찾은 세상 · 세계를 구하는 원정대':'악의 세력을 몰아내는 열 번의 원정'}</p><h2 id="siege-dialog-title">원정 지도 <small>${liberated} / ${SIEGE_STAGE_COUNT} 해방</small></h2><div class="siege-stage-grid">${Array.from({length:SIEGE_STAGE_COUNT},(_,index)=>{
   const stage=siegeStage(index+1),unlocked=secretSiegeStageUnlocked(save,stage.id),record=secretSiegeStageRecord(save,stage.id);
   return `<button type="button" data-stage="${stage.id}" data-preparation-surface="${stage.id===model.stageId?'active':'panel'}" ${unlocked?'':'disabled'} ${stage.id===model.stageId?'aria-current="step"':''}><b>${String(stage.id).padStart(2,'0')}</b><span>${stage.name}</span><small>${!unlocked?'잠김':record?'★'.repeat(record.stars)+' · '+Math.ceil(record.bestSeconds)+'초':stage.id===SIEGE_STAGE_COUNT?'부활 마법사':stage.id===model.stageId?'편성 중':'새 원정'}</small></button>`;
  }).join('')}</div><p class="siege-stage-note">${liberated===SIEGE_STAGE_COUNT?'악의 세력을 물리쳤어요. 이제 다른 세상에 평화를 되찾아 줄 차례예요.':'성채를 해방하면 다음 길이 열려요. 다음 단계에서는 적의 체력과 공격이 강해져요.'}<br>단계를 선택해도 저장된 코인과 연구는 유지돼요. 병력은 다시 편성하며, 훈련에 쓴 비용과 타워에서 얻은 보상은 그대로 남아요.</p><div class="siege-dialog-actions"><button id="siege-map-close">현재 전장으로</button>${liberated===SIEGE_STAGE_COUNT?'<button id="siege-ending-replay" data-preparation-surface="active">엔딩 다시 보기</button>':''}</div></section>`);
  body.querySelectorAll<HTMLButtonElement>('[data-stage]').forEach(button=>button.onclick=()=>beginStage(Number(button.dataset.stage)));
  $('siege-map-close').onclick=closeDialog;
  if(liberated===SIEGE_STAGE_COUNT)$('siege-ending-replay').onclick=()=>void replayEnding();
 }
 async function ending(){
  try{
   const {playSecretSiegeEnding}=await import('./secret-siege-ending');
   if(disposed)return;endingActive=true;sound.setTrack('ending');await playSecretSiegeEnding({signal});
   if(disposed)return;
   const current=loadSave();if(markSecretSiegeEndingSeen(current)){save.secretSiege=current.secretSiege;writeSave(current);}
  }catch{notice('엔딩을 불러오지 못했어요. 원정 지도에서 다시 볼 수 있어요.');}
  finally{endingActive=false;}
 }
 async function replayEnding(){
  if(held||!loadSave().secretSiege?.cleared)return;
  closeDialog();const paused=model.phase==='playing';if(paused)model.togglePause();held=true;refresh();
  await ending();if(disposed)return;held=false;if(paused&&model.phase==='paused')model.togglePause();
  sound.setTrack(model.phase==='won'?'victory':'boss-dread');stageMap();refresh();
 }
 async function result(){
  if(resultPending)return;resultPending=true;held=true;
  const owner=model,token=serial,won=model.phase==='won';let victorySaved=false;
  const economySaved=syncEconomy();
  if(won&&economySaved){
   const current=loadSave();
   if(recordSecretSiegeVictory(current,model)&&writeSave(current)){save.secretSiege=current.secretSiege;model.economyRevision=secretSiegeEconomy(current).revision;victorySaved=true;}
   else notice('승리 기록을 저장하지 못했어요. 훈련비와 타워 보상은 이미 코인에 반영됐어요.',true);
  }
  const finale=won&&owner.stageId===SIEGE_STAGE_COUNT&&save.secretSiege?.cleared;
  await new Promise(resolve=>setTimeout(resolve,finale?4500:1000));if(disposed||model!==owner||serial!==token)return;
  sound.play(won?'victory':'defeat');sound.setTrack(won?'victory':'boss-dread');
  await motion.play(won?'victory':'defeat',{title:won?finale?'이 세상을 구했어요':`${owner.stageId}단계 해방`:'군대를 다시 모아요',subtitle:won?finale?'악의 세력을 물리치고 세상에 빛이 돌아옵니다':'다음 성채를 향한 길이 열렸어요':'방패대와 정찰대의 출격 순서를 바꾸어 보세요',key:`siege:${serial}:result`});
  if(disposed||model!==owner||serial!==token)return;
  if(finale)await ending();
  if(disposed||model!==owner||serial!==token)return;held=false;
  const next=won&&!finale&&victorySaved,checkpoint=secretSiegeEconomy(save);
  showDialog('result',`<p class="siege-eyebrow">비밀 원정 ${owner.stageId} / ${SIEGE_STAGE_COUNT}</p><h2 id="siege-dialog-title">${won?finale?'이 세상을 구했어요':`${owner.stageId}단계를 해방했어요`:'이번에는 성을 깨지 못했어요'}</h2>${won?`<p class="siege-stars">${'★'.repeat(model.stars)}</p>`:''}<p>${won?finale?'마지막 악의 세력이 사라졌어요. 인간 해방군은 이제 다른 세상을 구하러 떠나는 원정대가 됩니다.':`${owner.stage.name}에 평화가 돌아왔어요. 다음 성채에서는 더 강한 방어선이 기다리고 있어요.`:'방패대를 먼저 보내고, 정찰대를 뒤에서 보호해 보세요. 덧셈으로 회복을 지원할 수도 있어요.'}</p><p>원정 시간 ${Math.ceil(model.elapsed)}초 · 계산 정답 ${model.correctAnswers}개</p><p class="siege-result-economy">${won&&victorySaved?`다음 원정 코인 <b>${numberText(checkpoint.coins,2)}</b> · 연구 ${checkpoint.researched.length}종 영구 보유`:won?'승리 기록을 저장하지 못했어요. 현재 코인은 유지돼요.':`현재 코인 <b>${numberText(model.money,2)}</b>을 그대로 이어가요. 훈련에 쓴 비용과 타워 보상을 반영한 잔액이며, 연구도 유지돼요.`}</p><div class="siege-dialog-actions">${next?`<button id="siege-result-next" data-preparation-surface="active">${owner.stageId+1}단계로</button>`:'<button id="siege-result-retry" data-preparation-surface="active">다시 원정</button>'}<button id="siege-result-map">원정 지도</button><button id="siege-result-home">시작 화면</button></div>`);
  if(next)$('siege-result-next').onclick=()=>beginStage(owner.stageId+1);else $('siege-result-retry').onclick=retry;
  $('siege-result-map').onclick=stageMap;$('siege-result-home').onclick=home;refresh();
 }
 function home(){if(!syncEconomy()&&!economyConflict)return;sound.setMusic(false);navigateWithMotion(new URL('/?mode=title',location.href).href);}
 root.querySelectorAll<HTMLButtonElement>('[data-roster-tab]').forEach(button=>{
  button.onclick=()=>roster(button.dataset.rosterTab as 'basic'|'elite');
  button.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();roster(event.key==='Home'?'basic':event.key==='End'?'elite':rosterTab==='basic'?'elite':'basic',true);};
 });
 root.querySelectorAll<HTMLButtonElement>('[data-research]').forEach(button=>button.onclick=()=>{sound.resume();researchArmy(button.dataset.research as ArmyId);});
 root.querySelectorAll<HTMLButtonElement>('[data-recruit]').forEach(button=>button.onclick=()=>{sound.resume();if(held||economyBlocked)return;if(model.requestRecruit(button.dataset.recruit as ArmyId)){question(model.pendingQuestion!);refresh();}else notice(`병력 정원과 다음 원정 준비금 ${numberText(STARTER_BUDGET,2)} 코인을 확인하세요.`);});
 root.querySelectorAll<HTMLButtonElement>('[data-deploy]').forEach(button=>button.onclick=()=>{sound.resume();if(held||economyBlocked)return;if(model.deploy(button.dataset.deploy as ArmyId))refresh();else notice('출격 간격을 잠깐 두고 다시 눌러요.');});
 $('siege-start').onclick=async()=>{
  if(held||economyBlocked)return;sound.resume();if(model.phase==='won'||model.phase==='lost'){retry();return;}
  if(!model.start()){notice('정찰병 한 명과 돌격병 또는 방패병 한 명 이상을 훈련하세요.');return;}
  held=true;sound.play('start');const token=serial;
  await motion.play('battle',{title:`${model.stageId}단계 · 해방군 출정`,subtitle:model.stage.name+' · 병종별 출격 버튼으로 진격 순서를 정하세요',key:`siege:${serial}:start`});
  if(!disposed&&token===serial){held=false;notice(model.boss?'성채를 지키는 부활 마법사가 기다려요. 회복 지원과 후속 병력을 신중하게 사용하세요.':'방패대가 먼저! 병력의 출격 버튼을 눌러 성을 향해 보내세요.');refresh();}
 };
 $('siege-rally').onclick=()=>{if(held)return;sound.resume();if(model.requestRally()){question(model.pendingQuestion!);refresh();}};
 $('siege-pause').onclick=()=>{if(held)return;model.togglePause();refresh();};$('siege-help').onclick=guide;$('siege-home').onclick=home;$('siege-stage-map').onclick=stageMap;
 $('siege-dialog-close').onclick=closeDialog;dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&model.phase==='playing'&&!model.pendingQuestion){model.togglePause();refresh();}},{signal});
 let uiAt=0;
 function tick(now:number){
  if(disposed)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  if(economyBlocked&&!economyConflict&&now>=saveRetryAt){saveRetryAt=now+1000;syncEconomy();}
  if(!document.hidden&&!held&&!economyBlocked){model.step(dt);syncEconomy();if(!model.pendingQuestion&&model.phase!=='paused')viewTime+=dt;}
  else if(held&&(model.phase==='won'||model.phase==='lost'))viewTime+=dt;
  field.draw(viewTime,reduced.matches);
  for(const event of model.events.splice(0)){
   if(event.type==='reward'){
    if(!economyBlocked)notice(`${event.message} · 패배하거나 다시 시작해도 코인은 유지돼요.`,true);refresh();
   }else if(event.type!=='shot'&&event.type!=='hit'&&event.type!=='spell'&&event.type!=='heal')notice(event.message);
   if(event.type==='shot')sound.play('shot',event.friendly?'crystal':'basic');
   else if(event.type==='hit')sound.play('hit');else if(event.type==='destroy')sound.play('boss-shatter');else if(event.type==='deploy')sound.play('portal');else if(event.type==='spell'&&model.bossState?.spell?.phase==='warning')sound.play('boss-charge');
  }
  sound.setPaused(economyBlocked||(held&&!endingActive)||document.hidden||(!endingActive&&model.phase==='paused')||!!model.pendingQuestion);
  if(now-uiAt>140){refresh();uiAt=now;}
  if(!resultPending&&(model.phase==='won'||model.phase==='lost'))void result();
  frame=requestAnimationFrame(tick);
 }
 window.addEventListener('pagehide',()=>{syncEconomy();disposed=true;serial++;cancelAnimationFrame(frame);listeners.abort();field.dispose();skin.dispose();audio.dispose();sound.dispose();motion.dispose();},{once:true});
 roster('basic');refresh();held=true;
 void field.load().then(()=>{if(disposed)return;held=false;refresh();frame=requestAnimationFrame(tick);guide();}).catch(()=>{held=false;notice('일부 그림을 불러오지 못했어요. 새로고침하면 다시 시도할 수 있어요.');refresh();frame=requestAnimationFrame(tick);});
}
