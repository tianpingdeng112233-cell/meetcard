import { describe, it, expect } from "vitest";
import {
  BAR_KG,
  e1rm,
  rpeOneRepPct,
  snapToLoadable,
  warmupForLift,
} from "./warmup";

describe("rpeOneRepPct", () => {
  it("RPE 9 single = 95.5%", () => {
    expect(rpeOneRepPct(9)).toBeCloseTo(0.955, 4);
  });
  it("RPE 10 = 100%", () => {
    expect(rpeOneRepPct(10)).toBe(1.0);
  });
  it("RPE 7 = 86.3%", () => {
    expect(rpeOneRepPct(7)).toBeCloseTo(0.863, 4);
  });
  it("clamps to 6 below range", () => {
    expect(rpeOneRepPct(5)).toBe(rpeOneRepPct(6));
  });
  it("clamps to 10 above range", () => {
    expect(rpeOneRepPct(11)).toBe(1.0);
  });
  it("snaps to nearest half step", () => {
    expect(rpeOneRepPct(8.7)).toBe(rpeOneRepPct(8.5));
    expect(rpeOneRepPct(8.8)).toBe(rpeOneRepPct(9));
  });
});

describe("e1rm", () => {
  it("matches screenshot: 207.5kg @ RPE 9 → 217.28", () => {
    expect(e1rm(207.5, 9)).toBeCloseTo(217.28, 1);
  });
  it("RPE 10 single = load itself", () => {
    expect(e1rm(200, 10)).toBe(200);
  });
});

describe("warmupForLift", () => {
  it("matches Excel screenshot: BP target 207.5kg", () => {
    const rows = warmupForLift(207.5);
    expect(rows.map((r) => r.load)).toEqual([20, 80, 120, 150, 165, 180]);
    expect(rows.map((r) => r.reps)).toEqual([3, 3, 3, 2, 1, 1]);
    expect(rows[0].jump).toBeNull();
    expect(rows[1].jump).toBe(60);
    expect(rows[2].jump).toBe(40);
    expect(rows[3].jump).toBe(30);
    expect(rows[4].jump).toBe(15);
    expect(rows[5].jump).toBe(15);
  });

  it("returns 6 rows always (when target valid)", () => {
    expect(warmupForLift(245)).toHaveLength(6);
    expect(warmupForLift(80)).toHaveLength(6);
    expect(warmupForLift(500)).toHaveLength(6);
  });

  it("returns empty array when target is 0 or invalid", () => {
    expect(warmupForLift(0)).toEqual([]);
    expect(warmupForLift(-100)).toEqual([]);
    expect(warmupForLift(NaN)).toEqual([]);
  });

  it("loads scale linearly with target", () => {
    const a = warmupForLift(200);
    const b = warmupForLift(400);
    // top warmup at 86.7% should roughly double
    expect(b[5].load).toBeGreaterThan(a[5].load * 1.9);
    expect(b[5].load).toBeLessThan(a[5].load * 2.1);
  });

  it("respects custom step (5kg rounding)", () => {
    const rows = warmupForLift(232.5, { step: 5 });
    // 0.0960 × 232.5 = 22.32 → round-5 = 20 (not 22.5)
    expect(rows[0].load).toBe(20);
    // 0.7230 × 232.5 = 168.0975 → round-5 = 170 (not 167.5)
    expect(rows[3].load).toBe(170);
  });

  it("xty squat-ish target 245 produces sane ramp", () => {
    const rows = warmupForLift(245);
    expect(rows.map((r) => r.load)).toEqual([22.5, 95, 142.5, 177.5, 195, 212.5]);
  });

  it("clamps below-bar warmup loads to BAR_KG (20)", () => {
    // BN target 142.5: 9.6% × 142.5 = 13.68, would round to 12.5 → snap up to 20 (bar).
    // Without the clamp the bar is 20kg and 12.5kg cannot physically be loaded.
    const rows = warmupForLift(142.5);
    expect(rows[0].load).toBe(20);
    expect(rows.map((r) => r.load)).toEqual([20, 55, 82.5, 102.5, 112.5, 122.5]);
  });

  it("very light targets produce all-bar warmup (graceful)", () => {
    const rows = warmupForLift(40);
    expect(rows[0].load).toBe(BAR_KG);
    rows.forEach((r) => expect(r.load).toBeGreaterThanOrEqual(BAR_KG));
  });
});

describe("snapToLoadable", () => {
  it("rounds to 2.5kg increment", () => {
    expect(snapToLoadable(73.6)).toBe(72.5);
    expect(snapToLoadable(74)).toBe(75);
  });
  it("clamps below-bar weights to BAR_KG", () => {
    expect(snapToLoadable(15)).toBe(BAR_KG);
    expect(snapToLoadable(0)).toBe(BAR_KG);
    expect(snapToLoadable(19.9)).toBe(BAR_KG);
  });
  it("BAR_KG itself stays at BAR_KG", () => {
    expect(snapToLoadable(20)).toBe(BAR_KG);
  });
  it("just above BAR snaps to 22.5 (smallest pair = 1.25)", () => {
    expect(snapToLoadable(21.5)).toBe(22.5);
  });
});

describe("warmupForLift rowCount", () => {
  it("defaults to 6 rows when rowCount omitted", () => {
    expect(warmupForLift(200).length).toBe(6);
  });
  it("rowCount=4 yields 4 rows (truncated from RAMP)", () => {
    expect(warmupForLift(200, { rowCount: 4 }).length).toBe(4);
  });
  it("rowCount=8 yields 8 rows; rows beyond RAMP[5] reuse the last RAMP step", () => {
    const rows = warmupForLift(200, { rowCount: 8 });
    expect(rows.length).toBe(8);
    // The 7th and 8th rows should default to the last formula step (≈86.7%)
    expect(rows[6].estEffPct).toBeCloseTo(rows[5].estEffPct, 4);
    expect(rows[7].estEffPct).toBeCloseTo(rows[5].estEffPct, 4);
  });
  it("rowCount=0 yields empty array", () => {
    expect(warmupForLift(200, { rowCount: 0 })).toEqual([]);
  });
  it("overrides on extended rows win over the formula default", () => {
    const rows = warmupForLift(200, {
      rowCount: 7,
      overrides: [
        null,
        null,
        null,
        null,
        null,
        null,
        { estEffPct: 0.95, reps: 1, rest: "5min" },
      ],
    });
    expect(rows.length).toBe(7);
    expect(rows[6].estEffPct).toBe(0.95);
    expect(rows[6].reps).toBe(1);
    expect(rows[6].rest).toBe("5min");
  });
});
