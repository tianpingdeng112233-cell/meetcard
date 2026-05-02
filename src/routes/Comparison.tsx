import type { ReactNode } from "react";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { ATHLETES } from "../sample-data";
import { bestMade, rankByProjected } from "../lib/ranking";

type Risk = "safe" | "mid" | "risky";

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
  const ranked = rankByProjected(ATHLETES);
  const ours = ranked.find((a) => a.isOurs);
  if (!ours) return null;
  const opp = ranked.find((a) => a.rank === ours.rank - 1);
  if (!opp) return null;
  const need =
    Math.ceil(
      (opp.proj - (ours.cur - bestMade(ours.dead, ours.deadRes)) + 0.5) * 2,
    ) / 2;

  const ourSquat = bestMade(ours.squat, ours.squatRes);
  const oppSquat = bestMade(opp.squat, opp.squatRes);
  const ourBench = bestMade(ours.bench, ours.benchRes);
  const oppBench = bestMade(opp.bench, opp.benchRes);

  const recommendations: { w: number; risk: Risk; note: string }[] = [
    { w: 287.5, risk: "safe", note: "保守 · 锁定第 2 名" },
    { w: 292.5, risk: "mid", note: "反超 · 推荐" },
    { w: 297.5, risk: "risky", note: "激进 · 失败则降至 #4" },
  ];

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
      <Eyebrow style={{ marginBottom: 14 }}>对手对比 · 反超分析</Eyebrow>

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
            {ours.team} · #{ours.rank}
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
            {opp.team} · #{opp.rank}
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
        <Eyebrow style={{ marginBottom: 8 }}>反超所需 · 三把硬拉</Eyebrow>
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
            原计划 {ours.dead[2]} · +{need - ours.dead[2]}
          </span>
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 4 }}>分项最佳成绩</Eyebrow>
      <Row
        label="深蹲"
        mine={ourSquat}
        theirs={oppSquat}
        theirsHi={oppSquat > ourSquat}
      />
      <Row
        label="卧推"
        mine={ourBench || "—"}
        theirs={oppBench}
        mineHi={ourBench >= oppBench}
      />
      <Row label="硬拉" mine={`${ours.dead[2]}*`} theirs={`${opp.dead[2]}*`} />
      <Row label="投影" mine={ours.proj} theirs={opp.proj} theirsHi />

      <div style={{ marginTop: 20 }}>
        <Eyebrow style={{ marginBottom: 10 }}>建议方案</Eyebrow>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {recommendations.map((s) => (
            <button
              key={s.w}
              style={{
                padding: "14px 16px",
                borderRadius: 12,
                background:
                  s.risk === "mid" ? "var(--brand-red-soft)" : "var(--surface-1)",
                border: `1px solid ${
                  s.risk === "mid" ? "var(--brand-red)" : "var(--border)"
                }`,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 12,
                textAlign: "left",
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                <span
                  className="t-tabular"
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 22,
                    fontWeight: 700,
                    color: "var(--fg-primary)",
                  }}
                >
                  {s.w} kg
                </span>
                <span
                  className="t-footnote"
                  style={{ color: "var(--fg-tertiary)" }}
                >
                  {s.note}
                </span>
              </div>
              <span
                className="t-mono-label"
                style={{
                  color:
                    s.risk === "safe"
                      ? "var(--green)"
                      : s.risk === "risky"
                      ? "var(--amber)"
                      : "var(--brand-red)",
                }}
              >
                {s.risk === "safe" ? "稳" : s.risk === "risky" ? "险" : "推荐"}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
