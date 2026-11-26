# Sunset Courier — Ring Run

A complete original flight game for the make.fun "Make the best flight game"
bounty. Fly the sunset mail run over Coral Coast: thread all 12 glowing rings,
dodge hot-air balloons and storm clouds, mind your fuel and the clock, then
land on runway 04.

## Play

Serve it locally, then open http://localhost:8080:

```sh
node serve.ts
```

- **Steer:** Arrow keys / A D, or hold and drag with the mouse
- **Climb / dive:** Arrow Up / Down, or W / S
- **Throttle:** Shift to speed up, Q to slow down
- **Pause:** P or Esc · **Start / restart:** Space or click

The HUD shows altitude (feet), speed (knots) and heading on a compass strip,
plus an artificial horizon, fuel, the clock, rings and score. A perfect pass
through a ring's glowing centre pays +150 and builds a combo; every ring
refills fuel. Landing on runway 04 pays a landing bonus.

## Screenshots

`shots.json` lists the four staged scenes (`?shot=start|play|runway|end`,
seed 1). Each is a real render of the game's own code, played forward by an
autopilot under the real rules — the same seed always gives the same frame.

## Files

- `main.ts` — Node 22 program: copies `game/` and `screenshots/` to
  `/output` and writes `dossier.json` with the vendored make.fun library.
- `game/` — the playable game as static files: `index.html` plus ES modules
  under `src/`. No network request, no library, no build step. Sound is
  synthesised with WebAudio.
- `vendor/makefun-game.ts` — the kit's copy, unchanged.
- `screenshots/` — 4 real renders of the game (first by name is the cover).

## License

MIT. See `LICENSE`.
