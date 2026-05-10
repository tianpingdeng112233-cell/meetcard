/**
 * MeetCard domain types.
 * V1 is single-user (xty). All entities scoped by meetId.
 */

export type Lift = "S" | "B" | "D";
export type Sex = "M" | "F";
export type AttemptNumber = 1 | 2 | 3;

export type Division =
  | "Open"
  | "Junior"
  | "Master1"
  | "Master2"
  | "Master3"
  | "Sub-Junior";

export type Equipment = "Raw" | "Equipped";

export type Event = "SBD" | "B"; // 三项 / 卧推单项

export type AthleteRole = "self" | "mine" | "rival";

export type AttemptResult = "pending" | "good" | "no-lift";

export type Meet = {
  id: string;
  name: string;
  date: string; // ISO yyyy-mm-dd
  level: "S" | "A" | "B" | "C";
};

export type Athlete = {
  id: string;
  meetId: string;
  name: string;
  sex: Sex;
  birthYear: number;
  bodyweight: number;
  weightClass: string; // "59" | "66" | ... | "120+"
  division: Division;
  equipment: Equipment;
  event: Event;
  team?: string;
  role: AthleteRole;
  pb?: {
    squat?: number;
    bench?: number;
    deadlift?: number;
    total?: number;
  };
};

export type Tier = "low" | "mid" | "hi";

export type AttemptCell = {
  weight: number | null;
  note: string;
};

export type TierCells = {
  low: AttemptCell;
  mid: AttemptCell;
  hi: AttemptCell;
};

/** Optional override for one warmup row.
 *  Any field left undefined falls back to the formula-derived value. */
export type WarmupRowOverride = {
  estEffPct?: number;
  reps?: number;
  load?: number;
  rest?: string;
};

export type LiftPlan = {
  a1: TierCells;
  a2: TierCells;
  a3: TierCells;
  /** Which tier of A1 is the actual opener. null = coach hasn't picked. */
  openerTier: Tier | null;
  /** Total warmup rows shown. Defaults to 6 (the formula RAMP length).
   *  Coach can ✕ a row (count--) or + a row (count++); rows beyond the
   *  formula RAMP fall back to the last RAMP step as their default. */
  warmupRowCount?: number;
  /** Per-row warmup overrides, indexed parallel to the visible rows.
   *  null entries use the formula default. */
  warmupOverrides?: (WarmupRowOverride | null)[];
};

export type Plan = {
  athleteId: string;
  meetId: string;
  squat: LiftPlan;
  bench: LiftPlan;
  dead: LiftPlan;
  updatedAt: string;
};

/** Live-mode attempt status, set by the coach during the meet. */
export type LiveStatus = "pending" | "made" | "missed";

/** Single alt prediction with its own status (so coach can mark which of
 *  3 presets actually materialized when the rival lifts). */
export type LiveAltAttempt = {
  weight: number;
  status: LiveStatus;
  /** true if the coach added this preset in /live via the + button.
   *  Only added alts are deletable via × (originals from /plan are
   *  anchored). Undefined = original. */
  added?: boolean;
};

export type LiveAttempt2 = {
  weight: number | null;
  status: LiveStatus;
  /** Parallel predictions for uncertain attempts (e.g., rival DL, or mine DL
   *  with low/mid/hi tiers from /plan). Each alt has its own status. */
  alts?: LiveAltAttempt[];
  /** Pre-commit cell snapshot saved when stack-mode collapses to a single
   *  chosen weight. Surfaces a permanent ↶ restore button so the coach can
   *  recover the three-tier view if they tapped the wrong row in a noisy
   *  meet-day environment. Cleared on explicit restore, manual weight edit,
   *  or + add alt (snapshot would be stale). */
  archived?: {
    weight: number | null;
    status: LiveStatus;
    alts?: LiveAltAttempt[];
  };
};

export type LiveLiftRow = [LiveAttempt2, LiveAttempt2, LiveAttempt2];

export type LiveAthleteState = {
  /** Inline athlete profile snapshot — rivals don't need to be in the
   *  athletes table since they're meet-specific. */
  id: string;
  name: string;
  team?: string;
  sex: Sex;
  bodyweight: number;
  weightClass: string;
  equipment: Equipment;
  event: Event;
  squat: LiveLiftRow;
  bench: LiveLiftRow;
  dead: LiveLiftRow;
};

/** Free-text reminders the coach can stash between lifts (eat carbs, etc.). */
export type LiveReminders = {
  afterSquat?: string;
  afterBench?: string;
};

/** Active rest timer for one warmup row. Key format: "{S|B|D}-{rowIndex}". */
export type WarmupTimer = {
  /** Unix ms when the coach hit ▶. */
  startedAt: number;
  durationSec: number;
};

export type LiveSession = {
  meetId: string;
  /** id of the active "mine" athlete (must exist in athletes table) */
  myAthleteId: string;
  /** my live-mode attempt grid. Bootstrapped from my Plan but mutated freely. */
  mine: LiveLiftRow_Trio;
  /** Rivals, inline. Coach adds via "+ 加对手". */
  rivals: LiveAthleteState[];
  /** Currently-focused next attempt for reverse-calc. */
  focus: { lift: Lift; attempt: AttemptNumber };
  /** Free-text mid-meet reminders, indexed by transition. */
  reminders?: LiveReminders;
  /** Coach's estimated start times per lift (HH:MM, 24-hour). */
  openerEstTimes?: Partial<Record<Lift, string>>;
  /** Active rest countdowns, keyed by "{S|B|D}-{rowIdx}". */
  warmupTimers?: Record<string, WarmupTimer>;
  /** Per-lift completion flags, set when coach taps "热身完成 ✓". */
  warmupDone?: Partial<Record<Lift, boolean>>;
  updatedAt: string;
};

export type LiveLiftRow_Trio = {
  squat: LiveLiftRow;
  bench: LiveLiftRow;
  dead: LiveLiftRow;
};

export type LiveAttempt = {
  id?: number; // Dexie auto-increment
  athleteId: string;
  lift: Lift;
  attempt: AttemptNumber;
  declaredKg: number | null;
  liftedKg: number | null;
  result: AttemptResult;
  rpe?: number;
  timestamp: string; // ISO
};

/**
 * Bilateral scenario simulator — the V1 killer wedge.
 *
 * Captures xty's manual "如果小杰 DL=210 + 米米 DL=180" workflow:
 * a row of paired hypothetical next attempts for one of my athletes
 * vs one tracked rival. Renders auto-computed Δ IPF GL.
 *
 * V1: deadlift-only what-if. Squat/bench overrides come in V1.5.
 */
export type Scenario = {
  id: string;
  meetId: string;
  rowIndex: number;
  myAthleteId: string;
  rivalAthleteId: string;
  myDeadliftKg: number;
  rivalDeadliftKg: number;
  note?: string;       // "496 能行" / "险胜" / coach annotations
  starred?: boolean;   // current leaning plan
  createdAt: string;
};
