/**
 * @file capture-appearance.mjs
 * @description Plan 2.7 before/after capture: portraits of the four ethnicity presets for a female
 *   and a male body in the creator's head view, saved to screenshots/appearance/<label>/.
 *   Usage: node scripts/capture-appearance.mjs <label>
 * @depends playwright; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const label = process.argv[2] ?? "current";
const output = `screenshots/appearance/${label}`;
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const stop = setTimeout(() => {
  console.log("TIMEOUT");
  process.exit(2);
}, 240_000);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 }, deviceScaleFactor: 2 });
  await page.goto(`${base}/characters/creator`);
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  for (const gender of ["Female", "Male"]) {
    await page.getByRole("tab", { name: "Body" }).click();
    await page.getByRole("radio", { name: gender, exact: true }).click();
    for (const preset of ["Asian", "African", "European", "Latin"]) {
      await page.getByRole("tab", { name: "Body" }).click();
      await page.getByRole("radio", { name: preset, exact: true }).click();
      await page.getByRole("tab", { name: "Head" }).click();
      await page.waitForTimeout(1500);
      const box = await page.getByTestId("creator-viewport").boundingBox();
      await page.screenshot({ path: `${output}/${gender.toLowerCase()}-${preset.toLowerCase()}.png`, clip: { x: box.x + box.width * 0.2, y: box.y + box.height * 0.08, width: box.width * 0.6, height: box.height * 0.8 } });
      console.log("saved", gender, preset);
    }
  }
} finally {
  clearTimeout(stop);
  await browser.close();
}
