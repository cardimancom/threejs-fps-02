// World: 3 sci-fi maps. Each map provides geometry, colliders, spawn points,
// buy zones, bomb sites (where applicable), and a name.
// Maps are built procedurally — no external GLB/texture files (no network).
import * as THREE from 'three';
import { PALETTE, hex } from './palette.js';

// Shared materials cached per world to avoid duplicates.
function materials() {
  const floorMat = new THREE.MeshStandardMaterial({ color: 0x3a4250, metalness: 0.4, roughness: 0.7 });
  const wallMat = new THREE.MeshStandardMaterial({ color: 0x4a5260, metalness: 0.5, roughness: 0.55 });
  const metalMat = new THREE.MeshStandardMaterial({ color: 0x5a6470, metalness: 0.8, roughness: 0.35 });
  const metalLightMat = new THREE.MeshStandardMaterial({ color: 0x707a88, metalness: 0.8, roughness: 0.35 });
  const accentMat = new THREE.MeshStandardMaterial({ color: hex(PALETTE.accent), emissive: hex(PALETTE.accent), emissiveIntensity: 2.5, metalness: 0.2, roughness: 0.3 });
  const accent2Mat = new THREE.MeshStandardMaterial({ color: hex(PALETTE.accent2), emissive: hex(PALETTE.accent2), emissiveIntensity: 2.5, metalness: 0.2, roughness: 0.3 });
  const blueMat = new THREE.MeshStandardMaterial({ color: hex(PALETTE.teamBlue), emissive: hex(PALETTE.teamBlue), emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.5 });
  const redMat = new THREE.MeshStandardMaterial({ color: hex(PALETTE.teamRed), emissive: hex(PALETTE.teamRed), emissiveIntensity: 1.2, metalness: 0.3, roughness: 0.5 });
  const glassMat = new THREE.MeshStandardMaterial({ color: 0x88ccff, transparent: true, opacity: 0.18, metalness: 0.1, roughness: 0.1 });
  return { floorMat, wallMat, metalMat, metalLightMat, accentMat, accent2Mat, blueMat, redMat, glassMat };
}

// Helper to make a box collider+mesh
function box(x, y, z, w, h, d, mat, scene, colliders) {
  const geo = new THREE.BoxGeometry(w, h, d);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
  const box3 = new THREE.Box3().setFromObject(mesh);
  colliders.push({ box: box3, mesh });
  return mesh;
}

// Helper: cylinder pillar
function pillar(x, z, radius, height, mat, scene, colliders) {
  const geo = new THREE.CylinderGeometry(radius, radius, height, 12);
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.set(x, height / 2, z);
  mesh.castShadow = true; mesh.receiveShadow = true;
  scene.add(mesh);
  const box3 = new THREE.Box3().setFromObject(mesh);
  colliders.push({ box: box3, mesh });
  return mesh;
}

// Helper: thin glowing strip (decorative, no collision)
function strip(x, y, z, w, h, d, mat, scene) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  scene.add(mesh);
  return mesh;
}

// =========================================================
// MAP 1: Helix Labs — sci-fi research facility
// Symmetric-ish layout with central corridor and side rooms.
// Bomb sites: A (lab), B (server room)
// =========================================================
function buildLab(scene, mats) {
  const colliders = [];
  const W = 30, D = 30, H = 4.5;

  // Floor
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // Ceiling
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.wallMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  ceil.receiveShadow = true;
  scene.add(ceil);

  // Perimeter walls
  box(0, H/2, -D/2, W, H, 0.4, mats.wallMat, scene, colliders);
  box(0, H/2,  D/2, W, H, 0.4, mats.wallMat, scene, colliders);
  box(-W/2, H/2, 0, 0.4, H, D, mats.wallMat, scene, colliders);
  box( W/2, H/2, 0, 0.4, H, D, mats.wallMat, scene, colliders);

  // Central divider with corridor gap
  box(-7, H/2, 0, 8, H, 0.4, mats.wallMat, scene, colliders);
  box( 7, H/2, 0, 8, H, 0.4, mats.wallMat, scene, colliders);
  // glowing strip above corridor
  strip(0, H - 0.1, 0, 6, 0.05, 0.4, mats.accentMat, scene);

  // Side rooms with door gaps
  // Lab room (left back) — bomb site A
  box(-10, H/2, -8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(-13, H/2, -8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(-11.5, H/2, -11, 3, H, 0.4, mats.wallMat, scene, colliders);
  // server racks in lab
  box(-12, 0.9, -9, 0.8, 1.8, 0.6, mats.metalMat, scene, colliders);
  strip(-12, 1.6, -8.7, 0.6, 0.04, 0.05, mats.accent2Mat, scene);
  box(-10.5, 0.9, -9, 0.8, 1.8, 0.6, mats.metalLightMat, scene, colliders);
  strip(-10.5, 1.6, -8.7, 0.6, 0.04, 0.05, mats.accent2Mat, scene);

  // Server room (right back) — bomb site B
  box(10, H/2, -8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(13, H/2, -8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(11.5, H/2, -11, 3, H, 0.4, mats.wallMat, scene, colliders);
  box(12, 0.9, -9, 0.8, 1.8, 0.6, mats.metalMat, scene, colliders);
  strip(12, 1.6, -8.7, 0.6, 0.04, 0.05, mats.accentMat, scene);
  box(10.5, 0.9, -9, 0.8, 1.8, 0.6, mats.metalLightMat, scene, colliders);
  strip(10.5, 1.6, -8.7, 0.6, 0.04, 0.05, mats.accentMat, scene);

  // Front rooms (forward cover)
  box(-10, H/2, 8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(-13, H/2, 8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(-11.5, H/2, 11, 3, H, 0.4, mats.wallMat, scene, colliders);
  box(10, H/2, 8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(13, H/2, 8, 0.4, H, 6, mats.wallMat, scene, colliders);
  box(11.5, H/2, 11, 3, H, 0.4, mats.wallMat, scene, colliders);

  // Crates / cover in central area
  box(-3, 0.5, -3, 1.0, 1.0, 1.0, mats.metalMat, scene, colliders);
  box( 3, 0.5, -3, 1.0, 1.0, 1.0, mats.metalMat, scene, colliders);
  box(-3, 0.5,  3, 1.0, 1.0, 1.0, mats.metalLightMat, scene, colliders);
  box( 3, 0.5,  3, 1.0, 1.0, 1.0, mats.metalLightMat, scene, colliders);
  box(0, 0.5, 0, 1.4, 1.0, 1.4, mats.metalMat, scene, colliders);
  strip(0, 1.1, 0, 1.4, 0.04, 1.4, mats.accentMat, scene);

  // Pillars at corners
  pillar(-13, -13, 0.3, H, mats.metalMat, scene, colliders);
  pillar( 13, -13, 0.3, H, mats.metalMat, scene, colliders);
  pillar(-13,  13, 0.3, H, mats.metalMat, scene, colliders);
  pillar( 13,  13, 0.3, H, mats.metalMat, scene, colliders);

  // Ceiling strips (neon)
  for (let i = -10; i <= 10; i += 5) {
    strip(i, H - 0.05, 0, 0.1, 0.05, W - 1, mats.accentMat, scene);
  }

  const blueSpawns = [
    new THREE.Vector3(-11, 1.7, 12),
    new THREE.Vector3(-12, 1.7, 12),
    new THREE.Vector3(-13, 1.7, 12),
    new THREE.Vector3(-11, 1.7, 13),
    new THREE.Vector3(-12, 1.7, 13),
  ];
  const redSpawns = [
    new THREE.Vector3(11, 1.7, -12),
    new THREE.Vector3(12, 1.7, -12),
    new THREE.Vector3(13, 1.7, -12),
    new THREE.Vector3(11, 1.7, -13),
    new THREE.Vector3(12, 1.7, -13),
  ];
  const bombSites = [
    { id: 'A', name: 'Lab', pos: new THREE.Vector3(-11.5, 0, -9.5), radius: 2.5 },
    { id: 'B', name: 'Server Room', pos: new THREE.Vector3(11.5, 0, -9.5), radius: 2.5 },
  ];
  return { colliders, blueSpawns, redSpawns, bombSites };
}

// =========================================================
// MAP 2: Orbital Station — corridor-and-bay space station
// Has objective: bomb the reactor core
// =========================================================
function buildStation(scene, mats) {
  const colliders = [];
  const W = 28, D = 36, H = 4.0;

  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.floorMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(W, D), mats.wallMat);
  ceil.rotation.x = Math.PI / 2;
  ceil.position.y = H;
  scene.add(ceil);

  // Outer walls
  box(0, H/2, -D/2, W, H, 0.4, mats.wallMat, scene, colliders);
  box(0, H/2,  D/2, W, H, 0.4, mats.wallMat, scene, colliders);
  box(-W/2, H/2, 0, 0.4, H, D, mats.wallMat, scene, colliders);
  box( W/2, H/2, 0, 0.4, H, D, mats.wallMat, scene, colliders);

  // Two cross corridors creating central hub
  // left wall (with gap)
  box(-W/2 + 4, H/2, -10, 8, H, 0.4, mats.wallMat, scene, colliders);
  box(-W/2 + 4, H/2,  10, 8, H, 0.4, mats.wallMat, scene, colliders);
  // right wall (with gap)
  box(W/2 - 4, H/2, -10, 8, H, 0.4, mats.wallMat, scene, colliders);
  box(W/2 - 4, H/2,  10, 8, H, 0.4, mats.wallMat, scene, colliders);

  // Central reactor bay (objective site)
  box(0, 1.5, 0, 4, 3, 0.2, mats.metalMat, scene, colliders);
  // reactor glow
  const reactorGeo = new THREE.CylinderGeometry(1.0, 1.0, 2.5, 16);
  const reactorMesh = new THREE.Mesh(reactorGeo, mats.accentMat);
  reactorMesh.position.set(0, 1.5, 0);
  scene.add(reactorMesh);
  const reactorLight = new THREE.PointLight(hex(PALETTE.accent), 4, 12);
  reactorLight.position.set(0, 2, 0);
  scene.add(reactorLight);

  // Pillars around reactor
  for (let i = 0; i < 6; i++) {
    const a = (i / 6) * Math.PI * 2;
    pillar(Math.cos(a) * 3.5, Math.sin(a) * 3.5, 0.25, H, mats.metalMat, scene, colliders);
  }

  // Cover crates
  box(-6, 0.5, -4, 1.0, 1.0, 1.0, mats.metalMat, scene, colliders);
  box( 6, 0.5, -4, 1.0, 1.0, 1.0, mats.metalMat, scene, colliders);
  box(-6, 0.5,  4, 1.0, 1.0, 1.0, mats.metalLightMat, scene, colliders);
  box( 6, 0.5,  4, 1.0, 1.0, 1.0, mats.metalLightMat, scene, colliders);
  box(-3, 0.5,  8, 1.2, 1.0, 1.0, mats.metalMat, scene, colliders);
  box( 3, 0.5,  8, 1.2, 1.0, 1.0, mats.metalMat, scene, colliders);

  // Side bays with windows (glass)
  box(-10, 1.0, -12, 3, 2, 0.05, mats.glassMat, scene, colliders);
  box( 10, 1.0, -12, 3, 2, 0.05, mats.glassMat, scene, colliders);
  box(-10, 1.0,  12, 3, 2, 0.05, mats.glassMat, scene, colliders);
  box( 10, 1.0,  12, 3, 2, 0.05, mats.glassMat, scene, colliders);

  // Neon ceiling strips
  for (let z = -14; z <= 14; z += 4) {
    strip(0, H - 0.05, z, 0.1, 0.05, W - 1, mats.accentMat, scene);
  }
  // Red strips near red spawn, blue near blue spawn
  for (let x = -10; x <= 10; x += 4) {
    strip(x, H - 0.05, -D/2 + 1, 0.1, 0.05, 0.4, mats.redMat, scene);
    strip(x, H - 0.05,  D/2 - 1, 0.1, 0.05, 0.4, mats.blueMat, scene);
  }

  const blueSpawns = [
    new THREE.Vector3(-8, 1.7, 14),
    new THREE.Vector3(-6, 1.7, 14),
    new THREE.Vector3(-4, 1.7, 14),
    new THREE.Vector3( 4, 1.7, 14),
    new THREE.Vector3( 6, 1.7, 14),
  ];
  const redSpawns = [
    new THREE.Vector3(-8, 1.7, -14),
    new THREE.Vector3(-6, 1.7, -14),
    new THREE.Vector3(-4, 1.7, -14),
    new THREE.Vector3( 4, 1.7, -14),
    new THREE.Vector3( 6, 1.7, -14),
  ];
  const bombSites = [
    { id: 'A', name: 'Reactor', pos: new THREE.Vector3(0, 0, 0), radius: 3.0 },
  ];
  return { colliders, blueSpawns, redSpawns, bombSites };
}

// =========================================================
// MAP 3: Expanse — alien planet surface, open with rocks and outposts
// Elimination-only (no bomb)
// =========================================================
function buildAlien(scene, mats) {
  const colliders = [];
  const W = 40, D = 40;

  // Sandy ground
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x3a2e26, metalness: 0.1, roughness: 0.95 });
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(W, D), groundMat);
  floor.rotation.x = -Math.PI / 2;
  floor.receiveShadow = true;
  scene.add(floor);

  // No ceiling (open sky). Atmospheric fog set elsewhere.
  // Perimeter low walls / rocks
  for (let i = -W/2; i <= W/2; i += 4) {
    const r1 = Math.random();
    if (r1 > 0.5) {
      // low rock wall
      const h = 0.6 + Math.random() * 0.4;
      box(i, h/2, -D/2 + 0.5, 3, h, 1, mats.metalMat, scene, colliders);
    }
    if (r1 > 0.7) {
      const h = 0.6 + Math.random() * 0.4;
      box(i, h/2, D/2 - 0.5, 3, h, 1, mats.metalMat, scene, colliders);
    }
  }
  for (let j = -D/2; j <= D/2; j += 4) {
    if (Math.random() > 0.6) {
      const h = 0.6 + Math.random() * 0.4;
      box(-W/2 + 0.5, h/2, j, 1, h, 3, mats.metalMat, scene, colliders);
    }
    if (Math.random() > 0.6) {
      const h = 0.6 + Math.random() * 0.4;
      box(W/2 - 0.5, h/2, j, 1, h, 3, mats.metalMat, scene, colliders);
    }
  }

  // Outpost 1 (blue side) — small structure
  box(-12, 1, -8, 6, 2, 0.3, mats.metalMat, scene, colliders);
  box(-12, 1, -8, 0.3, 2, 6, mats.metalMat, scene, colliders);
  box(-9, 1, -8, 0.3, 2, 6, mats.metalMat, scene, colliders);
  box(-12, 2, -8, 6, 0.3, 6, mats.metalMat, scene, colliders);
  strip(-12, 2.05, -8, 6, 0.04, 0.1, mats.blueMat, scene);

  // Outpost 2 (red side)
  box(12, 1, 8, 6, 2, 0.3, mats.metalMat, scene, colliders);
  box(12, 1, 8, 0.3, 2, 6, mats.metalMat, scene, colliders);
  box(9, 1, 8, 0.3, 2, 6, mats.metalMat, scene, colliders);
  box(12, 2, 8, 6, 0.3, 6, mats.metalMat, scene, colliders);
  strip(12, 2.05, 8, 6, 0.04, 0.1, mats.redMat, scene);

  // Big rocks (octagonal pillars)
  for (let i = 0; i < 14; i++) {
    const x = (Math.random() - 0.5) * 30;
    const z = (Math.random() - 0.5) * 30;
    const h = 1 + Math.random() * 2.5;
    const r = 0.6 + Math.random() * 1.2;
    // skip near spawns
    if (Math.hypot(x - (-12), z - (-8)) < 4) continue;
    if (Math.hypot(x - 12, z - 8) < 4) continue;
    pillar(x, z, r, h, mats.metalMat, scene, colliders);
  }

  // Central artifact (glowing crystal)
  const crystalGeo = new THREE.OctahedronGeometry(0.8, 0);
  const crystalMat = new THREE.MeshStandardMaterial({
    color: hex(PALETTE.accent2), emissive: hex(PALETTE.accent2), emissiveIntensity: 1.4,
    metalness: 0.2, roughness: 0.2,
  });
  const crystal = new THREE.Mesh(crystalGeo, crystalMat);
  crystal.position.set(0, 1.4, 0);
  scene.add(crystal);
  const crystalLight = new THREE.PointLight(hex(PALETTE.accent2), 3, 10);
  crystalLight.position.set(0, 2, 0);
  scene.add(crystalLight);

  const blueSpawns = [
    new THREE.Vector3(-13, 1.7, -7),
    new THREE.Vector3(-11, 1.7, -7),
    new THREE.Vector3(-13, 1.7, -9),
    new THREE.Vector3(-11, 1.7, -9),
    new THREE.Vector3(-12, 1.7, -10),
  ];
  const redSpawns = [
    new THREE.Vector3(13, 1.7, 7),
    new THREE.Vector3(11, 1.7, 7),
    new THREE.Vector3(13, 1.7, 9),
    new THREE.Vector3(11, 1.7, 9),
    new THREE.Vector3(12, 1.7, 10),
  ];
  const bombSites = [];
  return { colliders, blueSpawns, redSpawns, bombSites };
}

// =========================================================
// World entry: select map by id, build, return bundle
// =========================================================
export function createWorld(scene, mapId) {
  const mats = materials();
  let data;
  if (mapId === 'lab') data = buildLab(scene, mats);
  else if (mapId === 'station') data = buildStation(scene, mats);
  else if (mapId === 'alien') data = buildAlien(scene, mats);
  else throw new Error(`unknown map: ${mapId}`);

  // Lighting setup: brighter ambient + main directional + hemispheric fill
  const ambient = new THREE.AmbientLight(0x607088, 1.1);
  scene.add(ambient);
  const dir = new THREE.DirectionalLight(0xfff2d6, 1.4);
  dir.position.set(8, 18, 6);
  dir.castShadow = true;
  dir.shadow.mapSize.set(1024, 1024);
  dir.shadow.camera.left = -25; dir.shadow.camera.right = 25;
  dir.shadow.camera.top = 25; dir.shadow.camera.bottom = -25;
  dir.shadow.camera.near = 0.5; dir.shadow.camera.far = 60;
  scene.add(dir);
  // subtle hemispheric fill
  scene.add(new THREE.HemisphereLight(0x80a0ff, 0x201008, 0.6));

  return {
    colliders: data.colliders,
    blueSpawns: data.blueSpawns,
    redSpawns: data.redSpawns,
    bombSites: data.bombSites,
    mapId,
  };
}

// Move a Box3 collider list-aware position. Resolves against box colliders.
// Returns the new position with collisions resolved (axis by axis).
export function resolveCollisions(pos, radius, height, colliders) {
  const out = pos.clone();
  for (const c of colliders) {
    const b = c.box;
    // Expand box by radius in XZ, treat player as a vertical capsule-ish
    const minX = b.min.x - radius, maxX = b.max.x + radius;
    const minZ = b.min.z - radius, maxZ = b.max.z + radius;
    const minY = b.min.y, maxY = b.max.y;
    // Only consider boxes that overlap player's vertical extent
    if (out.y - height * 0.5 > maxY || out.y + height * 0.5 < minY) continue;
    // If inside expanded XZ box
    if (out.x > minX && out.x < maxX && out.z > minZ && out.z < maxZ) {
      // push out along the smallest penetration axis (X or Z)
      const dxLeft = out.x - minX;
      const dxRight = maxX - out.x;
      const dzTop = out.z - minZ;
      const dzBot = maxZ - out.z;
      const m = Math.min(dxLeft, dxRight, dzTop, dzBot);
      if (m === dxLeft) out.x = minX;
      else if (m === dxRight) out.x = maxX;
      else if (m === dzTop) out.z = minZ;
      else out.z = maxZ;
    }
  }
  return out;
}
