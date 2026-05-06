/**
 * One-shot seed loader. Triggered by `?seed=cy` URL param.
 *
 * Used so any device (Mac Chrome / iOS Safari / etc.) can land on the same
 * canonical demo data without backend sync. Idempotent: if any athletes
 * already exist in the local IndexedDB, the seed is skipped.
 *
 * Source: 崔勇 (xty) 2026-02-22 全国邀请赛 试举卡 (real meet card).
 */
import { db } from "../db";
import type {
  Athlete,
  LiftPlan,
  LiveAthleteState,
  LiveLiftRow,
  LiveSession,
  LiveStatus,
  Plan,
} from "../types";

const DEFAULT_MEET_ID = "default-meet";

const cell = (weight: number, note: string) => ({ weight, note });
const empty = { weight: null, note: "" };

function liftPlan(
  opener: number,
  a2: [number, number, number],
  a3: [number, number, number],
): LiftPlan {
  return {
    a1: { low: empty, mid: empty, hi: cell(opener, "比赛开把") },
    a2: {
      low: cell(a2[0], "1st @ 8.5 (难)"),
      mid: cell(a2[1], "1st @ 8 (中等)"),
      hi: cell(a2[2], "1st @ 7.5 (轻松)"),
    },
    a3: {
      low: cell(a3[0], "2nd @ 9.5 (极限)"),
      mid: cell(a3[1], "(默认)"),
      hi: cell(a3[2], "2nd @ 9 (难)"),
    },
    openerTier: "hi",
  };
}

function buildXtyPlan(athleteId: string): Plan {
  return {
    athleteId,
    meetId: DEFAULT_MEET_ID,
    squat: liftPlan(195, [200, 205, 210], [210, 215, 220]),
    bench: liftPlan(115, [117.5, 120, 122.5], [125, 130, 132.5]),
    dead: liftPlan(205, [210, 212.5, 215], [217.5, 220, 225]),
    updatedAt: new Date().toISOString(),
  };
}

const XTY_ATHLETE: Omit<Athlete, "id"> = {
  meetId: DEFAULT_MEET_ID,
  name: "崔勇 Cy",
  sex: "M",
  birthYear: 2000,
  bodyweight: 82.5,
  weightClass: "83",
  division: "Open",
  equipment: "Raw",
  event: "SBD",
  role: "mine",
};

const SEED_ID_PREFIX = "seed_xty_";

const liveCell = (
  weight: number,
  status: LiveStatus = "pending",
) => ({ weight, status });

/** Helper: build a cell with main weight + 2 pending alts for parallel-guess. */
function dlCell(low: number, mid: number, high: number) {
  return {
    weight: mid,
    status: "pending" as LiveStatus,
    alts: [
      { weight: low, status: "pending" as LiveStatus },
      { weight: high, status: "pending" as LiveStatus },
    ],
  };
}

function buildDemoLiveSession(athleteId: string): LiveSession {
  // Mine: SQ/BN single weight, DL with 3 presets (low/mid/hi from plan).
  const mine = {
    squat: [liveCell(195), liveCell(205), liveCell(215)] as LiveLiftRow,
    bench: [liveCell(115), liveCell(120), liveCell(130)] as LiveLiftRow,
    dead: [
      liveCell(205), // A1: only hi tier filled in plan
      dlCell(210, 212.5, 215), // A2: low/mid/hi
      dlCell(217.5, 220, 225), // A3
    ] as LiveLiftRow,
  };
  // 米米 — same class (83KG M Raw), close total to make the gap interesting.
  // Rival DL starts with single predicted weight; coach taps "+" to add up to 3.
  const mimi: LiveAthleteState = {
    id: `seed_rival_mimi_${Date.now().toString(36)}`,
    name: "米米",
    sex: "M",
    bodyweight: 82.0,
    weightClass: "83",
    equipment: "Raw",
    event: "SBD",
    squat: [liveCell(190), liveCell(200), liveCell(210)],
    bench: [liveCell(110), liveCell(117.5), liveCell(122.5)],
    dead: [liveCell(200), liveCell(210), liveCell(220)],
  };
  // 小杰 — cross class (93KG M Raw) — forces GL comparison path
  const xiaojie: LiveAthleteState = {
    id: `seed_rival_xj_${Date.now().toString(36)}`,
    name: "小杰",
    sex: "M",
    bodyweight: 92.0,
    weightClass: "93",
    equipment: "Raw",
    event: "SBD",
    squat: [liveCell(220), liveCell(232.5), liveCell(240)],
    bench: [liveCell(135), liveCell(142.5), liveCell(150)],
    dead: [liveCell(245), liveCell(255), liveCell(265)],
  };
  return {
    meetId: DEFAULT_MEET_ID,
    myAthleteId: athleteId,
    mine,
    rivals: [mimi, xiaojie],
    focus: { lift: "S", attempt: 1 },
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Read `?seed=cy` from the URL and additively insert the xty 2026-02-22
 * demo athlete + plan if it's not already seeded on this device. Also seeds
 * a demo LiveSession with two rivals (米米 same-class, 小杰 cross-class) when
 * no live session exists yet. Existing athletes / sessions are never touched.
 */
export async function maybeSeedFromUrl(): Promise<string | null> {
  if (typeof window === "undefined") return null;
  const params = new URLSearchParams(window.location.search);
  const seed = params.get("seed");
  if (seed !== "cy") return null;
  // Optional ?reset=1 wipes existing demo state before re-seeding.
  // Only used during demo prep — never link this to xty.
  if (params.get("reset") === "1") {
    await db.athletes.clear();
    await db.plans.clear();
    await db.liveSessions.clear();
  }
  const existing = await db.athletes.toArray();
  const already = existing.find((a) => a.id.startsWith(SEED_ID_PREFIX));
  const id = already
    ? already.id
    : `${SEED_ID_PREFIX}${Date.now().toString(36)}`;
  if (!already) {
    await db.athletes.put({ ...XTY_ATHLETE, id });
    await db.plans.put(buildXtyPlan(id));
  }
  // Seed a live session with two demo rivals if none exists yet.
  const existingSession = await db.liveSessions.get(DEFAULT_MEET_ID);
  if (!existingSession) {
    await db.liveSessions.put(buildDemoLiveSession(id));
  }
  return id;
}
