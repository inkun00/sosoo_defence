import test from 'node:test';
import assert from 'node:assert/strict';
import {collectionHTML} from '../src/collection-ui';
import type {Workbook} from '../src/worksheet-store';

const book:Workbook={version:1,sheets:[],selectedHero:'hero-1-0',collection:[
 {heroId:'hero-1-0',copies:2,obtainedAt:1},
 {heroId:'hero-8-2',copies:1,obtainedAt:2},
]};

test('출전 선택에서는 제공된 보유 영웅만 표시하며 카드가 즉시 출전하는 동작을 알린다',()=>{
 const filtered={...book,collection:book.collection.slice(0,1)};
 const html=collectionHTML(book.selectedHero,false,filtered,{mode:'deployment'});
 assert.match(html,/data-mode="deployment"/);
 assert.match(html,/data-collection-hero="hero-1-0"/);
 assert.doesNotMatch(html,/data-collection-hero="hero-8-2"/);
 assert.match(html,/이 영웅으로 출전 · 2회 획득/);
 assert.match(html,/두 수호자가 모두 준비됐을 때 영웅이 바로 등장/);
 assert.match(html,/출전 후에도 영구 보관/);
 assert.doesNotMatch(html,/collection-chances|원하는 때|한 번 소환/);
});

test('준비 후 수집 화면은 기존 선택과 비활성 상태를 유지하며 새 출전 규칙을 안내한다',()=>{
 const html=collectionHTML(book.selectedHero,true,book);
 assert.match(html,/data-mode="collection"/);
 assert.match(html,/대전을 시작할 때 동료 하나를 선택하면 바로 출전/);
 assert.match(html,/data-collection-hero="hero-1-0" aria-pressed="true" disabled/);
 assert.match(html,/data-collection-hero="hero-8-2" aria-pressed="false" disabled/);
 assert.match(html,/레벨별 영웅 등장 확률/);
 assert.doesNotMatch(html,/원하는 때|한 번 소환/);
});
