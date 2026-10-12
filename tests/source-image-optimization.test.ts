import assert from 'node:assert/strict';
import test from 'node:test';
import sharp from 'sharp';
import { optimizePng, pngChunks } from '../tools/optimize-source-images.mjs';

function chunk(type: string, data: Buffer): Buffer {
  const buffer = Buffer.alloc(data.length + 12);
  buffer.writeUInt32BE(data.length, 0);
  buffer.write(type, 4, 'ascii');
  data.copy(buffer, 8);
  let crc = 0xffffffff;
  for (const byte of buffer.subarray(4, buffer.length - 4)) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit++) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  buffer.writeUInt32BE((crc ^ 0xffffffff) >>> 0, buffer.length - 4);
  return buffer;
}

async function fixture(): Promise<Buffer> {
  const width = 32;
  const height = 24;
  const rgba = Buffer.alloc(width * height * 4);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    rgba[offset] = (offset * 7) % 256;
    rgba[offset + 1] = (offset * 13) % 256;
    rgba[offset + 2] = (offset * 23) % 256;
    rgba[offset + 3] = offset % 4 === 0 && offset % 8 === 0 ? 0 : 127;
  }
  const png = await sharp(rgba, { raw: { width, height, channels: 4 } })
    .png({ compressionLevel: 0, adaptiveFiltering: false })
    .toBuffer();
  const gamma = Buffer.alloc(4);
  gamma.writeUInt32BE(45455);
  return Buffer.concat([
    png.subarray(0, 8),
    pngChunks(png)[0].raw,
    chunk('sRGB', Buffer.from([0])),
    chunk('gAMA', gamma),
    chunk('tEXt', Buffer.from('Author\0Original artist')),
    chunk('caBX', Buffer.from('Original signed credentials')),
    ...pngChunks(png).slice(1).map(item => item.raw),
  ]);
}

test('lossless source compression preserves every RGBA value and colour metadata', async () => {
  const source = await fixture();
  const result = await optimizePng(source, { archiveCredentials: true });
  assert.ok(result.buffer.length < source.length);
  const originalPixels = await sharp(source).ensureAlpha().raw().toBuffer();
  const optimizedPixels = await sharp(result.buffer).ensureAlpha().raw().toBuffer();
  assert.deepEqual(optimizedPixels, originalPixels);
  const preserved = pngChunks(source).filter(item => !['IDAT', 'caBX'].includes(item.type));
  const optimized = pngChunks(result.buffer).filter(item => item.type !== 'IDAT');
  assert.deepEqual(optimized.map(item => item.raw), preserved.map(item => item.raw));
  assert.deepEqual(result.credentials.map(item => item.raw), pngChunks(source)
    .filter(item => item.type === 'caBX').map(item => item.raw));
  const repeated = await optimizePng(result.buffer);
  assert.deepEqual(repeated.buffer, result.buffer);
});

test('signed PNG compression requires explicit credential archival', async () => {
  await assert.rejects(optimizePng(await fixture()), /credentials must be archived/);
});

test('source compression rejects corrupt PNG chunks before modifying pixels', async () => {
  const corrupted = Buffer.from(await fixture());
  corrupted[29] ^= 1;
  await assert.rejects(optimizePng(corrupted, { archiveCredentials: true }), /checksum/);
});
