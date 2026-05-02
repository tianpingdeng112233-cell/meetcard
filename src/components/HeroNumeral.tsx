import type { ReactNode } from "react";

export type HeroNumeralProps = {
  value: ReactNode;
  unit?: string;
  size?: number;
  color?: string;
  sub?: ReactNode;
  flash?: boolean;
  accent?: boolean;
};

/**
 * Big numeral + small red unit, baseline-aligned. Used as the focal
 * point on /live hero cards (反超所需 / 排名 / 总差距) and the
 * 满成 · 总成绩 readout on /setup.
 */
export function HeroNumeral({
  value,
  unit = "KG",
  size = 60,
  color,
  sub,
  flash,
  accent,
}: HeroNumeralProps) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 10, lineHeight: 0.95 }}>
      <span
        className={`t-display-numeral t-tabular ${flash ? "mc-flash" : ""}`}
        style={{
          fontSize: size,
          color: color || (accent ? "var(--brand-red)" : "var(--fg-primary)"),
        }}
      >
        {value}
      </span>
      <span className="t-display-unit" style={{ fontSize: Math.round(size * 0.36) }}>
        {unit}
      </span>
      {sub ? (
        <span className="t-footnote" style={{ marginLeft: 6 }}>
          {sub}
        </span>
      ) : null}
    </div>
  );
}
