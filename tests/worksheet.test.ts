import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {generateWorksheet,questionAnswer,worksheetCode,codeHash,validWorksheet,validQuestion,makeQuestion,CIPHER_GROUPS,WorksheetQuestion} from '../src/worksheet';
import {loadLearning,recordLearning,recordKindLearning,classify,importLearningRecords,practiceWeight,CONCEPT_KINDS} from '../src/learning';
import {getOrCreateWorksheet,loadWorkbook,redeemWorksheet,drawWorksheetHero,HERO_LEVEL_CHANCES,selectWorksheetHero,ownedHeroIds} from '../src/worksheet-store';
import {worksheetPages,worksheetFocus} from '../src/worksheet-view';
import {newAdventure,loadSave,writeSave} from '../src/save';
import {HEROES,WORKSHEET_HEROES,worksheetHeroSpec} from '../src/multiplayer/heroes';
import {IDBFactory} from 'fake-indexeddb';
const cache=new Map<string,string>();let failStorage=false;
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>cache.get(key)??null,setItem:(key:string,v:string)=>{if(failStorage)throw Error('quota');cache.set(key,v);}},configurable:true});
beforeEach(()=>{cache.clear();failStorage=false;Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});});
function rng(seed=19){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}

test('학습지 보상은 기존 30개 ID를 유지하며 전용 이름·외모·세 효과의 특별 영웅을 반환한다',()=>{
 assert.deepEqual(WORKSHEET_HEROES.map(h=>h.id),HEROES.map(h=>h.id));
 for(const selected of WORKSHEET_HEROES){
  const owned=WORKSHEET_HEROES.filter(h=>h.id!==selected.id).map(h=>h.id),drawn=drawWorksheetHero(()=>.999,owned);
  assert.equal(drawn,worksheetHeroSpec(selected.id));assert.notEqual(drawn.name,HEROES.find(h=>h.id===drawn.id)!.name);
  assert.equal(drawn.sheet,'worksheet-heroes-v1');assert.equal(drawn.effects?.length,3);assert.equal(new Set(drawn.effects).size,3);
 }
});
test('1~11단계 학습지는 계산 10개와 서로 다른 개념 10개, 두 자리 이하 소수를 지킨다',async()=>{
 for(let level=1;level<=11;level++)for(let seed=1;seed<=8;seed++){
  const generated=generateWorksheet(loadLearning(),level,'sheet-'+level+'-'+seed,1700000000000,rng(seed)),s={...generated,codeHash:await codeHash(generated.id,worksheetCode(generated))};
  assert.ok(validWorksheet(s));assert.equal(s.questions.length,20);assert.equal(new Set(s.questions.map(questionAnswer)).size,20);assert.equal(s.decoder.length,30);
  assert.deepEqual(s.groups,CIPHER_GROUPS);assert.deepEqual(s.groups.flat(),Array.from({length:20},(_,i)=>i));assert.match(worksheetCode(s),/^[A-Z]{6}$/);
  assert.equal(s.questions.filter(q=>q.type).length,10);assert.equal(new Set(s.questions.filter(q=>q.type).map(q=>q.type)).size,10);
  for(const q of s.questions){assert.ok(validQuestion(q));assert.ok([q.a,q.b,questionAnswer(q)].every(n=>Number.isInteger(n)&&n>=0&&n%10===0));assert.ok(q.digits<=2);if(!q.type){assert.ok([q.a,q.b,questionAnswer(q)].every(n=>n<10000));assert.equal(classify(q),q.kind);assert.ok(q.digits<= (level===1?1:2));}}
 }
});
test('계산 10문항 중 최소 7개는 누적 오답을 연습하고 개념을 포함한 20개 정답이 암호에 기여한다',()=>{
 recordLearning({a:4000,b:1280,operation:'-',digits:2,context:'money'},'wrong');const p=loadLearning();assert.ok(p.counts['sub-2-chain']);
 const s=generateWorksheet(p,1,'practice-test',1700000000000,rng());assert.ok(s.questions.filter(q=>q.kind==='sub-2-chain').length>=7);assert.equal(s.questions.filter(q=>q.type).length,10);
 const original=worksheetCode(s);for(const q of s.questions){const entry=s.decoder.find(d=>d.answer===questionAnswer(q))!,old=entry.rune;entry.rune+=old===9?-1:1;try{assert.notEqual(worksheetCode(s),original);}catch(e){if(!(e as Error).message.includes('손상'))throw e;}entry.rune=old;}
});
test('오답·도움말·정답을 분류하고 역사 오답을 중복 수입하지 않는다',()=>{
 const sample={a:4350,b:210,operation:'-' as const,digits:2,context:'money' as const};const kind=classify(sample)!;assert.equal(kind,'sub-2-basic');
 recordLearning(sample,'wrong','match:a:q');recordLearning(sample,'help','help');recordLearning(sample,'help','help');
 const row={matchId:'match',hostUid:'a',guestUid:'b',side:0 as const,wrongQuestions:[{id:'q',a:4350,b:210,operation:'-' as const,kind:'tower',level:2,attempts:2}]};importLearningRecords([row,row]);
 const before=loadLearning().counts[kind]!;assert.equal(before.wrong,2);assert.equal(before.help,1);recordLearning(sample,'correct','correct');recordLearning(sample,'correct','correct');assert.equal(loadLearning().counts[kind]!.correct,1);assert.ok(practiceWeight(loadLearning().counts[kind]!)<practiceWeight(before));
 assert.equal(recordLearning({a:12000,b:100,operation:'-',context:'battle'},'wrong'),false);
});
test('같은 학습지를 다시 열어도 유지하고 새 출력은 새 20문항을 보관한다',async()=>{
 const s=await getOrCreateWorksheet(4,true);assert.equal((await getOrCreateWorksheet(4)).id,s.id);const other=await getOrCreateWorksheet(4,true);assert.notEqual(s.id,other.id);assert.equal(loadWorkbook().sheets.length,2);assert.ok(!JSON.stringify(loadWorkbook()).includes('"code":'));
});
test('Web Locks가 없는 환경에서도 동시에 새로 만든 학습지를 모두 보관한다',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 try{
  const sheets=await Promise.all(Array.from({length:3},()=>getOrCreateWorksheet(4,true)));
  assert.equal(new Set(sheets.map(s=>s.id)).size,3);
  assert.deepEqual(loadWorkbook().sheets.map(s=>s.id),sheets.map(s=>s.id));
  for(const sheet of sheets)assert.equal(loadWorkbook().sheets.find(s=>s.id===sheet.id)?.codeHash,sheet.codeHash);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else Reflect.deleteProperty(globalThis,'navigator');}
});
test('Web Locks가 없는 환경의 동시 기본 출력은 같은 학습지를 열고 저장 실패 후에도 다시 만들 수 있다',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator');
 Object.defineProperty(globalThis,'navigator',{configurable:true,value:{}});
 try{
  failStorage=true;await assert.rejects(getOrCreateWorksheet(4,true),/저장 공간/);failStorage=false;
  const sheets=await Promise.all(Array.from({length:3},()=>getOrCreateWorksheet(4)));
  assert.equal(new Set(sheets.map(s=>s.id)).size,1);assert.equal(loadWorkbook().sheets.length,1);
  assert.equal(loadWorkbook().sheets[0].id,sheets[0].id);
 }finally{if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else Reflect.deleteProperty(globalThis,'navigator');}
});
test('이전 계산 전용 학습지가 있어도 기본 출력은 새로운 단원 개념 학습지를 준비한다',async()=>{
 const old=await getOrCreateWorksheet(2,true),answers=new Set<number>();old.questions=Array.from({length:20},()=>makeQuestion('sub-2-basic',answers,rng(answers.size+50)));
 old.decoder=old.questions.map((q,i)=>({answer:questionAnswer(q),rune:i%4}));for(let n=10;old.decoder.length<30;n+=10)if(!answers.has(n))old.decoder.push({answer:n,rune:1});old.decoder.sort((a,b)=>a.answer-b.answer);old.codeHash=await codeHash(old.id,worksheetCode(old));assert.ok(validWorksheet(old));
 cache.set('decimal-workbook-v1',JSON.stringify({version:1,sheets:[old],collection:[],selectedHero:null}));Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});const current=await getOrCreateWorksheet(2);assert.notEqual(current.id,old.id);assert.equal(current.questions.filter(q=>q.type).length,10);assert.equal(loadWorkbook().sheets.length,2);
});
test('저장된 모눈 문항은 같은 정답의 글 문제로 표시하고 기존 암호와 영웅 보상을 유지한다',async()=>{
 const generated=generateWorksheet(loadLearning(),4,'legacy-grid-sheet',1700000000000,rng(19));
 const index=generated.questions.findIndex(q=>questionAnswer(q)>0&&questionAnswer(q)<1000);assert.ok(index>=0);
 const answer=questionAnswer(generated.questions[index]),code=worksheetCode(generated),decoder=JSON.stringify(generated.decoder),groups=JSON.stringify(generated.groups);
 const sheet={...generated,questions:generated.questions.map((q,i)=>i===index?{a:answer,b:0,operation:'+' as const,digits:2 as const,kind:'concept-grid' as const,type:'concept-grid' as const,context:'concept' as const,data:[answer/10]}:q),focus:['concept-grid' as const],codeHash:await codeHash(generated.id,code)};
 assert.ok(validWorksheet(sheet));assert.equal(worksheetCode(sheet),code);assert.equal(JSON.stringify(sheet.decoder),decoder);assert.equal(JSON.stringify(sheet.groups),groups);
 const html=worksheetPages(sheet);assert.equal((html.match(/data-question=/g)||[]).length,20);assert.ok(html.includes('0.01이 '+answer/10+'개인 수는?'));assert.ok(!/ws-grid-art|<rect\b|색칠/.test(html));assert.ok(!worksheetFocus(sheet).includes('모눈'));
 cache.set('decimal-workbook-v1',JSON.stringify({version:1,sheets:[sheet],collection:[],selectedHero:null}));
 assert.equal(loadWorkbook().sheets[0].id,sheet.id);assert.equal((await getOrCreateWorksheet(4)).id,sheet.id);
 const result=await redeemWorksheet(sheet.id,code,()=>0);assert.equal(result.hero.id,'hero-1-0');assert.equal(loadWorkbook().sheets[0].claimedHero,result.hero.id);assert.equal(loadWorkbook().collection.length,1);
 await assert.rejects(redeemWorksheet(sheet.id,code),/이미/);assert.equal(loadWorkbook().collection.length,1);
});
test('암호 오답에는 보상이 없고 정답·새로고침·중복 제출에 한 번만 지급한다',async()=>{
 const s=await getOrCreateWorksheet(4,true),code=worksheetCode(s),bad=(code==='AAAAAA'?'BBBBBB':'AAAAAA');await assert.rejects(redeemWorksheet(s.id,bad),/맞지/);assert.equal(loadWorkbook().collection.length,0);
 const result=await redeemWorksheet(s.id,code.toLowerCase(),()=>0);assert.equal(result.hero.id,'hero-1-0');assert.equal(loadWorkbook().sheets[0].claimedHero,result.hero.id);assert.equal(loadWorkbook().selectedHero,result.hero.id);assert.equal(loadLearning().counts[s.questions[0].kind]!.correct,s.questions.filter(q=>q.kind===s.questions[0].kind).length);
 await assert.rejects(redeemWorksheet(s.id,code),/이미/);assert.equal(loadWorkbook().collection[0].copies,1);
});
test('동시 암호 제출에서도 하나만 성공하고 여러 학습지의 영웅을 선택할 수 있다',async()=>{
 const a=await getOrCreateWorksheet(4,true),outcomes=await Promise.allSettled([redeemWorksheet(a.id,worksheetCode(a),()=>0),redeemWorksheet(a.id,worksheetCode(a),()=>0)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 const b=await getOrCreateWorksheet(4,true);await redeemWorksheet(b.id,worksheetCode(b),()=>.999);assert.equal(loadWorkbook().collection.length,2);assert.equal(ownedHeroIds().length,2);await selectWorksheetHero('hero-10-2');assert.equal(loadWorkbook().selectedHero,'hero-10-2');await assert.rejects(selectWorksheetHero('hero-8-0'),/획득/);assert.equal(loadWorkbook().selectedHero,'hero-10-2');
 const c=await getOrCreateWorksheet(4,true);const third=await redeemWorksheet(c.id,worksheetCode(c),()=>0);assert.equal(third.hero.id,'hero-1-1');assert.equal(third.copies,1);assert.equal(loadWorkbook().collection.length,3);assert.ok(loadWorkbook().collection.every(h=>h.copies===1));
});
test('세 학습지에 같은 난수를 사용해도 서로 다른 영웅 세 명을 한 번씩 받는다',async()=>{
 const rewarded=[];for(let i=0;i<3;i++){const sheet=await getOrCreateWorksheet(4,true),result=await redeemWorksheet(sheet.id,worksheetCode(sheet),()=>0);rewarded.push(result.hero.id);assert.equal(result.copies,1);}
 assert.deepEqual(rewarded,['hero-1-0','hero-1-1','hero-1-2']);assert.equal(new Set(rewarded).size,3);assert.deepEqual(ownedHeroIds(),rewarded);assert.ok(loadWorkbook().collection.every(h=>h.copies===1));
});
test('서로 다른 학습지의 암호를 동시에 제출해도 같은 영웅을 지급하지 않는다',async()=>{
 const a=await getOrCreateWorksheet(4,true),b=await getOrCreateWorksheet(4,true),results=await Promise.all([redeemWorksheet(a.id,worksheetCode(a),()=>0),redeemWorksheet(b.id,worksheetCode(b),()=>0)]);
 assert.equal(new Set(results.map(result=>result.hero.id)).size,2);assert.equal(loadWorkbook().collection.length,2);assert.ok(results.every(result=>result.copies===1));assert.ok(loadWorkbook().sheets.every(sheet=>sheet.claimedHero));
});
test('획득을 마친 레벨은 제외하고 남은 레벨의 확률을 다시 나누며 남은 변형만 고른다',()=>{
 const owned=HEROES.filter(h=>h.level===1).map(h=>h.id),remainingWeight=100-HERO_LEVEL_CHANCES[0],boundary=HERO_LEVEL_CHANCES[1]/remainingWeight;
 let calls=0;assert.equal(drawWorksheetHero(()=>calls++===0?boundary-.000001:0,owned).id,'hero-2-0');
 calls=0;assert.equal(drawWorksheetHero(()=>calls++===0?boundary+.000001:0,owned).id,'hero-3-0');
 assert.equal(drawWorksheetHero(()=>0,['hero-1-0','hero-1-1']).id,'hero-1-2');
 assert.equal(drawWorksheetHero(()=>.999,new Set(HEROES.filter(h=>h.id!=='hero-6-1').map(h=>h.id))).id,'hero-6-1');
});
test('30종을 모두 중복 없이 지급한 뒤에는 학습지를 소비하거나 학습 기록을 바꾸지 않는다',async()=>{
 const rewarded=new Set<string>();for(let i=0;i<HEROES.length;i++){const sheet=await getOrCreateWorksheet(4,true),result=await redeemWorksheet(sheet.id,worksheetCode(sheet),()=>0);assert.ok(!rewarded.has(result.hero.id));rewarded.add(result.hero.id);assert.equal(result.copies,1);}
 assert.equal(rewarded.size,30);assert.deepEqual([...rewarded].sort(),HEROES.map(h=>h.id).sort());assert.equal(loadWorkbook().collection.length,30);assert.ok(loadWorkbook().collection.every(h=>h.copies===1));
 const extra=await getOrCreateWorksheet(4,true),beforeBook=JSON.stringify(loadWorkbook()),beforeLearning=JSON.stringify(loadLearning());
 await assert.rejects(redeemWorksheet(extra.id,worksheetCode(extra),()=>0),/모든 영웅|수집.*완료/);
 assert.equal(JSON.stringify(loadWorkbook()),beforeBook);assert.equal(JSON.stringify(loadLearning()),beforeLearning);assert.equal(loadWorkbook().sheets.find(s=>s.id===extra.id)!.claimedHero,null);
 assert.throws(()=>drawWorksheetHero(()=>0,rewarded),/모든 영웅|수집.*완료/);
});
test('기존 중복 획득 이력과 선택한 영웅은 보존하고 새 보상만 미보유 영웅으로 지급한다',async()=>{
 const previous=await getOrCreateWorksheet(4,true);await redeemWorksheet(previous.id,worksheetCode(previous),()=>0);const legacy=loadWorkbook();legacy.collection[0].copies=3;legacy.collection[0].obtainedAt=1700000000000;cache.set('decimal-workbook-v1',JSON.stringify(legacy));Object.defineProperty(globalThis,'indexedDB',{configurable:true,value:new IDBFactory()});
 const sheet=await getOrCreateWorksheet(4,true),result=await redeemWorksheet(sheet.id,worksheetCode(sheet),()=>0),book=loadWorkbook();assert.equal(result.hero.id,'hero-1-1');assert.equal(result.copies,1);assert.deepEqual(book.collection[0],legacy.collection[0]);assert.equal(book.selectedHero,'hero-1-0');assert.equal(book.sheets.find(s=>s.id===previous.id)!.claimedHero,'hero-1-0');assert.equal(book.collection.length,2);
});
test('저장이 실패하면 지급도 완료 처리도 하지 않으며 다시 시도할 수 있다',async()=>{
 const s=await getOrCreateWorksheet(4,true);failStorage=true;await assert.rejects(redeemWorksheet(s.id,worksheetCode(s)),/저장 공간/);assert.equal(loadWorkbook().collection.length,0);assert.equal(loadWorkbook().sheets[0].claimedHero,null);failStorage=false;await redeemWorksheet(s.id,worksheetCode(s));assert.equal(loadWorkbook().collection.length,1);
});
test('레벨 확률은 합계 100이고 고레벨일수록 감소하며 30종 모두 뽑힐 수 있다',()=>{
 assert.equal(HERO_LEVEL_CHANCES.reduce((a,b)=>a+b,0),100);let cumulative=0;const found=new Set<string>();for(let lv=1;lv<=10;lv++){if(lv>1)assert.ok(HERO_LEVEL_CHANCES[lv-1]<HERO_LEVEL_CHANCES[lv-2]);const midpoint=(cumulative+HERO_LEVEL_CHANCES[lv-1]/2)/100;for(let v=0;v<3;v++){let calls=0;const h=drawWorksheetHero(()=>calls++===0?midpoint:(v+.1)/3);assert.equal(h.level,lv);found.add(h.id);}cumulative+=HERO_LEVEL_CHANCES[lv-1];}assert.equal(found.size,30);
});
test('출력은 개념·계산 20문항과 암호 지도를 한 쪽에 포함하며 암호 정답을 인쇄하지 않는다',()=>{
 const s={...generateWorksheet(loadLearning(),4,'print-test',1700000000000,rng()),codeHash:'a'.repeat(64)},html=worksheetPages(s),pages=html.split('<section class="ws-sheet"').slice(1);
 assert.equal(pages.length,1);assert.ok(pages[0].includes('1 / 1'));
 assert.equal((html.match(/data-question=/g)||[]).length,20);assert.equal((html.match(/class="ws-equation"/g)||[]).length,10);
 assert.equal((html.match(/class="ws-concept-text"/g)||[]).length,10);assert.ok(!/\b\d+\.\d{3}\b/.test(html));
 assert.equal((html.match(/<i>→<\/i><strong>/g)||[]).length,s.decoder.length);
 assert.equal((html.match(/class="ws-cipher-group"/g)||[]).length,6);assert.ok(!html.includes(worksheetCode(s)));assert.ok(html.includes('20번'));assert.ok(html.includes('알파벳'));
});
test('PDF의 개념 유형 13종을 독립적으로 풀 수 있고 위조된 도표와 세 자리 문항은 거부한다',()=>{
 const examples:[WorksheetQuestion['type'],number[],number][]=[
  ['concept-compose',[2,4,7],2470],['concept-fraction',[3,42,100],3420],['concept-grid',[63],630],
  ['concept-numberline',[1200,10,7],1270],['concept-place',[4370,100],300],['concept-scale',[8000,1,100],80],
  ['concept-compare',[1250,1200,1190],1250],['concept-cards',[2,4,7,0],2470],['concept-missing',[4260,1830,1,1],1830],
  ['concept-units',[370,10],37000],['concept-story',[2760,1380,1530],2610],['concept-read',[4090],4090],['concept-inequality',[6,6320,0],3000]
 ];
 for(const [type,data,result] of examples){const q:WorksheetQuestion={a:result,b:0,operation:'+',digits:2,kind:type!,context:'concept',type,data};assert.ok(validQuestion(q),type);assert.equal(questionAnswer(q),result);assert.equal(validQuestion({...q,a:result+10}),false);}
 for(const type of CONCEPT_KINDS)for(let seed=1;seed<=6;seed++)assert.ok(validQuestion(makeQuestion(type,new Set(),rng(seed),6)),type);
 const q:WorksheetQuestion={a:1234,b:120,operation:'-',digits:2,kind:'sub-2-basic',context:'money'};assert.equal(validQuestion(q),false);assert.equal(classify(q),null);
});
test('예전 세 자리 오답 기록을 두 자리 유형으로 합치고 수집 목록은 보존한다',async()=>{
 cache.set('decimal-learning-v1',JSON.stringify({version:1,counts:{'sub-3-chain':{wrong:2,help:1,correct:0},'sub-2-chain':{wrong:1,help:0,correct:1}},seen:{}}));
 const profile=loadLearning();assert.deepEqual(profile.counts['sub-2-chain'],{wrong:3,help:1,correct:1});assert.ok(Object.keys(profile.counts).every(k=>!/-3-/.test(k)));
 recordKindLearning('concept-grid','wrong','grid-test');const sheet=await getOrCreateWorksheet(4,true);assert.ok(!sheet.focus.includes('concept-grid'));assert.ok(sheet.questions.every(q=>q.type!=='concept-grid'));assert.equal(loadLearning().counts['concept-grid']!.wrong,1);
 const code=worksheetCode(sheet);await redeemWorksheet(sheet.id,code,()=>0);const book=loadWorkbook(),legacy={...sheet,id:'legacy-sheet',questions:sheet.questions.map((q,i)=>i?q:{a:4231,b:100,operation:'-',digits:3,kind:'sub-3-basic',context:'money'})};
 book.sheets.push(legacy as typeof sheet);cache.set('decimal-workbook-v1',JSON.stringify(book));assert.equal(loadWorkbook().sheets.length,1);assert.equal(loadWorkbook().collection.length,1);
});
test('손상된 학습지 하나를 제외하고 기존 수집 목록과 다른 학습지를 보존한다',async()=>{const a=await getOrCreateWorksheet(4,true),b=await getOrCreateWorksheet(4,true);await redeemWorksheet(b.id,worksheetCode(b),()=>0);const raw=loadWorkbook();(raw.sheets[0].decoder as unknown[])[0]=null;cache.set('decimal-workbook-v1',JSON.stringify(raw));assert.equal(loadWorkbook().sheets.length,1);assert.equal(loadWorkbook().collection.length,1);assert.equal(loadWorkbook().sheets[0].id,b.id);const invalid={...b,questions:b.questions.map((q,i)=>i? q:{...q,operation:'x',kind:null})};assert.equal(validWorksheet(invalid as typeof b),false);assert.ok(a.id!==b.id);});
test('새게임으로 모험을 초기화해도 학습 기록과 수집 몬스터를 유지한다',async()=>{recordLearning({a:4000,b:1280,operation:'-',digits:2,context:'money'},'wrong');const s=await getOrCreateWorksheet(4,true);await redeemWorksheet(s.id,worksheetCode(s),()=>0);const book=JSON.stringify(loadWorkbook()),learning=JSON.stringify(loadLearning());writeSave(newAdventure(loadSave()));assert.equal(JSON.stringify(loadWorkbook()),book);assert.equal(JSON.stringify(loadLearning()),learning);});
