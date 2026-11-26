// The flight model of Langit Pos: throttle, pitch, lift, stall, wind, fuel and
// damage. A sortie is a set of decisions: throttle buys speed and burns fuel,
// a steep turn bleeds it, and a slow aeroplane stops flying.
import { PLANE } from './config.js';

export function createPlane(mission, terrain) {
  const start = mission.runways[0];
  const ground = terrain.heightAt(start.x0 + 80);
  return {
    x: start.x0 + 80,
    alt: ground,
    speed: 0,
    pitch: 0,
    throttle: 0,
    fuel: mission.fuel,
    damage: 0,
    gearDown: true,
    flaps: false,
    airborne: false,
    verticalSpeed: 0,
    heading: 90,
    stallWarning: false,
    onGround: true,
    ground,
  };
}

/**
 * Advance the aeroplane one step. `input` is {pitchUp, pitchDown, throttleUp,
 * throttleDown} and `wind` is the headwind in m/s (negative = headwind).
 * Returns an event string: 'takeoff' | 'ring' is handled by missions,
 * 'landed' | 'crashed' | 'ditched' | 'outoffuel' | null.
 */
export function stepPlane(p, dt, input, wind, terrain, mission) {
  const prevPitch = p.pitch;
  if (input.throttleUp) p.throttle = Math.min(1, p.throttle + 0.8 * dt);
  if (input.throttleDown) p.throttle = Math.max(0, p.throttle - 0.8 * dt);

  const pitchTarget = input.pitchUp ? PLANE.maxPitchUp : input.pitchDown ? PLANE.maxPitchDown : 0;
  const rate = PLANE.pitchRate * dt;
  p.pitch += Math.max(-rate, Math.min(rate, pitchTarget - p.pitch));
  p.pitch = Math.max(PLANE.maxPitchDown, Math.min(PLANE.maxPitchUp, p.pitch));
  const pitchRate = (p.pitch - prevPitch) / dt;

  // Speed: thrust against drag and the cost of climbing or turning hard.
  const stall = p.flaps ? PLANE.stallSpeedFlaps : PLANE.stallSpeed;
  const climbCost = Math.max(0, Math.sin((p.pitch * Math.PI) / 180)) * PLANE.climbBleed * p.speed;
  const turnCost = Math.abs(pitchRate) * PLANE.turnBleed * 0.02 * p.speed * 0.05;
  const rollDrag = p.onGround ? 4 : 0;
  const accel = p.throttle * PLANE.thrust - PLANE.drag * p.speed * p.speed - climbCost - turnCost - rollDrag;
  p.speed = Math.max(0, p.speed + accel * dt);
  if (p.speed > PLANE.maxSpeed) p.speed = PLANE.maxSpeed;

  // Lift: below stall speed the wing quits and the nose drops.
  p.stallWarning = p.airborne && p.speed < stall + 4;
  const rad = (p.pitch * Math.PI) / 180;
  let lift = 1;
  if (p.speed < stall) lift = Math.max(0.15, p.speed / stall);
  let vs = p.speed * Math.sin(rad) * lift;
  if (p.speed < stall && p.airborne) vs -= (stall - p.speed) * 0.9;
  p.verticalSpeed = vs;

  // Take-off roll: the wheels hold the aeroplane down until it can fly.
  if (!p.airborne) {
    if (p.speed > stall && p.pitch > 4) {
      p.airborne = true;
      p.onGround = false;
      p.alt += 0.5;
    } else {
      p.alt = p.ground;
      p.verticalSpeed = 0;
    }
  }
  if (p.airborne) {
    p.alt += vs * dt;
    if (p.alt < 0) p.alt = 0;
  }
  p.x += (p.speed * Math.cos(rad) + wind) * dt;
  if (p.x < 0) p.x = 0;

  // Heading drifts a little with bank and gusts: the compass is alive, not painted.
  p.heading = 90 + p.pitch * 0.35 + Math.sin(p.x * 0.004) * 1.5;
  if (p.heading < 0) p.heading += 360;
  if (p.heading >= 360) p.heading -= 360;

  // Fuel: throttle drinks, idling sips; empty tanks stop the engine.
  const burn = (PLANE.fuelIdle + p.throttle * PLANE.fuelBurn) * dt;
  p.fuel = Math.max(0, p.fuel - burn);
  if (p.fuel <= 0 && p.throttle > 0) p.throttle = 0;
  if (p.fuel <= 0 && p.airborne && p.speed < 12) return 'outoffuel';

  // Ground contact: over the sea the surface is the water at altitude 0.
  const ground = terrain.heightAt(p.x);
  p.ground = ground;
  const surface = terrain.isSea(p.x) ? 0 : ground;
  if (p.alt <= surface + 0.01 && p.airborne) {
    const overRunway = mission.runways.some((r) => p.x >= r.x0 && p.x <= r.x1);
    const sink = -vs;
    if (overRunway && p.gearDown && sink <= PLANE.touchdownSinkMax && p.speed <= PLANE.touchdownSpeedMax && p.speed >= 12) {
      p.alt = ground;
      p.onGround = true;
      p.airborne = false;
      p.verticalSpeed = 0;
      return 'landed';
    }
    if (terrain.isSea(p.x)) return 'ditched';
    return 'crashed';
  }
  if (p.alt <= surface + 0.01 && !p.airborne) {
    p.alt = surface;
    p.onGround = true;
  }
  if (p.alt > 600) p.alt = 600;
  return null;
}

/** Rolling on a runway after landing: bleed speed, stop, and report stopped. */
export function stepRollout(p, dt, terrain) {
  p.speed = Math.max(0, p.speed - 14 * dt);
  p.x += p.speed * dt;
  p.alt = terrain.heightAt(p.x);
  p.ground = p.alt;
  return p.speed <= 0.5;
}
