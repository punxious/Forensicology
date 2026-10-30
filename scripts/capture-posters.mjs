/**
 * Captures still posters of the marketing 3D scenes, used as instant
 * backgrounds before the live scene loads.
 *
 *   pnpm dev            (in another terminal)
 *   node scripts/capture-posters.mjs [baseUrl]
 *
 * Re-run after changing LandingScene or GalleryScene.
 */
import { chromium } from "@playwright/test";

const base = process.argv[2] ?? "http://localhost:3000";
const shots = [
  { path: "/?scene=1", out: "public/posters/landing-desktop.jpg", viewport: { width: 1600, height: 900 } },
  { path: "/?scene=1", out: "public/posters/landing-mobile.jpg", viewport: { width: 430, height: 820 }, scale: 2 },
  { path: "/cases?scene=1", out: "public/posters/archive-desktop.jpg", viewport: { width: 1600, height: 820 } },
  { path: "/cases?scene=1", out: "public/posters/archive-mobile.jpg", viewport: { width: 430, height: 680 }, scale: 2 },
];

const browser = await chromium.launch({ args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"] });
for (const s of shots) {
  const ctx = await browser.newContext({ viewport: s.viewport, deviceScaleFactor: s.scale ?? 1, colorScheme: "dark", reducedMotion: "reduce" });
  await ctx.addInitScript(() => localStorage.setItem("fx-3d", "on"));
  const page = await ctx.newPage();
  await page.goto(base + s.path);
  const canvas = page.locator("canvas");
  await canvas.waitFor({ state: "visible", timeout: 60_000 });
  // Hide all page text and labels so only the 3D scene is captured.
  await page.addStyleTag({ content: "body * { visibility: hidden !important; } canvas { visibility: visible !important; }" });
  await page.waitForTimeout(4000);
  await canvas.screenshot({ path: s.out, type: "jpeg", quality: 70 });
  console.log("✔", s.out);
  await ctx.close();
}
await browser.close();
