import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';

// Bundle the production helper with only its stylesheet omitted. Asset URLs,
// account limits and generated accessible markup remain the real implementation.
const badges=build({entryPoints:[fileURLToPath(new URL('../src/account-level-badge.ts',import.meta.url))],bundle:true,write:false,platform:'node',format:'esm',target:'node22',loader:{'.css':'empty'}})
 .then(bundle=>import('data:text/javascript;base64,'+Buffer.from(bundle.outputFiles[0].text).toString('base64')) as Promise<typeof import('../src/account-level-badge')>);

test('account badge levels retain each actual level up to 50 and normalize invalid values',async()=>{
 const {badgeLevel}=await badges;
 for(let level=1;level<=50;level++)assert.equal(badgeLevel(level),level);
 for(const [value,expected] of [[0,1],[-20,1],[NaN,1],[Infinity,1],[16.9,16],[50.9,50],[100,50]])assert.equal(badgeLevel(value),expected);
});

test('each group of five account levels shares an increasingly ornate badge without extra assets',async()=>{
 const {badgeTier,accountBadgeURL,accountBadgeAssets}=await badges,assets=accountBadgeAssets();
 assert.equal(assets.length,10);assert.equal(new Set(assets.map(asset=>asset.url)).size,10);
 for(let level=1;level<=50;level++){
  const tier=Math.ceil(level/5);assert.equal(badgeTier(level),tier);
  assert.equal(accountBadgeURL(level),assets[tier-1].url);
  assert.match(accountBadgeURL(level),new RegExp(`account-badge-level-${tier}-v1\\.`));
 }
 assert.equal(badgeTier(5),1);assert.equal(badgeTier(6),2);
 assert.equal(badgeTier(45),9);assert.equal(badgeTier(46),10);assert.equal(badgeTier(50),10);
});

test('badges announce and visibly display the actual level instead of their shared art tier',async()=>{
 const {accountBadgeHTML}=await badges;
 for(const size of ['small','medium','large'] as const)for(const level of [1,5,6,27,46,49,50]){
  const html=accountBadgeHTML(level,size);
  assert.match(html,new RegExp(`data-account-level="${level}"`));
  assert.match(html,new RegExp(`data-account-badge-tier="${Math.ceil(level/5)}"`));
  assert.match(html,new RegExp(`alt="계정 레벨 ${level} 휘장"`));
  assert.match(html,new RegExp(`title="계정 레벨 ${level}"`));
  assert.match(html,new RegExp(`class="account-level-badge-number" aria-hidden="true">${level}</span>`));
  assert.equal(html.includes('account-level-badge-max'),level===50);
 }
});
