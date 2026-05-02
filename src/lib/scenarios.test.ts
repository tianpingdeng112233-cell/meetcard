/**
 * Golden fixture tests for the bilateral simulator pure function.
 *
 * All 6 scenarios are taken verbatim from xty's 2026-05-02 WeChat Notes
 * screenshot. If any of these fixtures break, the simulator UI is
 * showing wrong numbers and a coach could make a wrong decision in a
 * live meet — these are the no-regression contract.
 */
import { describe, expect, it } from "vitest";
import { simulateScenario, type SimAthlete } from "./scenarios";

const xiaoJie: SimAthlete = {
  bw: 71.9,
  sex: "F",
  equipment: "Raw",
  event: "SBD",
  weightClass: "76",
  squatBest: 190,
  benchBest: 95,
};

const mimi: SimAthlete = {
  bw: 56.5,
  sex: "F",
  equipment: "Raw",
  event: "SBD",
  weightClass: "57",
  squatBest: 165,
  benchBest: 77.5,
};

describe("simulateScenario — xty 2026-05-02 6 scenarios", () => {
  it("Row 1 (开把): mine 195 / rival 170 → 小杰 LOSES by 0.13 GL", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 195,
      rival: mimi,
      rivalDeadliftKg: 170,
    });
    expect(r.myProjectedTotal).toBe(480);
    expect(r.rivalProjectedTotal).toBe(412.5);
    expect(r.myGL).toBeCloseTo(97.27, 1);
    expect(r.rivalGL).toBeCloseTo(97.43, 1);
    expect(r.deltaGL).toBeCloseTo(-0.13, 1);
    expect(r.winner).toBe("rival");
  });

  it("Row 2: mine 205 / rival 177.5 → 小杰 WINS by 0.12 GL", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 205,
      rival: mimi,
      rivalDeadliftKg: 177.5,
    });
    expect(r.myProjectedTotal).toBe(490);
    expect(r.rivalProjectedTotal).toBe(420);
    expect(r.deltaGL).toBeCloseTo(0.12, 1);
    expect(r.winner).toBe("mine");
  });

  it("Row 3: mine 210 / rival 180 → 小杰 WINS by 0.54 GL", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 210,
      rival: mimi,
      rivalDeadliftKg: 180,
    });
    expect(r.myProjectedTotal).toBe(495);
    expect(r.rivalProjectedTotal).toBe(422.5);
    expect(r.deltaGL).toBeCloseTo(0.54, 1);
    expect(r.winner).toBe("mine");
  });

  it("Row 4 (xty's ⭐ '496 能行'): mine 212.5 / rival 182.5 → 小杰 WINS by 0.45", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 212.5,
      rival: mimi,
      rivalDeadliftKg: 182.5,
    });
    expect(r.myProjectedTotal).toBe(497.5);
    expect(r.rivalProjectedTotal).toBe(425);
    expect(r.myGL).toBeCloseTo(100.81, 1);
    expect(r.rivalGL).toBeCloseTo(100.38, 1);
    expect(r.deltaGL).toBeCloseTo(0.43, 1);
    expect(r.winner).toBe("mine");
  });

  it("Row 5 (险胜): mine 213.5 / rival 185 → 小杰 WINS by 0.07", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 213.5,
      rival: mimi,
      rivalDeadliftKg: 185,
    });
    expect(r.myProjectedTotal).toBe(498.5);
    expect(r.rivalProjectedTotal).toBe(427.5);
    expect(r.deltaGL).toBeCloseTo(0.07, 1);
    expect(r.winner).toBe("mine");
  });

  it("Row 6 (险胜): mine 216.5 / rival 187.5 → 小杰 WINS by 0.08", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 216.5,
      rival: mimi,
      rivalDeadliftKg: 187.5,
    });
    expect(r.myProjectedTotal).toBe(501.5);
    expect(r.rivalProjectedTotal).toBe(430);
    expect(r.deltaGL).toBeCloseTo(0.08, 1);
    expect(r.winner).toBe("mine");
  });
});

describe("simulateScenario — '496 能行' safety check", () => {
  // xty's annotation was: even if 小杰 only hits DL=211 (= total 496,
  // conservatively rounded down from 497.5), still beats 米米 at 425.
  it("Conservative: mine 211 (total 496) vs rival 182.5 → still wins", () => {
    const r = simulateScenario({
      mine: xiaoJie,
      myDeadliftKg: 211,
      rival: mimi,
      rivalDeadliftKg: 182.5,
    });
    expect(r.myProjectedTotal).toBe(496);
    expect(r.deltaGL).toBeGreaterThan(0);
    expect(r.deltaGL).toBeCloseTo(0.13, 1);
    expect(r.winner).toBe("mine");
  });
});

describe("simulateScenario — same-class behavior", () => {
  // Both in the same female 57kg class: tiebreak should use total + bw,
  // not GL.
  const a: SimAthlete = { ...mimi, bw: 56.0, squatBest: 160, benchBest: 75 };
  const b: SimAthlete = { ...mimi, bw: 56.5, squatBest: 165, benchBest: 77.5 };

  it("flags sameClass when sex + weightClass match", () => {
    const r = simulateScenario({
      mine: a,
      myDeadliftKg: 165,
      rival: b,
      rivalDeadliftKg: 165,
    });
    expect(r.sameClass).toBe(true);
  });

  it("same total + lighter bw wins (a 56.0 beats b 56.5)", () => {
    const r = simulateScenario({
      mine: a,
      myDeadliftKg: 175, // a: 160+75+175 = 410
      rival: b,
      rivalDeadliftKg: 167.5, // b: 165+77.5+167.5 = 410
    });
    expect(r.myProjectedTotal).toBe(r.rivalProjectedTotal);
    expect(r.winner).toBe("mine"); // 56.0 < 56.5 tiebreak
  });
});
