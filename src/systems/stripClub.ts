import * as THREE from "three";
import { STRIP_CLUB_MILES } from "./meters";

/** World meters to the first story stop (~5 min at ~54 mph cruise). */
export const STRIP_CLUB_DISTANCE = 7200;

export interface StripClub {
  group: THREE.Group;
  approached: boolean;
  offered: boolean;
}

export function createStripClub(): StripClub {
  const group = new THREE.Group();
  group.position.set(14, 0, STRIP_CLUB_DISTANCE);

  const lot = new THREE.Mesh(
    new THREE.PlaneGeometry(22, 28),
    new THREE.MeshStandardMaterial({ color: 0x1a1a22, roughness: 0.95 }),
  );
  lot.rotation.x = -Math.PI / 2;
  lot.position.set(0, 0.01, 0);
  group.add(lot);

  const building = new THREE.Mesh(
    new THREE.BoxGeometry(14, 6, 10),
    new THREE.MeshStandardMaterial({
      color: 0x2a1828,
      roughness: 0.8,
      flatShading: true,
    }),
  );
  building.position.set(2, 3, 0);
  group.add(building);

  const neon = new THREE.Mesh(
    new THREE.BoxGeometry(10, 1.4, 0.3),
    new THREE.MeshStandardMaterial({
      color: 0xff44aa,
      emissive: 0xff2288,
      emissiveIntensity: 1.4,
      flatShading: true,
    }),
  );
  neon.position.set(2, 7.2, 5.2);
  neon.name = "neon";
  group.add(neon);

  const marquee = new THREE.Mesh(
    new THREE.BoxGeometry(8, 0.6, 0.2),
    new THREE.MeshBasicMaterial({ color: 0xffee88 }),
  );
  marquee.position.set(2, 6.2, 5.3);
  group.add(marquee);

  const pink = new THREE.PointLight(0xff3399, 0.2, 90, 1.5);
  pink.position.set(2, 8, 6);
  pink.name = "pinkLight";
  group.add(pink);

  const purple = new THREE.PointLight(0xaa44ff, 0.15, 70, 1.5);
  purple.position.set(-4, 5, 2);
  purple.name = "purpleLight";
  group.add(purple);

  for (const x of [-3, 1, 5]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.08, 5, 6),
      new THREE.MeshBasicMaterial({ color: 0xff66cc }),
    );
    pole.position.set(x, 2.5, 4);
    group.add(pole);
  }

  return { group, approached: false, offered: false };
}

export function updateStripClub(
  club: StripClub,
  truckZ: number,
  miles: number,
): { near: boolean; shouldOffer: boolean; distanceM: number } {
  const distanceM = club.group.position.z - truckZ;
  const near = distanceM < 420 && distanceM > -40;
  const intensity = near
    ? Math.min(1, Math.max(0.15, 1 - Math.abs(distanceM) / 420))
    : distanceM < 900
      ? 0.12
      : 0.05;

  const pink = club.group.getObjectByName("pinkLight") as THREE.PointLight | undefined;
  const purple = club.group.getObjectByName("purpleLight") as THREE.PointLight | undefined;
  const neon = club.group.getObjectByName("neon") as THREE.Mesh | undefined;
  if (pink) pink.intensity = 0.4 + intensity * 8;
  if (purple) purple.intensity = 0.3 + intensity * 5;
  if (neon) {
    const mat = neon.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity = 0.6 + intensity * 2.2;
  }

  let shouldOffer = false;
  if (!club.approached && (miles >= STRIP_CLUB_MILES - 0.4 || distanceM < 300)) {
    club.approached = true;
  }
  if (club.approached && !club.offered && distanceM < 100 && distanceM > -30) {
    club.offered = true;
    shouldOffer = true;
  }

  return { near, shouldOffer, distanceM };
}
