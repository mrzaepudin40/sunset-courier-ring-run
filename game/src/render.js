// Drawing only: the world's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. A chase view over Coral Coast at sunset: the sun low
// over the sea, a city and mountains on the shore, a runway ahead, glowing rings
// to fly through, and the courier jet in frame with its instruments lit.

import { COURSE, FIELD, FONT, FONT_MONO, PALETTE, PLANE } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const W = FIELD.width;
const H = FIELD.height;
const CX = W / 2;
const HORIZON = FIELD.horizonY;

/** Deterministic wobble for terrain silhouettes: same picture every run. */
function ridge(i, a, b) {
  return Math.sin(i * a) * 0.5 + Math.sin(i * b + 1.7) * 0.3 + Math.sin(i * (a + b) + 4.1) * 0.2;
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

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  let viewW = W;
  let viewH = H;
  let scale = 1;
  let offsetX = 0;
  let offsetY = 0;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.clientWidth || W;
    const ch = canvas.clientHeight || H;
    canvas.width = Math.round(cw * dpr);
    canvas.height = Math.round(ch * dpr);
    scale = Math.min(canvas.width / W, canvas.height / H);
    viewW = W * scale;
    viewH = H * scale;
    offsetX = (canvas.width - viewW) / 2;
    offsetY = (canvas.height - viewH) / 2;
  }
  window.addEventListener('resize', resize);
  resize();

  function sky(state) {
    const g = ctx.createLinearGradient(0, 0, 0, HORIZON + 40);
    g.addColorStop(0, PALETTE.skyTop);
    g.addColorStop(0.45, PALETTE.skyMid);
    g.addColorStop(0.85, PALETTE.skyLow);
    g.addColorStop(1, '#ffb37a');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, HORIZON + 40);
    // Sun low over the sea, left of centre, with a wide glow.
    const sunX = CX - 260;
    const sunY = HORIZON - 58;
    const glow = ctx.createRadialGradient(sunX, sunY, 8, sunX, sunY, 260);
    glow.addColorStop(0, 'rgba(255, 214, 120, 0.9)');
    glow.addColorStop(0.35, 'rgba(255, 150, 80, 0.45)');
    glow.addColorStop(1, 'rgba(255, 120, 60, 0)');
    ctx.fillStyle = glow;
    ctx.fillRect(sunX - 260, sunY - 260, 520, 520);
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(255, 179, 71, 0.85)';
    ctx.beginPath();
    ctx.arc(sunX, sunY, 44, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.sunCore;
    ctx.beginPath();
    ctx.arc(sunX, sunY, 34, 0, Math.PI * 2);
    ctx.fill();
  }

  function farClouds(state) {
    ctx.save();
    ctx.globalAlpha = 0.85;
    for (const c of state.cloudsFar) {
      const x = ((c.x * W + 640 - state.heading * 6 - state.time * c.speed) % (W + 320) + W + 320) % (W + 320) - 160;
      const y = c.y + Math.sin(state.time * 0.1 + c.s) * 4;
      ctx.fillStyle = 'rgba(255, 205, 180, 0.5)';
      ctx.beginPath();
      ctx.ellipse(x, y, 64 * c.s, 13 * c.s, 0, 0, Math.PI * 2);
      ctx.ellipse(x + 34 * c.s, y + 5, 42 * c.s, 10 * c.s, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function mountainsAndCity(state) {
    // Far purple mountains, panning slowly with heading.
    const pan = -((state.heading - 42) * 3.2);
    ctx.fillStyle = PALETTE.mountainFar;
    ctx.beginPath();
    ctx.moveTo(-20, HORIZON);
    for (let x = -20; x <= W + 20; x += 20) {
      const px = x + ((pan * 0.4) % 240);
      ctx.lineTo(px, HORIZON - 46 - ridge(x * 0.05, 0.11, 0.031) * 52);
    }
    ctx.lineTo(W + 20, HORIZON);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.mountain;
    ctx.beginPath();
    ctx.moveTo(-20, HORIZON);
    for (let x = -20; x <= W + 20; x += 20) {
      ctx.lineTo(x, HORIZON - 18 - Math.max(0, ridge(x * 0.07 + 9, 0.13, 0.043)) * 44);
    }
    ctx.lineTo(W + 20, HORIZON);
    ctx.closePath();
    ctx.fill();
    // City skyline on the right shore, windows lit.
    ctx.fillStyle = PALETTE.city;
    const cityX = 880 + pan * 0.6;
    for (let i = 0; i < 16; i += 1) {
      const bx = cityX + i * 26;
      const bh = 26 + Math.abs(ridge(i, 0.9, 0.4)) * 74;
      ctx.fillRect(bx, HORIZON - bh, 20, bh);
      ctx.fillStyle = PALETTE.cityLight;
      for (let wy = 0; wy < 3; wy += 1) {
        for (let wx = 0; wx < 2; wx += 1) {
          if ((i * 7 + wy * 3 + wx) % 3 === 0) ctx.fillRect(bx + 4 + wx * 8, HORIZON - bh + 6 + wy * 12, 3, 4);
        }
      }
      ctx.fillStyle = PALETTE.city;
    }
  }

  function seaAndShore(state) {
    // Sea with a glitter path under the sun.
    const g = ctx.createLinearGradient(0, HORIZON, 0, H);
    g.addColorStop(0, PALETTE.seaLight);
    g.addColorStop(0.35, PALETTE.sea);
    g.addColorStop(1, '#0d2a52');
    ctx.fillStyle = g;
    ctx.fillRect(0, HORIZON, W, H - HORIZON);
    ctx.save();
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = '#ffd9a0';
    for (let i = 0; i < 16; i += 1) {
      const y = HORIZON + 8 + i * 13;
      const w = 36 + i * 6;
      const x = CX - 260 + Math.sin(state.time * 1.3 + i * 2.4) * (4 + i * 0.5);
      ctx.fillRect(x - w / 2, y, w, 2);
    }
    ctx.restore();
    // A narrow sandy shore sweeping in from the right, and two green islands.
    ctx.fillStyle = PALETTE.sand;
    ctx.beginPath();
    ctx.moveTo(W, HORIZON + 60);
    ctx.quadraticCurveTo(1180, HORIZON + 140, 1200, H);
    ctx.lineTo(W, H);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = PALETTE.land;
    ctx.beginPath();
    ctx.ellipse(180, HORIZON + 150, 150, 34, -0.12, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(330, HORIZON + 250, 110, 26, 0.1, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.landDark;
    ctx.beginPath();
    ctx.ellipse(180, HORIZON + 142, 60, 16, -0.12, 0, Math.PI * 2);
    ctx.fill();
    // Palm dots on the islands.
    ctx.fillStyle = '#1c3d2c';
    for (let i = 0; i < 7; i += 1) {
      const px = 120 + i * 22;
      const py = HORIZON + 138 + ridge(i, 1.3, 0.7) * 10;
      ctx.fillRect(px, py - 8, 2, 8);
      ctx.beginPath();
      ctx.arc(px + 1, py - 10, 5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function runway(state) {
    // The runway converges on the horizon point ahead, swaying with heading and bank.
    const aheadX = CX + (state.heading - 42) * -4 + state.x * -120;
    const baseY = H + 40;
    const topY = HORIZON + 26;
    const topHalf = 7;
    const botHalf = 150;
    ctx.fillStyle = PALETTE.runway;
    ctx.beginPath();
    ctx.moveTo(aheadX - topHalf, topY);
    ctx.lineTo(aheadX + topHalf, topY);
    ctx.lineTo(aheadX + botHalf, baseY);
    ctx.lineTo(aheadX - botHalf, baseY);
    ctx.closePath();
    ctx.fill();
    // Centreline dashes, growing toward the camera.
    ctx.fillStyle = PALETTE.runwayLine;
    for (let i = 0; i < 7; i += 1) {
      const t = i / 7;
      const y = topY + (baseY - topY) * t * t;
      const half = topHalf + (botHalf - topHalf) * t * t;
      const x = aheadX + (CX - aheadX) * 0; // dashes stay on the strip centre
      ctx.fillRect(x - Math.max(1.5, half * 0.05), y, Math.max(3, half * 0.1), 10 + t * 26);
    }
    // Threshold bars and the big 04.
    ctx.fillStyle = PALETTE.runwayLine;
    ctx.fillRect(aheadX - topHalf - 14, topY + 4, 10, 4);
    ctx.fillRect(aheadX + topHalf + 4, topY + 4, 10, 4);
    ctx.font = `bold 18px ${FONT_MONO}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(245, 240, 220, 0.95)';
    ctx.fillText('04', aheadX, topY + 26);
    // Edge lights, amber, blinking gently.
    const blink = 0.55 + Math.sin(state.time * 3) * 0.25;
    ctx.fillStyle = `rgba(255, 179, 71, ${blink})`;
    for (let i = 0; i < 6; i += 1) {
      const t = i / 5;
      const y = topY + (baseY - topY) * t * t;
      const half = topHalf + (botHalf - topHalf) * t * t;
      ctx.beginPath();
      ctx.arc(aheadX - half, y, 3 + t * 2, 0, Math.PI * 2);
      ctx.arc(aheadX + half, y, 3 + t * 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  /** Project a world object (dz metres ahead, dx metres lateral, dy feet above plane) to screen. */
  function project(state, dz, dx, dyFt) {
    if (dz < 40) return null;
    const s = 1500 / dz;
    const x = CX + dx * s * 0.42 - state.x * 90 * (1 - dz / 4000);
    const y = HORIZON - (dyFt / 3.28) * s * 0.42 - 40 * (1 - dz / 4000);
    return { x, y, s };
  }

  function rings(state) {
    for (const ring of state.rings) {
      const dz = ring.z - state.distance;
      if (dz < 30 || dz > 4200) continue;
      const dx = (ring.x - state.x) * 260;
      const dy = ring.alt - state.alt;
      const p = project(state, dz, dx, dy);
      if (!p) continue;
      const r = Math.max(6, (COURSE.ringRadius * p.s * 0.42) / 1.6);
      const next = state.rings.find((q) => !q.passed) === ring;
      ctx.save();
      ctx.globalAlpha = ring.passed ? 0.25 : Math.max(0.35, Math.min(1, 1.6 - dz / 3000));
      ctx.lineWidth = Math.max(3, r * 0.12);
      ctx.strokeStyle = ring.perfect ? PALETTE.ringPerfect : PALETTE.ring;
      ctx.shadowColor = PALETTE.ring;
      ctx.shadowBlur = next ? 26 : 12;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.92, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = 0;
      ctx.lineWidth = Math.max(1.5, r * 0.045);
      ctx.strokeStyle = PALETTE.ringCore;
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r * 0.82, r * 0.75, 0, 0, Math.PI * 2);
      ctx.stroke();
      if (next && p.y > 90) {
        ctx.fillStyle = PALETTE.ringCore;
        ctx.font = `bold ${Math.max(11, Math.min(20, r * 0.28))}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillText(`RING ${ring.index + 1}`, p.x, p.y - r - 10);
        ctx.font = `${Math.max(10, Math.min(15, r * 0.2))}px ${FONT_MONO}`;
        ctx.fillStyle = PALETTE.hudDim;
        ctx.fillText(`${Math.round(dz)} m`, p.x, p.y + r + 18);
      }
      ctx.restore();
    }
  }

  function balloons(state) {
    for (const b of state.balloons) {
      const dz = b.z - state.distance;
      if (dz < 30 || dz > 3800) continue;
      const bob = Math.sin(state.time * 0.7 + b.bob) * 60;
      const p = project(state, dz, (b.x - state.x) * 260, (b.alt + bob) - state.alt);
      if (!p) continue;
      const r = Math.max(4, b.radius * p.s * 0.42 / 1.6);
      const hues = ['#ff5a5a', '#ffd166', '#7ec8ff', '#c084fc', '#ff8a4c'];
      ctx.save();
      ctx.globalAlpha = 0.95;
      ctx.fillStyle = hues[Math.floor(b.hue * hues.length) % hues.length];
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 1.15, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.ellipse(p.x - r * 0.3, p.y - r * 0.4, r * 0.3, r * 0.45, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#5a3a22';
      ctx.fillRect(p.x - r * 0.25, p.y + r * 1.15, r * 0.5, r * 0.4);
      ctx.restore();
    }
  }

  function nearClouds(state) {
    for (const c of state.clouds) {
      const dz = c.z - state.distance;
      if (dz < 30 || dz > 3600) continue;
      const p = project(state, dz, (c.x - state.x) * 260, c.alt - state.alt);
      if (!p) continue;
      const r = Math.max(8, c.radius * p.s * 0.42 / 1.6);
      ctx.save();
      ctx.globalAlpha = Math.max(0.25, Math.min(0.85, 1.4 - dz / 2600));
      ctx.fillStyle = '#e8d5e8';
      ctx.beginPath();
      ctx.ellipse(p.x, p.y, r, r * 0.42, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x - r * 0.5, p.y + r * 0.12, r * 0.6, r * 0.32, 0, 0, Math.PI * 2);
      ctx.ellipse(p.x + r * 0.5, p.y + r * 0.1, r * 0.55, r * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function plane(state) {
    // The courier jet, seen from behind and slightly above, banking with the turn.
    const px = CX;
    const py = 560;
    const bankRad = (state.bank / 180) * Math.PI;
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(bankRad * 0.9);
    // Engine glow.
    const glow = ctx.createRadialGradient(0, 18, 2, 0, 18, 60);
    glow.addColorStop(0, 'rgba(120, 200, 255, 0.75)');
    glow.addColorStop(1, 'rgba(120, 200, 255, 0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.ellipse(0, 26, 46, 34, 0, 0, Math.PI * 2);
    ctx.fill();
    // Wings.
    ctx.fillStyle = '#dfe6ef';
    ctx.beginPath();
    ctx.moveTo(-14, 6);
    ctx.lineTo(-168, 44);
    ctx.lineTo(-158, 62);
    ctx.lineTo(-10, 26);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(14, 6);
    ctx.lineTo(168, 44);
    ctx.lineTo(158, 62);
    ctx.lineTo(10, 26);
    ctx.closePath();
    ctx.fill();
    // Wingtip lights and accent stripes.
    ctx.fillStyle = PALETTE.planeAccent;
    ctx.fillRect(-168, 44, 12, 5);
    ctx.fillRect(156, 44, 12, 5);
    ctx.fillStyle = '#ff8a4c';
    ctx.fillRect(-120, 34, 60, 4);
    ctx.fillRect(60, 34, 60, 4);
    // Tail.
    ctx.fillStyle = PALETTE.planeAccent;
    ctx.beginPath();
    ctx.moveTo(-16, -58);
    ctx.lineTo(-34, -96);
    ctx.lineTo(-12, -96);
    ctx.lineTo(2, -62);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(16, -58);
    ctx.lineTo(34, -96);
    ctx.lineTo(12, -96);
    ctx.lineTo(-2, -62);
    ctx.closePath();
    ctx.fill();
    // Fuselage.
    const body = ctx.createLinearGradient(-16, 0, 16, 0);
    body.addColorStop(0, '#c8d2de');
    body.addColorStop(0.5, PALETTE.planeBody);
    body.addColorStop(1, '#9fb0c2');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.moveTo(0, -108);
    ctx.quadraticCurveTo(18, -60, 16, 10);
    ctx.quadraticCurveTo(14, 34, 0, 38);
    ctx.quadraticCurveTo(-14, 34, -16, 10);
    ctx.quadraticCurveTo(-18, -60, 0, -108);
    ctx.closePath();
    ctx.fill();
    // Lit cockpit glass and windows.
    ctx.fillStyle = PALETTE.planeGlass;
    ctx.beginPath();
    ctx.ellipse(0, -72, 9, 16, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(160, 220, 255, 0.85)';
    ctx.beginPath();
    ctx.ellipse(-3, -76, 3, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PALETTE.planeGlass;
    for (let i = 0; i < 4; i += 1) {
      ctx.beginPath();
      ctx.arc(-8 + i * 5.4, -38, 2.2, 0, Math.PI * 2);
      ctx.fill();
    }
    // Courier stripe and sun logo.
    ctx.fillStyle = PALETTE.planeAccent;
    ctx.fillRect(-13, -18, 26, 5);
    ctx.fillStyle = PALETTE.sunGlow;
    ctx.beginPath();
    ctx.arc(0, 2, 6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
    // Nav lights blinking.
    const blink = Math.sin(state.time * 6) > 0;
    if (blink) {
      ctx.fillStyle = '#ff5a5a';
      ctx.beginPath();
      ctx.arc(px - 158, py + 52, 3.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#37f2c8';
      ctx.beginPath();
      ctx.arc(px + 158, py + 52, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function cockpitFrame() {
    // A faint canopy frame so the view reads as a cockpit/chase view.
    const g = ctx.createRadialGradient(CX, 420, 260, CX, 420, 720);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(6, 10, 30, 0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = 'rgba(10, 16, 34, 0.55)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, H);
    ctx.moveTo(W, 0);
    ctx.lineTo(W, H);
    ctx.stroke();
  }

  function text(str, x, y, font, color, align = 'left') {
    ctx.font = font;
    ctx.textAlign = align;
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function panel(x, y, w, h) {
    ctx.fillStyle = PALETTE.panel;
    roundRect(ctx, x, y, w, h, 10);
    ctx.fill();
    ctx.strokeStyle = PALETTE.panelEdge;
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  function hud(state, timeLeft) {
    // Top bar: score, rings, clock, fuel.
    panel(16, 14, 1248, 54);
    text('SUNSET COURIER', 34, 48, `bold 22px ${FONT}`, PALETTE.hud);
    text('RING RUN · CORAL COAST', 250, 48, `13px ${FONT_MONO}`, PALETTE.hudDim);
    const rings = state.ringsHit;
    text(`RINGS  ${rings}/${COURSE.rings}`, 560, 48, `bold 20px ${FONT_MONO}`, PALETTE.hudGreen);
    text(`SCORE  ${state.score.toLocaleString('en-US')}`, 760, 48, `bold 20px ${FONT_MONO}`, PALETTE.hud);
    const t = Math.max(0, Math.ceil(timeLeft));
    const mm = Math.floor(t / 60);
    const ss = String(t % 60).padStart(2, '0');
    text(`${mm}:${ss}`, 1010, 48, `bold 22px ${FONT_MONO}`, t < 30 ? PALETTE.hudRed : PALETTE.hud);
    // Fuel bar.
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    roundRect(ctx, 1090, 28, 120, 12, 6);
    ctx.fill();
    ctx.fillStyle = state.fuel < 25 ? PALETTE.hudRed : PALETTE.hudAmber;
    roundRect(ctx, 1090, 28, 120 * (state.fuel / 100), 12, 6);
    ctx.fill();
    text('FUEL', 1220, 40, `11px ${FONT_MONO}`, PALETTE.hudDim);
    text(`${Math.round(state.fuel)}%`, 1220, 56, `12px ${FONT_MONO}`, PALETTE.hud);

    // Left: altitude tape.
    panel(16, 96, 132, 150);
    text('ALTITUDE', 30, 120, `11px ${FONT_MONO}`, PALETTE.hudDim);
    text(`${Math.round(state.alt).toLocaleString('en-US')}`, 30, 158, `bold 30px ${FONT_MONO}`, PALETTE.hud);
    text('FT', 30, 182, `12px ${FONT_MONO}`, PALETTE.hudDim);
    text(`CLIMB ${state.pitch >= 0 ? '+' : ''}${Math.round(state.pitch * 180)}`, 30, 210, `12px ${FONT_MONO}`, state.pitch >= 0 ? PALETTE.hudGreen : PALETTE.hudAmber);
    text('FT/MIN', 30, 230, `11px ${FONT_MONO}`, PALETTE.hudDim);

    // Left lower: speed.
    panel(16, 258, 132, 118);
    text('SPEED', 30, 282, `11px ${FONT_MONO}`, PALETTE.hudDim);
    text(`${Math.round(state.speed)}`, 30, 322, `bold 34px ${FONT_MONO}`, PALETTE.hud);
    text('KNOTS', 30, 348, `12px ${FONT_MONO}`, PALETTE.hudDim);
    const thr = Math.round(((state.speed - PLANE.minSpeed) / (PLANE.maxSpeed - PLANE.minSpeed)) * 100);
    ctx.fillStyle = 'rgba(255,255,255,0.15)';
    ctx.fillRect(30, 358, 104, 6);
    ctx.fillStyle = PALETTE.hudGreen;
    ctx.fillRect(30, 358, 104 * (thr / 100), 6);

    // Right: heading compass.
    panel(1132, 96, 132, 150);
    text('HEADING', 1146, 120, `11px ${FONT_MONO}`, PALETTE.hudDim);
    text(`${String(Math.round(state.heading)).padStart(3, '0')}°`, 1146, 158, `bold 30px ${FONT_MONO}`, PALETTE.hud);
    const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    text(dirs[Math.round(state.heading / 45) % 8], 1146, 182, `13px ${FONT_MONO}`, PALETTE.hudDim);
    // Compass strip.
    ctx.save();
    ctx.beginPath();
    ctx.rect(1146, 196, 104, 34);
    ctx.clip();
    for (let d = -60; d <= 60; d += 30) {
      const hdg = (Math.round(state.heading) + d + 360) % 360;
      const x = 1198 + d * 1.35;
      text(String(hdg).padStart(3, '0'), x, 220, `9px ${FONT_MONO}`, d === 0 ? PALETTE.hudAmber : PALETTE.hudDim, 'center');
      ctx.fillStyle = d === 0 ? PALETTE.hudAmber : PALETTE.hudDim;
      ctx.fillRect(x - 1, 196, 2, 6);
    }
    ctx.restore();
    // Artificial horizon.
    panel(1132, 258, 132, 118);
    text('ATTITUDE', 1146, 282, `11px ${FONT_MONO}`, PALETTE.hudDim);
    ctx.save();
    ctx.beginPath();
    ctx.arc(1198, 330, 34, 0, Math.PI * 2);
    ctx.clip();
    ctx.translate(1198, 330);
    ctx.rotate((-state.bank / 180) * Math.PI * 0.6);
    ctx.translate(0, state.pitch * 1.2);
    ctx.fillStyle = '#3a6fd8';
    ctx.fillRect(-40, -40, 80, 40);
    ctx.fillStyle = '#c47a2e';
    ctx.fillRect(-40, 0, 80, 40);
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(-40, -1, 80, 2);
    ctx.restore();
    ctx.strokeStyle = PALETTE.hud;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.arc(1198, 330, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PALETTE.hudAmber;
    ctx.fillRect(1188, 329, 20, 2);

    // Next-ring pointer: a chevron at the screen edge toward the next ring.
    const next = state.rings.find((r) => !r.passed);
    if (next) {
      const dx = (next.x - state.x) * 260;
      const dy = next.alt - state.alt;
      const dz = Math.max(60, next.z - state.distance);
      const px = CX + (dx / dz) * 620;
      const py = HORIZON - (dy / 3.28 / dz) * 620;
      const clampedX = Math.max(180, Math.min(W - 180, px));
      const clampedY = Math.max(120, Math.min(560, py));
      if (dz < 2400) {
        ctx.save();
        ctx.globalAlpha = 0.9;
        ctx.fillStyle = PALETTE.ring;
        ctx.beginPath();
        ctx.moveTo(clampedX, clampedY - 14);
        ctx.lineTo(clampedX + 12, clampedY + 8);
        ctx.lineTo(clampedX - 12, clampedY + 8);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
    }

    // Centre message.
    if (state.messageTime > 0 && state.message) {
      ctx.save();
      ctx.globalAlpha = Math.min(1, state.messageTime);
      text(state.message, CX, 96, `bold 24px ${FONT}`, '#ffffff', 'center');
      ctx.restore();
    }
    // Combo badge.
    if (state.combo >= 2) {
      text(`COMBO x${state.combo}`, CX, 660, `bold 18px ${FONT_MONO}`, PALETTE.ringPerfect, 'center');
    }
    // Ring flash.
    if (state.flash > 0) {
      ctx.fillStyle = `rgba(55, 242, 200, ${state.flash * 0.14})`;
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawWorld(state) {
    ctx.save();
    // The whole scene rolls a little with the bank.
    ctx.translate(CX, 470);
    ctx.rotate((-state.bank / 180) * Math.PI * 0.06);
    ctx.translate(-CX, -470);
    sky(state);
    farClouds(state);
    mountainsAndCity(state);
    seaAndShore(state);
    runway(state);
    nearClouds(state);
    rings(state);
    balloons(state);
    ctx.restore();
    plane(state);
    cockpitFrame();
  }

  function drawTitle(state, best) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(8, 12, 32, 0.42)';
    ctx.fillRect(0, 0, W, H);
    text('SUNSET COURIER', CX, 168, `bold 84px ${FONT}`, '#ffffff', 'center');
    text('— RING RUN OVER CORAL COAST —', CX, 208, `bold 20px ${FONT_MONO}`, PALETTE.hudAmber, 'center');
    text('Fly the sunset mail run: thread all 12 glowing rings,', CX, 268, `20px ${FONT}`, PALETTE.text, 'center');
    text('dodge balloons and storm clouds, then land on runway 04.', CX, 296, `20px ${FONT}`, PALETTE.text, 'center');
    panel(CX - 330, 330, 660, 148);
    text('STEER',  CX - 300, 366, `bold 15px ${FONT_MONO}`, PALETTE.hudGreen);
    text('← →  or  A / D  ·  mouse drag', CX - 190, 366, `16px ${FONT}`, PALETTE.text);
    text('CLIMB / DIVE', CX - 300, 400, `bold 15px ${FONT_MONO}`, PALETTE.hudGreen);
    text('↑ ↓  or  W / S', CX - 190, 400, `16px ${FONT}`, PALETTE.text);
    text('THROTTLE', CX - 300, 434, `bold 15px ${FONT_MONO}`, PALETTE.hudGreen);
    text('SHIFT faster  ·  Q slower  ·  P pause', CX - 190, 434, `16px ${FONT}`, PALETTE.text);
    text('Rings refill fuel. A perfect centre pass pays +150.', CX, 466, `14px ${FONT}`, PALETTE.muted, 'center');
    text('PRESS  SPACE  OR  CLICK  TO FLY', CX, 540, `bold 24px ${FONT}`, '#ffffff', 'center');
    if (best > 0) text(`BEST SCORE  ${best.toLocaleString('en-US')}`, CX, 584, `bold 18px ${FONT_MONO}`, PALETTE.hudAmber, 'center');
    text('ALT 1800 FT · SPD 210 KT · HDG 042° · RUNWAY 04 AHEAD', CX, 690, `13px ${FONT_MONO}`, PALETTE.hudDim, 'center');
  }

  function drawPaused(state) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(8, 12, 32, 0.55)';
    ctx.fillRect(0, 0, W, H);
    text('PAUSED', CX, 320, `bold 64px ${FONT}`, '#ffffff', 'center');
    text('Press P or Space to keep flying', CX, 372, `20px ${FONT}`, PALETTE.text, 'center');
    text(`SCORE ${state.score.toLocaleString('en-US')}  ·  RINGS ${state.ringsHit}/${COURSE.rings}`, CX, 412, `18px ${FONT_MONO}`, PALETTE.hudDim, 'center');
  }

  function drawOver(state, best) {
    drawWorld(state);
    ctx.fillStyle = 'rgba(8, 12, 32, 0.5)';
    ctx.fillRect(0, 0, W, H);
    if (state.landed) {
      text('✈  LANDED ON RUNWAY 04', CX, 210, `bold 58px ${FONT}`, PALETTE.hudGreen, 'center');
      text('The mail is through. Coral Coast thanks you, courier.', CX, 258, `20px ${FONT}`, PALETTE.text, 'center');
    } else {
      text('FLIGHT OVER', CX, 210, `bold 58px ${FONT}`, '#ffffff', 'center');
      text(state.message, CX, 258, `20px ${FONT}`, PALETTE.text, 'center');
    }
    panel(CX - 300, 300, 600, 210);
    text('FINAL SCORE', CX - 270, 344, `13px ${FONT_MONO}`, PALETTE.hudDim);
    text(`${state.score.toLocaleString('en-US')}`, CX - 270, 384, `bold 36px ${FONT_MONO}`, PALETTE.hud);
    text('BEST', CX + 60, 344, `13px ${FONT_MONO}`, PALETTE.hudDim);
    text(`${best.toLocaleString('en-US')}`, CX + 60, 384, `bold 36px ${FONT_MONO}`, PALETTE.hudAmber);
    text(`RINGS  ${state.ringsHit}/${COURSE.rings}`, CX - 270, 428, `17px ${FONT_MONO}`, PALETTE.hudGreen);
    text(`PERFECT  ${state.perfects}`, CX - 270, 458, `17px ${FONT_MONO}`, PALETTE.hudGreen);
    text(`BEST COMBO  x${state.bestCombo}`, CX + 60, 428, `17px ${FONT_MONO}`, PALETTE.text);
    text(`FUEL LEFT  ${Math.round(state.fuel)}%`, CX + 60, 458, `17px ${FONT_MONO}`, PALETTE.text);
    text('PRESS  SPACE  OR  CLICK  TO FLY AGAIN', CX, 566, `bold 22px ${FONT}`, '#ffffff', 'center');
  }

  function draw(state, screen, best, timeLeft) {
    resize();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = '#0b0f1e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(scale, 0, 0, scale, offsetX, offsetY);
    if (screen === SCREEN_TITLE) drawTitle(state, best);
    else if (screen === SCREEN_PAUSED) drawPaused(state);
    else if (screen === SCREEN_OVER) drawOver(state, best);
    else {
      drawWorld(state);
      hud(state, timeLeft);
    }
  }

  return { draw };
}
