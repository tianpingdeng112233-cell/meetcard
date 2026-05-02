/**
 * Demo fixtures for /live, /vs, /setup screens.
 *
 * Two demo modes:
 *   - "full-flight" (default): generic 8-person M83KG flight.
 *     Homogeneous same-class scenario where total is the ranking metric.
 *   - "xty": real bilateral case from xty's 2026-05-02 WeChat Notes
 *     (filed in MeetPR Brain wiki). 小杰 71.9F + 米米 56.5F + 6 more
 *     F athletes spanning 47-84kg classes, plus 6 seed scenarios for
 *     the bilateral simulator.
 *
 * Switch via `?demo=xty` in URL. Production V1.5 replaces this with
 * Dexie reads.
 */
import type { RankableAthlete } from "./lib/ranking";

export type DemoMode = "full-flight" | "xty";

/** Stable meetId for the xty demo — used to seed Dexie scenarios. */
export const XTY_MEET_ID = "xty-flight-demo";

/** Default rival for the xty demo: 米米 (the rival xty was tracking
 *  in his 2026-05-02 screenshot). Used by /vs when 小杰 is rank-1
 *  by projected total — without this override the screen falls into
 *  the "no rank-ahead opponent" path and skips the H2H section. */
export const XTY_DEFAULT_RIVAL_ID = "mm-2026-05";

/** Stable meetId for the default 8-man demo (kept distinct so the
 *  user can keep both running in parallel without scenarios merging). */
export const FULL_FLIGHT_MEET_ID = "full-flight-demo";

// ── Default: 8-person M83KG flight (same class) ──────────────────────
export const FULL_FLIGHT: RankableAthlete[] = [
  {
    id: "xty1",
    name: "陈一帆",
    team: "XTY",
    bw: 82.4,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    isOurs: true,
    squat: [220, 235, 245],
    squatRes: ["m", "m", "m"],
    bench: [142.5, 152.5, 0],
    benchRes: ["m", "c", null],
    dead: [260, 275, 290],
    deadRes: [null, null, null],
  },
  {
    id: "a2",
    name: "李哲",
    team: "深圳",
    bw: 82.9,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [230, 242.5, 252.5],
    squatRes: ["m", "m", "x"],
    bench: [145, 155, 0],
    benchRes: ["m", "m", null],
    dead: [265, 280, 295],
    deadRes: [null, null, null],
  },
  {
    id: "a3",
    name: "王启明",
    team: "北京",
    bw: 81.8,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [225, 240, 250],
    squatRes: ["m", "m", "m"],
    bench: [140, 150, 0],
    benchRes: ["m", "x", null],
    dead: [262.5, 277.5, 290],
    deadRes: [null, null, null],
  },
  {
    id: "a4",
    name: "赵子轩",
    team: "广州",
    bw: 82.2,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [215, 227.5, 235],
    squatRes: ["m", "m", "m"],
    bench: [137.5, 147.5, 0],
    benchRes: ["m", "m", null],
    dead: [255, 272.5, 285],
    deadRes: [null, null, null],
  },
  {
    id: "a5",
    name: "孙浩然",
    team: "上海",
    bw: 82.7,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [222.5, 237.5, 247.5],
    squatRes: ["m", "x", "x"],
    bench: [142.5, 152.5, 0],
    benchRes: ["m", "m", null],
    dead: [260, 275, 290],
    deadRes: [null, null, null],
  },
  {
    id: "a6",
    name: "吴俊杰",
    team: "成都",
    bw: 81.5,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [217.5, 230, 240],
    squatRes: ["m", "m", "m"],
    bench: [135, 145, 0],
    benchRes: ["m", "m", null],
    dead: [250, 267.5, 282.5],
    deadRes: [null, null, null],
  },
  {
    id: "a7",
    name: "林鹤鸣",
    team: "杭州",
    bw: 82.9,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [225, 237.5, 247.5],
    squatRes: ["m", "m", "x"],
    bench: [140, 150, 0],
    benchRes: ["m", "c", null],
    dead: [260, 275, 290],
    deadRes: [null, null, null],
  },
  {
    id: "a8",
    name: "黄世豪",
    team: "武汉",
    bw: 82.0,
    sex: "M",
    equipment: "Raw",
    event: "SBD",
    weightClass: "83",
    squat: [212.5, 225, 235],
    squatRes: ["m", "m", "m"],
    bench: [132.5, 142.5, 0],
    benchRes: ["m", "m", null],
    dead: [247.5, 262.5, 277.5],
    deadRes: [null, null, null],
  },
];

// ── xty real meet flight (cross-class, 1 ours + 7 rivals) ────────────
//
// Source: 小杰 + 米米 numbers verbatim from xty's 2026-05-02 WeChat
// Notes screenshot (Brain wiki: meetings/2026-05-02-xty-bilateral-
// simulator-evidence.md). Other 6 athletes synthesized to populate a
// realistic IPF women's flight (cross-class 47-84kg) so the rival
// switcher has meaningful options.
export const XTY_FLIGHT: RankableAthlete[] = [
  {
    id: "xj-2026-05",
    name: "小杰",
    team: "XTY",
    bw: 71.9,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "76",
    isOurs: true,
    squat: [180, 190, 195],
    squatRes: ["m", "m", "x"],
    bench: [85, 92.5, 95],
    benchRes: ["m", "m", "m"],
    dead: [195, 205, 212.5],
    deadRes: [null, null, null],
  },
  {
    id: "mm-2026-05",
    name: "米米",
    team: "北京",
    bw: 56.5,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "57",
    squat: [155, 165, 167.5],
    squatRes: ["m", "m", "x"],
    bench: [70, 75, 77.5],
    benchRes: ["m", "m", "m"],
    dead: [170, 177.5, 182.5],
    deadRes: [null, null, null],
  },
  {
    id: "lj-2026-05",
    name: "李娟",
    team: "上海",
    bw: 63.0,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "63",
    squat: [165, 175, 180],
    squatRes: ["m", "m", "x"],
    bench: [90, 100, 105],
    benchRes: ["m", "m", "x"],
    dead: [145, 155, 160],
    deadRes: [null, null, null],
  },
  {
    id: "zh-2026-05",
    name: "赵华",
    team: "广州",
    bw: 56.8,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "57",
    squat: [145, 155, 160],
    squatRes: ["m", "m", "x"],
    bench: [70, 75, 77.5],
    benchRes: ["m", "m", "x"],
    dead: [165, 175, 180],
    deadRes: [null, null, null],
  },
  {
    id: "ww-2026-05",
    name: "王玮玮",
    team: "成都",
    bw: 71.5,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "76",
    squat: [175, 185, 190],
    squatRes: ["m", "m", "x"],
    bench: [92.5, 100, 105],
    benchRes: ["m", "m", "x"],
    dead: [180, 190, 192.5],
    deadRes: [null, null, null],
  },
  {
    id: "cl-2026-05",
    name: "陈灵",
    team: "武汉",
    bw: 47.2,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "47",
    squat: [125, 135, 140],
    squatRes: ["m", "m", "x"],
    bench: [62.5, 70, 72.5],
    benchRes: ["m", "m", "x"],
    dead: [145, 152.5, 157.5],
    deadRes: [null, null, null],
  },
  {
    id: "hf-2026-05",
    name: "韩芳",
    team: "深圳",
    bw: 63.4,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "63",
    squat: [160, 170, 175],
    squatRes: ["m", "m", "x"],
    bench: [85, 95, 97.5],
    benchRes: ["m", "m", "x"],
    dead: [145, 152.5, 155],
    deadRes: [null, null, null],
  },
  {
    id: "sx-2026-05",
    name: "史欣",
    team: "北京",
    bw: 71.8,
    sex: "F",
    equipment: "Raw",
    event: "SBD",
    weightClass: "76",
    squat: [170, 180, 185],
    squatRes: ["m", "m", "x"],
    bench: [85, 95, 97.5],
    benchRes: ["m", "m", "x"],
    dead: [180, 187.5, 190],
    deadRes: [null, null, null],
  },
];

/**
 * 6 seed scenarios for xty demo — verbatim from his 2026-05-02 screenshot.
 * Used to populate Dexie scenarios table on first load (idempotent —
 * seedScenariosIfEmpty checks before inserting).
 */
export const XTY_SEED_SCENARIOS: Array<{
  myDeadliftKg: number;
  rivalDeadliftKg: number;
  note?: string;
  starred?: boolean;
}> = [
  { myDeadliftKg: 195, rivalDeadliftKg: 170, note: "开把" },
  { myDeadliftKg: 205, rivalDeadliftKg: 177.5 },
  { myDeadliftKg: 210, rivalDeadliftKg: 180 },
  { myDeadliftKg: 212.5, rivalDeadliftKg: 182.5, note: "496 能行", starred: true },
  { myDeadliftKg: 213.5, rivalDeadliftKg: 185, note: "险胜" },
  { myDeadliftKg: 216.5, rivalDeadliftKg: 187.5, note: "激进" },
];

/**
 * Backward-compat aliases. Old code paths still import ATHLETES /
 * XTY_BILATERAL by name — kept until the Dexie migration in V1.5.
 * @deprecated
 */
export const ATHLETES = FULL_FLIGHT;
/** @deprecated renamed to XTY_FLIGHT (now 8 athletes, not 2) */
export const XTY_BILATERAL = XTY_FLIGHT;

/**
 * Resolve a demo fixture by mode. Default = full-flight.
 * Used by routes via `?demo=xty` query param.
 */
export function selectDemo(mode: string | null | undefined): RankableAthlete[] {
  if (mode === "xty") return XTY_FLIGHT;
  return FULL_FLIGHT;
}

/** Get the meetId for a given demo mode (used for Dexie scoping). */
export function meetIdForDemo(mode: string | null | undefined): string {
  if (mode === "xty") return XTY_MEET_ID;
  return FULL_FLIGHT_MEET_ID;
}

/**
 * Default rival id for /vs hero math.
 * - xty demo: hardcoded 米米 (the rival xty tracks in his real workflow).
 * - others: next-rank athlete (caller computes from rankByProjected).
 */
export function defaultRivalIdForDemo(
  mode: string | null | undefined,
): string | null {
  if (mode === "xty") return XTY_DEFAULT_RIVAL_ID;
  return null; // caller falls back to next-rank
}
