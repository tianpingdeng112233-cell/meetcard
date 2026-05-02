import { useEffect, useState } from "react";
import { dbSmokeTest } from "./db";

/**
 * Smoke-test UI. Verifies the toolchain is wired up correctly:
 *  - React renders
 *  - Tailwind tokens load
 *  - IndexedDB (Dexie) read/write works
 *  - PWA service worker registers (in production build)
 *
 * Replace with real /setup + /live routes once tokens.json comes in.
 */
export function App() {
  const [smokeOk, setSmokeOk] = useState<boolean | null>(null);
  const [meetCount, setMeetCount] = useState<number>(0);

  useEffect(() => {
    let mounted = true;
    dbSmokeTest().then((r) => {
      if (!mounted) return;
      setSmokeOk(r.ok);
      setMeetCount(r.meetCount);
    });
    return () => {
      mounted = false;
    };
  }, []);

  const isOnline = typeof navigator !== "undefined" && navigator.onLine;

  return (
    <div className="min-h-screen bg-bg text-fg-primary px-base py-xl">
      <div className="max-w-2xl mx-auto space-y-xl">
        {/* Eyebrow lockup */}
        <div className="space-y-md">
          <div className="eyebrow">MEETCARD · DAY 1</div>
          <h1 className="font-display text-title-1">
            Powerlifting <span className="text-brand">Coach</span> Companion
          </h1>
          <p className="text-fg-secondary text-body">
            赛前规划 + 现场实时对手对比。Pre-meet plan plus at-meet live ranking.
          </p>
        </div>

        {/* Hero numeral demo — this is the displayNumeral style */}
        <div className="bg-surface-1 border border-border rounded-lg p-lg">
          <div className="t-mono-label mb-sm">CURRENT BEST · TOTAL</div>
          <div className="flex items-baseline gap-sm">
            <span className="t-display-numeral">763</span>
            <span className="t-display-unit">KG</span>
          </div>
          <div className="text-footnote text-fg-tertiary mt-sm">
            xty 当前 83KG 公开组全国纪录 · 2025.06.22
          </div>
        </div>

        {/* Smoke test panel */}
        <div className="bg-surface-1 border border-border rounded-lg p-lg space-y-md">
          <div className="eyebrow">SYSTEM CHECK</div>
          <ul className="space-y-sm text-body">
            <li className="flex items-center gap-md">
              <span className={`inline-block w-2 h-2 rounded-pill ${smokeOk === true ? "bg-green" : smokeOk === false ? "bg-brand" : "bg-fg-tertiary"}`} />
              <span>
                IndexedDB (Dexie):{" "}
                <span className="t-mono text-fg-secondary">
                  {smokeOk === null ? "checking…" : smokeOk ? `OK (${meetCount} meet rows)` : "FAILED"}
                </span>
              </span>
            </li>
            <li className="flex items-center gap-md">
              <span className={`inline-block w-2 h-2 rounded-pill ${isOnline ? "bg-green" : "bg-amber"}`} />
              <span>
                Network: <span className="t-mono text-fg-secondary">{isOnline ? "online" : "offline (PWA cached)"}</span>
              </span>
            </li>
            <li className="flex items-center gap-md">
              <span className="inline-block w-2 h-2 rounded-pill bg-green" />
              <span>
                React + Tailwind tokens: <span className="t-mono text-fg-secondary">rendered</span>
              </span>
            </li>
          </ul>
        </div>

        {/* Big tap target demo — at-meet primary actions */}
        <div className="grid grid-cols-2 gap-md">
          <button
            className="min-h-row-min bg-green/20 border border-green text-green font-bold rounded-md transition-colors duration-fast ease-ios active:bg-green/30"
            type="button"
          >
            ✓ GOOD LIFT
          </button>
          <button
            className="min-h-row-min bg-brand-soft border border-brand text-brand font-bold rounded-md transition-colors duration-fast ease-ios active:bg-brand/30"
            type="button"
          >
            ✗ NO LIFT
          </button>
        </div>

        <div className="text-caption text-fg-tertiary pt-xl">
          Day 1 hello world. Replace with /setup + /live routes once design tokens land.
        </div>
      </div>
    </div>
  );
}
