import {test,beforeEach} from 'node:test';
import assert from 'node:assert/strict';
import {generateWorksheet,questionAnswer,worksheetCode,codeHash,validWorksheet,CIPHER_GROUPS} from '../src/worksheet';
import {loadLearning,recordLearning,classify,importLearningRecords,practiceWeight} from '../src/learning';
import {getOrCreateWorksheet,loadWorkbook,redeemWorksheet,drawWorksheetHero,HERO_LEVEL_CHANCES,selectWorksheetHero,ownedHeroIds} from '../src/worksheet-store';
import {worksheetPages} from '../src/worksheet-view';
import {newAdventure,loadSave,writeSave} from '../src/save';
const cache=new Map<string,string>();let failStorage=false;
Object.defineProperty(globalThis,'localStorage',{value:{getItem:(key:string)=>cache.get(key)??null,setItem:(key:string,v:string)=>{if(failStorage)throw Error('quota');cache.set(key,v);}},configurable:true});
beforeEach(()=>{cache.clear();failStorage=false;});
function rng(seed=19){return ()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};}
test('1~10단계 학습지는 20문항, 서로 다른 정답, 한 자리 자연수 부분을 지킨다',async()=>{
 for(let level=1;level<=10;level++)for(let seed=1;seed<=8;seed++){
  const generated=generateWorksheet(loadLearning(),level,'sheet-'+level+'-'+seed,1700000000000,rng(seed)),s={...generated,codeHash:await codeHash(generated.id,worksheetCode(generated))};
  assert.ok(validWorksheet(s));assert.equal(s.questions.length,20);assert.equal(new Set(s.questions.map(questionAnswer)).size,20);assert.equal(s.decoder.length,30);
  assert.deepEqual(s.groups,CIPHER_GROUPS);assert.deepEqual(s.groups.flat(),Array.from({length:20},(_,i)=>i));assert.match(worksheetCode(s),/^[A-Z]{6}$/);
  for(const q of s.questions){assert.ok([q.a,q.b,questionAnswer(q)].every(n=>Number.isInteger(n)&&n>=0&&n<10000));assert.equal(classify(q),q.kind);assert.ok(q.digits<= (level===1?1:level<4?2:3));if(q.digits===3)assert.equal(q.context,'money');}
 }
});
test('누적된 연속 받아내림 유형을 14문항 이상 연습하고 모든 정답이 암호에 기여한다',()=>{
 recordLearning({a:4000,b:1280,operation:'-',digits:2,context:'money'},'wrong');const p=loadLearning();assert.ok(p.counts['sub-2-chain']);
 const s=generateWorksheet(p,1,'practice-test',1700000000000,rng());assert.ok(s.questions.filter(q=>q.kind==='sub-2-chain').length>=14);
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
test('암호 오답에는 보상이 없고 정답·새로고침·중복 제출에 한 번만 지급한다',async()=>{
 const s=await getOrCreateWorksheet(4,true),code=worksheetCode(s),bad=(code==='AAAAAA'?'BBBBBB':'AAAAAA');await assert.rejects(redeemWorksheet(s.id,bad),/맞지/);assert.equal(loadWorkbook().collection.length,0);
 const result=await redeemWorksheet(s.id,code.toLowerCase(),()=>0);assert.equal(result.hero.id,'hero-1-0');assert.equal(loadWorkbook().sheets[0].claimedHero,result.hero.id);assert.equal(loadWorkbook().selectedHero,result.hero.id);assert.equal(loadLearning().counts[s.questions[0].kind]!.correct,s.questions.filter(q=>q.kind===s.questions[0].kind).length);
 await assert.rejects(redeemWorksheet(s.id,code),/이미/);assert.equal(loadWorkbook().collection[0].copies,1);
});
test('동시 암호 제출에서도 하나만 성공하고 여러 학습지의 몬스터를 선택할 수 있다',async()=>{
 const a=await getOrCreateWorksheet(4,true),outcomes=await Promise.allSettled([redeemWorksheet(a.id,worksheetCode(a),()=>0),redeemWorksheet(a.id,worksheetCode(a),()=>0)]);assert.equal(outcomes.filter(r=>r.status==='fulfilled').length,1);
 const b=await getOrCreateWorksheet(4,true);await redeemWorksheet(b.id,worksheetCode(b),()=>.999);assert.equal(loadWorkbook().collection.length,2);assert.equal(ownedHeroIds().length,2);await selectWorksheetHero('hero-10-2');assert.equal(loadWorkbook().selectedHero,'hero-10-2');await assert.rejects(selectWorksheetHero('hero-8-0'),/획득/);assert.equal(loadWorkbook().selectedHero,'hero-10-2');
 const c=await getOrCreateWorksheet(4,true);await redeemWorksheet(c.id,worksheetCode(c),()=>0);assert.equal(loadWorkbook().collection.find(h=>h.heroId==='hero-1-0')!.copies,2);
});
test('저장이 실패하면 지급도 완료 처리도 하지 않으며 다시 시도할 수 있다',async()=>{
 const s=await getOrCreateWorksheet(4,true);failStorage=true;await assert.rejects(redeemWorksheet(s.id,worksheetCode(s)),/저장 공간/);assert.equal(loadWorkbook().collection.length,0);assert.equal(loadWorkbook().sheets[0].claimedHero,null);failStorage=false;await redeemWorksheet(s.id,worksheetCode(s));assert.equal(loadWorkbook().collection.length,1);
});
test('레벨 확률은 합계 100이고 고레벨일수록 감소하며 30종 모두 뽑힐 수 있다',()=>{
 assert.equal(HERO_LEVEL_CHANCES.reduce((a,b)=>a+b,0),100);let cumulative=0;const found=new Set<string>();for(let lv=1;lv<=10;lv++){if(lv>1)assert.ok(HERO_LEVEL_CHANCES[lv-1]<HERO_LEVEL_CHANCES[lv-2]);const midpoint=(cumulative+HERO_LEVEL_CHANCES[lv-1]/2)/100;for(let v=0;v<3;v++){let calls=0;const h=drawWorksheetHero(()=>calls++===0?midpoint:(v+.1)/3);assert.equal(h.level,lv);found.add(h.id);}cumulative+=HERO_LEVEL_CHANCES[lv-1];}assert.equal(found.size,30);
});
test('출력은 10문항씩 두 쪽에 암호 지도를 포함하며 암호 정답을 인쇄하지 않는다',()=>{
 const s={...generateWorksheet(loadLearning(),4,'print-test',1700000000000,rng()),codeHash:'a'.repeat(64)},html=worksheetPages(s),pages=html.split('<section class="ws-sheet"').slice(1);
 assert.equal(pages.length,2);for(const [i,page] of pages.entries()){assert.equal((page.match(/data-question=/g)||[]).length,10);assert.ok(page.includes((i+1)+' / 2'));}
 assert.equal((html.match(/data-question=/g)||[]).length,20);for(const d of s.decoder)assert.ok(html.includes('<strong>'+d.rune+'</strong>'));
 assert.equal((html.match(/class="ws-cipher-group"/g)||[]).length,6);assert.ok(!html.includes(worksheetCode(s)));assert.ok(html.includes('20번'));assert.ok(html.includes('알파벳'));
});
test('손상된 학습지 하나를 제외하고 기존 수집 목록과 다른 학습지를 보존한다',async()=>{const a=await getOrCreateWorksheet(4,true),b=await getOrCreateWorksheet(4,true);await redeemWorksheet(b.id,worksheetCode(b),()=>0);const raw=loadWorkbook();(raw.sheets[0].decoder as unknown[])[0]=null;cache.set('decimal-workbook-v1',JSON.stringify(raw));assert.equal(loadWorkbook().sheets.length,1);assert.equal(loadWorkbook().collection.length,1);assert.equal(loadWorkbook().sheets[0].id,b.id);const invalid={...b,questions:b.questions.map((q,i)=>i? q:{...q,operation:'x',kind:null})};assert.equal(validWorksheet(invalid as typeof b),false);assert.ok(a.id!==b.id);});
test('새게임으로 모험을 초기화해도 학습 기록과 수집 몬스터를 유지한다',async()=>{recordLearning({a:4000,b:1280,operation:'-',digits:2,context:'money'},'wrong');const s=await getOrCreateWorksheet(4,true);await redeemWorksheet(s.id,worksheetCode(s),()=>0);const book=JSON.stringify(loadWorkbook()),learning=JSON.stringify(loadLearning());writeSave(newAdventure(loadSave()));assert.equal(JSON.stringify(loadWorkbook()),book);assert.equal(JSON.stringify(loadLearning()),learning);});
