import * as THREE from "three";

/** Hallucinated deer — appears when BAC is below the floor. */

export interface DeerSystem {
  mesh: THREE.Group;
  active: boolean;
  timer: number;
}

export function createDeer(): DeerSystem {
  const mesh = new THREE.Group();
  mesh.visible = false;

  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.6, 0.7, 1.4),
    new THREE.MeshStandardMaterial({
      color: 0x8a6a3a,
      emissive: 0x221100,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
    }),
  );
  body.position.y = 0.9;
  mesh.add(body);

  const head = new THREE.Mesh(
    new THREE.BoxGeometry(0.35, 0.35, 0.45),
    new THREE.MeshStandardMaterial({
      color: 0x9a7a4a,
      flatShading: true,
      transparent: true,
      opacity: 0.85,
    }),
  );
  head.position.set(0, 1.4, 0.7);
  mesh.add(head);

  // Eyes glow
  for (const side of [-1, 1]) {
    const eye = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 6, 6),
      new THREE.MeshBasicMaterial({ color: 0xff4422 }),
    );
    eye.position.set(side * 0.12, 1.45, 0.9);
    mesh.add(eye);
  }

  return { mesh, active: false, timer: 0 };
}

export function updateDeer(
  deer: DeerSystem,
  opts: {
    belowFloor: boolean;
    truckX: number;
    truckZ: number;
    truckYaw: number;
    dt: number;
  },
): void {
  const { belowFloor, truckX, truckZ, truckYaw, dt } = opts;

  if (belowFloor) {
    deer.timer += dt;
    if (!deer.active && deer.timer > 1.2) {
      deer.active = true;
      deer.mesh.visible = true;
      const side = Math.random() > 0.5 ? 1 : -1;
      const dist = 28 + Math.random() * 18;
      deer.mesh.position.set(
        truckX + Math.sin(truckYaw) * dist + side * 3,
        0,
        truckZ + Math.cos(truckYaw) * dist,
      );
      deer.mesh.rotation.y = truckYaw + Math.PI + (Math.random() - 0.5) * 0.4;
    }
  } else {
    deer.timer = 0;
    if (deer.active) {
      deer.active = false;
      deer.mesh.visible = false;
    }
  }

  if (deer.active) {
    // Drift toward truck path — scare
    const dx = truckX - deer.mesh.position.x;
    const dz = truckZ - deer.mesh.position.z;
    const d = Math.hypot(dx, dz);
    if (d < 6) {
      // Flicker / vanish close — still a hallucination
      deer.mesh.visible = Math.sin(performance.now() * 0.02) > -0.3;
    }
    if (d < 2.5) {
      deer.active = false;
      deer.mesh.visible = false;
      deer.timer = 0;
    }
  }
}
