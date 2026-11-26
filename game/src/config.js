// Flight tuning and world constants for Langit Pos. One job: every number the
// flight model, the missions and the renderer agree on lives here.
export const VIEW = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const WORLD = {
  pxPerMetre: 1.35,
  seaLevel: 0,
  maxAltitude: 420,
  groundSpeedMin: 0,
};
export const PLANE = {
  cruiseSpeed: 55,
  maxSpeed: 88,
  stallSpeed: 27,
  stallSpeedFlaps: 21,
  maxPitchUp: 30,
  maxPitchDown: -24,
  pitchRate: 34,
  thrust: 18,
  drag: 0.0028,
  climbBleed: 0.055,
  turnBleed: 0.35,
  fuelCapacity: 100,
  fuelBurn: 0.55,
  fuelIdle: 0.05,
  gearSpeedMax: 48,
  touchdownSpeedMax: 46,
  touchdownSinkMax: 4.5,
};
export const SCORE = {
  ring: 100,
  ringCentre: 25,
  landingSoft: 150,
  landingFuelPerUnit: 2,
  smoothPerSecond: 2,
};
export const PALETTES = {
  morning: {
    skyTop: '#7fb2e5', skyMid: '#cfe8f7', skyLow: '#ffe9b8',
    sun: '#fff3c4', far: '#8fa8c8', mid: '#5f8f6a', near: '#3e7a44',
    sea: '#2f7fa8', seaDeep: '#1f5f86', sand: '#e8d9a0', runway: '#3c4148',
    cloud: 'rgba(255,255,255,0.92)',
  },
  dusk: {
    skyTop: '#3d4a7a', skyMid: '#c96f4a', skyLow: '#ffb37a',
    sun: '#ffd9a0', far: '#6a5a8a', mid: '#4a6a52', near: '#2e5238',
    sea: '#33506e', seaDeep: '#24395a', sand: '#c9a878', runway: '#33373e',
    cloud: 'rgba(255,214,180,0.85)',
  },
  noon: {
    skyTop: '#4f9be0', skyMid: '#a8d8f0', skyLow: '#e8f6ff',
    sun: '#fffbe0', far: '#7fa3c8', mid: '#4f8f5f', near: '#2f6b3a',
    sea: '#1f7fb0', seaDeep: '#14608c', sand: '#ead9a0', runway: '#3a3f46',
    cloud: 'rgba(255,255,255,0.95)',
  },
};
