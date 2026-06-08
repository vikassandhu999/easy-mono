/**
 * Shared numeric parsers for planned-set fields.
 *
 * Kept outside components so every editor (quick form, scheme input, per-set
 * row, table) normalizes the same way — negatives clamp to 0, non-numeric
 * strings round-trip to `null`, empty strings are `null`.
 */

export function parseNonNegativeNumber(value: string): null | number {
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return null;
  }
  return Math.max(0, parsed);
}

export function parseNonNegativeInt(value: string): null | number {
  const parsed = parseNonNegativeNumber(value);
  return parsed == null ? null : Math.trunc(parsed);
}

export function parseOptionalNumber(value: null | string | undefined): null | number {
  if (value == null) {
    return null;
  }
  if (!value.trim()) {
    return null;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}
