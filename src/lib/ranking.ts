/**
 * Ranking + projection math used by /live and /setup screens.
 *
 * V1 demo data uses a simplified shape (DemoAthlete in sample-data.ts).
 * V1.5 will swap to real Dexie-sourced Athlete + LiveAttempt records;
 * the public API of this file (bestMade, projTotal, currentTotal,
 * rankByProjected, glPoints) is the contract those callers depend on.
 */

export type LiftResult = "m" | "x" | "c" | null;

export type RankableAthlete = {
  id: string;
  name: string;
  team: string;
  bw: number;
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

/**
 * Simplified GL-style points used in /live demo. NOT the IPF GL formula.
 * Real IPF GL uses the C1/C2/C3 constants from data/tables.json — we'll
 * swap to that once real Athlete records replace DemoAthlete.
 */
export function glPoints(total: number, bw: number): number {
  return Math.round((total * (94 - bw * 0.55)) / 50);
}
