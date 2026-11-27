// Scoring feedback for Langit Pos v2: the combo multiplier, the speed bonus
// and the landing grade. One job: turn what the pilot did into points and a
// verdict, so clean fast flying pays visibly more than a cautious crawl.
import { SCORE } from './config.js';

export function createFeedback() {
  return {
    combo: 0,
    bestCombo: 0,
    fastRings: 0,
    centredRings: 0,
    ringsHit: 0,
    missed: 0,
  };
}

/**
 * Score one ring pass. A centred ring raises the combo (up to x4) and the
 * payout is multiplied by it; an off-centre ring pays flat but keeps the
 * combo alive. Passing a ring at 60 m/s or faster adds the speed bonus.
 * Returns { points, combo, centred, fast, label }.
 */
export function ringScored(fb, centred, speed) {
  if (centred) {
    fb.combo = Math.min(SCORE.comboMax, fb.combo + 1);
    fb.centredRings += 1;
  }
  fb.ringsHit += 1;
  if (fb.combo > fb.bestCombo) fb.bestCombo = fb.combo;
  const mult = Math.max(1, fb.combo);
  let points = (SCORE.ring + (centred ? SCORE.ringCentre : 0)) * mult;
  const fast = speed >= SCORE.speedBonusAt;
  if (fast) {
    points += SCORE.speedBonus;
    fb.fastRings += 1;
  }
  const bits = [];
  if (centred) bits.push(fb.combo > 1 ? `KOMBO x${fb.combo}` : 'tepat di tengah');
  if (fast) bits.push('CEPAT');
  return { points, combo: fb.combo, centred, fast, label: bits.join(' · ') };
}

/** Flying past a ring without flying through it breaks the combo. */
export function ringMissed(fb) {
  fb.combo = 0;
  fb.missed += 1;
}

/**
 * The landing grade, S to C, from the final score, how soft the touchdown
 * was and how much fuel is left. S is deliberately hard: it needs a big
 * score and a gentle landing with fuel to spare.
 */
export function landingGrade(score, soft, fuelFrac) {
  if (score >= SCORE.gradeS && soft && fuelFrac >= 0.25) return 'S';
  if (score >= SCORE.gradeA && soft) return 'A';
  if (score >= SCORE.gradeB) return 'B';
  return 'C';
}
