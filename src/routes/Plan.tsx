/**
 * Desktop pre-meet planner.
 *
 * For each athlete: 3 lifts × 3 attempts × 3 scenarios (low/mid/hi) +
 * Notes column + auto-warmup table per lift.
 *
 * Mirrors the "Gameday Sheet" Excel pattern (Jason variant). Coach picks
 * exactly one tier of A1 as the actual opener — that opener weight feeds
 * the 6-step warmup ramp.
 */
import { useEffect, useMemo, useState } from "react";
import { db } from "../db";
import type {
  Athlete,
  AttemptCell,
  LiftPlan,
  Plan,
  Tier,
  TierCells,
  WarmupRowOverride,
} from "../types";
import QRCode from "qrcode";
import { warmupForLift } from "../lib/warmup";
import { ipfGLPoints } from "../lib/ranking";
import { maybeSeedFromUrl } from "../lib/seed";
import { encodeShare } from "../lib/share";
import { usePersistDebounced } from "../lib/usePersistDebounced";

const ATTEMPTS = [1, 2, 3] as const;
const TIERS: Tier[] = ["low", "mid", "hi"];
const TIER_LABEL: Record<Tier, string> = { low: "low", mid: "mid", hi: "high" };
/** IPF Open weight classes. */
const IPF_CLASSES_M = ["53", "59", "66", "74", "83", "93", "105", "120", "120+"];
const IPF_CLASSES_F = ["43", "47", "52", "57", "63", "69", "76", "84", "84+"];
const DEFAULT_MEET_ID = "default-meet";

function emptyCell(): AttemptCell {
  return { weight: null, note: "" };
}
function emptyTierCells(): TierCells {
  return { low: emptyCell(), mid: emptyCell(), hi: emptyCell() };
}
function emptyLiftPlan(): LiftPlan {
  return {
    a1: emptyTierCells(),
    a2: emptyTierCells(),
    a3: emptyTierCells(),
    openerTier: null,
  };
}
function emptyPlan(athleteId: string): Plan {
  return {
    athleteId,
    meetId: DEFAULT_MEET_ID,
    squat: emptyLiftPlan(),
    bench: emptyLiftPlan(),
    dead: emptyLiftPlan(),
    updatedAt: new Date().toISOString(),
  };
}
function newAthlete(): Athlete {
  return {
    id: `a_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`,
    meetId: DEFAULT_MEET_ID,
    name: "",
    sex: "M",
    birthYear: 2000,
    bodyweight: 80,
    weightClass: "83",
    division: "Open",
    equipment: "Raw",
    event: "SBD",
    role: "mine",
  };
}

function attemptKey(n: 1 | 2 | 3): "a1" | "a2" | "a3" {
  return (`a${n}` as "a1" | "a2" | "a3");
}

function bestOpener(plan: LiftPlan): number | null {
  if (!plan.openerTier) return null;
  const w = plan.a1[plan.openerTier].weight;
  return w && w > 0 ? w : null;
}

function bestHi(plan: LiftPlan): number | null {
  // For projected total: best confirmed-or-planned weight. Fall back chain.
  return (
    plan.a3.hi.weight ?? plan.a2.hi.weight ?? plan.a1.hi.weight ?? null
  );
}

// ─── Inputs ─────────────────────────────────────────────────────────

function NumInput({
  value,
  onChange,
  placeholder,
  width = 70,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
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
      placeholder={placeholder}
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
        padding: "6px 8px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--fg-primary)",
        fontSize: 14,
        textAlign: "right",
      }}
    />
  );
}

function NoteInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <input
      type="text"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      style={{
        flex: 1,
        padding: "6px 10px",
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 6,
        color: "var(--fg-primary)",
        fontSize: 13,
      }}
    />
  );
}

// ─── Lift section ───────────────────────────────────────────────────

function WarmupCell({
  value,
  onChange,
  width = 60,
  align = "right",
  fontWeight = 600,
  color,
  formatter,
  parser,
}: {
  value: string;
  onChange: (next: string) => void;
  width?: number;
  align?: "left" | "right" | "center";
  fontWeight?: number;
  color?: string;
  formatter?: (s: string) => string;
  parser?: (s: string) => string;
}) {
  const [text, setText] = useState(value);
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    setText(value);
  }, [value]);
  return (
    <input
      type="text"
      value={text}
      onChange={(e) => setText(e.target.value)}
      onFocus={() => setFocused(true)}
      onBlur={() => {
        setFocused(false);
        const parsed = parser ? parser(text) : text;
        onChange(parsed);
        setText(formatter ? formatter(parsed) : parsed);
      }}
      style={{
        width,
        padding: "2px 4px",
        background: "transparent",
        border: "none",
        borderBottom: `1px solid ${focused ? "var(--brand-red)" : "transparent"}`,
        borderRadius: 0,
        color: color ?? "var(--fg-primary)",
        fontSize: 13,
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        textAlign: align,
        fontWeight,
        outline: "none",
      }}
    />
  );
}

function WarmupTable({
  openerWeight,
  overrides,
  rowCount,
  onChangeOverrides,
  onChangeRowCount,
}: {
  openerWeight: number | null;
  overrides?: (WarmupRowOverride | null)[];
  rowCount?: number;
  onChangeOverrides: (next: (WarmupRowOverride | null)[]) => void;
  onChangeRowCount: (next: number) => void;
}) {
  const effectiveRowCount = rowCount ?? 6;
  const rows = openerWeight
    ? warmupForLift(openerWeight, { overrides, rowCount: effectiveRowCount })
    : [];
  if (!openerWeight) {
    return (
      <div
        style={{
          padding: 14,
          background: "var(--surface-2)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 8,
          color: "var(--fg-tertiary)",
          fontSize: 13,
        }}
      >
        在 A1 选一个开把档,自动算出热身。
      </div>
    );
  }

  function patchRow(i: number, patch: WarmupRowOverride) {
    const next = [...(overrides ?? [])];
    while (next.length < effectiveRowCount) next.push(null);
    next[i] = { ...(next[i] ?? {}), ...patch };
    onChangeOverrides(next);
  }
  function deleteRow(i: number) {
    const next = [...(overrides ?? [])];
    while (next.length < effectiveRowCount) next.push(null);
    next.splice(i, 1);
    onChangeOverrides(next);
    onChangeRowCount(effectiveRowCount - 1);
  }
  function appendRow() {
    onChangeRowCount(effectiveRowCount + 1);
  }
  const hasOverrides = (overrides ?? []).some(
    (o) => o && Object.values(o).some((v) => v !== undefined),
  );

  return (
    <div
      style={{
        background: "var(--surface-2)",
        border: "1px solid var(--border)",
        borderRadius: 8,
        padding: "10px 14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          className="t-mono-label"
          style={{ color: "var(--fg-tertiary)" }}
        >
          Warmup · 基准 {openerWeight} kg
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {(hasOverrides || effectiveRowCount !== 6) && (
            <button
              onClick={() => {
                onChangeOverrides([]);
                onChangeRowCount(6);
              }}
              title="重算:清除所有手动覆盖 + 行数,回到公式默认 6 行"
              style={{
                padding: "2px 8px",
                background: "transparent",
                border: "1px solid var(--border)",
                borderRadius: 4,
                color: "var(--fg-secondary)",
                fontSize: 11,
                cursor: "pointer",
              }}
            >
              ↻ 重算
            </button>
          )}
        </div>
      </div>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          fontSize: 13,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        <thead>
          <tr style={{ color: "var(--fg-tertiary)", textAlign: "left" }}>
            <th style={{ padding: "4px 6px", fontWeight: 500 }}>Est Eff%</th>
            <th style={{ padding: "4px 6px", fontWeight: 500 }}>Reps</th>
            <th style={{ padding: "4px 6px", fontWeight: 500 }}>Load</th>
            <th style={{ padding: "4px 6px", fontWeight: 500 }}>Jump</th>
            <th style={{ padding: "4px 6px", fontWeight: 500 }}>Rest</th>
            <th style={{ padding: "4px 6px", fontWeight: 500, width: 24 }} />
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr
              key={i}
              style={{ borderTop: "1px solid var(--border)" }}
            >
              <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 1,
                  }}
                >
                  <WarmupCell
                    value={(r.estEffPct * 100).toFixed(2)}
                    onChange={(v) => {
                      const n = Number(v);
                      if (!Number.isNaN(n) && n > 0)
                        patchRow(i, { estEffPct: n / 100 });
                    }}
                    width={56}
                    align="right"
                    fontWeight={500}
                    color="var(--fg-secondary)"
                    formatter={(s) => Number(s).toFixed(2)}
                  />
                  <span style={{ color: "var(--fg-tertiary)", fontSize: 12 }}>
                    %
                  </span>
                </span>
              </td>
              <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>
                <WarmupCell
                  value={String(r.reps)}
                  onChange={(v) => {
                    const n = Number(v);
                    if (!Number.isNaN(n) && n > 0)
                      patchRow(i, { reps: Math.round(n) });
                  }}
                  width={28}
                  align="center"
                />
              </td>
              <td
                style={{
                  padding: "5px 6px",
                  fontWeight: 600,
                  whiteSpace: "nowrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 2,
                  }}
                >
                  <WarmupCell
                    value={String(r.load)}
                    onChange={(v) => {
                      const n = Number(v);
                      if (!Number.isNaN(n) && n > 0)
                        patchRow(i, { load: n });
                    }}
                    width={48}
                    align="right"
                  />
                  <span style={{ color: "var(--fg-tertiary)", fontSize: 12 }}>
                    kg
                  </span>
                </span>
              </td>
              <td
                style={{
                  padding: "5px 6px",
                  whiteSpace: "nowrap",
                  color:
                    r.jump != null
                      ? r.jump >= 0
                        ? "var(--green)"
                        : "var(--brand-red)"
                      : "var(--fg-tertiary)",
                }}
              >
                {r.jump != null
                  ? r.jump >= 0
                    ? `+${r.jump}`
                    : `${r.jump}`
                  : "—"}
              </td>
              <td style={{ padding: "5px 6px", whiteSpace: "nowrap" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    gap: 2,
                  }}
                >
                  <WarmupCell
                    value={r.rest.replace(/\s*min\s*$/i, "")}
                    onChange={(v) => {
                      const trimmed = v.trim();
                      if (trimmed === "") return;
                      patchRow(i, { rest: `${trimmed}min` });
                    }}
                    width={42}
                    align="right"
                    color="var(--fg-primary)"
                  />
                  <span style={{ color: "var(--fg-tertiary)", fontSize: 12 }}>
                    min
                  </span>
                </span>
              </td>
              <td style={{ padding: "5px 6px", textAlign: "center" }}>
                {rows.length > 1 && (
                  <button
                    onClick={() => deleteRow(i)}
                    title="删除此行"
                    style={{
                      width: 18,
                      height: 18,
                      padding: 0,
                      background: "var(--surface-2)",
                      border: "1px solid var(--border)",
                      borderRadius: 9,
                      color: "var(--fg-tertiary)",
                      fontSize: 11,
                      lineHeight: 1,
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                )}
              </td>
            </tr>
          ))}
          <tr style={{ borderTop: "1px solid var(--border)" }}>
            <td colSpan={6} style={{ padding: "6px 6px" }}>
              <button
                onClick={appendRow}
                style={{
                  padding: "4px 10px",
                  background: "transparent",
                  border: "1px dashed var(--border-strong)",
                  borderRadius: 6,
                  color: "var(--fg-secondary)",
                  fontSize: 12,
                  cursor: "pointer",
                  width: "100%",
                }}
              >
                + 加一行
              </button>
            </td>
          </tr>
          <tr
            style={{
              borderTop: "1px solid var(--border-strong)",
              background: "var(--brand-red-soft)",
            }}
          >
            <td colSpan={2} style={{ padding: "8px 6px", color: "var(--brand-red)" }}>
              → 开把
            </td>
            <td style={{ padding: "8px 6px", fontWeight: 700, color: "var(--brand-red)" }}>
              {openerWeight} kg
            </td>
            <td colSpan={3} />
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function LiftSection({
  liftLabel,
  plan,
  onChange,
}: {
  liftLabel: string;
  plan: LiftPlan;
  onChange: (next: LiftPlan) => void;
}) {
  const opener = bestOpener(plan);

  function updateCell(
    a: 1 | 2 | 3,
    tier: Tier,
    next: AttemptCell,
  ) {
    const ak = attemptKey(a);
    onChange({
      ...plan,
      [ak]: { ...plan[ak], [tier]: next },
    });
  }
  function setOpenerTier(t: Tier | null) {
    onChange({ ...plan, openerTier: t });
  }

  return (
    <section
      style={{
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
        padding: 20,
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 360px",
        gap: 20,
      }}
    >
      <div>
        <div
          className="eyebrow"
          style={{ marginBottom: 14 }}
        >
          <span className="eyebrow-text">{liftLabel}</span>
          <span className="eyebrow-rule" />
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns:
              "60px 70px 90px 1fr",
            columnGap: 8,
            rowGap: 6,
            alignItems: "center",
            fontSize: 13,
            color: "var(--fg-tertiary)",
          }}
        >
          <span />
          <span style={{ textAlign: "center" }}>开把?</span>
          <span style={{ textAlign: "right" }}>重量 (kg)</span>
          <span style={{ paddingLeft: 4 }}>Notes</span>
          {ATTEMPTS.map((a) =>
            TIERS.map((t, ti) => {
              const ak = attemptKey(a);
              const cell = plan[ak][t];
              const isA1 = a === 1;
              const isOpener = isA1 && plan.openerTier === t;
              return (
                <div
                  key={`${a}-${t}`}
                  style={{
                    display: "contents",
                  }}
                >
                  {/* col 1: attempt label only on first tier of each attempt */}
                  <span
                    style={{
                      color:
                        ti === 0 ? "var(--fg-secondary)" : "transparent",
                      fontWeight: 600,
                      fontSize: 14,
                    }}
                  >
                    {ti === 0 ? `A${a}` : "·"}
                  </span>
                  {/* col 2: tier radio (A1 only) */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      justifyContent: "center",
                    }}
                  >
                    {isA1 ? (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          cursor: "pointer",
                          color: isOpener ? "var(--brand-red)" : "var(--fg-tertiary)",
                          fontSize: 12,
                          fontWeight: isOpener ? 600 : 400,
                        }}
                      >
                        <input
                          type="radio"
                          name={`opener-${liftLabel}`}
                          checked={isOpener}
                          onChange={() => setOpenerTier(t)}
                          style={{ accentColor: "var(--brand-red)" }}
                        />
                        {TIER_LABEL[t]}
                      </label>
                    ) : (
                      <span
                        style={{
                          color: "var(--fg-tertiary)",
                          fontSize: 12,
                        }}
                      >
                        {TIER_LABEL[t]}
                      </span>
                    )}
                  </div>
                  {/* col 3: weight input */}
                  <NumInput
                    value={cell.weight}
                    onChange={(w) => updateCell(a, t, { ...cell, weight: w })}
                    width={84}
                  />
                  {/* col 4: notes */}
                  <NoteInput
                    value={cell.note}
                    onChange={(n) => updateCell(a, t, { ...cell, note: n })}
                    placeholder={
                      isA1
                        ? t === "hi"
                          ? "高标开"
                          : t === "mid"
                          ? "一般情况"
                          : "状态差时开"
                        : a === 2
                        ? "如果 #1 RPE …"
                        : "必中 RPE 8.5-9"
                    }
                  />
                </div>
              );
            }),
          )}
        </div>
        {plan.openerTier && (
          <button
            onClick={() => setOpenerTier(null)}
            style={{
              marginTop: 10,
              fontSize: 12,
              padding: "4px 10px",
              background: "transparent",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--fg-tertiary)",
              cursor: "pointer",
            }}
          >
            清除开把选择
          </button>
        )}
      </div>
      <WarmupTable
        openerWeight={opener}
        overrides={plan.warmupOverrides}
        rowCount={plan.warmupRowCount}
        onChangeOverrides={(next) => onChange({ ...plan, warmupOverrides: next })}
        onChangeRowCount={(n) => onChange({ ...plan, warmupRowCount: n })}
      />
    </section>
  );
}

// ─── Athlete form ───────────────────────────────────────────────────

function AthleteForm({
  athlete,
  onChange,
}: {
  athlete: Athlete;
  onChange: (a: Athlete) => void;
}) {
  // Local text states so "82." mid-typing doesn't get nuked by re-render.
  // Component remounts (via parent key) when athlete switches, so no sync needed.
  const [bwText, setBwText] = useState(String(athlete.bodyweight));
  const [byText, setByText] = useState(String(athlete.birthYear));
  const fieldStyle = {
    padding: "6px 10px",
    background: "var(--surface-2)",
    border: "1px solid var(--border)",
    borderRadius: 6,
    color: "var(--fg-primary)",
    fontSize: 14,
  };
  const classOptions =
    athlete.sex === "M" ? IPF_CLASSES_M : IPF_CLASSES_F;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "2fr 1fr 1fr 1fr 1fr 1fr 1.5fr",
        gap: 8,
        alignItems: "center",
        padding: 16,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <input
        type="text"
        value={athlete.name}
        onChange={(e) => onChange({ ...athlete, name: e.target.value })}
        placeholder="姓名"
        style={{ ...fieldStyle, fontWeight: 600 }}
      />
      <select
        value={athlete.sex}
        onChange={(e) =>
          onChange({ ...athlete, sex: e.target.value as Athlete["sex"] })
        }
        style={fieldStyle}
      >
        <option value="M">男</option>
        <option value="F">女</option>
      </select>
      <input
        className="mc-num-input"
        type="text"
        inputMode="numeric"
        value={byText}
        onChange={(e) => {
          const t = e.target.value;
          setByText(t);
          if (t === "") return;
          const n = Number(t);
          if (!Number.isNaN(n)) onChange({ ...athlete, birthYear: n || 2000 });
        }}
        placeholder="出生年"
        style={fieldStyle}
      />
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
          if (!Number.isNaN(n)) onChange({ ...athlete, bodyweight: n });
        }}
        placeholder="体重 (kg)"
        style={fieldStyle}
      />
      <select
        value={athlete.weightClass}
        onChange={(e) =>
          onChange({ ...athlete, weightClass: e.target.value })
        }
        style={fieldStyle}
        title="IPF 级别"
      >
        {classOptions.map((c) => (
          <option key={c} value={c}>
            {c}kg
          </option>
        ))}
        {!classOptions.includes(athlete.weightClass) && athlete.weightClass && (
          <option value={athlete.weightClass}>{athlete.weightClass}</option>
        )}
      </select>
      <select
        value={athlete.division}
        onChange={(e) =>
          onChange({
            ...athlete,
            division: e.target.value as Athlete["division"],
          })
        }
        style={fieldStyle}
      >
        <option value="Open">Open</option>
        <option value="Junior">Junior</option>
        <option value="Sub-Junior">Sub-Junior</option>
        <option value="Master1">Master1</option>
        <option value="Master2">Master2</option>
        <option value="Master3">Master3</option>
      </select>
      <input
        type="text"
        value={athlete.team ?? ""}
        onChange={(e) => onChange({ ...athlete, team: e.target.value })}
        placeholder="队伍 (可选)"
        style={fieldStyle}
      />
    </div>
  );
}

// ─── Footer total ───────────────────────────────────────────────────

function Footer({
  athlete,
  plan,
}: {
  athlete: Athlete;
  plan: Plan;
}) {
  const openerS = bestOpener(plan.squat) ?? 0;
  const openerB = bestOpener(plan.bench) ?? 0;
  const openerD = bestOpener(plan.dead) ?? 0;
  const openerTotal = openerS + openerB + openerD;
  const hiS = bestHi(plan.squat) ?? 0;
  const hiB = bestHi(plan.bench) ?? 0;
  const hiD = bestHi(plan.dead) ?? 0;
  const hiTotal = hiS + hiB + hiD;
  const gl =
    hiTotal > 0
      ? ipfGLPoints(
          hiTotal,
          athlete.bodyweight,
          athlete.sex,
          athlete.equipment,
          athlete.event,
        )
      : 0;
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr 1fr",
        gap: 16,
        padding: 20,
        background: "var(--surface-1)",
        border: "1px solid var(--border)",
        borderRadius: 12,
      }}
    >
      <Stat
        label="开把 Total"
        value={openerTotal > 0 ? `${openerTotal} kg` : "—"}
        sub={
          openerTotal > 0
            ? `${openerS} + ${openerB} + ${openerD}`
            : "需要在每个动作选开把"
        }
      />
      <Stat
        label="高标 Total"
        value={hiTotal > 0 ? `${hiTotal} kg` : "—"}
        sub={hiTotal > 0 ? `${hiS} + ${hiB} + ${hiD}` : "需填 A3·hi"}
      />
      <Stat
        label="IPF GL (高标)"
        value={gl > 0 ? gl.toFixed(2) : "—"}
        sub={
          athlete.bodyweight > 0
            ? `BW ${athlete.bodyweight} · ${athlete.sex} · ${athlete.equipment}`
            : "填体重才算 GL"
        }
      />
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div>
      <div className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
        {label}
      </div>
      <div
        className="t-tabular"
        style={{
          fontSize: 28,
          fontWeight: 700,
          marginTop: 4,
          fontFamily: "var(--font-mono)",
        }}
      >
        {value}
      </div>
      {sub && (
        <div
          style={{
            color: "var(--fg-tertiary)",
            fontSize: 12,
            marginTop: 2,
          }}
        >
          {sub}
        </div>
      )}
    </div>
  );
}

// ─── Athlete tabs ───────────────────────────────────────────────────

function AthleteTabs({
  athletes,
  activeId,
  onSelect,
  onAdd,
  onDelete,
}: {
  athletes: Athlete[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onAdd: () => void;
  onDelete: (id: string) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        flexWrap: "wrap",
      }}
    >
      {athletes.map((a) => {
        const active = a.id === activeId;
        return (
          <div
            key={a.id}
            style={{
              display: "flex",
              alignItems: "center",
              background: active ? "var(--brand-red)" : "var(--surface-2)",
              border: `1px solid ${
                active ? "var(--brand-red)" : "var(--border)"
              }`,
              borderRadius: 8,
              overflow: "hidden",
            }}
          >
            <button
              onClick={() => onSelect(a.id)}
              style={{
                padding: "8px 14px",
                background: "transparent",
                border: "none",
                color: active ? "#fff" : "var(--fg-primary)",
                fontSize: 14,
                fontWeight: active ? 600 : 500,
                cursor: "pointer",
              }}
            >
              {a.name || "(未命名)"}
            </button>
            <button
              onClick={() => {
                if (confirm(`删除 ${a.name || "(未命名)"} 及其计划?`)) {
                  onDelete(a.id);
                }
              }}
              title="删除"
              style={{
                padding: "8px 10px",
                background: "transparent",
                border: "none",
                borderLeft: `1px solid ${
                  active ? "rgba(255,255,255,0.3)" : "var(--border)"
                }`,
                color: active ? "#fff" : "var(--fg-tertiary)",
                fontSize: 12,
                cursor: "pointer",
              }}
            >
              ×
            </button>
          </div>
        );
      })}
      <button
        onClick={onAdd}
        style={{
          padding: "8px 14px",
          background: "var(--surface-2)",
          border: "1px dashed var(--border-strong)",
          borderRadius: 8,
          color: "var(--fg-secondary)",
          fontSize: 14,
          cursor: "pointer",
        }}
      >
        + 新建运动员
      </button>
    </div>
  );
}

// ─── Share modal: encode athlete + plan into a QR code URL ─────────

function ShareModal({
  athlete,
  plan,
  onClose,
}: {
  athlete: Athlete;
  plan: Plan;
  onClose: () => void;
}) {
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const url = useMemo(() => {
    const code = encodeShare({ v: 1, athlete, plan });
    return `${window.location.origin}/?import=${code}`;
  }, [athlete, plan]);
  useEffect(() => {
    // Big raster + L error-correction so the dense ~2KB URL still scans
    // reliably from a phone camera. M would shrink each dot below the
    // identifiable threshold on a typical desktop monitor.
    QRCode.toDataURL(url, { width: 720, margin: 2, errorCorrectionLevel: "L" }).then(
      setQrDataUrl,
    );
  }, [url]);
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.7)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 100,
        padding: 20,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          padding: 24,
          maxWidth: 560,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 16,
          alignItems: "center",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%" }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: "var(--fg-primary)" }}>
            分享到手机
          </span>
          <button
            onClick={onClose}
            style={{
              padding: "4px 10px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--fg-secondary)",
              cursor: "pointer",
            }}
          >
            关闭
          </button>
        </div>
        <div style={{ fontSize: 13, color: "var(--fg-secondary)", textAlign: "center" }}>
          手机相机扫码 → Safari 打开 → 自动写入数据 → 跳转 /live
        </div>
        {qrDataUrl ? (
          <img
            src={qrDataUrl}
            alt="QR code"
            style={{
              width: "100%",
              maxWidth: 480,
              height: "auto",
              aspectRatio: "1 / 1",
              background: "#fff",
              padding: 12,
              borderRadius: 8,
              boxSizing: "border-box",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              maxWidth: 480,
              aspectRatio: "1 / 1",
              background: "var(--surface-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--fg-tertiary)",
            }}
          >
            生成中…
          </div>
        )}
        <div style={{ display: "flex", gap: 8, width: "100%" }}>
          <input
            readOnly
            value={url}
            onClick={(e) => (e.target as HTMLInputElement).select()}
            className="mc-num-input"
            style={{
              flex: 1,
              padding: "8px 10px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              color: "var(--fg-secondary)",
              fontSize: 11,
              fontFamily: "var(--font-mono)",
            }}
          />
          <button
            onClick={async () => {
              await navigator.clipboard.writeText(url);
              setCopied(true);
              setTimeout(() => setCopied(false), 1800);
            }}
            style={{
              padding: "8px 14px",
              background: copied ? "var(--green)" : "var(--surface-2)",
              border: `1px solid ${copied ? "var(--green)" : "var(--border)"}`,
              borderRadius: 6,
              color: copied ? "#fff" : "var(--fg-primary)",
              fontSize: 13,
              cursor: "pointer",
              fontWeight: 600,
              minWidth: 70,
            }}
          >
            {copied ? "已复制" : "复制"}
          </button>
        </div>
        <div style={{ fontSize: 11, color: "var(--fg-tertiary)", textAlign: "center" }}>
          数据在 URL 内,无后端、不上云。改动后再点一次重新生成。
        </div>
      </div>
    </div>
  );
}

// ─── Top component ──────────────────────────────────────────────────

export function PlanRoute() {
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  // initial load
  useEffect(() => {
    (async () => {
      const seededId = await maybeSeedFromUrl();
      const list = await db.athletes.toArray();
      setAthletes(list);
      if (seededId) {
        setActiveId(seededId);
      } else if (list.length > 0) {
        setActiveId(list[0].id);
      }
      setLoaded(true);
    })();
  }, []);

  // load plan when active athlete changes
  useEffect(() => {
    if (!activeId) {
      setPlan(null);
      return;
    }
    (async () => {
      const existing = await db.plans.get(activeId);
      setPlan(existing ?? emptyPlan(activeId));
    })();
  }, [activeId]);

  // Debounced save of plan; flushes pending edits on unmount/pagehide
  // so a value typed within 500ms of a route or athlete switch isn't lost.
  usePersistDebounced(plan, async (p) => {
    await db.plans.put({ ...p, updatedAt: new Date().toISOString() });
  });

  const activeAthlete = useMemo(
    () => athletes.find((a) => a.id === activeId) ?? null,
    [athletes, activeId],
  );

  async function addAthlete() {
    const a = newAthlete();
    await db.athletes.put(a);
    setAthletes((prev) => [...prev, a]);
    setActiveId(a.id);
  }

  async function deleteAthlete(id: string) {
    await db.athletes.delete(id);
    await db.plans.delete(id);
    setAthletes((prev) => prev.filter((a) => a.id !== id));
    if (activeId === id) {
      const remaining = athletes.filter((a) => a.id !== id);
      setActiveId(remaining[0]?.id ?? null);
    }
  }

  function updateAthlete(next: Athlete) {
    setAthletes((prev) =>
      prev.map((a) => (a.id === next.id ? next : a)),
    );
    void db.athletes.put(next);
  }

  function updateLift(key: "squat" | "bench" | "dead", next: LiftPlan) {
    if (!plan) return;
    setPlan({ ...plan, [key]: next });
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg-primary)",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "20px 32px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 36,
              height: 36,
              background: "var(--brand-red)",
              borderRadius: 8,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: "var(--font-display-cn)",
              color: "#fff",
              fontWeight: 800,
              fontSize: 18,
            }}
          >
            M
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span className="t-headline">MeetCard · 赛前规划</span>
            <span
              className="t-footnote"
              style={{ color: "var(--fg-tertiary)" }}
            >
              桌面端 · 自动保存
            </span>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              if (!activeAthlete || !plan) return;
              setShareOpen(true);
            }}
            disabled={!activeAthlete || !plan}
            style={{
              padding: "8px 14px",
              background: "var(--brand-red)",
              border: "1px solid var(--brand-red)",
              borderRadius: 8,
              color: "#fff",
              fontSize: 14,
              fontWeight: 600,
              cursor: activeAthlete && plan ? "pointer" : "not-allowed",
              opacity: activeAthlete && plan ? 1 : 0.5,
            }}
          >
            分享到手机
          </button>
          <a
            href="/live"
            style={{
              padding: "8px 14px",
              background: "var(--surface-2)",
              border: "1px solid var(--border)",
              borderRadius: 8,
              color: "var(--fg-primary)",
              fontSize: 14,
              textDecoration: "none",
            }}
          >
            → /live (手机端)
          </a>
        </div>
      </header>
      {shareOpen && activeAthlete && plan && (
        <ShareModal
          athlete={activeAthlete}
          plan={plan}
          onClose={() => setShareOpen(false)}
        />
      )}

      <main
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          padding: "24px 32px 80px",
          display: "flex",
          flexDirection: "column",
          gap: 16,
        }}
      >
        {!loaded ? (
          <div style={{ color: "var(--fg-tertiary)" }}>加载中…</div>
        ) : athletes.length === 0 ? (
          <div
            style={{
              padding: 40,
              textAlign: "center",
              border: "1px dashed var(--border-strong)",
              borderRadius: 12,
            }}
          >
            <div
              className="t-headline"
              style={{ marginBottom: 12 }}
            >
              还没有运动员
            </div>
            <div
              className="t-footnote"
              style={{ marginBottom: 20 }}
            >
              点击下面的按钮创建第一个运动员
            </div>
            <button
              onClick={addAthlete}
              style={{
                padding: "10px 18px",
                background: "var(--brand-red)",
                border: "none",
                borderRadius: 8,
                color: "#fff",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              + 新建运动员
            </button>
          </div>
        ) : (
          <>
            <AthleteTabs
              athletes={athletes}
              activeId={activeId}
              onSelect={setActiveId}
              onAdd={addAthlete}
              onDelete={deleteAthlete}
            />
            {activeAthlete && plan && (
              <>
                <AthleteForm
                  key={activeAthlete.id}
                  athlete={activeAthlete}
                  onChange={updateAthlete}
                />
                <LiftSection
                  liftLabel="深蹲 SQUAT"
                  plan={plan.squat}
                  onChange={(p) => updateLift("squat", p)}
                />
                <LiftSection
                  liftLabel="卧推 BENCH"
                  plan={plan.bench}
                  onChange={(p) => updateLift("bench", p)}
                />
                <LiftSection
                  liftLabel="硬拉 DEADLIFT"
                  plan={plan.dead}
                  onChange={(p) => updateLift("dead", p)}
                />
                <Footer athlete={activeAthlete} plan={plan} />
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}
