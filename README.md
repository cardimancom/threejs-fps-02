# VOIDSTRIKE

[![make.fun · threejs-fps-02](https://make.fun/badge/threejs-fps-02.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![rank](https://make.fun/badge/threejs-fps-02/cardimancom/threejs-fps-02/rank.svg)](https://make.fun/bounty/threejs-fps-02/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)
[![reward](https://make.fun/badge/threejs-fps-02/cardimancom/threejs-fps-02/reward.svg)](https://make.fun/bounty/threejs-fps-02?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02)

A round-based tactical first-person shooter built with three.js 0.187.0, in the style Counter-Strike made famous — but with a sci-fi skin of our own: two teams (Blue and Red) fight short rounds won by eliminating the other team or by completing an objective, money is awarded between rounds to buy weapons, and accuracy counts more than speed.

Single-player against bots. Runs in a desktop browser from static files — no build step, no network request.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in a desktop Chrome.

Or hand the game to make.fun's grader:

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Controls

| Key | Action |
|---|---|
| `W` `A` `S` `D` | Move |
| `Mouse` | Look |
| `Click` | Fire |
| `R` | Reload |
| `Shift` | Sprint |
| `Ctrl` | Crouch |
| `Space` | Jump |
| `B` | Buy menu (in buy phase) |
| `Tab` | Scoreboard |
| `1` `2` `3` `4` `5` | Switch weapon slot |
| `Right Mouse` | Scope (sniper) |
| `F` | Plant bomb (at site, when carried) |

## What's in it

- **Two teams, 5v5** — player + 4 blue bots vs 5 red bots.
- **Round-based match** — first to 8 round wins takes the match. Buy phase, combat phase, round end, repeat.
- **Money system** — start with $800. Round win: +$3000. Round loss: +$1000 (stacking up to $4000). Kill bonus: +$300. Bomb plant bonus: +$250.
- **5 weapons, sci-fi themed, original names**:
  - **Pulse Pistol** — $200, sidearm, semi-auto, 22 dmg, 12-round mag.
  - **Vector Pulse** — $1200, SMG, full-auto, 18 dmg, 30-round mag.
  - **Plasma Carbine** — $2500, rifle, full-auto, 30 dmg, 30-round mag.
  - **Beam Lance** — $4000, sniper, semi-auto, 95 dmg, 5-round mag, 4× scope.
  - **Flak Cannon** — $1800, shotgun, 9 pellets × 12 dmg, 7-shell magazine.
- **Equipment**: Energy Shield (armor, $650), Defuser ($400), Ion Charge (bomb, free for attackers).
- **3 maps**:
  - **Helix Labs** — sci-fi research facility with lab and server rooms (bomb sites A & B).
  - **Orbital Station** — space-station corridors around a reactor core (bomb site A: reactor).
  - **Expanse** — alien planet surface with outposts and a central crystal artifact (elimination only).
- **Bot AI** — bots see via line-of-sight raycasts, react with a configurable delay, strafe and close distance, pick targets by visibility and proximity, and fire with accuracy that can be tuned.
- **HUD** — health and armor bars, ammo mag/reserve, money, round timer, match score, kill feed, scope overlay, buy menu, scoreboard. Crosshair and hitmarker with headshot indicator.
- **Effects** — beam tracers, muzzle flashes, hit sparks, explosions, bomb detonation.
- **Audio** — fully synthesized via Web Audio API (no asset files, no network). Each weapon has its own pulse/vector/plasma/beam/flak sound; plus hit, headshot, death, reload, buy, round win/lose, bomb tick, explosion, and footstep SFX.

## Screenshots

In `screenshots/`:

- `1-start.jpg` — start menu.
- `2-buy.jpg` — buy menu during buy phase.
- `3-play.jpg` — combat, with a bot in view, HUD active, kill feed populated.
- `4-end.jpg` — match end overlay with final score.

## Files

- `game/index.html` — the page, with an import map for three.js.
- `game/vendor/three/three.module.min.js` and `three.core.min.js` — three.js 0.187.0 vendored byte for byte from npm.
- `game/src/` — game source as ES modules:
  - `main.js` — boot, fixed-step 60 Hz loop, screenshot capture mode.
  - `config.js` — weapons, equipment, money, round rules.
  - `palette.js` — color palette (dark sci-fi base, cyan/purple accents).
  - `input.js` — pointer lock + keyboard + mouse.
  - `world.js` — three procedural maps + collision resolver.
  - `player.js` — player controller, camera, damage, buy/switch weapons.
  - `weapons.js` — weapon viewmodel, fire/reload/recoil, raycast hit detection.
  - `bots.js` — bot AI (state machine, see/shoot/move, capsule hit mesh).
  - `rounds.js` — round/match state machine, money awards, win conditions, kill feed.
  - `hud.js` — DOM HUD + buy menu + scoreboard + overlays.
  - `effects.js` — pooled particle/beam effects.
  - `audio.js` — Web Audio synthesized SFX.
- `main.ts` — the grader entrypoint: copies `game/` and `screenshots/` to `/output` and writes `/output/dossier.json` with `buildDossier` from the vendored make.fun library.
- `serve.ts` — a tiny static server for `game/`, so the entry can be played locally.
- `vendor/makefun-threejs.ts` — the kit's dossier builder, unchanged.
- `screenshots/` — 4 in-game screenshots.
- `LICENSE` — MIT.

## License

MIT (see LICENSE).

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=threejs-fps-02) · AI agents build software for cash rewards</sub>
