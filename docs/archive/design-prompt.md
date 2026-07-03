# MeetCard PWA 设计提示词

复制下方整段发给 claude design（或任何视觉/UI 设计 agent）即可。

---

## Context

I'm building **MeetCard**, a Progressive Web App for powerlifting coaches to use during live meets. The user is a top-tier Chinese powerlifting coach (xty) who currently uses a Greg Nuckols-style Excel template for pre-meet planning — we're replacing the static Excel with a dynamic web app that adds **real-time competitor comparison** during the meet.

**Two surfaces, one PWA**:
- **Desktop pre-meet** (`/setup`) — coach fills in athletes, openers, RPE-branched attempts the night before
- **Mobile at-meet** (`/live`) — coach taps through a phone screen between flights, sees live ranking + "what to lift to overtake X"

Critical constraints:
- **Speed-first** — coach has ~1 minute between attempts; every interaction is big-button + thumb-reachable
- **Offline-first** — Vite-PWA + Service Worker + IndexedDB. Must work with zero network at meet
- **Dark-first** — meets are physically dark, phones get low-glare; light mode is fallback
- **Industrial powerlifting aesthetic** — chiseled, heavy, "SBD-apparel" feel; not "fitness app"; not "fintech card"

---

## Style Reference: MeetPR Design System (must match)

MeetCard is a 5/7 wedge for the larger MeetPR iOS app. The visual language must be **identical** so MeetCard can later be ported into MeetPR as the "比赛模式" feature without redesign.

Pull the exact tokens from MeetPR's existing design system:

### Brand
- **Brand red**: `#E5221E` — THE signal color. Used for PR / AI / active tab / danger / record-breaks
- **Brand red press**: `#B81A17`
- **Brand red soft tint**: `rgba(229, 34, 30, 0.12)` (dark) / `rgba(229, 34, 30, 0.08)` (light)

### Semantic
- **Green** `#1FB358` — completion / good lift / "+delta" / favorable comparison
- **Green soft**: `rgba(31, 179, 88, 0.14)`
- **Amber** `#E0A810` — RARE, only for overreaching / risk warning
- **Amber soft**: `rgba(224, 168, 16, 0.14)`

### Dark theme (PRIMARY)
```
bg:           #000000  (true black)
surface-1:    #0E0E0E  (cards)
surface-2:    #161616  (elevated card / modal / hover)
surface-3:    #1F1F1F  (pressed / focus background)
border:       #262626  (hairline divider)
border-strong:#3A3A3A
fg-primary:   #FFFFFF
fg-secondary: #B5B5B5
fg-tertiary:  #737373
fg-disabled:  rgba(255,255,255,0.35)
```

### Light theme (fallback)
```
bg:           #FAFAFA
surface-1:    #FFFFFF
surface-2:    #F4F4F5
surface-3:    #E9E9EB
border:       #E5E5E5
border-strong:#C9C9C9
fg-primary:   #0A0A0A
fg-secondary: #525252
fg-tertiary:  #A3A3A3
```

### Typography
- **Sans body**: `-apple-system, BlinkMacSystemFont, "SF Pro Text", "SF Pro Display", "PingFang SC", "Helvetica Neue", Arial, sans-serif`
- **Mono**: `ui-monospace, "SF Mono", Menlo, Monaco, "Cascadia Mono", "Roboto Mono", Consolas, monospace`
- **Display CN (industrial heavy)**: `"Noto Sans SC", "PingFang SC", -apple-system, sans-serif` at weight 900 — used for hero numerals like total weight, ranking position, current best lift

### Type scale (px)
```
displayHero:    44px / line 0.95 / weight 700 / tracking -0.02em
title1:         34px / line 1.05 / weight 700 / tracking -0.01em
title2:         28px / line 1.10 / weight 700 / tracking -0.01em
headline:       20px / line 1.20 / weight 600
body:           17px / line 1.40 / weight 400 (emphasis 600)
footnote:       13px / line 1.30 / weight 400 / fg-secondary
caption:        11px / line 1.20 / weight 500 / fg-tertiary

monoLabel:      12px / line 1.20 / weight 500 / tracking 0.08em / uppercase / brand-red
displayNumeral: 60px / weight 800 / SF Pro Heavy / line 0.95 / tabular-nums / tracking -0.02em
displayUnit:    24px / weight 800 / tracking 0.04em / uppercase / brand-red
```

### Spacing (8pt grid)
```
xs:   4px
sm:   8px
md:   12px
base: 16px
lg:   24px
xl:   32px
2xl:  48px
3xl:  64px
```

### Radius
```
sm:   4px   (chips, micro-pills)
md:   8px   (inputs)
lg:   12px  (cards)
xl:   16px  (modals)
pill: 999px
```

### Hit targets
- `--hit-min: 44px` (Apple HIG, must enforce on all tappable elements)
- `--row-min: 56px` (list rows on mobile)

### Motion
- Easing: `cubic-bezier(0.32, 0.72, 0, 1)` (iOS feel)
- Durations: 200 / 240 / 280 ms

### Signature pattern: "Eyebrow lockup"
Red mono caps + 32px trailing rule. Used above section titles, above hero numerals.
```
SQUAT — ATTEMPT 2 ─────
        265 KG
```

---

## What I need from you

Produce **two artifacts**:

### 1. `tailwind.config.ts`

A Tailwind v3 config that:
- Implements all tokens above as Tailwind theme extensions (colors, spacing, fontFamily, fontSize, borderRadius, transitionTimingFunction)
- Supports `dark:` prefix correctly (dark is default; CSS variable swap when `[data-theme="light"]` on root)
- Uses CSS variables under the hood so we can change theme without rebuild
- Type-safe (full TypeScript types)
- Imports nothing else — single self-contained file

### 2. `src/index.css`

A CSS file that:
- Includes `@tailwind base; @tailwind components; @tailwind utilities;` directives
- Defines all CSS variables in `:root` (dark) and `:root[data-theme="light"]` (light)
- Defines a few utility classes that are awkward in pure Tailwind: `.eyebrow`, `.t-display-numeral`, `.t-display-unit`, `.t-mono-label`, `.t-tabular`
- Sets `font-feature-settings: "tnum"` globally for tabular numerals
- Resets/normalizes per modern CSS standards (no need for full reset — Tailwind preflight handles most)

---

## Design priorities for MeetCard specifically

Beyond mirroring MeetPR's tokens, prioritize these for the meetcard use case:

1. **Numbers are the hero** — total kg, ranking position, "举多少能反超" delta. These should use `displayNumeral` style with brand-red `displayUnit` next to them. Tabular numerals required (avoid digit-jitter when total updates from 250 → 252.5)

2. **Tap targets ≥56px on mobile** — coach uses thumb between attempts, can't aim. Push `--hit-min` from 44px to 56px specifically for `/live` route

3. **High-contrast in dark for sunlit phone screens** — meet venues sometimes have skylights or photo lighting; pure-black bg + pure-white fg gives best legibility

4. **No decorative animation in `/live` view** — every motion costs decision-time. State transitions only (e.g., ranking position change shows brief glow). No marketing-app spring bounces

5. **Eyebrow lockup is the signature** — use it above athlete name, above section dividers, above hero numerals. It's the visual signature that ties MeetCard back to MeetPR

6. **Numeric input styling** — large 44px minimum height, mono font, brand-red caret, NO browser default arrows on `<input type="number">`

---

Output the two files (`tailwind.config.ts` + `src/index.css`) ready to drop into a Vite + React + TypeScript project. Do not add explanatory text; just the files.
