import type { Inventory, MeterState } from "../systems/meters";
import { quotaProgress } from "../systems/meters";
import type { DeathCard } from "../content/deathCopy";

export interface HUD {
  root: HTMLDivElement;
  setPlaying: (m: MeterState, inv: Inventory, quota: number, lag: number) => void;
  showTitle: (show: boolean) => void;
  showDeath: (card: DeathCard | null) => void;
  showPulloff: (
    show: boolean,
    m: MeterState,
    inv: Inventory,
    stripClub?: boolean,
  ) => void;
  showHowTo: (show: boolean) => void;
  showTip: (text: string | null, urgent?: boolean) => void;
  onStart: (() => void) | null;
  onRestart: (() => void) | null;
  onConsume: ((item: "beer" | "liquor" | "coffee") => void) | null;
  onPulloffAction: ((action: string) => void) | null;
  onResume: (() => void) | null;
}

export function createHUD(parent: HTMLElement): HUD {
  const root = document.createElement("div");
  root.id = "hud";
  root.innerHTML = `
    <div id="title-screen" class="panel">
      <div class="brand">ALCOHAULIC</div>
      <p class="tagline">Stay drunk enough to function.<br/>Sober enough to drive.<br/>Employed enough to eat.</p>
      <button type="button" id="btn-start" class="cta">Start haul</button>
      <button type="button" id="btn-howto" class="ghost">How to play</button>
      <p class="hint">A / D or mouse steer · cruise on · 1 beer · 2 liquor · 3 coffee · ~5 min to Lucy’s</p>
    </div>
    <div id="howto" class="panel hidden">
      <h2>How to play</h2>
      <ul>
        <li>The rig cruises on its own — steer with A/D. Sip (1) when BAC drops.</li>
        <li>Your BAC drains in real time. Too sober → withdrawal → death.</li>
        <li>Too drunk → blackout. Stay in the pocket between floor and ceiling.</li>
        <li>Alertness falls with miles and night. Micro-sleeps crash the rig.</li>
        <li>Pull off (P) to buy supplies or sleep — sleep sobers you toward the floor.</li>
        <li>Make the mile quota before dawn. Crashes punish you, not bystanders.</li>
      </ul>
      <button type="button" id="btn-howto-back" class="cta">Back</button>
    </div>
    <div id="meters" class="hidden">
      <div class="meter"><span>BAC</span><div class="bar"><i id="bar-bac"></i><em id="floor-mark"></em><em id="ceil-mark"></em></div></div>
      <div class="meter"><span>ALERT</span><div class="bar"><i id="bar-alert"></i></div></div>
      <div class="meter"><span>JOB</span><div class="bar"><i id="bar-job"></i></div></div>
      <div class="meter"><span>CARGO</span><div class="bar"><i id="bar-cargo"></i></div></div>
      <div class="meter"><span>HAUL</span><div class="bar"><i id="bar-haul"></i></div></div>
      <div id="inv">🍺 <b id="inv-beer">0</b> · 🥃 <b id="inv-liquor">0</b> · ☕ <b id="inv-coffee">0</b> · $<b id="inv-cash">0</b></div>
      <div id="speed">0 mph · lag <span id="lag">0.00</span></div>
    </div>
    <div id="play-tip" class="hidden"></div>
    <div id="death-card" class="panel hidden">
      <div class="death-headline" id="death-headline"></div>
      <div class="death-sub" id="death-sub"></div>
      <p class="death-tip" id="death-tip"></p>
      <button type="button" id="btn-restart" class="cta">Another haul</button>
    </div>
    <div id="pulloff" class="panel hidden">
      <h2 id="pulloff-title">Pull-off</h2>
      <p id="pulloff-blurb">Sodium lights. The ice machine is dying.</p>
      <div class="shop">
        <button type="button" data-buy="beer">Beer $4</button>
        <button type="button" data-buy="liquor">Liquor $12</button>
        <button type="button" data-buy="coffee">Coffee $3</button>
        <button type="button" data-act="sleep">Sleep in cab</button>
        <button type="button" data-act="resume" class="cta">Back on the road</button>
      </div>
      <p class="hint">Cash: $<span id="pulloff-cash">0</span> · Sleep drains BAC toward the floor.</p>
    </div>
  `;
  parent.appendChild(root);

  const hud: HUD = {
    root,
    onStart: null,
    onRestart: null,
    onConsume: null,
    onPulloffAction: null,
    onResume: null,
    setPlaying(m, inv, quota, lag) {
      root.querySelector("#meters")?.classList.remove("hidden");
      const bac = root.querySelector("#bar-bac") as HTMLElement;
      const alert = root.querySelector("#bar-alert") as HTMLElement;
      const job = root.querySelector("#bar-job") as HTMLElement;
      const haul = root.querySelector("#bar-haul") as HTMLElement;
      bac.style.width = `${m.bac * 100}%`;
      alert.style.width = `${m.alertness * 100}%`;
      job.style.width = `${m.jobStanding * 100}%`;
      haul.style.width = `${quotaProgress(m.miles, quota) * 100}%`;
      const cargo = root.querySelector("#bar-cargo") as HTMLElement | null;
      if (cargo) {
        cargo.style.width = `${m.cargoIntegrity * 100}%`;
        cargo.classList.toggle("damaged", m.cargoIntegrity < 0.45);
      }
      const floor = root.querySelector("#floor-mark") as HTMLElement;
      const ceil = root.querySelector("#ceil-mark") as HTMLElement;
      floor.style.left = `${m.floor * 100}%`;
      ceil.style.left = `${m.ceiling * 100}%`;
      (root.querySelector("#inv-beer") as HTMLElement).textContent = String(inv.beer);
      (root.querySelector("#inv-liquor") as HTMLElement).textContent = String(inv.liquor);
      (root.querySelector("#inv-coffee") as HTMLElement).textContent = String(inv.coffee);
      (root.querySelector("#inv-cash") as HTMLElement).textContent = String(m.cash);
      const lagEl = root.querySelector("#lag");
      if (lagEl) lagEl.textContent = lag.toFixed(2);
    },
    showTitle(show) {
      root.querySelector("#title-screen")?.classList.toggle("hidden", !show);
      if (show) root.querySelector("#meters")?.classList.add("hidden");
    },
    showDeath(card) {
      const el = root.querySelector("#death-card") as HTMLElement;
      if (!card) {
        el.classList.add("hidden");
        return;
      }
      el.classList.remove("hidden");
      (root.querySelector("#death-headline") as HTMLElement).textContent = card.headline;
      (root.querySelector("#death-sub") as HTMLElement).textContent = card.sub;
      (root.querySelector("#death-tip") as HTMLElement).textContent = card.tip;
      root.querySelector("#meters")?.classList.add("hidden");
    },
    showPulloff(show, m, inv, stripClub = false) {
      const el = root.querySelector("#pulloff") as HTMLElement;
      el.classList.toggle("hidden", !show);
      el.classList.toggle("strip-club", stripClub);
      if (show) {
        (root.querySelector("#pulloff-cash") as HTMLElement).textContent = String(m.cash);
        const title = root.querySelector("#pulloff-title");
        if (title) title.textContent = stripClub ? "Lucky Lucy's" : "Pull-off";
        void inv;
      }
    },
    showHowTo(show) {
      root.querySelector("#howto")?.classList.toggle("hidden", !show);
    },
    showTip(text, urgent = false) {
      const el = root.querySelector("#play-tip") as HTMLElement | null;
      if (!el) return;
      if (!text) {
        el.classList.add("hidden");
        el.classList.remove("urgent");
        return;
      }
      el.textContent = text;
      el.classList.remove("hidden");
      el.classList.toggle("urgent", urgent);
    },
  };

  root.querySelector("#btn-start")?.addEventListener("click", () => hud.onStart?.());
  root.querySelector("#btn-restart")?.addEventListener("click", () => hud.onRestart?.());
  root.querySelector("#btn-howto")?.addEventListener("click", () => {
    hud.showTitle(false);
    hud.showHowTo(true);
  });
  root.querySelector("#btn-howto-back")?.addEventListener("click", () => {
    hud.showHowTo(false);
    hud.showTitle(true);
  });
  root.querySelectorAll("[data-buy]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const item = (btn as HTMLElement).dataset.buy;
      if (item) hud.onPulloffAction?.(`buy:${item}`);
    });
  });
  root.querySelectorAll("[data-act]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const act = (btn as HTMLElement).dataset.act;
      if (act === "resume") hud.onResume?.();
      else if (act) hud.onPulloffAction?.(act);
    });
  });

  return hud;
}

export function setHudSpeed(
  hud: HUD,
  mph: number,
  miles: number,
  lag: number,
  haul = 1,
): void {
  const speedEl = hud.root.querySelector("#speed");
  if (speedEl) {
    speedEl.innerHTML = `haul ${haul} · ${Math.round(mph)} mph · ${Math.floor(miles)} mi · lag <span id="lag">${lag.toFixed(2)}</span>`;
  }
}
