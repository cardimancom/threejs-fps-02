// Boot and the one loop: fixed 60 Hz simulation feeding a render at the display's rate.
// ?shot=start|play|end with &seed=N sets up a deterministic frame for a capture, renders it
// twice, then freezes it and sets window.__shotReady.
import * as THREE from 'three';
import { PALETTE, hex } from './palette.js';
import { CONFIG } from './config.js';
import { createWorld } from './world.js';
import { createInput } from './input.js';
import { createPlayer } from './player.js';
import { createWeapon, raycastHit } from './weapons.js';
import { createBot } from './bots.js';
import { createRounds } from './rounds.js';
import { createHud } from './hud.js';
import { createEffects } from './effects.js';
import { createAudio } from './audio.js';

const FIXED_STEP = 1 / 60;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seed = Number.parseInt(params.get('seed') ?? '1', 10) || 1;

function mulberry32(initial) {
  let a = initial;
  return function random() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const random = mulberry32(seed);

// Renderer
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.5;
document.getElementById('game').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(hex(PALETTE.sky));
scene.fog = new THREE.Fog(new THREE.Color(hex(PALETTE.fog)), 35, 80);
const camera = new THREE.PerspectiveCamera(74, window.innerWidth / window.innerHeight, 0.05, 160);
scene.add(camera);

// Build world (default map = lab)
let world = createWorld(scene, 'lab');

// Effects + audio
const effects = createEffects(scene);
const audio = createAudio();

// HUD
const hud = createHud(document.body);

// Player + bots + rounds
let player = createPlayer(camera, world, 'blue');
let bots = [];
function spawnBots() {
  bots.forEach(b => b.dispose());
  bots = [];
  let bs = 1, rs = 0;       // blue spawn 0 taken by player
  for (let i = 0; i < CONFIG.teamSize - 1; i++) {
    const name = CONFIG.blueBotNames[i % CONFIG.blueBotNames.length];
    bots.push(createBot(scene, world, 'blue', name, bs++, 'rifle'));
  }
  for (let i = 0; i < CONFIG.teamSize; i++) {
    const name = CONFIG.redBotNames[i % CONFIG.redBotNames.length];
    bots.push(createBot(scene, world, 'red', name, rs++, 'rifle'));
  }
}
spawnBots();

const rounds = createRounds(player, bots, world);

// Input
const input = createInput(renderer.domElement, (locked) => {
  if (!locked && rounds.state.phase !== 'menu' && rounds.state.phase !== 'matchEnd') {
    // pause overlay (could be added); for now just freeze input
  }
});

// Raycaster (shared)
const raycaster = new THREE.Raycaster();
raycaster.far = 160;

// Blockers list for bot LOS checks (world colliders' meshes)
function blockerMeshes() {
  return world.colliders.map(c => c.mesh).filter(m => m);
}

// All actors for hit detection
function allActors() {
  return [player, ...bots];
}

// Player firing
function playerFire(now) {
  if (!player.state.alive) return;
  if (rounds.state.phase !== 'combat') return;
  const w = player.state.weapon;
  if (!w || !w.canFire(now)) return;
  w.fire(now);

  // Muzzle position
  const muzzle = w.muzzleWorld();
  // For first-person shots, raycast from camera position straight ahead
  const from = camera.getWorldPosition(new THREE.Vector3());
  const dir = camera.getWorldDirection(new THREE.Vector3()).negate().normalize();

  // Beam tracer visual
  // Compute end point: either hit point or far away
  const wDef = w.def;
  for (let p = 0; p < (wDef.pellets ?? 1); p++) {
    const d = dir.clone();
    // Apply spread
    const spread = wDef.spread;
    d.x += (Math.random() - 0.5) * spread * 2;
    d.y += (Math.random() - 0.5) * spread * 2;
    d.z += (Math.random() - 0.5) * spread * 2;
    d.normalize();

    const hit = raycastHit(raycaster, from, d, allActors(), wDef.range, player);
    let end;
    if (hit) {
      end = hit.point;
      // Apply damage
      const headshot = hit.headshot;
      const dmg = wDef.damage * (headshot ? 1 : 1);     // headshot multiplier applied in applyDamage
      const dead = hit.actor.applyDamage(dmg, headshot, player);
      effects.hitSpark(hit.point, wDef.trailColor);
      audio.play(headshot ? 'headshot' : 'hit');
      hud.showHitmarker(dead);
      if (dead) {
        effects.explosion(hit.actor.position.clone().setY(1), wDef.trailColor, 0.7);
        audio.play('death');
        const victimName = hit.actor.state?.name || hit.actor.team;
        rounds.addKill({ state: { name: 'You', team: 'blue' }, team: 'blue' }, { state: { name: victimName }, team: hit.actor.team }, wDef.name, headshot);
      }
    } else {
      // No actor hit — see if we hit world geometry (just for tracer length)
      raycaster.set(from, d);
      raycaster.far = wDef.range;
      const worldHits = raycaster.intersectObjects(blockerMeshes(), false);
      end = worldHits.length ? worldHits[0].point : from.clone().addScaledVector(d, wDef.range);
    }
    effects.beam(muzzle, end, wDef.trailColor, 0.06);
  }
  effects.muzzle(muzzle, wDef.color);
  audio.play(wDef.sound);

  // Recoil: push viewmodel + camera pitch up
  w.state.recoil += wDef.recoil;
}

// Bot firing (called from bot.tick when bot fires)
function onBotFire(bot, from, dir) {
  if (!bot.alive) return;
  const wDef = bot.state.weapon?.def;
  if (!wDef) return;

  for (let p = 0; p < (wDef.pellets ?? 1); p++) {
    const d = dir.clone();
    d.x += (Math.random() - 0.5) * wDef.spread * 2;
    d.y += (Math.random() - 0.5) * wDef.spread * 2;
    d.z += (Math.random() - 0.5) * wDef.spread * 2;
    d.normalize();

    const hit = raycastHit(raycaster, from, d, allActors(), wDef.range, bot);
    let end;
    if (hit) {
      end = hit.point;
      const dmg = wDef.damage;
      const dead = hit.actor.applyDamage(dmg, hit.headshot, bot);
      effects.hitSpark(hit.point, wDef.trailColor);
      if (dead) {
        effects.explosion(hit.actor.position.clone().setY(1), wDef.trailColor, 0.7);
        audio.play('death');
        const victimName = hit.actor.state?.name || hit.actor.team;
        rounds.addKill({ state: { name: bot.state.name, team: bot.team }, team: bot.team }, { state: { name: victimName }, team: hit.actor.team }, wDef.name, hit.headshot);
        if (hit.actor === player) {
          // Player died — release pointer lock
          document.exitPointerLock?.();
        }
      } else if (hit.actor === player) {
        audio.play('hit');
      }
    } else {
      raycaster.set(from, d);
      raycaster.far = wDef.range;
      const worldHits = raycaster.intersectObjects(blockerMeshes(), false);
      end = worldHits.length ? worldHits[0].point : from.clone().addScaledVector(d, wDef.range);
    }
    effects.beam(from.clone(), end, wDef.trailColor, 0.06);
  }
  effects.muzzle(from.clone().addScaledVector(dir, 0.6), wDef.color);
  audio.play(wDef.sound);
}

// Bot context
const botCtx = {
  raycaster,
  blockers: blockerMeshes(),
  actors: allActors(),
  onBotFire,
};

// Bomb plant
function tryPlantBomb() {
  if (rounds.state.phase !== 'combat') return;
  if (rounds.state.bombPlantedAt > 0) return;
  if (!player.state.hasBomb) return;
  if (!player.state.alive) return;
  // Check distance to a bomb site
  for (const site of world.bombSites) {
    if (player.position.distanceTo(site.pos) < site.radius) {
      rounds.state.bombPlantedAt = performance.now() / 1000;
      rounds.state.bombSite = site;
      player.state.hasBomb = false;
      audio.play('bombPlant');
      return;
    }
  }
}

// Bomb explosion check
function tickBomb(now) {
  if (rounds.state.bombPlantedAt > 0 && rounds.state.phase === 'combat') {
    const elapsed = now - rounds.state.bombPlantedAt;
    // Tick sound every second
    const lastTick = Math.floor(elapsed - 1);
    const curTick = Math.floor(elapsed);
    if (curTick > lastTick && elapsed < 35) audio.play('bombTick');
    if (elapsed >= 35) {
      // Boom!
      const site = rounds.state.bombSite;
      const boomPos = site?.pos.clone().setY(1) ?? new THREE.Vector3();
      effects.explosion(boomPos, 0xff5533, 4);
      audio.play('explosion');
      // Kill anyone within radius
      const RADIUS = 8;
      for (const a of allActors()) {
        if (a.alive && a.position.distanceTo(boomPos) < RADIUS) {
          a.applyDamage(200, false, null);
        }
      }
    }
  }
}

// ===== Game loop =====
let lastTime = performance.now() / 1000;
let acc = 0;
let started = false;
let shotFramesRendered = 0;

function loop() {
  requestAnimationFrame(loop);
  const now = performance.now() / 1000;
  let dt = now - lastTime;
  lastTime = now;
  if (dt > 0.25) dt = 0.25;     // clamp after stalls

  // For shot mode: skip game logic, render and finish
  if (shot) {
    if (shotFramesRendered < 2) {
      renderer.render(scene, camera);
      shotFramesRendered++;
    } else {
      window.__shotReady = true;
    }
    return;
  }

  // Audio resume on first interaction
  if (input.locked && !started) {
    audio.resume();
    started = true;
    if (rounds.state.phase === 'menu') {
      rounds.startMatch();
    }
  }

  // Buy menu toggling
  if (input.buyToggle) {
    input.buyToggle = false;
    if (rounds.state.phase === 'buy') {
      const show = hud.dom.buyMenu.style.display === 'none' || !hud.dom.buyMenu.style.display;
      hud.showBuyMenu(show);
      if (show) hud.buildBuyMenu(player, (kind, id) => {
        if (kind === 'weapon') player.buyWeapon(id);
        else player.buyEquipment(id);
        hud.buildBuyMenu(player, () => {});
        audio.play('buy');
      });
    }
  }
  // Tab scoreboard
  hud.showScoreboard(input.scoreboard);
  if (input.scoreboard) hud.updateScoreboard(player, bots, rounds);

  // Plant bomb
  if (input.plantRequest) {
    input.plantRequest = false;
    tryPlantBomb();
  }

  // Switch weapon slot
  if (input.weaponSlot >= 0 && input.weaponSlot !== player.state._lastSlot) {
    player.state._lastSlot = input.weaponSlot;
    player.switchSlot(input.weaponSlot);
    audio.play('ui');
  }

  // Reload
  if (input.reloadRequest) {
    input.reloadRequest = false;
    player.state.weapon?.startReload(now);
    audio.play('reload');
  }

  // Footstep audio
  if (player.state._footstep) {
    player.state._footstep = false;
    audio.play('footstep');
  }

  // Firing
  if (input.mouse.left && input.locked) {
    playerFire(now);
  }

  // Scope toggle (right mouse)
  if (input.mouse.right && player.state.weapon) {
    player.state.weapon.setScoped(true);
  } else if (player.state.weapon) {
    player.state.weapon.setScoped(false);
  }
  // Adjust FOV for scope
  const targetFov = (player.state.weapon?.isScoped?.()) ? 74 / (player.state.weapon?.scopeFactor?.() ?? 1) : 74;
  camera.fov += (targetFov - camera.fov) * 0.15;
  camera.updateProjectionMatrix();

  // Fixed-step simulation
  acc += dt;
  while (acc >= FIXED_STEP) {
    step(FIXED_STEP, now);
    acc -= FIXED_STEP;
  }

  // Effects always tick
  effects.update(dt);

  // Render
  renderer.render(scene, camera);

  // Update HUD
  hud.update(player, rounds, now);

  // Phase transitions
  if (rounds.state.phase === 'roundEnd') {
    hud.showRoundEnd(true, rounds.state.lastWinner, rounds.state.lastReason);
  } else {
    hud.showRoundEnd(false);
  }
  if (rounds.state.phase === 'matchEnd') {
    hud.showMatchEnd(true, rounds.state.blueScore, rounds.state.redScore);
  } else {
    hud.showMatchEnd(false);
  }
}

function step(dt, now) {
  // Tick player
  player.tick(input, dt, now);

  // Refresh bot context (actors/blockers may have changed)
  botCtx.actors = allActors();
  botCtx.blockers = blockerMeshes();

  // Tick bots
  for (const b of bots) b.tick(dt, now, botCtx);

  // Tick rounds (phase transitions, win checks)
  rounds.tick(now);

  // Bomb
  tickBomb(now);

  // Rotate crystal on alien map (visual)
  // (find the crystal in scene; not strictly necessary — skipped for perf)
}

// Resize
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start button
hud.dom.playBtn.addEventListener('click', () => {
  hud.showStartMenu(false);
  renderer.domElement.requestPointerLock?.();
});

// Restart
hud.dom.meRestart.addEventListener('click', () => {
  // Full reload of game state
  location.reload();
});

// Buy close button
hud.dom.buyClose.addEventListener('click', () => hud.showBuyMenu(false));

// Screenshot mode: set up a frame based on ?shot=
if (shot) {
  if (shot === 'start') {
    // Show start menu as the cover
    hud.showStartMenu(true);
  } else if (shot === 'play') {
    hud.showStartMenu(false);
    // Set up a gameplay scene: skip buy, go to combat, position camera at a good vantage
    rounds.state.phase = 'combat';
    rounds.state.phaseStart = performance.now() / 1000;
    rounds.state.phaseEnd = rounds.state.phaseStart + 60;
    // Position camera at a spot that shows the map and a bot
    camera.position.set(-6, 1.7, 5);
    const lookAt = new THREE.Vector3(0, 1.5, -3);
    camera.lookAt(lookAt);
    // Make first bot visible in view
    const botsAlive = bots.filter(b => b.alive);
    if (botsAlive.length) {
      const target = botsAlive[0];
      target.group.position.set(0, 0, -3);
      target.state.position.copy(target.group.position);
      camera.lookAt(target.position.clone().setY(1.4));
    }
    // Add some weapon ammo/money state
    player.state.money = 5400;
    player.state.weapon.state.mag = 24;
    player.state.weapon.state.reserve = 67;
    player.state.health = 78;
    player.state.armor = 50;
    // Add a kill feed entry
    rounds.state.killFeed.unshift({
      killer: 'Vega', victim: 'Cipher', weapon: 'Plasma Carbine', headshot: true,
      killerTeam: 'blue', time: performance.now() / 1000,
    });
  } else if (shot === 'end') {
    hud.showStartMenu(false);
    rounds.state.phase = 'matchEnd';
    rounds.state.blueScore = CONFIG.roundsToWin;
    rounds.state.redScore = CONFIG.roundsToWin - 3;
    hud.showMatchEnd(true, rounds.state.blueScore, rounds.state.redScore);
  } else if (shot === 'buy') {
    hud.showStartMenu(false);
    rounds.state.phase = 'buy';
    rounds.state.phaseStart = performance.now() / 1000;
    rounds.state.phaseEnd = rounds.state.phaseStart + 30;
    player.state.money = 3500;
    hud.showBuyMenu(true);
    hud.buildBuyMenu(player, () => {});
  }
}

// Start
if (!shot) hud.showStartMenu(true);

// Debug expose for inspection
window.__game = { renderer, scene, camera, world, player, bots, rounds, hud, effects, input };

loop();
