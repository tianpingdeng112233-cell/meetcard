/**
 * Demo fixtures for /live, /vs, /setup screens.
 *
 * Two demo modes:
 *   - "full-flight" (default): generic 8-person M83KG flight.
 *     Shows a homogeneous same-class scenario where total is the
 *     ranking metric.
 *   - "xty": real bilateral case from xty's 2026-05-02 WeChat Notes
 *     (filed in MeetPR Brain wiki). 小杰 71.9F vs 米米 56.5F,
 *     cross-class. Shows GL-based ranking.
 *
 * Switch via `?demo=xty` in URL. Production V1.5 replaces this with
 * Dexie reads — both fixtures here implement the same RankableAthlete
 * shape so consumers don't change.
 */
import type { RankableAthlete } from "./lib/ranking";

export type DemoMode = "full-flight" | "xty";

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

// ── xty real bilateral case (cross-class) ────────────────────────────
//
// Source: xty's 2026-05-02 WeChat Notes screenshot (filed in MeetPR
// Brain wiki at meetings/2026-05-02-xty-bilateral-simulator-evidence.md).
// Bests verbatim from screenshot. Attempt sequences inferred (only the
// final best matters for projTotal). Planned 3rd deadlift = xty's
// starred row 4 ("212.5/182.5") which he annotated "496 能行".
export const XTY_BILATERAL: RankableAthlete[] = [
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
    team: "其他",
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
];

/**
 * Backward-compat export. Old code paths still import ATHLETES.
 * @deprecated Use FULL_FLIGHT or selectDemo() instead.
 */
export const ATHLETES = FULL_FLIGHT;

/**
 * Resolve a demo fixture by mode. Default = full-flight.
 * Used by routes via `?demo=xty` query param.
 */
export function selectDemo(mode: string | null | undefined): RankableAthlete[] {
  if (mode === "xty") return XTY_BILATERAL;
  return FULL_FLIGHT;
}
