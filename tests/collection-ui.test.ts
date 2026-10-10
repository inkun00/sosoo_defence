import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionHTML,heroRevealHTML} from '../src/collection-ui';
import {HERO_LEVEL_CHANCES,worksheetHeroLevelChances,type Workbook} from '../src/worksheet-store';
import {HEROES,heroSpec,worksheetHeroSpec} from '../src/multiplayer/heroes';
import {artURL} from '../src/art';

const book:Workbook={version:1,sheets:[],selectedHero:'hero-1-0',collection:[
 {heroId:'hero-1-0',copies:2,obtainedAt:1},
 {heroId:'hero-8-2',copies:1,obtainedAt:2},
]};

test('출전 선택은 보유 특별 영웅만 표시하고 준비 후 원하는 때 수동 소환하도록 알린다',()=>{
 const filtered={...book,collection:book.collection.slice(0,1)};
 const html=collectionHTML(book.selectedHero,false,filtered,{mode:'deployment'});
 assert.match(html,/data-mode="deployment"/);
 assert.match(html,/data-collection-hero="hero-1-0"/);
 assert.doesNotMatch(html,/data-collection-hero="hero-8-2"/);
 assert.match(html,/이 영웅으로 출전 · 2회 획득/);
 assert.match(html,/2분 동안 문제를 푼 뒤, 3분 전투에서 원하는 때 직접 소환/);
 assert.match(html,/세 효과를 함께 발동/);
 assert.doesNotMatch(html,/collection-chances|영웅이 바로 등장/);
});

test('준비 후 수집 화면은 기존 선택과 비활성 상태를 유지하며 새 출전 규칙을 안내한다',()=>{
 const html=collectionHTML(book.selectedHero,true,book);
 assert.match(html,/data-mode="collection"/);
 assert.match(html,/2분 준비 후 3분 전투에서 원하는 때 직접 소환/);
 assert.match(html,/data-collection-hero="hero-1-0"[^>]+aria-pressed="true" disabled/);
 assert.match(html,/data-collection-hero="hero-8-2"[^>]+aria-pressed="false" disabled/);
 assert.match(html,/레벨별 영웅 등장 확률/);
 assert.doesNotMatch(html,/선택하면 바로 출전|영웅이 바로 등장/);
});

test('첫 수집의 레벨 확률은 기존 비율이며 새 학습지 세 장의 보상은 서로 다른 영웅 세 명으로 안내한다',()=>{
 const empty:Workbook={version:1,sheets:[],collection:[],selectedHero:null};
 const html=collectionHTML(null,false,empty);
 for(const [i,chance] of HERO_LEVEL_CHANCES.entries())assert.ok(html.includes('Lv.'+(i+1)+' · '+chance+'%'));
 assert.match(html,/아직 없는 특별 영웅 한 명을 얻어요/);
 assert.match(html,/서로 다른 학습지 세 장을 풀면 서로 다른 특별 영웅 세 명/);
 assert.match(html,/이미 수집한 영웅은 다시 나오지 않아요/);
 assert.doesNotMatch(html,/이미 가진 영웅을 얻으면|획득 횟수가 쌓여요/);
});

test('한 레벨을 모두 모으면 확률은 0이고 남은 레벨에 정규화한 확률을 두 자리까지 표시한다',()=>{
 const levelOne:Workbook={version:1,sheets:[],selectedHero:'hero-1-0',collection:HEROES.filter(h=>h.level===1).map(h=>({heroId:h.id,copies:1,obtainedAt:1}))};
 const html=collectionHTML(levelOne.selectedHero,false,levelOne);
 const probabilities=worksheetHeroLevelChances(levelOne.collection.map(c=>c.heroId));
 assert.match(html,/Lv\.1 · 0% · 수집 완료/);
 assert.match(html,/Lv\.2 · 40%/);
 assert.match(html,/Lv\.3 · 23\.33%/);
 for(const [i,chance] of probabilities.entries())assert.ok(html.includes('Lv.'+(i+1)+' · '+Number(chance.toFixed(2))+'%'));
 assert.match(html,/남아 있는 같은 레벨의 영웅은 같은 확률/);
});

test('일부만 수집한 레벨은 기존 레벨 비율을 유지하고 과거 획득 횟수도 보존해 표시한다',()=>{
 const html=collectionHTML(book.selectedHero,false,book);
 assert.match(html,/Lv\.1 · 40%/);
 assert.match(html,/Lv\.8 · 1\.5%/);
 assert.match(html,/대전 동료로 선택됨 · 2회 획득/);
 assert.doesNotMatch(html,/Lv\.1 · 0%/);
});

test('30종을 모두 모으면 보상 종료와 계속 가능한 학습을 안내하고 모든 확률을 0으로 표시한다',()=>{
 const full:Workbook={version:1,sheets:[],selectedHero:HEROES[0].id,collection:HEROES.map(h=>({heroId:h.id,copies:1,obtainedAt:1}))};
 const html=collectionHTML(full.selectedHero,false,full);
 assert.match(html,/영웅 30종을 모두 모았어요/);
 assert.match(html,/새로운 영웅 보상은 없지만 학습지는 계속 풀 수 있어요/);
 assert.match(html,/수집 30 \/ 30/);
 assert.equal((html.match(/ · 0% · 수집 완료/g)??[]).length,10);
 assert.doesNotMatch(html,/서로 다른 학습지 세 장을 풀면/);
});

test('새 보상 공개는 새로운 영웅 획득으로 표시하고 이전 획득 횟수도 호환된다',()=>{
 const hero=heroSpec('hero-1-0')!;
 assert.match(heroRevealHTML(hero,1),/새로운 영웅 획득 · 영구 보관/);
 assert.match(heroRevealHTML(hero,2),/2회 획득 · 영구 보관/);
});

test('기존 수집 ID를 전용 외모와 세 효과로 표시하고 일반 부화 영웅 이름은 표시하지 않는다',()=>{
 const html=collectionHTML(book.selectedHero,false,book),special=worksheetHeroSpec('hero-1-0')!;
 assert.ok(html.includes(special.name));assert.ok(html.includes(artURL('worksheet-heroes-v1')));
 assert.doesNotMatch(html,/이끼 전령|원시 분화왕/);
 assert.match(html,/data-effects="haste,vitality,tower-haste"/);
 assert.match(html,/반경 2칸 · 3효과 동시/);
 for(const text of ['아군 이동 속도 +10%','아군 최대 체력 +10%','내 포탑 공격 속도 +10%'])assert.ok(html.includes(text));
 const reveal=heroRevealHTML(heroSpec('hero-8-2')!,2),reward=worksheetHeroSpec('hero-8-2')!;
 assert.ok(reveal.includes(reward.name));assert.match(reveal,/data-effects="haste,shield,enemy-slow"/);
 assert.match(reveal,/공격 2회 방어 · 재충전 없음/);assert.match(reveal,/상대 포탑 공격 속도 −38%/);
});
