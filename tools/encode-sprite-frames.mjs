// Base64 VLQ encodes exact integer deltas, as used by source maps. The audited
// image sheets remain the source of truth; no polygon points are simplified.
const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

export function encodePolygon(points) {
  let encoded = '';
  let previousX = 0;
  let previousY = 0;
  for (const [x, y] of points) {
    for (const delta of [x - previousX, y - previousY]) {
      if (!Number.isInteger(delta) || Math.abs(delta) > 0x3fffffff) {
        throw Error('Sprite polygon deltas must be bounded integers');
      }
      let value = delta < 0 ? -delta * 2 + 1 : delta * 2;
      do {
        let digit = value & 31;
        value >>>= 5;
        if (value) digit |= 32;
        encoded += digits[digit];
      } while (value);
    }
    previousX = x;
    previousY = y;
  }
  return encoded;
}

export function packSpriteFrames(value) {
  if (Array.isArray(value)) return value.map(packSpriteFrames);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, key === 'polygon' ? encodePolygon(item) : packSpriteFrames(item),
    ]));
  }
  return value;
}
