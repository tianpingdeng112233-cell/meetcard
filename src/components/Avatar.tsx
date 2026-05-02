export type AvatarProps = {
  name: string;
  size?: number;
  accent?: boolean;
};

/**
 * Square monogram avatar. First character of `name` rendered in
 * Noto Sans SC heavy. `accent` flips to brand-red treatment for
 * "this is our athlete".
 */
export function Avatar({ name, size = 40, accent }: AvatarProps) {
  const initial = (name || "?").slice(0, 1);
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        background: accent ? "var(--brand-red-soft)" : "var(--surface-3)",
        color: accent ? "var(--brand-red)" : "var(--fg-secondary)",
        border: `1px solid ${accent ? "var(--brand-red)" : "var(--border)"}`,
        borderRadius: 8,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-display-cn)",
        fontWeight: 800,
        fontSize: size * 0.45,
      }}
    >
      {initial}
    </div>
  );
}
