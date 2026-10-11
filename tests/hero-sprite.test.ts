import test from 'node:test';
import assert from 'node:assert/strict';
import {artURL} from '../src/art';
import {HERO_SPRITE_CELL,heroSpriteSheet,heroSpriteViewport,heroSpriteHTML,drawHeroSpriteAtlas} from '../src/hero-sprite';

const sheets=[...Array.from({length:10},(_,i)=>`heroes-level-${i+1}-v1`),'worksheet-heroes-v1'];
const epsilon=1e-8;

test('all eleven hero sheets describe twelve complete, bounded frame masks',()=>{
 let count=0;
 for(const name of sheets){
  const sheet=heroSpriteSheet(name);
  assert.equal(sheet.width,768);assert.equal(sheet.height,512);assert.equal(sheet.rows.length,3);
  for(const row of sheet.rows){
   assert.equal(row.length,4);
   for(const frame of row){
    count++;
    for(const value of [frame.x,frame.y,frame.width,frame.height])assert.ok(Number.isInteger(value));
    assert.ok(frame.x>=0&&frame.y>=0&&frame.width>0&&frame.height>0);
    assert.ok(frame.x+frame.width<=sheet.width&&frame.y+frame.height<=sheet.height);
    if(frame.polygon){
     assert.ok(frame.polygon.length>=3);
     for(const point of frame.polygon){
      assert.equal(point.length,2);const [x,y]=point;
      assert.ok(Number.isInteger(x)&&Number.isInteger(y));
      assert.ok(x>=frame.x&&x<=frame.x+frame.width&&y>=frame.y&&y<=frame.y+frame.height);
     }
    }
   }
  }
 }
 assert.equal(count,132);
 assert.throws(()=>heroSpriteSheet('missing-sheet'),/Unknown hero sprite sheet/);
 assert.throws(()=>heroSpriteViewport(sheets[0],3),/Unknown hero sprite row/);
});

test('one uniform viewport contains every pose without changing its proportions or relative movement',()=>{
 for(const name of sheets)for(let row=0;row<3;row++){
  const sheet=heroSpriteSheet(name),viewport=heroSpriteViewport(name,row);
  assert.ok(Number.isFinite(viewport.scale)&&viewport.scale>0);
  const mapped=sheet.rows[row].map((frame,pose)=>({
   x:(frame.x-pose*viewport.column+viewport.x)*viewport.scale,
   y:(frame.y+viewport.y)*viewport.scale,
   width:frame.width*viewport.scale,height:frame.height*viewport.scale,
  }));
  mapped.forEach((frame,pose)=>{
   assert.ok(frame.x>0&&frame.y>0);
   assert.ok(frame.x+frame.width<HERO_SPRITE_CELL+epsilon&&frame.y+frame.height<HERO_SPRITE_CELL+epsilon);
   assert.ok(Math.abs(frame.width/frame.height-sheet.rows[row][pose].width/sheet.rows[row][pose].height)<epsilon);
   const original=sheet.rows[row][pose],first=sheet.rows[row][0];
   assert.ok(Math.abs(frame.x-mapped[0].x-(original.x-pose*viewport.column-first.x)*viewport.scale)<epsilon);
   assert.ok(Math.abs(frame.y-mapped[0].y-(original.y-first.y)*viewport.scale)<epsilon);
  });
 }
});

test('portraits reference isolated SVG masks and retain all four animation poses with unique IDs',()=>{
 const name='worksheet-heroes-v1',staticHTML=heroSpriteHTML(name,1,'ws-guide'),animatedHTML=heroSpriteHTML(name,1,'collection-art',true);
 assert.equal((staticHTML.match(/<g class="hero-sprite-frame"/g)??[]).length,1);
 assert.equal((animatedHTML.match(/<g class="hero-sprite-frame"/g)??[]).length,4);
 assert.doesNotMatch(staticHTML,/hero-sprite-animated/);assert.match(animatedHTML,/hero-sprite-animated/);
 assert.match(animatedHTML,/viewBox="0 0 224 224"/);
 assert.ok(animatedHTML.includes(`href="${artURL(name)}"`));
 assert.ok(animatedHTML.includes('data-hero-row="1"'));
 const ids=[...staticHTML.matchAll(/<clipPath id="([^"]+)"/g),...animatedHTML.matchAll(/<clipPath id="([^"]+)"/g)].map(match=>match[1]);
 assert.equal(ids.length,5);assert.equal(new Set(ids).size,5);
 const references=[...staticHTML.matchAll(/clip-path="url\(#([^)]+)\)"/g),...animatedHTML.matchAll(/clip-path="url\(#([^)]+)\)"/g)].map(match=>match[1]);
 assert.deepEqual(references,ids);
 for(let pose=0;pose<4;pose++)assert.ok(animatedHTML.includes(`--hero-frame:${pose}`));
 for(const match of animatedHTML.matchAll(/transform="matrix\(([^)]+)\)"/g)){
  const [a,b,c,d]=match[1].split(' ').map(Number);assert.equal(a,d);assert.equal(b,0);assert.equal(c,0);
 }
});

test('level six crops cross the old grid boundaries while separating the dragon and golem masks',()=>{
 const sheet=heroSpriteSheet('heroes-level-6-v1'),dragon=sheet.rows[1][1],golem=sheet.rows[2][1];
 assert.ok(dragon.x<sheet.width/4);
 assert.ok(dragon.y<sheet.height/3);
 assert.ok(golem.y<sheet.height*2/3);
 assert.ok(dragon.y+dragon.height>golem.y);
 assert.ok(dragon.polygon&&dragon.polygon.length>4);
 assert.ok(golem.polygon&&golem.polygon.length>4);
});

test('the cached canvas atlas draws every masked pose inside its own square and restores drawing state',()=>{
 type Matrix=[number,number,number,number,number,number];
 type Rect=[number,number,number,number];
 for(const name of sheets){
  let matrix:Matrix=[1,0,0,1,0,0],rect:Rect|null=null,pathCommands=0,clips=0,saves=0,restores=0;
  const stack:{matrix:Matrix;rect:Rect|null}[]=[],draws:{matrix:Matrix;rect:Rect;args:unknown[]}[]=[],clears:Rect[]=[];
  const context={
   clearRect:(...args:Rect)=>clears.push(args),
   save:()=>{saves++;stack.push({matrix:[...matrix],rect});},
   restore:()=>{restores++;const saved=stack.pop()!;matrix=saved.matrix;rect=saved.rect;},
   translate:(x:number,y:number)=>{matrix[4]+=matrix[0]*x+matrix[2]*y;matrix[5]+=matrix[1]*x+matrix[3]*y;},
   scale:(x:number,y:number)=>{matrix[0]*=x;matrix[1]*=x;matrix[2]*=y;matrix[3]*=y;},
   beginPath:()=>{pathCommands=0;},rect:(...args:Rect)=>{rect=args;pathCommands++;},
   moveTo:()=>{pathCommands++;},lineTo:()=>{pathCommands++;},closePath:()=>{pathCommands++;},
   clip:()=>{assert.ok(pathCommands>0);clips++;},
   drawImage:(...args:unknown[])=>{assert.ok(rect);draws.push({matrix:[...matrix],rect:rect!,args});},
  } as unknown as CanvasRenderingContext2D;
  const image={width:1536,height:1024} as HTMLImageElement;
  drawHeroSpriteAtlas(context,name,image);
  assert.deepEqual(clears,[[0,0,HERO_SPRITE_CELL*4,HERO_SPRITE_CELL*3]]);
  assert.equal(draws.length,12);assert.equal(saves,12);assert.equal(restores,12);assert.equal(stack.length,0);
  assert.deepEqual(matrix,[1,0,0,1,0,0]);
  assert.equal(clips,12+heroSpriteSheet(name).rows.flat().filter(frame=>frame.polygon).length);
  draws.forEach((draw,index)=>{
   const [a,b,c,d,tx,ty]=draw.matrix,[x,y,width,height]=draw.rect,column=index%4,row=Math.floor(index/4);
   assert.equal(a,d);assert.equal(b,0);assert.equal(c,0);
   assert.deepEqual(draw.args,[image,0,0,768,512]);
   assert.ok(x*a+tx>=column*HERO_SPRITE_CELL-epsilon&&y*d+ty>=row*HERO_SPRITE_CELL-epsilon);
   assert.ok((x+width)*a+tx<=(column+1)*HERO_SPRITE_CELL+epsilon&&(y+height)*d+ty<=(row+1)*HERO_SPRITE_CELL+epsilon);
  });
 }
});
