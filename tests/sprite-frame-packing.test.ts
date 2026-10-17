import test from 'node:test';
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {encodePolygon,packSpriteFrames} from '../tools/encode-sprite-frames.mjs';
import {decodePolygon,decodeSpriteFrames} from '../src/sprite-frame-packing';
import heroFrames from '../src/hero-sprite-frames.generated.json';
import computerFrames from '../src/multiplayer/computer-selection-frames.generated.json';

test('packed masks preserve signed deltas, large coordinates and every point', () => {
  const points = [[0,0],[768,512],[767,513],[4,0],[4,0],[-32,-64],[1024,576]];
  assert.deepEqual(decodePolygon(encodePolygon(points)), points);
  assert.deepEqual(decodePolygon(''), []);
  assert.throws(() => decodePolygon('?'), /Invalid packed sprite polygon/);
  assert.throws(() => decodePolygon('g'), /Incomplete packed sprite polygon/);
  assert.throws(() => decodePolygon('A'), /Incomplete packed sprite polygon/);
  assert.throws(() => encodePolygon([[.5,0]]), /bounded integers/);
});

test('all checked-in masks exactly match the original audited coordinates', () => {
  // Digests of the complete, decoded metadata before packing, including order.
  // Preserve the original 18,111 points while allowing separately audited siege art.
  const originalHeroFrames=Object.fromEntries(Object.entries(heroFrames).filter(([name])=>!name.startsWith('siege-')));
  const originals = [
    [originalHeroFrames,'8a05ca1463fd23cb8ac98e3ae6b9e22f0d9abdc6079bc3d8d9be431f5babfb5d'],
    [computerFrames,'1600696495b6003a815ddda61407b739ad13ad152aa1bfb08b1997f3f574e1d6'],
  ] as const;
  for (const [packed, expected] of originals) {
    const restored = decodeSpriteFrames(packed);
    const digest = createHash('sha256').update(JSON.stringify(restored)).digest('hex');
    assert.equal(digest, expected);
    assert.deepEqual(packSpriteFrames(restored), packed);
  }
  assert.deepEqual(packSpriteFrames(decodeSpriteFrames(heroFrames)),heroFrames);
});
