import { useEffect, useState, type Ref } from "react";

export type NumInputProps = {
  value: number;
  onCommit: (n: number) => void;
  accent?: boolean;
  align?: "left" | "right" | "center";
  size?: "sm" | "md";
  inputRef?: Ref<HTMLInputElement>;
};

/**
 * Inline number input — type to edit, commit on blur or Enter.
 * Local draft state lets the user mid-type without the underlying
 * value clobbering it; on blur we parse + validate + commit.
 *
 * Used wherever the user wants to edit a number without ceremony.
 * Replaces the older "tap to open plate-pill modal" pattern.
 */
export function NumInput({
  value,
  onCommit,
  accent,
  align = "right",
  size = "md",
  inputRef,
}: NumInputProps) {
  const [draft, setDraft] = useState(String(value));
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(String(value));
  }, [value, focused]);

  const commit = () => {
    const n = parseFloat(draft);
    if (!Number.isFinite(n) || n < 0) {
      setDraft(String(value));
      return;
    }
    if (n !== value) onCommit(n);
  };

  const padding = size === "sm" ? "6px 6px" : "10px 8px";
  const fontSize = size === "sm" ? 14 : 17;

  return (
    <input
      ref={inputRef ?? undefined}
      type="number"
      inputMode="decimal"
      step="0.5"
      className="mc-num-input"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onFocus={(e) => {
        setFocused(true);
        e.currentTarget.select();
      }}
      onBlur={() => {
        setFocused(false);
        commit();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          commit();
          (e.target as HTMLInputElement).blur();
        }
      }}
      style={{
        width: "100%",
        padding,
        background: focused ? "var(--brand-red-soft)" : "transparent",
        border: focused
          ? "1px solid var(--brand-red)"
          : "1px solid transparent",
        borderRadius: 6,
        fontSize,
        fontWeight: 700,
        color: accent ? "var(--brand-red)" : "var(--fg-primary)",
        textAlign: align,
        outline: "none",
      }}
    />
  );
}
