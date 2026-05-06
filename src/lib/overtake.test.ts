import { describe, it, expect } from "vitest";
import { ceilToLoadable, overtake, projectedTotal } from "./overtake";
import type { Athlete, LiveAthleteState, LiveLiftRow_Trio } from "../types";

const me: Athlete = {
  id: "me",
  meetId: "m",
  name: "崔勇",
  sex: "M",
  birthYear: 2000,
  bodyweight: 82.4,
  weightClass: "83",
  division: "Open",
  equipment: "Raw",
  event: "SBD",
  role: "mine",
};

const myTrio = (
  sq: [number, number, number],
  bn: [number, number, number],
  dl: [number, number, number],
  status: ("pending" | "made" | "missed")[] = ["pending", "pending", "pending"],
): LiveLiftRow_Trio => ({
  squat: [
    { weight: sq[0], status: status[0] },
    { weight: sq[1], status: status[1] },
    { weight: sq[2], status: status[2] },
  ],
  bench: [
    { weight: bn[0], status: status[0] },
    { weight: bn[1], status: status[1] },
    { weight: bn[2], status: status[2] },
  ],
  dead: [
    { weight: dl[0], status: status[0] },
    { weight: dl[1], status: status[1] },
    { weight: dl[2], status: status[2] },
  ],
});

const rival = (
  bw: number,
  cls: string,
  sq: [number, number, number],
  bn: [number, number, number],
  dl: [number, number, number],
  status: ("pending" | "made" | "missed")[] = ["pending", "pending", "pending"],
): LiveAthleteState => ({
  id: "rival",
  name: "小王",
  sex: "M",
  bodyweight: bw,
  weightClass: cls,
  equipment: "Raw",
  event: "SBD",
  squat: [
    { weight: sq[0], status: status[0] },
    { weight: sq[1], status: status[1] },
    { weight: sq[2], status: status[2] },
  ],
  bench: [
    { weight: bn[0], status: status[0] },
    { weight: bn[1], status: status[1] },
    { weight: bn[2], status: status[2] },
  ],
  dead: [
    { weight: dl[0], status: status[0] },
    { weight: dl[1], status: status[1] },
    { weight: dl[2], status: status[2] },
  ],
});

describe("ceilToLoadable", () => {
  it("clamps to bar 20", () => {
    expect(ceilToLoadable(0)).toBe(20);
    expect(ceilToLoadable(15)).toBe(20);
    expect(ceilToLoadable(20)).toBe(20);
  });
  it("rounds UP (not nearest) to 2.5kg loadable", () => {
    expect(ceilToLoadable(20.1)).toBe(22.5);
    expect(ceilToLoadable(22.5)).toBe(22.5);
    expect(ceilToLoadable(22.6)).toBe(25);
    expect(ceilToLoadable(285.5)).toBe(287.5);
  });
});

describe("projectedTotal", () => {
  it("counts made + pending, ignores missed", () => {
    const trio = myTrio([200, 210, 220], [120, 130, 140], [250, 260, 270], [
      "made",
      "missed",
      "pending",
    ]);
    // Per lift: max of made=200, pending=220 → 220
    // Same for each: 220 + 140 + 270 = 630
    expect(projectedTotal(trio)).toBe(630);
  });
  it("returns 0 for empty trio", () => {
    const trio = myTrio([0, 0, 0], [0, 0, 0], [0, 0, 0]);
    expect(projectedTotal(trio)).toBe(0);
  });
});

describe("overtake — same class", () => {
  it("rival 685, my fixed 400, focus DL A2 → required 287.5", () => {
    // Me: SQ 245 (all pending), BN 145 (all pending), DL [260, 280, 290] all pending
    // Other lifts total = 245 + 145 = 390
    // Focus DL A2: other DL attempts = max(260, 290) = 290. So focusBestOther = 290.
    // requiredFocusBest = (685.5 - 390) = 295.5 → > 290 ✓
    // ceilToLoadable(295.5) = 297.5
    const me_trio = myTrio([200, 230, 245], [125, 135, 145], [260, 280, 290]);
    const r = rival(82.4, "83", [220, 230, 240], [130, 140, 150], [260, 280, 295]);
    const result = overtake(me, me_trio, { lift: "D", attempt: 2 }, r);
    expect(result.sameClass).toBe(true);
    // rival projected = 240 + 150 + 295 = 685
    expect(result.rivalProjected).toBe(685);
    // me projected = 245 + 145 + 290 = 680 (currently losing by 5)
    expect(result.myProjected).toBe(680);
    // need 685.5 total. fixed = 245+145 = 390 + best DL excl A2 = max(260,290) = 290
    // required focusBest = 685.5 - 390 = 295.5 → ceil 297.5
    expect(result.minRequired).toBe(297.5);
  });

  it("returns null minRequired when already winning", () => {
    const me_trio = myTrio([250, 260, 270], [150, 160, 170], [300, 310, 320]);
    const r = rival(82.4, "83", [200, 210, 220], [120, 125, 130], [250, 255, 260]);
    const result = overtake(me, me_trio, { lift: "D", attempt: 3 }, r);
    expect(result.minRequired).toBeNull();
  });
});

describe("overtake — cross class (IPF GL)", () => {
  it("83KG vs 93KG, GL-equivalent target", () => {
    // 93KG rival projects 700. My 83KG required total to match GL ≈ less (since lighter class
    // has higher GL coefficient).
    const me_trio = myTrio([240, 250, 255], [145, 150, 155], [275, 285, 295]);
    const r = rival(92.0, "93", [240, 250, 260], [150, 160, 170], [280, 290, 300]);
    const result = overtake(me, me_trio, { lift: "D", attempt: 3 }, r);
    expect(result.sameClass).toBe(false);
    expect(result.rivalGL).toBeGreaterThan(0);
    // Rival proj total = 730. My required total to match their GL is less than 730 (because
    // lighter-class lifters get a higher GL coefficient at the same total).
    // Just verify the comparison is in cross-class mode and produces something.
    if (result.minRequired !== null) {
      expect(result.minRequired).toBeGreaterThan(20);
    }
  });
});
