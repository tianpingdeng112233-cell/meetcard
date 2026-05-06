import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg"],
      manifest: {
        name: "MeetCard",
        short_name: "MeetCard",
        description: "Powerlifting coach companion — pre-meet plan + at-meet live ranking",
        theme_color: "#000000",
        background_color: "#000000",
        display: "standalone",
        orientation: "portrait",
        start_url: "/",
        scope: "/",
        lang: "zh-CN",
        icons: [
          {
            src: "/favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable",
          },
        ],
      },
      workbox: {
        // Self-hosted fonts (JetBrains Mono) ship as woff2 in dist/assets and
        // are precached. Chinese type falls back to system PingFang SC.
        // No runtime fetches to fonts.googleapis.com — works fully offline.
        globPatterns: ["**/*.{js,css,html,ico,png,svg,woff2,json}"],
      },
      devOptions: {
        enabled: false,
      },
    }),
  ],
  server: {
    port: Number(process.env.PORT) || 5173,
    host: true,
  },
  build: {
    target: "es2020",
    sourcemap: true,
  },
});
