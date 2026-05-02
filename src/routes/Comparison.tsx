import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { SimulatorTable } from "../components/SimulatorTable";
import {
  meetIdForDemo,
  selectDemo,
  XTY_SEED_SCENARIOS,
} from "../sample-data";
import {
  bestMade,
  ipfGLPoints,
  isSameClass,
  rankByProjected,
  solveTotalForGL,
} from "../lib/ranking";

function Row({
  label,
  mine,
  theirs,
  mineHi,
  theirsHi,
}: {
  label: string;
  mine: ReactNode;
  theirs: ReactNode;
  mineHi?: boolean;
  theirsHi?: boolean;
}) {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 80px 1fr",
        alignItems: "center",
        padding: "14px 0",
        borderTop: "1px solid var(--border)",
      }}
    >
      <span
        className="t-tabular"
        style={{
          textAlign: "right",
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 700,
          color: mineHi ? "var(--brand-red)" : "var(--fg-primary)",
        }}
      >
        {mine}
      </span>
      <span
        className="t-mono-label"
        style={{ textAlign: "center", color: "var(--fg-tertiary)" }}
      >
        {label}
      </span>
      <span
        className="t-tabular"
        style={{
          textAlign: "left",
          fontFamily: "var(--font-mono)",
          fontSize: 18,
          fontWeight: 700,
          color: theirsHi ? "var(--brand-red)" : "var(--fg-primary)",
        }}
      >
        {theirs}
      </span>
    </div>
  );
}

export function Comparison() {
  const [params] = useSearchParams();
  const demoMode = params.get("demo");

  const athletes = selectDemo(demoMode);
  const meetId = meetIdForDemo(demoMode);
  const ranked = rankByProjected(athletes);
  const ours = ranked.find((a) => a.isOurs);
  if (!ours) return null;
  const opp = ranked.find((a) => a.rank === ours.rank - 1);

  // Find an athlete record for `ours` from the original list (so we
  // hand SimulatorTable a real RankableAthlete, not the ranked one).
  const oursAthlete = athletes.find((a) => a.id === ours.id);
  if (!oursAthlete) return null;

  // For xty demo, seed Dexie with the 6 golden rows on first load
  // (米米 is the default rival for those rows).
  const seed =
    demoMode === "xty"
      ? {
          rivalAthleteId: "mm-2026-05",
          rows: XTY_SEED_SCENARIOS,
        }
      : undefined;

  if (!opp) {
    // Already #1 — no overtake math, but still show the simulator
    // (coach may want to model post-DL scenarios for podium-defense)
    return (
      <div
        className="mc-root"
        style={{
          background: "var(--bg)",
          minHeight: "100vh",
          padding:
            "calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 22px)",
        }}
      >
        <Eyebrow style={{ marginBottom: 14 }}>对手对比 · 反超分析</Eyebrow>
        <div className="t-body" style={{ color: "var(--fg-secondary)" }}>
          你已经是第 1 名 — 无需反超。
        </div>
        <SimulatorTable
          meetId={meetId}
          athletes={athletes}
          ours={oursAthlete}
          seed={seed}
        />
      </div>
    );
  }

  const sameClass = isSameClass(ours, opp);
  const made = ours.cur - bestMade(ours.dead, ours.deadRes); // SQ + BN best

  let need: number;
  let basis: "total" | "GL";
  if (sameClass) {
    need = Math.ceil((opp.proj - made + 0.5) * 2) / 2;
    basis = "total";
  } else {
    const oppGL = ipfGLPoints(
      opp.proj,
      opp.bw,
      opp.sex,
      opp.equipment,
      opp.event,
    );
    const targetTotal = solveTotalForGL(
      oppGL,
      ours.bw,
      ours.sex,
      ours.equipment,
      ours.event,
    );
    need = Math.ceil((targetTotal - made + 0.5) * 2) / 2;
    basis = "GL";
  }

  const ourSquat = bestMade(ours.squat, ours.squatRes);
  const oppSquat = bestMade(opp.squat, opp.squatRes);
  const ourBench = bestMade(ours.bench, ours.benchRes);
  const oppBench = bestMade(opp.bench, opp.benchRes);

  const ourGL = ipfGLPoints(
    ours.proj,
    ours.bw,
    ours.sex,
    ours.equipment,
    ours.event,
  );
  const oppGL = ipfGLPoints(
    opp.proj,
    opp.bw,
    opp.sex,
    opp.equipment,
    opp.event,
  );

  return (
    <div
      className="mc-root"
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        padding:
          "calc(env(safe-area-inset-top) + 18px) 18px calc(env(safe-area-inset-bottom) + 22px)",
      }}
    >
      <Eyebrow style={{ marginBottom: 14 }} meta={basis === "GL" ? "跨级 GL" : undefined}>
        对手对比 · 反超分析
      </Eyebrow>

      {/* H2H header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 60px 1fr",
          alignItems: "center",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 6,
          }}
        >
          <Avatar name={ours.name} accent size={48} />
          <span className="t-body-emph">{ours.name}</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            {ours.team} · {ours.weightClass}
            {ours.sex} · #{ours.rank}
          </span>
        </div>
        <div
          className="t-display-numeral t-tabular"
          style={{
            fontFamily: "var(--font-mono)",
            textAlign: "center",
            fontSize: 22,
            color: "var(--fg-tertiary)",
            fontWeight: 700,
          }}
        >
          VS
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-start",
            gap: 6,
          }}
        >
          <Avatar name={opp.name} size={48} />
          <span className="t-body-emph">{opp.name}</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            {opp.team} · {opp.weightClass}
            {opp.sex} · #{opp.rank}
          </span>
        </div>
      </div>

      {/* Need-to-lift hero */}
      <div
        style={{
          padding: 18,
          background: "var(--brand-red-soft)",
          border: "1px solid var(--brand-red)",
          borderRadius: 16,
          marginBottom: 16,
        }}
      >
        <Eyebrow style={{ marginBottom: 8 }}>
          反超所需 · 三把硬拉{basis === "GL" ? " (GL)" : ""}
        </Eyebrow>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
          <span
            className="t-display-numeral t-tabular"
            style={{ fontSize: 64, color: "var(--brand-red)" }}
          >
            {need}
          </span>
          <span className="t-display-unit">KG</span>
          <span
            className="t-footnote"
            style={{
              marginLeft: "auto",
              color: "var(--fg-secondary)",
              whiteSpace: "nowrap",
            }}
          >
            原计划 {ours.dead[2]} · {need - ours.dead[2] >= 0 ? "+" : ""}
            {need - ours.dead[2]}
          </span>
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 4 }}>分项最佳成绩</Eyebrow>
      <Row
        label="深蹲"
        mine={ourSquat || "—"}
        theirs={oppSquat || "—"}
        theirsHi={oppSquat > ourSquat}
      />
      <Row
        label="卧推"
        mine={ourBench || "—"}
        theirs={oppBench || "—"}
        mineHi={ourBench >= oppBench && ourBench > 0}
      />
      <Row label="硬拉" mine={`${ours.dead[2]}*`} theirs={`${opp.dead[2]}*`} />
      <Row
        label="投影"
        mine={ours.proj}
        theirs={opp.proj}
        theirsHi={opp.proj > ours.proj}
      />
      {basis === "GL" ? (
        <Row
          label="IPF GL"
          mine={ourGL.toFixed(2)}
          theirs={oppGL.toFixed(2)}
          mineHi={ourGL > oppGL}
          theirsHi={oppGL > ourGL}
        />
      ) : null}

      {/* Bilateral simulator — replaces the old 3-card "建议方案" block */}
      <SimulatorTable
        meetId={meetId}
        athletes={athletes}
        ours={oursAthlete}
        seed={seed}
      />
    </div>
  );
}
