// Every pixel of Langit Pos: sky, sea, islands, runways, rings, the aeroplane,
// the lit instruments and the HUD. One job: turn a game state into a frame.
import { VIEW, PLANE } from './config.js';
import { hash1, noise1 } from './random.js';

const STRIP_Y = 606;
const PLANE_SCREEN_X = 430;
const PLANE_SCREEN_Y = 398;

export function cockpitButtonRects() {
  return {
    gear: { x: 1058, y: 626, w: 86, h: 40 },
    flaps: { x: 1152, y: 626, w: 86, h: 40 },
    throttle: { x: 962, y: 622, w: 34, h: 84 },
    pause: { x: 1240, y: 8, w: 32, h: 32 },
    mute: { x: 1200, y: 8, w: 32, h: 32 },
  };
}
export function titleMissionRects() {
  return [0, 1, 2].map((i) => ({ x: 190 + i * 310, y: 400, w: 280, h: 150, mission: i }));
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function makeView(state) {
  const scale = 1.35;
  const camX = state.camX;
  const camAlt = state.camAlt;
  return {
    scale,
    x: (wx) => PLANE_SCREEN_X + (wx - camX) * scale,
    y: (alt) => PLANE_SCREEN_Y - (alt - camAlt) * scale,
  };
}

function drawSky(ctx, state, view) {
  const pal = state.palette;
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.height);
  g.addColorStop(0, pal.skyTop);
  g.addColorStop(0.55, pal.skyMid);
  g.addColorStop(1, pal.skyLow);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  // Sun.
  const sunX = 1080 - state.camX * 0.02 % 200;
  const sunY = state.mission.palette === 'dusk' ? 300 : 110;
  const sg = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 90);
  sg.addColorStop(0, pal.sun);
  sg.addColorStop(1, 'rgba(255,240,190,0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sunX - 100, sunY - 100, 200, 200);
  ctx.fillStyle = pal.sun;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
  ctx.fill();
  // Clouds: deterministic positions, slow parallax drift.
  ctx.fillStyle = pal.cloud;
  for (let i = 0; i < 26; i += 1) {
    const cx = ((i * 911 + hash1(i * 13 + state.mission.seed) * 420 - state.camX * 0.25) % 1500 + 1500) % 1500 - 110;
    const cy = 40 + hash1(i * 29 + 3) * 240;
    const s = 0.7 + hash1(i * 7 + 9) * 0.9;
    ctx.beginPath();
    ctx.ellipse(cx, cy, 64 * s, 15 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx + 34 * s, cy + 5 * s, 44 * s, 12 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(cx - 36 * s, cy + 6 * s, 40 * s, 11 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRidge(ctx, state, seedOff, parallax, baseY, amp, colour) {
  ctx.fillStyle = colour;
  ctx.beginPath();
  ctx.moveTo(0, VIEW.height);
  for (let sx = 0; sx <= VIEW.width; sx += 16) {
    const wx = state.camX * parallax + sx / 1.35;
    const y = baseY - noise1(wx * 0.9, state.mission.seed + seedOff) * amp;
    ctx.lineTo(sx, y);
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.closePath();
  ctx.fill();
}

function drawSeaAndTerrain(ctx, state, view) {
  const pal = state.palette;
  const terrain = state.terrain;
  const waterY = view.y(1);
  // Sea first: anywhere the ground dips under it, water shows through.
  const wg = ctx.createLinearGradient(0, waterY, 0, VIEW.height);
  wg.addColorStop(0, pal.sea);
  wg.addColorStop(1, pal.seaDeep);
  ctx.fillStyle = wg;
  ctx.fillRect(0, Math.max(0, waterY), VIEW.width, VIEW.height - Math.max(0, waterY));
  // Wave glints.
  ctx.strokeStyle = 'rgba(255,255,255,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 14; i += 1) {
    const wx = Math.floor((state.camX - 700) / 130) * 130 + i * 130;
    const sx = view.x(wx);
    const sy = view.y(0.6 + hash1(i * 3 + Math.floor(state.camX / 130)) * 0.4);
    if (sx < -40 || sx > VIEW.width + 40 || sy < waterY - 4) continue;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + 34, sy);
    ctx.stroke();
  }
  // Terrain body.
  ctx.beginPath();
  ctx.moveTo(0, VIEW.height);
  for (let sx = 0; sx <= VIEW.width; sx += 8) {
    const wx = state.camX + (sx - PLANE_SCREEN_X) / view.scale;
    ctx.lineTo(sx, view.y(terrain.heightAt(wx)));
  }
  ctx.lineTo(VIEW.width, VIEW.height);
  ctx.closePath();
  const tg = ctx.createLinearGradient(0, 200, 0, VIEW.height);
  tg.addColorStop(0, pal.mid);
  tg.addColorStop(1, pal.near);
  ctx.fillStyle = tg;
  ctx.fill();
  // Sand fringe where land meets the sea.
  ctx.strokeStyle = pal.sand;
  ctx.lineWidth = 5;
  ctx.beginPath();
  let pen = false;
  for (let sx = 0; sx <= VIEW.width; sx += 8) {
    const wx = state.camX + (sx - PLANE_SCREEN_X) / view.scale;
    const h = terrain.heightAt(wx);
    if (h < 4) {
      if (!pen) { ctx.moveTo(sx, view.y(h)); pen = true; }
      else ctx.lineTo(sx, view.y(h));
    } else pen = false;
  }
  ctx.stroke();
  // Trees and houses.
  for (let wx = Math.floor((state.camX - 700) / 46) * 46; wx < state.camX + 700; wx += 46) {
    const t = terrain.treeAt(wx);
    if (!t) continue;
    const sx = view.x(t.x);
    const sy = view.y(terrain.heightAt(t.x));
    drawTree(ctx, sx, sy, t.size, t.kind);
  }
  for (let wx = Math.floor((state.camX - 700) / 90) * 90; wx < state.camX + 700; wx += 90) {
    const h = terrain.houseAt(wx);
    if (!h) continue;
    const sx = view.x(h.x);
    const sy = view.y(terrain.heightAt(h.x));
    ctx.fillStyle = '#e8ddc4';
    ctx.fillRect(sx, sy - h.h, h.w, h.h);
    ctx.fillStyle = h.roof;
    ctx.beginPath();
    ctx.moveTo(sx - 3, sy - h.h);
    ctx.lineTo(sx + h.w / 2, sy - h.h - 10);
    ctx.lineTo(sx + h.w + 3, sy - h.h);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#2c3550';
    ctx.fillRect(sx + 5, sy - h.h + 6, 6, 8);
    ctx.fillRect(sx + h.w - 11, sy - h.h + 6, 6, 8);
  }
}

function drawTree(ctx, x, y, size, kind) {
  if (kind === 'palm') {
    ctx.strokeStyle = '#6b4a2b';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + 4, y - size * 0.7, x + 2, y - size);
    ctx.stroke();
    ctx.strokeStyle = '#2f7a3a';
    ctx.lineWidth = 3;
    for (let i = 0; i < 5; i += 1) {
      const a = -Math.PI * (0.15 + i * 0.16);
      ctx.beginPath();
      ctx.moveTo(x + 2, y - size);
      ctx.quadraticCurveTo(x + 2 + Math.cos(a) * size * 0.7, y - size + Math.sin(a) * size * 0.5, x + 2 + Math.cos(a) * size, y - size + Math.sin(a) * size * 0.8 + 6);
      ctx.stroke();
    }
  } else {
    ctx.fillStyle = '#5a3d24';
    ctx.fillRect(x - 2, y - 8, 4, 8);
    ctx.fillStyle = '#276b33';
    ctx.beginPath();
    ctx.moveTo(x, y - size - 6);
    ctx.lineTo(x - size * 0.42, y - 6);
    ctx.lineTo(x + size * 0.42, y - 6);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(x, y - size * 1.35 - 4);
    ctx.lineTo(x - size * 0.3, y - size * 0.6);
    ctx.lineTo(x + size * 0.3, y - size * 0.6);
    ctx.closePath();
    ctx.fill();
  }
}

function drawRunways(ctx, state, view) {
  const pal = state.palette;
  for (const r of state.mission.runways) {
    const x0 = view.x(r.x0);
    const x1 = view.x(r.x1);
    if (x1 < -50 || x0 > VIEW.width + 50) continue;
    const gy = view.y(state.terrain.heightAt(r.x0));
    ctx.fillStyle = pal.runway;
    ctx.fillRect(x0, gy - 6, x1 - x0, 10);
    ctx.fillStyle = '#e8e8e8';
    for (let wx = r.x0 + 40; wx < r.x1 - 20; wx += 90) {
      ctx.fillRect(view.x(wx), gy - 4, 44, 3);
    }
    ctx.fillStyle = '#f4f4f4';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(r.name.toUpperCase(), (x0 + x1) / 2, gy - 18);
    // Windsock.
    const wx = view.x(r.x1 - 30);
    ctx.strokeStyle = '#d8d8d8';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(wx, gy - 6);
    ctx.lineTo(wx, gy - 52);
    ctx.stroke();
    const wind = state.windNow;
    ctx.fillStyle = '#ff7a2a';
    ctx.beginPath();
    ctx.moveTo(wx, gy - 52);
    ctx.lineTo(wx + (wind < 0 ? -26 : 26), gy - 46);
    ctx.lineTo(wx, gy - 40);
    ctx.closePath();
    ctx.fill();
    // Beacon.
    const blink = Math.sin(state.time * 3) > 0;
    ctx.fillStyle = blink ? '#ff4444' : '#7a2020';
    ctx.beginPath();
    ctx.arc(view.x(r.x0 + 12), gy - 14, 4, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRings(ctx, state, view) {
  state.mission.rings.forEach((ring, i) => {
    const sx = view.x(ring.x);
    if (sx < -120 || sx > VIEW.width + 120) return;
    const sy = view.y(ring.alt);
    const rr = ring.r * view.scale;
    const done = state.ringsDone[i];
    const next = i === state.nextRing;
    ctx.save();
    if (next) {
      const pulse = 1 + Math.sin(state.time * 4) * 0.06;
      ctx.globalAlpha = 0.25 + Math.sin(state.time * 4) * 0.08;
      ctx.strokeStyle = '#ffb020';
      ctx.lineWidth = 10 * pulse;
      ctx.beginPath();
      ctx.arc(sx, sy, rr * pulse, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = done ? '#37d67a' : next ? '#ffb020' : '#ff8c1a';
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.arc(sx, sy, rr, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, rr - 6, 0, Math.PI * 2);
    ctx.stroke();
    if (done) {
      ctx.strokeStyle = '#37d67a';
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.moveTo(sx - 16, sy);
      ctx.lineTo(sx - 4, sy + 12);
      ctx.lineTo(sx + 18, sy - 12);
      ctx.stroke();
    } else if (next) {
      ctx.fillStyle = '#1c2733';
      ctx.font = 'bold 15px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`CINCIN ${i + 1} · ${Math.max(0, Math.round(ring.x - state.plane.x))} m`, sx, sy - rr - 12);
    }
    ctx.restore();
  });
  // Off-screen arrow to the next objective.
  const target = state.nextRing < state.mission.rings.length
    ? state.mission.rings[state.nextRing]
    : state.mission.runways[state.mission.runways.length - 1];
  const tx = target.x !== undefined ? target.x : target.x1;
  const sx = view.x(tx);
  if (sx > VIEW.width - 40) {
    ctx.fillStyle = '#ffb020';
    ctx.beginPath();
    ctx.moveTo(VIEW.width - 18, 90);
    ctx.lineTo(VIEW.width - 42, 78);
    ctx.lineTo(VIEW.width - 42, 102);
    ctx.closePath();
    ctx.fill();
    ctx.font = 'bold 14px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${Math.round(tx - state.plane.x)} m →`, VIEW.width - 50, 95);
  }
}

function drawPlane(ctx, state) {
  const p = state.plane;
  const x = PLANE_SCREEN_X;
  const y = PLANE_SCREEN_Y;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate((-p.pitch * Math.PI) / 180);
  // Propeller disc + blades, blur grows with throttle.
  const propX = 46;
  ctx.fillStyle = `rgba(200,210,220,${0.25 + p.throttle * 0.35})`;
  ctx.beginPath();
  ctx.ellipse(propX, 0, 4, 26 + p.throttle * 6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#2c3550';
  ctx.lineWidth = 3;
  const pa = state.time * (6 + p.throttle * 30);
  ctx.beginPath();
  ctx.moveTo(propX, -Math.sin(pa) * 26);
  ctx.lineTo(propX, Math.sin(pa) * 26);
  ctx.moveTo(propX, -Math.cos(pa) * 26);
  ctx.lineTo(propX, Math.cos(pa) * 26);
  ctx.stroke();
  // Tail.
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.moveTo(-42, -4);
  ctx.lineTo(-56, -26);
  ctx.lineTo(-46, -26);
  ctx.lineTo(-34, -6);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0f766e';
  ctx.beginPath();
  ctx.moveTo(-40, 2);
  ctx.lineTo(-58, 10);
  ctx.lineTo(-40, 8);
  ctx.closePath();
  ctx.fill();
  // Fuselage.
  ctx.fillStyle = '#f5efe0';
  ctx.beginPath();
  ctx.moveTo(-46, -8);
  ctx.quadraticCurveTo(-10, -16, 34, -10);
  ctx.quadraticCurveTo(50, -6, 48, 2);
  ctx.quadraticCurveTo(30, 10, -8, 10);
  ctx.quadraticCurveTo(-40, 8, -46, -8);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#0f766e';
  ctx.fillRect(-30, -2, 62, 5);
  // High wing + strut.
  ctx.fillStyle = '#e8b23a';
  ctx.beginPath();
  ctx.moveTo(-16, -14);
  ctx.lineTo(18, -14);
  ctx.lineTo(12, -8);
  ctx.lineTo(-22, -8);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = '#5a4a2a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(4, -8);
  ctx.lineTo(10, 6);
  ctx.stroke();
  // Cockpit windows.
  ctx.fillStyle = '#16324a';
  ctx.beginPath();
  ctx.moveTo(18, -11);
  ctx.lineTo(34, -9);
  ctx.lineTo(32, -2);
  ctx.lineTo(18, -3);
  ctx.closePath();
  ctx.fill();
  // Registration.
  ctx.fillStyle = '#0f766e';
  ctx.font = 'bold 9px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('PK-LPS', -12, 5);
  // Landing gear.
  if (p.gearDown) {
    ctx.strokeStyle = '#2c3550';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(22, 8);
    ctx.lineTo(24, 20);
    ctx.moveTo(-28, 8);
    ctx.lineTo(-30, 20);
    ctx.stroke();
    ctx.fillStyle = '#1c2733';
    ctx.beginPath();
    ctx.arc(24, 22, 5, 0, Math.PI * 2);
    ctx.arc(-30, 22, 5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Nav lights.
  const blink = Math.sin(state.time * 5) > 0;
  ctx.fillStyle = blink ? '#ff4444' : '#881111';
  ctx.beginPath();
  ctx.arc(-46, -6, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#37d67a';
  ctx.beginPath();
  ctx.arc(46, -2, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawTopBar(ctx, state) {
  ctx.fillStyle = 'rgba(16,24,34,0.82)';
  ctx.fillRect(0, 0, VIEW.width, 44);
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 17px monospace';
  ctx.textAlign = 'left';
  ctx.fillText(`LANGIT POS · ${state.mission.name.toUpperCase()}`, 14, 28);
  ctx.font = '14px monospace';
  ctx.fillStyle = '#ffd27a';
  ctx.textAlign = 'center';
  ctx.fillText(state.objective, 640, 28);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#f5efe0';
  const timer = state.mission.timeLimit > 0 ? `⏱ ${Math.max(0, Math.ceil(state.mission.timeLimit - state.elapsed))} dtk` : '';
  ctx.fillText(`SKOR ${state.score}   ${timer}`, 1180, 28);
  // Stall + fuel warnings.
  if (state.plane.stallWarning && state.screen === 'play') {
    const blink = Math.sin(state.time * 10) > 0;
    if (blink) {
      ctx.fillStyle = '#ff5346';
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('⚠ STALL — TURUNKAN HIDUNG, TAMBAH THROTTLE', 640, 74);
    }
  }
  if (state.plane.fuel / state.mission.fuel < 0.2 && state.screen === 'play') {
    ctx.fillStyle = '#ff5346';
    ctx.font = 'bold 15px monospace';
    ctx.textAlign = 'right';
    ctx.fillText('BAHAN BAKAR RENDAH', 1180, 68);
  }
}

function dial(ctx, cx, cy, r, label, valueText, frac, colour, minLabel, maxLabel) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.fillStyle = '#101a26';
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#3a4a5a';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 2;
  for (let i = 0; i <= 10; i += 1) {
    const a = Math.PI * 0.75 + (i / 10) * Math.PI * 1.5;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * (r - 6), Math.sin(a) * (r - 6));
    ctx.lineTo(Math.cos(a) * (r - 13), Math.sin(a) * (r - 13));
    ctx.stroke();
  }
  const a = Math.PI * 0.75 + Math.max(0, Math.min(1, frac)) * Math.PI * 1.5;
  ctx.strokeStyle = colour;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(Math.cos(a) * (r - 10), Math.sin(a) * (r - 10));
  ctx.stroke();
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(valueText, 0, r - 16);
  ctx.font = '10px monospace';
  ctx.fillStyle = '#8fa0b0';
  ctx.fillText(label, 0, -r + 14);
  ctx.fillText(minLabel, -r + 12, r - 4);
  ctx.fillText(maxLabel, r - 12, r - 4);
  ctx.restore();
}

function drawInstruments(ctx, state) {
  const p = state.plane;
  ctx.fillStyle = '#1c2733';
  ctx.fillRect(0, STRIP_Y, VIEW.width, VIEW.height - STRIP_Y);
  ctx.fillStyle = '#2c3a4a';
  ctx.fillRect(0, STRIP_Y, VIEW.width, 3);
  // Rivets.
  ctx.fillStyle = '#3a4a5a';
  for (let x = 20; x < VIEW.width; x += 60) {
    ctx.beginPath();
    ctx.arc(x, STRIP_Y + 10, 2, 0, Math.PI * 2);
    ctx.fill();
  }
  // Artificial horizon.
  const hx = 92, hy = STRIP_Y + 57, hr = 42;
  ctx.save();
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.clip();
  ctx.translate(hx, hy);
  ctx.rotate((-p.pitch * Math.PI) / 180 * 0.6);
  ctx.fillStyle = '#4f9be0';
  ctx.fillRect(-hr, -hr - p.pitch * 1.2, hr * 2, hr + p.pitch * 1.2);
  ctx.fillStyle = '#8a5a2b';
  ctx.fillRect(-hr, -p.pitch * 1.2, hr * 2, hr + p.pitch * 1.2);
  ctx.strokeStyle = '#f5efe0';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(-hr, -p.pitch * 1.2);
  ctx.lineTo(hr, -p.pitch * 1.2);
  ctx.stroke();
  ctx.restore();
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.moveTo(hx - 16, hy);
  ctx.lineTo(hx - 4, hy);
  ctx.lineTo(hx, hy - 5);
  ctx.lineTo(hx + 4, hy);
  ctx.lineTo(hx + 16, hy);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8fa0b0';
  ctx.font = '10px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('HORIZON', hx, hy + hr + 14);

  dial(ctx, 218, STRIP_Y + 57, 42, 'ALT m', String(Math.round(p.alt)), p.alt / 420, '#4f9be0', '0', '420');
  const kmh = Math.round(p.speed * 3.6);
  dial(ctx, 330, STRIP_Y + 57, 42, 'KM/JAM', String(kmh), p.speed / PLANE.maxSpeed, '#37d67a', '0', '320');
  // Compass tape.
  const cx = 560, cy = STRIP_Y + 57, cw = 300;
  ctx.save();
  ctx.beginPath();
  ctx.rect(cx - cw / 2, cy - 42, cw, 84);
  ctx.clip();
  ctx.fillStyle = '#101a26';
  ctx.fillRect(cx - cw / 2, cy - 42, cw, 84);
  const pxPerDeg = 4;
  for (let d = -60; d <= 60; d += 5) {
    let hdg = Math.round(p.heading) + d;
    hdg = ((hdg % 360) + 360) % 360;
    const sx = cx + d * pxPerDeg;
    const major = hdg % 30 === 0;
    ctx.strokeStyle = major ? '#f5efe0' : '#5a6a7a';
    ctx.lineWidth = major ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(sx, cy - 30);
    ctx.lineTo(sx, cy - (major ? 12 : 20));
    ctx.stroke();
    if (major) {
      ctx.fillStyle = '#f5efe0';
      ctx.font = 'bold 12px monospace';
      ctx.textAlign = 'center';
      const label = hdg === 0 ? 'U' : hdg === 90 ? 'T' : hdg === 180 ? 'S' : hdg === 270 ? 'B' : String(hdg).padStart(3, '0');
      ctx.fillText(label, sx, cy - 34);
    } else if (hdg % 10 === 0 && Math.abs(d) >= 15) {
      ctx.fillStyle = '#8fa0b0';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(String(hdg).padStart(3, '0'), sx, cy + 26);
    }
  }
  ctx.restore();
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 2;
  ctx.strokeRect(cx - cw / 2, cy - 42, cw, 84);
  ctx.fillStyle = '#ffd27a';
  ctx.beginPath();
  ctx.moveTo(cx, cy - 42);
  ctx.lineTo(cx - 6, cy - 54);
  ctx.lineTo(cx + 6, cy - 54);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 15px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`HDG ${String(Math.round(p.heading)).padStart(3, '0')}°`, cx, cy + 34);
  // Fuel gauge.
  const fx = 780, fy = STRIP_Y + 18;
  ctx.fillStyle = '#101a26';
  ctx.fillRect(fx, fy, 26, 76);
  const fuelFrac = p.fuel / state.mission.fuel;
  const fh = 76 * fuelFrac;
  ctx.fillStyle = fuelFrac < 0.2 ? '#ff5346' : fuelFrac < 0.45 ? '#ffb020' : '#37d67a';
  ctx.fillRect(fx + 3, fy + 76 - fh, 20, fh);
  ctx.strokeStyle = '#5a6a7a';
  ctx.lineWidth = 2;
  ctx.strokeRect(fx, fy, 26, 76);
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 13px monospace';
  ctx.textAlign = 'left';
  ctx.fillText('FUEL', fx + 34, fy + 20);
  ctx.fillText(`${Math.round(fuelFrac * 100)}%`, fx + 34, fy + 40);
  ctx.fillStyle = '#8fa0b0';
  ctx.font = '10px monospace';
  ctx.fillText(`DMG ${Math.round(p.damage)}%`, fx + 34, fy + 74);
  // Throttle lever.
  const tb = cockpitButtonRects().throttle;
  ctx.fillStyle = '#101a26';
  ctx.fillRect(tb.x, tb.y, tb.w, tb.h);
  ctx.strokeStyle = '#5a6a7a';
  ctx.strokeRect(tb.x, tb.y, tb.w, tb.h);
  const ty = tb.y + tb.h - 8 - p.throttle * (tb.h - 16);
  ctx.fillStyle = '#ffb020';
  ctx.fillRect(tb.x + 4, ty - 5, tb.w - 8, 10);
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 11px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(`THR ${Math.round(p.throttle * 100)}%`, tb.x + tb.w / 2, tb.y - 6);
  // Gear + flaps buttons.
  const btns = cockpitButtonRects();
  for (const [name, r] of [['gear', btns.gear], ['flaps', btns.flaps]]) {
    const on = name === 'gear' ? p.gearDown : p.flaps;
    ctx.fillStyle = on ? '#1f7a4a' : '#3a2a2a';
    roundRect(ctx, r.x, r.y, r.w, r.h, 6);
    ctx.fill();
    ctx.strokeStyle = on ? '#37d67a' : '#8a4a4a';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = on ? '#c8f5d8' : '#e8a0a0';
    ctx.font = 'bold 13px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(name.toUpperCase(), r.x + r.w / 2, r.y + 25);
    ctx.fillStyle = '#8fa0b0';
    ctx.font = '10px monospace';
    ctx.fillText(name === 'gear' ? 'G' : 'F', r.x + r.w / 2, r.y + 38);
  }
  // Hint line.
  ctx.fillStyle = '#8fa0b0';
  ctx.font = '12px monospace';
  ctx.textAlign = 'right';
  ctx.fillText('W/S throttle · ↑/↓ pitch · G roda · F flap · P jeda · M suara', VIEW.width - 14, STRIP_Y + 106);
}

function drawOverlayPanel(ctx, title, lines, accent) {
  ctx.fillStyle = 'rgba(10,16,24,0.55)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  const w = 620, h = 130 + lines.length * 30;
  const x = (VIEW.width - w) / 2, y = (VIEW.height - h) / 2;
  ctx.fillStyle = '#16222e';
  roundRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.fillStyle = accent;
  ctx.font = 'bold 30px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(title, VIEW.width / 2, y + 52);
  ctx.fillStyle = '#f5efe0';
  ctx.font = '16px monospace';
  lines.forEach((line, i) => ctx.fillText(line, VIEW.width / 2, y + 96 + i * 30));
}

export function drawTitle(ctx, state) {
  drawSky(ctx, state, makeView(state));
  drawRidge(ctx, state, 500, 0.12, 470, 120, state.palette.far);
  drawRidge(ctx, state, 900, 0.35, 520, 90, state.palette.mid);
  drawSeaAndTerrain(ctx, state, makeView(state));
  drawRunways(ctx, state, makeView(state));
  drawPlane(ctx, state);
  ctx.fillStyle = 'rgba(10,16,24,0.45)';
  ctx.fillRect(0, 0, VIEW.width, VIEW.height);
  ctx.fillStyle = '#f5efe0';
  ctx.font = 'bold 84px monospace';
  ctx.textAlign = 'center';
  ctx.fillText('LANGIT POS', VIEW.width / 2, 150);
  ctx.fillStyle = '#ffd27a';
  ctx.font = '22px monospace';
  ctx.fillText('Pilot pos antar-pulau — terbang, antar, mendarat.', VIEW.width / 2, 190);
  ctx.fillStyle = '#f5efe0';
  ctx.font = '15px monospace';
  ctx.fillText('Pilih misi. W/S throttle · Panah Atas/Bawah pitch · G roda · F flap · klik tombol kokpit juga bisa.', VIEW.width / 2, 226);
  const rects = titleMissionRects();
  state.missions.forEach((m, i) => {
    const r = rects[i];
    const hover = state.mouse.x >= r.x && state.mouse.x <= r.x + r.w && state.mouse.y >= r.y && state.mouse.y <= r.y + r.h;
    ctx.fillStyle = hover ? '#24384a' : '#16222e';
    roundRect(ctx, r.x, r.y, r.w, r.h, 10);
    ctx.fill();
    ctx.strokeStyle = '#ffb020';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 20px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(m.name.toUpperCase(), r.x + r.w / 2, r.y + 36);
    ctx.fillStyle = '#f5efe0';
    ctx.font = '14px monospace';
    ctx.fillText(m.subtitle, r.x + r.w / 2, r.y + 62);
    ctx.fillStyle = '#8fa0b0';
    ctx.font = '12px monospace';
    ctx.fillText(`${m.rings.length} cincin · ${m.fuel} bahan bakar`, r.x + r.w / 2, r.y + 88);
    ctx.fillText(m.timeLimit > 0 ? `batas ${m.timeLimit} detik` : 'tanpa batas waktu', r.x + r.w / 2, r.y + 108);
    ctx.fillStyle = '#37d67a';
    ctx.font = 'bold 13px monospace';
    ctx.fillText('KLIK UNTUK TERBANG', r.x + r.w / 2, r.y + 134);
  });
  ctx.fillStyle = '#8fa0b0';
  ctx.font = '13px monospace';
  ctx.fillText('M untuk suara · game orisinal, dibuat untuk bounty make.fun', VIEW.width / 2, 610);
}

export function drawGame(ctx, state) {
  const view = makeView(state);
  drawSky(ctx, state, view);
  drawRidge(ctx, state, 500, 0.12, 470, 120, state.palette.far);
  drawRidge(ctx, state, 900, 0.35, 520, 90, state.palette.mid);
  drawSeaAndTerrain(ctx, state, view);
  drawRunways(ctx, state, view);
  drawRings(ctx, state, view);
  drawPlane(ctx, state);
  drawTopBar(ctx, state);
  drawInstruments(ctx, state);
  // Toasts.
  ctx.textAlign = 'center';
  state.toasts.forEach((t, i) => {
    ctx.globalAlpha = Math.max(0, Math.min(1, t.life));
    ctx.fillStyle = '#1c2733';
    const tw = 360;
    roundRect(ctx, VIEW.width / 2 - tw / 2, 56 + i * 34, tw, 28, 6);
    ctx.fill();
    ctx.fillStyle = '#ffd27a';
    ctx.font = 'bold 14px monospace';
    ctx.fillText(t.text, VIEW.width / 2, 56 + i * 34 + 19);
    ctx.globalAlpha = 1;
  });
}

export function drawBriefing(ctx, state) {
  drawGame(ctx, state);
  const m = state.mission;
  drawOverlayPanel(ctx, m.name.toUpperCase(), [
    m.subtitle,
    '',
    ...wrapBrief(m.brief),
    '',
    'ENTER atau klik untuk lepas landas',
  ], '#ffb020');
}

function wrapBrief(text) {
  const words = text.split(' ');
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > 62) {
      lines.push(line.trim());
      line = w;
    } else line += ' ' + w;
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

export function drawPause(ctx, state) {
  drawGame(ctx, state);
  drawOverlayPanel(ctx, 'JEDA', ['P atau klik untuk lanjut', 'R untuk mulai ulang misi', 'M untuk suara'], '#4f9be0');
}

export function drawEnd(ctx, state) {
  drawGame(ctx, state);
  const e = state.end;
  const accent = e.win ? '#37d67a' : '#ff5346';
  const fuelPct = Math.round((state.plane.fuel / state.mission.fuel) * 100);
  const lines = [
    e.reason,
    '',
    `Skor: ${state.score}   ·   Cincin: ${state.ringsDone.filter(Boolean).length}/${state.mission.rings.length}`,
    `Bahan bakar tersisa: ${fuelPct}%   ·   Waktu: ${Math.round(state.elapsed)} dtk`,
    e.win ? `Bonus pendaratan lembut +${e.landingBonus}` : 'Kerusakan: ' + Math.round(state.plane.damage) + '%',
    '',
    'R untuk terbang lagi · T untuk pilih misi lain',
  ];
  drawOverlayPanel(ctx, e.win ? 'MISI SELESAI' : 'PENERBANGAN BERAKHIR', lines, accent);
}
