// Bots: simple AI actors on both teams. Each has a hitMesh for raycasting,
// health, a weapon, and a state machine: IDLE / ENGAGE / DEAD.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PALETTE, hex } from './palette.js';
import { resolveCollisions } from './world.js';
import { createWeapon } from './weapons.js';

function makeBotBody(team, scene) {
  const group = new THREE.Group();
  const teamColor = team === 'blue' ? hex(PALETTE.teamBlue) : hex(PALETTE.teamRed);
  const accent = team === 'blue' ? hex(PALETTE.accent) : hex(PALETTE.accent2);

  // Body: capsule-ish — use a tall box for hit detection (single mesh)
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x222831, metalness: 0.5, roughness: 0.5,
    emissive: teamColor, emissiveIntensity: 0.15,
  });
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.1, 4, 8), bodyMat);
  body.position.y = 0.95;
  body.castShadow = true;
  group.add(body);

  // Head: smaller sphere
  const headMat = new THREE.MeshStandardMaterial({
    color: 0x303742, metalness: 0.6, roughness: 0.4,
    emissive: teamColor, emissiveIntensity: 0.25,
  });
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 8), headMat);
  head.position.y = 1.7;
  head.castShadow = true;
  group.add(head);

  // Visor (glowing strip)
  const visorMat = new THREE.MeshBasicMaterial({ color: accent });
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.05, 0.05), visorMat);
  visor.position.set(0, 1.72, 0.18);
  group.add(visor);

  // Team stripe
  const stripeMat = new THREE.MeshBasicMaterial({ color: teamColor });
  const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.06, 0.06), stripeMat);
  stripe.position.y = 1.4;
  group.add(stripe);

  // Mark body as the hit mesh
  body.userData.isHit = true;
  head.userData.isHit = true;
  // Store on group.userData so we can find them
  group.userData.bodyMesh = body;
  group.userData.headMesh = head;

  scene.add(group);
  return { group, body, head };
}

export function createBot(scene, world, team, name, spawnIndex, weaponId) {
  const spawns = team === 'blue' ? world.blueSpawns : world.redSpawns;
  const spawn = spawns[spawnIndex % spawns.length].clone();
  const { group, body, head } = makeBotBody(team, scene);
  group.position.copy(spawn);
  group.position.y = 0;     // group origin at floor; meshes offset above

  const state = {
    team,
    name,
    alive: true,
    health: CONFIG.maxHealth,
    armor: 0,
    weapon: createWeapon({ camera: { add: () => {}, position: new THREE.Vector3() } }, weaponId),
    yaw: team === 'blue' ? Math.PI : 0,
    target: null,
    lastShotAt: 0,
    lastSeenAt: 0,
    nextThinkAt: 0,
    nextMoveAt: 0,
    moveTarget: null,
    moving: false,
    reactionTimer: 0,
    strafeDir: 1,
    nextStrafeChange: 0,
    money: CONFIG.startMoney,
    position: group.position,
    headTopY: 1.95,
    hitMesh: body,     // for raycasting; head separate
    hitMeshes: [body, head],
  };

  function applyDamage(amount, headshot, attackerActor) {
    if (!state.alive) return false;
    const dmg = amount * (headshot ? 4 : 1);
    let actual = dmg;
    if (state.armor > 0) {
      const absorbed = Math.min(state.armor, dmg * 0.5);
      state.armor -= absorbed;
      actual -= absorbed;
    }
    state.health -= actual;
    if (state.health <= 0) {
      state.health = 0;
      state.alive = false;
      // visual: drop down, hide
      group.visible = false;
      return true;
    }
    // Aggro: target the attacker
    if (attackerActor) state.target = attackerActor;
    state.lastSeenAt = performance.now() / 1000;
    return false;
  }

  function canSee(otherPos, raycaster, blockers) {
    if (!state.alive) return false;
    const eye = state.position.clone(); eye.y = 1.6;
    const dir = new THREE.Vector3().subVectors(otherPos, eye);
    const dist = dir.length();
    if (dist > 60) return false;
    dir.normalize();
    raycaster.set(eye, dir);
    raycaster.far = dist - 0.5;
    const hits = raycaster.intersectObjects(blockers, false);
    return hits.length === 0;
  }

  function tick(dt, now, ctx) {
    if (!state.alive) return;
    state.weapon?.tick(now);

    // Think: pick target / movement
    if (now >= state.nextThinkAt) {
      state.nextThinkAt = now + 0.25;
      // Find nearest visible enemy
      const enemies = ctx.actors.filter(a => a.team !== state.team && a.alive);
      let best = null, bestDist = Infinity;
      for (const e of enemies) {
        const ep = e.position;
        const d = state.position.distanceTo(ep);
        if (d < bestDist && canSee(ep.clone().setY(1.5), ctx.raycaster, ctx.blockers)) {
          best = e; bestDist = d;
        }
      }
      if (best) {
        state.target = best;
        state.lastSeenAt = now;
        state.reactionTimer = CONFIG.botReactTime;
      } else {
        // No visible target — pick a patrol point near enemy spawn
        if (!state.moveTarget || state.position.distanceTo(state.moveTarget) < 1.5) {
          const enemySpawns = state.team === 'blue' ? world.redSpawns : world.blueSpawns;
          const pick = enemySpawns[Math.floor(Math.random() * enemySpawns.length)];
          state.moveTarget = pick.clone();
          state.moveTarget.x += (Math.random() - 0.5) * 4;
          state.moveTarget.z += (Math.random() - 0.5) * 4;
        }
      }
    }

    // Reaction timer when target newly acquired
    if (state.target) {
      if (state.reactionTimer > 0) state.reactionTimer -= dt;
      if (!state.target.alive) {
        state.target = null;
      } else if (state.reactionTimer <= 0 && state.weapon?.canFire(now)) {
        // Aim at target with some inaccuracy
        const eye = state.position.clone(); eye.y = 1.6;
        const tp = state.target.position.clone(); tp.y = 1.4;
        const dir = new THREE.Vector3().subVectors(tp, eye).normalize();
        // Apply accuracy noise
        const noise = (1 - CONFIG.botAccuracy) * 0.06;
        dir.x += (Math.random() - 0.5) * noise;
        dir.y += (Math.random() - 0.5) * noise;
        dir.z += (Math.random() - 0.5) * noise;
        dir.normalize();
        // Fire
        state.weapon.fire(now);
        ctx.onBotFire?.(state, eye, dir);
        // Aim yaw toward target (for visual)
        state.yaw = Math.atan2(-dir.x, -dir.z);
        group.rotation.y = state.yaw;
      }
    }

    // Movement: either toward target (strafe) or toward patrol point
    let mvTarget = null;
    if (state.target && state.target.alive) {
      // Strafe around target at 6-10m
      const toTarget = new THREE.Vector3().subVectors(state.target.position, state.position);
      const dist = toTarget.length();
      if (dist > 10) mvTarget = state.target.position;
      else {
        // strafe perpendicular
        if (now > state.nextStrafeChange) {
          state.strafeDir = -state.strafeDir;
          state.nextStrafeChange = now + 1.5 + Math.random() * 1.5;
        }
        const perp = new THREE.Vector3(-toTarget.z, 0, toTarget.x).normalize().multiplyScalar(state.strafeDir);
        mvTarget = state.position.clone().add(perp.multiplyScalar(3));
      }
    } else if (state.moveTarget) {
      mvTarget = state.moveTarget;
    }

    if (mvTarget) {
      const dir = new THREE.Vector3().subVectors(mvTarget, state.position);
      dir.y = 0;
      const d = dir.length();
      if (d > 0.3) {
        dir.normalize();
        const speed = CONFIG.botMoveSpeed;
        const step = dir.multiplyScalar(speed * dt);
        let next = state.position.clone();
        next.x += step.x; next.z += step.z;
        next = resolveCollisions(next, 0.35, 1.8, world.colliders);
        next.x = Math.max(-19, Math.min(19, next.x));
        next.z = Math.max(-19, Math.min(19, next.z));
        state.position.copy(next);
        // Face movement direction if no target
        if (!state.target) {
          state.yaw = Math.atan2(-dir.x, -dir.z);
          group.rotation.y = state.yaw;
        }
      } else if (state.moveTarget === mvTarget) {
        state.moveTarget = null;
      }
    }
  }

  function dispose() {
    scene.remove(group);
    body.geometry.dispose(); body.material.dispose();
    head.geometry.dispose(); head.material.dispose();
    state.weapon?.dispose?.();
  }

  function reset(spawnIndex, weaponId) {
    const spawns = team === 'blue' ? world.blueSpawns : world.redSpawns;
    const sp = spawns[spawnIndex % spawns.length].clone();
    state.position.copy(sp);
    state.position.y = 0;
    state.alive = true;
    state.health = CONFIG.maxHealth;
    state.target = null;
    state.moveTarget = null;
    group.visible = true;
    group.position.copy(state.position);
    // Reset weapon
    if (state.weapon) state.weapon.dispose?.();
    state.weapon = createWeapon({ camera: { add: () => {}, position: new THREE.Vector3() } }, weaponId || 'sidearm');
    state.mag = state.weapon?.state?.mag ?? 12;
  }

  return {
    state, group, body, head,
    applyDamage, tick, dispose, reset,
    position: state.position,
    team,
    get alive() { return state.alive; },
    headTopY: 1.95,
  };
}
