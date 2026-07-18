import type { PerspectiveCamera } from "three";

/** CSS overlay + light camera nudge — never set camera.rotation after lookAt (gimbal flip). */

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
    wired: number;
    microSleep: boolean;
    camera: PerspectiveCamera;
    time: number;
    /** Horizontal look offset in world units (applied by caller via lookAt). */
    lookNudge: { x: number; y: number };
  },
): void {
  const { intensity, tremor, wired, microSleep, time, lookNudge } = opts;
  const drunk = Math.max(0, Math.min(1.4, intensity));
  const wire = Math.max(0, Math.min(1, wired));

  vision.overlay.style.setProperty("--dv", String(drunk));
  vision.overlay.style.setProperty("--tremor", String(tremor));
  vision.overlay.style.setProperty("--wired", String(wire));
  vision.overlay.classList.toggle("active", drunk > 0.05 || tremor > 0.05 || wire > 0.08);
  vision.overlay.classList.toggle("microsleep", microSleep);
  vision.overlay.classList.toggle("withdrawal", tremor > 0.12);
  vision.overlay.classList.toggle("wired", wire > 0.15);

  // Double-vision ghost — stronger when drunk
  vision.ghost.style.opacity = String(Math.min(0.55, drunk * 0.42));
  vision.ghost.style.transform = `translate(${(Math.sin(time * 1.7) * 14 * drunk).toFixed(1)}px, ${(Math.cos(time * 1.3) * 7 * drunk).toFixed(1)}px)`;

  // Feed look-target nudge (caller applies) — no camera.rotation writes
  lookNudge.x = Math.sin(time * 1.9) * 0.35 * drunk + Math.sin(time * 31) * 0.12 * tremor;
  lookNudge.y = Math.cos(time * 1.4) * 0.12 * drunk + (wire > 0 ? Math.sin(time * 22) * 0.08 * wire : 0);
}
