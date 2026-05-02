import { BrowserRouter, Route, Routes } from "react-router-dom";
import { AttemptEntry } from "./routes/AttemptEntry";
import { Comparison } from "./routes/Comparison";
import { Index } from "./routes/Index";
import { LiveScreen } from "./routes/Live";
import { Setup } from "./routes/Setup";

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Index />} />
        <Route path="/live" element={<LiveScreen />} />
        <Route path="/entry" element={<AttemptEntry />} />
        <Route path="/vs" element={<Comparison />} />
        <Route path="/setup" element={<Setup />} />
      </Routes>
    </BrowserRouter>
  );
}
