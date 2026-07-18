import { describe, expect, it } from "vitest";
import {
  DEFAULT_INVENTORY,
  DEFAULT_METERS,
  applyConsumable,
  applySleep,
  buyItem,
  drunkSwayFromBac,
  drunkVisionIntensity,
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
      { dt: 3, speedMph: 50, nightFactor: 1, consuming: false },
    );
    expect(death).toBe("withdrawal");
  });

  it("blackout when BAC exceeds ceiling", () => {
    const { death } = tickMeters(
      { ...DEFAULT_METERS, bac: 0.83, ceiling: 0.82 },
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

  it("liquor makes vision and sway worse than pocket", () => {
    const pocket = { ...DEFAULT_METERS, bac: 0.34 };
    const { meters } = applyConsumable(pocket, { ...DEFAULT_INVENTORY }, "liquor");
    expect(drunkVisionIntensity(meters)).toBeGreaterThan(drunkVisionIntensity(pocket));
    expect(drunkSwayFromBac(meters)).toBeGreaterThan(drunkSwayFromBac(pocket));
  });

  it("coffee wires you and lifts alertness", () => {
    const before = { ...DEFAULT_METERS, alertness: 0.4, wired: 0 };
    const { meters } = applyConsumable(before, { ...DEFAULT_INVENTORY }, "coffee");
    expect(meters.alertness).toBeGreaterThan(before.alertness);
    expect(meters.wired).toBeGreaterThan(0.5);
  });

  it("steering lag worsens below floor and near ceiling", () => {
    const pocket = steeringLagFromBac(DEFAULT_METERS);
    const shaking = steeringLagFromBac({ ...DEFAULT_METERS, bac: 0.05 });
    const wasted = steeringLagFromBac({ ...DEFAULT_METERS, bac: 0.78 });
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
