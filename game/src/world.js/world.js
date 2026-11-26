// The flight rules and state, with no drawing and no browser in it: the plane,
// the ring course over Coral Coast, balloons and storm clouds, fuel, time and
// score. step() advances one fixed step and returns what happened as bit flags,
// so the caller can react without the world knowing about screens or sound.
// Nothing here allocates after createWorld returns.

import { COURSE, FIELD, PLANE, STEP } from './config.js';

export const EVENT_RING = 1;
export const EVENT_PERFECT = 2;
export const EVENT_BUMP = 4;
export const EVENT_OVER = 8;
export const EVENT_LANDED = 16;

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

/** A ring the plane must fly through: x is lateral (-1..1), alt is feet, z is metres ahead. */
function makeRing(random, index, spacing) {
  return {
    index,
    x: (random() * 2 - 1) * 0.72,
    alt: 900 + random() * 2600,
    z: 1200 + index * spacing,
    passed: false,
    perfect: false,
  };
}

function makeBalloon(random, z) {
  return {
    x: (random() * 2 - 1) * 0.9,
    alt: 700 + random() * 2800,
    z,
    radius: 26 + random() * 14,
    hue: random(),
    bob: random() * Math.PI * 2,
  };
}

function makeCloud(random, z) {
  return {
    x: (random() * 2 - 1) * 0.95,
    alt: 1500 + random() * 2200,
    z,
    radius: 70 + random() * 60,
    seed: random() * 100,
  };
}

export function createWorld(random) {
  const state = {
    time: 0,
    distance: 0, // metres flown along the course
    x: 0, // lateral position, -1..1
    alt: 1800, // feet
    speed: PLANE.cruiseSpeed, // knots
    heading: 42, // degrees, the runway heading for Coral Coast
    bank: 0,
    pitch: 0,
    fuel: COURSE.startFuel,
    score: 0,
    ringsHit: 0,
    perfects: 0,
    combo: 0,
    bestCombo: 0,
    over: false,
    landed: false,
    won: false,
    message: '',
    messageTime: 0,
    flash: 0, // 1 right after a ring, fades out
    rings: [],
    balloons: [],
    clouds: [],
    cloudsFar: [],
    seed: 0,
  };

  function buildCourse() {
    state.rings = [];
    for (let i = 0; i < COURSE.rings; i += 1) state.rings.push(makeRing(random, i, COURSE.ringSpacing));
    state.balloons = [];
    for (let i = 0; i < 9; i += 1) state.balloons.push(makeBalloon(random, 2200 + i * 1300 + random() * 500));
    state.clouds = [];
    for (let i = 0; i < 14; i += 1) state.clouds.push(makeCloud(random, 800 + i * 900));
    state.cloudsFar = [];
    for (let i = 0; i < 26; i += 1) {
      state.cloudsFar.push({ x: (random() * 2 - 1), y: 40 + random() * 180, s: 0.5 + random() * 1.3, speed: 2 + random() * 5 });
    }
  }

  function reset() {
    state.time = 0;
    state.distance = 0;
    state.x = 0;
    state.alt = 1800;
    state.speed = PLANE.cruiseSpeed;
    state.heading = 42;
    state.bank = 0;
    state.pitch = 0;
    state.fuel = COURSE.startFuel;
    state.score = 0;
    state.ringsHit = 0;
    state.perfects = 0;
    state.combo = 0;
    state.bestCombo = 0;
    state.over = false;
    state.landed = false;
    state.won = false;
    state.message = 'Fly through the rings, then land on runway 04';
    state.messageTime = 4;
    state.flash = 0;
    buildCourse();
  }

  reset();

  /** Advance one fixed step. steer/pitch/throttle are -1..1. Returns event flags. */
  function step(dt, steer, pitch, throttle, demo) {
    if (state.over) return EVENT_OVER;
    let events = 0;
    state.time += dt;
    state.flash = Math.max(0, state.flash - dt * 1.4);
    state.messageTime = Math.max(0, state.messageTime - dt);

    // Throttle and speed: speed chases its target; climbing costs speed.
    const targetSpeed = PLANE.cruiseSpeed + throttle * 95 - (pitch > 0 ? pitch * 30 : 0);
    state.speed += clamp(targetSpeed - state.speed, -90 * dt, 60 * dt);
    state.speed = clamp(state.speed, PLANE.minSpeed, PLANE.maxSpeed);

    // Banking turns the plane and moves it sideways; pitch changes altitude.
    const bankTarget = steer * PLANE.maxBank;
    state.bank += clamp(bankTarget - state.bank, -160 * dt, 160 * dt);
    state.heading = (state.heading + (state.bank / PLANE.maxBank) * PLANE.turnRate * dt + 360) % 360;
    state.x = clamp(state.x + steer * PLANE.lateralSpeed * dt * (0.55 + state.speed / 400), -1.15, 1.15);
    state.pitch += clamp(pitch * 14 - state.pitch, -60 * dt, 60 * dt);
    state.alt += state.pitch * (PLANE.climbRate / 14) * dt * (state.speed / PLANE.cruiseSpeed);
    state.alt = clamp(state.alt, 120, 5200);

    // Forward motion: knots to metres per second is roughly / 1.944.
    const forward = (state.speed / 1.944) * dt;
    state.distance += forward;

    // Fuel and the clock end a run.
    state.fuel = Math.max(0, state.fuel - COURSE.fuelDrain * dt * (0.7 + state.speed / 400));
    const timeLeft = COURSE.timeLimit - state.time;
    if (state.fuel <= 0 || timeLeft <= 0) {
      state.over = true;
      state.won = false;
      state.message = state.fuel <= 0 ? 'Out of fuel!' : 'Time up!';
      return EVENT_OVER;
    }

    // Rings: crossing a ring's z tests the lateral and altitude gap.
    for (let i = 0; i < state.rings.length; i += 1) {
      const ring = state.rings[i];
      if (ring.passed) continue;
      const dz = ring.z - state.distance;
      if (dz > 0) break; // rings are ordered along the course
      ring.passed = true;
      const dx = Math.abs(state.x - ring.x) * 260; // lateral metres at ring scale
      const dy = Math.abs(state.alt - ring.alt);
      const gap = Math.sqrt(dx * dx + dy * dy);
      if (gap < COURSE.ringRadius) {
        const perfect = gap < COURSE.ringRadius * 0.38;
        ring.perfect = perfect;
        state.ringsHit += 1;
        state.combo += 1;
        state.bestCombo = Math.max(state.bestCombo, state.combo);
        if (perfect) state.perfects += 1;
        const gained = COURSE.ringPoints + (perfect ? COURSE.perfectBonus : 0) + state.combo * 25;
        state.score += gained;
        state.fuel = Math.min(100, state.fuel + COURSE.ringFuel);
        state.flash = 1;
        state.message = perfect
          ? `PERFECT RING! +${gained}  (combo x${state.combo})`
          : `Ring ${state.ringsHit}/${COURSE.rings}  +${gained}`;
        state.messageTime = 2.2;
        events |= EVENT_RING | (perfect ? EVENT_PERFECT : 0);
      } else {
        state.combo = 0;
        state.message = 'Missed a ring — keep flying, the runway is ahead';
        state.messageTime = 2;
      }
    }

    // Balloons and storm clouds: a bump costs fuel and breaks the combo.
    for (let i = 0; i < state.balloons.length; i += 1) {
      const b = state.balloons[i];
      if (Math.abs(b.z - state.distance) > 60) continue;
      const dx = Math.abs(state.x - b.x) * 260;
      const dy = Math.abs(state.alt - (b.alt + Math.sin(state.time * 0.7 + b.bob) * 60));
      if (Math.sqrt(dx * dx + dy * dy) < b.radius + 26) {
        state.fuel = Math.max(0, state.fuel - 8);
        state.combo = 0;
        state.message = 'Balloon bump! −8 fuel';
        state.messageTime = 1.6;
        events |= EVENT_BUMP;
        b.z = -99999; // each balloon bumps once
      }
    }
    for (let i = 0; i < state.clouds.length; i += 1) {
      const c = state.clouds[i];
      if (Math.abs(c.z - state.distance) > 70) continue;
      const dx = Math.abs(state.x - c.x) * 260;
      const dy = Math.abs(state.alt - c.alt);
      if (Math.sqrt(dx * dx + dy * dy) < c.radius * 0.55) {
        state.fuel = Math.max(0, state.fuel - 4);
        state.combo = 0;
        state.message = 'Storm cloud! −4 fuel';
        state.messageTime = 1.4;
        events |= EVENT_BUMP;
        c.z = -99999;
      }
    }

    // The runway: after the last ring, landing on the strip ends the run a winner.
    const courseEnd = COURSE.rings * COURSE.ringSpacing + 1200;
    if (state.distance >= courseEnd && !demo) {
      state.over = true;
      state.landed = true;
      state.won = true;
      const landing = COURSE.landingBonus + Math.round(state.fuel) * 5 + state.ringsHit * 50;
      state.score += landing;
      state.message = `Landed on runway 04! +${landing}`;
      state.messageTime = 5;
      return EVENT_OVER | EVENT_LANDED;
    }
    return events;
  }

  /** The next ring still ahead, or null once the course is done. */
  function nextRing() {
    for (let i = 0; i < state.rings.length; i += 1) {
      if (!state.rings[i].passed) return state.rings[i];
    }
    return null;
  }

  function timeLeft() { return Math.max(0, COURSE.timeLimit - state.time); }

  return { state, reset, step, nextRing, timeLeft };
}

// Re-exported for the autopilot and the HUD.
export { FIELD, STEP };
