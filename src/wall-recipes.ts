/** Values use the game's integer thousandths, so 230 means 0.23. */
export type WallRecipe = readonly [number, number, number];

const MAX_POOL_SIZE = 512;
const pools = new Map<string, readonly WallRecipe[]>();

/** Addition and its two reversed subtraction equations share one identity. */
export function wallRecipeKey(recipe: WallRecipe): string {
  return [...recipe].sort((a, b) => a - b).join(':');
}

function carry(a: number, b: number): { hundredths: boolean; tenths: boolean } {
  const hundredths = Math.floor(a / 10) % 10 + Math.floor(b / 10) % 10 >= 10;
  const tenths = Math.floor(a / 100) % 10 + Math.floor(b / 100) % 10 + Number(hundredths) >= 10;
  return { hundredths, tenths };
}

function borrowsThroughZero(a: number, c: number): boolean {
  // For example, 1.02 − 0.27 must borrow through the zero in the tenths place.
  return c % 1000 < 100 && a % 1000 >= 100 && c % 100 < a % 100;
}

/**
 * A deterministic bank of solvable triples at the stage's learning difficulty.
 * Each triple is [a, b, a + b], usable as a + b = c or c − a = b.
 * groupIndex advances the curriculum's alternating practice sets; the caller
 * chooses/shuffles entries and excludes recently used wallRecipeKey values.
 */
export function wallRecipePool(stageId: number, groupIndex = 0): readonly WallRecipe[] {
  if (!Number.isInteger(stageId) || stageId < 1 || !Number.isInteger(groupIndex) || groupIndex < 0) {
    throw new RangeError('Wall recipes require a positive stage and a non-negative practice group.');
  }
  const stage = Math.min(stageId, 11);
  const variant = stage === 7 || stage === 9 ? groupIndex % 2 : stage >= 10 ? groupIndex % 3 : 0;
  const cacheKey = `${stage}:${variant}`;
  const cached = pools.get(cacheKey);
  if (cached) return cached;

  const tenths = stage <= 4 || stage === 6 || stage === 8;
  const step = tenths ? 100 : 10;
  const maxOperand = stage <= 2 ? 800 : stage === 3 ? 2900 : stage <= 5 ? 3990 : 4990;
  const recipes: WallRecipe[] = [];

  for (let a = step; a <= maxOperand; a += step) {
    if (a % 1000 === 0 || (!tenths && a % 100 === 0)) continue;
    for (let b = a; b <= maxOperand; b += step) {
      const c = a + b;
      // Whole-number results such as 0.6 + 0.4 = 1.0 are useful practice too;
      // the two summands are always actual decimal fractions.
      if (c >= 10000 || b % 1000 === 0) continue;
      if (!tenths && b % 100 === 0) continue;
      const carries = carry(a, b);
      const anyCarry = carries.hundredths || carries.tenths;
      if (stage <= 2 && c >= 1000) continue;
      if (stage >= 3 && stage <= 5 && anyCarry) continue;
      if ((stage === 6 || stage === 8) && !carries.tenths) continue;
      if (stage === 7 && (variant === 0 ? anyCarry : !anyCarry)) continue;
      if (stage === 9 && (variant === 0 ? !anyCarry : !borrowsThroughZero(a, c))) continue;
      if (stage >= 10) {
        if (variant === 0 && (!carries.hundredths || carries.tenths)) continue;
        if (variant === 1 && !carries.tenths) continue;
        if (variant === 2 && !borrowsThroughZero(a, c)) continue;
      }
      recipes.push(Object.freeze([a, b, c]) as WallRecipe);
    }
  }

  // Spread a bounded bank across the whole numeric range instead of selecting
  // only its smallest operands. This keeps generation cheap during play.
  const sampled = recipes.length <= MAX_POOL_SIZE ? recipes : Array.from(
    { length: MAX_POOL_SIZE },
    (_, index) => recipes[Math.floor(index * (recipes.length - 1) / (MAX_POOL_SIZE - 1))],
  );
  const pool = Object.freeze(sampled);
  pools.set(cacheKey, pool);
  return pool;
}
