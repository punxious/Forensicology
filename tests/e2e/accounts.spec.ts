import { expect, test, type APIRequestContext } from "@playwright/test";

const SLUG = "greenhouse-affair";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem("fx-3d", "off"));
});

/** Solves the rest of the case through the API (same cookies as the page). */
async function finishCase(request: APIRequestContext) {
  const post = (path: string, data: unknown) => request.post(`/api/runs/${SLUG}${path}`, { data });
  const steps: [string, unknown][] = [
    ["timeline", ["t-pruning", "t-felix-visit", "t-train", "t-call", "t-lib-exit", "t-door-in", "t-door-out", "t-lib-entry", "t-sms"]],
    ["statements", ["wren-4", "wren-5", "felix-1"]],
    ["alibis", [["n-wren", "n-library"], ["n-hollis", "n-minutes"], ["n-felix", "n-ticket"]]],
  ];
  for (const [puzzleId, answer] of steps) expect((await (await post("/attempt", { puzzleId, answer })).json()).correct).toBe(true);
  expect((await (await post("/lab", { puzzleId: "lab", sample: "flask", test: "glycoside" })).json()).solved).toBe(true);
  const marks = ["A3", "B2", "B4", "C3", "C5", "D2"].map((cell) => ({ cell, type: "dot" }));
  expect((await (await post("/attempt", { puzzleId: "fingerprint", answer: { card: "card-wren", marks } })).json()).correct).toBe(true);
  expect((await (await post("/attempt", { puzzleId: "journal", answer: "NERIUM" })).json()).correct).toBe(true);
  const end = await (await post("/attempt", { puzzleId: "accusation", answer: { suspect: "wren", motive: "data", method: "oleander" } })).json();
  expect(end.view.result.rank.label).toBeTruthy();
}

test("anonymous progress is kept after signing in, then scores reach the leaderboard", async ({ page }, info) => {
  const email = `examiner-${info.project.name}@example.com`;
  const name = `Ada ${info.project.name === "mobile" ? "M" : "D"}`;

  // Play anonymously and solve the first task.
  await page.goto(`/play/${SLUG}`);
  await page.getByRole("button", { name: "Open the case file" }).click();
  const back = page.getByRole("button", { name: "← Back to case file" });
  const nav = page.getByRole("navigation", { name: "Case file" });
  await nav.getByRole("button", { name: /The Locked Desk Drawer/ }).click();
  const keypad = page.getByRole("group", { name: "Desk drawer keypad" });
  for (const d of "6092") await keypad.getByRole("button", { name: d, exact: true }).click();
  await keypad.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByRole("article", { name: "The Locked Desk Drawer" }).getByText("Solved", { exact: true })).toBeVisible();

  // The save prompt (in the case file) leads to sign-in, which returns to the case with progress intact.
  if (await back.isVisible()) await back.click();
  await page.getByRole("complementary", { name: "Save your progress" }).getByRole("link", { name: "Sign in" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: /Sign in/ }).click();
  await expect(page).toHaveURL(new RegExp(`/play/${SLUG}`));
  if (await back.isVisible()) await back.click();
  await expect(nav.getByRole("button", { name: /The Locked Desk Drawer.*Solved/ })).toBeVisible();

  // The account page shows the run in progress; opt in to leaderboards.
  await page.goto("/account");
  await expect(page.getByText(email)).toBeVisible();
  await expect(page.getByText(/1 of 8 tasks solved/)).toBeVisible();
  await page.getByRole("textbox", { name: /^Display name/ }).fill(name);
  await page.getByLabel(/Show me on leaderboards/).check();
  await page.getByRole("button", { name: "Save settings" }).click();
  await expect(page.getByText("✔ Saved.")).toBeVisible();

  // Finish the case; the result appears on the leaderboard and the account page.
  await finishCase(page.request);
  await page.goto(`/cases/${SLUG}/leaderboard`);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toBeVisible();
  await expect(page.getByText(/You're #\d+ on this board/)).toBeVisible();
  await page.goto("/account");
  await expect(page.getByRole("row", { name: /The Greenhouse Affair/ })).toBeVisible();
  await expect(page.getByText("Cases solved")).toBeVisible();

  // Delete the account: everything goes, including the leaderboard entry.
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete my account" }).click();
  await expect(page).toHaveURL(/\/\?account=deleted/);
  await page.goto(`/cases/${SLUG}/leaderboard`);
  await expect(page.getByRole("row", { name: new RegExp(name) })).toHaveCount(0);
  await page.goto("/account");
  await expect(page).toHaveURL(/\/login\?next=%2Faccount|\/login\?next=\/account/);
});

test("the landing page has pricing, FAQ and legal links, and no placeholder testimonials in production", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Pricing" })).toBeVisible();
  await expect(page.getByText("All prices in Australian dollars and include GST.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Questions" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Solve it together" })).toBeVisible();
  await expect(page.getByText("Placeholder", { exact: true })).toHaveCount(0);
  for (const [link, heading] of [["Terms", "Terms of use"], ["Privacy", "Privacy policy"], ["Refunds", "Refund policy"]]) {
    await page.goto("/");
    await page.getByRole("contentinfo").getByRole("link", { name: link }).click();
    await expect(page.getByRole("heading", { level: 1, name: heading })).toBeVisible();
    await expect(page.getByText("Draft for review.")).toBeVisible();
  }
});
