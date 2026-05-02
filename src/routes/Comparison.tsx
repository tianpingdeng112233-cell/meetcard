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

type Lift = "S" | "B" | "D";
type AttemptNum = 1 | 2 | 3;

type RivalGuess = {
  id: string;
  value: number;
};

const LIFT_NAME: Record<Lift, string> = {
  S: "深蹲",
  B: "卧推",
  D: "硬拉",
};

const LIFT_SHORT: Record<Lift, string> = {
  S: "SQ",
  B: "BN",
  D: "DL",
};

function uid(): string {
  return `r_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
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

function liftValue(a: RankableAthlete, lift: Lift): number {
  if (lift === "S") return bestMade(a.squat, a.squatRes) || a.squat[2] || 0;
  if (lift === "B") return bestMade(a.bench, a.benchRes) || a.bench[2] || 0;
  return bestMade(a.dead, a.deadRes) || a.dead[2] || 0;
}

function defaultGuessesFor(
  rival: RankableAthlete,
  lift: Lift,
  demoMode: string | null,
): RivalGuess[] {
  // For xty demo on DL we have 6 verbatim rows from his 5/2 screenshot
  if (demoMode === "xty" && lift === "D") {
    return XTY_SEED_SCENARIOS.map((s, i) => ({
      id: `seed-d-${i}`,
      value: s.rivalDeadliftKg,
    }));
  }
  // Otherwise seed with a single row at rival's "current" value for that lift
  const v = liftValue(rival, lift);
  return [{ id: uid(), value: v }];
}

export function Comparison() {
  const [params] = useSearchParams();
  const demoMode = params.get("demo");

  const athletes = selectDemo(demoMode);
  const ranked = rankByProjected(athletes);
  const oursRanked = ranked.find((a) => a.isOurs);
  const oursAthlete = athletes.find((a) => a.isOurs);

  const rival = oursAthlete
    ? pickDefaultRival(athletes, oursAthlete, demoMode)
    : null;

  const [focusLift, setFocusLift] = useState<Lift>("D");
  const [attemptNum, setAttemptNum] = useState<AttemptNum>(3);
  const [guessesByLift, setGuessesByLift] = useState<Record<Lift, RivalGuess[]>>(
    () => {
      if (!rival) return { S: [], B: [], D: [] };
      return {
        S: defaultGuessesFor(rival, "S", demoMode),
        B: defaultGuessesFor(rival, "B", demoMode),
        D: defaultGuessesFor(rival, "D", demoMode),
      };
    },
  );

  // Pre-compute the per-guess math
  const rows = useMemo(() => {
    if (!rival || !oursAthlete) return [];
    const rivalSquat = liftValue(rival, "S");
    const rivalBench = liftValue(rival, "B");
    const rivalDL = liftValue(rival, "D");
    const ourSquat = liftValue(oursAthlete, "S");
    const ourBench = liftValue(oursAthlete, "B");
    const ourDL = liftValue(oursAthlete, "D");
    const sameClass = isSameClass(oursAthlete, rival);
    const ourPlannedForFocus =
      focusLift === "S" ? ourSquat : focusLift === "B" ? ourBench : ourDL;
    const ourMadeOther =
      (focusLift === "S" ? 0 : ourSquat) +
      (focusLift === "B" ? 0 : ourBench) +
      (focusLift === "D" ? 0 : ourDL);

    return guessesByLift[focusLift].map((g) => {
      const rivalProj =
        (focusLift === "S" ? g.value : rivalSquat) +
        (focusLift === "B" ? g.value : rivalBench) +
        (focusLift === "D" ? g.value : rivalDL);
      const rivalGL = ipfGLPoints(
        rivalProj,
        rival.bw,
        rival.sex,
        rival.equipment,
        rival.event,
      );

      let myMin: number;
      if (sameClass) {
        myMin = Math.ceil((rivalProj - ourMadeOther + 0.5) * 2) / 2;
      } else {
        const targetTotal = solveTotalForGL(
          rivalGL,
          oursAthlete.bw,
          oursAthlete.sex,
          oursAthlete.equipment,
          oursAthlete.event,
        );
        myMin = Math.ceil((targetTotal - ourMadeOther + 0.5) * 2) / 2;
      }

      const myProjAtPlan = ourMadeOther + ourPlannedForFocus;
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
        myMin: Math.max(myMin, 0),
        planEnough: planMargin > 0,
        planMargin,
        ourPlannedForFocus,
      };
    });
  }, [guessesByLift, focusLift, rival, oursAthlete]);

  if (!oursRanked || !oursAthlete) return null;

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
    setGuessesByLift((prev) => ({
      ...prev,
      [focusLift]: prev[focusLift].map((g) =>
        g.id === id ? { ...g, value: val } : g,
      ),
    }));
  };

  const addGuess = () => {
    const list = guessesByLift[focusLift];
    const last = list[list.length - 1];
    setGuessesByLift((prev) => ({
      ...prev,
      [focusLift]: [
        ...list,
        {
          id: uid(),
          value: last ? last.value + 2.5 : liftValue(rival, focusLift),
        },
      ],
    }));
  };

  const removeGuess = (id: string) => {
    setGuessesByLift((prev) => ({
      ...prev,
      [focusLift]: prev[focusLift].filter((g) => g.id !== id),
    }));
  };

  const ourSummary = `SQ ${liftValue(oursAthlete, "S")} · BN ${liftValue(
    oursAthlete,
    "B",
  )} · DL ${liftValue(oursAthlete, "D")}`;
  const rivalSummary = `SQ ${liftValue(rival, "S")} · BN ${liftValue(
    rival,
    "B",
  )} · DL ${liftValue(rival, "D")}`;

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
            {ourSummary}
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
            {rivalSummary}
          </span>
        </div>
      </div>

      {/* Lift + attempt selector */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 8,
          padding: "12px 14px",
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 12,
        }}
      >
        <div style={{ display: "flex", gap: 6 }}>
          {(["S", "B", "D"] as const).map((l) => (
            <button
              key={l}
              onClick={() => setFocusLift(l)}
              style={{
                flex: 1,
                minHeight: 40,
                borderRadius: 8,
                background:
                  focusLift === l ? "var(--brand-red)" : "var(--surface-2)",
                border:
                  focusLift === l
                    ? "1px solid var(--brand-red)"
                    : "1px solid var(--border)",
                color: focusLift === l ? "#fff" : "var(--fg-secondary)",
                fontSize: 15,
                fontWeight: 700,
                cursor: "pointer",
              }}
            >
              {LIFT_NAME[l]}
            </button>
          ))}
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <span className="t-mono-label" style={{ color: "var(--fg-tertiary)" }}>
            第
          </span>
          <div style={{ display: "flex", gap: 6 }}>
            {[1, 2, 3].map((n) => (
              <button
                key={n}
                onClick={() => setAttemptNum(n as AttemptNum)}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  background:
                    attemptNum === n
                      ? "var(--surface-3)"
                      : "var(--surface-2)",
                  border:
                    attemptNum === n
                      ? "1px solid var(--brand-red)"
                      : "1px solid var(--border)",
                  color:
                    attemptNum === n
                      ? "var(--brand-red)"
                      : "var(--fg-secondary)",
                  fontFamily: "var(--font-mono)",
                  fontSize: 13,
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
            原计划 {liftValue(oursAthlete, focusLift)} kg
          </span>
        </div>
      </div>

      {/* The table */}
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
            对手 {LIFT_SHORT[focusLift]}
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
        {rows.map(({ guess, rivalGL, myMin, planEnough, planMargin }) => (
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
              value={guess.value}
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
              {myMin > 0 ? myMin : "—"}
            </span>
            <span
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 12,
                color: "var(--fg-tertiary)",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
                lineHeight: 1.3,
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
          + 加一个对手{LIFT_SHORT[focusLift]}可能值
        </button>
      </div>

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
        左边填对手{LIFT_NAME[focusLift]}可能值,右边自动出我至少需要的{" "}
        {LIFT_SHORT[focusLift]}
        <br />
        红底 = 我现计划 {liftValue(oursAthlete, focusLift)} kg 不够反超
      </div>
    </div>
  );
}
