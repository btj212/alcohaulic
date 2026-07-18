import * as THREE from "three";

/** CSS/DOM overlay + camera shake driven by BAC — clip identity. */

export interface DrunkVision {
  overlay: HTMLDivElement;
  ghost: HTMLDivElement;
}

export function createDrunkVision(root: HTMLElement): DrunkVision {
  const overlay = document.createElement("div");
  overlay.id = "drunk-overlay";
  overlay.innerHTML = `<div class="vignette"></div><div class="chromatic"></div><div class="wobble"></div>`;
  root.appendChild(overlay);

  const ghost = document.createElement("div");
  ghost.id = "ghost-double";
  root.appendChild(ghost);

  return { overlay, ghost };
}

export function applyDrunkVision(
  vision: DrunkVision,
  opts: {
    intensity: number;
    tremor: number;
    microSleep: boolean;
    camera: THREE.PerspectiveCamera;
    time: number;
  },
): void {
  const { intensity, tremor, microSleep, camera, time } = opts;
  const i = Math.max(0, Math.min(1.5, intensity));

  vision.overlay.style.setProperty("--dv", String(i));
  vision.overlay.style.setProperty("--tremor", String(tremor));
  vision.overlay.classList.toggle("active", i > 0.05 || tremor > 0.05);
  vision.overlay.classList.toggle("microsleep", microSleep);

  // Double-vision ghost opacity
  vision.ghost.style.opacity = String(Math.min(0.45, i * 0.35));
  vision.ghost.style.transform = `translate(${(Math.sin(time * 1.7) * 8 * i).toFixed(1)}px, ${(Math.cos(time * 1.3) * 4 * i).toFixed(1)}px)`;

  // Camera wobble / tremor
  const wobbleX = Math.sin(time * 2.1) * 0.012 * i;
  const wobbleY = Math.cos(time * 1.6) * 0.008 * i;
  const shake =
    tremor > 0
      ? (Math.sin(time * 28) * 0.02 + Math.sin(time * 41) * 0.015) * tremor
      : 0;
  camera.rotation.z = wobbleX + shake;
  camera.position.y += wobbleY * 0.5;
}
