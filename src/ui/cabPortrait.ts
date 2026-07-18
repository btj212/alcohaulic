import type { Inventory, MeterState } from "../systems/meters";
import type { Consumable } from "../systems/meters";

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
      <div class="cab-label">CAB CAM</div>
      <svg class="face" viewBox="0 0 120 140" aria-hidden="true">
        <ellipse class="head" cx="60" cy="62" rx="38" ry="44" />
        <ellipse class="eye left" cx="46" cy="58" rx="7" ry="5" />
        <ellipse class="eye right" cx="74" cy="58" rx="7" ry="5" />
        <circle class="pupil left" cx="47" cy="59" r="2.2" />
        <circle class="pupil right" cx="75" cy="59" r="2.2" />
        <path class="bag left" d="M38 66 q8 6 16 0" />
        <path class="bag right" d="M66 66 q8 6 16 0" />
        <path class="mouth" d="M48 84 q12 6 24 0" />
        <path class="stubble" d="M42 92 q18 14 36 0" />
        <rect class="prop" x="0" y="0" width="0" height="0" />
      </svg>
      <div class="cab-status" id="cab-status">holding</div>
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
      root.classList.toggle("hopeful", m.jobStanding > 0.7 && m.bac > m.floor);

      const status = root.querySelector("#cab-status");
      if (status) {
        if (m.bac < m.floor) status.textContent = "shaking";
        else if (m.wired > 0.35) status.textContent = "wired";
        else if (m.bac > m.ceiling * 0.7) status.textContent = "swimming";
        else if (m.bac > m.pocketCenter + 0.1) status.textContent = "buzzed";
        else status.textContent = "in the pocket";
      }

      // Pupil drift when drunk
      const pupils = root.querySelectorAll(".pupil");
      const drift = (m.bac - m.pocketCenter) * 4;
      pupils.forEach((p, i) => {
        const el = p as SVGElement;
        const base = i === 0 ? 47 : 75;
        el.setAttribute("cx", String(base + drift));
      });
    },
    playConsume(item) {
      root.classList.remove("sip-beer", "sip-liquor", "sip-coffee");
      void root.offsetWidth;
      const cls =
        item === "beer" ? "sip-beer" : item === "liquor" ? "sip-liquor" : "sip-coffee";
      root.classList.add(cls);
      window.clearTimeout(animTimer);
      animTimer = window.setTimeout(() => root.classList.remove(cls), 900);
    },
  };
}
