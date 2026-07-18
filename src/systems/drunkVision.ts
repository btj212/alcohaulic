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

  // Cap darkness — distortion/blur without blacking out the road
  const visual = Math.min(1.1, i);
  vision.overlay.style.setProperty("--dv", String(visual));
  vision.overlay.style.setProperty("--tremor", String(tremor));
  vision.overlay.classList.toggle("active", visual > 0.04 || tremor > 0.04);
  vision.overlay.classList.toggle("microsleep", microSleep);
  vision.overlay.classList.toggle("withdrawal", tremor > 0.15);

  vision.ghost.style.opacity = String(Math.min(0.5, visual * 0.4));
  vision.ghost.style.transform = `translate(${(Math.sin(time * 1.7) * 10 * visual).toFixed(1)}px, ${(Math.cos(time * 1.3) * 5 * visual).toFixed(1)}px)`;

  const wobbleX = Math.sin(time * 2.1) * 0.014 * visual;
  const wobbleY = Math.cos(time * 1.6) * 0.01 * visual;
  const shake =
    tremor > 0
      ? (Math.sin(time * 28) * 0.025 + Math.sin(time * 41) * 0.018) * tremor
      : 0;
  camera.rotation.z = wobbleX + shake;
  camera.position.y += wobbleY * 0.5;
}
