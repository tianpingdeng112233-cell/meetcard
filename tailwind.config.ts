import type { Config } from "tailwindcss";

/**
 * MeetCard Tailwind config — mirrors MeetPR's iOS DesignSystem tokens.
 * Source of truth: ~/Projects/apps/MeetPR/specs/003-design-system-foundation/design-bundle/project/colors_and_type.css
 *
 * Dark-first; light theme via [data-theme="light"] on <html>.
 * All colors reference CSS variables (defined in src/index.css) so theme
 * swapping is runtime, no rebuild.
 */
const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  darkMode: ["selector", '[data-theme="dark"]'],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "var(--brand-red)",
          press: "var(--brand-red-press)",
          soft: "var(--brand-red-soft)",
        },
        green: {
          DEFAULT: "var(--green)",
          soft: "var(--green-soft)",
        },
        amber: {
          DEFAULT: "var(--amber)",
          soft: "var(--amber-soft)",
        },
        bg: "var(--bg)",
        surface: {
          1: "var(--surface-1)",
          2: "var(--surface-2)",
          3: "var(--surface-3)",
        },
        border: {
          DEFAULT: "var(--border)",
          strong: "var(--border-strong)",
        },
        fg: {
          primary: "var(--fg-primary)",
          secondary: "var(--fg-secondary)",
          tertiary: "var(--fg-tertiary)",
          disabled: "var(--fg-disabled)",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
        display: ["var(--font-display)"],
        "display-cn": ["var(--font-display-cn)"],
      },
      fontSize: {
        "display-hero": ["44px", { lineHeight: "0.95", fontWeight: "700", letterSpacing: "-0.02em" }],
        "title-1": ["34px", { lineHeight: "1.05", fontWeight: "700", letterSpacing: "-0.01em" }],
        "title-2": ["28px", { lineHeight: "1.10", fontWeight: "700", letterSpacing: "-0.01em" }],
        headline: ["20px", { lineHeight: "1.20", fontWeight: "600" }],
        body: ["17px", { lineHeight: "1.40", fontWeight: "400" }],
        "body-emphasis": ["17px", { lineHeight: "1.40", fontWeight: "600" }],
        footnote: ["13px", { lineHeight: "1.30", fontWeight: "400" }],
        caption: ["11px", { lineHeight: "1.20", fontWeight: "500" }],
        "mono-label": ["12px", { lineHeight: "1.20", fontWeight: "500", letterSpacing: "0.08em" }],
        "display-numeral": ["60px", { lineHeight: "0.95", fontWeight: "800", letterSpacing: "-0.02em" }],
        "display-unit": ["24px", { lineHeight: "1", fontWeight: "800", letterSpacing: "0.04em" }],
      },
      spacing: {
        xs: "4px",
        sm: "8px",
        md: "12px",
        base: "16px",
        lg: "24px",
        xl: "32px",
        "2xl": "48px",
        "3xl": "64px",
        "hit-min": "44px",
        "row-min": "56px",
      },
      borderRadius: {
        sm: "4px",
        md: "8px",
        lg: "12px",
        xl: "16px",
        pill: "999px",
      },
      transitionTimingFunction: {
        ios: "cubic-bezier(0.32, 0.72, 0, 1)",
      },
      transitionDuration: {
        fast: "200ms",
        base: "240ms",
        slow: "280ms",
      },
      minHeight: {
        "hit-min": "44px",
        "row-min": "56px",
      },
      minWidth: {
        "hit-min": "44px",
      },
    },
  },
  plugins: [],
};

export default config;
