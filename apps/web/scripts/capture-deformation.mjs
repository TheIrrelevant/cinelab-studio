/**
 * @file capture-deformation.mjs
 * @description Captures the deformation QA pose set (plan 1.6) from /lab/human as JPEG images for
 *   docs/deformation-qa.md: `node scripts/capture-deformation.mjs <label>` writes
 *   docs/images/deformation-qa/<label>/<pose>-<view>.jpg (handles off, fixed camera views).
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { openLab } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const label = process.argv[2] ?? "current";
const output = `../../docs/images/deformation-qa/${label}`;
await mkdir(output, { recursive: true });
const VIEWS = {
  "arms-up": ["body", "side", "portrait"],
  "elbows-140": ["body", "side"],
  "deep-squat": ["body", "side"],
  fists: ["hands"],
  "head-turn": ["portrait", "body"],
  "jaw-open": ["portrait"],
};

const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  await openLab(page, base);
  for (const [pose, views] of Object.entries(VIEWS)) {
    await page.getByTestId("select-qa-pose").selectOption(pose);
    for (const view of views) {
      await page.getByTestId(`view-${view}`).click();
      await page.waitForTimeout(900);
      await page.getByTestId("human-viewport").screenshot({ path: `${output}/${pose}-${view}.jpg`, type: "jpeg", quality: 80 });
    }
    console.log("captured", pose, views.join(", "));
  }
} finally {
  await browser.close();
}
