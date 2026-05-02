import type { ReactNode } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { AttemptChip, type AttemptState } from "../components/AttemptChip";
import { Dot } from "../components/Dot";
import { Eyebrow } from "../components/Eyebrow";
import { LiftGlyph, type LiftKind } from "../components/LiftGlyph";
import { LiveButton } from "../components/LiveButton";
import { ATHLETES } from "../sample-data";
import {
  bestMade,
  rankByProjected,
  type LiftResult,
  type RankedAthlete,
} from "../lib/ranking";

type HeroVariant = "overtake" | "rank" | "gap";
type Density = "compact" | "standard" | "roomy";

// ─── Variant A: Hero = Overtake delta (default) ─────────────────────────
function LiveHeroOvertake({
  ranked,
  ours,
}: {
  ranked: RankedAthlete[];
  ours: RankedAthlete;
}) {
  const ahead = ranked.find((a) => a.rank === ours.rank - 1);
  // Need to lift: ahead's proj - (squat+bench made) + 0.5
  const made = ours.cur - bestMade(ours.dead, ours.deadRes); // squat+bench made
  const needed = ahead ? Math.ceil((ahead.proj - made + 0.5) * 2) / 2 : 0;
  const planned = ours.dead[2] || 0;
  const delta = needed - planned;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <Eyebrow meta="三试 · 硬拉">
        反超 #{ours.rank - 1} · {ahead?.name}
      </Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="t-display-numeral t-tabular"
          style={{ fontSize: 88, color: "var(--brand-red)", lineHeight: 0.9 }}
        >
          {needed}
        </span>
        <span className="t-display-unit" style={{ fontSize: 28 }}>
          KG
        </span>
      </div>
      <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
        <span className="t-footnote" style={{ color: "var(--fg-secondary)" }}>
          三把硬拉 · 当前计划 {planned} kg
        </span>
        <span style={{ color: "var(--fg-tertiary)" }}>·</span>
        <span
          className="t-footnote"
          style={{
            color: delta > 5 ? "var(--amber)" : "var(--green)",
            fontWeight: 600,
          }}
        >
          {delta > 0 ? `+${delta} kg` : "已足够"}
        </span>
      </div>
    </div>
  );
}

// ─── Variant B: Hero = Current rank ─────────────────────────────────────
function LiveHeroRank({ ours, ranked }: { ours: RankedAthlete; ranked: RankedAthlete[] }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Eyebrow meta="83KG · M">当前排名 · {ranked.length} 人组</Eyebrow>
      <div style={{ display: "flex", alignItems: "flex-end", gap: 12 }}>
        <span
          className="t-display-numeral"
          style={{ fontSize: 120, color: "var(--fg-primary)", lineHeight: 0.85 }}
        >
          {ours.rank}
        </span>
        <span className="t-display-unit" style={{ fontSize: 22, paddingBottom: 12 }}>
          / {ranked.length}
        </span>
      </div>
      <div className="t-footnote" style={{ color: "var(--fg-secondary)" }}>
        投影总成绩{" "}
        <span
          className="t-tabular"
          style={{ color: "var(--fg-primary)", fontWeight: 600 }}
        >
          {ours.proj}
        </span>{" "}
        kg
      </div>
    </div>
  );
}

// ─── Variant C: Hero = Total gap ────────────────────────────────────────
function LiveHeroGap({ ours, ranked }: { ours: RankedAthlete; ranked: RankedAthlete[] }) {
  const first = ranked[0];
  const gap = first.proj - ours.proj;
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <Eyebrow meta="投影差距">距第一名 · {first.name}</Eyebrow>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8 }}>
        <span
          className="t-display-numeral t-tabular"
          style={{ fontSize: 96, color: "var(--brand-red)", lineHeight: 0.9 }}
        >
          −{gap}
        </span>
        <span className="t-display-unit" style={{ fontSize: 24 }}>
          KG
        </span>
      </div>
      <div className="t-footnote" style={{ color: "var(--fg-secondary)" }}>
        当前{" "}
        <span className="t-tabular" style={{ color: "var(--fg-primary)" }}>
          {ours.proj}
        </span>{" "}
        · 第一{" "}
        <span className="t-tabular" style={{ color: "var(--fg-primary)" }}>
          {first.proj}
        </span>
      </div>
    </div>
  );
}

// Lift breakdown row — 3 chips per lift
function LiftRow({
  label,
  weights,
  results,
  current,
}: {
  label: string;
  weights: number[];
  results: LiftResult[];
  current?: boolean;
}) {
  const made = bestMade(weights, results);
  const lift: LiftKind = label === "深蹲" ? "S" : label === "卧推" ? "B" : "D";
  return (
    <div style={{ borderTop: "1px solid var(--border)", padding: "14px 0" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <LiftGlyph kind={lift} size={11} color="var(--fg-tertiary)" />
          <span className="t-body-emph">{label}</span>
          {current ? <Dot pulse color="var(--brand-red)" /> : null}
        </div>
        <span
          className="t-tabular"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 14,
            color: made > 0 ? "var(--fg-primary)" : "var(--fg-tertiary)",
            fontWeight: 600,
          }}
        >
          {made > 0 ? `${made} kg` : "—"}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {[0, 1, 2].map((i) => {
          let state: AttemptState = "pending";
          if (results[i] === "m") state = "made";
          else if (results[i] === "x") state = "missed";
          else if (results[i] === "c") state = "current";
          return (
            <AttemptChip
              key={i}
              n={i + 1}
              weight={weights[i] || "—"}
              state={state}
            />
          );
        })}
      </div>
    </div>
  );
}

// Mini ranking list — others
function MiniRankList({
  ranked,
  ourId,
}: {
  ranked: RankedAthlete[];
  ourId: string;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column" }}>
      {ranked.map((a, i) => {
        const isOurs = a.id === ourId;
        return (
          <button
            key={a.id}
            style={{
              background: isOurs ? "var(--brand-red-soft)" : "transparent",
              border: "none",
              borderTop: i === 0 ? "none" : "1px solid var(--border)",
              padding: "14px 12px",
              display: "grid",
              gridTemplateColumns: "28px 1fr auto",
              gap: 12,
              alignItems: "center",
              minHeight: 56,
              textAlign: "left",
              cursor: "pointer",
            }}
          >
            <span
              className="t-tabular"
              style={{
                fontFamily: "var(--font-display-cn)",
                fontWeight: 800,
                fontSize: 22,
                color: isOurs
                  ? "var(--brand-red)"
                  : a.rank <= 3
                  ? "var(--fg-primary)"
                  : "var(--fg-tertiary)",
              }}
            >
              {a.rank}
            </span>
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
                style={{ color: isOurs ? "var(--brand-red)" : "var(--fg-primary)" }}
              >
                {a.name}
              </span>
              <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
                {a.team} · BW {a.bw}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: 2,
                alignItems: "flex-end",
              }}
            >
              <span
                className="t-tabular"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 15,
                  fontWeight: 700,
                  color: "var(--fg-primary)",
                }}
              >
                {a.proj}
              </span>
              <span
                className="t-tabular"
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 11,
                  color: "var(--fg-tertiary)",
                }}
              >
                已 {a.cur}
              </span>
            </div>
          </button>
        );
      })}
    </div>
  );
}

export function LiveScreen() {
  const [params] = useSearchParams();
  const heroVariant = (params.get("hero") as HeroVariant) || "overtake";
  const density = (params.get("density") as Density) || "standard";

  const ranked = rankByProjected(ATHLETES);
  const ours = ranked.find((a) => a.isOurs);
  if (!ours) return null;
  const pad = density === "compact" ? 14 : density === "roomy" ? 22 : 18;
  const Hero: ReactNode =
    heroVariant === "rank" ? (
      <LiveHeroRank ours={ours} ranked={ranked} />
    ) : heroVariant === "gap" ? (
      <LiveHeroGap ours={ours} ranked={ranked} />
    ) : (
      <LiveHeroOvertake ranked={ranked} ours={ours} />
    );

  return (
    <div
      className="mc-root"
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Safe area top — handles iOS notch */}
      <div
        style={{
          paddingTop: "max(env(safe-area-inset-top), 12px)",
          flexShrink: 0,
        }}
      />

      <div style={{ flex: 1 }}>
        {/* Athlete header — LIVE indicator merged here */}
        <div
          style={{
            padding: `8px ${pad}px 8px`,
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <Avatar name="陈" accent size={44} />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 2,
              flex: 1,
              minWidth: 0,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="t-headline">陈一帆</span>
              <span
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                  padding: "2px 7px",
                  borderRadius: 999,
                  background: "var(--brand-red-soft)",
                }}
              >
                <Dot pulse size={6} />
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 10,
                    fontWeight: 600,
                    color: "var(--brand-red)",
                    letterSpacing: "0.08em",
                  }}
                >
                  LIVE
                </span>
              </span>
            </div>
            <span
              className="t-footnote"
              style={{
                color: "var(--fg-tertiary)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              XTY · 83KG · 卧推 #2 · 14:32
            </span>
          </div>
          <button
            style={{
              width: 44,
              height: 44,
              borderRadius: 12,
              border: "1px solid var(--border)",
              background: "var(--surface-1)",
              color: "var(--fg-secondary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              cursor: "pointer",
            }}
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path
                d="M4 6h12M4 10h12M4 14h12"
                stroke="currentColor"
                strokeWidth="1.6"
                strokeLinecap="round"
              />
            </svg>
          </button>
        </div>

        {/* Hero card */}
        <div
          style={{
            margin: `4px ${pad}px 18px`,
            padding: 20,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 16,
          }}
        >
          {Hero}
        </div>

        {/* Lifts */}
        <div style={{ padding: `0 ${pad}px 8px` }}>
          <Eyebrow style={{ marginBottom: 4 }}>三大项 · 试举进度</Eyebrow>
          <LiftRow label="深蹲" weights={ours.squat} results={ours.squatRes} />
          <LiftRow label="卧推" weights={ours.bench} results={ours.benchRes} current />
          <LiftRow label="硬拉" weights={ours.dead} results={ours.deadRes} />
        </div>

        {/* Ranking */}
        <div style={{ padding: `20px ${pad}px 8px` }}>
          <Eyebrow meta={`${ranked.length} 人`} style={{ marginBottom: 10 }}>
            排名 · 投影总成绩
          </Eyebrow>
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 16,
              overflow: "hidden",
            }}
          >
            <MiniRankList ranked={ranked} ourId={ours.id} />
          </div>
        </div>

        <div style={{ height: 100 }} />
      </div>

      {/* Sticky bottom CTA */}
      <div
        style={{
          padding: `${pad}px ${pad}px calc(28px + env(safe-area-inset-bottom))`,
          background:
            "linear-gradient(180deg, transparent, var(--bg) 30%)",
          display: "flex",
          gap: 10,
          borderTop: "1px solid var(--border)",
          position: "sticky",
          bottom: 0,
        }}
      >
        <LiveButton variant="secondary" style={{ flex: 1 }}>
          记录第 2 把
        </LiveButton>
        <LiveButton variant="primary" style={{ flex: 1.4 }}>
          下一把 · 152.5
        </LiveButton>
      </div>
    </div>
  );
}
