/**
 * Warmup ramp + E1RM helpers.
 *
 * Formula source: Coach-supplied "Gameday Sheet" Excel (Jason variant).
 * The 6-step ramp is fixed; loads are derived as `estEffPct × targetLoad`,
 * snapped to a plate-loadable weight.
 *
 * Plate-loadability:
 *   - Bar = 20kg
 *   - Available plates (per pair): 25, 20, 15, 10, 5, 2.5, 1.25 kg
 *   - Smallest pair = 1.25kg → smallest increment above bar = 2.5kg
 *   - Loadable set: {20} ∪ {20 + 2.5k for k = 1, 2, 3, ...}
 *
 * Verified against the screenshot: BP target 207.5kg → loads
 * [20, 80, 120, 150, 165, 180] match exactly.
 */
import tablesJson from "../../data/tables.json";

export const BAR_KG = 20;
/** Per-side plate sizes available in the gym, descending. */
export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25] as const;

export type WarmupRampStep = {
  estEffPct: number;
  reps: number;
  rest: string;
};

export type WarmupRow = WarmupRampStep & {
  load: number;
  jump: number | null;
};

const RPE_ONE_REP_CHART = tablesJson.rpeOneRepChart as Record<string, number>;
const WARMUP_RAMP = tablesJson.warmupRamp as WarmupRampStep[];

/**
 * Standard RTS-style RPE → 1-rep-of-1RM coefficient. Accepts 6 to 10 in
 * half-step increments. Out-of-range RPE clamps to the nearest valid value.
 */
export function rpeOneRepPct(rpe: number): number {
  const key = String(rpe);
  if (RPE_ONE_REP_CHART[key] !== undefined) return RPE_ONE_REP_CHART[key];
  if (rpe >= 10) return RPE_ONE_REP_CHART["10"];
  if (rpe <= 6) return RPE_ONE_REP_CHART["6"];
  // round to nearest 0.5
  const snapped = Math.round(rpe * 2) / 2;
  return RPE_ONE_REP_CHART[String(snapped)] ?? RPE_ONE_REP_CHART["9"];
}

/**
 * Estimated 1RM. `load` is the weight successfully lifted at the given RPE
 * for 1 rep. For multi-rep extrapolation, multiply by additional reps-based
 * coefficients (not implemented here — V1 uses single-rep meet attempts).
 */
export function e1rm(load: number, rpe: number): number {
  return load / rpeOneRepPct(rpe);
}

/**
 * Snap a target weight to the nearest plate-loadable weight.
 * Result is either the bare bar (BAR_KG) or `BAR_KG + 2.5k` for some
 * non-negative integer k. Below-bar targets clamp to the bar.
 */
export function snapToLoadable(targetKg: number, step = 2.5): number {
  if (targetKg <= BAR_KG) return BAR_KG;
  const snapped = Math.round(targetKg / step) * step;
  return snapped < BAR_KG ? BAR_KG : snapped;
}

export type WarmupOverride = {
  estEffPct?: number;
  reps?: number;
  load?: number;
  rest?: string;
};

export type WarmupOptions = {
  /** Smallest plate-feasible step. Default 2.5kg (1.25kg pair). */
  step?: number;
  /** Per-row overrides, indexed parallel to visible rows.
   *  null/undefined entries use defaults. */
  overrides?: (WarmupOverride | null | undefined)[];
  /** Total visible rows. Defaults to RAMP length (6). Coach can adjust
   *  via ✕/+ buttons; rows beyond RAMP use the last RAMP step as default. */
  rowCount?: number;
};

/** Default ramp step for rows beyond the formula RAMP — a top-near-PR
 *  single, ready for the coach to override estEffPct/load if they're
 *  building a custom ramp. */
const EXTRA_RAMP_STEP: WarmupRampStep =
  WARMUP_RAMP[WARMUP_RAMP.length - 1] ?? { estEffPct: 0.9, reps: 1, rest: "3min" };

function rampStepAt(i: number): WarmupRampStep {
  return WARMUP_RAMP[i] ?? EXTRA_RAMP_STEP;
}

/**
 * Compute the warmup ramp for a single lift.
 * `targetLoad` is the planned heaviest competition attempt for that lift.
 * Per-row overrides win over the formula; jumps are always recomputed from
 * final loads so the column stays consistent. `rowCount` defaults to 6
 * but the coach can shrink/grow it.
 */
export function warmupForLift(
  targetLoad: number,
  opts: WarmupOptions = {},
): WarmupRow[] {
  const step = opts.step ?? 2.5;
  const overrides = opts.overrides ?? [];
  const rowCount = Math.max(0, opts.rowCount ?? WARMUP_RAMP.length);
  if (!targetLoad || targetLoad <= 0) return [];
  const merged = Array.from({ length: rowCount }, (_, i) => {
    const r = rampStepAt(i);
    const ovr = overrides[i] ?? null;
    const estEffPct = ovr?.estEffPct ?? r.estEffPct;
    const reps = ovr?.reps ?? r.reps;
    const rest = ovr?.rest ?? r.rest;
    const computedLoad = snapToLoadable(estEffPct * targetLoad, step);
    const load = ovr?.load ?? computedLoad;
    return { estEffPct, reps, rest, load };
  });
  return merged.map((r, i) => ({
    ...r,
    jump: i === 0 ? null : r.load - merged[i - 1].load,
  }));
}
