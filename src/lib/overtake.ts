/**
 * Live-mode overtake math.
 *
 * Best-of-3 logic per lift:
 *   - "best confirmed" = max(weight) where status==="made"
 *   - "best projected" = max(weight) where status==="made" || status==="pending"
 *
 * Same-class compare → projected totals.
 * Cross-class compare → IPF GL points (rival GL → equivalent total in my class).
 */
import type {
  Athlete,
  AttemptNumber,
  Lift,
  LiveAthleteState,
  LiveLiftRow,
  LiveLiftRow_Trio,
} from "../types";
import { ipfGLPoints, solveTotalForGL } from "./ranking";
import { BAR_KG } from "./warmup";

const LIFT_KEY: Record<Lift, "squat" | "bench" | "dead"> = {
  S: "squat",
  B: "bench",
  D: "dead",
};

/** Largest non-missed candidate weight in a single cell, considering alts. */
function maxOfCell(a: LiveLiftRow[number]): number {
  let m = 0;
  if (a.status !== "missed" && a.weight && a.weight > 0) m = a.weight;
  for (const alt of a.alts ?? []) {
    if (alt.status !== "missed" && alt.weight > 0 && alt.weight > m) m = alt.weight;
  }
  return m;
}

export function bestProjectedForLift(row: LiveLiftRow): number {
  let best = 0;
  for (const a of row) {
    const m = maxOfCell(a);
    if (m > best) best = m;
  }
  return best;
}

export function bestConfirmedForLift(row: LiveLiftRow): number {
  let best = 0;
  for (const a of row) {
    if (a.weight && a.weight > 0 && a.status === "made" && a.weight > best) {
      best = a.weight;
    }
    for (const alt of a.alts ?? []) {
      if (alt.status === "made" && alt.weight > 0 && alt.weight > best) {
        best = alt.weight;
      }
    }
  }
  return best;
}

export function projectedTotal(trio: LiveLiftRow_Trio): number {
  return (
    bestProjectedForLift(trio.squat) +
    bestProjectedForLift(trio.bench) +
    bestProjectedForLift(trio.dead)
  );
}

export function confirmedTotal(trio: LiveLiftRow_Trio): number {
  return (
    bestConfirmedForLift(trio.squat) +
    bestConfirmedForLift(trio.bench) +
    bestConfirmedForLift(trio.dead)
  );
}

/**
 * Tier-aware projected best for one lift. Walks each attempt cell, collects
 * non-missed candidate weights (main + alts), sorts ascending, and picks
 * low/mid/hi by position. Then takes the max across attempts (best-of-3).
 *
 * Cells with fewer than 3 weights:
 *   - 1 weight  → all 3 tiers return that weight
 *   - 2 weights → low = lower, hi = higher, mid = lower (conservative)
 *   - 3+ weights → low = min, hi = max, mid = median
 */
export function tierProjectedForLift(
  row: LiveLiftRow,
  tier: "low" | "mid" | "hi",
): number {
  let best = 0;
  for (const cell of row) {
    if (cell.status === "missed") continue;
    const ws: number[] = [];
    if (cell.weight && cell.weight > 0) ws.push(cell.weight);
    for (const alt of cell.alts ?? []) {
      if (alt.status !== "missed" && alt.weight > 0) ws.push(alt.weight);
    }
    if (ws.length === 0) continue;
    ws.sort((a, b) => a - b);
    let pick: number;
    if (tier === "low") pick = ws[0];
    else if (tier === "hi") pick = ws[ws.length - 1];
    else pick = ws.length >= 3 ? ws[1] : ws[0];
    if (pick > best) best = pick;
  }
  return best;
}

export function tierProjectedTotal(
  trio: LiveLiftRow_Trio,
  tier: "low" | "mid" | "hi",
): number {
  return (
    tierProjectedForLift(trio.squat, tier) +
    tierProjectedForLift(trio.bench, tier) +
    tierProjectedForLift(trio.dead, tier)
  );
}

/**
 * Smallest plate-loadable weight that is `≥ kg`. Loadable set:
 * `{20} ∪ {22.5, 25, 27.5, ...}` (assuming 1.25kg pair as smallest).
 */
export function ceilToLoadable(kg: number, step = 2.5): number {
  if (kg <= BAR_KG) return BAR_KG;
  const above = Math.ceil(kg / step) * step;
  return above < BAR_KG ? BAR_KG : above;
}

export type OvertakeResult = {
  /** Min weight on focus attempt to strict-overtake. null = already winning. */
  minRequired: number | null;
  /** True if we're comparing on raw totals (same class). */
  sameClass: boolean;
  /** My projected total as-is. */
  myProjected: number;
  /** Rival projected total. */
  rivalProjected: number;
  /** Rival's GL (only set when crossClass). */
  rivalGL: number;
  /** True if even maxing focus attempt cannot overtake (out of reach). */
  outOfReach: boolean;
};

function sameClassAs(me: Athlete, rival: LiveAthleteState): boolean {
  return (
    me.sex === rival.sex &&
    me.weightClass === rival.weightClass &&
    me.equipment === rival.equipment &&
    me.event === rival.event
  );
}

const FOCUS_PRACTICAL_CEILING = 600; // kg; we wouldn't ask the coach to lift more than this in a live single

export function overtake(
  myAthlete: Athlete,
  myTrio: LiveLiftRow_Trio,
  focus: { lift: Lift; attempt: AttemptNumber },
  rival: LiveAthleteState,
): OvertakeResult {
  const sameClass = sameClassAs(myAthlete, rival);
  const rivalTrio: LiveLiftRow_Trio = {
    squat: rival.squat,
    bench: rival.bench,
    dead: rival.dead,
  };
  const rivalProjected = projectedTotal(rivalTrio);
  const myProjected = projectedTotal(myTrio);
  const rivalGL = ipfGLPoints(
    rivalProjected,
    rival.bodyweight,
    rival.sex,
    rival.equipment,
    rival.event,
  );

  if (rivalProjected <= 0) {
    return {
      minRequired: null,
      sameClass,
      myProjected,
      rivalProjected,
      rivalGL,
      outOfReach: false,
    };
  }

  // Compute target total in MY class.
  let targetTotal: number;
  if (sameClass) {
    targetTotal = rivalProjected + 0.5;
  } else {
    if (rivalGL <= 0) {
      return {
        minRequired: null,
        sameClass,
        myProjected,
        rivalProjected,
        rivalGL,
        outOfReach: false,
      };
    }
    targetTotal =
      solveTotalForGL(
        rivalGL,
        myAthlete.bodyweight,
        myAthlete.sex,
        myAthlete.equipment,
        myAthlete.event,
      ) + 0.5;
  }

  // My fixed contribution = the 2 other lifts' best projected
  // + the best of the OTHER 2 attempts in the focus lift.
  const focusKey = LIFT_KEY[focus.lift];
  const focusRow = myTrio[focusKey];
  let focusBestOther = 0;
  for (let i = 0; i < 3; i++) {
    if (i + 1 === focus.attempt) continue;
    const m = maxOfCell(focusRow[i]);
    if (m > focusBestOther) focusBestOther = m;
  }
  const otherLifts = (["squat", "bench", "dead"] as const).filter(
    (k) => k !== focusKey,
  );
  const otherLiftsTotal = otherLifts.reduce(
    (s, k) => s + bestProjectedForLift(myTrio[k]),
    0,
  );
  const requiredFocusBest = targetTotal - otherLiftsTotal;

  if (requiredFocusBest <= focusBestOther) {
    // My existing best in the focus lift already covers it.
    return {
      minRequired: null,
      sameClass,
      myProjected,
      rivalProjected,
      rivalGL,
      outOfReach: false,
    };
  }
  const required = ceilToLoadable(requiredFocusBest);
  const outOfReach = required > FOCUS_PRACTICAL_CEILING;
  return {
    minRequired: required,
    sameClass,
    myProjected,
    rivalProjected,
    rivalGL,
    outOfReach,
  };
}
