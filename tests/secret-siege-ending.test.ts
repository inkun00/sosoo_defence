import test from 'node:test';
import assert from 'node:assert/strict';
import {SECRET_SIEGE_ENDING_CHAPTERS,secretSiegeWorldLight} from '../src/secret-siege-ending-state';

test('the restored world waits for the collapse, brightens smoothly, then stays bright',()=>{
 assert.equal(secretSiegeWorldLight(-1),0);assert.equal(secretSiegeWorldLight(0),0);assert.equal(secretSiegeWorldLight(1.6),0);
 let previous=0;for(let age=1.6;age<=6;age+=.1){const light=secretSiegeWorldLight(age);assert.ok(light>=previous&&light<=1);previous=light;}
 assert.equal(secretSiegeWorldLight(2.85),.5);assert.equal(secretSiegeWorldLight(4.1),1);assert.equal(secretSiegeWorldLight(99),1);
 assert.equal(secretSiegeWorldLight(NaN),0);assert.equal(secretSiegeWorldLight(Infinity),0);assert.equal(secretSiegeWorldLight(0,true),1);
});
test('the final chapter waits for player confirmation and tells the expedition epilogue',()=>{
 assert.equal(SECRET_SIEGE_ENDING_CHAPTERS.length,3);assert.equal(SECRET_SIEGE_ENDING_CHAPTERS.at(-1)!.duration,Infinity);
 const captions=SECRET_SIEGE_ENDING_CHAPTERS.map(chapter=>chapter.caption).join(' ');
 assert.match(captions,/악의 세력도 사라지고/);assert.match(captions,/다른 세상/);assert.match(captions,/왕국의 병사/);assert.match(captions,/원정대/);
});
