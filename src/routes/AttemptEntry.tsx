import { useState } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { LiveButton } from "../components/LiveButton";

type Verdict = "made" | "missed" | null;

function NumPad({
  value,
  onChange,
  onConfirm,
  onCancel,
}: {
  value: string;
  onChange: (v: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const keys = ["7", "8", "9", "4", "5", "6", "1", "2", "3", ".", "0", "⌫"];
  const handle = (k: string) => {
    if (k === "⌫") {
      return onChange(value.length > 1 ? value.slice(0, -1) : "0");
    }
    if (k === "." && value.includes(".")) return;
    onChange(value === "0" && k !== "." ? k : value + k);
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
        {keys.map((k) => (
          <button
            key={k}
            onClick={() => handle(k)}
            style={{
              minHeight: 64,
              background: "var(--surface-2)",
              color: "var(--fg-primary)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              fontFamily: "var(--font-mono)",
              fontSize: 24,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            {k}
          </button>
        ))}
      </div>
      <div style={{ display: "flex", gap: 8 }}>
        <LiveButton variant="ghost" onClick={onCancel} style={{ flex: 1 }}>
          取消
        </LiveButton>
        <LiveButton variant="primary" onClick={onConfirm} style={{ flex: 1.3 }}>
          确认 · 上举
        </LiveButton>
      </div>
    </div>
  );
}

export function AttemptEntry() {
  const [val, setVal] = useState("152.5");
  const [verdict, setVerdict] = useState<Verdict>(null);

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
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 14,
        }}
      >
        <button
          style={{
            background: "transparent",
            border: "none",
            color: "var(--fg-secondary)",
            display: "flex",
            alignItems: "center",
            gap: 6,
            padding: 0,
            cursor: "pointer",
          }}
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path
              d="M11 4l-5 5 5 5"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
          <span className="t-body">返回</span>
        </button>
        <Eyebrow>卧推 · 第 2 把</Eyebrow>
        <span style={{ width: 60 }} />
      </div>

      <Eyebrow style={{ marginBottom: 10 }}>试举重量</Eyebrow>
      <div
        style={{
          padding: 24,
          background: "var(--surface-1)",
          border: "1px solid var(--border)",
          borderRadius: 16,
          marginBottom: 16,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            gap: 8,
            justifyContent: "center",
          }}
        >
          <span
            className="t-display-numeral t-tabular"
            style={{ fontSize: 76, color: "var(--fg-primary)" }}
          >
            {val}
          </span>
          <span className="t-display-unit">KG</span>
        </div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            gap: 8,
            marginTop: 12,
          }}
        >
          {[-2.5, -0.5, 0.5, 2.5].map((d) => (
            <button
              key={d}
              onClick={() => setVal(String((parseFloat(val) || 0) + d))}
              style={{
                minHeight: 36,
                padding: "0 12px",
                background: "var(--surface-3)",
                border: "1px solid var(--border)",
                borderRadius: 999,
                fontFamily: "var(--font-mono)",
                fontSize: 13,
                color: "var(--fg-secondary)",
                cursor: "pointer",
              }}
            >
              {d > 0 ? `+${d}` : d}
            </button>
          ))}
        </div>
      </div>

      <Eyebrow style={{ marginBottom: 8 }}>判定</Eyebrow>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 8,
          marginBottom: 16,
        }}
      >
        <button
          onClick={() => setVerdict("made")}
          style={{
            minHeight: 64,
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 17,
            background: verdict === "made" ? "var(--green-soft)" : "var(--surface-2)",
            color: verdict === "made" ? "var(--green)" : "var(--fg-secondary)",
            border: `1.5px solid ${
              verdict === "made" ? "var(--green)" : "var(--border)"
            }`,
            cursor: "pointer",
          }}
        >
          ✓ 上举成功
        </button>
        <button
          onClick={() => setVerdict("missed")}
          style={{
            minHeight: 64,
            borderRadius: 12,
            fontWeight: 700,
            fontSize: 17,
            background:
              verdict === "missed" ? "rgba(229,34,30,0.1)" : "var(--surface-2)",
            color: verdict === "missed" ? "var(--brand-red)" : "var(--fg-secondary)",
            border: `1.5px solid ${
              verdict === "missed" ? "var(--brand-red)" : "var(--border)"
            }`,
            cursor: "pointer",
          }}
        >
          ✕ 失败
        </button>
      </div>

      <div style={{ flex: 1 }} />
      <NumPad value={val} onChange={setVal} onConfirm={() => {}} onCancel={() => {}} />
    </div>
  );
}
