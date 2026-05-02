export type LiftKind = "S" | "B" | "D";

export type LiftGlyphProps = {
  kind: LiftKind;
  size?: number;
  color?: string;
};

/**
 * Lift label glyph: SQ / BP / DL in mono. No iconography — the
 * 2-letter code is the icon.
 */
export function LiftGlyph({ kind, size = 14, color = "currentColor" }: LiftGlyphProps) {
  const label = kind === "S" ? "SQ" : kind === "B" ? "BP" : "DL";
  return (
    <span
      style={{
        fontFamily: "var(--font-mono)",
        fontSize: size,
        fontWeight: 700,
        color,
      }}
    >
      {label}
    </span>
  );
}
