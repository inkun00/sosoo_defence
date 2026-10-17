import {loadSave,writeSave} from './save';
import {secretSiegeUnlocked,recordSecretSiegeVictory} from './secret-siege-progress';
import {SecretSiege} from './secret-siege-model';
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
 let model=new SecretSiege(save.difficulty),serial=0,disposed=false,held=false,resultPending=false,frame=0,last=0,viewTime=0;
 const session=crypto.randomUUID(),sound=new Sound(),motion=new GameMotion(),listeners=new AbortController();
 const signal=listeners.signal,reduced=matchMedia('(prefers-reduced-motion: reduce)');
 sound.sfx=save.sfx;sound.setMusic(save.music);sound.setTrack('boss-dread');
 app.innerHTML=`<main id="siege-shell" class="siege-shell duel-preparation-panel" aria-label="비밀 원정 · 저주의 성 공략">
  <header class="siege-header" data-preparation-surface="panel"><div><p class="siege-eyebrow">비밀 원정 · ${DIFFICULTIES[save.difficulty].name}</p><h1>저주의 성을 향하여</h1></div><nav aria-label="원정 메뉴"><button id="siege-help">작전 안내</button><button id="siege-pause" disabled>일시정지</button><button id="siege-home">나가기</button></nav></header>
  <section class="siege-resources" aria-label="원정 현황"><span>원정 코인 <b id="siege-money">9.90</b></span><span>병력 <b id="siege-count">0 / 12</b></span><span>저주 핵 <b id="siege-castle">9.99</b></span><strong id="siege-clock">출정 준비</strong></section>
  <div class="siege-layout"><section class="siege-map" data-preparation-surface="panel" aria-label="공략 전장"><canvas id="siege-canvas" width="1200" height="620" aria-label="아군이 왼쪽에서 출발해 수비탑과 마법사의 성을 공격하는 전장"></canvas><p id="siege-notice" role="status" aria-live="polite">군대를 모집하고 출정하세요. 방패대가 앞장서고, 정찰대가 작은 나머지를 마무리해요.</p></section>
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
  showDialog('guide','<p class="siege-eyebrow">보스 격파 후일담</p><h2 id="siege-dialog-title">이번에는 우리가 진격할 차례예요</h2><p>마법사는 쓰러졌지만, 그의 성에는 저주의 핵이 남아 있어요. 왕국의 병사들과 함께 성에 남은 마지막 저주를 없애요.</p><ol><li>코인에서 모집 비용을 빼고 군대를 편성해요.</li><li>출정한 뒤 병종별 <b>출격</b>을 눌러 진격 순서를 정해요. 방패대로 작은 정찰대를 보호해요.</li><li>큰 공격으로 성의 힘을 줄이고, <b>0.01 정찰대</b>로 정확히 0을 만들어요.</li></ol><p>덧셈을 맞히면 아군을 회복할 수 있어요. 문제를 푸는 동안 전투 시간은 흐르지 않아요.</p><button id="siege-guide-done" data-preparation-surface="active">군대 편성으로</button>');
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
  const left=Math.max(0,Math.ceil(SIEGE_DURATION-model.elapsed));
  text('siege-clock',model.phase==='ready'?'출정 준비':`${String(Math.floor(left/60)).padStart(2,'0')}:${String(left%60).padStart(2,'0')}`);
  for(const spec of ARMY){
   text('reserve-'+spec.id,String(model.reserve[spec.id]));
   const recruit=root.querySelector<HTMLButtonElement>(`[data-recruit="${spec.id}"]`)!,deploy=root.querySelector<HTMLButtonElement>(`[data-deploy="${spec.id}"]`)!;
   recruit.disabled=finished||held||model.phase==='paused'||!!model.pendingQuestion||model.money<spec.cost||model.armyCount>=SIEGE_ARMY_LIMIT;
   deploy.disabled=!playing||held||!!model.pendingQuestion||!model.reserve[spec.id];
  }
  enabled('siege-pause',!held&&!finished&&model.phase!=='ready'&&!model.pendingQuestion);
  text('siege-pause',model.phase==='paused'?'계속하기':'일시정지');
  enabled('siege-rally',!held&&model.canRally);text('siege-rally',`회복 지원 · ${model.ralliesLeft}회`);
  enabled('siege-start',!held&&(model.phase==='ready'||finished));text('siege-start',finished?'다시 원정':'출정');
  text('siege-clear-record',save.secretSiege?.cleared?'★'.repeat(save.secretSiege.bestStars)+' 해방 완료':'');
  text('siege-plan-hint',model.phase==='ready'?'돌격대 또는 방패대와 정찰대를 함께 편성하세요.':model.phase==='paused'?'전투를 멈췄어요. 계속하기를 누르면 진격해요.':finished?'원정을 다시 시작하면 코인과 군대를 새로 준비해요.':active.length?'방패대가 앞장서고 정찰대가 마무리해요.':'대기 중인 병력의 출격 버튼을 눌러요.');
  text('siege-accessible',`비밀 원정 ${model.phase}, 원정 코인 ${numberText(model.money)}, 출격 병력 ${active.length}명, 대기 병력 ${Object.values(model.reserve).reduce((a,b)=>a+b,0)}명, 저주 핵 체력 ${numberText(model.castle)}, 정답 ${model.correctAnswers}개.`);
  skin.sync();
 }
 function retry(){
  serial++;held=false;resultPending=false;motion.clear();if(dialog.open)dialog.close();body.replaceChildren();
  model=new SecretSiege(save.difficulty);field.setModel(model);viewTime=0;sound.setTrack('boss-dread');notice('새 원정을 준비해요. 군대와 출격 순서를 바꾸어 도전하세요.');refresh();
 }
 async function result(){
  if(resultPending)return;resultPending=true;held=true;
  const owner=model,token=serial,won=model.phase==='won';
  if(won){
   const current=loadSave();
   if(recordSecretSiegeVictory(current,model)){save.secretSiege=current.secretSiege;if(!writeSave(current))notice('이 브라우저에서는 원정 기록 저장이 제한되어 있어요.');}
  }
  await new Promise(resolve=>setTimeout(resolve,1000));if(disposed||model!==owner||serial!==token)return;
  sound.play(won?'victory':'defeat');sound.setTrack(won?'victory':'boss-dread');
  await motion.play(won?'victory':'defeat',{title:won?'저주의 성을 해방했어요':'군대를 다시 모아요',subtitle:won?'소수의 성에 마지막 평화가 찾아왔어요':'방패대와 정찰대의 출격 순서를 바꾸어 보세요',key:`siege:${serial}:result`});
  if(disposed||model!==owner||serial!==token)return;held=false;
  showDialog('result',`<p class="siege-eyebrow">비밀 원정 ${won?'완료':'결과'}</p><h2 id="siege-dialog-title">${won?'저주의 마지막 근원을 없앴어요':'이번에는 성을 깨지 못했어요'}</h2>${won?`<p class="siege-stars">${'★'.repeat(model.stars)}</p>`:''}<p>${won?'왕국의 병사들이 성의 힘을 정확히 0으로 만들었어요. 마지막 저주가 사라졌으니 모두 고향으로 돌아갈 수 있어요.':'방패대를 먼저 보내고, 정찰대를 뒤에서 보호해 보세요. 덧셈으로 회복을 지원할 수도 있어요.'}</p><p>원정 시간 ${Math.ceil(model.elapsed)}초 · 계산 정답 ${model.correctAnswers}개</p><div class="siege-dialog-actions"><button id="siege-result-retry" data-preparation-surface="active">다시 원정</button><button id="siege-result-home">시작 화면</button></div>`);
  $('siege-result-retry').onclick=retry;$('siege-result-home').onclick=home;refresh();
 }
 function home(){sound.setMusic(false);navigateWithMotion(new URL('/?mode=title',location.href).href);}
 root.querySelectorAll<HTMLButtonElement>('[data-recruit]').forEach(button=>button.onclick=()=>{sound.resume();if(held)return;if(model.requestRecruit(button.dataset.recruit as ArmyId)){question(model.pendingQuestion!);refresh();}else notice('정찰대와 다른 병력을 함께 편성할 코인과 자리를 남겨 두세요.');});
 root.querySelectorAll<HTMLButtonElement>('[data-deploy]').forEach(button=>button.onclick=()=>{sound.resume();if(held)return;if(model.deploy(button.dataset.deploy as ArmyId))refresh();else notice('출격 간격을 잠깐 두고 다시 눌러요.');});
 $('siege-start').onclick=async()=>{
  if(held)return;sound.resume();if(model.phase==='won'||model.phase==='lost'){retry();return;}
  if(!model.start()){notice('정찰대 한 명과 돌격대 또는 방패대 한 명 이상을 모집하세요.');return;}
  held=true;sound.play('start');const token=serial;
  await motion.play('battle',{title:'해방군 출정',subtitle:'병종별 출격 버튼으로 진격 순서를 정하세요',key:`siege:${serial}:start`});
  if(!disposed&&token===serial){held=false;notice('방패대가 먼저! 병력의 출격 버튼을 눌러 성을 향해 보내세요.');refresh();}
 };
 $('siege-rally').onclick=()=>{if(held)return;sound.resume();if(model.requestRally()){question(model.pendingQuestion!);refresh();}};
 $('siege-pause').onclick=()=>{if(held)return;model.togglePause();refresh();};$('siege-help').onclick=guide;$('siege-home').onclick=home;
 $('siege-dialog-close').onclick=closeDialog;dialog.addEventListener('cancel',event=>{event.preventDefault();closeDialog();},{signal});
 document.addEventListener('visibilitychange',()=>{if(document.hidden&&model.phase==='playing'&&!model.pendingQuestion){model.togglePause();refresh();}},{signal});
 let uiAt=0;
 function tick(now:number){
  if(disposed)return;const dt=last?Math.min(.05,(now-last)/1000):0;last=now;
  if(!document.hidden&&!held){model.step(dt);if(!model.pendingQuestion&&model.phase!=='paused')viewTime+=dt;}
  else if(held&&(model.phase==='won'||model.phase==='lost'))viewTime+=dt;
  field.draw(viewTime,reduced.matches);
  for(const event of model.events.splice(0)){
   if(event.type!=='shot'&&event.type!=='hit')notice(event.message);
   if(event.type==='shot')sound.play('shot',event.friendly?'crystal':'basic');
   else if(event.type==='hit')sound.play('hit');else if(event.type==='destroy')sound.play('boss-shatter');else if(event.type==='deploy')sound.play('portal');
  }
  sound.setPaused(held||document.hidden||model.phase==='paused'||!!model.pendingQuestion);
  if(now-uiAt>140){refresh();uiAt=now;}
  if(!resultPending&&(model.phase==='won'||model.phase==='lost'))void result();
  frame=requestAnimationFrame(tick);
 }
 window.addEventListener('pagehide',()=>{disposed=true;serial++;cancelAnimationFrame(frame);listeners.abort();field.dispose();skin.dispose();audio.dispose();sound.dispose();motion.dispose();},{once:true});
 refresh();held=true;
 void field.load().then(()=>{if(disposed)return;held=false;refresh();frame=requestAnimationFrame(tick);guide();}).catch(()=>{held=false;notice('일부 그림을 불러오지 못했어요. 새로고침하면 다시 시도할 수 있어요.');refresh();frame=requestAnimationFrame(tick);});
}
