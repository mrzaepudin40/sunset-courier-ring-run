// The screenshot scenes behind ?shot=start|play|runway|end. Each one plays the
// real rules forward from a fresh world for a fixed number of steps, steered by a
// simple autopilot (steer and climb toward the next ring, ease off when close),
// so the frame is what a short game really looks like and the same seed always
// gives the same frame.
import { STEP } from './config.js';
import { EVENT_OVER } from './world.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const START_SECONDS = 6;
const PLAY_SECONDS = 24;
const RUNWAY_SECONDS = 52;
const END_LIMIT_SECONDS = 400;
const SAMPLE = 1 / 30;

/** Steer and climb toward the next ring; throttle gently when far behind it. */
function autopilot(state) {
  const ring = state.rings.find((r) => !r.passed);
  if (!ring) return { steer: 0, pitch: -0.4, throttle: 0 };
  const dx = ring.x - state.x;
  const dy = ring.alt - state.alt;
  return {
    steer: Math.max(-1, Math.min(1, dx * 2.2)),
    pitch: Math.max(-1, Math.min(1, dy / 900)),
    throttle: ring.z - state.distance > 3000 ? 0.6 : 0,
  };
}

function flyFor(world, seconds, pilot) {
  for (let i = 0; i < seconds / SAMPLE; i += 1) {
    const c = pilot ? autopilot(world.state) : { steer: 0, pitch: 0, throttle: 0 };
    const steps = Math.round(SAMPLE / STEP);
    for (let s = 0; s < steps; s += 1) {
      if (world.step(STEP, c.steer, c.pitch, c.throttle, false) & EVENT_OVER) return true;
    }
  }
  return false;
}

/**
 * Set `world` to the named scene and return the screen to draw over it and the
 * best score to show. start: the title over a live coast. play: mid-course,
 * threading a ring with the runway ahead. runway: low over the strip, rings
 * nearly done. end: the run played to its end (landed or out of fuel/time).
 */
export function stageShot(name, world) {
  world.reset();
  if (name !== 'play' && name !== 'runway' && name !== 'end') {
    flyFor(world, START_SECONDS, false);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    flyFor(world, PLAY_SECONDS, true);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  if (name === 'runway') {
    flyFor(world, RUNWAY_SECONDS, true);
    return { screen: SCREEN_PLAY, best: world.state.score };
  }
  const over = flyFor(world, END_LIMIT_SECONDS, true);
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: world.state.score };
}
