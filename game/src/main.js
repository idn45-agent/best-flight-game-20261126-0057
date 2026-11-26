// Langit Pos: the game loop, screens, scoring and the wiring between the flight
// model, the world, the renderer and the sound. One job: run the game.
import { VIEW, STEP, PLANE, SCORE } from './config.js';
import { MISSIONS, windAt } from './missions.js';
import { makeTerrain } from './terrain.js';
import { createPlane, stepPlane, stepRollout } from './plane.js';
import { createAudio } from './audio.js';
import { createInput } from './input.js';
import {
  drawTitle, drawGame, drawBriefing, drawPause, drawEnd,
  cockpitButtonRects, titleMissionRects,
} from './render.js';
import { stageShot } from './shots.js';
import { PALETTES } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.width;
canvas.height = VIEW.height;
const input = createInput(canvas);
const audio = createAudio();
const statusEl = document.getElementById('status');

function createGame(missionIndex) {
  const mission = MISSIONS[missionIndex];
  const terrain = makeTerrain(mission);
  const plane = createPlane(mission, terrain);
  return {
    screen: 'briefing',
    missionIndex,
    mission,
    terrain,
    plane,
    palette: PALETTES[mission.palette],
    missions: MISSIONS,
    ringsDone: mission.rings.map(() => false),
    nextRing: 0,
    score: 0,
    elapsed: 0,
    time: 0,
    camX: plane.x,
    camAlt: plane.alt,
    windNow: mission.windBase,
    toasts: [],
    end: null,
    rollingOut: false,
    smoothTime: 0,
    lastPitch: 0,
    mouse: { x: 0, y: 0 },
    stallBeepAt: 0,
  };
}

let game = null;
let titleGame = null;

function newTitleScene() {
  const g = createGame(0);
  g.screen = 'title';
  g.plane.throttle = 0;
  return g;
}
titleGame = newTitleScene();

function toast(g, text) {
  g.toasts.push({ text, life: 3 });
  if (g.toasts.length > 3) g.toasts.shift();
}

function objectiveText(g) {
  if (g.nextRing < g.mission.rings.length) return `Cincin ${g.nextRing + 1}/${g.mission.rings.length} · lalu mendarat di ${g.mission.runways[1].name}`;
  return `Semua cincin dilewati · mendarat di ${g.mission.runways[1].name}`;
}

function ringCheck(g) {
  const p = g.plane;
  const ring = g.mission.rings[g.nextRing];
  if (!ring) return;
  if (Math.abs(p.x - ring.x) < 14 && Math.abs(p.alt - ring.alt) < ring.r) {
    g.ringsDone[g.nextRing] = true;
    const centred = Math.abs(p.alt - ring.alt) < ring.r * 0.4;
    const gained = SCORE.ring + (centred ? SCORE.ringCentre : 0);
    g.score += gained;
    audio.ring();
    toast(g, centred ? `Cincin ${g.nextRing + 1} tepat di tengah! +${gained}` : `Cincin ${g.nextRing + 1} dilewati! +${gained}`);
    g.nextRing += 1;
  }
}

function finishFlight(g, win, reason, landingBonus) {
  g.screen = 'end';
  g.end = { win, reason, landingBonus: landingBonus || 0 };
  if (win) {
    g.score += landingBonus;
    audio.fanfare();
  } else {
    audio.crash();
  }
  statusEl.textContent = win ? `Misi selesai. Skor ${g.score}.` : `${reason}. Skor ${g.score}.`;
}

function updatePlay(g, dt) {
  const p = g.plane;
  // Arrow keys fly the aeroplane; W/S work the throttle.
  const inp = {
    pitchUp: input.held('ArrowUp'),
    pitchDown: input.held('ArrowDown'),
    throttleUp: input.held('w'),
    throttleDown: input.held('s'),
  };

  // Throttle lever drag.
  const tb = cockpitButtonRects().throttle;
  const m = input.mouse();
  if (m.down && m.x >= tb.x - 6 && m.x <= tb.x + tb.w + 6 && m.y >= tb.y - 6 && m.y <= tb.y + tb.h + 6) {
    input.setThrottleDrag(true);
  }
  if (input.throttleDragging() && m.down) {
    p.throttle = Math.max(0, Math.min(1, (tb.y + tb.h - 8 - m.y) / (tb.h - 16)));
  }

  // Cockpit buttons.
  const click = input.consumeClick();
  if (click) {
    const b = cockpitButtonRects();
    if (click.x >= b.gear.x && click.x <= b.gear.x + b.gear.w && click.y >= b.gear.y && click.y <= b.gear.y + b.gear.h) {
      p.gearDown = !p.gearDown;
      audio.click();
      toast(g, p.gearDown ? 'Roda turun' : 'Roda naik');
    } else if (click.x >= b.flaps.x && click.x <= b.flaps.x + b.flaps.w && click.y >= b.flaps.y && click.y <= b.flaps.y + b.flaps.h) {
      p.flaps = !p.flaps;
      audio.click();
      toast(g, p.flaps ? 'Flap turun — stall lebih rendah' : 'Flap naik');
    } else if (click.x >= b.pause.x && click.x <= b.pause.x + b.pause.w && click.y >= b.pause.y && click.y <= b.pause.y + b.pause.h) {
      g.screen = 'pause';
    } else if (click.x >= b.mute.x && click.x <= b.mute.x + b.mute.w && click.y >= b.mute.y && click.y <= b.mute.y + b.mute.h) {
      audio.setMuted(!audio.isMuted());
    }
  }
  if (input.wasPressed('g') || input.wasPressed('G')) {
    p.gearDown = !p.gearDown;
    toast(g, p.gearDown ? 'Roda turun' : 'Roda naik');
  }
  if (input.wasPressed('f') || input.wasPressed('F')) {
    p.flaps = !p.flaps;
    toast(g, p.flaps ? 'Flap turun — stall lebih rendah' : 'Flap naik');
  }
  if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape')) g.screen = 'pause';
  if (input.wasPressed('m') || input.wasPressed('M')) audio.setMuted(!audio.isMuted());

  g.windNow = windAt(g.mission, p.x, g.time);
  const event = g.rollingOut
    ? (stepRollout(p, dt, g.terrain) ? 'stopped' : null)
    : stepPlane(p, dt, inp, g.windNow, g.terrain, g.mission);
  g.elapsed += dt;

  // Smooth-flying bonus: gentle hands pay, yanking the stick does not.
  const pitchRate = Math.abs(p.pitch - g.lastPitch) / dt;
  g.lastPitch = p.pitch;
  if (p.airborne && pitchRate < 12 && p.speed > 30) {
    g.smoothTime += dt;
    if (g.smoothTime >= 1) {
      g.score += SCORE.smoothPerSecond;
      g.smoothTime -= 1;
    }
  }
  if (p.stallWarning && g.time - g.stallBeepAt > 1.2) {
    g.stallBeepAt = g.time;
    audio.stall();
  }
  if (p.fuel <= 0 && p.onGround && p.speed < 1 && !p.airborne) {
    finishFlight(g, false, 'Kehabisan bahan bakar di darat', 0);
    return;
  }
  if (g.mission.timeLimit > 0 && g.elapsed > g.mission.timeLimit && !g.rollingOut) {
    finishFlight(g, false, 'Waktu habis — pasien menunggu terlalu lama', 0);
    return;
  }
  ringCheck(g);
  if (event === 'landed') {
    const dest = g.mission.runways[g.mission.runways.length - 1];
    if (p.x >= dest.x0 - 20) {
      audio.touchdown();
      g.rollingOut = true;
      toast(g, 'Mendarat! Melambat…');
    } else {
      finishFlight(g, false, 'Mendarat kembali di landasan awal — misi belum selesai', 0);
    }
  } else if (event === 'stopped') {
    const soft = Math.abs(p.verticalSpeed) < 2;
    const bonus = SCORE.landingSoft + Math.round(p.fuel) * SCORE.landingFuelPerUnit;
    finishFlight(g, true, soft ? 'Pendaratan lembut di landasan tujuan' : 'Mendarat di landasan tujuan', bonus);
  } else if (event === 'crashed') {
    finishFlight(g, false, 'Menabrak daratan', 0);
  } else if (event === 'ditched') {
    finishFlight(g, false, 'Jatuh ke laut', 0);
  } else if (event === 'outoffuel') {
    finishFlight(g, false, 'Kehabisan bahan bakar di udara', 0);
  }

  // Camera follows the aeroplane, smoothly, and never fights it.
  const targetCamX = p.x;
  const targetCamAlt = p.alt;
  g.camX += (targetCamX - g.camX) * Math.min(1, dt * 2.2);
  g.camAlt += (targetCamAlt - g.camAlt) * Math.min(1, dt * 1.6);
  audio.update(p.throttle, p.speed, p.airborne);
}

function updateTitle(g) {
  const click = input.consumeClick();
  if (click) {
    for (const r of titleMissionRects()) {
      if (click.x >= r.x && click.x <= r.x + r.w && click.y >= r.y && click.y <= r.y + r.h) {
        audio.unlock();
        audio.click();
        game = createGame(r.mission);
        return;
      }
    }
  }
  if (input.wasPressed('1')) { game = createGame(0); }
  if (input.wasPressed('2')) { game = createGame(1); }
  if (input.wasPressed('3')) { game = createGame(2); }
  if (input.wasPressed('m') || input.wasPressed('M')) audio.setMuted(!audio.isMuted());
  g.camX += 12 * STEP;
  if (g.camX > 1400) g.camX = g.plane.x;
  g.mouse = input.mouse();
}

function updateBriefing(g) {
  if (input.wasPressed('Enter') || input.wasPressed(' ') || input.consumeClick()) {
    audio.unlock();
    g.screen = 'play';
    statusEl.textContent = `${g.mission.name}: ${g.mission.subtitle}. Terbang melewati cincin, lalu mendarat.`;
  }
}

function updatePause(g) {
  if (input.wasPressed('p') || input.wasPressed('P') || input.wasPressed('Escape') || input.consumeClick()) {
    g.screen = 'play';
  }
  if (input.wasPressed('r') || input.wasPressed('R')) game = createGame(g.missionIndex);
}

function updateEnd(g) {
  if (input.wasPressed('r') || input.wasPressed('R')) game = createGame(g.missionIndex);
  if (input.wasPressed('t') || input.wasPressed('T')) {
    titleGame = newTitleScene();
    game = null;
  }
}

function frame(now) {
  requestAnimationFrame(frame);
  const dt = STEP;
  const active = game || titleGame;
  active.time += dt;
  active.toasts.forEach((t) => { t.life -= dt / 3; });
  active.toasts = active.toasts.filter((t) => t.life > 0);
  active.objective = active.screen === 'play' || active.screen === 'pause' || active.screen === 'end'
    ? objectiveText(active) : '';
  if (!game) {
    updateTitle(titleGame);
    drawTitle(ctx, titleGame);
  } else if (game.screen === 'briefing') {
    updateBriefing(game);
    drawBriefing(ctx, game);
  } else if (game.screen === 'play') {
    updatePlay(game, dt);
    drawGame(ctx, game);
  } else if (game.screen === 'pause') {
    updatePause(game);
    drawPause(ctx, game);
  } else if (game.screen === 'end') {
    updateEnd(game);
    drawEnd(ctx, game);
  }
  input.endFrame();
}

// Deterministic screenshot scenes: ?shot=cover|mission|land|end stages the real
// game forward with an autopilot, then draws one frozen frame.
function stageScreenshot() {
  const params = new URLSearchParams(window.location.search);
  const shot = params.get('shot');
  if (!shot) return false;
  const result = stageShot(shot, createGame, MISSIONS);
  game = result.game;
  drawGame(ctx, game);
  if (game.screen === 'end') drawEnd(ctx, game);
  window.__shotReady = true;
  window.__game = {
    screen: game.screen,
    score: game.score,
    plane: { x: game.plane.x, alt: game.plane.alt, speed: game.plane.speed, fuel: game.plane.fuel },
    ringsDone: game.ringsDone,
    mission: game.mission.name,
  };
  return true;
}

if (!stageScreenshot()) {
  window.__game = {
    get screen() { return (game || titleGame).screen; },
    get score() { return game ? game.score : 0; },
  };
  requestAnimationFrame(frame);
}
