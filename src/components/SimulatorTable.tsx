import { useEffect, useMemo, useRef, useState, type Ref } from "react";
import {
  addScenario,
  clearScenarios,
  deleteScenario,
  seedScenariosIfEmpty,
  simulateScenario,
  toSimAthlete,
  toggleStar,
  updateScenario,
  useScenarios,
  type SimulateResult,
} from "../lib/scenarios";
import {
  bestMade,
  ipfGLPoints,
  isSameClass as isSameClassResult,
  rankByProjected,
  solveTotalForGL,
  type RankableAthlete,
} from "../lib/ranking";
import type { Scenario } from "../types";
import { Avatar } from "./Avatar";
import { Eyebrow } from "./Eyebrow";
import { LiveButton } from "./LiveButton";

type SimulatorTableProps = {
  meetId: string;
  athletes: RankableAthlete[];
  ours: RankableAthlete;
  /** Optional seed rows (myDl, rivalDl, note, starred). Idempotent. */
  seed?: {
    rivalAthleteId: string;
    rows: Array<{
      myDeadliftKg: number;
      rivalDeadliftKg: number;
      note?: string;
      starred?: boolean;
    }>;
  };
};

// Δ GL → tone mapping. Color-blind-safe via the icon character.
function deltaTone(d: number): { color: string; icon: string } {
  if (d < 0) return { color: "var(--brand-red)", icon: "✕" };
  if (d < 0.2) return { color: "var(--amber)", icon: "险" };
  return { color: "var(--green)", icon: "✓" };
}

function StarIcon({ filled, size = 16 }: { filled: boolean; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill={filled ? "var(--brand-red)" : "none"}
      stroke={filled ? "var(--brand-red)" : "var(--fg-tertiary)"}
      strokeWidth="1.4"
    >
      <path
        d="M8 1.5l2.06 4.18 4.61.67-3.34 3.25.79 4.6L8 12.04l-4.12 2.16.79-4.6L1.33 6.35l4.61-.67L8 1.5z"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/**
 * Inline number input — type-to-edit, commit on blur or Enter.
 * Replaces the old tap-to-open-plate-pills modal pattern, which felt
 * like one indirection too many for coaches who just want to type.
 */
function NumInput({
  value,
  onCommit,
  accent,
  inputRef,
}: {
  value: number;
  onCommit: (n: number) => void;
  accent?: boolean;
  inputRef?: Ref<HTMLInputElement>;
}) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  // Re-sync local draft when the underlying value changes (e.g. another
  // tab edited it, or the seed effect pre-filled it). Don't clobber
  // the user's in-progress typing.
  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = () => {
    const n = parseFloat(draft);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(value));
      return;
    }
    if (n !== value) onCommit(n);
  };

  return (
    <input
      ref={inputRef ?? undefined}
      type="number"
      inputMode="decimal"
      step="0.5"
      className="mc-num-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      style={{
        width: "100%",
        padding: "10px 6px",
        background: focused ? "var(--brand-red-soft)" : "transparent",
        border: focused
          ? "1px solid var(--brand-red)"
          : "1px solid transparent",
        borderRadius: 6,
        fontSize: 15,
        fontWeight: 600,
        color: accent ? "var(--fg-primary)" : "var(--fg-secondary)",
        textAlign: "right",
        outline: "none",
      }}
    />
  );
}

type SimRowProps = {
  scenario: Scenario;
  rowNumber: number;
  sim: SimulateResult;
  onCommit: (rowId: string, side: "mine" | "rival", value: number) => void;
  onToggleStar: (rowId: string) => void;
  onEditNote: (rowId: string) => void;
  onDelete: (rowId: string) => void;
  autoFocusMine?: boolean;
};

function SimRow({
  scenario,
  rowNumber,
  sim,
  onCommit,
  onToggleStar,
  onEditNote,
  onDelete,
  autoFocusMine,
}: SimRowProps) {
  const tone = deltaTone(sim.deltaGL);
  const sign = sim.deltaGL >= 0 ? "+" : "";
  const mineRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocusMine && mineRef.current) {
      mineRef.current.focus();
    }
  }, [autoFocusMine]);

  return (
    <div
      style={{
        background: scenario.starred ? "var(--brand-red-soft)" : "transparent",
        borderLeft: scenario.starred
          ? "2px solid var(--brand-red)"
          : "2px solid transparent",
        borderBottom: "1px solid var(--border)",
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "22px 1fr 1fr 64px 1fr 28px 22px",
          alignItems: "center",
          gap: 6,
          padding: "2px 10px",
          minHeight: 48,
        }}
      >
        <span
          className="t-tabular"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            color: "var(--fg-tertiary)",
            textAlign: "center",
          }}
        >
          {rowNumber}
        </span>
        <NumInput
          value={scenario.myDeadliftKg}
          onCommit={(n) => onCommit(scenario.id, "mine", n)}
          accent
          inputRef={mineRef}
        />
        <NumInput
          value={scenario.rivalDeadliftKg}
          onCommit={(n) => onCommit(scenario.id, "rival", n)}
        />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: 4,
            color: tone.color,
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 10,
              opacity: 0.7,
            }}
          >
            {tone.icon}
          </span>
          <span
            className="t-tabular"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              fontVariantNumeric: "tabular-nums",
            }}
          >
            {sign}
            {sim.deltaGL.toFixed(2)}
          </span>
        </div>
        <button
          onClick={() => onEditNote(scenario.id)}
          style={{
            background: "transparent",
            border: "none",
            textAlign: "left",
            padding: "4px 6px",
            minWidth: 0,
            overflow: "hidden",
            color: scenario.note ? "var(--fg-primary)" : "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
            fontSize: 11,
            whiteSpace: "nowrap",
            textOverflow: "ellipsis",
            cursor: "pointer",
          }}
        >
          {scenario.note || "—"}
        </button>
        <button
          onClick={() => onToggleStar(scenario.id)}
          aria-pressed={scenario.starred ? "true" : "false"}
          style={{
            background: "transparent",
            border: "none",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            cursor: "pointer",
          }}
        >
          <StarIcon filled={!!scenario.starred} />
        </button>
        <button
          onClick={() => onDelete(scenario.id)}
          aria-label="删除"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--fg-tertiary)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 4,
            fontSize: 14,
            cursor: "pointer",
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function RivalSwitcher({
  open,
  athletes,
  currentRivalId,
  oursId,
  onPick,
  onClose,
}: {
  open: boolean;
  athletes: RankableAthlete[];
  currentRivalId: string;
  oursId: string;
  onPick: (athleteId: string) => void;
  onClose: () => void;
}) {
  if (!open) return null;
  const candidates = athletes.filter((a) => a.id !== oursId);
  const ranked = rankByProjected(athletes);
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 30,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          background: "var(--surface-1)",
          borderTopLeftRadius: 20,
          borderTopRightRadius: 20,
          padding: "8px 0 calc(28px + env(safe-area-inset-bottom))",
          maxHeight: "78%",
          overflow: "auto",
          borderTop: "1px solid var(--border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "center", padding: "6px 0" }}>
          <div
            style={{
              width: 36,
              height: 4,
              borderRadius: 2,
              background: "var(--border-strong)",
            }}
          />
        </div>
        <div style={{ padding: "8px 18px 12px" }}>
          <Eyebrow meta={`${candidates.length} 人`}>选择对手</Eyebrow>
        </div>
        {candidates.map((a, i) => {
          const isCurrent = a.id === currentRivalId;
          const r = ranked.find((x) => x.id === a.id);
          const proj = r?.proj ?? 0;
          const gl = ipfGLPoints(proj, a.bw, a.sex, a.equipment, a.event);
          return (
            <button
              key={a.id}
              onClick={() => onPick(a.id)}
              style={{
                width: "100%",
                padding: "12px 18px",
                display: "grid",
                gridTemplateColumns: "40px 1fr auto auto",
                gap: 12,
                alignItems: "center",
                background: isCurrent ? "var(--brand-red-soft)" : "transparent",
                border: "none",
                borderTop: i === 0 ? "none" : "1px solid var(--border)",
                textAlign: "left",
                minHeight: 56,
                cursor: "pointer",
              }}
            >
              <Avatar name={a.name} accent={isCurrent} size={36} />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: 2,
                  minWidth: 0,
                }}
              >
                <span
                  className="t-body-emph"
                  style={{
                    color: isCurrent ? "var(--brand-red)" : "var(--fg-primary)",
                  }}
                >
                  {a.name}
                </span>
                <span
                  className="t-footnote"
                  style={{ color: "var(--fg-tertiary)" }}
                >
                  {a.team} · {a.weightClass}
                  {a.sex} · BW {a.bw}
                </span>
              </div>
              <span
                className="t-tabular"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--fg-primary)",
                }}
              >
                {proj}
              </span>
              <span
                className="t-tabular"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-tertiary)",
                }}
              >
                GL {gl.toFixed(2)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function SimulatorTable({
  meetId,
  athletes,
  ours,
  seed,
}: SimulatorTableProps) {
  const scenarios = useScenarios(meetId);
  const ranked = rankByProjected(athletes);

  // Default rival: next-rank athlete (or first non-ours)
  const ourRanked = ranked.find((a) => a.id === ours.id);
  const defaultRivalId =
    ranked.find((a) => ourRanked && a.rank === ourRanked.rank - 1)?.id ??
    athletes.find((a) => a.id !== ours.id)?.id ??
    null;

  const [rivalId, setRivalId] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  /** Id of the row whose mine-DL input should auto-focus on next render
   *  (used after "+ 加场景" to drop the cursor straight into the input). */
  const [autoFocusRowId, setAutoFocusRowId] = useState<string | null>(null);

  const effectiveRivalId = rivalId ?? defaultRivalId;
  const rival = athletes.find((a) => a.id === effectiveRivalId) ?? null;

  // ── Seed scenarios on first load (idempotent + ?reset=1 honored) ──
  useEffect(() => {
    if (!athletes.length) return;
    const params = new URLSearchParams(window.location.search);
    const resetRequested = params.get("reset") === "1";

    (async () => {
      try {
        if (resetRequested) {
          const removed = await clearScenarios(meetId);
          // strip ?reset=1 from URL so refresh doesn't re-clear
          params.delete("reset");
          const newSearch = params.toString();
          window.history.replaceState(
            null,
            "",
            window.location.pathname +
              (newSearch ? `?${newSearch}` : "") +
              window.location.hash,
          );
          // brief log so dev sees the reset happened
          console.info(
            `[meetcard] reset: cleared ${removed} scenarios for ${meetId}`,
          );
        }
        if (!seed) return;
        const rows = seed.rows.map((r) => ({
          meetId,
          myAthleteId: ours.id,
          rivalAthleteId: seed.rivalAthleteId,
          myDeadliftKg: r.myDeadliftKg,
          rivalDeadliftKg: r.rivalDeadliftKg,
          note: r.note,
          starred: r.starred,
        }));
        await seedScenariosIfEmpty(meetId, rows);
      } catch (err) {
        console.error("[meetcard] seed/reset failed", err);
      }
    })();
  }, [meetId, seed, athletes.length, ours.id]);

  // ── Compute simulation result for each scenario ──
  const rowsWithSim = useMemo(() => {
    if (!scenarios) return [];
    return scenarios
      .map((s) => {
        const rivalAth =
          athletes.find((a) => a.id === s.rivalAthleteId) ?? rival;
        if (!rivalAth) return null;
        const sim = simulateScenario({
          mine: toSimAthlete(ours),
          myDeadliftKg: s.myDeadliftKg,
          rival: toSimAthlete(rivalAth),
          rivalDeadliftKg: s.rivalDeadliftKg,
        });
        return { scenario: s, sim };
      })
      .filter((x): x is { scenario: Scenario; sim: SimulateResult } => x !== null);
  }, [scenarios, athletes, ours, rival]);

  const starCount = rowsWithSim.filter((r) => r.scenario.starred).length;

  // ── Compute the "反超建议" hint (suggested minimum my-DL to overtake
  //    rival's planned 3rd attempt). Shown as inline text above the
  //    table so the coach can copy the number into a cell instead of
  //    being forced into a button-driven modal flow. ──
  const overtakeSuggestion = useMemo(() => {
    if (!rival) return null;
    const rivalDL = rival.dead[2] || 0;
    if (rivalDL === 0) return null;
    const rivalProj =
      bestMade(rival.squat, rival.squatRes) +
      bestMade(rival.bench, rival.benchRes) +
      rivalDL;
    const rivalGL = ipfGLPoints(
      rivalProj,
      rival.bw,
      rival.sex,
      rival.equipment,
      rival.event,
    );
    const myMade =
      bestMade(ours.squat, ours.squatRes) + bestMade(ours.bench, ours.benchRes);
    if (isSameClassResult(ours, rival)) {
      const need = Math.ceil((rivalProj - myMade + 0.5) * 2) / 2;
      return { dl: need, basis: "total" as const, rivalDL };
    }
    const targetTotal = solveTotalForGL(
      rivalGL,
      ours.bw,
      ours.sex,
      ours.equipment,
      ours.event,
    );
    const need = Math.ceil((targetTotal - myMade + 0.5) * 2) / 2;
    return { dl: need, basis: "GL" as const, rivalDL };
  }, [ours, rival]);

  // ── Edit handlers ──
  const handleCommit = (
    rowId: string,
    side: "mine" | "rival",
    value: number,
  ) => {
    const field = side === "mine" ? "myDeadliftKg" : "rivalDeadliftKg";
    updateScenario(rowId, { [field]: value });
  };

  const handleEditNote = (rowId: string) => {
    const row = scenarios?.find((s) => s.id === rowId);
    if (!row) return;
    const next = window.prompt("场景备注（如 '496 能行'）", row.note ?? "");
    if (next === null) return;
    updateScenario(rowId, { note: next.trim() || undefined });
  };

  const handleAddScenario = async () => {
    if (!rival) return;
    const last = rowsWithSim[rowsWithSim.length - 1]?.scenario;
    const id = await addScenario({
      meetId,
      myAthleteId: ours.id,
      rivalAthleteId: rival.id,
      myDeadliftKg: last ? last.myDeadliftKg + 2.5 : ours.dead[2] || 200,
      rivalDeadliftKg: last
        ? last.rivalDeadliftKg + 2.5
        : rival.dead[2] || 180,
    });
    setAutoFocusRowId(id);
  };

  if (!rival) {
    return (
      <div style={{ marginTop: 18 }}>
        <Eyebrow style={{ marginBottom: 10 }}>双边场景模拟</Eyebrow>
        <div className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
          航班里没有可对比对手。
        </div>
      </div>
    );
  }

  const ourSquat = bestMade(ours.squat, ours.squatRes);
  const ourBench = bestMade(ours.bench, ours.benchRes);
  const rivalSquat = bestMade(rival.squat, rival.squatRes);
  const rivalBench = bestMade(rival.bench, rival.benchRes);

  return (
    <div style={{ position: "relative", marginTop: 18 }}>
      {/* Section header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          marginBottom: 10,
        }}
      >
        <Eyebrow style={{ flex: 1 }}>双边场景模拟 · 我 vs 对手</Eyebrow>
        <button
          onClick={() => setSheetOpen(true)}
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: "6px 10px",
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: 999,
            color: "var(--fg-primary)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Avatar name={rival.name} size={20} />
          {rival.name}
          <span style={{ color: "var(--fg-tertiary)" }}>▾</span>
        </button>
      </div>

      {rowsWithSim.length === 0 ? (
        <div
          className="mc-placeholder"
          style={{
            padding: "36px 20px",
            borderRadius: 12,
            flexDirection: "column",
            gap: 10,
            textAlign: "center",
          }}
        >
          <span
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              color: "var(--fg-tertiary)",
            }}
          >
            EMPTY · NO SCENARIOS
          </span>
          <span
            className="t-footnote"
            style={{ color: "var(--fg-secondary)" }}
          >
            还没有场景
            <br />
            点 + 添加场景 开始模拟
          </span>
        </div>
      ) : (
        <div
          style={{
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            overflow: "hidden",
          }}
        >
          {/* Header row */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "22px 1fr 1fr 64px 1fr 28px 22px",
              gap: 6,
              padding: "8px 10px",
              background: "var(--surface-2)",
              borderBottom: "1px solid var(--border)",
            }}
          >
            <span
              className="t-mono-label"
              style={{
                fontSize: 9,
                color: "var(--fg-tertiary)",
                textAlign: "center",
              }}
            >
              #
            </span>
            <span
              className="t-mono-label"
              style={{
                fontSize: 9,
                color: "var(--fg-tertiary)",
                textAlign: "right",
              }}
            >
              我 DL
            </span>
            <span
              className="t-mono-label"
              style={{
                fontSize: 9,
                color: "var(--fg-tertiary)",
                textAlign: "right",
              }}
            >
              对手 DL
            </span>
            <span
              className="t-mono-label"
              style={{
                fontSize: 9,
                color: "var(--fg-tertiary)",
                textAlign: "right",
              }}
            >
              Δ GL
            </span>
            <span
              className="t-mono-label"
              style={{ fontSize: 9, color: "var(--fg-tertiary)" }}
            >
              备注
            </span>
            <span
              className="t-mono-label"
              style={{
                fontSize: 9,
                color: "var(--fg-tertiary)",
                textAlign: "center",
              }}
            >
              ⭐
            </span>
            <span />
          </div>
          {rowsWithSim.map(({ scenario, sim }, i) => (
            <SimRow
              key={scenario.id}
              scenario={scenario}
              rowNumber={i + 1}
              sim={sim}
              onCommit={handleCommit}
              onToggleStar={(id) => toggleStar(id)}
              onEditNote={handleEditNote}
              onDelete={(id) => deleteScenario(id)}
              autoFocusMine={autoFocusRowId === scenario.id}
            />
          ))}
        </div>
      )}

      {/* H2H summary */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          gap: 8,
          padding: "10px 12px",
          marginTop: 10,
          background: "var(--surface-2)",
          borderRadius: 10,
          alignItems: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 2,
          }}
        >
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            我 · {ours.name}
          </span>
          <span
            className="t-tabular"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--fg-primary)",
            }}
          >
            SQ {ourSquat || "—"} + BN {ourBench || "—"}
          </span>
        </div>
        <span className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
          VS
        </span>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 2,
          }}
        >
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            对手 · {rival.name}
          </span>
          <span
            className="t-tabular"
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 13,
              fontWeight: 700,
              color: "var(--fg-primary)",
            }}
          >
            SQ {rivalSquat || "—"} + BN {rivalBench || "—"}
          </span>
        </div>
      </div>

      {/* "+ 加场景" — the only action button. Adds an empty row + auto-
          focuses the my-DL input so the coach can immediately type. */}
      <div style={{ marginTop: 12 }}>
        <LiveButton
          variant="secondary"
          onClick={handleAddScenario}
          full
          style={{ minHeight: 48, fontSize: 14 }}
        >
          + 加场景
        </LiveButton>
      </div>

      {/* Row count + 反超建议 */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 8,
          marginTop: 8,
        }}
      >
        {overtakeSuggestion ? (
          <span
            className="t-caption"
            style={{
              fontFamily: "var(--font-mono)",
              color: "var(--fg-tertiary)",
            }}
          >
            反超建议 {overtakeSuggestion.dl} kg{" "}
            <span style={{ opacity: 0.6 }}>
              (对手 {overtakeSuggestion.rivalDL})
            </span>
          </span>
        ) : (
          <span />
        )}
        <span
          className="t-caption"
          style={{
            fontFamily: "var(--font-mono)",
            color: "var(--fg-tertiary)",
          }}
        >
          {rowsWithSim.length} 个场景 · {starCount} 已 ⭐
        </span>
      </div>

      <RivalSwitcher
        open={sheetOpen}
        athletes={athletes}
        currentRivalId={effectiveRivalId ?? ""}
        oursId={ours.id}
        onPick={(id) => {
          setRivalId(id);
          setSheetOpen(false);
        }}
        onClose={() => setSheetOpen(false)}
      />
    </div>
  );
}
