// Screenshot scenes for Langit Pos v2: each one plays the real rules forward
// from a fresh world for a fixed number of steps, steered by a simple
// autopilot, so the frame is what a short game really looks like and the same
// seed always gives the same frame. v2 scores rings through the same combo
// feedback the live game uses, so the end screen shows a real grade.
import { STEP } from './config.js';
import { makeTerrain } from './terrain.js';
import { createPlane, stepPlane, stepRollout } from './plane.js';
import { windAt } from './missions.js';
import { PALETTES } from './config.js';
import { ringScored, ringMissed, landingGrade } from './feedback.js';

const SAMPLE = STEP;

/** Energy-aware autopilot: hold speed first, then chase the next target altitude. */
export function autopilot(g) {
  const p = g.plane;
  const dest = g.mission.runways[g.mission.runways.length - 1];
  const ground = g.terrain.heightAt(p.x);
  // Look ahead: never aim below the highest ground in the next 250 m.
  let groundAhead = ground;
  for (let dx = 0; dx <= 250; dx += 50) groundAhead = Math.max(groundAhead, g.terrain.heightAt(p.x + dx));
  let targetAlt;
  let targetSpeed = 55;
  if (g.nextRing < g.mission.rings.length) {
    targetAlt = g.mission.rings[g.nextRing].alt;
  } else if (p.x < dest.x0 - 2000) {
    // After the last ring: get down from cruise altitude early.
    targetAlt = 120;
  } else if (p.x < dest.x0 - 400) {
    // Long final: glide down toward the threshold.
    targetAlt = groundAhead + 12 + (dest.x0 - p.x) * 0.02;
    targetSpeed = 38;
  } else {
    // Short final: on the strip's doorstep, nearly on the ground; past the
    // threshold, aim just below it so the wheels actually touch.
    targetAlt = p.x >= dest.x0
      ? groundAhead - 2
      : groundAhead + 4 + Math.max(0, dest.x0 - p.x) * 0.02;
    targetSpeed = 38;
  }
  // Flare: just above the strip, hold the nose up and let her settle.
  const overStrip = p.x >= dest.x0 - 20 && p.x <= dest.x1;
  const closeToGround = p.alt - ground < 10;
  let desiredPitch;
  if (overStrip && closeToGround) {
    // Settle: nose slightly down, throttle back, touch the strip.
    desiredPitch = -6;
    targetSpeed = 30;
  } else {
    desiredPitch = Math.max(-18, Math.min(18, (targetAlt - p.alt) * 0.25));
    if (p.x > dest.x0 - 500 && p.alt - groundAhead < 22) desiredPitch = Math.min(desiredPitch, 2);
  }
  // Too slow to climb: level the wings and regain speed first.
  if (p.airborne && p.speed < 31) desiredPitch = Math.min(desiredPitch, 0);

  const input = { pitchUp: false, pitchDown: false, throttleUp: false, throttleDown: false };
  if (!p.airborne) {
    input.throttleUp = true;
    if (p.speed > 32) input.pitchUp = true;
  } else {
    if (p.pitch < desiredPitch - 1) input.pitchUp = true;
    else if (p.pitch > desiredPitch + 1) input.pitchDown = true;
    if (p.speed < targetSpeed - 3) input.throttleUp = true;
    else if (p.speed > targetSpeed + 3) input.throttleDown = true;
    if (overStrip && closeToGround) input.throttleDown = true;
  }
  // Gear and flaps for landing.
  if (p.x > dest.x0 - 1800 && p.alt < 160) p.gearDown = true;
  if (p.x > dest.x0 - 900) p.flaps = true;
  return input;
}

export function runAutopilot(g, maxSeconds, stopAt) {
  const steps = Math.floor(maxSeconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    g.time += SAMPLE;
    g.elapsed += SAMPLE;
    const p = g.plane;
    g.windNow = windAt(g.mission, p.x, g.time);
    let event = null;
    if (g.rollingOut) {
      if (stepRollout(p, SAMPLE, g.terrain)) event = 'stopped';
    } else {
      event = stepPlane(p, SAMPLE, autopilot(g), g.windNow, g.terrain, g.mission);
    }
    // Rings, scored exactly like the live game: combo, centre, speed.
    const ring = g.mission.rings[g.nextRing];
    if (ring && !g.ringsDone[g.nextRing]) {
      if (p.x > ring.x + 14) {
        g.ringsMissed[g.nextRing] = true;
        ringMissed(g.feedback);
        g.nextRing += 1;
      } else if (Math.abs(p.x - ring.x) < 14 && Math.abs(p.alt - ring.alt) < ring.r) {
        g.ringsDone[g.nextRing] = true;
        const centred = Math.abs(p.alt - ring.alt) < ring.r * 0.4;
        g.score += ringScored(g.feedback, centred, p.speed).points;
        g.nextRing += 1;
      }
    }
    if (event === 'landed') {
      const dest = g.mission.runways[g.mission.runways.length - 1];
      if (p.x >= dest.x0 - 20) {
        g.rollingOut = true;
      } else {
        g.end = { win: false, reason: 'Mendarat kembali di landasan awal', landingBonus: 0, soft: false };
        g.grade = '';
        g.screen = 'end';
        return g;
      }
    } else if (event === 'stopped') {
      const soft = Math.abs(p.verticalSpeed) < 2;
      const bonus = 150 + Math.round(p.fuel) * 2;
      g.score += bonus;
      g.grade = landingGrade(g.score, soft, p.fuel / g.mission.fuel);
      g.end = { win: true, reason: 'Pendaratan lembut di landasan tujuan', landingBonus: bonus, soft };
      g.screen = 'end';
      return g;
    } else if (event === 'crashed' || event === 'ditched' || event === 'outoffuel') {
      g.end = { win: false, reason: event === 'ditched' ? 'Jatuh ke laut' : event === 'outoffuel' ? 'Kehabisan bahan bakar' : 'Menabrak daratan', landingBonus: 0, soft: false };
      g.grade = '';
      g.screen = 'end';
      return g;
    }
    g.camX = p.x;
    g.camAlt = p.alt;
    if (stopAt && stopAt(g)) return g;
  }
  return g;
}

/**
 * Stage the named scene on a fresh game and return it ready to draw.
 * cover: mission 1, ring 1 close ahead and big. mission: the new night
 * storm (mission 4), mid-course in the rain. land: mission 1 on final
 * approach, gear down, strip ahead. end: mission 1 landed, the debrief
 * panel with its landing grade up.
 */
export function stageShot(name, createGame, missions) {
  const pick = name === 'mission' ? 3 : 0;
  const g = createGame(pick);
  g.screen = 'play';
  g.plane.throttle = 0;
  if (name === 'cover') {
    runAutopilot(g, 120, (state) => state.plane.x >= 2250);
  } else if (name === 'mission') {
    runAutopilot(g, 300, (state) => state.plane.x >= 6000);
  } else if (name === 'land') {
    const dest = g.mission.runways[1];
    runAutopilot(g, 400, (state) => state.plane.x >= dest.x0 - 420 && state.plane.alt - state.terrain.heightAt(state.plane.x) < 70);
  } else if (name === 'end') {
    runAutopilot(g, 600, (state) => state.screen === 'end');
  } else {
    runAutopilot(g, 60, (state) => state.plane.x >= 1200);
  }
  if (g.screen !== 'end') g.screen = 'play';
  g.objective = g.nextRing < g.mission.rings.length
    ? `Cincin ${g.nextRing + 1}/${g.mission.rings.length} · lalu mendarat di ${g.mission.runways[1].name}`
    : `Semua cincin dilewati · mendarat di ${g.mission.runways[1].name}`;
  g.toasts = name === 'cover' ? [{ text: 'Cincin 1 di depan — terbang lurus!', life: 3 }] : [];
  return { game: g };
}
