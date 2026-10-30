import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

const SLUG = "greenhouse-affair";

async function expectAccessible(page: Page, label: string) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
  const serious = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
  expect(serious.map((v) => `${label}: ${v.id} (${v.nodes.length}) ${v.help}`)).toEqual([]);
}

/** Opens a task from the case file (on phones the case file is its own screen). */
async function openTask(page: Page, title: string) {
  const back = page.getByRole("button", { name: "← Back to case file" });
  if (await back.isVisible()) await back.click();
  await page.getByRole("navigation", { name: "Case file" }).getByRole("button", { name: new RegExp(title) }).click();
  await expect(page.getByRole("heading", { level: 2, name: title })).toBeVisible();
}

async function expectSolved(page: Page, title: string) {
  await expect(page.getByRole("article", { name: title }).getByText("Solved", { exact: true })).toBeVisible();
}

test("a player can solve The Greenhouse Affair end to end", async ({ page, isMobile }) => {
  await page.goto(`/play/${SLUG}`);
  await expect(page.getByRole("heading", { name: "The Greenhouse Affair" })).toBeVisible();
  await expectAccessible(page, "briefing");
  await page.getByRole("button", { name: "Open the case file" }).click();

  // UV torch reveals the drawer clue.
  await page.getByRole("navigation", { name: "Case file" }).getByRole("button", { name: /Field Notebook/ }).click();
  await page.getByRole("button", { name: /UV torch/ }).click();
  await page.getByRole("button", { name: "Sweep the page" }).click();
  await expect(page.getByText("“Drawer — the door code, read in a mirror.”")).toBeVisible({ timeout: 15_000 });
  await expectAccessible(page, "evidence");

  // 1. Keypad: a wrong code first, then the right one.
  await openTask(page, "The Locked Desk Drawer");
  const keypad = page.getByRole("group", { name: "Desk drawer keypad" });
  for (const d of "2906") await keypad.getByRole("button", { name: d, exact: true }).click();
  await keypad.getByRole("button", { name: "Enter" }).click();
  await expect(page.getByText("The lock doesn't budge.")).toBeVisible();
  await keypad.getByRole("button", { name: "Clear" }).click();
  for (const d of "6092") await keypad.getByRole("button", { name: d, exact: true }).click();
  await keypad.getByRole("button", { name: "Enter" }).click();
  await expectSolved(page, "The Locked Desk Drawer");
  await expect(page.getByText(/New evidence: Glasshouse Door Keypad Log/)).toBeVisible();

  // 2. Timeline: reorder with the keyboard-accessible buttons.
  await openTask(page, "Reconstruct the Timeline");
  await expectAccessible(page, "timeline");
  const order = [
    "Bed 7 (oleander) pruned",
    "THU 13 JUN 10:20",
    "Felix Marchetti's train",
    "Odile calls Wren",
    "badges out of the library",
    "FRI 14 JUN 16:07",
    "FRI 14 JUN 16:16",
    "badges back into the library",
    "Text from Odile",
  ];
  const list = page.getByRole("list", { name: "Timeline, earliest first" });
  for (let target = 0; target < order.length; target++) {
    const items = list.getByRole("listitem");
    const texts = await items.allInnerTexts();
    let index = texts.findIndex((t) => t.includes(order[target]!));
    while (index > target) {
      await items.nth(index).getByRole("button", { name: /^Move earlier/ }).click();
      index--;
    }
  }
  await page.getByRole("button", { name: "Submit timeline" }).click();
  await expectSolved(page, "Reconstruct the Timeline");

  // 3. Witness statements.
  await openTask(page, "Flag the Contradictions");
  await expectAccessible(page, "statements");
  for (const line of ["After I left at half four", "I went to the library and stayed there", "I hadn't seen her in about two years"]) {
    await page.getByRole("button", { name: new RegExp(line) }).click();
  }
  await page.getByRole("button", { name: "Submit 3 contradictions" }).click();
  await expectSolved(page, "Flag the Contradictions");

  // 4. Evidence board.
  await openTask(page, "The Alibi Board");
  await expectAccessible(page, "board");
  for (const [a, b] of [["Wren Talbot", "Library access log"], ["Hollis Crane", "Committee minutes"], ["Felix Marchetti", "Rail ticket and receipt"]]) {
    await page.getByRole("button", { name: new RegExp(`^${a}`) }).click();
    await page.getByRole("button", { name: new RegExp(`^${b}`) }).click();
  }
  await expect(page.getByRole("heading", { name: "Strings (3)" })).toBeVisible();
  await page.getByRole("button", { name: "Submit the board" }).click();
  await expectSolved(page, "The Alibi Board");

  // 5. Lab: a decoy test, then the key test.
  await openTask(page, "Toxicology Bench");
  await expectAccessible(page, "lab");
  await page.getByRole("radio", { name: /Post-mortem blood/ }).check();
  await page.getByRole("radio", { name: /Organophosphate screen/ }).check();
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expect(page.getByText("Cholinesterase activity is in the normal range")).toBeVisible({ timeout: 15_000 });
  await page.getByRole("radio", { name: /Flask residue/ }).check();
  await page.getByRole("radio", { name: /Cardiac glycoside screen/ }).check();
  await page.getByRole("button", { name: "Run analysis" }).click();
  await expectSolved(page, "Toxicology Bench");

  // 6. Fingerprint: mark six features by cycling cells, then declare.
  await openTask(page, "The Print on the Flask Lid");
  await expectAccessible(page, "fingerprint");
  const presses = { ending: 1, bifurcation: 2, dot: 3, enclosure: 4 } as const;
  const marks: [string, keyof typeof presses][] = [["A3", "dot"], ["B2", "ending"], ["B4", "bifurcation"], ["C3", "bifurcation"], ["C5", "ending"], ["D2", "dot"]];
  for (const [cell, type] of marks) {
    const button = page.getByRole("button", { name: new RegExp(`^${cell},`) });
    for (let i = 0; i < presses[type]; i++) await button.click();
  }
  await page.getByRole("radio", { name: "Wren Talbot" }).check();
  await page.getByRole("button", { name: "Declare identification" }).click();
  await expectSolved(page, "The Print on the Flask Lid");

  // 7. Word lock, typed on the keyboard.
  await openTask(page, "Odile's Journal");
  await page.getByRole("spinbutton", { name: "Wheel 1 of 6" }).focus();
  await page.keyboard.type("NERIUM");
  await page.getByRole("button", { name: "Try the lock" }).click();
  await expectSolved(page, "Odile's Journal");

  // 8. Accusation: one wrong, then right.
  await openTask(page, "Final Accusation");
  await expectAccessible(page, "accusation");
  await page.getByRole("radio", { name: "Wren Talbot" }).check();
  await page.getByRole("radio", { name: /falsified research data/ }).check();
  await page.getByRole("radio", { name: /Foxglove/ }).check();
  await page.getByRole("button", { name: "Make the accusation" }).click();
  await page.getByRole("button", { name: /Yes, present it/ }).click();
  await expect(page.getByText(/The coroner isn't convinced/)).toBeVisible();
  await page.getByRole("radio", { name: /Oleander extract/ }).check();
  await page.getByRole("button", { name: "Make the accusation" }).click();
  await page.getByRole("button", { name: /Yes, present it/ }).click();

  await expect(page.getByRole("heading", { name: "Case closed" })).toBeVisible();
  await expect(page.getByText("Wren Talbot was arrested")).toBeVisible();
  await expectAccessible(page, "result");

  // Progress survives a reload.
  await page.reload();
  await expect(page.getByRole("heading", { name: "Case closed" })).toBeVisible();
  void isMobile;
});

test("progress resumes after a reload and the API refuses locked puzzles", async ({ page, request }) => {
  await page.goto(`/play/${SLUG}`);
  await page.getByRole("button", { name: "Open the case file" }).click();
  await openTask(page, "The Locked Desk Drawer");
  const keypad = page.getByRole("group", { name: "Desk drawer keypad" });
  for (const d of "6092") await keypad.getByRole("button", { name: d, exact: true }).click();
  await keypad.getByRole("button", { name: "Enter" }).click();
  await expectSolved(page, "The Locked Desk Drawer");

  await page.reload();
  await expect(page.getByRole("navigation", { name: "Case file" }).getByRole("button", { name: /Reconstruct the Timeline/ })).toBeVisible();

  const res = await page.request.post(`/api/runs/${SLUG}/attempt`, { data: { puzzleId: "accusation", answer: { suspect: "wren", motive: "data", method: "oleander" } } });
  expect(res.status()).toBe(403);

  // Without the run cookie there's no run at all.
  const anon = await request.post(`/api/runs/${SLUG}/attempt`, { data: { puzzleId: "desk-drawer", answer: "6092" } });
  expect(anon.status()).toBe(409);
});
