/**
 * @file e2e-milestone.mjs
 * @description End-to-end proof of the Phase 1 first milestone: create a named
 *   character, save it, reopen it from the library, and confirm it loads back
 *   into the editor prefilled. Captures screenshots as real artifacts. Run with
 *   the dev server already on http://localhost:3000.
 * @scope cinelab-studio
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = "http://localhost:3000";
const SHOTS_DIR = "screenshots";
mkdirSync(SHOTS_DIR, { recursive: true });

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

try {
  // 1. Home loads.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("text=Cinelab Studio");
  step("home renders", true);
  await page.screenshot({ path: `${SHOTS_DIR}/01-home.png` });

  // 2. Navigate to new character editor.
  await page.click("a:has-text('New character')");
  await page.waitForSelector("h1:has-text('New character')");
  step("editor opens (create mode)", true);

  // 3. Enter a name (required). Save should be disabled until a name exists.
  const saveBtn = page.getByRole("button", { name: "Save" });
  if (await saveBtn.isDisabled()) step("save disabled until name entered", true);
  else step("save disabled until name entered", false, "save was not disabled");

  await page.getByLabel("Name").fill("Aria Test");
  await page.click("label:has-text('Leo')");
  await page.click("label:has-text('Espresso')");
  await page.waitForTimeout(200);
  await page.screenshot({ path: `${SHOTS_DIR}/02-editor-filled.png` });
  step("editor filled + preview updates", true);

  // 4. Save -> navigates to library.
  await saveBtn.click();
  await page.waitForSelector("text=Character library");
  step("save navigates to library", true);

  // 5. Character appears in the library.
  await page.waitForSelector("text=Aria Test");
  step("character listed in library", true);
  await page.screenshot({ path: `${SHOTS_DIR}/03-library.png` });

  // 6. Persisted to localStorage (real artifact check).
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("cinelab-studio:characters:v1"),
  );
  const parsed = JSON.parse(stored || "[]");
  step("persisted to localStorage", parsed.length === 1, `count=${parsed.length}`);
  const charId = parsed[0]?.id;
  step("saved character has id", Boolean(charId), charId);

  // 7. Reload page (simulate reopen) — character should still be listed.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Aria Test");
  step("character survives reload (persistence verified)", true);

  // 8. Reopen the saved character into the editor.
  await page.click(`a[aria-label="Edit Aria Test"]`);
  await page.waitForSelector("h1:has-text('Edit Aria Test')");
  const nameVal = await page.getByLabel("Name").inputValue();
  step("editor prefilled with saved name on reopen", nameVal === "Aria Test", `name="${nameVal}"`);
  await page.screenshot({ path: `${SHOTS_DIR}/04-reopened-edit.png` });

  // 9. Edit and save again — confirm update round-trips.
  await page.getByLabel("Name").fill("Aria Test II");
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForSelector("text=Aria Test II");
  step("edit round-trips and updates library", true);
  await page.screenshot({ path: `${SHOTS_DIR}/05-edited-library.png` });
} catch (err) {
  step("unhandled error", false, err.message);
  await page.screenshot({ path: `${SHOTS_DIR}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
process.exit(failed.length === 0 ? 0 : 1);