/**
 * Mobile warmup detail page.
 *
 * Shown when the coach taps the "热身" link on /live. Renders the WarmupCard
 * for the current focus lift (auto-derived from `nextPending`) with full
 * countdown timers + coach time estimation. Persists state back to the
 * LiveSession in IndexedDB so navigating between /live and /warmup keeps
 * timer state in sync.
 */
import { useEffect, useRef, useState } from "react";
import { db } from "../db";
import type { Lift, LiveSession } from "../types";
import { maybeSeedFromUrl } from "../lib/seed";
import { WarmupCard, nextPending } from "./Live";

const DEFAULT_MEET_ID = "default-meet";
const LIFT_KEY: Record<Lift, "squat" | "bench" | "dead"> = {
  S: "squat",
  B: "bench",
  D: "dead",
};

export function WarmupRoute() {
  const [session, setSession] = useState<LiveSession | null>(null);
  const [loaded, setLoaded] = useState(false);
  const saveTimer = useRef<number | null>(null);

  useEffect(() => {
    (async () => {
      await maybeSeedFromUrl();
      const existing = await db.liveSessions.get(DEFAULT_MEET_ID);
      if (existing) setSession(existing);
      setLoaded(true);
    })();
  }, []);

  useEffect(() => {
    if (!session) return;
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(async () => {
      await db.liveSessions.put({
        ...session,
        updatedAt: new Date().toISOString(),
      });
    }, 500);
    return () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
    };
  }, [session]);

  if (!loaded) {
    return (
      <div
        style={{
          padding: 24,
          color: "var(--fg-tertiary)",
          minHeight: "100vh",
          background: "var(--bg)",
        }}
      >
        加载中…
      </div>
    );
  }

  if (!session) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "var(--bg)",
          padding: 24,
          color: "var(--fg-primary)",
        }}
      >
        <a
          href="/live"
          style={{
            color: "var(--fg-tertiary)",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ← /live
        </a>
        <div
          style={{
            marginTop: 24,
            color: "var(--fg-tertiary)",
            fontSize: 14,
          }}
        >
          没有现场会话,先在 /live 选一个运动员。
        </div>
      </div>
    );
  }

  const next = nextPending(session.mine);
  // URL `?lift=S|B|D` overrides the auto-derived focus, so the coach can
  // preview any lift's warmup independently of meet progress.
  const params = new URLSearchParams(window.location.search);
  const liftParam = params.get("lift");
  const validLift =
    liftParam === "S" || liftParam === "B" || liftParam === "D"
      ? (liftParam as Lift)
      : null;
  const focusLift: Lift = validLift ?? next?.lift ?? "S";
  const openerWeight = session.mine[LIFT_KEY[focusLift]][0].weight;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg)",
        color: "var(--fg-primary)",
      }}
    >
      <header
        style={{
          padding: "14px 16px",
          borderBottom: "1px solid var(--border)",
          background: "var(--surface-1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <a
          href="/live"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            color: "var(--fg-primary)",
            textDecoration: "none",
            fontSize: 14,
          }}
        >
          ←{" "}
          <span style={{ color: "var(--fg-tertiary)", fontSize: 12 }}>
            返回现场反超
          </span>
        </a>
        <div style={{ display: "flex", flexDirection: "column", textAlign: "right" }}>
          <span className="t-body-emph">热身详情</span>
          <span className="t-footnote">
            {focusLift === "S" ? "深蹲" : focusLift === "B" ? "卧推" : "硬拉"} 开把 {openerWeight ?? "—"} kg
          </span>
        </div>
      </header>

      <main
        style={{
          padding: 14,
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        {!next && (
          <div
            style={{
              padding: 16,
              background: "var(--green-soft)",
              border: "1px solid var(--green)",
              borderRadius: 8,
              color: "var(--green)",
              fontSize: 14,
            }}
          >
            九把已全部完成 — 没有热身可显示。下方是最后一把所属动作的热身参考。
          </div>
        )}
        <WarmupCard
          lift={focusLift}
          openerWeight={openerWeight}
          estTime={session.openerEstTimes?.[focusLift] ?? ""}
          onChangeEstTime={(v) =>
            setSession({
              ...session,
              openerEstTimes: {
                ...(session.openerEstTimes ?? {}),
                [focusLift]: v,
              },
            })
          }
          timers={session.warmupTimers ?? {}}
          onChangeTimers={(t) =>
            setSession({ ...session, warmupTimers: t })
          }
        />

        <button
          onClick={async () => {
            // Clear this lift's rest timers (no longer needed once warmup
            // is done), then navigate back to /live.
            const prefix =
              focusLift === "S" ? "SQ-" : focusLift === "B" ? "BN-" : "DL-";
            const cleaned: typeof session.warmupTimers = {};
            for (const [k, v] of Object.entries(session.warmupTimers ?? {})) {
              if (!k.startsWith(prefix)) cleaned[k] = v;
            }
            const nextSession = {
              ...session,
              warmupTimers: cleaned,
              warmupDone: {
                ...(session.warmupDone ?? {}),
                [focusLift]: true,
              },
              updatedAt: new Date().toISOString(),
            };
            setSession(nextSession);
            // Persist immediately so the back-navigation lands on fresh state.
            await db.liveSessions.put(nextSession);
            window.location.href = "/live";
          }}
          style={{
            marginTop: 8,
            padding: "14px 16px",
            background: "var(--green)",
            border: "none",
            borderRadius: 12,
            color: "#fff",
            fontSize: 16,
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          热身完成 ✓
        </button>
      </main>
    </div>
  );
}
