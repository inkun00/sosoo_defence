import {loadSave,writeSave} from './save';
import {secretSiegeUnlocked,recordSecretSiegeVictory,secretSiegeResumeStage,secretSiegeStageUnlocked,secretSiegeStageRecord,selectSecretSiegeStage,markSecretSiegeEndingSeen} from './secret-siege-progress';
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
 let model=new SecretSiege(save.difficulty,secretSiegeResumeStage(save)),serial=0,disposed=false,held=false,endingActive=false,resultPending=false,frame=0,last=0,viewTime=0;
 const session=crypto.randomUUID(),sound=new Sound(),motion=new GameMotion(),listeners=new AbortController();
 const signal=listeners.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 sound.sfx=save.sfx;sound.setMusic(save.music);sound.setTrack('boss-dread');
 app.innerHTML=`<main id="siege-shell" class="siege-shell duel-preparation-panel" aria-label="비밀 원정 · 저주의 성 공략">
  <header class="siege-header" data-preparation-surface="panel"><div><p class="siege-eyebrow">비밀 원정 · 10개의 성채 · ${DIFFICULTIES[save.difficulty].name}</p><h1 id="siege-heading"></h1></div><nav aria-label="원정 메뉴"><button id="siege-stage-map">원정 지도</button><button id="siege-help">작전 안내</button><button id="siege-pause" disabled>일시정지</button><button id="siege-home">나가기</button></nav></header>
  <section class="siege-resources" aria-label="원정 현황"><span>원정 코인 <b id="siege-money">9.90</b></span><span>병력 <b id="siege-count">0 / 12</b></span><span>마법사 타워 <b id="siege-tower-count">4 / 4</b></span><span id="siege-boss-resource" hidden>부활 마법사 <b id="siege-boss-health"></b><small id="siege-boss-phase"></small></span><span>저주 핵 <b id="siege-castle">9.99</b></span><strong id="siege-clock">출정 준비</strong></section>
  <div class="siege-layout"><section class="siege-map" data-preparation-surface="panel" aria-label="공략 전장"><canvas id="siege-canvas" width="1200" height="620" aria-label="아군이 왼쪽에서 출발해 마법사의 공격 타워 네 기와 성채를 공략하는 전장"></canvas><p id="siege-notice" role="status" aria-live="polite">마법사의 공격 타워 4기를 돌파하세요. 방패병이 앞장서고 정찰병이 작은 나머지를 마무리해요.</p></section>
  <aside class="siege-command" aria-label="군대 편성 및 출격"><div class="siege-command-title"><h2>해방군 편성</h2><span id="siege-clear-record"></span></div><div class="siege-roster">${ARMY.map(spec=>`<article class="siege-unit-card" data-preparation-surface="panel" data-army="${spec.id}">${siegeArmySpriteHTML(spec.row,'siege-portrait')}<div class="siege-unit-copy"><h3>${spec.name}</h3><p>${spec.description}</p><small>체력 ${numberText(spec.hp)} · 대기 <b id="reserve-${spec.id}">0</b>명</small></div><div class="siege-unit-actions"><button data-recruit="${spec.id}"><span>모집 · ${numberText(spec.cost)} 코인</span></button><button data-deploy="${spec.id}" disabled><span>출격</span></button></div></article>`).join('')}</div>
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
 function notice(message:string){text('siege-notice',message);}
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
  showDialog('guide',`<p class="siege-eyebrow">10개의 성채를 해방하는 원정</p><h2 id="siege-dialog-title">${boss?'마지막 성채에서 마법사가 부활했어요':'이번에는 우리가 진격할 차례예요'}</h2><p>${boss?`부활한 마법사 · 체력 <b>${numberText(boss.maxHp,2)}</b> · 마력탄 공격 <b>${numberText(boss.attack,2)}</b>. 네 타워를 돌파하면 마법사가 직접 해방군을 공격해요. 마법사와 성채를 모두 쓰러뜨려야 마지막 원정이 끝나요.`:'마법사는 쓰러졌지만, 열 개의 성채에는 악의 세력이 남아 있어요. 인간 해방군과 함께 하나씩 돌파하세요. 마지막 성채에는 부활한 마법사가 기다리고 있어요.'}</p><ol><li>코인에서 모집 비용을 빼고 군대를 편성해요. 한 명을 모집할 때마다 모든 병종의 다음 모집 비용이 ${numberText(SIEGE_RECRUIT_INCREMENT,2)}코인씩 올라요. 비축 병력도 포함하며 출격할 때 다시 차감하지 않아요.</li><li>출정한 뒤 병종별 <b>출격</b>을 눌러 진격 순서를 정해요. 방패대로 작은 정찰대를 보호해요.</li><li>${boss?'마법사의 시전과 바닥의 위험 표시를 살피세요. 회복 지원과 후속 부대 출격 시점을 신중하게 정하세요.':'큰 공격으로 성의 힘을 줄이고, <b>0.01 정찰대</b>로 정확히 0을 만들어요.'}</li></ol><p>${boss?'체력이 줄어들면 마법사가 격노해요. 공격 부대와 회복을 끝까지 남겨 두세요. ':''}문제를 푸는 동안 전투 시간은 흐르지 않아요. 단계별 기록은 원정 지도에서 확인해요.</p><button id="siege-guide-done" data-preparation-surface="active">군대 편성으로</button>`);
  $('siege-guide-done').onclick=closeDialog;
 }
 function question(q:SiegeQuestion){
  const spec=ARMY.find(unit=>unit.id===q.armyId),title=q.kind==='recruit'?`${spec!.name} 모집`:'덧셈으로 회복 지원';
  showDialog('question',`<p class="siege-eyebrow">계산 중에는 전투가 멈춰요</p><h2 id="siege-dialog-title">${title}</h2><p>${q.kind==='recruit'?'남는 원정 코인은 얼마일까요?':'두 수를 더해 회복 신호를 보내세요. 살아 있는 아군의 체력을 0.6씩 회복해요.'}</p><p class="siege-equation">${numberText(q.a,2)} ${q.operation==='-'?'−':'+'} ${numberText(q.b,2)} = ?</p><form id="siege-answer-form"><label for="siege-answer">${q.kind==='recruit'?'남은 코인':'덧셈의 답'}</label><div class="siege-answer-surface" data-preparation-surface="panel"><input id="siege-answer" name="answer" inputmode="decimal" autocomplete="off" maxlength="12" enterkeyhint="done" placeholder="소수점을 맞춰 입력하세요"></div><div class="siege-keypad">${['7','8','9','4','5','6','1','2','3','.','0','⌫'].map(key=>`<button type="button" data-answer-key="${key}" aria-label="${key==='⌫'?'한 글자 지우기':key==='.'?'소수점':key}">${key}</button>`).join('')}</div><p id="siege-answer-message" role="status" class="siege-answer-message"></p><div class="siege-dialog-actions"><button type="submit" data-preparation-surface="active">정답 제출</button><button type="button" id="siege-answer-cancel">취소</button></div></form>`);
  const input=$('siege-answer') as HTMLInputElement;
  body.querySelectorAll<HTMLButtonElement>('[data-answer-key]').forEach(button=>button.onclick=()=>{
   const key=button.dataset.answerKey!;input.value=key==='⌫'?input.value.slice(0,-1):key==='.'?(input.value.includes('.')?input.value:(input.value||'0')+'.'):input.value.length<12?input.value+key:input.value;input.focus();
  });
  $('siege-answer-cancel').onclick=closeDialog;
  $('siege-answer-form').onsubmit=event=>{
   event.preventDefault();if(model.pendingQuestion?.id!==q.id)return;
   const correct=model.answer(input.value);
   recordLearning({a:q.a,b:q.b,operation:q.operation,digits:2,context:q.kind==='recruit'?'money':'battle'},correct?'correct':'wrong',session+':siege:'+serial+':'+q.id);
   sound.play(correct?'correct':'wrong');
   if(correct){dialog.close();body.replaceChildren();dialogReturn?.focus();refresh();}
   else{text('siege-answer-message','소수점을 나란히 맞추고 다시 계산해 보세요. 코인과 병력은 그대로예요.');input.select();}
  };
 }
 function refresh(){
  const playing=model.phase==='playing',finished=model.phase==='won'||model.phase==='lost',active=model.units.filter(unit=>unit.hp>0);
  text('siege-money',numberText(model.money,2));text('siege-count',`${model.armyCount} / ${SIEGE_ARMY_LIMIT}`);text('siege-castle',numberText(model.castle,2));
  const towers=model.targets.filter(target=>target.kind==='tower');text('siege-tower-count',`${towers.filter(target=>target.hp>0).length} / ${towers.length}`);
  const boss=model.boss,bossState=model.bossState;$('siege-boss-resource').hidden=!boss;
  if(boss){
   text('siege-boss-health',numberText(boss.hp,2));
   text('siege-boss-phase',bossState?.phase==='dormant'?'대기':bossState?.phase==='enraged'?'격노':boss.hp===0?'격파':'교전');
   $('siege-boss-resource').dataset.phase=bossState?.phase??'dormant';
   $('siege-boss-resource').dataset.spellPhase=bossState?.spell?.phase??'none';
   $('siege-boss-resource').dataset.spellCount=String(bossState?.spellCount??0);
   canvas.setAttribute('aria-label','인간 해방군이 네 타워를 돌파한 뒤 부활한 마법사와 성채를 공략하는 최종 전장');
  }else canvas.setAttribute('aria-label','아군이 왼쪽에서 출발해 마법사의 공격 타워 네 기와 성채를 공략하는 전장');
  const left=Math.max(0,Math.ceil(SIEGE_DURATION-model.elapsed));
  text('siege-clock',model.phase==='ready'?'출정 준비':`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`);
  for(const spec of ARMY){
   text('reserve-'+spec.id,String(model.reserve[spec.id]));
   const recruit=root.querySelector<HTMLButtonElement>(`[data-recruit="${spec.id}"]`)!,deploy=root.querySelector<HTMLButtonElement>(`[data-deploy="${spec.id}"]`)!;
   const recruitLabel=recruit.querySelector(':scope > span:not(.duel-preparation-skin)');if(recruitLabel)recruitLabel.textContent=`모집 · ${numberText(model.recruitCost(spec.id),2)} 코인`;
   recruit.disabled=held||!model.canRecruit(spec.id);
   deploy.disabled=!playing||held||!!model.pendingQuestion||!model.reserve[spec.id];
  }
  enabled('siege-pause',!held&&!finished&&model.phase!=='ready'&&!model.pendingQuestion);
  text('siege-pause',model.phase==='paused'?'계속하기':'일시정지');
  enabled('siege-rally',!held&&model.canRally);text('siege-rally',`회복 지원 · ${model.ralliesLeft}회`);
  enabled('siege-start',!held&&(model.phase==='ready'||finished));text('siege-start',finished?'다시 원정':'출정');
  text('siege-heading',`${model.stageId} / ${SIEGE_STAGE_COUNT} · ${model.stage.name}`);
  const record=secretSiegeStageRecord(save,model.stageId);
  text('siege-clear-record',`${save.secretSiege?.stages.length??0} / ${SIEGE_STAGE_COUNT} 해방${record?' · '+'★'.repeat(record.stars):''}`);
  enabled('siege-stage-map',!held&&!model.pendingQuestion);
  text('siege-plan-hint',model.phase==='ready'?`모집 1명마다 다음 비용 +${numberText(SIEGE_RECRUIT_INCREMENT,2)} 코인. `+(boss?'최종 결전: 부활 마법사와 성채를 모두 쓰러뜨리세요.':'돌격대 또는 방패대와 정찰대를 함께 편성하세요.'):model.phase==='paused'?'전투를 멈췄어요. 계속하기를 누르면 진격해요.':finished?'원정을 다시 시작하면 코인과 군대를 새로 준비해요.':active.length?boss&&boss.hp>0?'시전 예고를 살피고 회복과 후속 병력을 아껴 두세요.':'방패대가 앞장서고 정찰대가 마무리해요.':'대기 중인 병력의 출격 버튼을 눌러요.');
  text('siege-accessible',`비밀 원정 ${model.stageId}단계 ${model.stage.name}, ${model.phase}, 원정 코인 ${numberText(model.money)}, 출격 병력 ${active.length}명, 대기 병력 ${Object.values(model.reserve).reduce((a,b)=>a+b,0)}명, 마법사 타워 ${towers.filter(target=>target.hp>0).length}기, ${boss?`부활한 마법사 체력 ${numberText(boss.hp)}, 공격력 ${numberText(boss.attack)}, 상태 ${bossState?.phase}, `:''}저주 핵 체력 ${numberText(model.castle)}, 정답 ${model.correctAnswers}개.`);
  skin.sync();
 }
 function beginStage(stageId:number){
  const current=loadSave();if(!selectSecretSiegeStage(current,stageId))return;
  save.secretSiege=current.secretSiege;writeSave(current);
  serial++;held=false;resultPending=false;infoPaused=false;motion.clear();if(dialog.open)dialog.close();body.replaceChildren();
  model=new SecretSiege(save.difficulty,stageId);field.setModel(model);viewTime=0;last=0;sound.setTrack('boss-dread');notice(`${stageId}단계 · ${model.stage.subtitle}`);refresh();
 }
 function retry(){beginStage(model.stageId);}
 function stageMap(){
  if(model.pendingQuestion||held)return;
  save.secretSiege=loadSave().secretSiege;
  if(dialog.open)closeDialog();infoPaused=model.phase==='playing';if(infoPaused)model.togglePause();
  const liberated=save.secretSiege?.stages.length??0;
  showDialog('map',`<section class="siege-stage-map" data-completed="${liberated===SIEGE_STAGE_COUNT}"><p class="siege-eyebrow">${liberated===SIEGE_STAGE_COUNT?'빛을 되찾은 세상 · 세계를 구하는 원정대':'악의 세력을 몰아내는 열 번의 원정'}</p><h2 id="siege-dialog-title">원정 지도 <small>${liberated} / ${SIEGE_STAGE_COUNT} 해방</small></h2><div class="siege-stage-grid">${Array.from({length:SIEGE_STAGE_COUNT},(_,index)=>{
   const stage=siegeStage(index+1),unlocked=secretSiegeStageUnlocked(save,stage.id),record=secretSiegeStageRecord(save,stage.id);
   return `<button type="button" data-stage="${stage.id}" data-preparation-surface="${stage.id===model.stageId?'active':'panel'}" ${unlocked?'':'disabled'} ${stage.id===model.stageId?'aria-current="step"':''}><b>${String(stage.id).padStart(2,'0')}</b><span>${stage.name}</span><small>${!unlocked?'잠김':record?'★'.repeat(record.stars)+' · '+Math.ceil(record.bestSeconds)+'초':stage.id===SIEGE_STAGE_COUNT?'부활 마법사':stage.id===model.stageId?'편성 중':'새 원정'}</small></button>`;
  }).join('')}</div><p class="siege-stage-note">${liberated===SIEGE_STAGE_COUNT?'악의 세력을 물리쳤어요. 이제 다른 세상에 평화를 되찾아 줄 차례예요.':'성채를 해방하면 다음 길이 열려요. 다음 단계에서는 적의 체력과 공격이 강해져요.'}<br>단계를 선택하면 코인과 군대를 새로 준비해요.</p><div class="siege-dialog-actions"><button id="siege-map-close">현재 전장으로</button>${liberated===SIEGE_STAGE_COUNT?'<button id="siege-ending-replay" data-preparation-surface="active">엔딩 다시 보기</button>':''}</div></section>`);
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
  const owner=model,token=serial,won=model.phase==='won';
  if(won){
   const current=loadSave();
   if(recordSecretSiegeVictory(current,model)){save.secretSiege=current.secretSiege;if(!writeSave(current))notice('이 브라우저에서는 원정 기록 저장이 제한되어 있어요.');}
  }
  const finale=won&&owner.stageId===SIEGE_STAGE_COUNT&&save.secretSiege?.cleared;
  await new Promise(resolve=>setTimeout(resolve,finale?4500:1000));if(disposed||model!==owner||serial!==token)return;
  sound.play(won?'victory':'defeat');sound.setTrack(won?'victory':'boss-dread');
  await motion.play(won?'victory':'defeat',{title:won?finale?'이 세상을 구했어요':`${owner.stageId}단계 해방`:'군대를 다시 모아요',subtitle:won?finale?'악의 세력을 물리치고 세상에 빛이 돌아옵니다':'다음 성채를 향한 길이 열렸어요':'방패대와 정찰대의 출격 순서를 바꾸어 보세요',key:`siege:${serial}:result`});
  if(disposed||model!==owner||serial!==token)return;
  if(finale)await ending();
  if(disposed||model!==owner||serial!==token)return;held=false;
  showDialog('result',`<p class="siege-eyebrow">비밀 원정 ${owner.stageId} / ${SIEGE_STAGE_COUNT}</p><h2 id="siege-dialog-title">${won?finale?'이 세상을 구했어요':`${owner.stageId}단계를 해방했어요`:'이번에는 성을 깨지 못했어요'}</h2>${won?`<p class="siege-stars">${'★'.repeat(model.stars)}</p>`:''}<p>${won?finale?'마지막 악의 세력이 사라졌어요. 인간 해방군은 이제 다른 세상을 구하러 떠나는 원정대가 됩니다.':`${owner.stage.name}에 평화가 돌아왔어요. 다음 성채에서는 더 강한 방어선이 기다리고 있어요.`:'방패대를 먼저 보내고, 정찰대를 뒤에서 보호해 보세요. 덧셈으로 회복을 지원할 수도 있어요.'}</p><p>원정 시간 ${Math.ceil(model.elapsed)}초 · 계산 정답 ${model.correctAnswers}개</p><div class="siege-dialog-actions">${won&&!finale?`<button id="siege-result-next" data-preparation-surface="active">${owner.stageId+1}단계로</button>`:'<button id="siege-result-retry" data-preparation-surface="active">다시 원정</button>'}<button id="siege-result-map">원정 지도</button><button id="siege-result-home">시작 화면</button></div>`);
  if(won&&!finale)$('siege-result-next').onclick=()=>beginStage(owner.stageId+1);else $('siege-result-retry').onclick=retry;
  $('siege-result-map').onclick=stageMap;$('siege-result-home').onclick=home;refresh();
 }
 function home(){sound.setMusic(false);navigateWithMotion(new URL('/?mode=title',location.href).href);}
 root.querySelectorAll<HTMLButtonElement>('[data-recruit]').forEach(button=>button.onclick=()=>{sound.resume();if(held)return;if(model.requestRecruit(button.dataset.recruit as ArmyId)){question(model.pendingQuestion!);refresh();}else notice('정찰대와 다른 병력을 함께 편성할 코인과 자리를 남겨 두세요.');});
 root.querySelectorAll<HTMLButtonElement>('[data-deploy]').forEach(button=>button.onclick=()=>{sound.resume();if(held)return;if(model.deploy(button.dataset.deploy as ArmyId))refresh();else notice('출격 간격을 잠깐 두고 다시 눌러요.');});
 $('siege-start').onclick=async()=>{
  if(held)return;sound.resume();if(model.phase==='won'||model.phase==='lost'){retry();return;}
  if(!model.start()){notice('정찰대 한 명과 돌격대 또는 방패대 한 명 이상을 모집하세요.');return;}
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
  if(!document.hidden&&!held){model.step(dt);if(!model.pendingQuestion&&model.phase!=='paused')viewTime+=dt;}
  else if(held&&(model.phase==='won'||model.phase==='lost'))viewTime+=dt;
  field.draw(viewTime,reduced.matches);
  for(const event of model.events.splice(0)){
   if(event.type!=='shot'&&event.type!=='hit'&&event.type!=='spell')notice(event.message);
   if(event.type==='shot')sound.play('shot',event.friendly?'crystal':'basic');
   else if(event.type==='hit')sound.play('hit');else if(event.type==='destroy')sound.play('boss-shatter');else if(event.type==='deploy')sound.play('portal');else if(event.type==='spell'&&model.bossState?.spell?.phase==='warning')sound.play('boss-charge');
  }
  sound.setPaused((held&&!endingActive)||document.hidden||(!endingActive&&model.phase==='paused')||!!model.pendingQuestion);
  if(now-uiAt>140){refresh();uiAt=now;}
  if(!resultPending&&(model.phase==='won'||model.phase==='lost'))void result();
  frame=requestAnimationFrame(tick);
 }
 window.addEventListener('pagehide',()=>{disposed=true;serial++;cancelAnimationFrame(frame);listeners.abort();field.dispose();skin.dispose();audio.dispose();sound.dispose();motion.dispose();},{once:true});
 refresh();held=true;
 void field.load().then(()=>{if(disposed)return;held=false;refresh();frame=requestAnimationFrame(tick);guide();}).catch(()=>{held=false;notice('일부 그림을 불러오지 못했어요. 새로고침하면 다시 시도할 수 있어요.');refresh();frame=requestAnimationFrame(tick);});
}
