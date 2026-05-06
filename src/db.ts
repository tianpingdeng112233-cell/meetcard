/**
 * IndexedDB schema via Dexie.
 * Versioning convention: bump version + add upgrade block when schema changes.
 */
import Dexie, { type EntityTable } from "dexie";
import type {
  Meet,
  Athlete,
  Plan,
  LiveAttempt,
  Scenario,
  LiveSession,
} from "./types";

class MeetCardDB extends Dexie {
  meets!: EntityTable<Meet, "id">;
  athletes!: EntityTable<Athlete, "id">;
  plans!: EntityTable<Plan, "athleteId">;
  liveAttempts!: EntityTable<LiveAttempt, "id">;
  scenarios!: EntityTable<Scenario, "id">;
  liveSessions!: EntityTable<LiveSession, "meetId">;

  constructor() {
    super("meetcard");
    this.version(1).stores({
      meets: "id, name, date, level",
      athletes: "id, meetId, name, sex, weightClass, division, role",
      plans: "athleteId",
      liveAttempts: "++id, athleteId, [athleteId+lift+attempt], result, timestamp",
      scenarios: "id, meetId, [meetId+rowIndex], myAthleteId, rivalAthleteId",
    });
    // V2: Plan reshaped from {attempts: branches[]} to per-lift 3x3 tier grid.
    // The old shape can't be mechanically converted to the new one, so we
    // archive every legacy row to localStorage before clearing — gives users
    // a recovery path instead of silent data loss.
    this.version(2).stores({
      plans: "athleteId, meetId",
    }).upgrade(async (tx) => {
      const legacy = await tx.table("plans").toArray();
      if (legacy.length > 0) {
        try {
          localStorage.setItem(
            "meetcard:legacy_plans_v1",
            JSON.stringify({
              archivedAt: new Date().toISOString(),
              rows: legacy,
            }),
          );
        } catch {
          // localStorage full or blocked — proceed; can't block upgrade.
        }
      }
      await tx.table("plans").clear();
    });
    // V3: liveSessions for at-meet live-mode state (rivals, statuses, focus).
    this.version(3).stores({
      liveSessions: "meetId, myAthleteId",
    });
  }
}

export const db = new MeetCardDB();

/**
 * Demo helper — verify IndexedDB is wired up by inserting + reading a row.
 * Only used for the Day-1 hello-world, will be deleted once real UI lands.
 */
export async function dbSmokeTest(): Promise<{ ok: boolean; meetCount: number }> {
  const probe: Meet = {
    id: "smoke-test",
    name: "Smoke Test Meet",
    date: new Date().toISOString().slice(0, 10),
    level: "C",
  };
  await db.meets.put(probe);
  const all = await db.meets.toArray();
  return { ok: all.length > 0, meetCount: all.length };
}
