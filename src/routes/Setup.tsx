import { Avatar } from "../components/Avatar";
import { Dot } from "../components/Dot";
import { Eyebrow } from "../components/Eyebrow";
import { HeroNumeral } from "../components/HeroNumeral";
import { ATHLETES } from "../sample-data";
import { projTotal, type RankableAthlete } from "../lib/ranking";

function SetupHeader() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "20px 32px",
        borderBottom: "1px solid var(--border)",
        background: "var(--surface-1)",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
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
          <span className="t-headline">MeetCard · 赛前编排</span>
          <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
            2026 全国邀请赛 · 男子 83KG · 第三组
          </span>
        </div>
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <button
          style={{
            minHeight: 40,
            padding: "0 16px",
            background: "var(--surface-2)",
            border: "1px solid var(--border-strong)",
            borderRadius: 8,
            color: "var(--fg-primary)",
            fontSize: 14,
            fontWeight: 500,
            cursor: "pointer",
          }}
        >
          导出 CSV
        </button>
        <button
          style={{
            minHeight: 40,
            padding: "0 16px",
            background: "var(--brand-red)",
            border: "none",
            borderRadius: 8,
            color: "#fff",
            fontSize: 14,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          同步至 /live
        </button>
      </div>
    </div>
  );
}

function BranchNode({
  label,
  weight,
  rpe,
  emphasis,
}: {
  label: string;
  weight: number;
  rpe: string;
  emphasis?: boolean;
}) {
  return (
    <div
      style={{
        flex: 1,
        padding: "14px 16px",
        background: emphasis ? "var(--surface-3)" : "var(--surface-2)",
        border: `1px solid ${
          emphasis ? "var(--border-strong)" : "var(--border)"
        }`,
        borderRadius: 10,
      }}
    >
      <div className="t-mono-label" style={{ color: "var(--fg-tertiary)", marginBottom: 6 }}>
        {label}
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
        <span
          className="t-tabular"
          style={{ fontFamily: "var(--font-mono)", fontSize: 22, fontWeight: 700 }}
        >
          {weight}
        </span>
        <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
          kg · RPE {rpe}
        </span>
      </div>
    </div>
  );
}

function BranchArrow() {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        color: "var(--fg-tertiary)",
      }}
    >
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path
          d="M5 10h10m0 0l-4-4m4 4l-4 4"
          stroke="currentColor"
          strokeWidth="1.4"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}

function BranchPath({
  tag,
  color,
  a3,
  rpe,
  note,
}: {
  tag: string;
  color: string;
  a3: number;
  rpe: string;
  note: string;
}) {
  return (
    <div
      style={{
        padding: "14px 16px",
        borderRadius: 10,
        background:
          color === "var(--green)" ? "var(--green-soft)" : "var(--brand-red-soft)",
        border: `1px solid ${color}`,
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          marginBottom: 8,
        }}
      >
        <Dot color={color} size={6} />
        <span className="t-mono-label" style={{ color }}>
          {tag}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 6,
          marginBottom: 4,
        }}
      >
        <span
          className="t-tabular"
          style={{
            fontFamily: "var(--font-mono)",
            fontSize: 22,
            fontWeight: 700,
            color: "var(--fg-primary)",
          }}
        >
          {a3}
        </span>
        <span className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
          kg · A3 · RPE {rpe}
        </span>
      </div>
      <div className="t-footnote" style={{ color: "var(--fg-tertiary)" }}>
        {note}
      </div>
    </div>
  );
}

function RPEBranch({
  baseSquat,
  made2,
  missed2,
}: {
  baseSquat: number[];
  made2: number;
  missed2: number;
}) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
      <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
        <BranchNode label="A1 · 开把" weight={baseSquat[0]} rpe="6.5" />
        <BranchArrow />
        <BranchNode label="A2 · 二把" weight={baseSquat[1]} rpe="8.5" emphasis />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <BranchPath
          tag="若二把成功"
          color="var(--green)"
          a3={made2}
          rpe="9"
          note="加 7.5–10kg, RPE 9"
        />
        <BranchPath
          tag="若二把失败"
          color="var(--brand-red)"
          a3={missed2}
          rpe="8.5"
          note="保稳, 重试或 +2.5"
        />
      </div>
    </div>
  );
}

function AthleteRow({ a, isOurs }: { a: RankableAthlete; isOurs?: boolean }) {
  const proj = projTotal(a);
  return (
    <tr style={{ background: isOurs ? "var(--brand-red-soft)" : "transparent" }}>
      <td style={{ padding: "10px 12px", borderBottom: "1px solid var(--border)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <Avatar name={a.name} accent={isOurs} size={32} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              className="t-body-emph"
              style={{ color: isOurs ? "var(--brand-red)" : "var(--fg-primary)" }}
            >
              {a.name}
            </span>
            <span className="t-caption">{a.team}</span>
          </div>
        </div>
      </td>
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 13,
        }}
      >
        {a.bw}
      </td>
      {[a.squat, a.bench, a.dead].map((arr, i) => (
        <td
          key={i}
          style={{ padding: "6px 8px", borderBottom: "1px solid var(--border)" }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {arr.map((w, j) => (
              <span
                key={j}
                style={{
                  fontFamily: "var(--font-mono)",
                  fontSize: 12,
                  fontWeight: 600,
                  fontVariantNumeric: "tabular-nums",
                  padding: "4px 6px",
                  borderRadius: 4,
                  minWidth: 42,
                  textAlign: "center",
                  background: j === 0 ? "var(--surface-3)" : "var(--surface-2)",
                  color: !w ? "var(--fg-disabled)" : "var(--fg-primary)",
                  border: "1px solid var(--border)",
                }}
              >
                {w || "—"}
              </span>
            ))}
          </div>
        </td>
      ))}
      <td
        style={{
          padding: "10px 12px",
          borderBottom: "1px solid var(--border)",
          fontFamily: "var(--font-mono)",
          fontVariantNumeric: "tabular-nums",
          fontSize: 15,
          fontWeight: 700,
          color: isOurs ? "var(--brand-red)" : "var(--fg-primary)",
        }}
      >
        {proj}
      </td>
    </tr>
  );
}

export function Setup() {
  const sortedByProj = [...ATHLETES].sort((a, b) => projTotal(b) - projTotal(a));
  return (
    <div
      className="mc-root"
      style={{ background: "var(--bg)", minHeight: "100vh", overflow: "auto" }}
    >
      <SetupHeader />

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1.55fr 1fr",
          gap: 24,
          padding: 32,
        }}
      >
        {/* LEFT — athlete grid */}
        <div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 16,
            }}
          >
            <div>
              <Eyebrow style={{ marginBottom: 6 }}>本组运动员 · 8 人</Eyebrow>
              <span className="t-title-2">第三组 · M83</span>
            </div>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                style={{
                  minHeight: 36,
                  padding: "0 14px",
                  background: "var(--surface-1)",
                  border: "1px solid var(--border)",
                  borderRadius: 8,
                  color: "var(--fg-secondary)",
                  fontSize: 13,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  cursor: "pointer",
                }}
              >
                + 添加运动员
              </button>
            </div>
          </div>

          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              overflow: "hidden",
            }}
          >
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--surface-2)" }}>
                  {[
                    "运动员",
                    "BW",
                    "深蹲 1·2·3",
                    "卧推 1·2·3",
                    "硬拉 1·2·3",
                    "投影",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        padding: "10px 12px",
                        textAlign: "left",
                        fontFamily: "var(--font-mono)",
                        fontSize: 11,
                        fontWeight: 500,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                        color: "var(--fg-tertiary)",
                        borderBottom: "1px solid var(--border)",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sortedByProj.map((a) => (
                  <AthleteRow key={a.id} a={a} isOurs={a.isOurs} />
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* RIGHT — RPE branching for our athlete */}
        <div>
          <Eyebrow style={{ marginBottom: 6 }}>RPE 分支预案 · 陈一帆</Eyebrow>
          <span
            className="t-title-2"
            style={{ display: "block", marginBottom: 18 }}
          >
            深蹲 · 三把走向
          </span>

          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 18,
              marginBottom: 18,
            }}
          >
            <RPEBranch baseSquat={[220, 235, 245]} made2={245} missed2={237.5} />
          </div>

          <Eyebrow style={{ marginBottom: 6 }}>三大项总投影</Eyebrow>
          <div
            style={{
              background: "var(--surface-1)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: 18,
              display: "flex",
              flexDirection: "column",
              gap: 14,
            }}
          >
            {[
              { lift: "深蹲", a1: 220, a2: 235, a3: 245, rpe: "6.5 / 8.5 / 9" },
              { lift: "卧推", a1: 142.5, a2: 152.5, a3: 157.5, rpe: "7 / 8.5 / 9.5" },
              { lift: "硬拉", a1: 260, a2: 275, a3: 290, rpe: "7 / 8.5 / 9.5" },
            ].map((r) => (
              <div
                key={r.lift}
                style={{
                  display: "grid",
                  gridTemplateColumns: "60px 1fr 130px",
                  alignItems: "center",
                  gap: 12,
                }}
              >
                <span className="t-body-emph">{r.lift}</span>
                <div style={{ display: "flex", gap: 6 }}>
                  {[r.a1, r.a2, r.a3].map((w, i) => (
                    <span
                      key={i}
                      style={{
                        flex: 1,
                        padding: "8px 10px",
                        borderRadius: 6,
                        background: "var(--surface-2)",
                        border: "1px solid var(--border)",
                        fontFamily: "var(--font-mono)",
                        fontSize: 14,
                        fontWeight: 600,
                        fontVariantNumeric: "tabular-nums",
                        textAlign: "center",
                      }}
                    >
                      {w}
                    </span>
                  ))}
                </div>
                <span
                  className="t-caption"
                  style={{ fontFamily: "var(--font-mono)", textAlign: "right" }}
                >
                  {r.rpe}
                </span>
              </div>
            ))}
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                borderTop: "1px solid var(--border)",
                paddingTop: 14,
                marginTop: 4,
              }}
            >
              <Eyebrow>满成 · 总成绩</Eyebrow>
              <HeroNumeral value={245 + 157.5 + 290} unit="KG" size={40} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
