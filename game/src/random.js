// Deterministic randomness for Langit Pos: a small seeded generator and a 1-D
// value-noise field, so every mission's terrain is the same on every run.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Stable hash of one integer, in [0, 1): the same x always gives the same value. */
export function hash1(n) {
  let h = (n | 0) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h = Math.imul(h ^ (h >>> 16), 0x45d9f3b);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

/** Smooth 1-D value noise over x (metres), one octave of interpolation. */
export function noise1(x, seed) {
  const cell = 260;
  const i = Math.floor(x / cell);
  const f = x / cell - i;
  const a = hash1(i * 7919 + seed);
  const b = hash1((i + 1) * 7919 + seed);
  const s = f * f * (3 - 2 * f);
  return a + (b - a) * s;
}

/** Two-octave terrain noise: rolling hills with a little detail on top. */
export function terrainNoise(x, seed) {
  return noise1(x, seed) * 0.72 + noise1(x * 2.7, seed + 101) * 0.28;
}
