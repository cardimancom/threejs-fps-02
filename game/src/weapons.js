// Weapon system: shooting, ammo, reload, recoil, hit detection via raycaster.
// A weapon is created per actor (player or bot) from a CONFIG entry.
import * as THREE from 'three';
import { getWeapon } from './config.js';
import { PALETTE, hex } from './palette.js';

export function createWeapon(owner, weaponId) {
  const def = getWeapon(weaponId);
  if (!def) throw new Error(`unknown weapon: ${weaponId}`);

  const state = {
    def,
    id: def.id,
    name: def.name,
    mag: def.magSize,
    reserve: def.reserveAmmo,
    reloading: false,
    reloadEndsAt: 0,
    lastShotAt: 0,
    recoil: 0,              // accumulated recoil for view kick
    scoped: false,
  };

  // First-person viewmodel attached to camera
  const group = new THREE.Group();
  // Body of weapon: a thin elongated box with neon strip
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0x1a1f28, metalness: 0.7, roughness: 0.4 });
  const accentMat = new THREE.MeshStandardMaterial({
    color: def.color, emissive: def.color, emissiveIntensity: 1.4,
    metalness: 0.3, roughness: 0.3,
  });

  const body = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.12, 0.5), bodyMat);
  body.position.set(0, 0, -0.2);
  group.add(body);

  // Neon strip on top
  const strip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.4), accentMat);
  strip.position.set(0, 0.07, -0.2);
  group.add(strip);

  // Barrel / muzzle
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.2, 8), bodyMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0, -0.5);
  group.add(barrel);

  // Grip
  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 0.08), bodyMat);
  grip.position.set(0, -0.1, -0.05);
  grip.rotation.x = 0.2;
  group.add(grip);

  // Scope for sniper
  if (def.scope > 1.0) {
    const scope = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), bodyMat);
    scope.rotation.x = Math.PI / 2;
    scope.position.set(0, 0.1, -0.2);
    group.add(scope);
    const lens = new THREE.Mesh(new THREE.CircleGeometry(0.022, 16), accentMat);
    lens.position.set(0, 0.1, -0.14);
    group.add(lens);
  }

  // Position viewmodel at bottom-right of view
  group.position.set(0.18, -0.18, -0.3);
  owner.camera.add(group);

  // Muzzle world position helper
  const muzzleObj = new THREE.Object3D();
  muzzleObj.position.set(0, 0, -0.6);
  group.add(muzzleObj);

  function muzzleWorld() {
    return muzzleObj.getWorldPosition(new THREE.Vector3());
  }

  function canFire(now) {
    if (state.reloading) return false;
    if (state.mag <= 0) return false;
    const interval = 1 / def.fireRate;
    if (now - state.lastShotAt < interval) return false;
    return true;
  }

  function fire(now) {
    state.lastShotAt = now;
    state.mag -= 1;
    state.recoil += def.recoil;
    return state.mag;
  }

  function startReload(now) {
    if (state.reloading) return false;
    if (state.mag >= def.magSize) return false;
    if (state.reserve <= 0) return false;
    state.reloading = true;
    state.reloadEndsAt = now + def.reloadTime;
    return true;
  }

  function finishReload() {
    const need = def.magSize - state.mag;
    const take = Math.min(need, state.reserve);
    state.mag += take;
    state.reserve -= take;
    state.reloading = false;
  }

  function tick(now) {
    if (state.reloading && now >= state.reloadEndsAt) finishReload();
    // Recoil recovery
    state.recoil *= Math.pow(0.001, 1 / 60);
    if (state.recoil < 0.001) state.recoil = 0;
  }

  function dispose() {
    owner.camera.remove(group);
    body.geometry.dispose(); bodyMat.dispose();
    accentMat.dispose();
  }

  return {
    state, def, group,
    muzzleWorld,
    canFire, fire,
    startReload, tick,
    dispose,
    setScoped: (v) => { state.scoped = v && def.scope > 1.0; },
    isScoped: () => state.scoped,
    scopeFactor: () => def.scope,
  };
}

// Compute hit on a list of actors from a ray. Returns { actor, point, headshot } or null.
export function raycastHit(raycaster, fromVec, dirVec, actors, maxRange, ownerActor) {
  raycaster.set(fromVec, dirVec);
  raycaster.far = maxRange;
  const candidates = actors.filter(a => a !== ownerActor && a.alive);
  const meshes = [];
  for (const a of candidates) {
    if (!a.hitMesh) continue;
    a.hitMesh.userData.actor = a;
    meshes.push(a.hitMesh);
  }
  const hits = raycaster.intersectObjects(meshes, false);
  if (hits.length === 0) return null;
  const h = hits[0];
  const actor = h.object.userData.actor;
  if (!actor) return null;
  // Headshot if hit y is in top ~20% of actor
  const headY = actor.position.y + actor.headTopY;     // top of head
  const footY = actor.position.y;
  const headshot = h.point.y > (footY + (headY - footY) * 0.85);
  return { actor, point: h.point.clone(), distance: h.distance, headshot };
}
