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
  showStoryCard: (name: string | null, text?: string) => void;
  onStart: (() => void) | null;
  onRestart: (() => void) | null;
  onConsume: ((item: "beer" | "liquor" | "pills") => void) | null;
  onPulloffAction: ((action: string) => void) | null;
  onResume: (() => void) | null;
}

export function createHUD(parent: HTMLElement): HUD {
  const root = document.createElement("div");
  root.id = "hud";
  root.innerHTML = `
    <div id="title-screen" class="panel">
      <div class="brand">ALCOHAULIC</div>
      <div class="title-char">
        <img src="/earl-face.png" alt="Earl" class="title-face" />
        <div class="title-bio">
          <div class="char-name">EARL "SMOKEY" JACKSON</div>
          <div class="char-sub">22 years over-the-road · 2,317,809 miles · 0 sober sunrises</div>
          <p class="tagline">Stay drunk enough to function.<br/>Sober enough to drive.<br/>Employed enough to eat.</p>
        </div>
      </div>
      <div class="controls-grid">
        <span><kbd>A</kbd><kbd>D</kbd> steer</span>
        <span><kbd>W</kbd><kbd>S</kbd> speed</span>
        <span><kbd>1</kbd> beer</span>
        <span><kbd>2</kbd> liquor</span>
        <span><kbd>3</kbd> pills</span>
        <span><kbd>P</kbd> pull off</span>
      </div>
      <button type="button" id="btn-start" class="cta">Start haul</button>
      <button type="button" id="btn-howto" class="ghost">How to play</button>
    </div>
    <div id="howto" class="panel hidden">
      <h2>How to play</h2>
      <ul>
        <li>The rig cruises with traffic — steer with A/D or the mouse.</li>
        <li>BAC drains as you drive. Too sober → the shakes → seizure.</li>
        <li>Too drunk → blackout. Live between the notches. That's the pocket.</li>
        <li>Beer (1) holds the pocket. Liquor (2) is a sledgehammer. Pills (3) force your eyes open.</li>
        <li>Dodge traffic and deer — every hit bills your cargo, and cargo is money.</li>
        <li>Deliver loads, bank cash, spend it at Lucy's on restock. The floor only rises.</li>
      </ul>
      <button type="button" id="btn-howto-back" class="cta">Back</button>
    </div>
    <div id="meters" class="hidden">
      <div class="meter"><span>BAC</span><div class="bar"><i id="bar-bac"></i><em id="floor-mark"></em><em id="ceil-mark"></em></div></div>
      <div class="meter"><span>ALERT</span><div class="bar"><i id="bar-alert"></i></div></div>
      <div class="meter"><span>CARGO</span><div class="bar"><i id="bar-cargo"></i></div></div>
      <div class="meter"><span>HAUL</span><div class="bar"><i id="bar-haul"></i></div></div>
      <div id="cash-line">$<b id="inv-cash">0</b></div>
      <div id="inv">🍺 <b id="inv-beer">0</b> · 🥃 <b id="inv-liquor">0</b> · 💊 <b id="inv-pills">0</b></div>
      <div id="speed">0 mph</div>
    </div>
    <div id="story-card" class="hidden">
      <div id="story-name"></div>
      <div id="story-text"></div>
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
        <button type="button" data-buy="pills">Pills $10</button>
        <button type="button" data-act="sleep">Sleep in cab</button>
        <button type="button" data-act="resume" class="cta">Back on the road</button>
      </div>
      <p class="hint">Cash: $<span id="pulloff-cash">0</span> · Sleep restores alertness but drains BAC toward the floor.</p>
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
      const haul = root.querySelector("#bar-haul") as HTMLElement;
      bac.style.width = `${m.bac * 100}%`;
      alert.style.width = `${m.alertness * 100}%`;
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
      (root.querySelector("#inv-pills") as HTMLElement).textContent = String(inv.pills);
      (root.querySelector("#inv-cash") as HTMLElement).textContent = String(m.cash);
      void lag;
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
    showStoryCard(name, text = "") {
      const el = root.querySelector("#story-card") as HTMLElement | null;
      if (!el) return;
      if (!name) {
        el.classList.add("hidden");
        return;
      }
      (root.querySelector("#story-name") as HTMLElement).textContent = name;
      (root.querySelector("#story-text") as HTMLElement).textContent = text;
      el.classList.remove("hidden");
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
    speedEl.textContent = `haul ${haul} · ${Math.round(mph)} mph · mile ${Math.floor(miles)}`;
  }
  void lag;
}
