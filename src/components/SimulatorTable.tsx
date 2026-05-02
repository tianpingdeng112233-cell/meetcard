import { useEffect, useMemo, useState } from "react";
import {
  addScenario,
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

function PlatePills({ onJump }: { onJump: (delta: number) => void }) {
  return (
    <div
      style={{
        display: "flex",
        gap: 6,
        padding: "8px 12px",
        background: "var(--surface-3)",
        borderTop: "1px solid var(--brand-red)",
        borderBottom: "1px solid var(--border)",
      }}
    >
      {[-2.5, -0.5, 0.5, 2.5].map((d) => (
        <button
          key={d}
          onClick={() => onJump(d)}
          style={{
            flex: 1,
            minHeight: 36,
            borderRadius: 8,
            background: "var(--surface-1)",
            border: "1px solid var(--border-strong)",
            color: "var(--fg-primary)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          {d > 0 ? `+${d}` : d}
        </button>
      ))}
    </div>
  );
}

function NumCell({
  value,
  editing,
  onClick,
  accent,
}: {
  value: number;
  editing: boolean;
  onClick: () => void;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "8px 6px",
        background: editing ? "var(--brand-red-soft)" : "transparent",
        border: editing ? "1px solid var(--brand-red)" : "1px solid transparent",
        borderRadius: 6,
        fontFamily: "var(--font-mono)",
        fontVariantNumeric: "tabular-nums",
        fontSize: 14,
        fontWeight: 600,
        color: accent ? "var(--fg-primary)" : "var(--fg-secondary)",
        textAlign: "right",
        cursor: "pointer",
      }}
    >
      {value}
    </button>
  );
}

type SimRowProps = {
  scenario: Scenario;
  rowNumber: number;
  sim: SimulateResult;
  editingCell: string | null;
  onCellEdit: (cellKey: string | null) => void;
  onApplyJump: (rowId: string, side: "mine" | "rival", delta: number) => void;
  onToggleStar: (rowId: string) => void;
  onEditNote: (rowId: string) => void;
  onDelete: (rowId: string) => void;
};

function SimRow({
  scenario,
  rowNumber,
  sim,
  editingCell,
  onCellEdit,
  onApplyJump,
  onToggleStar,
  onEditNote,
  onDelete,
}: SimRowProps) {
  const tone = deltaTone(sim.deltaGL);
  const editingMine = editingCell === `${scenario.id}-mine`;
  const editingRival = editingCell === `${scenario.id}-rival`;
  const sign = sim.deltaGL >= 0 ? "+" : "";
  const editing = editingMine || editingRival;

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
          padding: "4px 10px",
          minHeight: 44,
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
        <NumCell
          value={scenario.myDeadliftKg}
          editing={editingMine}
          onClick={() =>
            onCellEdit(editingMine ? null : `${scenario.id}-mine`)
          }
          accent
        />
        <NumCell
          value={scenario.rivalDeadliftKg}
          editing={editingRival}
          onClick={() =>
            onCellEdit(editingRival ? null : `${scenario.id}-rival`)
          }
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
          {scenario.note || "+"}
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
      {editing ? (
        <PlatePills
          onJump={(d) =>
            onApplyJump(scenario.id, editingMine ? "mine" : "rival", d)
          }
        />
      ) : null}
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
  const [editingCell, setEditingCell] = useState<string | null>(null);

  const effectiveRivalId = rivalId ?? defaultRivalId;
  const rival = athletes.find((a) => a.id === effectiveRivalId) ?? null;

  // ── Seed scenarios on first load ──
  useEffect(() => {
    if (!seed || !athletes.length) return;
    const rows = seed.rows.map((r) => ({
      meetId,
      myAthleteId: ours.id,
      rivalAthleteId: seed.rivalAthleteId,
      myDeadliftKg: r.myDeadliftKg,
      rivalDeadliftKg: r.rivalDeadliftKg,
      note: r.note,
      starred: r.starred,
    }));
    seedScenariosIfEmpty(meetId, rows).catch((err) => {
      console.error("[meetcard] seed failed", err);
    });
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

  // ── Cell editing handlers ──
  const handleApplyJump = (
    rowId: string,
    side: "mine" | "rival",
    delta: number,
  ) => {
    const row = scenarios?.find((s) => s.id === rowId);
    if (!row) return;
    const field = side === "mine" ? "myDeadliftKg" : "rivalDeadliftKg";
    updateScenario(rowId, { [field]: row[field] + delta });
  };

  const handleEditNote = (rowId: string) => {
    const row = scenarios?.find((s) => s.id === rowId);
    if (!row) return;
    const next = window.prompt("场景备注（如 '496 能行'）", row.note ?? "");
    if (next === null) return;
    updateScenario(rowId, { note: next.trim() || undefined });
  };

  const handleAddScenario = () => {
    if (!rival) return;
    const last = rowsWithSim[rowsWithSim.length - 1]?.scenario;
    addScenario({
      meetId,
      myAthleteId: ours.id,
      rivalAthleteId: rival.id,
      myDeadliftKg: last ? last.myDeadliftKg + 2.5 : ours.dead[2] || 200,
      rivalDeadliftKg: last
        ? last.rivalDeadliftKg + 2.5
        : rival.dead[2] || 180,
    });
  };

  const handleAddOvertakeScenario = () => {
    if (!rival) return;
    // rival DL = their last declared / planned 3rd
    const rivalDL = rival.dead[2] || 0;
    // my DL = solve for crossing rival's projected GL with +2.5 buffer
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
    const targetTotal = solveTotalForGL(
      rivalGL,
      ours.bw,
      ours.sex,
      ours.equipment,
      ours.event,
    );
    const myDL = Math.ceil((targetTotal - myMade + 0.5) * 2) / 2 + 2.5;
    addScenario({
      meetId,
      myAthleteId: ours.id,
      rivalAthleteId: rival.id,
      myDeadliftKg: myDL,
      rivalDeadliftKg: rivalDL,
      note: `auto: 反超 (对手 ${rivalDL})`,
    });
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
              editingCell={editingCell}
              onCellEdit={setEditingCell}
              onApplyJump={handleApplyJump}
              onToggleStar={(id) => toggleStar(id)}
              onEditNote={handleEditNote}
              onDelete={(id) => deleteScenario(id)}
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

      {/* Action buttons */}
      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
        <LiveButton
          variant="secondary"
          onClick={handleAddScenario}
          style={{ flex: 1, minHeight: 48, fontSize: 14 }}
        >
          + 添加场景
        </LiveButton>
        <LiveButton
          variant="primary"
          onClick={handleAddOvertakeScenario}
          style={{ flex: 1, minHeight: 48, fontSize: 14 }}
        >
          + 反超场景
        </LiveButton>
      </div>

      {/* Row count */}
      <div
        className="t-caption"
        style={{
          marginTop: 8,
          fontFamily: "var(--font-mono)",
          textAlign: "right",
        }}
      >
        {rowsWithSim.length} 个场景 · {starCount} 已 ⭐
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
