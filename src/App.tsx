import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { LiveRoute, planToTrio, DEFAULT_MEET_ID } from "./routes/Live";
import { PlanRoute } from "./routes/Plan";
import { WarmupRoute } from "./routes/Warmup";
import { decodeShare } from "./lib/share";
import { db } from "./db";

function ImportHandler({ data }: { data: string }) {
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
            rivals: [],
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
    if (importData) return <ImportHandler data={importData} />;
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
