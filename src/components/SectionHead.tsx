import type { ReactNode } from "react";
import { Eyebrow } from "./Eyebrow";

export type SectionHeadProps = {
  kicker?: ReactNode;
  children?: ReactNode;
  right?: ReactNode;
};

/**
 * Eyebrow + headline pair. `right` slot lives on the eyebrow row
 * (e.g. "8 人" meta on the right of the rule).
 */
export function SectionHead({ kicker, children, right }: SectionHeadProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
      {kicker ? <Eyebrow flex meta={right}>{kicker}</Eyebrow> : null}
      {children ? (
        <div className="t-headline" style={{ color: "var(--fg-primary)" }}>
          {children}
        </div>
      ) : null}
    </div>
  );
}
