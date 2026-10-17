import test from 'node:test';
import assert from 'node:assert/strict';
import packed from '../src/secret-siege-collapse-atlas.json';
import {decodeSpriteFrames} from '../src/sprite-frame-packing';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {siegeSpriteViewport,SIEGE_FORTIFICATIONS} from '../src/secret-siege-sprites';
import {heroSpriteSheet} from '../src/hero-sprite';

interface Frame{x:number;y:number;width:number;height:number;offsetX:number;offsetY:number;polygon?:number[][];}
const sheet=decodeSpriteFrames(packed) as {texture:string;sourceWidth:number;sourceHeight:number;canvasWidth:number;canvasHeight:number;groundX:number;groundY:number;reference:{canvasSize:number;scale:number;groundX:number;groundY:number};frames:Frame[]};

test('the corrupted citadel collapse has sixteen complete masks on one registered canvas',()=>{
 assert.equal(sheet.texture,'siege-corrupted-citadel-collapse-v1');assert.equal(sheet.frames.length,16);
 assert.ok(sheet.groundX>0&&sheet.groundX<sheet.canvasWidth);assert.ok(sheet.groundY>0&&sheet.groundY<sheet.canvasHeight);
 assert.equal(sheet.reference.canvasSize,224);assert.ok(sheet.reference.scale>0&&sheet.reference.scale<1);assert.ok(sheet.reference.groundX>0&&sheet.reference.groundX<224);assert.ok(sheet.reference.groundY>0&&sheet.reference.groundY<224);
 for(const frame of sheet.frames){
  for(const value of [frame.x,frame.y,frame.width,frame.height,frame.offsetX,frame.offsetY])assert.ok(Number.isInteger(value));
  assert.ok(frame.width>0&&frame.height>0&&frame.x>=0&&frame.y>=0);
  assert.ok(frame.x+frame.width<=sheet.sourceWidth&&frame.y+frame.height<=sheet.sourceHeight);
  assert.ok(frame.offsetX>=0&&frame.offsetY>=0&&frame.offsetX+frame.width<=sheet.canvasWidth&&frame.offsetY+frame.height<=sheet.canvasHeight);
  if(frame.polygon){assert.ok(frame.polygon.length>=3);for(const [x,y]of frame.polygon){assert.ok(Number.isInteger(x)&&Number.isInteger(y));assert.ok(x>=frame.x&&x<=frame.x+frame.width&&y>=frame.y&&y<=frame.y+frame.height);}}
 }
});

test('collapse crops read left to right across four rows and retain lower ruins at the original scale',()=>{
 for(let row=0;row<4;row++){
  const frames=sheet.frames.slice(row*4,row*4+4);
  for(let column=1;column<4;column++)assert.ok(frames[column].x>frames[column-1].x);
  if(row>0)assert.ok(Math.min(...frames.map(frame=>frame.y))>Math.min(...sheet.frames.slice((row-1)*4,row*4).map(frame=>frame.y)));
 }
 const first=sheet.frames[0],last=sheet.frames[15];
 assert.ok(last.offsetY>first.offsetY,'last ruins sit below the intact spire');
 assert.ok(last.height<first.height*.85,'last frame cannot restore the intact citadel');
 assert.ok(last.width/first.width>.85&&last.width/first.width<1.15,'the footprint retains its scale rather than enlarging the ruins');
});

test('the reproducible source audit retains every alpha pixel once and registers every masonry foot at the same ground',async()=>{
 const root=fileURLToPath(new URL('..',import.meta.url));
 const {stdout}=await promisify(execFile)(process.execPath,['tools/audit-siege-collapse.mjs','--check'],{cwd:root,timeout:60000});
 assert.match(stdout,/Audited 16 collapse frames/);
 const report=JSON.parse(await readFile(new URL('../test-results/secret-siege-art/collapse/frame-audit.json',import.meta.url),'utf8'));
 assert.equal(report.audit.length,16);assert.ok(report.visible>0);assert.ok(report.alphaSum>0);
 assert.equal(report.audit.reduce((sum:number,frame:{retained:number})=>sum+frame.retained,0),report.visible);
 assert.equal(report.audit.reduce((sum:number,frame:{alphaSum:number})=>sum+frame.alphaSum,0),report.alphaSum);
 for(const frame of report.audit){assert.equal(frame.lost,0);assert.equal(frame.adjacent,0);assert.equal(frame.registeredGroundY,sheet.groundY);}
 const initial=report.audit[0],last=report.audit.slice(13);
 const fort=heroSpriteSheet(SIEGE_FORTIFICATIONS),viewport=siegeSpriteViewport(SIEGE_FORTIFICATIONS,2),unit=768/fort.width,masonry=report.referenceMasonry;
 const near=(actual:number,expected:number)=>assert.ok(Math.abs(actual-expected)<1e-9);
 near(sheet.reference.scale*initial.structuralWidth,masonry.width*unit*viewport.scale);
 near(sheet.reference.groundX,(masonry.centerX*unit+viewport.x)*viewport.scale);
 near(sheet.reference.groundY,((masonry.groundY-fort.height*2/3)*unit+viewport.y)*viewport.scale);
 for(const frame of last)assert.ok(frame.structuralHeight<initial.structuralHeight*.7,'the final ruins remain low');
 assert.ok(Math.max(...last.map((frame:{structuralHeight:number})=>frame.structuralHeight))-Math.min(...last.map((frame:{structuralHeight:number})=>frame.structuralHeight))<initial.structuralHeight*.15,'settled ruins cannot bounce back to a standing castle');
});
