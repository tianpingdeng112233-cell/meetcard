/**
 * Bilateral scenario simulator — V1 killer wedge.
 *
 * Provenance: xty's manual workflow filed at
 * ~/Brain/wiki/projects/MeetPR/meetings/2026-05-02-xty-bilateral-simulator-evidence.md
 *
 * Two layers:
 *   1. simulateScenario() — pure function, no I/O, fully unit-testable.
 *      Takes (mine, my DL, rival, rival DL) → projected totals + GL +
 *      delta + winner.
 *   2. Dexie CRUD — addScenario / updateScenario / starScenario /
 *      deleteScenario / listScenarios. Persists across sessions.
 *
 * The UI layer (designed separately, see design-prompt-simulator.md)
 * consumes both. simulateScenario for derived display values; CRUD for
 * persistence.
 */
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../db";
import type { Scenario } from "../types";
import {
  ipfGLPoints,
  type Equipment,
  type Event,
  type Sex,
} from "./ranking";

// ── Pure simulation ───────────────────────────────────────────────────

export type SimAthlete = {
  bw: number;
  sex: Sex;
  equipment: Equipment;
  event: Event;
  weightClass: string; // e.g. "76", "57", "120+"
  // Pre-resolved squat + bench bests (callers compute from LiveAttempts
  // or DemoAthlete; the simulation doesn't care about source).
  squatBest: number;
  benchBest: number;
};

export type SimulateInput = {
  mine: SimAthlete;
  myDeadliftKg: number;
  rival: SimAthlete;
  rivalDeadliftKg: number;
};

export type SimulateResult = {
  myProjectedTotal: number;
  myGL: number;
  rivalProjectedTotal: number;
  rivalGL: number;
  /** myGL − rivalGL. Positive = mine winning. */
  deltaGL: number;
  /** Only meaningful when sameClass is true. */
  deltaTotal: number;
  /** Same sex × class boundary; raw total + bw tiebreak applies. */
  sameClass: boolean;
  winner: "mine" | "rival" | "tie";
};

export function simulateScenario(input: SimulateInput): SimulateResult {
  const { mine, myDeadliftKg, rival, rivalDeadliftKg } = input;

  const myProjectedTotal = mine.squatBest + mine.benchBest + myDeadliftKg;
  const rivalProjectedTotal =
    rival.squatBest + rival.benchBest + rivalDeadliftKg;

  const myGL = ipfGLPoints(myProjectedTotal, mine.bw, mine.sex, mine.equipment, mine.event);
  const rivalGL = ipfGLPoints(
    rivalProjectedTotal,
    rival.bw,
    rival.sex,
    rival.equipment,
    rival.event,
  );

  const deltaGL = myGL - rivalGL;
  const deltaTotal = myProjectedTotal - rivalProjectedTotal;

  const sameClass =
    mine.sex === rival.sex && mine.weightClass === rival.weightClass;

  // Winner tiebreak rules:
  // - same class: total > total. If equal, lighter bw wins.
  // - cross class: GL > GL.
  let winner: "mine" | "rival" | "tie";
  if (sameClass) {
    if (myProjectedTotal > rivalProjectedTotal) winner = "mine";
    else if (myProjectedTotal < rivalProjectedTotal) winner = "rival";
    else if (mine.bw < rival.bw) winner = "mine";
    else if (mine.bw > rival.bw) winner = "rival";
    else winner = "tie";
  } else {
    if (deltaGL > 0) winner = "mine";
    else if (deltaGL < 0) winner = "rival";
    else winner = "tie";
  }

  return {
    myProjectedTotal,
    rivalProjectedTotal,
    myGL,
    rivalGL,
    deltaGL,
    deltaTotal,
    sameClass,
    winner,
  };
}

// ── Dexie CRUD ────────────────────────────────────────────────────────

function uid(): string {
  return `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export type AddScenarioInput = Omit<Scenario, "id" | "rowIndex" | "createdAt"> & {
  rowIndex?: number;
};

export async function addScenario(input: AddScenarioInput): Promise<string> {
  const id = uid();
  const existing = await db.scenarios.where({ meetId: input.meetId }).count();
  const rowIndex = input.rowIndex ?? existing;
  await db.scenarios.put({
    ...input,
    id,
    rowIndex,
    createdAt: new Date().toISOString(),
  });
  return id;
}

export async function updateScenario(
  id: string,
  patch: Partial<Omit<Scenario, "id" | "createdAt">>,
): Promise<void> {
  await db.scenarios.update(id, patch);
}

export async function deleteScenario(id: string): Promise<void> {
  await db.scenarios.delete(id);
}

export async function toggleStar(id: string): Promise<void> {
  const s = await db.scenarios.get(id);
  if (!s) return;
  await db.scenarios.update(id, { starred: !s.starred });
}

/** Reorder by rewriting rowIndex on every row in the given order. */
export async function reorderScenarios(
  meetId: string,
  orderedIds: string[],
): Promise<void> {
  await db.transaction("rw", db.scenarios, async () => {
    for (let i = 0; i < orderedIds.length; i++) {
      await db.scenarios.update(orderedIds[i], { rowIndex: i });
    }
    void meetId; // currently unused; reserved for future per-meet validation
  });
}

export async function listScenarios(meetId: string): Promise<Scenario[]> {
  const rows = await db.scenarios.where({ meetId }).toArray();
  return rows.sort((a, b) => a.rowIndex - b.rowIndex);
}

/**
 * Reactive list — re-renders when scenarios change. Used by the
 * SimulatorTable component. Returns undefined on first render before
 * Dexie resolves.
 */
export function useScenarios(meetId: string | null): Scenario[] | undefined {
  return useLiveQuery(async () => {
    if (!meetId) return [];
    return listScenarios(meetId);
  }, [meetId]);
}
