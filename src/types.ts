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

export type AttemptBranch = {
  key: "2a" | "2b" | "2c" | "3a" | "3b" | "3c";
  condition: string;
  load: number;
};

export type Plan = {
  athleteId: string;
  goalSquat: number;
  goalBench: number;
  goalDeadlift: number;
  attempts: {
    lift: Lift;
    opener: number;
    branches: AttemptBranch[];
  }[];
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
