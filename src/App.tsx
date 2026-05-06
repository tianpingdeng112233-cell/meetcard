import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { LiveRoute } from "./routes/Live";
import { PlanRoute } from "./routes/Plan";
import { WarmupRoute } from "./routes/Warmup";

function RootRedirect() {
  if (typeof window !== "undefined") {
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
