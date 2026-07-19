/** Pure meter math — no Three.js. The pocket lives here. */

export type DeathCause =
  | "withdrawal"
  | "blackout"
  | "crash"
  | "wreck"
  | "fired"
  | "seizure";

export interface MeterState {
  bac: number;
  alertness: number;
  jobStanding: number;
  /** Withdrawal floor — rises with in-run tolerance. */
  floor: number;
  ceiling: number;
  /** Sweet spot center for "in the pocket" feel. */
  pocketCenter: number;
  drinksTaken: number;
  miles: number;
  cash: number;
  cargoIntegrity: number;
  /** Temporary coffee wire — decays over seconds. */
  wired: number;
}

export interface Inventory {
  beer: number;
  liquor: number;
  coffee: number;
}

/** ~5 min to first strip club at cruise with a sip rhythm. */
export const DEFAULT_METERS: MeterState = {
  bac: 0.34,
  alertness: 0.88,
  jobStanding: 1,
  floor: 0.14,
  ceiling: 0.82,
  pocketCenter: 0.34,
  drinksTaken: 0,
  miles: 0,
  cash: 120,
  cargoIntegrity: 1,
  wired: 0,
};

export const DEFAULT_INVENTORY: Inventory = {
  beer: 12,
  liquor: 3,
  coffee: 4,
};

/** First story stop — ~5 minutes at highway cruise. */
export const STRIP_CLUB_MILES = 4.5;

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

export function pocketStress(m: MeterState): number {
  const half = Math.max(0.05, (m.ceiling - m.floor) / 2);
  return clamp01(Math.abs(m.bac - m.pocketCenter) / half);
}

/**
 * Steering lag dial. Pocket = tight. High BAC = delayed / floaty.
 * Low BAC = twitchy tremor lag.
 */
export function steeringLagFromBac(m: MeterState): number {
  const below = m.bac < m.floor;
  const above = m.bac > m.ceiling * 0.75;
  if (below) return 0.22 + (m.floor - m.bac) * 1.8;
  if (above) return 0.2 + (m.bac - m.ceiling * 0.75) * 2.2;
  const stress = pocketStress(m);
  return 0.06 + stress * 0.12;
}

/** How much the wheel wanders from being drunk (0..1). */
export function drunkSwayFromBac(m: MeterState): number {
  if (m.bac < m.floor) return 0.15 + tremorIntensity(m) * 0.5;
  if (m.bac < m.pocketCenter) return pocketStress(m) * 0.15;
  // Above pocket — floaty veer ramps hard
  const over = clamp01((m.bac - m.pocketCenter) / Math.max(0.1, m.ceiling - m.pocketCenter));
  return over * over * 0.85;
}

export function drunkVisionIntensity(m: MeterState): number {
  if (m.bac <= m.floor) return 0.25 + (m.floor - m.bac) * 1.4;
  // Strong readable drunk FX once you're past a beer or two
  if (m.bac >= m.pocketCenter) {
    const over = clamp01((m.bac - m.pocketCenter) / Math.max(0.1, m.ceiling - m.pocketCenter));
    return 0.15 + over * 0.95;
  }
  return pocketStress(m) * 0.2;
}

export function tremorIntensity(m: MeterState): number {
  if (m.bac >= m.floor) return 0;
  return clamp01((m.floor - m.bac) / Math.max(0.05, m.floor));
}

export interface TickInput {
  dt: number;
  speedMph: number;
  nightFactor: number;
  consuming: boolean;
  /** Difficulty multiplier for BAC drain — rises with each haul. */
  drainScale?: number;
}

export interface TickResult {
  meters: MeterState;
  death: DeathCause | null;
  microSleep: boolean;
}

export function tickMeters(m: MeterState, input: TickInput): TickResult {
  const next: MeterState = { ...m };

  // Slow enough for a 5-minute first leg with the starter cooler
  const scale = input.drainScale ?? 1;
  const drain = (input.consuming ? 0.002 : 0.0042) * scale;
  next.bac = Math.max(0, next.bac - drain * input.dt);
  next.wired = Math.max(0, next.wired - 0.08 * input.dt);

  const mileRate = (input.speedMph / 3600) * input.dt;
  next.miles += mileRate;
  const fatigue =
    0.0035 * input.dt +
    mileRate * 0.01 +
    input.nightFactor * 0.004 * input.dt +
    Math.max(0, next.bac - 0.55) * 0.012 * input.dt -
    next.wired * 0.01 * input.dt;
  next.alertness = clamp01(next.alertness - fatigue);

  let death: DeathCause | null = null;
  let microSleep = false;

  if (next.alertness < 0.16) {
    microSleep = Math.random() < 0.28 * input.dt;
  }
  if (next.alertness <= 0) {
    death = "crash";
    next.alertness = 0;
  }

  if (next.bac <= 0) {
    death = "withdrawal";
  } else if (next.bac < next.floor * 0.18) {
    death = "seizure";
  }

  if (next.bac >= next.ceiling) {
    death = "blackout";
  }

  return { meters: next, death, microSleep };
}

export function needsSip(m: MeterState): boolean {
  return m.bac < m.floor + 0.07;
}

export type Consumable = "beer" | "liquor" | "coffee";

export function applyConsumable(
  m: MeterState,
  inv: Inventory,
  item: Consumable,
): { meters: MeterState; inventory: Inventory; ok: boolean } {
  if (inv[item] <= 0) return { meters: m, inventory: inv, ok: false };

  const inventory = { ...inv, [item]: inv[item] - 1 };
  const meters = { ...m };

  if (item === "beer") {
    meters.bac = clamp01(meters.bac + 0.1);
    meters.drinksTaken += 1;
    meters.floor = Math.min(meters.ceiling - 0.22, meters.floor + 0.006);
    meters.pocketCenter = Math.min(
      meters.ceiling - 0.18,
      meters.pocketCenter + 0.003,
    );
  } else if (item === "liquor") {
    meters.bac = clamp01(meters.bac + 0.2);
    meters.drinksTaken += 1;
    meters.alertness = clamp01(meters.alertness - 0.04);
    meters.floor = Math.min(meters.ceiling - 0.22, meters.floor + 0.014);
    meters.pocketCenter = Math.min(
      meters.ceiling - 0.18,
      meters.pocketCenter + 0.008,
    );
  } else {
    meters.alertness = clamp01(meters.alertness + 0.28);
    meters.bac = Math.max(0, meters.bac - 0.025);
    meters.wired = clamp01(meters.wired + 0.7);
  }

  return { meters, inventory, ok: true };
}

export function applySleep(m: MeterState): MeterState {
  return {
    ...m,
    alertness: clamp01(m.alertness + 0.55),
    bac: Math.max(m.floor * 0.75, m.bac - 0.12),
    wired: 0,
  };
}

export function buyItem(
  m: MeterState,
  inv: Inventory,
  item: Consumable,
  price: number,
): { meters: MeterState; inventory: Inventory; ok: boolean } {
  if (m.cash < price) return { meters: m, inventory: inv, ok: false };
  return {
    meters: { ...m, cash: m.cash - price },
    inventory: { ...inv, [item]: inv[item] + 1 },
    ok: true,
  };
}

export function applyJobProgress(
  m: MeterState,
  opts: { onTime: boolean; crashed: boolean },
): MeterState {
  let job = m.jobStanding;
  let cargo = m.cargoIntegrity;
  if (opts.crashed) {
    cargo = clamp01(cargo - 0.35);
    job = clamp01(job - 0.25);
  }
  if (!opts.onTime) job = clamp01(job - 0.2);
  else job = clamp01(job + 0.05);
  return { ...m, jobStanding: job, cargoIntegrity: cargo };
}

export function checkFired(m: MeterState): boolean {
  return m.jobStanding <= 0.05 || m.cargoIntegrity <= 0;
}

export function quotaProgress(miles: number, quota: number): number {
  return clamp01(miles / quota);
}

export type RoadHitKind = "debris" | "glance" | "deer";

/** Non-fatal road impacts — the road bills you, not bystanders. */
export function applyRoadHit(m: MeterState, kind: RoadHitKind): MeterState {
  const next = { ...m };
  if (kind === "debris") {
    next.cargoIntegrity = clamp01(next.cargoIntegrity - 0.08);
  } else if (kind === "glance") {
    next.cargoIntegrity = clamp01(next.cargoIntegrity - 0.18);
    next.jobStanding = clamp01(next.jobStanding - 0.06);
  } else {
    next.cargoIntegrity = clamp01(next.cargoIntegrity - 0.22);
    next.jobStanding = clamp01(next.jobStanding - 0.04);
  }
  return next;
}

/** Delivery payout: base rate plus a bonus for intact cargo. */
export function haulPayout(m: MeterState, haul: number): number {
  return Math.round(140 + m.cargoIntegrity * 60 + (haul - 1) * 20);
}

/**
 * Roll into the next contract. Cash lands, cargo resets —
 * but the floor ratchets up. The pocket never resets.
 */
export function nextHaul(m: MeterState, haul: number): MeterState {
  return {
    ...m,
    cash: m.cash + haulPayout(m, haul),
    miles: 0,
    cargoIntegrity: 1,
    jobStanding: clamp01(m.jobStanding + 0.08),
    alertness: clamp01(m.alertness + 0.12),
    floor: Math.min(m.ceiling - 0.22, m.floor + 0.025),
    pocketCenter: Math.min(m.ceiling - 0.18, m.pocketCenter + 0.012),
  };
}
