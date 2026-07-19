import type { Inventory, MeterState } from "../systems/meters";
import type { Consumable } from "../systems/meters";

/** Bottom-right cab cam — Earl's actual face, filtered by his bloodstream. */

export interface CabPortrait {
  root: HTMLDivElement;
  setState: (m: MeterState, inv: Inventory) => void;
  playConsume: (item: Consumable) => void;
}

export function createCabPortrait(parent: HTMLElement): CabPortrait {
  const root = document.createElement("div");
  root.id = "cab-portrait";
  root.innerHTML = `
    <div class="cab-frame">
      <div class="cab-label">CAB CAM · EARL</div>
      <div class="cab-face-wrap">
        <img src="/earl-face.png" alt="Earl" class="cab-face" draggable="false" />
        <div class="cab-prop" id="cab-prop"></div>
      </div>
      <div class="cab-status" id="cab-status">in the pocket</div>
    </div>
  `;
  parent.appendChild(root);

  let animTimer = 0;

  return {
    root,
    setState(m) {
      root.classList.toggle("drunk", m.bac > m.pocketCenter + 0.08);
      root.classList.toggle("wasted", m.bac > m.ceiling * 0.7);
      root.classList.toggle("wired", m.wired > 0.2);
      root.classList.toggle("shaking", m.bac < m.floor + 0.02);
      root.classList.toggle("dead-eyed", m.alertness < 0.35);

      const status = root.querySelector("#cab-status");
      if (status) {
        if (m.bac < m.floor) status.textContent = "shaking";
        else if (m.wired > 0.35) status.textContent = "wired";
        else if (m.bac > m.ceiling * 0.7) status.textContent = "swimming";
        else if (m.bac > m.pocketCenter + 0.1) status.textContent = "buzzed";
        else status.textContent = "in the pocket";
      }
    },
    playConsume(item) {
      const prop = root.querySelector("#cab-prop") as HTMLElement | null;
      if (!prop) return;
      prop.textContent = item === "beer" ? "🍺" : item === "liquor" ? "🥃" : "💊";
      root.classList.remove("sipping");
      void root.offsetWidth;
      root.classList.add("sipping");
      window.clearTimeout(animTimer);
      animTimer = window.setTimeout(() => root.classList.remove("sipping"), 900);
    },
  };
}
