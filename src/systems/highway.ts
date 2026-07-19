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
      color: 0x2a2a35,
      roughness: 0.92,
      metalness: 0.05,
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
        color: 0x3a3224,
        roughness: 1,
        flatShading: true,
      }),
    );
    shoulder.rotation.x = -Math.PI / 2;
    shoulder.position.set(side * (LANE_HALF + 8), -0.02, CHUNK_LEN / 2);
    g.add(shoulder);
  }

  // Center dashes — emissive so they read at night
  const dashMat = new THREE.MeshStandardMaterial({
    color: 0xe8c84a,
    emissive: 0x665010,
    emissiveIntensity: 0.85,
    flatShading: true,
  });
  for (let i = 0; i < 8; i++) {
    const dash = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.05, 3.5), dashMat);
    dash.position.set(0, 0.04, 6 + i * 10);
    g.add(dash);
  }

  // Edge lines
  const edgeMat = new THREE.MeshStandardMaterial({
    color: 0xc8d4e0,
    emissive: 0x334455,
    emissiveIntensity: 0.55,
    flatShading: true,
  });
  for (const side of [-1, 1]) {
    const edge = new THREE.Mesh(
      new THREE.BoxGeometry(0.18, 0.05, CHUNK_LEN * 0.95),
      edgeMat,
    );
    edge.position.set(side * LANE_HALF, 0.04, CHUNK_LEN / 2);
    g.add(edge);
  }

  // Sparse poles / mile markers
  const rng = mulberry(seed);
  for (let i = 0; i < 3; i++) {
    const z = 10 + rng() * (CHUNK_LEN - 20);
    const side = rng() > 0.5 ? 1 : -1;
    const pole = new THREE.Mesh(
      new THREE.BoxGeometry(0.2, 3.2, 0.2),
      new THREE.MeshStandardMaterial({ color: 0x6a6a78, flatShading: true }),
    );
    pole.position.set(side * (LANE_HALF + 3.5), 1.6, z);
    g.add(pole);

    if (rng() > 0.45) {
      const sign = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 0.7, 0.08),
        new THREE.MeshStandardMaterial({
          color: 0x3d7a4d,
          emissive: 0x1a3a22,
          emissiveIntensity: 0.6,
          flatShading: true,
        }),
      );
      sign.position.set(side * (LANE_HALF + 3.5), 2.8, z);
      g.add(sign);
    }
  }

  // Sodium streetlights — brighter, more frequent
  if (rng() > 0.2) {
    const side = rng() > 0.5 ? 1 : -1;
    const lz = CHUNK_LEN * (0.35 + rng() * 0.4);
    const lightPole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.15, 7, 5),
      new THREE.MeshStandardMaterial({ color: 0x444450, flatShading: true }),
    );
    lightPole.position.set(side * (LANE_HALF + 5), 3.5, lz);
    g.add(lightPole);

    const lamp = new THREE.PointLight(0xffb86a, 4.5, 55, 1.6);
    lamp.position.set(side * (LANE_HALF + 4), 6.8, lz);
    g.add(lamp);

    const glow = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffcc88 }),
    );
    glow.position.copy(lamp.position);
    g.add(glow);
  }

  // Guardrails along both shoulders
  const railMat = new THREE.MeshStandardMaterial({
    color: 0x5a626e,
    metalness: 0.5,
    roughness: 0.5,
    flatShading: true,
  });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.45, CHUNK_LEN * 0.96),
      railMat,
    );
    rail.position.set(side * (LANE_HALF + 1.6), 0.65, CHUNK_LEN / 2);
    g.add(rail);
    for (let i = 0; i < 5; i++) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.65, 0.1), railMat);
      post.position.set(side * (LANE_HALF + 1.6), 0.32, 8 + i * 16);
      g.add(post);
    }
  }

  // Scrub pines + brush silhouettes on the shoulders
  const treeMat = new THREE.MeshStandardMaterial({
    color: 0x16281c,
    roughness: 1,
    flatShading: true,
  });
  const trunkMat = new THREE.MeshStandardMaterial({
    color: 0x241a12,
    roughness: 1,
    flatShading: true,
  });
  const treeCount = 2 + Math.floor(rng() * 4);
  for (let i = 0; i < treeCount; i++) {
    const side = rng() > 0.5 ? 1 : -1;
    const tz = rng() * CHUNK_LEN;
    const dist = LANE_HALF + 9 + rng() * 22;
    const h = 4 + rng() * 7;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4 + rng() * 1.2, h, 6), treeMat);
    cone.position.set(side * dist, h / 2 + 0.6, tz);
    g.add(cone);
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.24, 1.2, 5), trunkMat);
    trunk.position.set(side * dist, 0.6, tz);
    g.add(trunk);
  }

  // Distant hill silhouettes
  if (rng() > 0.5) {
    const side = rng() > 0.5 ? 1 : -1;
    const hill = new THREE.Mesh(
      new THREE.ConeGeometry(26 + rng() * 22, 13 + rng() * 10, 7),
      new THREE.MeshStandardMaterial({ color: 0x0e1622, roughness: 1, flatShading: true }),
    );
    hill.position.set(side * (LANE_HALF + 46 + rng() * 25), 4, rng() * CHUNK_LEN);
    g.add(hill);
  }

  // Rare far-off landmarks: radio mast or water tower
  const landmarkRoll = rng();
  if (landmarkRoll > 0.82) {
    const side = rng() > 0.5 ? 1 : -1;
    const lx = side * (LANE_HALF + 30 + rng() * 30);
    const lz = rng() * CHUNK_LEN;
    if (landmarkRoll > 0.91) {
      // Radio mast with red beacons
      const mast = new THREE.Mesh(
        new THREE.CylinderGeometry(0.15, 0.5, 34, 4),
        new THREE.MeshStandardMaterial({ color: 0x2a2a32, flatShading: true }),
      );
      mast.position.set(lx, 17, lz);
      g.add(mast);
      for (const h of [12, 24, 34]) {
        const beacon = new THREE.Mesh(
          new THREE.SphereGeometry(0.35, 6, 6),
          new THREE.MeshBasicMaterial({ color: 0xff2222 }),
        );
        beacon.position.set(lx, h, lz);
        g.add(beacon);
      }
    } else {
      // Rusty water tower
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(4, 4.4, 5, 8),
        new THREE.MeshStandardMaterial({ color: 0x4a3a2e, roughness: 0.95, flatShading: true }),
      );
      tank.position.set(lx, 14, lz);
      g.add(tank);
      const cap = new THREE.Mesh(
        new THREE.ConeGeometry(4.4, 2.2, 8),
        new THREE.MeshStandardMaterial({ color: 0x3a2e24, roughness: 1, flatShading: true }),
      );
      cap.position.set(lx, 17.6, lz);
      g.add(cap);
      for (const [ox, oz] of [
        [-2.5, -2.5],
        [2.5, -2.5],
        [-2.5, 2.5],
        [2.5, 2.5],
      ] as const) {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.3, 12, 0.3),
          new THREE.MeshStandardMaterial({ color: 0x33291f, flatShading: true }),
        );
        leg.position.set(lx + ox, 6, lz + oz);
        g.add(leg);
      }
    }
  }

  // Occasional roadside billboard (dark comedy filler)
  if (rng() > 0.62) {
    const side = rng() > 0.5 ? 1 : -1;
    const bz = 15 + rng() * (CHUNK_LEN - 30);
    const board = new THREE.Mesh(
      new THREE.BoxGeometry(7, 3.2, 0.2),
      new THREE.MeshStandardMaterial({
        color: [0x6a2a3a, 0x2a4a5a, 0x5a4a1a][Math.floor(rng() * 3)],
        emissive: 0x111111,
        flatShading: true,
      }),
    );
    board.position.set(side * (LANE_HALF + 11), 5.4, bz);
    board.rotation.y = side > 0 ? -0.5 : 0.5;
    g.add(board);
    for (const px of [-2.6, 2.6]) {
      const leg = new THREE.Mesh(
        new THREE.BoxGeometry(0.22, 4, 0.22),
        new THREE.MeshStandardMaterial({ color: 0x33333c, flatShading: true }),
      );
      leg.position.set(side * (LANE_HALF + 11) + px * 0.4, 1.9, bz);
      g.add(leg);
    }
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
