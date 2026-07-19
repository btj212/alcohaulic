import * as THREE from "three";

/**
 * Road hazards that move like real traffic. Chase cam faces +Z, so
 * SCREEN-RIGHT = -X: your lane lives at negative X, oncoming at positive X.
 * Hits bill the player (cargo), never bystanders — a head-on is YOUR wreck.
 */

export type HazardKind = "slow" | "oncoming" | "debris" | "deer";

export interface Hazard {
  kind: HazardKind;
  mesh: THREE.Group;
  x: number;
  z: number;
  /** m/s along +Z (negative = toward the player). */
  vz: number;
  /** m/s lateral (deer walk across the road). */
  vx: number;
  alive: boolean;
  /** Whoosh/horn played for this hazard already. */
  passed: boolean;
}

export interface TrafficSystem {
  group: THREE.Group;
  hazards: Hazard[];
  spawnTimer: number;
  deerTimer: number;
}

export interface TrafficEvent {
  kind: "wreck" | "glance" | "debris" | "deer" | "whoosh" | "horn";
}

const CAR_COLORS = [0x8a3a2a, 0x2a4a6a, 0x555a44, 0x6a5a2a, 0x4a2a5a, 0x3a3a42];

export function createTraffic(): TrafficSystem {
  return {
    group: new THREE.Group(),
    hazards: [],
    spawnTimer: 5,
    deerTimer: 45,
  };
}

function makeCar(kind: "slow" | "oncoming", color: number): THREE.Group {
  const g = new THREE.Group();
  const isSemi = Math.random() < 0.25;

  if (isSemi) {
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(2.3, 2.4, 2.6),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, flatShading: true }),
    );
    cab.position.set(0, 1.6, kind === "oncoming" ? -3.2 : 3.2);
    g.add(cab);
    const box = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 2.9, 8),
      new THREE.MeshStandardMaterial({ color: 0x3a3a44, roughness: 0.85, flatShading: true }),
    );
    box.position.set(0, 1.9, kind === "oncoming" ? 2 : -2);
    g.add(box);
  } else {
    const isPickup = Math.random() < 0.4;
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(1.9, 1.1, 4.4),
      new THREE.MeshStandardMaterial({ color, roughness: 0.6, metalness: 0.2, flatShading: true }),
    );
    body.position.y = 0.75;
    g.add(body);
    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(1.7, 0.75, isPickup ? 1.3 : 2.0),
      new THREE.MeshStandardMaterial({ color: 0x1a2028, roughness: 0.4, flatShading: true }),
    );
    cabin.position.set(0, 1.55, isPickup ? 0.6 : -0.3);
    g.add(cabin);
    if (isPickup) {
      const bed = new THREE.Mesh(
        new THREE.BoxGeometry(1.8, 0.5, 1.6),
        new THREE.MeshStandardMaterial({ color: 0x14181e, roughness: 0.9, flatShading: true }),
      );
      bed.position.set(0, 1.05, -1.3);
      g.add(bed);
    }
  }

  const frontZ = kind === "oncoming" ? -2.3 : 2.3;
  if (kind === "oncoming") {
    for (const side of [-1, 1]) {
      const lens = new THREE.Mesh(
        new THREE.BoxGeometry(0.32, 0.2, 0.08),
        new THREE.MeshBasicMaterial({ color: 0xfff4cc }),
      );
      lens.position.set(side * 0.65, 0.8, frontZ);
      g.add(lens);
    }
    const glow = new THREE.PointLight(0xfff0c0, 8, 36, 1.7);
    glow.position.set(0, 0.9, frontZ - 1);
    g.add(glow);
  }
  // Everyone gets taillights — nothing invisible on this road
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 0.18, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff3322 }),
    );
    tail.position.set(side * 0.65, 0.85, kind === "oncoming" ? 2.3 : -2.3);
    g.add(tail);
  }
  if (kind === "slow") {
    const glow = new THREE.PointLight(0xff4422, 2.2, 16, 2);
    glow.position.set(0, 0.9, -2.8);
    g.add(glow);
  }
  return g;
}

/** Blown tire + cones — lit so you can actually see it. */
function makeDebris(): THREE.Group {
  const g = new THREE.Group();
  const tire = new THREE.Mesh(
    new THREE.TorusGeometry(0.45, 0.18, 6, 10),
    new THREE.MeshStandardMaterial({ color: 0x18181c, roughness: 1, flatShading: true }),
  );
  tire.rotation.x = Math.PI / 2;
  tire.position.y = 0.2;
  g.add(tire);
  for (const [cx, cz] of [
    [-0.9, 1.2],
    [0.8, -0.8],
  ] as const) {
    const cone = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.7, 8),
      new THREE.MeshStandardMaterial({
        color: 0xd06020,
        emissive: 0x702800,
        emissiveIntensity: 0.8,
        flatShading: true,
      }),
    );
    cone.position.set(cx, 0.35, cz);
    g.add(cone);
  }
  return g;
}

function makeRealDeer(): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({
    color: 0x7a5a34,
    roughness: 0.9,
    flatShading: true,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.75, 1.5), mat);
  body.position.y = 1.0;
  g.add(body);
  const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.4, 0.5), mat);
  head.position.set(0, 1.6, 0.8);
  g.add(head);
  for (const [x, z] of [
    [-0.2, 0.5],
    [0.2, 0.5],
    [-0.2, -0.5],
    [0.2, -0.5],
  ] as const) {
    const leg = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.7, 0.12), mat);
    leg.position.set(x, 0.35, z);
    g.add(leg);
  }
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.05, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xffffaa }),
    );
    eye.position.set(side * 0.1, 1.65, 1.02);
    g.add(eye);
  }
  return g;
}

function spawnHazard(
  sys: TrafficSystem,
  truckZ: number,
  laneHalfWidth: number,
  difficulty: number,
): void {
  const roll = Math.random();
  let hazard: Hazard;
  const color = CAR_COLORS[Math.floor(Math.random() * CAR_COLORS.length)]!;

  if (roll < 0.45) {
    // Traffic flowing your direction, a bit under your cruise — right lane = -X
    const mesh = makeCar("slow", color);
    hazard = {
      kind: "slow",
      mesh,
      x: -(0.8 + Math.random() * (laneHalfWidth - 2.6)),
      z: truckZ + 110 + Math.random() * 70,
      vz: 17.5 + Math.random() * 3.5, // 39–47 mph, real flow
      vx: 0,
      alive: true,
      passed: false,
    };
  } else if (roll < 0.82) {
    // Oncoming lane = +X (screen left)
    const mesh = makeCar("oncoming", color);
    mesh.rotation.y = Math.PI;
    hazard = {
      kind: "oncoming",
      mesh,
      x: 1.8 + Math.random() * (laneHalfWidth - 3),
      z: truckZ + 300 + Math.random() * 140,
      vz: -(22 + Math.random() * 7 + difficulty * 1.5),
      vx: 0,
      alive: true,
      passed: false,
    };
  } else {
    hazard = {
      kind: "debris",
      mesh: makeDebris(),
      x: (Math.random() * 2 - 1) * (laneHalfWidth - 1.6),
      z: truckZ + 220 + Math.random() * 100,
      vz: 0,
      vx: 0,
      alive: true,
      passed: false,
    };
  }

  hazard.mesh.position.set(hazard.x, 0, hazard.z);
  sys.group.add(hazard.mesh);
  sys.hazards.push(hazard);
}

function spawnDeerCrossing(sys: TrafficSystem, truckZ: number, laneHalfWidth: number): void {
  const fromLeft = Math.random() > 0.5;
  const mesh = makeRealDeer();
  const startX = fromLeft ? laneHalfWidth + 7 : -(laneHalfWidth + 7);
  const hazard: Hazard = {
    kind: "deer",
    mesh,
    x: startX,
    z: truckZ + 130 + Math.random() * 60,
    vz: 0,
    vx: (fromLeft ? -1 : 1) * (2.6 + Math.random() * 1.6),
    alive: true,
    passed: false,
  };
  mesh.rotation.y = fromLeft ? -Math.PI / 2 : Math.PI / 2;
  mesh.position.set(hazard.x, 0, hazard.z);
  sys.group.add(mesh);
  sys.hazards.push(hazard);
}

export function updateTraffic(
  sys: TrafficSystem,
  opts: {
    dt: number;
    truckX: number;
    truckZ: number;
    truckSpeed: number;
    laneHalfWidth: number;
    difficulty: number;
  },
): TrafficEvent[] {
  const { dt, truckX, truckZ, laneHalfWidth, difficulty } = opts;
  const events: TrafficEvent[] = [];

  sys.spawnTimer -= dt;
  if (sys.spawnTimer <= 0) {
    spawnHazard(sys, truckZ, laneHalfWidth, difficulty);
    const base = 7.5 - Math.min(4, difficulty * 1.2);
    sys.spawnTimer = base + Math.random() * 4;
  }

  sys.deerTimer -= dt;
  if (sys.deerTimer <= 0) {
    spawnDeerCrossing(sys, truckZ, laneHalfWidth);
    sys.deerTimer = 55 + Math.random() * 40;
  }

  for (const h of sys.hazards) {
    if (!h.alive) continue;
    h.z += h.vz * dt;
    h.x += h.vx * dt;
    h.mesh.position.set(h.x, 0, h.z);

    const dz = h.z - truckZ;
    const dx = h.x - truckX;

    if (h.kind === "debris") {
      if (Math.abs(dx) < 1.7 && Math.abs(dz) < 2.4) {
        events.push({ kind: "debris" });
        h.alive = false;
      }
    } else if (h.kind === "deer") {
      if (Math.abs(dx) < 1.9 && Math.abs(dz) < 2.8) {
        events.push({ kind: "deer" });
        h.alive = false;
      } else if (Math.abs(h.x) > laneHalfWidth + 9) {
        h.alive = false;
      }
    } else {
      if (Math.abs(dz) < 4.6) {
        const overlap = Math.abs(dx);
        if (overlap < 1.5) {
          events.push({ kind: "wreck" });
          h.alive = false;
        } else if (overlap < 2.6) {
          events.push({ kind: "glance" });
          h.alive = false;
        }
      }
      // Pass-by audio: oncoming whoosh, or horn if you're drifting into them
      if (!h.passed && h.kind === "oncoming" && dz < 30 && dz > 0) {
        h.passed = true;
        events.push({ kind: Math.abs(dx) < 3.4 ? "horn" : "whoosh" });
      }
      if (!h.passed && h.kind === "slow" && dz < 6 && Math.abs(dx) > 2.4) {
        h.passed = true;
        events.push({ kind: "whoosh" });
      }
    }

    if (dz < -140 || dz > 620) h.alive = false;
  }

  for (let i = sys.hazards.length - 1; i >= 0; i--) {
    const h = sys.hazards[i]!;
    if (!h.alive) {
      sys.group.remove(h.mesh);
      disposeGroup(h.mesh);
      sys.hazards.splice(i, 1);
    }
  }

  return events;
}

export function resetTraffic(sys: TrafficSystem): void {
  for (const h of sys.hazards) {
    sys.group.remove(h.mesh);
    disposeGroup(h.mesh);
  }
  sys.hazards.length = 0;
  sys.spawnTimer = 5;
  sys.deerTimer = 45;
}

function disposeGroup(g: THREE.Object3D): void {
  g.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.geometry) m.geometry.dispose();
    const mat = m.material;
    if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
    else if (mat) mat.dispose();
  });
}
