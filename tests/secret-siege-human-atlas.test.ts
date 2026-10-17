import assert from 'node:assert/strict';
import test from 'node:test';
import {SIEGE_HUMAN_CELL,SIEGE_HUMAN_GROUND,siegeHumanFramePlacement,siegeHumanFramePath,siegeHumanGround,siegeHumanDrawSize,type SiegeHumanAtlas} from '../src/secret-siege-human-atlas';

const atlas:SiegeHumanAtlas={texture:'human-test',sourceWidth:1600,sourceHeight:1200,scale:.48,frames:Array.from({length:16},(_,index)=>{
 const x=index%4*400,y=Math.floor(index/4)*300;
 return {x:x+40,y:y+15,width:320,height:275,anchorX:x+200+(index%3-1)*4,anchorY:y+276+(index%2)*3};
})};

test('all sixteen walk and attack poses keep their measured foot anchor on one common ground',()=>{
 atlas.frames.forEach((frame,index)=>{
  const pose=siegeHumanFramePlacement(atlas,index);
  assert.equal(pose.scale,atlas.scale);
  assert.ok(Math.abs(pose.x+frame.anchorX*pose.scale-SIEGE_HUMAN_GROUND.x)<1e-9);
  assert.ok(Math.abs(pose.y+frame.anchorY*pose.scale-SIEGE_HUMAN_GROUND.y)<1e-9);
 });
 assert.equal(SIEGE_HUMAN_GROUND.x,SIEGE_HUMAN_CELL*.5);
 assert.equal(SIEGE_HUMAN_GROUND.y,SIEGE_HUMAN_CELL*.92);
});

test('placement respects real rectangular source dimensions and keeps one scale across weapon reach',()=>{
 assert.notEqual(atlas.sourceWidth,atlas.sourceHeight);
 const walking=siegeHumanFramePlacement(atlas,0),attacking=siegeHumanFramePlacement(atlas,15);
 assert.equal(walking.scale,attacking.scale);
 assert.throws(()=>siegeHumanFramePlacement(atlas,16),RangeError);
 const ground=siegeHumanGround(atlas);
 assert.equal(ground.x,SIEGE_HUMAN_GROUND.x);assert.equal(ground.y,SIEGE_HUMAN_GROUND.y);
 assert.ok(ground.top>=0&&ground.top<ground.y);
});

test('portrait clips use the audited crop or polygon rather than a neighbouring atlas cell',()=>{
 assert.equal(siegeHumanFramePath(atlas.frames[0]),'M40 15L360 15L360 290L40 290Z');
 assert.equal(siegeHumanFramePath({...atlas.frames[0],polygon:[[42,20],[300,40],[220,270]]}),'M42 20L300 40L220 270Z');
});

test('large transparent atlas margins do not shrink the visible soldier',()=>{
 const desiredHeight=73,drawSize=siegeHumanDrawSize(atlas,desiredHeight),first=atlas.frames[0];
 const actualHeight=(first.anchorY-first.y)*atlas.scale*drawSize/SIEGE_HUMAN_CELL;
 assert.ok(Math.abs(actualHeight-desiredHeight)<1e-9);
 assert.equal(siegeHumanDrawSize({...atlas,scale:atlas.scale/2},desiredHeight),drawSize*2);
});
