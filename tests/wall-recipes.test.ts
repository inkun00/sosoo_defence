import assert from 'node:assert/strict';
import test from 'node:test';
import { wallRecipeKey, wallRecipePool, type WallRecipe } from '../src/wall-recipes';

function carries([a, b]: WallRecipe) {
  const hundredths = Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 >= 10;
  const tenths = Math.floor(a / 100) % 10 + Math.floor(b / 100) % 10 + Number(hundredths) >= 10;
  return { hundredths, tenths, any: hundredths || tenths };
}

function borrowing(minuend: number, subtrahend: number): boolean {
  // Decimal column subtraction, including the incoming borrow from hundredths.
  const hundredthsBorrow = Math.floor(minuend / 10) % 10 < Math.floor(subtrahend / 10) % 10;
  const tenthsBorrow = Math.floor(minuend / 100) % 10 - Number(hundredthsBorrow) < Math.floor(subtrahend / 100) % 10;
  return hundredthsBorrow || tenthsBorrow;
}

test('all stage banks contain distinct, exact addition and subtraction pairs within decimal limits', () => {
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
          assert.equal(value % 10, 0, '0.001 is reserved for money');
        }
        assert.notEqual(a % 1000, 0, 'first summand is a decimal fraction');
        assert.notEqual(b % 1000, 0, 'second summand is a decimal fraction');
      }
    }
  }
  assert.ok(checked > 10000, `checked ${checked} equations`);
});

test('early stages start with small tenths and extend to no-carry hundredths', () => {
  for (const stage of [1, 2, 3, 4, 5]) {
    for (const recipe of wallRecipePool(stage)) {
      assert.equal(carries(recipe).any, false);
      if (stage <= 4) recipe.forEach(value => assert.equal(value % 100, 0));
      if (stage <= 2) recipe.forEach(value => assert.ok(value < 1000));
      if (stage === 5) recipe.forEach(value => assert.notEqual(value % 100, 0));
    }
  }
});

test('stage six requires tenths carrying and stage seven alternates no-carry and carry sets', () => {
  for (const recipe of wallRecipePool(6)) {
    recipe.forEach(value => assert.equal(value % 100, 0));
    assert.equal(carries(recipe).tenths, true);
  }
  for (const recipe of wallRecipePool(7, 0)) assert.equal(carries(recipe).any, false);
  for (const recipe of wallRecipePool(7, 1)) assert.equal(carries(recipe).any, true);
  assert.notDeepEqual(wallRecipePool(7, 0), wallRecipePool(7, 1));
});

test('subtraction stages provide borrowing and borrowing through a decimal zero', () => {
  for (const stage of [8, 9]) {
    for (const recipe of wallRecipePool(stage, 0)) {
      const [a, , c] = recipe;
      assert.equal(borrowing(c, a), true);
      if (stage === 8) recipe.forEach(value => assert.equal(value % 100, 0));
    }
  }
  for (const [a, , c] of wallRecipePool(9, 1)) {
    assert.equal(Math.floor(c / 100) % 10, 0);
    assert.ok(c % 100 < a % 100);
    assert.ok(a % 1000 >= 100);
    assert.equal(borrowing(c, a), true);
  }
  assert.ok(wallRecipePool(8).some(([, , c]) => c % 1000 === 0), 'include tenths borrowing from a whole number');
  assert.ok(wallRecipePool(9, 1).some(([, , c]) => c % 1000 === 0), 'include borrowing through two decimal zeros');
});

test('final stages vary hundredths carry, units carry and through-zero subtraction', () => {
  for (const stage of [10, 11]) {
    for (const recipe of wallRecipePool(stage, 0)) {
      assert.equal(carries(recipe).hundredths, true);
      assert.equal(carries(recipe).tenths, false);
    }
    for (const recipe of wallRecipePool(stage, 1)) assert.equal(carries(recipe).tenths, true);
    for (const [a, , c] of wallRecipePool(stage, 2)) {
      assert.equal(Math.floor(c / 100) % 10, 0);
      assert.ok(c % 100 < a % 100);
      assert.equal(borrowing(c, a), true);
    }
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
