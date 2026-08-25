/**
 * Uniform random integer in [0, max) via the Web Crypto API with rejection
 * sampling, avoiding the modulo bias a naive `% max` would introduce — the
 * closest fairness guarantee achievable for winner selection without a
 * trusted server (see src/services/draws.ts).
 */
export function secureRandomInt(max: number): number {
  if (max <= 0) throw new Error("max must be positive");
  const bytesNeeded = Math.max(1, Math.ceil(Math.log2(max) / 8));
  const range = 256 ** bytesNeeded;
  const limit = range - (range % max);
  const bytes = new Uint8Array(bytesNeeded);
  let value: number;
  do {
    crypto.getRandomValues(bytes);
    value = bytes.reduce((acc, b) => acc * 256 + b, 0);
  } while (value >= limit);
  return value % max;
}
