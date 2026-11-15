// Particle / beam / muzzle-flash / hit-spark effects. Pooled, no allocations in loop.
import * as THREE from 'three';
import { PALETTE } from './palette.js';

export function createEffects(scene) {
  const pool = [];
  const active = [];
  const MAX = 256;

  // Pre-allocate small sprite-like quads as planes for sparks/explosions
  const sparkGeo = new THREE.PlaneGeometry(0.08, 0.08);
  const beamGeo = new THREE.CylinderGeometry(0.012, 0.012, 1, 6, 1, true);
  beamGeo.rotateZ(Math.PI / 2);   // align with X axis (forward)

  // Material cache per color
  const sparkMats = new Map();
  function sparkMat(color) {
    if (!sparkMats.has(color)) {
      const m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 1, blending: THREE.AdditiveBlending,
        depthWrite: false, side: THREE.DoubleSide,
      });
      sparkMats.set(color, m);
    }
    return sparkMats.get(color);
  }

  const beamMats = new Map();
  function beamMat(color) {
    if (!beamMats.has(color)) {
      const m = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.85, blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      beamMats.set(color, m);
    }
    return beamMats.get(color);
  }

  function spawn(opts) {
    let obj;
    if (pool.length) obj = pool.pop();
    else obj = { mesh: null, ttl: 0, life: 0, vel: new THREE.Vector3(), kind: '' };
    obj.ttl = opts.ttl ?? 0.4;
    obj.life = obj.ttl;
    obj.vel.copy(opts.vel ?? new THREE.Vector3());
    obj.kind = opts.kind ?? 'spark';

    let geo, mat;
    if (opts.kind === 'beam') {
      geo = beamGeo; mat = beamMat(opts.color ?? PALETTE.accent);
      if (!obj.mesh || obj.mesh.geometry !== beamGeo) {
        if (obj.mesh) scene.remove(obj.mesh);
        obj.mesh = new THREE.Mesh(geo, mat);
        scene.add(obj.mesh);
      } else {
        obj.mesh.material = mat;
      }
      obj.mesh.position.copy(opts.from);
      // orient to target
      const dir = new THREE.Vector3().subVectors(opts.to, opts.from);
      const len = dir.length();
      obj.mesh.scale.set(len, 1, 1);
      obj.mesh.lookAt(opts.to);
      obj.mesh.rotateY(Math.PI / 2);
      obj.beamFrom = opts.from.clone();
      obj.beamTo = opts.to.clone();
    } else {
      geo = sparkGeo; mat = sparkMat(opts.color ?? PALETTE.accent);
      if (!obj.mesh || obj.mesh.geometry !== sparkGeo) {
        if (obj.mesh) scene.remove(obj.mesh);
        obj.mesh = new THREE.Mesh(geo, mat);
        scene.add(obj.mesh);
      } else {
        obj.mesh.material = mat;
      }
      obj.mesh.position.copy(opts.pos);
      obj.mesh.scale.setScalar(opts.size ?? 1);
    }
    active.push(obj);
  }

  function beam(from, to, color, ttl = 0.08) {
    spawn({ kind: 'beam', from: from.clone(), to: to.clone(), color, ttl });
  }

  function muzzle(pos, color) {
    // bright quick flash + a few sparks
    spawn({ kind: 'spark', pos: pos.clone(), color, ttl: 0.05, size: 1.8 });
    for (let i = 0; i < 6; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4,
      );
      spawn({ kind: 'spark', pos: pos.clone(), color, ttl: 0.18 + Math.random() * 0.2, size: 0.7, vel: v });
    }
  }

  function hitSpark(pos, color) {
    for (let i = 0; i < 10; i++) {
      const v = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
        (Math.random() - 0.5) * 6,
      );
      spawn({ kind: 'spark', pos: pos.clone(), color, ttl: 0.25 + Math.random() * 0.3, size: 0.6, vel: v });
    }
  }

  function explosion(pos, color, size = 1) {
    // central flash + many sparks
    spawn({ kind: 'spark', pos: pos.clone(), color, ttl: 0.18, size: size * 4 });
    for (let i = 0; i < 32; i++) {
      const dir = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
      ).normalize();
      const speed = 4 + Math.random() * 6;
      spawn({
        kind: 'spark', pos: pos.clone(), color,
        ttl: 0.5 + Math.random() * 0.7,
        size: 0.5 + Math.random() * 0.7,
        vel: dir.multiplyScalar(speed),
      });
    }
  }

  function update(dt) {
    for (let i = active.length - 1; i >= 0; i--) {
      const o = active[i];
      o.life -= dt;
      if (o.life <= 0) {
        o.mesh.visible = false;
        pool.push(o);
        active.splice(i, 1);
        continue;
      }
      o.mesh.visible = true;
      const t = o.life / o.ttl;
      o.mesh.material.opacity = t;
      if (o.kind === 'spark') {
        o.mesh.position.addScaledVector(o.vel, dt);
        // gravity
        o.vel.y -= 6 * dt;
        const s = (o.mesh.scale.x || 1) * 0.99;
        if (s > 0.1) o.mesh.scale.setScalar(s);
      }
      // beams don't move; they just fade
    }
  }

  function clear() {
    for (const o of active) {
      o.mesh.visible = false;
      pool.push(o);
    }
    active.length = 0;
  }

  return { beam, muzzle, hitSpark, explosion, update, clear };
}
