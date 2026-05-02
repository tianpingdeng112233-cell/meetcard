import { useState, type ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { NumInput } from "../components/NumInput";
import {
  defaultRivalIdForDemo,
  selectDemo,
} from "../sample-data";
import {
  bestMade,
  ipfGLPoints,
  isSameClass,
  rankByProjected,
  solveTotalForGL,
  type RankableAthlete,
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
        padding: "10px 0",
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

function pickDefaultRival(
  athletes: RankableAthlete[],
  ours: RankableAthlete,
  demoMode: string | null,
): RankableAthlete | null {
  const overrideId = defaultRivalIdForDemo(demoMode);
  if (overrideId) {
    const found = athletes.find((a) => a.id === overrideId);
    if (found) return found;
  }
  const ranked = rankByProjected(athletes);
  const ourRanked = ranked.find((a) => a.id === ours.id);
  if (ourRanked && ourRanked.rank > 1) {
    const ahead = ranked.find((a) => a.rank === ourRanked.rank - 1);
    if (ahead) return athletes.find((a) => a.id === ahead.id) ?? null;
  }
  if (ranked.length > 1) {
    const second = ranked[1];
    return athletes.find((a) => a.id === second.id) ?? null;
  }
  return null;
}

export function Comparison() {
  const [params] = useSearchParams();
  const demoMode = params.get("demo");

  const athletes = selectDemo(demoMode);
  const ranked = rankByProjected(athletes);
  const oursRanked = ranked.find((a) => a.isOurs);
  const oursAthlete = athletes.find((a) => a.isOurs);
  if (!oursRanked || !oursAthlete) return null;

  const rival = pickDefaultRival(athletes, oursAthlete, demoMode);

  // Editable rival DL — the only variable in this view.
  // Everything else (rival proj, rival GL, my-min-to-overtake) derives from it.
  const initialRivalDL = rival?.dead[2] || 0;
  const [rivalDL, setRivalDL] = useState(initialRivalDL);

  if (!rival) {
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
          航班里没有可对比对手。
        </div>
      </div>
    );
  }

  const sameClass = isSameClass(oursAthlete, rival);

  // ── Derived: rival's full state and GL based on user-set rivalDL ──
  const ourSquat = bestMade(oursAthlete.squat, oursAthlete.squatRes);
  const ourBench = bestMade(oursAthlete.bench, oursAthlete.benchRes);
  const ourPlannedDL = oursAthlete.dead[2] || 0;
  const ourProj = ourSquat + ourBench + ourPlannedDL;
  const ourGL = ipfGLPoints(
    ourProj,
    oursAthlete.bw,
    oursAthlete.sex,
    oursAthlete.equipment,
    oursAthlete.event,
  );

  const rivalSquat = bestMade(rival.squat, rival.squatRes);
  const rivalBench = bestMade(rival.bench, rival.benchRes);
  const rivalProj = rivalSquat + rivalBench + rivalDL;
  const rivalGL = ipfGLPoints(
    rivalProj,
    rival.bw,
    rival.sex,
    rival.equipment,
    rival.event,
  );

  // ── Derived: minimum DL needed to overtake ──
  const made = ourSquat + ourBench;
  let needToOvertake: number;
  let basis: "total" | "GL";
  if (sameClass) {
    needToOvertake = Math.ceil((rivalProj - made + 0.5) * 2) / 2;
    basis = "total";
  } else {
    const targetTotal = solveTotalForGL(
      rivalGL,
      oursAthlete.bw,
      oursAthlete.sex,
      oursAthlete.equipment,
      oursAthlete.event,
    );
    needToOvertake = Math.ceil((targetTotal - made + 0.5) * 2) / 2;
    basis = "GL";
  }

  const isLeading = ourGL > rivalGL;

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
      <Eyebrow
        style={{ marginBottom: 14 }}
        meta={basis === "GL" ? "跨级 GL" : undefined}
      >
        对手对比 · {isLeading ? "守势" : "反超分析"}
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
          <Avatar name={oursAthlete.name} accent size={48} />
          <span className="t-body-emph">{oursAthlete.name}</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            {oursAthlete.team} · {oursAthlete.weightClass}
            {oursAthlete.sex} · #{oursRanked.rank}
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
          <Avatar name={rival.name} size={48} />
          <span className="t-body-emph">{rival.name}</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            {rival.team} · {rival.weightClass}
            {rival.sex}
          </span>
        </div>
      </div>

      {/* Hero — leading or chasing */}
      {isLeading ? (
        <div
          style={{
            padding: 18,
            background: "rgba(31, 179, 88, 0.10)",
            border: "1px solid var(--green)",
            borderRadius: 16,
            marginBottom: 16,
          }}
        >
          <Eyebrow style={{ marginBottom: 8 }}>
            已领先 · 守住即可{basis === "GL" ? " (GL)" : ""}
          </Eyebrow>
          <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
            <span
              className="t-display-numeral t-tabular"
              style={{ fontSize: 64, color: "var(--green)" }}
            >
              +{(ourGL - rivalGL).toFixed(2)}
            </span>
            <span
              className="t-display-unit"
              style={{ color: "var(--green)" }}
            >
              GL
            </span>
            <span
              className="t-footnote"
              style={{
                marginLeft: "auto",
                color: "var(--fg-secondary)",
                whiteSpace: "nowrap",
              }}
            >
              现计划 {ourPlannedDL} kg
            </span>
          </div>
        </div>
      ) : (
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
              {needToOvertake}
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
              原计划 {ourPlannedDL} ·{" "}
              {needToOvertake - ourPlannedDL >= 0 ? "+" : ""}
              {needToOvertake - ourPlannedDL}
            </span>
          </div>
        </div>
      )}

      {/* Breakdown — rival's 硬拉 cell is editable, drives the whole page */}
      <Eyebrow
        meta={
          <span style={{ fontFamily: "var(--font-mono)" }}>
            tap 改对手 DL
          </span>
        }
        style={{ marginBottom: 4 }}
      >
        分项最佳成绩
      </Eyebrow>
      <Row
        label="深蹲"
        mine={ourSquat || "—"}
        theirs={rivalSquat || "—"}
        theirsHi={rivalSquat > ourSquat}
      />
      <Row
        label="卧推"
        mine={ourBench || "—"}
        theirs={rivalBench || "—"}
        mineHi={ourBench >= rivalBench && ourBench > 0}
      />
      <Row
        label="硬拉"
        mine={ourPlannedDL}
        theirs={
          <NumInput
            value={rivalDL}
            onCommit={setRivalDL}
            align="left"
            accent
            size="md"
          />
        }
      />
      <Row
        label="投影"
        mine={ourProj}
        theirs={rivalProj}
        theirsHi={rivalProj > ourProj}
      />
      {basis === "GL" ? (
        <Row
          label="IPF GL"
          mine={ourGL.toFixed(2)}
          theirs={rivalGL.toFixed(2)}
          mineHi={ourGL > rivalGL}
          theirsHi={rivalGL > ourGL}
        />
      ) : null}

      {/* Reset hint when user has edited the rival DL */}
      {rivalDL !== initialRivalDL ? (
        <button
          onClick={() => setRivalDL(initialRivalDL)}
          style={{
            marginTop: 16,
            padding: "8px 12px",
            background: "transparent",
            border: "1px solid var(--border)",
            borderRadius: 8,
            color: "var(--fg-tertiary)",
            fontSize: 12,
            fontFamily: "var(--font-mono)",
            cursor: "pointer",
            alignSelf: "flex-start",
          }}
        >
          ↺ 重置对手 DL 到 {initialRivalDL}
        </button>
      ) : null}
    </div>
  );
}
