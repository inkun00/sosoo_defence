import test from 'node:test';
import assert from 'node:assert/strict';
import {heroGrowthPickerHTML} from '../src/multiplayer/hero-growth-picker';

test('growth picker offers only three heroes at the selected affordable level with cost and remainder',()=>{
 const html=heroGrowthPickerHTML(12,7);
 assert.equal((html.match(/data-hero="/g)??[]).length,3);
 assert.equal((html.match(/<option /g)??[]).length,10);
 assert.match(html,/data-level="7"/);assert.match(html,/성장량 12 · Lv\.7 영웅 1명 비용 7 · 같은 레벨 최대 1명/);
 assert.match(html,/성장량 5이 남아요/);assert.match(html,/Lv\.1 최대 12명 \/ Lv\.10 최대 1명/);
 for(const variant of [0,1,2])assert.ok(html.includes('data-hero="hero-7-'+variant+'"'));
 assert.doesNotMatch(html,/worksheet-heroes-v1|비축 ▶/);
});

test('the selected level clamps to remaining growth after summoning while low-level quantities remain available',()=>{
 const html=heroGrowthPickerHTML(3,7);
 assert.equal((html.match(/<option /g)??[]).length,3);assert.match(html,/data-level="3"/);
 assert.match(html,/성장량 0이 남아요/);assert.match(html,/Lv\.1 최대 3명 \/ Lv\.3 최대 1명/);
 assert.ok(html.includes('data-hero="hero-3-0"'));
});

test('exhausted growth disables all summon choices and a zero-growth catalogue can still browse ten levels',()=>{
 const empty=heroGrowthPickerHTML(0,10);assert.match(empty,/성장량을 모두 사용했어요/);
 assert.equal((empty.match(/data-hero="[^"]+" disabled/g)??[]).length,3);assert.equal((empty.match(/<option /g)??[]).length,1);
 const book=heroGrowthPickerHTML(0,10,true);assert.equal((book.match(/<option /g)??[]).length,10);assert.equal((book.match(/data-hero="/g)??[]).length,3);
 assert.match(book,/data-level="10"/);assert.match(book,/준비 중 덧셈 정답마다 성장량 \+1/);
});
