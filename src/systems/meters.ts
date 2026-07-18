/** Pure meter math — no Three.js. The pocket lives here. */

export type DeathCause =
  | "withdrawal"
  | "blackout"
  | "crash"
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
}

export interface Inventory {
  beer: number;
  liquor: number;
  coffee: number;
}

export const DEFAULT_METERS: MeterState = {
  bac: 0.36,
  alertness: 0.9,
  jobStanding: 1,
  floor: 0.12,
  ceiling: 0.78,
  pocketCenter: 0.36,
  drinksTaken: 0,
  miles: 0,
  cash: 86,
  cargoIntegrity: 1,
};

export const DEFAULT_INVENTORY: Inventory = {
  beer: 4,
  liquor: 1,
  coffee: 2,
};

export function clamp01(n: number): number {
  return Math.max(0, Math.min(1, n));
}

/** How far BAC is from the pocket center, 0 = perfect, 1 = at edge. */
export function pocketStress(m: MeterState): number {
  const half = Math.max(0.05, (m.ceiling - m.floor) / 2);
  return clamp01(Math.abs(m.bac - m.pocketCenter) / half);
}

/**
 * Steering lag dial. Low BAC (withdrawal) = tremor/oversteer lag.
 * High BAC = heavy delayed steering. Pocket = tightest control.
 */
export function steeringLagFromBac(m: MeterState): number {
  const below = m.bac < m.floor;
  const above = m.bac > m.ceiling * 0.9;
  if (below) return 0.35 + (m.floor - m.bac) * 2.5;
  if (above) return 0.25 + (m.bac - m.ceiling * 0.9) * 3;
  const stress = pocketStress(m);
  return 0.04 + stress * 0.18;
}

export function drunkVisionIntensity(m: MeterState): number {
  // Distortion rises at extremes, but stays readable on the road
  if (m.bac <= m.floor) return 0.35 + (m.floor - m.bac) * 1.2;
  if (m.bac >= m.ceiling * 0.85) {
    return 0.35 + ((m.bac - m.ceiling * 0.85) / 0.15) * 0.55;
  }
  return pocketStress(m) * 0.28 + Math.max(0, m.bac - 0.4) * 0.4;
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
}

export interface TickResult {
  meters: MeterState;
  death: DeathCause | null;
  microSleep: boolean;
}

/** Real-time drain + mile accrual. */
export function tickMeters(m: MeterState, input: TickInput): TickResult {
  const next: MeterState = { ...m };

  // Metabolic drain — slow enough to learn the pocket before a death spiral.
  const drain = input.consuming ? 0.003 : 0.0075;
  next.bac = Math.max(0, next.bac - drain * input.dt);

  // Alertness: miles + night + high BAC hangover fog.
  const mileRate = (input.speedMph / 3600) * input.dt; // miles this frame
  next.miles += mileRate;
  const fatigue =
    0.005 * input.dt +
    mileRate * 0.012 +
    input.nightFactor * 0.006 * input.dt +
    Math.max(0, next.bac - 0.55) * 0.015 * input.dt;
  next.alertness = clamp01(next.alertness - fatigue);

  let death: DeathCause | null = null;
  let microSleep = false;

  if (next.alertness < 0.18) {
    microSleep = Math.random() < 0.35 * input.dt;
  }
  if (next.alertness <= 0) {
    death = "crash";
    next.alertness = 0;
  }

  // Withdrawal spiral → seizure (deep below floor, not a hair-trigger)
  if (next.bac <= 0) {
    death = "withdrawal";
  } else if (next.bac < next.floor * 0.2) {
    death = "seizure";
  }

  if (next.bac >= next.ceiling) {
    death = "blackout";
  }

  return { meters: next, death, microSleep };
}

/** True when BAC is sliding toward the floor — time to sip. */
export function needsSip(m: MeterState): boolean {
  return m.bac < m.floor + 0.06;
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
    meters.bac = clamp01(meters.bac + 0.08);
    meters.drinksTaken += 1;
    // In-run tolerance: floor creeps up
    meters.floor = Math.min(meters.ceiling - 0.2, meters.floor + 0.008);
    meters.pocketCenter = Math.min(
      meters.ceiling - 0.15,
      meters.pocketCenter + 0.004,
    );
  } else if (item === "liquor") {
    meters.bac = clamp01(meters.bac + 0.18);
    meters.drinksTaken += 1;
    meters.floor = Math.min(meters.ceiling - 0.2, meters.floor + 0.018);
    meters.pocketCenter = Math.min(
      meters.ceiling - 0.15,
      meters.pocketCenter + 0.01,
    );
  } else {
    meters.alertness = clamp01(meters.alertness + 0.22);
    meters.bac = Math.max(0, meters.bac - 0.03);
  }

  return { meters, inventory, ok: true };
}

/** Sleep at a pull-off: alertness up, BAC drains toward the floor (dread). */
export function applySleep(m: MeterState): MeterState {
  return {
    ...m,
    alertness: clamp01(m.alertness + 0.55),
    bac: Math.max(m.floor * 0.7, m.bac - 0.14),
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

/** Miles quota remaining for the haul. */
export function quotaProgress(miles: number, quota: number): number {
  return clamp01(miles / quota);
}
