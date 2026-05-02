import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from "react";

export type LiveButtonVariant = "primary" | "secondary" | "ghost" | "danger";

export type LiveButtonProps = {
  children: ReactNode;
  variant?: LiveButtonVariant;
  full?: boolean;
  style?: CSSProperties;
} & Omit<ButtonHTMLAttributes<HTMLButtonElement>, "style">;

const VARIANTS: Record<LiveButtonVariant, { bg: string; fg: string; border: string }> = {
  primary: { bg: "var(--brand-red)", fg: "#fff", border: "transparent" },
  secondary: { bg: "var(--surface-2)", fg: "var(--fg-primary)", border: "var(--border-strong)" },
  ghost: { bg: "transparent", fg: "var(--fg-primary)", border: "var(--border-strong)" },
  danger: { bg: "transparent", fg: "var(--brand-red)", border: "var(--brand-red)" },
};

/**
 * Big tactile button — minimum 56px hit target, used on /live for
 * primary actions. Variants: primary (brand red fill), secondary
 * (surface-2 bg), ghost (outlined), danger (red outlined).
 */
export function LiveButton({
  children,
  variant = "primary",
  full,
  style,
  ...rest
}: LiveButtonProps) {
  const v = VARIANTS[variant];
  return (
    <button
      style={{
        minHeight: 56,
        padding: "0 20px",
        background: v.bg,
        color: v.fg,
        border: `1.5px solid ${v.border}`,
        borderRadius: 12,
        fontSize: 17,
        fontWeight: 600,
        letterSpacing: "-0.01em",
        width: full ? "100%" : "auto",
        transition: "transform 200ms var(--ease-ios), background 200ms",
        cursor: "pointer",
        ...style,
      }}
      {...rest}
    >
      {children}
    </button>
  );
}
