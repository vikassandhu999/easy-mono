/**
 * Assert-style checks for the weight_g resolver logic used in amount-sheet.tsx.
 *
 * Run directly: npx tsx weight-resolver.assert.ts
 * No test framework required.
 */

// ---------------------------------------------------------------------------
// Inline resolver (mirrors the logic in amount-sheet.tsx exactly)
// ---------------------------------------------------------------------------

function resolveServingWeight(weightG: number | null, amount: number | null, count: number): number | null {
  if (weightG == null || amount == null || amount === 0) {
    return null;
  }
  return (weightG / amount) * count;
}

// ---------------------------------------------------------------------------
// Assertions
// ---------------------------------------------------------------------------

function assert(condition: boolean, message: string): void {
  if (!condition) {
    throw new Error(`FAIL: ${message}`);
  }
  console.log(`PASS: ${message}`);
}

function assertNullish(value: unknown, message: string): void {
  assert(value == null, message);
}

function assertClose(actual: number | null, expected: number, message: string, tolerance = 0.001): void {
  assert(actual !== null && Math.abs(actual - expected) < tolerance, `${message} (got ${actual}, expected ${expected})`);
}

// ---------------------------------------------------------------------------
// Test cases
// ---------------------------------------------------------------------------

function demo(): void {
  // 1. Basic serving: 1 cup = 240g, count=1 → 240g
  assertClose(resolveServingWeight(240, 1, 1), 240, '1 cup (240g) × 1 = 240g');

  // 2. Scaled serving: 1 cup = 240g, count=2 → 480g
  assertClose(resolveServingWeight(240, 1, 2), 480, '1 cup (240g) × 2 = 480g');

  // 3. Fractional count: 100g per 1 serving, count=0.5 → 50g
  assertClose(resolveServingWeight(100, 1, 0.5), 50, '100g × 0.5 = 50g');

  // 4. Serving has non-1 amount: 3 cookies = 45g, count=6 → 90g
  assertClose(resolveServingWeight(45, 3, 6), 90, '3 cookies=45g, count=6 → 90g');

  // 5. Null weight_g → null
  assertNullish(resolveServingWeight(null, 1, 1), 'null weightG → null');

  // 6. Null amount → null
  assertNullish(resolveServingWeight(100, null, 1), 'null amount → null');

  // 7. Zero amount → null (div-by-zero guard)
  assertNullish(resolveServingWeight(100, 0, 1), 'zero amount → null');

  // 8. Zero count → returns 0 (valid: user entered 0)
  assertClose(resolveServingWeight(100, 1, 0), 0, 'zero count → 0g');

  console.log('\nAll assertions passed.');
}

demo();
