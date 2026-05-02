/**
 * Ranking + projection math.
 *
 * V1 demo data uses RankableAthlete (sample-data.ts shape). V1.5 swaps
 * to Dexie-sourced reads; the public API (bestMade, projTotal,
 * currentTotal, rankByProjected, ipfGLPoints) is the stable contract
 * those callers depend on.
 */
import tablesJson from "../../data/tables.json";

export type Sex = "M" | "F";
export type Equipment = "Raw" | "Equipped";
export type Event = "SBD" | "B"; // 三项 / 卧推单项

export type LiftResult = "m" | "x" | "c" | null;

export type RankableAthlete = {
  id: string;
  name: string;
  team: string;
  bw: number;
  sex: Sex;
  equipment: Equipment;
  event: Event;
  /** Weight class as string: "59" / "83" / "120+" / "76" / "57" etc. */
  weightClass: string;
  isOurs?: boolean;
  squat: number[];
  squatRes: LiftResult[];
  bench: number[];
  benchRes: LiftResult[];
  dead: number[];
  deadRes: LiftResult[];
};

export type RankedAthlete = RankableAthlete & {
  proj: number;
  cur: number;
  rank: number;
};

export function bestMade(weights: number[], results: LiftResult[]): number {
  let best = 0;
  for (let i = 0; i < weights.length; i++) {
    if (results[i] === "m" && weights[i] > best) best = weights[i];
  }
  return best;
}

export function lastResult(arr: LiftResult[]): LiftResult {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] && arr[i] !== "c") return arr[i];
  }
  return null;
}

export function projTotal(a: RankableAthlete): number {
  return (
    bestMade(a.squat, a.squatRes) +
    bestMade(a.bench, a.benchRes) +
    (a.dead[2] || 0)
  );
}

export function currentTotal(a: RankableAthlete): number {
  return (
    bestMade(a.squat, a.squatRes) +
    bestMade(a.bench, a.benchRes) +
    bestMade(a.dead, a.deadRes)
  );
}

export function rankByProjected(athletes: RankableAthlete[]): RankedAthlete[] {
  return [...athletes]
    .map((a) => ({ ...a, proj: projTotal(a), cur: currentTotal(a) }))
    .sort((a, b) => b.proj - a.proj)
    .map((a, i) => ({ ...a, rank: i + 1 }));
}

// ──────────────────────────────────────────────────────────────────────
// IPF GL Points — official formula
// points = total * 100 / (C1 - C2 * exp(-C3 * bw))
//
// C1/C2/C3 constants are stratified by (sex × equipment × event).
// Source: xty's coach-supplied Greg Nuckols meetcard template `Back end`
// sheet, exported to data/tables.json (88KB).
// ──────────────────────────────────────────────────────────────────────

type FormulaConstants = { C1: number; C2: number; C3: number; C4: number };

const FORMULA_KEY: Record<Sex, Record<Equipment, Record<Event, string>>> = {
  M: {
    Raw: { SBD: "male/raw/powerlifting", B: "male/raw/bench-only" },
    Equipped: {
      SBD: "male/equipped/powerlifting",
      B: "male/equipped/bench-only",
    },
  },
  F: {
    Raw: { SBD: "female/raw/powerlifting", B: "female/raw/bench-only" },
    Equipped: {
      SBD: "female/equipped/powerlifting",
      B: "female/equipped/bench-only",
    },
  },
};

const CONSTANTS: Record<string, FormulaConstants> =
  tablesJson.formulaConstants as Record<string, FormulaConstants>;

/**
 * Real IPF GL Points (the "Goodlift Points" coefficient adopted by IPF
 * since 2020). Used for cross-class comparison within the same sex.
 *
 * For total=0 returns 0 (e.g., a DQ'd lifter or one with no successful
 * attempts). Out-of-range bodyweights extrapolate via the same formula
 * — the Excel lookup table only covers 40-205kg but the polynomial is
 * smooth so this is fine for reasonable powerlifting bodyweights.
 */
export function ipfGLPoints(
  total: number,
  bw: number,
  sex: Sex,
  equipment: Equipment = "Raw",
  event: Event = "SBD",
): number {
  if (total <= 0 || bw <= 0) return 0;
  const key = FORMULA_KEY[sex][equipment][event];
  const k = CONSTANTS[key];
  if (!k) return 0;
  const denom = k.C1 - k.C2 * Math.exp(-k.C3 * bw);
  if (denom <= 0) return 0;
  return (total * 100) / denom;
}

/**
 * Inverse of ipfGLPoints: given a target GL value, return the raw total
 * required to reach it. Used by /live and /vs hero "反超所需" math
 * for cross-class comparisons (when we need to express "your GL must
 * beat theirs" as "you need to lift X kg").
 *
 * Closed form: total = targetGL * denom / 100.
 */
export function solveTotalForGL(
  targetGL: number,
  bw: number,
  sex: Sex,
  equipment: Equipment = "Raw",
  event: Event = "SBD",
): number {
  if (targetGL <= 0 || bw <= 0) return 0;
  const key = FORMULA_KEY[sex][equipment][event];
  const k = CONSTANTS[key];
  if (!k) return 0;
  const denom = k.C1 - k.C2 * Math.exp(-k.C3 * bw);
  if (denom <= 0) return 0;
  return (targetGL * denom) / 100;
}

/**
 * True when both athletes share sex and weight class. Same-class ranking
 * uses raw total (with bodyweight tiebreak); cross-class uses GL points.
 */
export function isSameClass(a: RankableAthlete, b: RankableAthlete): boolean {
  return a.sex === b.sex && a.weightClass === b.weightClass;
}

/**
 * True when *all* athletes in the list share sex + weight class. Used
 * to decide if the /live ranking list should show GL alongside total.
 */
export function isHomogeneousFlight(athletes: RankableAthlete[]): boolean {
  if (athletes.length < 2) return true;
  const first = athletes[0];
  return athletes.every(
    (a) => a.sex === first.sex && a.weightClass === first.weightClass,
  );
}

/**
 * @deprecated kept for backward compat with the design package's
 * placeholder formula. New callers should use ipfGLPoints.
 */
export function glPoints(total: number, bw: number): number {
  return Math.round((total * (94 - bw * 0.55)) / 50);
}
