# MeetCard

Powerlifting coach companion for Chinese力量举 meets. Pre-meet planner (replaces Greg Nuckols-style Excel) plus at-meet live competitor comparison (the wedge that doesn't exist in Excel).

V1 ships **2026-05-07** for xty (顶级教练 + 男子公开 83KG 三项全国纪录持有者). Long-term port target: MeetPR iOS app's "比赛模式" feature.

## Quick start

```bash
npm install
npm run dev          # http://localhost:5173
npm run build        # production build → dist/
npm run preview      # preview production build locally
```

## Stack

- **React 18 + Vite + TypeScript** — speed-first dev loop
- **Tailwind CSS** — tokens mirror [MeetPR DesignSystem](../MeetPR/specs/003-design-system-foundation) (dark-first, brand-red `#E5221E`, industrial powerlifting aesthetic)
- **Dexie.js (IndexedDB)** — local-only persistence, no backend in V1
- **vite-plugin-pwa** — Service Worker auto-generates app shell cache, works offline at meet
- **Cloudflare Pages** — deployment (Vercel/Netlify access from mainland China is unreliable)

## Layout

```
.
├── data/                      # JSON tables exported from xty's Excel (committed)
│   └── tables.json            # IPF GL coefficients, formula constants, plate jumps, RPE bins
├── scripts/                   # Python utilities
│   └── export_excel_tables.py # Re-run if xty's Excel template updates
├── src/
│   ├── main.tsx
│   ├── App.tsx                # Day-1 hello world (replace with /setup + /live)
│   ├── db.ts                  # Dexie schema
│   ├── types.ts               # Domain types
│   └── index.css              # Tailwind directives + design tokens (CSS vars)
├── public/
│   └── _headers               # Cloudflare Pages cache + security headers
├── tailwind.config.ts         # Tailwind theme = MeetPR tokens
├── vite.config.ts             # Vite + PWA plugin
└── design-prompt.md           # Send this to claude design to get tokens.json refinement
```

## Deployment

```bash
npm run build
npx wrangler pages deploy dist --project-name meetcard
```

Cloudflare Pages auto-deploys on `git push` once the project is connected to the repo.

## Day-by-day plan

See `~/.gstack/projects/meetcard/david-meetcard-design-20260502.md` for the full 5-day execution plan + cut criteria.
