import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SLUG = "greenhouse-affair";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fx-3d", "on"));
});

test("the 3D lab: hotspots open puzzles as sheets and the case file as a drawer", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(String(e)));

  await page.goto(`/play/${SLUG}`);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Open the case file" }).click();

  // Hotspot labels are real buttons over the scene.
  const drawerHotspot = page.getByRole("button", { name: /^Case file · 6/ });
  await expect(drawerHotspot).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("Sealed lead")).toHaveCount(7);

  await page.getByRole("button", { name: /The Locked Desk Drawer.*Open/ }).click();
  const keypad = page.getByRole("group", { name: "Desk drawer keypad" });
  for (const d of "6092") await keypad.getByRole("button", { name: d, exact: true }).click();
  await keypad.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("article", { name: "The Locked Desk Drawer" }).getByText("Solved", { exact: true })).toBeVisible();

  // Escape returns to the lab, where the station now reads Solved and a new one is open.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /The Locked Desk Drawer.*Solved/ })).toBeVisible();
  await expect(page.getByRole("button", { name: /Reconstruct the Timeline.*Open/ })).toBeVisible();

  await page.getByRole("button", { name: /Case file & tasks/ }).click();
  const drawer = page.getByRole("navigation", { name: "Case file" });
  await expect(drawer.getByRole("button", { name: /Glasshouse Door Keypad Log/ })).toBeVisible();
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);

  // Opening evidence from the drawer shows it in the sheet.
  await drawer.getByRole("button", { name: /Field Notebook/ }).click();
  await expect(page.getByRole("heading", { name: "Field Notebook (page 41)" })).toBeVisible();

  // The flat layout is one click away.
  await page.getByRole("button", { name: "3D", exact: true }).click();
  await expect(page.locator("canvas")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("the archive shelf opens a case", async ({ page, isMobile }) => {
  await page.goto("/cases");
  // Phones see a still poster until they ask for the live scene; desktops load it on first interaction.
  if (isMobile) await page.getByRole("button", { name: "View in 3D" }).click();
  else await page.mouse.move(200, 200);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  const open = page.getByRole("button", { name: "Open The Greenhouse Affair" });
  await expect(open).toBeVisible();
  await open.click();
  // Software WebGL in CI is slow to yield the main thread; real GPUs navigate immediately.
  await expect(page).toHaveURL(new RegExp(`/play/${SLUG}`), { timeout: 15_000 });
});

test("the landing hero shows a poster first, then the live scene", async ({ page, isMobile }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("The evidence is on your desk.");
  await expect(page.locator("canvas")).toHaveCount(0);
  if (isMobile) await page.getByRole("button", { name: "View in 3D" }).click();
  else await page.mouse.move(300, 300);
  await expect(page.locator("canvas")).toBeVisible({ timeout: 30_000 });
  const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  expect(axe.violations.filter((v) => v.impact === "serious" || v.impact === "critical").map((v) => v.id)).toEqual([]);
});
