// Player controller: camera, movement, health, armor, money, loadout.
// Capsule collision against world colliders via resolveCollisions.
import * as THREE from 'three';
import { CONFIG } from './config.js';
import { PALETTE, hex } from './palette.js';
import { resolveCollisions } from './world.js';
import { createWeapon } from './weapons.js';

export function createPlayer(camera, world, team) {
  const spawns = team === 'blue' ? world.blueSpawns : world.redSpawns;
  const spawn = spawns[0].clone();
  camera.position.copy(spawn);
  camera.rotation.set(0, 0, 0);

  const state = {
    team,
    alive: true,
    health: CONFIG.maxHealth,
    armor: 0,
    money: CONFIG.startMoney,
    eyeHeight: CONFIG.eyeHeight,
    crouch: false,
    onGround: true,
    vy: 0,
    yaw: team === 'blue' ? Math.PI : 0,    // blue faces -Z (toward red spawns in most maps)
    pitch: 0,
    walkBob: 0,
    radius: CONFIG.playerRadius,
    height: CONFIG.playerHeight,
    speed: CONFIG.moveSpeed,
    hasBomb: false,
    weapon: null,
    weaponsOwned: ['sidearm'],
    armorType: 0,
    lastDamageAt: 0,
    lastFootstepAt: 0,
  };

  // First-person weapon viewmodel — starts with sidearm
  state.weapon = createWeapon({ camera }, 'sidearm');

  // Damage flash quad (red overlay on damage)
  const flashMat = new THREE.MeshBasicMaterial({ color: 0xff0000, transparent: true, opacity: 0, depthWrite: false, depthTest: false });
  const flashGeo = new THREE.PlaneGeometry(2, 2);
  const flashMesh = new THREE.Mesh(flashGeo, flashMat);
  flashMesh.position.z = -0.5;
  camera.add(flashMesh);

  // Apply damage to player. Returns true if player died from this damage.
  function applyDamage(amount, headshot) {
    if (!state.alive) return false;
    let dmg = amount * (headshot ? 4 : 1);
    if (state.armor > 0) {
      const absorbed = Math.min(state.armor, dmg * 0.5);
      state.armor -= absorbed;
      dmg -= absorbed;
    }
    state.health -= dmg;
    state.lastDamageAt = performance.now() / 1000;
    if (state.health <= 0) {
      state.health = 0;
      state.alive = false;
      return true;
    }
    return false;
  }

  function tick(input, dt, now) {
    if (!state.alive) {
      // free-look while dead (spectate)
      const { dx, dy } = input.consumeMouseDelta();
      state.yaw -= dx * 0.0025;
      state.pitch -= dy * 0.0025;
      state.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.pitch));
      camera.position.y = state.eyeHeight + 0.2;
      camera.quaternion.setFromEuler(new THREE.Euler(state.pitch, state.yaw, 0, 'YXZ'));
      return;
    }

    // Look
    const { dx, dy } = input.consumeMouseDelta();
    state.yaw -= dx * 0.0025;
    state.pitch -= dy * 0.0025;
    state.pitch = Math.max(-Math.PI / 2 + 0.05, Math.min(Math.PI / 2 - 0.05, state.pitch));

    // Apply recoil offset to pitch (visual kick)
    const recoilKick = state.weapon ? state.weapon.state.recoil * 0.02 : 0;

    camera.quaternion.setFromEuler(
      new THREE.Euler(state.pitch + recoilKick, state.yaw, 0, 'YXZ')
    );

    // Movement
    const fwd = new THREE.Vector3(Math.sin(state.yaw), 0, Math.cos(state.yaw)).multiplyScalar(-1);
    const right = new THREE.Vector3(Math.cos(state.yaw), 0, -Math.sin(state.yaw));
    const wish = new THREE.Vector3();
    if (input.isDown('KeyW')) wish.add(fwd);
    if (input.isDown('KeyS')) wish.sub(fwd);
    if (input.isDown('KeyD')) wish.add(right);
    if (input.isDown('KeyA')) wish.sub(right);
    if (wish.lengthSq() > 0) wish.normalize();

    state.crouch = input.isDown('ControlLeft') || input.isDown('ControlRight');
    let speed = state.crouch ? CONFIG.crouchSpeed : CONFIG.moveSpeed;
    if (input.isDown('ShiftLeft') && !state.crouch && wish.lengthSq() > 0) speed = CONFIG.sprintSpeed;

    state.speed = speed;
    const move = wish.multiplyScalar(speed * dt);

    // Footstep audio
    if (state.onGround && wish.lengthSq() > 0 && now - state.lastFootstepAt > 0.32) {
      state.lastFootstepAt = now;
      // footstep event is handled by main loop's audio
      state._footstep = true;
    }

    // Jump
    if (input.isDown('Space') && state.onGround) {
      state.vy = CONFIG.jumpForce;
      state.onGround = false;
    }

    // Gravity
    state.vy -= CONFIG.gravity * dt;
    let newY = camera.position.y + state.vy * dt;
    const floorY = state.crouch ? CONFIG.crouchEyeHeight : CONFIG.eyeHeight;
    if (newY <= floorY) {
      newY = floorY;
      state.vy = 0;
      state.onGround = true;
    }

    // Horizontal move with collision
    let candidate = camera.position.clone();
    candidate.x += move.x;
    candidate.z += move.z;
    candidate.y = newY;
    candidate = resolveCollisions(candidate, state.radius, state.height, world.colliders);

    // Keep player above floor (don't fall through)
    if (candidate.y < floorY) candidate.y = floorY;
    // Keep inside map bounds (rough)
    candidate.x = Math.max(-19, Math.min(19, candidate.x));
    candidate.z = Math.max(-19, Math.min(19, candidate.z));

    camera.position.copy(candidate);

    // Walk bob for viewmodel
    if (state.onGround && wish.lengthSq() > 0) {
      state.walkBob += dt * speed * 1.5;
    } else {
      state.walkBob *= Math.pow(0.001, dt);
    }

    // Viewmodel bob
    if (state.weapon && state.weapon.group) {
      const b = Math.sin(state.walkBob) * 0.012;
      const b2 = Math.cos(state.walkBob * 0.5) * 0.008;
      state.weapon.group.position.set(0.18 + b2, -0.18 + b, -0.3);
      // Recoil push back
      state.weapon.group.position.z += state.weapon.state.recoil * 0.02;
    }

    // Damage flash fade
    const timeSinceDmg = now - state.lastDamageAt;
    flashMat.opacity = Math.max(0, 0.5 - timeSinceDmg * 1.5);

    state.weapon?.tick(now);

    // Reload request
    if (input.reloadRequest) {
      input.reloadRequest = false;
      state.weapon?.startReload(now);
    }
  }

  function buyWeapon(weaponId) {
    const def = CONFIG.weapons[weaponId];
    if (!def) return false;
    if (state.money < def.cost) return false;
    if (state.weaponsOwned.includes(weaponId)) {
      // refund not allowed; just switch
      switchTo(weaponId);
      return true;
    }
    state.money -= def.cost;
    state.weaponsOwned.push(weaponId);
    switchTo(weaponId);
    return true;
  }

  function buyEquipment(equipId) {
    const def = CONFIG.equipment[equipId];
    if (!def) return false;
    if (state.money < def.cost) return false;
    state.money -= def.cost;
    if (def.kind === 'armor') {
      state.armor = CONFIG.maxArmor;
      state.armorType = 1;
    } else if (def.kind === 'defuser') {
      state.hasDefuser = true;
    } else if (def.kind === 'bomb') {
      state.hasBomb = true;
    }
    return true;
  }

  function switchTo(weaponId) {
    if (!state.weaponsOwned.includes(weaponId)) return false;
    if (state.weapon) state.weapon.dispose();
    state.weapon = createWeapon({ camera }, weaponId);
    return true;
  }

  function switchSlot(idx) {
    // slot 0 = primary (rifle/smg/sniper/shotgun, whichever first in inventory)
    // slot 1 = secondary (sidearm)
    const owned = state.weaponsOwned;
    const primaries = owned.filter(id => id !== 'sidearm');
    const secondaries = owned.filter(id => id === 'sidearm');
    let target;
    if (idx === 0 && primaries.length) target = primaries[primaries.length - 1];
    else if (idx === 1 && secondaries.length) target = secondaries[0];
    else if (owned[idx]) target = owned[idx];
    if (target) switchTo(target);
  }

  function dispose() {
    state.weapon?.dispose();
    camera.remove(flashMesh);
    flashGeo.dispose(); flashMat.dispose();
  }

  return {
    state, camera,
    applyDamage,
    tick,
    buyWeapon, buyEquipment,
    switchTo, switchSlot,
    dispose,
    position: camera.position,
    get yaw() { return state.yaw; },
    get pitch() { return state.pitch; },
    headTopY: 1.7,
  };
}
