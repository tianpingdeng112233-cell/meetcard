# MeetCard — bilateral scenario simulator (V1.x design)

> **Hand this entire file to claude design (claude.ai/design).** It's self-contained; the design agent doesn't need to see the codebase.

---

## Context for the design agent

MeetCard is a powerlifting coach companion PWA. V1 ships **2026-05-07** for xty (顶级教练 + 男子公开 83KG 三项全国纪录持有者). The visual design language is already locked — see your prior `MeetCard.html` handoff with `tokens.css`, the `Eyebrow / HeroNumeral / AttemptChip / LiveButton / Avatar / LiftGlyph / Dot` components, dark-first surfaces, brand red `#E5221E`, Noto Sans SC heavy for hero numerals, eyebrow lockup with red rule. **Do not invent new visual primitives** — reuse existing ones.

You're being asked to extend the existing `/vs` mobile screen (head-to-head Comparison, 390×780 inside iOS frame) with a new section: a **bilateral scenario simulator table**.

---

## What changes

The current `/vs` screen ends with a "**建议方案**" section that's three hand-picked recommendation cards (稳/推荐/险). **Replace this section entirely** with the bilateral simulator below. Keep the rest of `/vs` (header, H2H avatars, "反超所需" hero card, "分项最佳成绩" rows) **exactly as-is**.

---

## Why this section exists (the wedge)

The user (xty) doesn't want a 3-card recommendation engine. He wants to **scan and edit a multi-row table** of paired (my next attempt, rival next attempt) hypotheticals — **this is exactly what he was already doing manually in WeChat Notes**. Replacing that workflow is the core wedge over Excel.

Important framing: **the flight is N people** (could be 8, 12, 20). The simulator is **a decision aid for ONE coach-tracked athlete (mine) vs ONE chosen rival**, paired-attempt by paired-attempt. The rival is selectable from the flight (default = next-rank athlete). **It is not a 2-person product**.

---

## xty's original artifact (the table to mirror)

xty filed this as a WeChat Note 2026-05-02 23:14 while planning his student 小杰's third deadlift attempt against rival 米米:

**Athletes**:
- 小杰 (his student) — 71.9 kg, F
- 米米 (rival) — 56.5 kg, F (different weight class)

**Already done** (squat + bench best):
- 小杰: 190 SQ + 95 BN = 285 → IPF GL 57.75
- 米米: 165 SQ + 77.5 BN = 242.5 → IPF GL 57.26

**Six paired hypotheticals he iterated**:

| # | 米米 DL | 米米 total | 米米 GL | 小杰 DL | 小杰 total | 小杰 GL | Δ GL |
|---|---------|------------|---------|---------|------------|---------|------|
| 1 (开把) | 170 | 412.5 | 97.40 | 195 | 480 | 97.27 | **−0.13** ❌ |
| 2 | 177.5 | 420 | 99.17 | 205 | 490 | 99.29 | +0.12 ✓ |
| 3 | 180 | 422.5 | 99.77 | 210 | 495 | 100.31 | +0.54 ✓ |
| **4** ⭐ | **182.5** | **425** | **100.36** | **212.5** | **497.5** | **100.81** | **+0.45 ✓** |
| 5 | 185 | 427.5 | 100.95 | 213.5 | 498.5 | 101.02 | +0.07 ✓ |
| 6 | 187.5 | 430 | 101.54 | 216.5 | 501.5 | 101.62 | +0.08 ✓ |

He underlined row 4 + handwrote "**496 能行**" — meaning "if 小杰 only hits 496 total (DL=211, conservative), still wins".

Use these exact numbers as the populated-state fixture for your prototype.

---

## What you ship

A new section component to drop into `/vs` after "分项最佳成绩". It replaces the existing "建议方案" 3-card group entirely.

### Section header

- **Eyebrow**: `双边场景模拟 · 我 vs 对手`
- **Right side of eyebrow row**: rival switcher dropdown showing current rival name + chevron `▾`. Tapping opens a bottom sheet listing all flight athletes (could be 8-20 people) with name + weight class + IPF GL + their projected total. Selecting a different rival recomputes all rows' Δ GL.

### Table

Six columns:

| `#` | `My DL` | `Rival DL` | `Δ GL` | `Note` | `⭐` |
|-----|---------|------------|--------|--------|------|

- **`My DL`** and **`Rival DL`** are inline-editable number cells. Tap to focus → ±2.5 stepper plate-jump pills appear above the row (`-2.5 / -0.5 / +0.5 / +2.5`), or numeric pad for free entry.
- **`Δ GL`** is computed:
  - `< 0` → red text + ❌ icon
  - `0 ≤ Δ < +0.20` → amber text + 险 label (险胜 — total kg error of 0.5 could flip)
  - `≥ +0.20` → green text + ✓ icon
- **`Note`** is free-text editable, single-line, max ~12 chars. Common values: "496 能行", "保守", "激进", "险胜".
- **`⭐`** is a tap-to-toggle star icon. **Multi-select allowed** — coach can star both "保守版" and "激进版" simultaneously as parallel plans.

Rows are **draggable to reorder** via long-press. Swipe-left reveals delete.

### Action buttons (below table)

Two buttons, full-width row:

1. **`+ 添加场景`** (secondary variant) — adds an empty row. Default `My DL` = previous row + 2.5 (or athlete's planned 3rd attempt for first row); `Rival DL` = previous row + 2.5 (or rival's projected 3rd).

2. **`+ 反超场景`** (primary, brand-red) — auto-fills:
   - `Rival DL` = rival's currently declared / last best DL (taking the realistic value, not max effort)
   - `My DL` = numerically solved minimum where `Δ GL > 0`, then snapped up to nearest plate-jump increment, then +2.5kg buffer
   - `Note` auto-set to `auto: 反超 (rival N kg)` where N is rival's DL
   - The row is created but NOT auto-starred; coach decides

Below the buttons, show row count summary in `t-caption` style: `6 个场景 · 2 已 ⭐`

### Empty state (no scenarios yet)

- Placeholder card centered, mc-placeholder pattern (striped diagonal)
- Text: `还没有场景。点 + 添加场景 开始模拟。`
- The two action buttons remain visible below.

---

## Edge cases you should design for

1. **Cross-class vs same-class comparison**:
   - If mine + rival are in the **same** weight class (sex × division × class), show ALSO a `Δ Total kg` column between `Rival DL` and `Δ GL`. Same-class lifters compare on raw total + bodyweight tiebreak; GL is secondary signal.
   - If different class, only show `Δ GL`. Most cross-class is the typical case (xty's 71.9F vs 56.5F).

2. **Long table on small screen**:
   - Mobile is 390×780. Six columns is tight. Consider:
     - `Note` can collapse to icon if filled (tap to expand inline)
     - `#` column can be just bullet/avatar
     - Or: horizontal scroll with sticky `My DL`+`Δ GL` as the always-visible columns

3. **Multi-star visual hierarchy**:
   - Starred rows have a subtle red left-border or red row background tint (use `--brand-red-soft`)
   - Multiple stars don't fight visually — each looks independent, not "winner" vs "rest"

4. **Rival projection shifts mid-meet**:
   - When the chosen rival makes/misses an attempt in real life, their "projected total" updates. The simulator's Δ GL recomputes for all rows. Show a brief `mc-flash` animation on rows whose Δ GL changed. Don't auto-edit any user-entered DL kg.

---

## Constraints

- **Reuse existing components** from your prior MeetCard handoff. Specifically: `Eyebrow` (with `meta` prop for rival switcher), `Avatar` (for rival picker bottom sheet), `LiftGlyph` (DL only), `Dot` (status indicator). Do not introduce new shadow / radius / color tokens.
- **Mobile-first** at 390×780 inside iOS frame (same as rest of `/vs`). Reserve the same `safe-area-inset-top` spacer at top and `safe-area-inset-bottom` padding at bottom.
- **Performance**: every cell edit re-renders the row. Smooth, no jank, no flicker. Editable cells should not re-mount on each keystroke.
- **Accessibility**: ⭐ is a button with aria-pressed. Δ GL color is supported by an icon (✓/✗/险) so colorblind users still get the signal.

---

## Deliverable

Same format as your prior MeetCard handoff: HTML/CSS/JSX prototype with multiple artboards in the design canvas. Show this section in **all of these states**:

1. **Populated state** — 6 rows mirroring xty's screenshot table EXACTLY (same numbers, row 4 starred + note "496 能行")
2. **Empty state** — placeholder, no rows
3. **Rival switcher bottom sheet open** — showing 8 athlete rows, current rival highlighted, others tap-to-select
4. **Single row in edit mode** — `My DL` cell focused, plate-jump pills visible, numeric pad open below
5. **Long-press reorder mode** — drag handles visible, one row mid-drag

Drop these as additional `<DCArtboard>` items inside the existing `/vs`-section `<DCSection>` (or a new section called `/vs · simulator` if cleaner).

For all numeric cell content, **use the exact xty numbers above as fixture data**. Do not generate placeholder numbers like 200/250/300 — those won't visually validate that the math + UI work together.

---

## Things you do NOT need to do

- ❌ Don't change the rest of `/vs` (header / H2H avatars / "反超所需" hero / "分项最佳成绩" rows). Untouched.
- ❌ Don't redesign `/live` or `/setup` or `/entry`. They're locked.
- ❌ Don't compute IPF GL points yourself in JS — the production app has the formula. Your prototype can hardcode the GL values from the table above.
- ❌ Don't add a "save" or "submit" button. Edits autosave. The simulator is always-live.
