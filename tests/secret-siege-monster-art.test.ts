import assert from 'node:assert/strict';
import test from 'node:test';
import {heroSpriteSheet} from '../src/hero-sprite';
import {SIEGE_MONSTER_ART,siegeMonsterArt,siegeMonsterArtTextures,siegeMonsterMotion} from '../src/secret-siege-monster-art';

test('defending monsters reuse complete audited existing illustrations and load with their stage tier',()=>{
 for(const art of Object.values(SIEGE_MONSTER_ART)){
  const sheet=heroSpriteSheet(art.texture);
  assert.equal(sheet.rows[art.row].length,4);
  assert.ok(art.height>0&&art.stride>0);
 }
 assert.equal(siegeMonsterArtTextures(1).length,1);
 assert.equal(siegeMonsterArtTextures(4).length,2);
 assert.equal(siegeMonsterArtTextures(7).length,3);
 assert.deepEqual(siegeMonsterArt('unknown'),SIEGE_MONSTER_ART.imp);
});

test('a castle spawn starts at the first walk frame and travelled distance drives four poses',()=>{
 const monster={distance:950,attacking:false,cooldown:1.5};
 assert.deepEqual(siegeMonsterMotion(monster,1,80),{frame:0,lunge:0});
 assert.deepEqual([950,930,910,890].map(distance=>siegeMonsterMotion({...monster,distance},99,80).frame),[0,1,2,3]);
 assert.deepEqual(siegeMonsterMotion({...monster,distance:870},50,80),{frame:0,lunge:0});
});

test('only a real monster shot produces a short lunge, with no wall-clock or pause dependency',()=>{
 const monster={distance:600,attacking:true,cooldown:1.5,lastShot:10};
 assert.deepEqual(siegeMonsterMotion(monster,10),{frame:0,lunge:0});
 const active=siegeMonsterMotion(monster,10.3);assert.ok(active.lunge>0&&active.lunge<=3);
 assert.deepEqual(siegeMonsterMotion(monster,10.3),active);
 assert.deepEqual(siegeMonsterMotion(monster,11),{frame:0,lunge:0});
 assert.deepEqual(siegeMonsterMotion({...monster,lastShot:undefined},10),{frame:0,lunge:0});
 assert.deepEqual(siegeMonsterMotion(monster,10.3,70,true),{frame:0,lunge:0});
});
