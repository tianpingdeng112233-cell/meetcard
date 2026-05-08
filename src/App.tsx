import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { LiveRoute, planToTrio, DEFAULT_MEET_ID } from "./routes/Live";
import { PlanRoute } from "./routes/Plan";
import { WarmupRoute } from "./routes/Warmup";
import { decodeShare } from "./lib/share";
import { buildDemoRivals } from "./lib/demoRivals";
import { db } from "./db";

function ImportHandler({ data, fresh }: { data: string; fresh: boolean }) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const payload = decodeShare(data);
      if (!payload) {
        setError("链接无效或损坏");
        return;
      }
      await db.athletes.put(payload.athlete);
      await db.plans.put(payload.plan);
      // ?fresh=1 forces a clean rebuild with demo rivals — useful when
      // re-sharing to a device that already has a live session pinned.
      if (fresh) await db.liveSessions.delete(DEFAULT_MEET_ID);
      const existing = await db.liveSessions.get(DEFAULT_MEET_ID);
      const next = existing
        ? {
            ...existing,
            myAthleteId: payload.athlete.id,
            mine: planToTrio(payload.plan),
            updatedAt: new Date().toISOString(),
          }
        : {
            meetId: DEFAULT_MEET_ID,
            myAthleteId: payload.athlete.id,
            mine: planToTrio(payload.plan),
            // First-time import seeds two demo rivals (same-class + cross-class)
            // so the /live screen has a meaningful overtake demo immediately.
            // Coach can ✕ delete or edit them like any other rival.
            rivals: buildDemoRivals(payload.athlete, payload.plan),
            focus: { lift: "S" as const, attempt: 1 as const },
            updatedAt: new Date().toISOString(),
          };
      await db.liveSessions.put(next);
      window.location.replace("/live");
    })();
  }, [data]);
  return (
    <div
      style={{
        padding: 24,
        color: "var(--fg-primary)",
        background: "var(--bg)",
        minHeight: "100vh",
        fontFamily: "var(--font-sans-cn)",
      }}
    >
      {error ? `导入失败:${error}` : "正在导入规划数据…"}
    </div>
  );
}

function RootRedirect() {
  if (typeof window !== "undefined") {
    const params = new URLSearchParams(window.location.search);
    const importData = params.get("import");
    if (importData) {
      const fresh = params.get("fresh") === "1";
      return <ImportHandler data={importData} fresh={fresh} />;
    }
    const isMobile = window.matchMedia("(max-width: 640px)").matches;
    return <Navigate to={isMobile ? "/live" : "/plan"} replace />;
  }
  return <Navigate to="/plan" replace />;
}

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/plan" element={<PlanRoute />} />
        <Route path="/live" element={<LiveRoute />} />
        <Route path="/warmup" element={<WarmupRoute />} />
      </Routes>
    </BrowserRouter>
  );
}
