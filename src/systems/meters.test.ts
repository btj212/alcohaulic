import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVENTORY,
  DEFAULT_METERS,
  applyConsumable,
  applySleep,
  buyItem,
  steeringLagFromBac,
  tickMeters,
  tremorIntensity,
} from "./meters";

describe("meters — pocket inversion", () => {
  it("drains BAC over time so sobriety is the threat", () => {
    const start = { ...DEFAULT_METERS, bac: 0.4 };
    const { meters } = tickMeters(start, {
      dt: 10,
      speedMph: 60,
      nightFactor: 1,
      consuming: false,
    });
    expect(meters.bac).toBeLessThan(start.bac);
  });

  it("withdrawal death when BAC hits zero", () => {
    const { death } = tickMeters(
      { ...DEFAULT_METERS, bac: 0.01 },
      { dt: 2, speedMph: 50, nightFactor: 1, consuming: false },
    );
    expect(death).toBe("withdrawal");
  });

  it("blackout when BAC exceeds ceiling", () => {
    const { death } = tickMeters(
      { ...DEFAULT_METERS, bac: 0.79, ceiling: 0.78 },
      { dt: 0.016, speedMph: 50, nightFactor: 1, consuming: false },
    );
    expect(death).toBe("blackout");
  });

  it("beer raises BAC and nudges tolerance floor up", () => {
    const before = { ...DEFAULT_METERS, floor: 0.12 };
    const { meters, ok } = applyConsumable(before, { ...DEFAULT_INVENTORY }, "beer");
    expect(ok).toBe(true);
    expect(meters.bac).toBeGreaterThan(before.bac);
    expect(meters.floor).toBeGreaterThan(before.floor);
  });

  it("steering lag worsens below floor and near ceiling", () => {
    const pocket = steeringLagFromBac(DEFAULT_METERS);
    const shaking = steeringLagFromBac({ ...DEFAULT_METERS, bac: 0.05 });
    const wasted = steeringLagFromBac({ ...DEFAULT_METERS, bac: 0.75 });
    expect(shaking).toBeGreaterThan(pocket);
    expect(wasted).toBeGreaterThan(pocket);
  });

  it("tremor only below the floor", () => {
    expect(tremorIntensity(DEFAULT_METERS)).toBe(0);
    expect(tremorIntensity({ ...DEFAULT_METERS, bac: 0.05 })).toBeGreaterThan(0);
  });

  it("sleep restores alertness but drains BAC toward the floor", () => {
    const before = { ...DEFAULT_METERS, bac: 0.45, alertness: 0.2 };
    const after = applySleep(before);
    expect(after.alertness).toBeGreaterThan(before.alertness);
    expect(after.bac).toBeLessThan(before.bac);
  });

  it("buy fails without cash", () => {
    const { ok } = buyItem(
      { ...DEFAULT_METERS, cash: 1 },
      DEFAULT_INVENTORY,
      "liquor",
      12,
    );
    expect(ok).toBe(false);
  });
});
