/**
 * Generate two coach-friendly demo rivals from a plan: one same-class
 * (slightly weaker — close gap, easy reversal) and one cross-class
 * (next class up, slightly stronger — needs IPF GL math). Useful so the
 * /live overtake screen has something interesting to show right after a
 * fresh import, without forcing the coach to hand-enter rival data.
 */
import type { Athlete, LiveAthleteState, LiveLiftRow, Plan } from "../types";

const IPF_CLASSES_M = ["53", "59", "66", "74", "83", "93", "105", "120", "120+"];
const IPF_CLASSES_F = ["43", "47", "52", "57", "63", "69", "76", "84", "84+"];

function nextClassUp(weightClass: string, sex: "M" | "F"): string {
  const list = sex === "M" ? IPF_CLASSES_M : IPF_CLASSES_F;
  const i = list.indexOf(weightClass);
  if (i === -1 || i === list.length - 1) return weightClass;
  return list[i + 1];
}

/** Round to nearest 0.5kg (powerlifting plate granularity for benches). */
function roundHalf(v: number): number {
  return Math.round(v * 2) / 2;
}

/** Pick the highest of low/mid/hi (or whichever is filled) per attempt. */
function topLine(plan: Plan): { sq: number; bn: number; dl: number; total: number } {
  const max3 = (cells: { low: { weight: number | null }; mid: { weight: number | null }; hi: { weight: number | null } }) =>
    Math.max(cells.hi.weight ?? 0, cells.mid.weight ?? 0, cells.low.weight ?? 0);
  const sq = max3(plan.squat.a3);
  const bn = max3(plan.bench.a3);
  const dl = max3(plan.dead.a3);
  return { sq, bn, dl, total: sq + bn + dl };
}

/** Build a 3-attempt single-tier row (no alts) — coach can add alts via "+". */
function singleTierRow(opener: number, a2: number, a3: number): LiveLiftRow {
  return [
    { weight: roundHalf(opener), status: "pending" },
    { weight: roundHalf(a2), status: "pending" },
    { weight: roundHalf(a3), status: "pending" },
  ];
}

export function buildDemoRivals(
  athlete: Athlete,
  plan: Plan,
): LiveAthleteState[] {
  const my = topLine(plan);
  if (my.total <= 0) return [];

  const idStem = Date.now().toString(36);

  // Same-class rival: 5kg below across the board, opens a hair lower.
  // Result: total ≈ same as mine, makes for a tight reversal demo.
  const same: LiveAthleteState = {
    id: `r_demo_same_${idStem}`,
    name: "陈昊",
    sex: athlete.sex,
    bodyweight: Math.min(
      athlete.bodyweight + 2.5,
      parseFloat(athlete.weightClass) || athlete.bodyweight,
    ),
    weightClass: athlete.weightClass,
    equipment: athlete.equipment,
    event: athlete.event,
    squat: singleTierRow(my.sq - 12.5, my.sq - 5, my.sq),
    bench: singleTierRow(my.bn - 7.5, my.bn - 2.5, my.bn),
    dead: singleTierRow(my.dl - 12.5, my.dl - 5, my.dl - 2.5),
  };

  // Cross-class rival: next weight class up, total +6% (≈similar IPF GL).
  // For a 83→93 jump on cy's plan that lands ~30kg higher across SBD.
  const upClass = nextClassUp(athlete.weightClass, athlete.sex);
  const upBW = parseFloat(upClass) - 1; // a kilo under the cap is typical
  const scale = 1.06;
  const cross: LiveAthleteState = {
    id: `r_demo_cross_${idStem}`,
    name: "李俊",
    sex: athlete.sex,
    bodyweight: Number.isFinite(upBW) ? upBW : athlete.bodyweight + 10,
    weightClass: upClass,
    equipment: athlete.equipment,
    event: athlete.event,
    squat: singleTierRow(my.sq * scale - 10, my.sq * scale - 2.5, my.sq * scale + 5),
    bench: singleTierRow(my.bn * scale - 7.5, my.bn * scale - 2.5, my.bn * scale + 2.5),
    dead: singleTierRow(my.dl * scale - 10, my.dl * scale - 2.5, my.dl * scale + 5),
  };

  return [same, cross];
}
