import * as THREE from "three";
import type { TruckState } from "../systems/physics";

export interface TruckLights {
  left: THREE.SpotLight;
  right: THREE.SpotLight;
}

export function createTruckMesh(): { mesh: THREE.Group; lights: TruckLights } {
  const g = new THREE.Group();

  const cabMat = new THREE.MeshStandardMaterial({
    color: 0xc96840,
    roughness: 0.65,
    flatShading: true,
  });
  const darkMat = new THREE.MeshStandardMaterial({
    color: 0x333340,
    roughness: 0.85,
    flatShading: true,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0x99a0aa,
    roughness: 0.35,
    metalness: 0.65,
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
      color: 0xa8d8f0,
      emissive: 0x224466,
      emissiveIntensity: 0.35,
      flatShading: true,
      transparent: true,
      opacity: 0.75,
    }),
  );
  windshield.position.set(0, 2.2, 1.95);
  windshield.rotation.x = -0.25;
  g.add(windshield);

  const trailer = new THREE.Mesh(new THREE.BoxGeometry(2.6, 3.0, 10), darkMat);
  trailer.position.set(0, 2.0, -8.5);
  trailer.name = "trailer";
  g.add(trailer);

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

  // Headlights — strong cones that light the opening highway
  const lights: TruckLights = {
    left: makeHeadlight(g, -0.85),
    right: makeHeadlight(g, 0.85),
  };

  // Taillights for silhouette readability
  for (const side of [-1, 1]) {
    const tail = new THREE.Mesh(
      new THREE.BoxGeometry(0.35, 0.2, 0.08),
      new THREE.MeshBasicMaterial({ color: 0xff4422 }),
    );
    tail.position.set(side * 1.1, 1.2, -13.4);
    g.add(tail);
  }

  return { mesh: g, lights };
}

function makeHeadlight(parent: THREE.Group, x: number): THREE.SpotLight {
  const light = new THREE.SpotLight(0xfff0d0, 28, 90, 0.55, 0.35, 1.1);
  light.position.set(x, 1.25, 3.35);
  light.target.position.set(x * 0.3, 0.2, 40);
  parent.add(light);
  parent.add(light.target);

  const lens = new THREE.Mesh(
    new THREE.BoxGeometry(0.4, 0.28, 0.12),
    new THREE.MeshBasicMaterial({ color: 0xffffee }),
  );
  lens.position.set(x, 1.2, 3.2);
  parent.add(lens);

  // Soft fill so asphalt near the bumper isn't a black void
  const fill = new THREE.PointLight(0xffe8c0, 2.8, 22, 2);
  fill.position.set(x, 1.4, 4.5);
  parent.add(fill);

  return light;
}

export function syncTruckMesh(mesh: THREE.Group, t: TruckState): void {
  mesh.position.set(t.x, 0, t.z);
  mesh.rotation.y = t.yaw;
  const trailer = mesh.getObjectByName("trailer");
  if (trailer) {
    trailer.rotation.y = t.trailerYaw - t.yaw;
  }
  // Keep spotlight targets aimed down the road in world space
  mesh.updateMatrixWorld(true);
}
