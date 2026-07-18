import * as THREE from "three";
import type { TruckState } from "../systems/physics";

export function createTruckMesh(): THREE.Group {
  const g = new THREE.Group();

  const cabMat = new THREE.MeshStandardMaterial({
    color: 0xb85c38,
    roughness: 0.7,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x222228,
    roughness: 0.9,
    flatShading: true,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x889099,
    roughness: 0.4,
    metalness: 0.6,
    flatShading: true,
  });

  const cab = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.2, 3.2), cabMat);
  cab.position.set(0, 1.8, 0.4);
  g.add(cab);

  const sleeper = new THREE.Mesh(new THREE.BoxGeometry(2.4, 2.4, 2.2), cabMat);
  sleeper.position.set(0, 1.9, -1.8);
  g.add(sleeper);

  const hood = new THREE.Mesh(new THREE.BoxGeometry(2.2, 1.1, 1.6), cabMat);
  hood.position.set(0, 1.1, 2.4);
  g.add(hood);

  const windshield = new THREE.Mesh(
    new THREE.BoxGeometry(2.0, 0.9, 0.1),
    new THREE.MeshStandardMaterial({
      color: 0x88ccee,
      emissive: 0x112233,
      flatShading: true,
      transparent: true,
      opacity: 0.7,
    }),
  );
  windshield.position.set(0, 2.2, 1.95);
  windshield.rotation.x = -0.25;
  g.add(windshield);

  // Trailer
  const trailer = new THREE.Mesh(
    new THREE.BoxGeometry(2.6, 3.0, 10),
    darkMat,
  );
  trailer.position.set(0, 2.0, -8.5);
  trailer.name = "trailer";
  g.add(trailer);

  // Wheels
  const wheelGeo = new THREE.CylinderGeometry(0.55, 0.55, 0.4, 8);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const [x, z] of [
    [-1.2, 1.8],
    [1.2, 1.8],
    [-1.2, -0.5],
    [1.2, -0.5],
    [-1.2, -6],
    [1.2, -6],
    [-1.2, -10],
    [1.2, -10],
  ] as const) {
    const w = new THREE.Mesh(wheelGeo, chromeMat);
    w.position.set(x, 0.55, z);
    g.add(w);
  }

  // Headlights
  for (const side of [-1, 1]) {
    const light = new THREE.SpotLight(0xffeebb, 8, 60, 0.45, 0.4, 1);
    light.position.set(side * 0.8, 1.2, 3.2);
    light.target.position.set(side * 0.8, 0.5, 25);
    g.add(light);
    g.add(light.target);
    const lens = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.25, 0.1),
      new THREE.MeshBasicMaterial({ color: 0xffffcc }),
    );
    lens.position.set(side * 0.8, 1.15, 3.15);
    g.add(lens);
  }

  return g;
}

export function syncTruckMesh(mesh: THREE.Group, t: TruckState): void {
  mesh.position.set(t.x, 0, t.z);
  mesh.rotation.y = t.yaw;
  const trailer = mesh.getObjectByName("trailer");
  if (trailer) {
    trailer.rotation.y = t.trailerYaw - t.yaw;
  }
}
