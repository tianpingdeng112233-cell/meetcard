import type { CSSProperties, ReactNode } from "react";

export type EyebrowProps = {
  children: ReactNode;
  flex?: boolean;
  muted?: boolean;
  meta?: ReactNode;
  style?: CSSProperties;
  className?: string;
};

/**
 * Red mono caps + 32px trailing rule. Three children pattern:
 * text + rule + optional meta. With `flex` (or when meta is present),
 * the rule expands to fill remaining space.
 */
export function Eyebrow({ children, flex, muted, meta, style, className }: EyebrowProps) {
  const cls = [
    "eyebrow",
    (flex || meta) && "eyebrow-flex",
    muted && "eyebrow-muted",
    className,
  ]
    .filter(Boolean)
    .join(" ");
  return (
    <div className={cls} style={style}>
      <span className="eyebrow-text">{children}</span>
      <span className="eyebrow-rule" aria-hidden="true" />
      {meta ? <span className="eyebrow-meta">{meta}</span> : null}
    </div>
  );
}
