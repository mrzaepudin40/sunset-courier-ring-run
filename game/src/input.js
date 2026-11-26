// Keyboard and mouse input for a flight game. Held keys steer and climb/dive;
// one-shot presses (start, restart, pause) are queued as bit flags and taken once
// by the loop, so a press between two frames is never lost or counted twice.
// Mouse: hold and drag to steer toward the pointer; click also confirms.

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;

const LEFT = new Set(['ArrowLeft', 'KeyA']);
const RIGHT = new Set(['ArrowRight', 'KeyD']);
const UP = new Set(['ArrowUp', 'KeyW']);
const DOWN = new Set(['ArrowDown', 'KeyS']);
const THROTTLE_UP = new Set(['ShiftLeft', 'ShiftRight', 'KeyE']);
const THROTTLE_DOWN = new Set(['KeyQ']);
const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);

export function createInput(target) {
  const keys = new Set();
  let actions = 0;
  let mouseX = 0;
  let mouseY = 0;
  let mouseDown = false;
  let mouseSeen = false;

  window.addEventListener('keydown', (event) => {
    if (LEFT.has(event.code) || RIGHT.has(event.code) || UP.has(event.code) || DOWN.has(event.code)
      || THROTTLE_UP.has(event.code) || THROTTLE_DOWN.has(event.code)) {
      keys.add(event.code);
      event.preventDefault();
    } else if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
      event.preventDefault();
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
      event.preventDefault();
    }
  });
  window.addEventListener('keyup', (event) => keys.delete(event.code));
  window.addEventListener('blur', () => { keys.clear(); mouseDown = false; });

  function track(event) {
    const rect = target.getBoundingClientRect();
    mouseX = (event.clientX - rect.left) / rect.width;
    mouseY = (event.clientY - rect.top) / rect.height;
    mouseSeen = true;
  }
  target.addEventListener('pointermove', track);
  target.addEventListener('pointerdown', (event) => {
    track(event);
    mouseDown = true;
    actions |= ACTION_CONFIRM;
  });
  window.addEventListener('pointerup', () => { mouseDown = false; });

  const has = (set) => { for (const code of set) if (keys.has(code)) return true; return false; };

  return {
    /** -1 left, 1 right, 0 neither or both. Mouse drag adds a proportional steer. */
    steer() {
      let value = (has(RIGHT) ? 1 : 0) - (has(LEFT) ? 1 : 0);
      if (mouseDown && mouseSeen) value += Math.max(-1, Math.min(1, (mouseX - 0.5) * 2.4));
      return Math.max(-1, Math.min(1, value));
    },
    /** -1 dive, 1 climb. */
    pitch() {
      let value = (has(UP) ? 1 : 0) - (has(DOWN) ? 1 : 0);
      if (mouseDown && mouseSeen) value += Math.max(-1, Math.min(1, (0.5 - mouseY) * 2.2));
      return Math.max(-1, Math.min(1, value));
    },
    /** -1 slower, 1 faster. */
    throttle() {
      return (has(THROTTLE_UP) ? 1 : 0) - (has(THROTTLE_DOWN) ? 1 : 0);
    },
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
  };
}
