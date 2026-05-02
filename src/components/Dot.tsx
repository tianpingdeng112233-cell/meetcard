export type DotProps = {
  color?: string;
  size?: number;
  pulse?: boolean;
};

/**
 * Status dot. With `pulse`, animates as a ring expanding outward
 * to draw eye to "this athlete is up next" / LIVE indicator.
 */
export function Dot({ color = "var(--brand-red)", size = 8, pulse }: DotProps) {
  return (
    <span
      className={pulse ? "mc-pulse" : undefined}
      style={{
        display: "inline-block",
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        flexShrink: 0,
      }}
    />
  );
}
