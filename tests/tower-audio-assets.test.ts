import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {TOWERS} from '../src/towers';
import manifest from '../src/tower-audio-manifest.json';
import report from '../public/licenses/tower-audio-v1.json';

test('every tower ships a distinct, short, licensed MP3 within the audio budget',async()=>{
 assert.deepEqual(Object.keys(manifest).sort(),TOWERS.map(t=>t.id).sort());
 assert.equal(new Set(Object.values(manifest).map(asset=>asset.url)).size,TOWERS.length);
 assert.ok(report.totalBytes<=80000,'the entire audio catalog should stay below80KB');
 let total=0;
 for(const type of TOWERS){
  const asset=manifest[type.id as keyof typeof manifest],clip=report.towers[type.id as keyof typeof report.towers];
  assert.match(asset.url,/^\/assets\/audio\/towers\/[a-z]+\.[a-f0-9]{12}\.mp3$/);
  const sourceLicenses=clip.sources.map(source=>report.sources[source as keyof typeof report.sources].license);
  assert.ok(sourceLicenses.every(license=>['CC0-1.0','CC-BY-3.0','CC-BY-4.0'].includes(license)));
  assert.equal(asset.license,clip.license);
  assert.deepEqual(asset.sources.map(source=>source.license),sourceLicenses);
  assert.ok(asset.duration>0&&asset.duration<=1.1);
  assert.ok(clip.decodedPeak<.97,'normalized encoded audio must not clip');
  assert.ok(clip.decodedRms>.025,'sample must contain audible signal');
  for(const source of clip.sources){const record=report.sources[source as keyof typeof report.sources];assert.ok(record.author&&record.title&&record.url&&record.licenseUrl&&record.modifications);}
  const [original,published]=await Promise.all([readFile(new URL(`../public/assets/audio/towers/${clip.filename}`,import.meta.url)),readFile(new URL(`../web-public${asset.url}`,import.meta.url))]);
  assert.deepEqual(original,published);
  assert.equal(published.length,asset.bytes);assert.equal(asset.bytes,clip.bytes);
  assert.equal(createHash('sha256').update(original).digest('hex'),clip.sha256);
  assert.ok(asset.url.includes(clip.sha256.slice(0,12)));
  total+=asset.bytes;
 }
 assert.equal(total,report.totalBytes);
 assert.equal(report.processing.rate,24000);assert.equal(report.processing.channels,1);assert.equal(report.processing.bitrate,64000);
});
