# MeetCard

Powerlifting coach companion for Chinese力量举 meets. Pre-meet planner (replaces Greg Nuckols-style Excel) plus at-meet live competitor comparison (the wedge that doesn't exist in Excel).

V1 ships **2026-05-07** for xty (顶级教练 + 男子公开 83KG 三项全国纪录持有者). Long-term port target: MeetPR iOS app's "比赛模式" feature.

> 📦 **V1 已 ship。Post-V1 features 暂停,等 MeetPR iOS V0 ship 后再启动**(set 2026-05-09)
>
> meetcard 是 wedge,服务 1 个用户(xty)。V1 已 ship 验证了 planner UX 假设,**2026-05-10 又落了一批 xty 现场反馈改动**(/live SQ·BN 堆叠、DL 5 档、持久 `↶` 撤销、/plan 三档合计)。**iOS V0 是真正的目标**(见 `~/Brain/wiki/projects/MeetPR/roadmap.md`)。
>
> **现在到 iOS V0 ship,在 meetcard 允许做的:**
> - **P0 bug**(at-meet day broken = 不可接受)即修
> - **xty 在使用中提的 < 10 分钟小调整**(一两行 CSS / 复制文案 / 数字四舍五入等)
>
> **不允许做的:**
> - 任何新 feature / 新页面 / 新功能
> - 视觉 redesign
> - 重构 / 架构清理 / 测试补全
> - "顺便加一下..." 类小扩展(它们会变多)
>
> **Unfreeze trigger(状态更新 2026-07-03):** 原始 trigger = "iOS V0 通过 Apple 审核"。MeetPR iOS 已于 **2026-06-27 起 TestFlight 内测**,但严格口径的 **App Store 正式上架审核通过尚未满足**(TestFlight 内测 ≠ App Store 审核)。**当前继续冻结、还是就此解冻进入"比赛模式"port 到 iOS 的 spec 阶段 —— 待 David 拍板。**

📖 **教练使用教程**(现场操作全流程 + FAQ):见 [`docs/教练使用教程.md`](docs/教练使用教程.md)。

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
│   ├── App.tsx                # Router: /plan (desktop pre-meet) + /live (mobile at-meet) + /warmup
│   ├── routes/
│   │   ├── Plan.tsx           # Desktop pre-meet planner: 3-tier presets + notes + warmup ramp
│   │   ├── Live.tsx           # Mobile at-meet: overtake math + per-attempt ✓/✗
│   │   └── Warmup.tsx         # Warmup ramp confirmation screen
│   ├── components/            # Reusable UI (NumInput, AttemptChip, LiftGlyph, LiveButton, …)
│   ├── lib/                   # Domain logic (overtake / ranking / warmup / share / seed) + tests
│   ├── sample-data.ts         # Demo athlete + rival seed data
│   ├── db.ts                  # Dexie schema
│   ├── types.ts               # Domain types
│   └── index.css              # Tailwind directives + design tokens (CSS vars)
├── public/
│   └── _headers               # Cloudflare Pages cache + security headers
├── docs/                      # Coach tutorial (教练使用教程.md) + archive/ (one-shot design prompts)
├── tailwind.config.ts         # Tailwind theme = MeetPR tokens
└── vite.config.ts             # Vite + PWA plugin
```

## Deployment

```bash
npm run build
npx wrangler pages deploy dist --project-name meetcard
```

Cloudflare Pages auto-deploys on `git push` once the project is connected to the repo.

## Day-by-day plan

See `~/.gstack/projects/meetcard/david-meetcard-design-20260502.md` for the full 5-day execution plan + cut criteria.
