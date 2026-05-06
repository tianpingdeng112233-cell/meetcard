/**
 * Mobile live-mode overtake simulator.
 *
 * Per Q1 (status three-state) + Q2 (rivals start blank, manual entry).
 *
 * - Top: pick my athlete + my next attempt (lift × attempt#).
 * - My card: 3 lifts × 3 attempts grid. Each slot has weight + status (待/✓/✗).
 *   Bootstrapped from my Plan if it exists; otherwise blank.
 * - Rivals cards: same shape, all blank by default. "+ 加对手" to add.
 * - Per-rival readout: same-class total OR cross-class IPF GL.
 * - Footer: 一锤定音 = max required across rivals.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { db } from "../db";
import type {
  Athlete,
  AttemptNumber,
  Lift,
  LiveAthleteState,
  LiveLiftRow,
  LiveLiftRow_Trio,
  LiveReminders,
  LiveSession,
  LiveStatus,
  Plan,
  Sex,
  Equipment,
  WarmupTimer,
} from "../types";
import { confirmedTotal, overtake, projectedTotal } from "../lib/overtake";
import { ipfGLPoints } from "../lib/ranking";
import { maybeSeedFromUrl } from "../lib/seed";
import { warmupForLift } from "../lib/warmup";

const DEFAULT_MEET_ID = "default-meet";
/** IPF Open weight classes. Includes Sub-Junior 53/43kg for completeness. */
const IPF_CLASSES_M = ["53", "59", "66", "74", "83", "93", "105", "120", "120+"];
const IPF_CLASSES_F = ["43", "47", "52", "57", "63", "69", "76", "84", "84+"];
const LIFTS: Lift[] = ["S", "B", "D"];
const LIFT_SHORT: Record<Lift, string> = { S: "SQ", B: "BN", D: "DL" };
const LIFT_KEY: Record<Lift, "squat" | "bench" | "dead"> = {
  S: "squat",
  B: "bench",
  D: "dead",
};

const STATUS_CYCLE: Record<LiveStatus, LiveStatus> = {
  pending: "made",
  made: "missed",
  missed: "pending",
};
const STATUS_GLYPH: Record<LiveStatus, string> = {
  pending: "○",
  made: "✓",
  missed: "✗",
};
const STATUS_COLOR: Record<LiveStatus, string> = {
  pending: "var(--fg-tertiary)",
  made: "var(--green)",
  missed: "var(--brand-red)",
};

function emptyRow(): LiveLiftRow {
  return [
    { weight: null, status: "pending" },
    { weight: null, status: "pending" },
    { weight: null, status: "pending" },
  ];
}
function emptyTrio(): LiveLiftRow_Trio {
  return { squat: emptyRow(), bench: emptyRow(), dead: emptyRow() };
}

/** Build a single-weight LiveAttempt from a 3-tier plan cell using `primary`. */
function cellFromTier(
  cells: { low: { weight: number | null }; mid: { weight: number | null }; hi: { weight: number | null } },
  primary: "low" | "mid" | "hi",
): LiveLiftRow[number] {
  return {
    weight: cells[primary].weight,
    status: "pending",
  };
}

/** Same as cellFromTier but ALSO pulls the other two tiers as alts (for DL
 *  multi-guess on mine — coach can ↑↓ cycle through low/mid/hi). */
function cellFromTiersWithAlts(
  cells: { low: { weight: number | null }; mid: { weight: number | null }; hi: { weight: number | null } },
  primary: "low" | "mid" | "hi",
): LiveLiftRow[number] {
  const order: ("low" | "mid" | "hi")[] = ["low", "mid", "hi"];
  const mainW = cells[primary].weight;
  const alts = order
    .filter((t) => t !== primary)
    .map((t) => cells[t].weight)
    .filter((w): w is number => w != null && w > 0)
    .map((w) => ({ weight: w, status: "pending" as LiveStatus }));
  return {
    weight: mainW,
    status: "pending",
    alts: alts.length > 0 ? alts : undefined,
  };
}

function planToTrio(plan: Plan | undefined): LiveLiftRow_Trio {
  if (!plan) return emptyTrio();
  const p = plan;
  // SQ / BN: single weight from chosen tier. DL: chosen tier + alts.
  function pickSingle(lift: "squat" | "bench"): LiveLiftRow {
    const lp = p[lift];
    const a1Primary = lp.openerTier ?? "hi";
    return [
      cellFromTier(lp.a1, a1Primary),
      cellFromTier(lp.a2, "mid"),
      cellFromTier(lp.a3, "mid"),
    ];
  }
  function pickDead(): LiveLiftRow {
    const lp = p.dead;
    const a1Primary = lp.openerTier ?? "hi";
    return [
      cellFromTiersWithAlts(lp.a1, a1Primary),
      cellFromTiersWithAlts(lp.a2, "mid"),
      cellFromTiersWithAlts(lp.a3, "mid"),
    ];
  }
  return { squat: pickSingle("squat"), bench: pickSingle("bench"), dead: pickDead() };
}

function newRival(): LiveAthleteState {
  return {
    id: `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    name: "",
    sex: "M",
    bodyweight: 80,
    weightClass: "83",
    equipment: "Raw",
    event: "SBD",
    squat: emptyRow(),
    bench: emptyRow(),
    dead: emptyRow(),
  };
}

// ─── Reusable atoms ─────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  width = 64,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  width?: number;
}) {
  const [text, setText] = useState(value == null ? "" : String(value));
  useEffect(() => {
    setText(value == null ? "" : String(value));
  }, [value]);
  return (
    <input
      className="mc-num-input"
      type="text"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const t = e.target.value;
        setText(t);
        if (t === "") onChange(null);
        else {
          const n = Number(t);
          if (!Number.isNaN(n)) onChange(n);
        }
      }}
      style={{
        width,
        padding: "6px 0px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--fg-primary)",
        fontSize: 13,
        textAlign: "center",
        boxSizing: "border-box",
      }}
    />
  );
}

function StatusButton({
  status,
  onCycle,
}: {
  status: LiveStatus;
  onCycle: () => void;
}) {
  return (
    <button
      onClick={onCycle}
      style={{
        width: 24,
        height: 24,
        borderRadius: 12,
        background:
          status === "made"
            ? "var(--green-soft)"
            : status === "missed"
            ? "var(--brand-red-soft)"
            : "var(--surface-2)",
        border: `1.5px solid ${STATUS_COLOR[status]}`,
        color: STATUS_COLOR[status],
        fontWeight: 700,
        fontSize: 14,
        cursor: "pointer",
        padding: 0,
        flexShrink: 0,
      }}
    >
      {STATUS_GLYPH[status]}
    </button>
  );
}

// ─── Attempt grid (3 lifts × 3 attempts) ────────────────────────────

function AttemptGrid({
  trio,
  onChange,
  focusAttempt,
  multiGuessLifts,
  multiGuessMode = "cycle",
  allowAddRemove = true,
}: {
  trio: LiveLiftRow_Trio;
  onChange: (next: LiveLiftRow_Trio) => void;
  focusAttempt?: { lift: Lift; attempt: AttemptNumber } | null;
  /** Lifts where the cell shows multi-guess UI (each attempt can have up to 3 alts). */
  multiGuessLifts?: Lift[];
  /** "cycle": single visible weight + ↑↓ rotation (mine).
   *  "stack": all alts shown vertically with own status circles (rival).
   *  Pass a record to set per-lift mode (e.g. SQ/BN cycle, DL stack). */
  multiGuessMode?: "cycle" | "stack" | Partial<Record<Lift, "cycle" | "stack">>;
  /** Whether the coach can add (+) or delete (×) presets. False = fixed count. */
  allowAddRemove?: boolean;
}) {
  function updateCell(
    lift: Lift,
    attempt: AttemptNumber,
    next: Partial<{ weight: number | null; status: LiveStatus; alts: typeof trio.squat[number]["alts"] }>,
  ) {
    const key = LIFT_KEY[lift];
    const row = [...trio[key]] as LiveLiftRow;
    const i = attempt - 1;
    row[i] = { ...row[i], ...next };
    onChange({ ...trio, [key]: row });
  }
  const isMulti = (l: Lift) => multiGuessLifts?.includes(l) ?? false;
  const modeForLift = (l: Lift): "cycle" | "stack" =>
    typeof multiGuessMode === "string"
      ? multiGuessMode
      : multiGuessMode[l] ?? "cycle";

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "32px repeat(3, minmax(0, 1fr))",
        gap: 6,
        alignItems: "center",
      }}
    >
      <span />
      {[1, 2, 3].map((a) => (
        <span
          key={a}
          style={{
            color: "var(--fg-tertiary)",
            fontSize: 11,
            textAlign: "center",
            fontFamily: "var(--font-mono)",
            letterSpacing: "0.05em",
          }}
        >
          A{a}
        </span>
      ))}
      {LIFTS.map((lift) => {
        const key = LIFT_KEY[lift];
        const row = trio[key];
        return (
          <div key={lift} style={{ display: "contents" }}>
            <span
              style={{
                color: "var(--fg-secondary)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              {LIFT_SHORT[lift]}
            </span>
            {[0, 1, 2].map((i) => {
              const cell = row[i];
              const isFocus =
                focusAttempt &&
                focusAttempt.lift === lift &&
                focusAttempt.attempt === i + 1;
              const multi = isMulti(lift);
              const alts = cell.alts ?? [];
              const cellMode = modeForLift(lift);
              const canAddAlt = multi && alts.length < 2 && allowAddRemove;
              const cycle = (dir: "next" | "prev") => {
                if (alts.length === 0) return;
                const cur: typeof alts[number] = {
                  weight: cell.weight ?? 0,
                  status: cell.status,
                };
                if (dir === "next") {
                  const nextMain = alts[0];
                  updateCell(lift, (i + 1) as AttemptNumber, {
                    weight: nextMain.weight,
                    status: nextMain.status,
                    alts: [...alts.slice(1), cur],
                  });
                } else {
                  const nextMain = alts[alts.length - 1];
                  updateCell(lift, (i + 1) as AttemptNumber, {
                    weight: nextMain.weight,
                    status: nextMain.status,
                    alts: [cur, ...alts.slice(0, -1)],
                  });
                }
              };
              const arrowBtn: React.CSSProperties = {
                width: 22,
                height: 22,
                padding: 0,
                background: "var(--surface-2)",
                border: "1px solid var(--border)",
                borderRadius: 11,
                color: "var(--fg-secondary)",
                fontSize: 12,
                lineHeight: 1,
                cursor: "pointer",
                flexShrink: 0,
              };

              // STACK mode (rival DL): each preset is its own row with status circle.
              // + on main row (matches cycle mode), × on each alt row to delete.
              if (multi && cellMode === "stack" && alts.length > 0) {
                const sideBtnStyle: React.CSSProperties = {
                  width: 14,
                  height: 14,
                  padding: 0,
                  background: "var(--surface-2)",
                  border: "1px solid var(--border)",
                  borderRadius: 7,
                  color: "var(--fg-secondary)",
                  fontSize: 11,
                  lineHeight: 1,
                  cursor: "pointer",
                  flexShrink: 0,
                };
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: 2,
                      padding: "4px 0px",
                      background: isFocus ? "var(--brand-red-soft)" : "transparent",
                      border: isFocus
                        ? "1px solid var(--brand-red)"
                        : "1px solid transparent",
                      borderRadius: 6,
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
                      <StatusButton
                        status={cell.status}
                        onCycle={() =>
                          updateCell(lift, (i + 1) as AttemptNumber, {
                            status: STATUS_CYCLE[cell.status],
                          })
                        }
                      />
                      <NumInput
                        value={cell.weight}
                        onChange={(w) =>
                          updateCell(lift, (i + 1) as AttemptNumber, { weight: w })
                        }
                        width={44}
                      />
                      {canAddAlt ? (
                        <button
                          onClick={() =>
                            updateCell(lift, (i + 1) as AttemptNumber, {
                              alts: [
                                ...alts,
                                {
                                  weight:
                                    alts[alts.length - 1]?.weight ??
                                    cell.weight ??
                                    0,
                                  status: "pending",
                                },
                              ],
                            })
                          }
                          title="加并行预估 (最多 3 档)"
                          style={sideBtnStyle}
                        >
                          +
                        </button>
                      ) : allowAddRemove ? (
                        <span style={{ width: 14, flexShrink: 0 }} />
                      ) : null}
                    </div>
                    {alts.map((alt, j) => (
                      <div
                        key={j}
                        style={{ display: "flex", alignItems: "center", gap: 3 }}
                      >
                        <StatusButton
                          status={alt.status}
                          onCycle={() => {
                            const nextAlts = [...alts];
                            nextAlts[j] = {
                              ...alt,
                              status: STATUS_CYCLE[alt.status],
                            };
                            updateCell(lift, (i + 1) as AttemptNumber, {
                              alts: nextAlts,
                            });
                          }}
                        />
                        <NumInput
                          value={alt.weight}
                          onChange={(w) => {
                            if (w == null) return;
                            const nextAlts = [...alts];
                            nextAlts[j] = { ...alt, weight: w };
                            updateCell(lift, (i + 1) as AttemptNumber, {
                              alts: nextAlts,
                            });
                          }}
                          width={44}
                        />
                        {allowAddRemove && (
                          <button
                            onClick={() => {
                              const nextAlts = alts.filter((_, k) => k !== j);
                              updateCell(lift, (i + 1) as AttemptNumber, {
                                alts: nextAlts,
                              });
                            }}
                            title="删除此预估"
                            style={sideBtnStyle}
                          >
                            ×
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                );
              }

              // CYCLE mode (mine DL) or single-weight (SQ/BN, all of mine, all of rival SQ/BN).
              return (
                <div
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 2,
                    padding: "4px 0px",
                    background: isFocus ? "var(--brand-red-soft)" : "transparent",
                    border: isFocus
                      ? "1px solid var(--brand-red)"
                      : "1px solid transparent",
                    borderRadius: 6,
                  }}
                >
                  <StatusButton
                    status={cell.status}
                    onCycle={() =>
                      updateCell(lift, (i + 1) as AttemptNumber, {
                        status: STATUS_CYCLE[cell.status],
                      })
                    }
                  />
                  <NumInput
                    value={cell.weight}
                    onChange={(w) =>
                      updateCell(lift, (i + 1) as AttemptNumber, { weight: w })
                    }
                    width={alts.length > 0 ? 42 : 44}
                  />
                  {multi && cellMode === "cycle" && (
                    <button
                      onClick={() => cycle("next")}
                      title={`并行预估 ${alts.length + 1} 档,点击切下一档`}
                      style={arrowBtn}
                    >
                      ▼
                    </button>
                  )}
                  {canAddAlt && (
                    <button
                      onClick={() =>
                        updateCell(lift, (i + 1) as AttemptNumber, {
                          alts: [
                            ...alts,
                            { weight: cell.weight ?? 0, status: "pending" },
                          ],
                        })
                      }
                      title="加并行预估 (最多 3 档)"
                      style={{
                        width: 14,
                        height: 14,
                        padding: 0,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        borderRadius: 7,
                        color: "var(--fg-secondary)",
                        fontSize: 11,
                        lineHeight: 1,
                        cursor: "pointer",
                        flexShrink: 0,
                      }}
                    >
                      +
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

// ─── Athlete identity card (rival editable, mine read-only) ────────

function AthleteIdentity({
  state,
  editable,
  onChange,
  onDelete,
}: {
  state: { name: string; sex: Sex; bodyweight: number; weightClass: string; equipment: Equipment };
  editable: boolean;
  onChange?: (next: typeof state) => void;
  onDelete?: () => void;
}) {
  // Local text state so "82." mid-typing isn't nuked by Number() coercion.
  // Per-rival remount via parent key={r.id} resets this.
  const [bwText, setBwText] = useState(String(state.bodyweight));
  if (!editable) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
        <span style={{ fontSize: 17, fontWeight: 700 }}>{state.name || "(未命名)"}</span>
        <span style={{ fontSize: 12, color: "var(--fg-tertiary)" }}>
          {state.sex === "M" ? "男" : "女"} · 级别 {state.weightClass}kg · 体重{" "}
          {state.bodyweight}kg
        </span>
      </div>
    );
  }
  const fld = {
    padding: "4px 6px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 4,
    color: "var(--fg-primary)",
    fontSize: 12,
    minWidth: 0,
    width: "100%",
    boxSizing: "border-box" as const,
  };
  const cap = {
    fontSize: 10,
    color: "var(--fg-tertiary)",
    fontFamily: "var(--font-mono)",
    letterSpacing: "0.05em",
    textTransform: "uppercase" as const,
    marginBottom: 2,
  };
  const classOptions = state.sex === "M" ? IPF_CLASSES_M : IPF_CLASSES_F;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <div style={{ display: "flex", gap: 4 }}>
        <input
          type="text"
          value={state.name}
          onChange={(e) => onChange?.({ ...state, name: e.target.value })}
          placeholder="对手姓名"
          style={{ ...fld, flex: 1, fontWeight: 600, fontSize: 14 }}
        />
        <button
          onClick={onDelete}
          title="删除对手"
          style={{
            padding: "2px 10px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 4,
            color: "var(--fg-tertiary)",
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.2fr 1.2fr", gap: 4 }}>
        <div>
          <div style={cap}>性别</div>
          <select
            value={state.sex}
            onChange={(e) => onChange?.({ ...state, sex: e.target.value as Sex })}
            style={fld}
          >
            <option value="M">男</option>
            <option value="F">女</option>
          </select>
        </div>
        <div>
          <div style={cap}>级别 (kg)</div>
          <select
            value={state.weightClass}
            onChange={(e) => onChange?.({ ...state, weightClass: e.target.value })}
            style={fld}
          >
            {classOptions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
            {!classOptions.includes(state.weightClass) && state.weightClass && (
              <option value={state.weightClass}>{state.weightClass}</option>
            )}
          </select>
        </div>
        <div>
          <div style={cap}>体重 (kg)</div>
          <input
            className="mc-num-input"
            type="text"
            inputMode="decimal"
            value={bwText}
            onChange={(e) => {
              const t = e.target.value;
              setBwText(t);
              if (t === "" || t === ".") return;
              const n = Number(t);
              if (!Number.isNaN(n)) onChange?.({ ...state, bodyweight: n });
            }}
            placeholder="80"
            style={fld}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Rival card ─────────────────────────────────────────────────────

function RivalCard({
  myAthlete,
  myTrio,
  rival,
  focus,
  onChange,
  onDelete,
}: {
  myAthlete: Athlete;
  myTrio: LiveLiftRow_Trio;
  rival: LiveAthleteState;
  focus: { lift: Lift; attempt: AttemptNumber };
  onChange: (next: LiveAthleteState) => void;
  onDelete: () => void;
}) {
  const trio: LiveLiftRow_Trio = {
    squat: rival.squat,
    bench: rival.bench,
    dead: rival.dead,
  };
  const result = overtake(myAthlete, myTrio, focus, rival);
  const confTotal = confirmedTotal(trio);
  const projTotal = projectedTotal(trio);
  const confGL = ipfGLPoints(
    confTotal,
    rival.bodyweight,
    rival.sex,
    rival.equipment,
    rival.event,
  );
  const projGL = ipfGLPoints(
    projTotal,
    rival.bodyweight,
    rival.sex,
    rival.equipment,
    rival.event,
  );
  const sameClass = result.sameClass;

  // Gap display: same-class shows kg total gap, cross-class shows GL gap.
  // Positive = my number is higher = leading.
  const myConfirmed = confirmedTotal(myTrio);
  const myProjected = projectedTotal(myTrio);
  let confGap = 0;
  let projGap = 0;
  let gapUnit: "kg" | "GL" = "kg";
  if (sameClass) {
    confGap = myConfirmed - confTotal;
    projGap = myProjected - projTotal;
    gapUnit = "kg";
  } else {
    const myConfGL = ipfGLPoints(
      myConfirmed,
      myAthlete.bodyweight,
      myAthlete.sex,
      myAthlete.equipment,
      myAthlete.event,
    );
    const myProjGL = ipfGLPoints(
      myProjected,
      myAthlete.bodyweight,
      myAthlete.sex,
      myAthlete.equipment,
      myAthlete.event,
    );
    confGap = myConfGL - confGL;
    projGap = myProjGL - projGL;
    gapUnit = "GL";
  }

  return (
    <section
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 14,
        display: "flex",
        flexDirection: "column",
        gap: 10,
      }}
    >
      <AthleteIdentity
        state={{
          name: rival.name,
          sex: rival.sex,
          bodyweight: rival.bodyweight,
          weightClass: rival.weightClass,
          equipment: rival.equipment,
        }}
        editable
        onChange={(next) => onChange({ ...rival, ...next })}
        onDelete={onDelete}
      />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "auto 1fr",
          columnGap: 10,
          rowGap: 2,
          fontSize: 12,
          color: "var(--fg-secondary)",
          fontFamily: "var(--font-mono)",
        }}
      >
        <span style={{ color: "var(--fg-tertiary)" }}>已确认</span>
        <span>
          <strong style={{ color: "var(--fg-primary)" }}>{confTotal} kg</strong>
          {" · GL "}
          {confGL.toFixed(2)}
        </span>
        <span style={{ color: "var(--fg-tertiary)" }}>预设</span>
        <span>
          <strong style={{ color: "var(--fg-primary)" }}>{projTotal} kg</strong>
          {" · GL "}
          {projGL.toFixed(2)}
        </span>
      </div>
      <AttemptGrid
        trio={trio}
        onChange={(next) =>
          onChange({
            ...rival,
            squat: next.squat,
            bench: next.bench,
            dead: next.dead,
          })
        }
        multiGuessLifts={["D"]}
        multiGuessMode="stack"
      />
      {projTotal <= 0 ? (
        <div
          style={{
            padding: "8px 10px",
            background: "var(--surface-2)",
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            color: "var(--fg-tertiary)",
          }}
        >
          对手未填重量
        </div>
      ) : (
        <div
          style={{
            padding: "10px 12px",
            background: "var(--surface-2)",
            borderRadius: 8,
            display: "flex",
            flexDirection: "column",
            gap: 6,
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr",
              columnGap: 12,
              rowGap: 4,
              fontSize: 14,
              fontFamily: "var(--font-mono)",
              fontVariantNumeric: "tabular-nums",
            }}
          >
            <span style={{ color: "var(--fg-tertiary)" }}>已确认差</span>
            <span style={{ fontWeight: 700, color: gapColor(confGap) }}>
              {fmtGap(confGap, gapUnit)}
            </span>
            <span style={{ color: "var(--fg-tertiary)" }}>预设差</span>
            <span style={{ fontWeight: 700, color: gapColor(projGap) }}>
              {fmtGap(projGap, gapUnit)}
            </span>
          </div>
          {focus.lift === "D" && (
            <div
              style={{
                fontSize: 13,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                paddingTop: 4,
                borderTop: "1px dashed var(--border)",
                color: result.outOfReach
                  ? "var(--brand-red)"
                  : result.minRequired === null
                  ? "var(--green)"
                  : "var(--fg-secondary)",
              }}
            >
              {result.minRequired === null ? (
                <>
                  硬拉 A{focus.attempt} 已反超{" "}
                  <span style={{ color: "var(--fg-tertiary)" }}>
                    ({sameClass ? "同级 Total" : "跨级 GL"})
                  </span>
                </>
              ) : (
                <>
                  硬拉 A{focus.attempt} 至少{" "}
                  <strong style={{ color: "var(--brand-red)", fontSize: 14 }}>
                    {result.minRequired} kg
                  </strong>{" "}
                  {result.outOfReach ? "(超出现实)" : "反超"}{" "}
                  <span style={{ color: "var(--fg-tertiary)" }}>
                    ({sameClass ? "同级 Total" : "跨级 GL"})
                  </span>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

function gapColor(gap: number): string {
  if (gap > 0.001) return "var(--green)";
  if (gap < -0.001) return "var(--brand-red)";
  return "var(--amber)";
}

function fmtGap(gap: number, unit: "kg" | "GL"): string {
  const sign = gap > 0 ? "+" : gap < 0 ? "" : "±";
  if (unit === "kg") {
    const rounded = Math.round(gap * 10) / 10;
    return `${sign}${rounded} kg`;
  }
  return `${sign}${gap.toFixed(2)} GL`;
}

// ─── Top: pick my athlete + focus ───────────────────────────────────

function MyAthletePicker({
  athletes,
  activeId,
  onSelect,
}: {
  athletes: Athlete[];
  activeId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
      <span
        className="t-mono-label"
        style={{ color: "var(--fg-tertiary)" }}
      >
        我的运动员
      </span>
      <select
        value={activeId ?? ""}
        onChange={(e) => onSelect(e.target.value)}
        style={{
          padding: "8px 10px",
          background: "var(--surface-2)",
          border: "1px solid var(--border)",
          borderRadius: 6,
          color: "var(--fg-primary)",
          fontSize: 14,
        }}
      >
        <option value="" disabled>
          选一个 (在 /plan 创建)
        </option>
        {athletes.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name || "(未命名)"} · {a.weightClass}KG · {a.sex === "M" ? "男" : "女"}
          </option>
        ))}
      </select>
    </div>
  );
}

/** Find the next pending attempt across SQ → BN → DL, A1 → A2 → A3. */
export function nextPending(
  mine: LiveLiftRow_Trio,
): { lift: Lift; attempt: AttemptNumber } | null {
  for (const lift of LIFTS) {
    const row = mine[LIFT_KEY[lift]];
    for (let i = 0; i < 3; i++) {
      if (row[i].status === "pending") {
        return { lift, attempt: (i + 1) as AttemptNumber };
      }
    }
  }
  return null;
}

function countCompleted(mine: LiveLiftRow_Trio): number {
  let n = 0;
  for (const lift of LIFTS) {
    for (const c of mine[LIFT_KEY[lift]]) {
      if (c.status !== "pending") n++;
    }
  }
  return n;
}

function ProgressTracker({
  mine,
  next,
  reminders,
  onChangeReminders,
  warmupDone,
}: {
  mine: LiveLiftRow_Trio;
  next: { lift: Lift; attempt: AttemptNumber } | null;
  reminders: LiveReminders;
  onChangeReminders: (r: LiveReminders) => void;
  warmupDone?: Partial<Record<Lift, boolean>>;
}) {
  const completed = countCompleted(mine);
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 8,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <span className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
          试举进度
        </span>
        <span
          style={{
            fontSize: 12,
            color: "var(--fg-secondary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          {next === null ? "全部完成" : `已完成 ${completed} / 9`}
        </span>
      </div>
      {LIFTS.map((lift) => {
        const row = mine[LIFT_KEY[lift]];
        const reminderKey =
          lift === "S" ? "afterSquat" : lift === "B" ? "afterBench" : null;
        const reminderValue = reminderKey ? reminders[reminderKey] ?? "" : "";
        return (
          <div key={lift} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "32px 50px 1fr 1fr 1fr",
                gap: 6,
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: "var(--fg-secondary)",
                }}
              >
                {LIFT_SHORT[lift]}
              </span>
              {(() => {
                const done = warmupDone?.[lift] ?? false;
                return (
                  <a
                    href={`/warmup?lift=${lift}`}
                    title={`${LIFT_SHORT[lift]} 热身详情${done ? " · 已完成" : ""}`}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      padding: "5px 0",
                      background: done ? "var(--green-soft)" : "var(--amber-soft)",
                      border: `1px solid ${done ? "var(--green)" : "var(--amber)"}`,
                      borderRadius: 6,
                      color: done ? "var(--green)" : "var(--amber)",
                      fontSize: 11,
                      textDecoration: "none",
                      fontFamily: "var(--font-mono)",
                    }}
                  >
                    热身{done ? " ✓" : ""}
                  </a>
                );
              })()}
              {[0, 1, 2].map((i) => {
                const cell = row[i];
                const isNext = next?.lift === lift && next.attempt === i + 1;
                const glyph =
                  cell.status === "made"
                    ? "✓"
                    : cell.status === "missed"
                    ? "✗"
                    : "·";
                const fg =
                  cell.status === "made"
                    ? "var(--green)"
                    : cell.status === "missed"
                    ? "var(--brand-red)"
                    : "var(--fg-tertiary)";
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 6,
                      padding: "5px 6px",
                      background: isNext ? "var(--brand-red-soft)" : "var(--surface-2)",
                      border: `1px solid ${isNext ? "var(--brand-red)" : "var(--border)"}`,
                      borderRadius: 6,
                      fontSize: 12,
                      fontFamily: "var(--font-mono)",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    <span style={{ color: fg, fontWeight: 700 }}>{glyph}</span>
                    <span style={{ color: "var(--fg-secondary)" }}>
                      {cell.weight ?? "—"}
                    </span>
                  </div>
                );
              })}
            </div>
            {reminderKey && (
              <ReminderSlot
                value={reminderValue}
                placeholder={
                  lift === "S"
                    ? "SQ → BN 提醒 (例:补糖, 喝电解质)"
                    : "BN → DL 提醒 (例:补糖, 上厕所)"
                }
                onChange={(v) =>
                  onChangeReminders({ ...reminders, [reminderKey]: v })
                }
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReminderSlot({
  value,
  placeholder,
  onChange,
}: {
  value: string;
  placeholder: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(value.length > 0);
  const [text, setText] = useState(value);
  useEffect(() => {
    setText(value);
    if (value.length > 0) setOpen(true);
  }, [value]);
  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        style={{
          padding: "4px 8px",
          background: "transparent",
          border: "1px dashed var(--border)",
          borderRadius: 6,
          color: "var(--fg-tertiary)",
          fontSize: 11,
          cursor: "pointer",
          alignSelf: "flex-start",
        }}
      >
        + 提醒
      </button>
    );
  }
  return (
    <div
      style={{
        display: "flex",
        gap: 4,
        background: "var(--amber-soft)",
        border: "1px solid var(--amber)",
        borderRadius: 6,
        padding: "4px 6px",
      }}
    >
      <input
        type="text"
        value={text}
        placeholder={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => onChange(text)}
        style={{
          flex: 1,
          minWidth: 0,
          padding: "4px 6px",
          background: "transparent",
          border: "none",
          color: "var(--fg-primary)",
          fontSize: 13,
          outline: "none",
        }}
      />
      <button
        onClick={() => {
          setText("");
          onChange("");
          setOpen(false);
        }}
        title="清除提醒"
        style={{
          padding: "2px 8px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: 4,
          color: "var(--fg-tertiary)",
          fontSize: 12,
          cursor: "pointer",
        }}
      >
        ×
      </button>
    </div>
  );
}

// ─── Mobile warmup card (focus lift, with timers + coach time estimation) ───

/** Parse "1min", "2-3min", "4min" → seconds (uses upper bound for ranges). */
function parseRestSec(rest: string): number {
  const m = rest.match(/(\d+)(?:-(\d+))?\s*min/i);
  if (!m) return 60;
  const upper = m[2] ? Number(m[2]) : Number(m[1]);
  return upper * 60;
}

function formatMs(ms: number): string {
  if (ms < 0) ms = 0;
  const total = Math.ceil(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** Format ms as H:MM:SS when ≥ 1h, else M:SS (signed for past times). */
function formatHMS(ms: number): string {
  const negative = ms < 0;
  let total = Math.ceil(Math.abs(ms) / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const sign = negative ? "-" : "";
  if (h > 0) {
    return `${sign}${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  }
  return `${sign}${m}:${String(s).padStart(2, "0")}`;
}

/** Convert HH:MM (today's date) to a JS Date / unix ms. */
function hhmmToTodayMs(h: number, m: number): number {
  const d = new Date();
  d.setHours(h, m, 0, 0);
  return d.getTime();
}

function parseHHMM(s: string): { h: number; m: number } | null {
  const m = s.trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h < 0 || h >= 24 || min < 0 || min >= 60) return null;
  return { h, m: min };
}

function subMinFromHHMM(h: number, m: number, deltaMin: number): string {
  let total = h * 60 + m - deltaMin;
  total = ((total % 1440) + 1440) % 1440;
  const hh = Math.floor(total / 60);
  const mm = total % 60;
  return `${hh}:${mm.toString().padStart(2, "0")}`;
}

/** Tick state — re-renders the component every `intervalMs` ms while mounted. */
function useTick(intervalMs = 1000): number {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const id = window.setInterval(() => setTick((t) => t + 1), intervalMs);
    return () => window.clearInterval(id);
  }, [intervalMs]);
  return tick;
}

export function WarmupCard({
  lift,
  openerWeight,
  estTime,
  onChangeEstTime,
  timers,
  onChangeTimers,
}: {
  lift: Lift;
  openerWeight: number | null;
  estTime: string;
  onChangeEstTime: (v: string) => void;
  timers: Record<string, WarmupTimer>;
  onChangeTimers: (next: Record<string, WarmupTimer>) => void;
}) {
  useTick(); // re-render every second to update countdowns

  if (!openerWeight || openerWeight <= 0) return null;
  const rows = warmupForLift(openerWeight);
  const liftLabel = lift === "S" ? "深蹲" : lift === "B" ? "卧推" : "硬拉";
  const liftShort = LIFT_SHORT[lift];

  // Compute should-do-by time for each warmup row (working back from opener).
  const parsed = parseHHMM(estTime);
  // restAfter[i] = seconds the coach rests AFTER doing row i (before next set / opener).
  const restAfter = rows.map((r) => parseRestSec(r.rest));
  // Time at row i = opener_time - sum(restAfter[i..end])
  const cumulativeFromEnd: number[] = []; // minutes from each row to opener
  let acc = 0;
  for (let i = rows.length - 1; i >= 0; i--) {
    acc += restAfter[i] / 60;
    cumulativeFromEnd[i] = acc;
  }

  // Live drift: ms timestamps for opener + each row's scheduled start.
  const now = Date.now();
  const openerMs = parsed ? hhmmToTodayMs(parsed.h, parsed.m) : null;
  const rowMs: number[] = parsed
    ? cumulativeFromEnd.map((minToOpener) =>
        (openerMs as number) - minToOpener * 60 * 1000,
      )
    : [];
  const untilOpenerMs = openerMs != null ? openerMs - now : 0;

  function timerKey(rowIdx: number) {
    return `${liftShort}-${rowIdx}`;
  }

  function startTimer(rowIdx: number) {
    const next = { ...timers };
    next[timerKey(rowIdx)] = {
      startedAt: Date.now(),
      durationSec: restAfter[rowIdx],
    };
    onChangeTimers(next);
  }

  function clearTimer(rowIdx: number) {
    const next = { ...timers };
    delete next[timerKey(rowIdx)];
    onChangeTimers(next);
  }

  return (
    <div
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 12,
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 8,
        }}
      >
        <span
          className="t-mono-label"
          style={{ color: "var(--fg-tertiary)", whiteSpace: "nowrap" }}
        >
          热身 · {liftLabel} {openerWeight} kg
        </span>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 4,
            fontSize: 11,
            color: "var(--fg-tertiary)",
          }}
        >
          <span>开把估时</span>
          <input
            type="time"
            value={estTime}
            onChange={(e) => onChangeEstTime(e.target.value)}
            style={{
              width: 90,
              padding: "3px 6px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 4,
              color: "var(--fg-primary)",
              fontSize: 13,
              fontFamily: "var(--font-mono)",
              colorScheme: "dark",
            }}
          />
        </div>
      </div>
      {parsed && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            padding: "10px 12px",
            marginBottom: 8,
            background:
              untilOpenerMs < 0
                ? "var(--brand-red-soft)"
                : untilOpenerMs < 5 * 60 * 1000
                ? "var(--amber-soft)"
                : "var(--surface-2)",
            border: `1px solid ${
              untilOpenerMs < 0
                ? "var(--brand-red)"
                : untilOpenerMs < 5 * 60 * 1000
                ? "var(--amber)"
                : "var(--border)"
            }`,
            borderRadius: 8,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <span style={{ fontSize: 11, color: "var(--fg-tertiary)" }}>
              距开把
            </span>
            <span
              style={{
                fontSize: 24,
                fontWeight: 700,
                fontFamily: "var(--font-mono)",
                fontVariantNumeric: "tabular-nums",
                color:
                  untilOpenerMs < 0
                    ? "var(--brand-red)"
                    : untilOpenerMs < 5 * 60 * 1000
                    ? "var(--amber)"
                    : "var(--fg-primary)",
              }}
            >
              {untilOpenerMs >= 0
                ? formatHMS(untilOpenerMs)
                : `已过 ${formatHMS(Math.abs(untilOpenerMs))}`}
            </span>
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--fg-tertiary)",
              fontFamily: "var(--font-mono)",
              textAlign: "right",
            }}
          >
            现在{" "}
            {`${new Date(now).getHours()}:${String(new Date(now).getMinutes()).padStart(2, "0")}`}
            <br />
            开把 {estTime}
          </div>
        </div>
      )}
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 12,
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <thead>
          <tr style={{ color: "var(--fg-tertiary)", textAlign: "left" }}>
            {parsed && (
              <th style={{ padding: "3px 4px", fontWeight: 500 }}>时间</th>
            )}
            <th style={{ padding: "3px 4px", fontWeight: 500 }}>×</th>
            <th style={{ padding: "3px 4px", fontWeight: 500 }}>Load</th>
            <th style={{ padding: "3px 4px", fontWeight: 500 }}>Rest</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const k = timerKey(i);
            const t = timers[k];
            const remainingMs = t
              ? t.startedAt + t.durationSec * 1000 - Date.now()
              : 0;
            const isRunning = !!t && remainingMs > -2000; // keep showing "0:00" briefly
            const isDone = isRunning && remainingMs <= 0;
            const rowTime = parsed
              ? subMinFromHHMM(parsed.h, parsed.m, cumulativeFromEnd[i])
              : null;

            // Drift state vs current clock (parsed-only).
            // - waiting: row's scheduled start is still in the future
            // - current: now is between this row's start and the next's
            // - overdue: now is past the next row's start (or opener) and
            //   no timer has been started for this row
            type DriftState = "waiting" | "current" | "overdue" | null;
            let drift: DriftState = null;
            if (parsed && rowMs[i] != null) {
              const nextStart =
                i < rows.length - 1 ? rowMs[i + 1] : (openerMs as number);
              if (now < rowMs[i]) drift = "waiting";
              else if (now < nextStart) drift = "current";
              else drift = "overdue";
            }
            // Once the timer has been started (▶ clicked) we trust the timer
            // UI to convey progress; suppress the drift coloring on the time cell.
            const showDrift = drift !== null && !isRunning;

            const driftColor =
              drift === "current"
                ? "var(--green)"
                : drift === "overdue"
                ? "var(--brand-red)"
                : "var(--fg-secondary)";
            const driftBg =
              showDrift && drift === "current"
                ? "var(--green-soft)"
                : showDrift && drift === "overdue"
                ? "var(--brand-red-soft)"
                : "transparent";

            return (
              <tr key={i} style={{ borderTop: "1px solid var(--border)" }}>
                {parsed && (
                  <td
                    style={{
                      padding: "5px 4px",
                      color: showDrift ? driftColor : "var(--fg-secondary)",
                      background: driftBg,
                      fontWeight: showDrift && drift !== "waiting" ? 700 : 400,
                    }}
                  >
                    {rowTime}
                  </td>
                )}
                <td style={{ padding: "5px 4px" }}>{r.reps}</td>
                <td style={{ padding: "5px 4px", fontWeight: 600 }}>
                  {r.load}
                </td>
                <td style={{ padding: "5px 4px" }}>
                  <button
                    onClick={() => (isRunning ? clearTimer(i) : startTimer(i))}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      padding: "3px 6px",
                      background: isDone
                        ? "var(--brand-red-soft)"
                        : isRunning
                        ? "var(--green-soft)"
                        : "var(--surface-2)",
                      border: `1px solid ${
                        isDone
                          ? "var(--brand-red)"
                          : isRunning
                          ? "var(--green)"
                          : "var(--border)"
                      }`,
                      borderRadius: 4,
                      color: isDone
                        ? "var(--brand-red)"
                        : isRunning
                        ? "var(--green)"
                        : "var(--fg-secondary)",
                      fontSize: 11,
                      fontFamily: "var(--font-mono)",
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {isRunning ? formatMs(remainingMs) : `▶ ${r.rest}`}
                  </button>
                </td>
              </tr>
            );
          })}
          <tr
            style={{
              borderTop: "1px solid var(--border-strong)",
              background: "var(--brand-red-soft)",
            }}
          >
            {parsed && (
              <td
                style={{
                  padding: "6px 4px",
                  fontWeight: 700,
                  color: "var(--brand-red)",
                }}
              >
                {estTime}
              </td>
            )}
            <td
              style={{ padding: "6px 4px", color: "var(--brand-red)" }}
              colSpan={parsed ? 1 : 2}
            >
              开把
            </td>
            <td
              style={{
                padding: "6px 4px",
                fontWeight: 700,
                color: "var(--brand-red)",
              }}
              colSpan={parsed ? 2 : 2}
            >
              {openerWeight} kg
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ─── Top component ──────────────────────────────────────────────────

export function LiveRoute() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  // initial load
  useEffect(() => {
    (async () => {
      await maybeSeedFromUrl();
      const list = await db.athletes.toArray();
      const mineList = list.filter((a) => a.role === "mine");
      setAthletes(mineList);
      // Seed (when fired) writes a LiveSession too — so the existing session
      // is the authoritative source whether seeded or user-created.
      const existing = await db.liveSessions.get(DEFAULT_MEET_ID);
      if (existing) {
        setSession(existing);
      } else if (mineList.length > 0) {
        const first = mineList[0];
        const plan = await db.plans.get(first.id);
        const fresh: LiveSession = {
          meetId: DEFAULT_MEET_ID,
          myAthleteId: first.id,
          mine: planToTrio(plan),
          rivals: [],
          focus: { lift: "S", attempt: 1 },
          updatedAt: new Date().toISOString(),
        };
        setSession(fresh);
      }
      setLoaded(true);
    })();
  }, []);

  // debounced save
  useEffect(() => {
    if (!session) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await db.liveSessions.put({
        ...session,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [session]);

  const myAthlete = useMemo(
    () => athletes.find((a) => a.id === session?.myAthleteId) ?? null,
    [athletes, session?.myAthleteId],
  );

  async function switchMyAthlete(id: string) {
    if (!session) return;
    const plan = await db.plans.get(id);
    setSession({
      ...session,
      myAthleteId: id,
      mine: planToTrio(plan),
    });
  }

  /** Re-pull A1.opener / A2.mid / A3.mid from the latest /plan, but keep
   *  the user's existing status (made/missed/pending) on each slot. */
  async function syncFromPlan() {
    if (!session || !myAthlete) return;
    const plan = await db.plans.get(myAthlete.id);
    if (!plan) return;
    const fresh = planToTrio(plan);
    const overlay = (
      cur: LiveLiftRow,
      next: LiveLiftRow,
    ): LiveLiftRow =>
      [
        { weight: next[0].weight, alts: next[0].alts, status: cur[0].status },
        { weight: next[1].weight, alts: next[1].alts, status: cur[1].status },
        { weight: next[2].weight, alts: next[2].alts, status: cur[2].status },
      ] as LiveLiftRow;
    setSession({
      ...session,
      mine: {
        squat: overlay(session.mine.squat, fresh.squat),
        bench: overlay(session.mine.bench, fresh.bench),
        dead: overlay(session.mine.dead, fresh.dead),
      },
    });
  }

  function addRival() {
    if (!session) return;
    const r = newRival();
    if (myAthlete) {
      // Inherit class from me as a sensible starting point
      r.weightClass = myAthlete.weightClass;
      r.bodyweight = myAthlete.bodyweight;
      r.sex = myAthlete.sex;
      r.equipment = myAthlete.equipment;
    }
    setSession({ ...session, rivals: [...session.rivals, r] });
  }

  function updateRival(id: string, next: LiveAthleteState) {
    if (!session) return;
    setSession({
      ...session,
      rivals: session.rivals.map((r) => (r.id === id ? next : r)),
    });
  }

  function deleteRival(id: string) {
    if (!session) return;
    setSession({
      ...session,
      rivals: session.rivals.filter((r) => r.id !== id),
    });
  }

  if (!loaded) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--fg-tertiary)",
          minHeight: "100vh",
          background: "var(--bg)",
        }}
      >
        加载中…
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: 24,
          color: "var(--fg-primary)",
        }}
      >
        <div
          style={{
            padding: 24,
            border: "1px dashed var(--border-strong)",
            borderRadius: 12,
            textAlign: "center",
          }}
        >
          <div className="t-headline" style={{ marginBottom: 8 }}>
            还没有"我的运动员"
          </div>
          <div style={{ color: "var(--fg-tertiary)", fontSize: 13, marginBottom: 16 }}>
            先在桌面端 <a href="/plan" style={{ color: "var(--brand-red)" }}>/plan</a> 创建运动员
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg-primary)",
      }}
    >
      <header
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div
            style={{
              width: 32,
              height: 32,
              background: "var(--brand-red)",
              borderRadius: 6,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display-cn)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 15,
            }}
          >
            M
          </div>
          <div>
            <div className="t-body-emph">现场反超</div>
            <div className="t-footnote">手机端 · 自动保存</div>
          </div>
        </div>
        <a
          href="/plan"
          style={{
            padding: "6px 10px",
            background: "var(--surface-2)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            color: "var(--fg-primary)",
            fontSize: 12,
            textDecoration: "none",
          }}
        >
          → /plan
        </a>
      </header>

      <main
        style={{
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {session && myAthlete && (() => {
          // Auto-derived focus = next pending attempt across all 9 cells.
          // Falls back to SQ A1 when meet is fully done so reverse-calc has
          // a sensible (non-null) target if the user re-opens missed lifts.
          const derivedNext = nextPending(session.mine);
          const derivedFocus = derivedNext ?? { lift: "S" as Lift, attempt: 1 as AttemptNumber };
          return (
          <>
            <MyAthletePicker
              athletes={athletes}
              activeId={session.myAthleteId}
              onSelect={switchMyAthlete}
            />

            <ProgressTracker
              mine={session.mine}
              next={derivedNext}
              reminders={session.reminders ?? {}}
              onChangeReminders={(r) => setSession({ ...session, reminders: r })}
              warmupDone={session.warmupDone}
            />


            {/* My card */}
            <section
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--brand-red)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                flexDirection: "column",
                gap: 10,
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <AthleteIdentity
                  state={{
                    name: myAthlete.name,
                    sex: myAthlete.sex,
                    bodyweight: myAthlete.bodyweight,
                    weightClass: myAthlete.weightClass,
                    equipment: myAthlete.equipment,
                  }}
                  editable={false}
                />
                <div
                  style={{
                    display: "flex",
                    gap: 6,
                    alignItems: "center",
                    flexShrink: 0,
                  }}
                >
                  <button
                    onClick={syncFromPlan}
                    title="从 /plan 重新拉开把 + A2/A3,保留 ✓/✗ 状态"
                    style={{
                      padding: "4px 8px",
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 6,
                      color: "var(--fg-secondary)",
                      fontSize: 11,
                      cursor: "pointer",
                      whiteSpace: "nowrap",
                    }}
                  >
                    ↻ 同步规划
                  </button>
                  <span
                    className="t-mono-label"
                    style={{ color: "var(--brand-red)", fontSize: 10 }}
                  >
                    ME
                  </span>
                </div>
              </div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "auto 1fr",
                  columnGap: 10,
                  rowGap: 2,
                  fontSize: 12,
                  color: "var(--fg-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                <span style={{ color: "var(--fg-tertiary)" }}>已确认</span>
                <span>
                  <strong style={{ color: "var(--fg-primary)" }}>
                    {confirmedTotal(session.mine)} kg
                  </strong>
                  {" · GL "}
                  {ipfGLPoints(
                    confirmedTotal(session.mine),
                    myAthlete.bodyweight,
                    myAthlete.sex,
                    myAthlete.equipment,
                    myAthlete.event,
                  ).toFixed(2)}
                </span>
                <span style={{ color: "var(--fg-tertiary)" }}>预设</span>
                <span>
                  <strong style={{ color: "var(--fg-primary)" }}>
                    {projectedTotal(session.mine)} kg
                  </strong>
                  {" · GL "}
                  {ipfGLPoints(
                    projectedTotal(session.mine),
                    myAthlete.bodyweight,
                    myAthlete.sex,
                    myAthlete.equipment,
                    myAthlete.event,
                  ).toFixed(2)}
                </span>
              </div>
              <AttemptGrid
                trio={session.mine}
                onChange={(next) => setSession({ ...session, mine: next })}
                focusAttempt={derivedNext}
                multiGuessLifts={["S", "B", "D"]}
                multiGuessMode={{ S: "cycle", B: "cycle", D: "stack" }}
                allowAddRemove={false}
              />
            </section>

            {/* Rivals */}
            {session.rivals.map((r) => (
              <RivalCard
                key={r.id}
                myAthlete={myAthlete}
                myTrio={session.mine}
                rival={r}
                focus={derivedFocus}
                onChange={(next) => updateRival(r.id, next)}
                onDelete={() => deleteRival(r.id)}
              />
            ))}

            <button
              onClick={addRival}
              style={{
                padding: "12px",
                background: "var(--surface-2)",
                border: "1px dashed var(--border-strong)",
                borderRadius: 8,
                color: "var(--fg-secondary)",
                fontSize: 14,
                cursor: "pointer",
              }}
            >
              + 加对手
            </button>
          </>
          );
        })()}
      </main>
    </div>
  );
}
