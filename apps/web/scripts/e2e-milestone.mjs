/**
 * @file e2e-milestone.mjs
 * @description End-to-end proof of the first milestone: from the studio, create a
 *   named character in the 3D creator, save it, reopen it from the library (creator prefilled), then
 *   open it in the studio and confirm it is loaded and persisted with the scene.
 *   Captures screenshots as real artifacts. Run with the dev server already on
 *   STUDIO_URL (default http://localhost:3000).
 * @scope cinelab-studio
 * @depends playwright, running Next dev server on STUDIO_URL
 */

import { chromium } from "playwright";
import { mkdirSync } from "node:fs";

const BASE = process.env.STUDIO_URL ?? "http://localhost:3000";
const SHOTS_DIR = "screenshots";
mkdirSync(SHOTS_DIR, { recursive: true });

const results = [];
function step(name, ok, detail = "") {
  results.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const browser = await chromium.launch({ channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();

try {
  // 1. Studio (home) loads and links to the character library.
  await page.goto(BASE, { waitUntil: "networkidle" });
  await page.waitForSelector("h1:has-text('Studio 01')");
  step("studio renders", true);
  await page.screenshot({ path: `${SHOTS_DIR}/01-home.png` });
  await page.click("a:has-text('Characters')");
  await page.waitForSelector("text=Character library");
  step("studio links to character library", true);

  // 2. "New character" opens the 3D creator (the old form editor was removed 2026-10-07).
  await page.click("a:has-text('New character')");
  await page.waitForURL(/\/characters\/creator$/);
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  step("creator opens for a new character", true);

  // 3. Name and shape the character, then save: the id goes into the URL.
  await page.getByLabel("Character name").fill("Aria Test");
  await page.getByRole("radio", { name: "Male", exact: true }).click();
  await page.getByRole("radio", { name: "African", exact: true }).click();
  await page.waitForTimeout(1000);
  await page.screenshot({ path: `${SHOTS_DIR}/02-creator-filled.png` });
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/characters\/creator\?id=.+/);
  step("save puts the character id into the URL", true, page.url());

  // 4. Back to the library: the character is listed.
  await page.click("a:has-text('Characters')");
  await page.waitForSelector("text=Aria Test");
  step("character listed in library", true);
  await page.screenshot({ path: `${SHOTS_DIR}/03-library.png` });

  // 5. Persisted to localStorage as character data v2 (real artifact check).
  const stored = await page.evaluate(() =>
    window.localStorage.getItem("cinelab-studio:characters:v1"),
  );
  const parsed = JSON.parse(stored || "[]");
  step("persisted to localStorage", parsed.length === 1, `count=${parsed.length}`);
  const charId = parsed[0]?.id;
  step("saved character has id", Boolean(charId), charId);
  step("saved as version 2 with a male human", parsed[0]?.version === 2 && parsed[0]?.human?.shape?.gender === 1);

  // 6. Reload page (simulate reopen) - character should still be listed.
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForSelector("text=Aria Test");
  step("character survives reload (persistence verified)", true);

  // 7. Reopen the saved character in the creator.
  await page.click(`a[aria-label="Edit Aria Test"]`);
  await page.waitForURL(/\/characters\/creator\?id=.+/);
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  await page.waitForFunction(() => document.querySelector('input[aria-label="Character name"]')?.value === "Aria Test");
  step("creator prefilled with saved name on reopen", true);
  await page.screenshot({ path: `${SHOTS_DIR}/04-reopened-creator.png` });

  // 8. Rename and save again - confirm update round-trips.
  await page.getByLabel("Character name").fill("Aria Test II");
  await page.getByRole("button", { name: "Save" }).click();
  await page.click("a:has-text('Characters')");
  await page.waitForSelector("text=Aria Test II");
  const count = await page.evaluate(() => JSON.parse(window.localStorage.getItem("cinelab-studio:characters:v1") || "[]").length);
  step("edit round-trips and updates library", count === 1, `count=${count}`);
  await page.screenshot({ path: `${SHOTS_DIR}/05-edited-library.png` });

  // 9. The old editor routes redirect to the creator.
  await page.goto(`${BASE}/characters/${charId}/edit`);
  await page.waitForURL(new RegExp(`/characters/creator\\?id=${charId}`));
  step("old edit route redirects to the creator", true);
  await page.goto(`${BASE}/characters`, { waitUntil: "networkidle" });

  // 10. Open the saved character in the studio.
  await page.click(`a[aria-label="Open Aria Test II in studio"]`);
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Scene asset count"]')?.textContent?.includes("Aria Test II"),
  );
  step("character loads into the studio", true);
  step("character query parameter is cleared", !new URL(page.url()).searchParams.has("character"), page.url());
  await page.waitForTimeout(500);
  await page.screenshot({ path: `${SHOTS_DIR}/06-studio-character.png` });

  // 11. The scene remembers the character across reloads.
  const scene = await page.evaluate(() => JSON.parse(window.localStorage.getItem("cinelab-studio-scene-v1") || "{}"));
  step("scene stores the active character", scene.model?.characterId === charId, String(scene.model?.characterId));
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForFunction(() =>
    document.querySelector('[aria-label="Scene asset count"]')?.textContent?.includes("Aria Test II"),
  );
  step("studio character survives reload", true);
} catch (err) {
  step("unhandled error", false, err.message);
  await page.screenshot({ path: `${SHOTS_DIR}/error.png` }).catch(() => {});
} finally {
  await browser.close();
}

const failed = results.filter((r) => !r.ok);
console.log(`\n${results.length - failed.length}/${results.length} steps passed`);
process.exit(failed.length === 0 ? 0 : 1);