import assert from 'node:assert/strict';
import test from 'node:test';
import { wallRecipeKey, wallRecipePool, type WallRecipe } from '../src/wall-recipes';

function carries([a, b]: WallRecipe) {
  const hundredths = Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 >= 10;
  const tenths = Math.floor(a / 100) % 10 + Math.floor(b / 100) % 10 + Number(hundredths) >= 10;
  return { hundredths, tenths, any: hundredths || tenths };
}

test('all stage banks contain distinct, exact addition triples within two-place decimal limits', () => {
  let checked = 0;
  for (let stage = 1; stage <= 11; stage++) {
    for (let group = 0; group < 3; group++) {
      const pool = wallRecipePool(stage, group);
      assert.ok(pool.length >= (stage <= 2 ? 20 : 100), `stage ${stage}, group ${group} needs enough variety`);
      assert.equal(new Set(pool.map(wallRecipeKey)).size, pool.length);
      for (const [a, b, c] of pool) {
        checked++;
        assert.equal(a + b, c);
        assert.equal(c - a, b);
        assert.equal(c - b, a);
        for (const value of [a, b, c]) {
          assert.ok(Number.isInteger(value) && value > 0 && value < 10000);
          assert.equal(value % 10, 0, 'all learning values stop at 0.01');
        }
        assert.notEqual(a % 1000, 0, 'first summand is a decimal fraction');
        assert.notEqual(b % 1000, 0, 'second summand is a decimal fraction');
      }
    }
  }
  assert.ok(checked > 10000, `checked ${checked} equations`);
});

test('early stages progress from small tenths to tenths carrying and aligned hundredths', () => {
  for (const stage of [1, 2]) for (const triple of wallRecipePool(stage)) {
    assert.equal(carries(triple).any, false);
    triple.forEach(value => { assert.equal(value % 100, 0); assert.ok(value < 1000); });
  }
  for (const triple of wallRecipePool(3)) {
    triple.forEach(value => assert.equal(value % 100, 0));
    assert.equal(carries(triple).tenths, true);
  }
  for (const triple of wallRecipePool(4)) {
    assert.equal(carries(triple).any, false);
    assert.notEqual(triple[0] % 100, 0);
    assert.notEqual(triple[1] % 100, 0);
  }
});

test('middle stages add single and chained carries while retaining hundredths', () => {
  for (const triple of wallRecipePool(5)) {
    const c = carries(triple);
    assert.equal(c.any, true);
    assert.equal(c.hundredths && c.tenths, false);
  }
  for (const triple of wallRecipePool(6)) assert.equal(carries(triple).hundredths, true);
  for (const triple of wallRecipePool(7, 0)) {
    const c = carries(triple); assert.equal(c.any, true); assert.equal(c.hundredths && c.tenths, false);
  }
  for (const triple of wallRecipePool(7, 1)) assert.deepEqual(carries(triple), { hundredths: true, tenths: true, any: true });
  assert.notDeepEqual(wallRecipePool(7, 0), wallRecipePool(7, 1));
  for (const triple of wallRecipePool(8)) {
    assert.ok(triple[0] >= 1000 && triple[1] >= 1000);
    assert.deepEqual(carries(triple), { hundredths: true, tenths: true, any: true });
  }
});

test('later addition produces zero columns and final practice varies the carry columns', () => {
  for (const stage of [9, 10, 11]) {
    const zeroGroup = stage === 9 ? 1 : 2;
    for (const triple of wallRecipePool(stage, zeroGroup)) {
      assert.equal(Math.floor(triple[2] / 100) % 10, 0);
      assert.deepEqual(carries(triple), { hundredths: true, tenths: true, any: true });
    }
    assert.ok(wallRecipePool(stage, zeroGroup).some(([, , c]) => c % 1000 === 0));
  }
  for (const stage of [10, 11]) {
    for (const triple of wallRecipePool(stage, 0)) assert.deepEqual(carries(triple), { hundredths: true, tenths: false, any: true });
    for (const triple of wallRecipePool(stage, 1)) assert.equal(carries(triple).tenths, true);
  }
});

test('recipe identity ignores slot order and pools are deterministic and immutable', () => {
  assert.equal(wallRecipeKey([100, 200, 300]), wallRecipeKey([300, 100, 200]));
  assert.equal(wallRecipeKey([100, 200, 300]), wallRecipeKey([200, 100, 300]));
  const pool = wallRecipePool(7, 1);
  assert.equal(wallRecipePool(7, 3), pool);
  assert.ok(Object.isFrozen(pool));
  assert.ok(Object.isFrozen(pool[0]));
  assert.deepEqual(wallRecipePool(12), wallRecipePool(11));
  assert.throws(() => wallRecipePool(0), RangeError);
  assert.throws(() => wallRecipePool(1.5), RangeError);
  assert.throws(() => wallRecipePool(1, -1), RangeError);
  assert.throws(() => wallRecipePool(1, NaN), RangeError);
});
