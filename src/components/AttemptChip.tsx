export type AttemptState = "pending" | "current" | "made" | "missed";

export type AttemptChipProps = {
  n: number;
  weight: number | string;
  state: AttemptState;
};

const STYLES: Record<AttemptState, { bg: string; fg: string; border: string }> = {
  pending: { bg: "var(--surface-2)", fg: "var(--fg-secondary)", border: "var(--border)" },
  current: { bg: "var(--surface-3)", fg: "var(--fg-primary)", border: "var(--brand-red)" },
  made: { bg: "var(--green-soft)", fg: "var(--green)", border: "transparent" },
  missed: { bg: "rgba(229,34,30,0.1)", fg: "var(--brand-red)", border: "transparent" },
};

/**
 * Three-state attempt chip: pending / current / made / missed.
 * Used in 3-col grid per lift on /live.
 */
export function AttemptChip({ n, weight, state }: AttemptChipProps) {
  const s = STYLES[state];
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: 2,
        padding: "8px 10px",
        minWidth: 64,
        background: s.bg,
        color: s.fg,
        border: `1px solid ${s.border}`,
        borderRadius: 8,
      }}
    >
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 10,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          opacity: 0.7,
        }}
      >
        A{n}
      </span>
      <span
        style={{
          fontFamily: "var(--font-mono)",
          fontSize: 15,
          fontWeight: 600,
          fontVariantNumeric: "tabular-nums",
          textDecoration: state === "missed" ? "line-through" : "none",
        }}
      >
        {weight}
      </span>
    </div>
  );
}
