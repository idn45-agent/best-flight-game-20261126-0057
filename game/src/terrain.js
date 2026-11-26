// The islands of Langit Pos: terrain height, runways, sea, trees and houses.
// Everything here is a pure function of x and the mission seed, so the world a
// pilot sees is the same world the autopilot trained on.
import { terrainNoise, hash1 } from './random.js';

export function makeTerrain(mission) {
  const { seed, length } = mission;
  const runways = mission.runways;

  function rawHeight(x) {
    if (x < 0) x = 0;
    if (x > length) x = length;
    // Rolling land that sinks into the sea between islands.
    const n = terrainNoise(x, seed);
    let h = 6 + n * 58;
    // Long sea gaps: the middle of the route is open water.
    const sea = Math.sin((x / length) * Math.PI * 2.2 + seed % 7) * 0.5 + 0.5;
    if (sea > 0.62 && x > 1200 && x < length - 1200) h -= (sea - 0.62) * 260;
    return h;
  }

  function heightAt(x) {
    for (const r of runways) {
      const base = Math.max(8, rawHeight(r.x0));
      if (x >= r.x0 && x <= r.x1) return base;
      if (x > r.x0 - 700 && x < r.x0) {
        // Approach corridor: blend from raw hills down to the level strip.
        const u = (x - (r.x0 - 700)) / 700;
        const s = u * u * (3 - 2 * u);
        return rawHeight(x) + (base - rawHeight(x)) * s;
      }
      if (x > r.x1 && x < r.x1 + 60) {
        const u = (x - r.x1) / 60;
        return base + (rawHeight(x) - base) * u;
      }
    }
    return rawHeight(x);
  }

  function isSea(x) {
    return rawHeight(x) < 3 && !runways.some((r) => x >= r.x0 - 40 && x <= r.x1 + 40);
  }

  /** Deterministic trees: returns null, or {x, size, kind} for a tree at this slot. */
  function treeAt(slotX) {
    const h = hash1(Math.floor(slotX / 46) * 31 + seed);
    if (h < 0.45 || isSea(slotX)) return null;
    return { x: slotX, size: 9 + h * 14, kind: h > 0.8 ? 'palm' : 'pine' };
  }

  /** Houses cluster near each runway: returns a house or null for this slot. */
  function houseAt(slotX) {
    for (const r of runways) {
      const d = Math.min(Math.abs(slotX - r.x0), Math.abs(slotX - r.x1));
      if (d < 700) {
        const h = hash1(Math.floor(slotX / 90) * 17 + seed + 5);
        if (h > 0.45 && !isSea(slotX)) {
          return { x: slotX, w: 26 + h * 18, h: 16 + h * 12, roof: ['#b8543f', '#7a4a2b', '#4a6b8a'][Math.floor(h * 3) % 3] };
        }
      }
    }
    return null;
  }

  return { heightAt, isSea, treeAt, houseAt, length };
}
