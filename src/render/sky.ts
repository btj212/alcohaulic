import * as THREE from "three";

/** Night sky: star field + low moon that trail the truck down the interstate. */

export interface SkySystem {
  group: THREE.Group;
  stars: THREE.Points;
  moon: THREE.Mesh;
}

export function createSky(): SkySystem {
  const group = new THREE.Group();

  const starCount = 420;
  const positions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const angle = Math.random() * Math.PI; // dome
    const radius = 160 + Math.random() * 60;
    positions[i * 3] = Math.cos(angle) * radius * (Math.random() > 0.5 ? 1 : -1);
    positions[i * 3 + 1] = 25 + Math.random() * 120;
    positions[i * 3 + 2] = (Math.random() * 2 - 1) * 220;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const stars = new THREE.Points(
    geo,
    new THREE.PointsMaterial({
      color: 0xcdd8ee,
      size: 0.7,
      sizeAttenuation: false,
      transparent: true,
      opacity: 0.85,
      fog: false,
    }),
  );
  group.add(stars);

  const moon = new THREE.Mesh(
    new THREE.CircleGeometry(9, 24),
    new THREE.MeshBasicMaterial({ color: 0xe8e4d0, fog: false }),
  );
  moon.position.set(-70, 85, 160);
  group.add(moon);

  const moonGlow = new THREE.Mesh(
    new THREE.CircleGeometry(14, 24),
    new THREE.MeshBasicMaterial({
      color: 0x9aa4c0,
      transparent: true,
      opacity: 0.25,
      fog: false,
    }),
  );
  moonGlow.position.set(-70, 85, 159.5);
  group.add(moonGlow);

  return { group, stars, moon };
}

export function updateSky(sky: SkySystem, truckZ: number, night: number): void {
  sky.group.position.z = truckZ;
  const mats = [
    (sky.stars.material as THREE.PointsMaterial),
  ];
  for (const m of mats) m.opacity = 0.3 + night * 0.6;
  // Moon and glow always face the camera direction (billboards toward -Z viewer)
  for (const child of sky.group.children) {
    if (child instanceof THREE.Mesh) child.lookAt(0, child.position.y, truckZ - 200);
  }
}
