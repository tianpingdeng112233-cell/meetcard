import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Avatar } from "../components/Avatar";
import { Eyebrow } from "../components/Eyebrow";
import { NumInput } from "../components/NumInput";
import {
  defaultRivalIdForDemo,
  selectDemo,
  XTY_SEED_SCENARIOS,
} from "../sample-data";
import {
  bestMade,
  ipfGLPoints,
  isSameClass,
  rankByProjected,
  solveTotalForGL,
  type RankableAthlete,
} from "../lib/ranking";

type AttemptNum = 1 | 2 | 3;

/** Each row represents one hypothesis: "if rival's DL is X, what's my minimum?" */
type RivalGuess = {
  id: string;
  rivalDL: number;
};

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

/** Seed rows for the xty demo: rival DLs xty was iterating on 5/2. */
function defaultGuesses(demoMode: string | null): RivalGuess[] {
  if (demoMode === "xty") {
    return XTY_SEED_SCENARIOS.map((s, i) => ({
      id: `seed-${i}`,
      rivalDL: s.rivalDeadliftKg,
    }));
  }
  return [{ id: "row-0", rivalDL: 0 }];
}

function uid(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
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

  const [attemptNum, setAttemptNum] = useState<AttemptNum>(3);
  const [guesses, setGuesses] = useState<RivalGuess[]>(() =>
    defaultGuesses(demoMode),
  );

  const ourSquat = bestMade(oursAthlete.squat, oursAthlete.squatRes);
  const ourBench = bestMade(oursAthlete.bench, oursAthlete.benchRes);
  const ourPlannedDL = oursAthlete.dead[2] || 0;
  const ourMade = ourSquat + ourBench;

  // Pre-compute the per-guess math
  const rows = useMemo(() => {
    if (!rival) return [];
    const rivalSquat = bestMade(rival.squat, rival.squatRes);
    const rivalBench = bestMade(rival.bench, rival.benchRes);
    const rivalMade = rivalSquat + rivalBench;
    const sameClass = isSameClass(oursAthlete, rival);

    return guesses.map((g) => {
      const rivalProj = rivalMade + g.rivalDL;
      const rivalGL = ipfGLPoints(
        rivalProj,
        rival.bw,
        rival.sex,
        rival.equipment,
        rival.event,
      );

      let myMinDL: number;
      if (sameClass) {
        myMinDL = Math.ceil((rivalProj - ourMade + 0.5) * 2) / 2;
      } else {
        const targetTotal = solveTotalForGL(
          rivalGL,
          oursAthlete.bw,
          oursAthlete.sex,
          oursAthlete.equipment,
          oursAthlete.event,
        );
        myMinDL = Math.ceil((targetTotal - ourMade + 0.5) * 2) / 2;
      }

      const myProjAtMin = ourMade + myMinDL;
      const myGLAtMin = ipfGLPoints(
        myProjAtMin,
        oursAthlete.bw,
        oursAthlete.sex,
        oursAthlete.equipment,
        oursAthlete.event,
      );
      const margin = myGLAtMin - rivalGL;

      // Whether our pre-set plan (ourPlannedDL) is enough vs this rival value
      const myProjAtPlan = ourMade + ourPlannedDL;
      const myGLAtPlan = ipfGLPoints(
        myProjAtPlan,
        oursAthlete.bw,
        oursAthlete.sex,
        oursAthlete.equipment,
        oursAthlete.event,
      );
      const planMargin = myGLAtPlan - rivalGL;

      return {
        guess: g,
        rivalProj,
        rivalGL,
        myMinDL: Math.max(myMinDL, 0),
        margin,
        planEnough: planMargin > 0,
        planMargin,
      };
    });
  }, [guesses, rival, oursAthlete, ourMade, ourPlannedDL]);

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
  const basis: "total" | "GL" = sameClass ? "total" : "GL";

  const updateGuess = (id: string, val: number) => {
    setGuesses((prev) =>
      prev.map((g) => (g.id === id ? { ...g, rivalDL: val } : g)),
    );
  };

  const addGuess = () => {
    const last = guesses[guesses.length - 1];
    setGuesses((prev) => [
      ...prev,
      {
        id: uid(),
        rivalDL: last ? last.rivalDL + 2.5 : rival.dead[2] || 180,
      },
    ]);
  };

  const removeGuess = (id: string) => {
    setGuesses((prev) => prev.filter((g) => g.id !== id));
  };

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
        gap: 16,
      }}
    >
      <Eyebrow meta={basis === "GL" ? "跨级 GL" : "同级 total"}>
        对手对比 · 反超预估
      </Eyebrow>

      {/* H2H header */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 60px 1fr",
          alignItems: "center",
          gap: 8,
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "flex-end",
            gap: 4,
          }}
        >
          <Avatar name={oursAthlete.name} accent size={44} />
          <span className="t-body-emph">{oursAthlete.name}</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            {oursAthlete.team} · {oursAthlete.weightClass}
            {oursAthlete.sex}
          </span>
          <span
            className="t-caption"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-tertiary)" }}
          >
            SQ {ourSquat} · BN {ourBench}
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
            gap: 4,
          }}
        >
          <Avatar name={rival.name} size={44} />
          <span className="t-body-emph">{rival.name}</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            {rival.team} · {rival.weightClass}
            {rival.sex}
          </span>
          <span
            className="t-caption"
            style={{ fontFamily: "var(--font-mono)", color: "var(--fg-tertiary)" }}
          >
            SQ {bestMade(rival.squat, rival.squatRes)} · BN{" "}
            {bestMade(rival.bench, rival.benchRes)}
          </span>
        </div>
      </div>

      {/* Lift + attempt selector */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: "10px 14px",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <span className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
          硬拉
        </span>
        <span style={{ color: "var(--fg-tertiary)" }}>·</span>
        <span className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
          第
        </span>
        <div style={{ display: "flex", gap: 6 }}>
          {[1, 2, 3].map((n) => (
            <button
              key={n}
              onClick={() => setAttemptNum(n as AttemptNum)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background:
                  attemptNum === n ? "var(--brand-red)" : "var(--surface-2)",
                border:
                  attemptNum === n
                    ? "1px solid var(--brand-red)"
                    : "1px solid var(--border)",
                color:
                  attemptNum === n ? "#fff" : "var(--fg-secondary)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {n}
            </button>
          ))}
        </div>
        <span className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
          把
        </span>
        <span
          className="t-caption"
          style={{
            marginLeft: "auto",
            color: "var(--fg-tertiary)",
            fontFamily: "var(--font-mono)",
          }}
        >
          原计划 {ourPlannedDL} kg
        </span>
      </div>

      {/* The table — rival input → my-min output, multi-row parallel */}
      <div
        style={{
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "100px 24px 100px 1fr 24px",
            gap: 6,
            padding: "8px 12px",
            background: "var(--surface-2)",
            borderBottom: "1px solid var(--border)",
            alignItems: "center",
          }}
        >
          <span
            className="t-mono-label"
            style={{ fontSize: 10, color: "var(--fg-tertiary)" }}
          >
            对手 DL
          </span>
          <span />
          <span
            className="t-mono-label"
            style={{ fontSize: 10, color: "var(--fg-tertiary)" }}
          >
            我至少
          </span>
          <span
            className="t-mono-label"
            style={{
              fontSize: 10,
              color: "var(--fg-tertiary)",
              textAlign: "right",
            }}
          >
            对手 GL
          </span>
          <span />
        </div>
        {rows.map(({ guess, rivalGL, myMinDL, planEnough, planMargin }) => (
          <div
            key={guess.id}
            style={{
              display: "grid",
              gridTemplateColumns: "100px 24px 100px 1fr 24px",
              gap: 6,
              padding: "4px 12px",
              borderBottom: "1px solid var(--border)",
              alignItems: "center",
              minHeight: 52,
              background: planEnough
                ? "transparent"
                : "rgba(229,34,30,0.04)",
            }}
          >
            <NumInput
              value={guess.rivalDL}
              onCommit={(n) => updateGuess(guess.id, n)}
              align="center"
              size="md"
            />
            <span
              style={{
                color: "var(--fg-tertiary)",
                fontFamily: "var(--font-mono)",
                fontSize: 14,
                textAlign: "center",
              }}
            >
              →
            </span>
            <span
              className="t-tabular"
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 17,
                fontWeight: 800,
                color: planEnough ? "var(--green)" : "var(--brand-red)",
                textAlign: "center",
              }}
            >
              {myMinDL > 0 ? myMinDL : "—"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-tertiary)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              GL {rivalGL.toFixed(2)}
              <br />
              <span
                style={{
                  fontSize: 10,
                  color: planEnough ? "var(--green)" : "var(--brand-red)",
                }}
              >
                现计划{planEnough ? "够" : "不够"}{" "}
                {planMargin >= 0 ? "+" : ""}
                {planMargin.toFixed(2)}
              </span>
            </span>
            <button
              onClick={() => removeGuess(guess.id)}
              aria-label="删除"
              style={{
                background: "transparent",
                border: "none",
                color: "var(--fg-tertiary)",
                fontSize: 16,
                cursor: "pointer",
                padding: 4,
              }}
            >
              ×
            </button>
          </div>
        ))}
        <button
          onClick={addGuess}
          style={{
            width: "100%",
            padding: "12px 14px",
            background: "transparent",
            border: "none",
            color: "var(--brand-red)",
            fontFamily: "var(--font-mono)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            cursor: "pointer",
            textAlign: "left",
          }}
        >
          + 加一个对手可能值
        </button>
      </div>

      {/* Footnote — tells the coach how to read */}
      <div
        className="t-caption"
        style={{
          color: "var(--fg-tertiary)",
          fontFamily: "var(--font-mono)",
          textAlign: "center",
          padding: "0 8px",
          lineHeight: 1.6,
        }}
      >
        左边填对手可能 DL,右边自动出我至少需要的 DL
        <br />
        红底 = 我现计划 {ourPlannedDL} kg 不够反超 · 需提报
      </div>
    </div>
  );
}
