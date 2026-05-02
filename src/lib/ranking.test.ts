/**
 * Golden fixture tests for IPF GL Points + ranking math.
 *
 * The IPF GL fixtures come directly from xty's 2026-05-02 WeChat Notes
 * screenshot (filed at ~/Brain/wiki/projects/MeetPR/meetings/
 * 2026-05-02-xty-bilateral-simulator-evidence.md). Every Δ value
 * displayed in the UI must match xty's hand-computed values to ±0.05
 * — that's our headroom from interpolation in the formula constants
 * and screenshot rounding.
 */
import { describe, expect, it } from "vitest";
import {
  bestMade,
  ipfGLPoints,
  lastResult,
  projTotal,
  rankByProjected,
  type RankableAthlete,
} from "./ranking";

describe("ipfGLPoints — xty 2026-05-02 screenshot", () => {
  // 米米: female, 56.5kg, Raw, 三项
  it("米米 56.5F · 165 squat → 38.96 (squat-only contribution)", () => {
    expect(ipfGLPoints(165, 56.5, "F", "Raw", "SBD")).toBeCloseTo(38.97, 1);
  });

  it("米米 56.5F · 242.5 (SQ+BN) → 57.26", () => {
    expect(ipfGLPoints(242.5, 56.5, "F", "Raw", "SBD")).toBeCloseTo(57.27, 1);
  });

  it("米米 56.5F · 412.5 total → 97.40 (opener scenario)", () => {
    expect(ipfGLPoints(412.5, 56.5, "F", "Raw", "SBD")).toBeCloseTo(97.43, 1);
  });

  it("米米 56.5F · 425 total → 100.36 (xty's row 4)", () => {
    expect(ipfGLPoints(425, 56.5, "F", "Raw", "SBD")).toBeCloseTo(100.38, 1);
  });

  // 小杰: female, 71.9kg, Raw, 三项
  it("小杰 71.9F · 190 squat → 38.50", () => {
    expect(ipfGLPoints(190, 71.9, "F", "Raw", "SBD")).toBeCloseTo(38.5, 1);
  });

  it("小杰 71.9F · 285 (SQ+BN) → 57.75", () => {
    expect(ipfGLPoints(285, 71.9, "F", "Raw", "SBD")).toBeCloseTo(57.75, 1);
  });

  it("小杰 71.9F · 480 total → 97.27 (opener scenario)", () => {
    expect(ipfGLPoints(480, 71.9, "F", "Raw", "SBD")).toBeCloseTo(97.27, 1);
  });

  it("小杰 71.9F · 497.5 total → 100.81 (xty's row 4 starred)", () => {
    expect(ipfGLPoints(497.5, 71.9, "F", "Raw", "SBD")).toBeCloseTo(100.81, 1);
  });

  // "496 能行" check — coach noted that even if 小杰 only hits 496 total
  // (DL=211 instead of 212.5), Δ GL is still positive vs 米米 425.
  it("xty's '496 能行' guard: 小杰 496 vs 米米 425 → my GL > rival GL", () => {
    const myGL = ipfGLPoints(496, 71.9, "F", "Raw", "SBD");
    const rivalGL = ipfGLPoints(425, 56.5, "F", "Raw", "SBD");
    expect(myGL).toBeGreaterThan(rivalGL);
    // Specifically Δ ≈ +0.13
    expect(myGL - rivalGL).toBeCloseTo(0.13, 1);
  });
});

describe("ipfGLPoints — IPF male reference", () => {
  // xty's own male/raw/SBD records: 81.9kg bw, 763 total → ~106 GL
  it("xty 81.9M · 763 total → ~106 GL (national record level)", () => {
    const points = ipfGLPoints(763, 81.9, "M", "Raw", "SBD");
    expect(points).toBeGreaterThan(105);
    expect(points).toBeLessThan(108);
  });

  it("returns 0 for total=0", () => {
    expect(ipfGLPoints(0, 80, "M")).toBe(0);
  });

  it("returns 0 for bw=0", () => {
    expect(ipfGLPoints(500, 0, "M")).toBe(0);
  });
});

describe("bestMade", () => {
  it("returns highest successful weight, ignores misses", () => {
    expect(bestMade([200, 215, 230], ["m", "m", "x"])).toBe(215);
  });

  it("returns 0 if all missed", () => {
    expect(bestMade([200, 215, 230], ["x", "x", "x"])).toBe(0);
  });

  it("ignores 'current' (in-progress) attempts", () => {
    expect(bestMade([200, 215, 230], ["m", "c", null])).toBe(200);
  });

  it("returns 0 when nothing attempted", () => {
    expect(bestMade([0, 0, 0], [null, null, null])).toBe(0);
  });
});

describe("lastResult", () => {
  it("returns the last terminal (m/x) result", () => {
    expect(lastResult(["m", "m", "x"])).toBe("x");
  });

  it("ignores 'current' state", () => {
    expect(lastResult(["m", "c", null])).toBe("m");
  });

  it("returns null if nothing terminal", () => {
    expect(lastResult([null, null, null])).toBe(null);
  });
});

describe("projTotal + rankByProjected", () => {
  const mk = (
    id: string,
    bw: number,
    sq: [number, number, number],
    sqRes: ["m" | "x", "m" | "x", "m" | "x"],
    bn: [number, number, number],
    bnRes: ["m" | "x" | "c" | null, "m" | "x" | "c" | null, "m" | "x" | "c" | null],
    dl3: number,
  ): RankableAthlete => ({
    id,
    name: id,
    team: "X",
    bw,
    squat: sq,
    squatRes: sqRes,
    bench: bn,
    benchRes: bnRes,
    dead: [0, 0, dl3],
    deadRes: [null, null, null],
  });

  it("projTotal = best squat + best bench + planned 3rd dead", () => {
    const a = mk("a", 80, [200, 215, 230], ["m", "m", "x"], [120, 130, 0], ["m", "m", null], 250);
    expect(projTotal(a)).toBe(215 + 130 + 250);
  });

  it("rankByProjected sorts descending and assigns 1-based ranks", () => {
    const ranked = rankByProjected([
      mk("a", 80, [200, 220, 230], ["m", "m", "m"], [130, 140, 0], ["m", "m", null], 250),
      mk("b", 80, [180, 200, 210], ["m", "m", "m"], [110, 120, 0], ["m", "m", null], 220),
      mk("c", 80, [220, 240, 250], ["m", "m", "m"], [140, 150, 0], ["m", "m", null], 270),
    ]);
    expect(ranked.map((r) => r.id)).toEqual(["c", "a", "b"]);
    expect(ranked.map((r) => r.rank)).toEqual([1, 2, 3]);
  });
});
