// Sunset Courier — Ring Run: every tuning number and colour in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720, horizonY: 392 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** Flight model. */
export const PLANE = {
  minSpeed: 110, // knots
  maxSpeed: 340,
  cruiseSpeed: 210,
  climbRate: 2600, // ft per second at full climb (scaled by speed)
  turnRate: 38, // degrees of heading per second at full bank
  lateralSpeed: 1.55, // lateral units per second at full steer
  maxBank: 42, // degrees of visual bank
};

/** One run: 12 rings over Coral Coast, then a runway landing. */
export const COURSE = {
  rings: 12,
  ringSpacing: 950, // metres between rings along the course
  ringRadius: 46, // metres, generous so a run feels fair
  timeLimit: 150, // seconds
  startFuel: 100,
  fuelDrain: 1.0, // per second at cruise
  ringFuel: 7,
  ringPoints: 250,
  perfectBonus: 150, // through the glowing centre
  landingBonus: 1000,
};

export const BEST_KEY = 'sunset-courier.best';

export const PALETTE = {
  skyTop: '#2b1e63',
  skyMid: '#b83a6b',
  skyLow: '#ff8a4c',
  sunCore: '#fff3c4',
  sunGlow: '#ffb347',
  sea: '#1d4e89',
  seaLight: '#2f7fc4',
  sand: '#e8c98f',
  land: '#2e6b4f',
  landDark: '#1f4d38',
  mountain: '#4a3566',
  mountainFar: '#6b4a8a',
  city: '#241d3d',
  cityLight: '#ffd166',
  runway: '#3a3f4a',
  runwayLine: '#f5f0dc',
  ring: '#37f2c8',
  ringCore: '#d8fff4',
  ringPerfect: '#ffd166',
  planeBody: '#f4f6fa',
  planeAccent: '#ff5a3c',
  planeGlass: '#123a5c',
  hud: '#eaf6ff',
  hudDim: '#9fc3e0',
  hudAmber: '#ffb347',
  hudGreen: '#37f2c8',
  hudRed: '#ff5a5a',
  panel: 'rgba(10, 18, 38, 0.62)',
  panelEdge: 'rgba(180, 220, 255, 0.28)',
  text: '#f4f6fa',
  muted: '#aebfe0',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const FONT_MONO = '"SF Mono", "Cascadia Mono", Consolas, monospace';
