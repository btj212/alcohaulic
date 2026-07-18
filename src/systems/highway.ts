import * as THREE from "three";

const CHUNK_LEN = 80;
const LANE_HALF = 5.5;
const AHEAD = 8;
const BEHIND = 2;

export interface HighwayWorld {
  group: THREE.Group;
  laneHalfWidth: number;
  chunkLen: number;
}

export function createHighway(): HighwayWorld {
  return {
    group: new THREE.Group(),
    laneHalfWidth: LANE_HALF,
    chunkLen: CHUNK_LEN,
  };
}

function makeChunk(seed: number, z0: number): THREE.Group {
  const g = new THREE.Group();
  g.position.z = z0;
  g.userData.seed = seed;

  const asphalt = new THREE.Mesh(
    new THREE.PlaneGeometry(LANE_HALF * 2 + 2, CHUNK_LEN),
    new THREE.MeshStandardMaterial({
      color: 0x1a1a22,
      roughness: 0.95,
      flatShading: true,
    }),
  );
  asphalt.rotation.x = -Math.PI / 2;
  asphalt.position.y = 0;
  asphalt.position.z = CHUNK_LEN / 2;
  g.add(asphalt);

  // Shoulder dirt
  for (const side of [-1, 1]) {
    const shoulder = new THREE.Mesh(
      new THREE.PlaneGeometry(14, CHUNK_LEN),
      new THREE.MeshStandardMaterial({
        color: 0x2a2418,
        roughness: 1,
        flatShading: true,
      }),
    );
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(side * (LANE_HALF + 8), -0.02, CHUNK_LEN / 2);
    g.add(shoulder);
  }

  // Center dashes
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xc9a227,
    emissive: 0x3a2a00,
    flatShading: true,
  });
  for (let i = 0; i < 8; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 3.5), dashMat);
    dash.position.set(0, 0.03, 6 + i * 10);
    g.add(dash);
  }

  // Edge lines
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0x8899aa,
    flatShading: true,
  });
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.15, 0.04, CHUNK_LEN * 0.95),
      edgeMat,
    );
    edge.position.set(side * LANE_HALF, 0.03, CHUNK_LEN / 2);
    g.add(edge);
  }

  // Sparse poles / mile markers
  const rng = mulberry(seed);
  for (let i = 0; i < 3; i++) {
    const z = 10 + rng() * (CHUNK_LEN - 20);
    const side = rng() > 0.5 ? 1 : -1;
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x555560, flatShading: true }),
    );
    pole.position.set(side * (LANE_HALF + 3.5), 1.6, z);
    g.add(pole);

    if (rng() > 0.55) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x2d5a3d,
          emissive: 0x0a1a10,
          flatShading: true,
        }),
      );
      sign.position.set(side * (LANE_HALF + 3.5), 2.8, z);
      g.add(sign);
    }
  }

  // Occasional billboard / sodium light
  if (rng() > 0.4) {
    const lightPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0x333340, flatShading: true }),
    );
    const side = rng() > 0.5 ? 1 : -1;
    lightPole.position.set(side * (LANE_HALF + 5), 3.5, CHUNK_LEN * 0.6);
    g.add(lightPole);
    const lamp = new THREE.PointLight(0xffaa66, 2.2, 40, 2);
    lamp.position.set(side * (LANE_HALF + 4), 6.5, CHUNK_LEN * 0.6);
    g.add(lamp);
  }

  return g;
}

function mulberry(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function updateHighway(world: HighwayWorld, truckZ: number): void {
  const base = Math.floor(truckZ / CHUNK_LEN);
  const needed = new Set<number>();
  for (let i = base - BEHIND; i <= base + AHEAD; i++) needed.add(i);

  const existing = new Map<number, THREE.Object3D>();
  for (const child of [...world.group.children]) {
    const idx = Math.round(child.position.z / CHUNK_LEN);
    if (!needed.has(idx)) {
      world.group.remove(child);
      disposeObject(child);
    } else {
      existing.set(idx, child);
    }
  }

  for (const idx of needed) {
    if (!existing.has(idx)) {
      world.group.add(makeChunk(idx * 9973 + 42, idx * CHUNK_LEN));
    }
  }
}

function disposeObject(obj: THREE.Object3D): void {
  obj.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}
