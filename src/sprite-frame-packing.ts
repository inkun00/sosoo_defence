const digits = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

/** Restore audited integer coordinates once, before existing renderers use them. */
export function decodePolygon(encoded: string): number[][] {
  const points: number[][] = [];
  let value = 0;
  let shift = 0;
  let x = 0;
  let y = 0;
  let isX = true;
  for (let index = 0; index < encoded.length; index++) {
    const digit = digits.indexOf(encoded[index]);
    if (digit < 0 || shift > 30) throw Error('Invalid packed sprite polygon');
    value |= (digit & 31) << shift;
    if (digit & 32) {
      shift += 5;
      continue;
    }
    const delta = value & 1 ? -(value >>> 1) : value >>> 1;
    if (isX) x += delta;
    else {
      y += delta;
      points.push([x, y]);
    }
    isX = !isX;
    value = 0;
    shift = 0;
  }
  if (shift || !isX) throw Error('Incomplete packed sprite polygon');
  return points;
}

export function decodeSpriteFrames(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(decodeSpriteFrames);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [
      key, key === 'polygon' ? decodePolygon(item) : decodeSpriteFrames(item),
    ]));
  }
  return value;
}
