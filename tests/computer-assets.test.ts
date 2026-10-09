import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
import manifest from '../src/art-urls.json';

test('10명의 컴퓨터 상대는 투명한 4×3 시트와 서로 다른 12개 행동 프레임을 제공한다',async()=>{
 for(let level=1;level<=10;level++){
  const name=`cpu-opponent-${level}-v1`,path=manifest[name as keyof typeof manifest];assert.ok(path);
  const data=await readFile('web-public'+path),meta=await sharp(data).metadata();
  assert.equal(meta.hasAlpha,true);assert.equal(meta.width!%4,0);assert.equal(meta.height!%3,0);assert.ok(data.length<250000);
  const width=meta.width!/4,height=meta.height!/3,hashes:string[]=[];
  for(let frame=0;frame<12;frame++){
   const raw=await sharp(data).extract({left:frame%4*width,top:Math.floor(frame/4)*height,width,height}).ensureAlpha().raw().toBuffer();
   let opaque=0,transparent=0;for(let i=3;i<raw.length;i+=4){if(raw[i]>100)opaque++;if(raw[i]===0)transparent++;}
   assert.ok(opaque>width*height*.07,`${name}/${frame} is empty`);assert.ok(transparent>width*height*.04,`${name}/${frame} has no transparent padding`);
   hashes.push(createHash('sha256').update(raw).digest('hex'));
  }
  assert.equal(new Set(hashes).size,12,`${name} repeats frames`);
 }
});
