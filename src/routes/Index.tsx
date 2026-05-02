import { Link } from "react-router-dom";
import { Eyebrow } from "../components/Eyebrow";

const ROUTES = [
  {
    path: "/live",
    title: "/live · 反超 hero",
    desc: "默认 · 8 人 M83 同级 · 反超所需 kg",
    surface: "Mobile · 390×780",
  },
  {
    path: "/live?demo=xty",
    title: "/live · xty 真实场景",
    desc: "小杰 71.9F vs 米米 56.5F · 跨级 IPF GL · 当前需 +29 GL 反超",
    surface: "Mobile · 390×780",
  },
  {
    path: "/live?hero=rank",
    title: "/live · 排名 hero",
    desc: "当前排名作为焦点",
    surface: "Mobile · 390×780",
  },
  {
    path: "/live?hero=gap",
    title: "/live · 总差距 hero",
    desc: "距第一名多少 kg",
    surface: "Mobile · 390×780",
  },
  {
    path: "/entry",
    title: "/entry · 试举录入",
    desc: "数字键盘 + ±0.5/±2.5 快调 + 上举/失败",
    surface: "Mobile · 390×780",
  },
  {
    path: "/vs",
    title: "/vs · 对手对比 (默认)",
    desc: "8 人 flight, 同级 total · 三档建议",
    surface: "Mobile · 390×780",
  },
  {
    path: "/vs?demo=xty",
    title: "/vs · xty H2H",
    desc: "小杰 vs 米米 · 跨级 GL · IPF GL 行可见",
    surface: "Mobile · 390×780",
  },
  {
    path: "/setup",
    title: "/setup · 赛前编排",
    desc: "8 人运动员表 + RPE 分支预案 + 满成投影",
    surface: "Desktop · 1440×900",
  },
];

export function Index() {
  return (
    <div
      className="mc-root"
      style={{
        background: "var(--bg)",
        minHeight: "100vh",
        padding:
          "calc(env(safe-area-inset-top) + 32px) 24px calc(env(safe-area-inset-bottom) + 32px)",
      }}
    >
      <div style={{ maxWidth: 880, margin: "0 auto" }}>
        <Eyebrow style={{ marginBottom: 12 }} meta="V1 · 2026-05">
          MEETCARD · 设计原型
        </Eyebrow>
        <h1
          className="t-title-1"
          style={{ marginBottom: 8, color: "var(--fg-primary)" }}
        >
          力量举教练 · 现场陪伴
        </h1>
        <p
          className="t-body"
          style={{ color: "var(--fg-secondary)", marginBottom: 32 }}
        >
          5 个 mobile 屏 + 1 个 desktop 屏。下面任意一个进入，PWA 已在
          Service Worker 缓存，离线可用。
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {ROUTES.map((r) => (
            <Link
              key={r.path}
              to={r.path}
              style={{
                background: "var(--surface-1)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 18,
                color: "inherit",
                textDecoration: "none",
                display: "flex",
                flexDirection: "column",
                gap: 6,
                transition: "border-color 200ms var(--ease-ios)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-red)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
              }}
            >
              <span
                className="t-mono-label"
                style={{ color: "var(--fg-tertiary)" }}
              >
                {r.surface}
              </span>
              <span className="t-headline">{r.title}</span>
              <span
                className="t-footnote"
                style={{ color: "var(--fg-secondary)" }}
              >
                {r.desc}
              </span>
            </Link>
          ))}
        </div>

        <div
          style={{
            marginTop: 48,
            padding: 16,
            background: "var(--surface-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            color: "var(--fg-tertiary)",
            fontSize: 13,
            lineHeight: 1.6,
          }}
        >
          <strong style={{ color: "var(--fg-secondary)" }}>注</strong> · V1
          全部数据用 demo fixture (8 人, 男子 83KG, 蹲举完赛, 卧推进行中)。
          V1.5 起接 Dexie + 比赛 setup CRUD;
          V1.5 起 simulator 升级为「双边场景表格」(基于 xty 2026-05-02
          手算原型)。
        </div>
      </div>
    </div>
  );
}
