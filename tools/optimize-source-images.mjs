import sharp from 'sharp';
import { createHash } from 'node:crypto';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readFile, writeFile, mkdir, readdir, rename } from 'node:fs/promises';
import { resolve, dirname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { constants, deflateSync, inflateSync, gzipSync, gunzipSync } from 'node:zlib';

const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const credentialPath = join(root, 'docs', 'source-image-credentials.generated.json.gz');
const baselineRoot = join(root, 'test-results', 'source-images', 'baseline');
const reportPath = join(root, 'test-results', 'source-images', 'report.json');
const originalGit = '80c9359';
const runFile = promisify(execFile);
const sha256 = buffer => createHash('sha256').update(buffer).digest('hex');
const crcTable = Uint32Array.from({ length: 256 }, (_, index) => {
  let value = index;
  for (let bit = 0; bit < 8; bit++) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }
  return value >>> 0;
});

function crc32(buffer) {
  let value = 0xffffffff;
  for (const byte of buffer) value = crcTable[(value ^ byte) & 255] ^ (value >>> 8);
  return (value ^ 0xffffffff) >>> 0;
}

export function pngChunks(buffer) {
  if (!buffer.subarray(0, 8).equals(signature)) throw Error('Invalid PNG signature');
  const chunks = [];
  let offset = 8;
  while (offset < buffer.length) {
    if (offset + 12 > buffer.length) throw Error('Truncated PNG chunk');
    const size = buffer.readUInt32BE(offset);
    const end = offset + size + 12;
    if (end > buffer.length) throw Error('Truncated PNG chunk data');
    const type = buffer.toString('ascii', offset + 4, offset + 8);
    if (crc32(buffer.subarray(offset + 4, end - 4)) !== buffer.readUInt32BE(end - 4)) {
      throw Error(`Invalid PNG checksum: ${type}`);
    }
    chunks.push({ type, data: buffer.subarray(offset + 8, end - 4), raw: buffer.subarray(offset, end) });
    offset = end;
  }
  if (chunks[0]?.type !== 'IHDR' || chunks.at(-1)?.type !== 'IEND') {
    throw Error('Incomplete PNG image');
  }
  return chunks;
}

function chunk(type, data) {
  const output = Buffer.alloc(data.length + 12);
  output.writeUInt32BE(data.length, 0);
  output.write(type, 4, 'ascii');
  data.copy(output, 8);
  output.writeUInt32BE(crc32(output.subarray(4, output.length - 4)), output.length - 4);
  return output;
}

function imageData(chunks) {
  const buffers = chunks.filter(item => item.type === 'IDAT').map(item => item.data);
  if (buffers.length === 0) throw Error('PNG has no image data');
  return Buffer.concat(buffers);
}

function replaceImageData(chunks, compressed, removeCredentials) {
  const output = [signature];
  let written = false;
  for (const item of chunks) {
    if (item.type === 'caBX' && removeCredentials) continue;
    if (item.type === 'IDAT') {
      if (!written) output.push(chunk('IDAT', compressed));
      written = true;
    } else {
      output.push(item.raw);
    }
  }
  return Buffer.concat(output);
}

function compareMetadata(before, after, credentialsArchived) {
  const relevant = chunks => chunks
    .filter(item => item.type !== 'IDAT' && !(credentialsArchived && item.type === 'caBX'));
  const first = relevant(before);
  const second = relevant(after);
  if (first.length !== second.length || first.some((item, index) => !item.raw.equals(second[index].raw))) {
    throw Error('PNG metadata or frame information changed');
  }
}

export async function optimizePng(input, { archiveCredentials = false } = {}) {
  const beforeChunks = pngChunks(input);
  const credentials = beforeChunks.filter(item => item.type === 'caBX');
  if (credentials.length && !archiveCredentials) {
    throw Error('Signed PNG credentials must be archived before recompression');
  }
  const originalData = imageData(beforeChunks);
  const filtered = inflateSync(originalData);
  const baseline = replaceImageData(beforeChunks, originalData, archiveCredentials);
  let best = baseline;
  let method = 'original IDAT';
  const strategies = [
    ['zlib default', constants.Z_DEFAULT_STRATEGY],
    ['zlib filtered', constants.Z_FILTERED],
    ['zlib RLE', constants.Z_RLE],
  ];
  function compressScanlines(scanlines, prefix) {
    for (const [name, strategy] of strategies) {
      const compressed = deflateSync(scanlines, { level: 9, strategy });
      if (!inflateSync(compressed).equals(scanlines)) throw Error('PNG scanlines changed');
      const candidate = replaceImageData(beforeChunks, compressed, archiveCredentials);
      if (candidate.length < best.length) {
        best = candidate;
        method = `${prefix}${name}`;
      }
    }
  }
  compressScanlines(filtered, '');

  // Animated and interlaced images retain their original frame scanlines.
  const animated = beforeChunks.some(item => item.type === 'acTL' || item.type === 'fdAT');
  const interlaced = beforeChunks[0].data[12] !== 0;
  if (!animated && !interlaced) {
    const candidate = await sharp(input).png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      palette: false,
    }).toBuffer();
    const candidateChunks = pngChunks(candidate);
    // Retain the original IHDR and all colour/profile metadata byte for byte.
    if (beforeChunks[0].raw.equals(candidateChunks[0].raw)) {
      const adaptiveData = imageData(candidateChunks);
      const reconstructed = replaceImageData(beforeChunks, adaptiveData, archiveCredentials);
      if (reconstructed.length < best.length) {
        best = reconstructed;
        method = 'Sharp adaptive PNG';
      }
      compressScanlines(inflateSync(adaptiveData), 'Sharp adaptive + ');
    }
  }

  compareMetadata(beforeChunks, pngChunks(best), archiveCredentials);
  const options = { animated: true };
  const before = await sharp(input, options).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const after = await sharp(best, options).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  if (before.info.width !== after.info.width || before.info.height !== after.info.height ||
      before.info.channels !== after.info.channels || !before.data.equals(after.data)) {
    throw Error('PNG decoded RGBA pixels or dimensions changed');
  }
  return { buffer: best.length < input.length ? best : input, method, credentials };
}

async function pngFiles(directory) {
  const output = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) output.push(...await pngFiles(path));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith('.png')) output.push(path);
  }
  return output.sort();
}

async function readCredentials() {
  const bytes = await readFile(credentialPath).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (!bytes) return { version: 1, originalGit, credentials: {} };
  const archive = JSON.parse(gunzipSync(bytes).toString('utf8'));
  if (archive.version !== 1 || archive.originalGit !== originalGit || !archive.credentials) {
    throw Error('Unsupported source image credential archive');
  }
  return archive;
}

async function writeChanged(path, bytes) {
  const prior = await readFile(path).catch(error => {
    if (error.code === 'ENOENT') return null;
    throw error;
  });
  if (prior?.equals(bytes)) return;
  await mkdir(dirname(path), { recursive: true });
  const temporary = `${path}.tmp`;
  await writeFile(temporary, bytes);
  await rename(temporary, path);
}

async function archiveOriginal(path, input, credentials, archive) {
  const file = relative(root, path).replaceAll('\\', '/');
  const originalSha256 = sha256(input);
  const existing = archive.credentials[file];
  if (existing && existing.originalSha256 !== originalSha256) {
    throw Error(`Credential source already archived with a different hash: ${file}`);
  }
  if (!existing) {
    const { stdout: original } = await runFile('git', ['show', `${originalGit}:${file}`], {
      cwd: root,
      encoding: 'buffer',
      maxBuffer: 64 * 1024 * 1024,
    });
    if (sha256(original) !== originalSha256) {
      throw Error(`PNG does not match the original Git source: ${file}`);
    }
    archive.credentials[file] = {
      originalSha256,
      originalBytes: input.length,
      originalGit,
      caBXChunksBase64: credentials.map(item => item.raw.toString('base64')),
    };
  }
  await writeChanged(credentialPath, gzipSync(Buffer.from(`${JSON.stringify(archive)}\n`), { level: 9 }));
}

async function main() {
  const args = process.argv.slice(2);
  if (args.some(argument => argument !== '--write')) {
    throw Error('Usage: node tools/optimize-source-images.mjs [--write]');
  }
  const write = args.includes('--write');
  const archive = await readCredentials();
  const rows = [];
  for (const path of await pngFiles(join(root, 'public'))) {
    const input = await readFile(path);
    const result = await optimizePng(input, { archiveCredentials: true });
    const file = relative(root, path).replaceAll('\\', '/');
    if (write && result.buffer.length < input.length) {
      const backup = join(baselineRoot, file);
      const prior = await readFile(backup).catch(error => {
        if (error.code === 'ENOENT') return null;
        throw error;
      });
      if (!prior) await writeChanged(backup, input);
      if (result.credentials.length) await archiveOriginal(path, input, result.credentials, archive);
      if (!(await readFile(path)).equals(input)) throw Error(`Source changed during optimization: ${file}`);
      await writeChanged(path, result.buffer);
    }
    const row = {
      file,
      before: input.length,
      after: result.buffer.length,
      method: result.method,
      rgbaEqual: true,
      colorMetadataEqual: true,
      inputCredentialsPresent: result.credentials.length > 0,
      credentialsArchived: Boolean(archive.credentials[file]),
      originalBytes: archive.credentials[file]?.originalBytes ?? input.length,
      originalSha256: archive.credentials[file]?.originalSha256 ?? sha256(input),
      inputSha256: sha256(input),
      optimizedSha256: sha256(result.buffer),
    };
    rows.push(row);
    console.log(`${file}: ${row.before} -> ${row.after} (${row.method})`);
  }
  const report = {
    written: write,
    originalGit,
    count: rows.length,
    before: rows.reduce((total, row) => total + row.before, 0),
    after: rows.reduce((total, row) => total + row.after, 0),
    originalBytes: rows.reduce((total, row) => total + row.originalBytes, 0),
    changed: rows.filter(row => row.before !== row.after).length,
    credentialArchiveBytes: (await readFile(credentialPath).catch(() => Buffer.alloc(0))).length,
    rows,
  };
  await writeChanged(reportPath, Buffer.from(`${JSON.stringify(report, null, 2)}\n`));
  console.log(JSON.stringify({ ...report, rows: undefined }, null, 2));
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
