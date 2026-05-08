import { useEffect, useState } from "react";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { LiveRoute } from "./routes/Live";
import { PlanRoute } from "./routes/Plan";
import { WarmupRoute } from "./routes/Warmup";
import { decodeShare } from "./lib/share";
import { applyImport } from "./lib/import";

function ImportHandler({ data, fresh }: { data: string; fresh: boolean }) {
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    (async () => {
      const payload = decodeShare(data);
      if (!payload) {
        setError("链接无效或损坏");
        return;
      }
      await applyImport(payload, { fresh });
      window.location.replace("/live");
    })();
  }, [data, fresh]);
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
