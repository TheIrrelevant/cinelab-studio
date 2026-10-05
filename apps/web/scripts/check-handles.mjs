/**
 * @file check-handles.mjs
 * @description Browser check for plan 1.3 joint handles on /lab/human: handles toggle on and
 *   off, the finger toggle hides finger handles, hover highlights, a click on a handle inside the
 *   body selects it (Shift adds), and handles follow body morphs and poses. Saves screenshots.
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { differs, openLab, setSlider, viewport } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/human-lab";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });

const count = (page) => page.evaluate(() => window.__humanLab.handleCount());
const project = (page, bone) => page.evaluate((name) => window.__humanLab.project(name), bone);
const selectedText = async (page) => (await page.getByTestId("selected-bones").textContent()) ?? "";

/** Page coordinates of a handle (canvas CSS pixels plus the canvas offset). */
async function handlePoint(page, bone) {
  const point = await project(page, bone);
  assert.ok(point, `handle ${bone} exists`);
  const box = await page.locator('[data-testid="human-viewport"] canvas').boundingBox();
  return { x: box.x + point.x, y: box.y + point.y };
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await openLab(page, base);

  assert.equal(await count(page), 0, "handles are off by default");
  const plain = await viewport(page);
  await page.getByTestId("toggle-handles").click();
  await page.waitForTimeout(500);
  const all = await count(page);
  assert.ok(all > 100, `one handle per posable bone (${all})`);
  assert.ok(differs(plain, await viewport(page)) > 0.002, "handles are drawn");
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/handles-body.png` });
  await page.getByTestId("toggle-finger-handles").click();
  await page.waitForTimeout(300);
  assert.equal(all - (await count(page)), 38, "finger toggle hides 2 x 19 finger handles");
  await page.getByTestId("toggle-finger-handles").click();
  console.log("PASS toggles", { all });

  const knee = await handlePoint(page, "lowerleg01.L");
  await page.mouse.move(knee.x, knee.y);
  await page.waitForTimeout(300);
  assert.match(await selectedText(page), /hover lowerleg01\.L/, "hover reports the knee");
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/handles-hover.png` });
  await page.mouse.click(knee.x, knee.y);
  await page.waitForTimeout(200);
  assert.match(await selectedText(page), /Selected: lowerleg01\.L/, "click through the mesh selects the knee");
  const spine = await handlePoint(page, "spine03");
  await page.keyboard.down("Shift");
  await page.mouse.click(spine.x, spine.y);
  await page.keyboard.up("Shift");
  await page.waitForTimeout(200);
  assert.match(await selectedText(page), /Selected: lowerleg01\.L, spine03/, "shift+click adds to the selection");
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/handles-selected.png` });
  console.log("PASS hover and selection");

  const headBefore = await project(page, "head");
  await setSlider(page, "height", 1);
  await page.waitForTimeout(600);
  const headAfter = await project(page, "head");
  assert.ok(headBefore.y - headAfter.y > 15, `head handle follows the morph (${headBefore.y.toFixed(0)} -> ${headAfter.y.toFixed(0)})`);
  await setSlider(page, "height", 0.5);
  await page.waitForTimeout(400);
  const wristBefore = await project(page, "wrist.L");
  await page.getByTestId("toggle-limit-demo").click();
  await page.waitForTimeout(600);
  const wristAfter = await project(page, "wrist.L");
  const moved = Math.hypot(wristAfter.x - wristBefore.x, wristAfter.y - wristBefore.y);
  assert.ok(moved > 30, `wrist handle follows the pose (${moved.toFixed(0)} px)`);
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/handles-pose.png` });
  console.log("PASS handles follow morph and pose");

  assert.deepEqual(errors, [], "no page or console errors");
  console.log("PASS no errors");
} finally {
  await browser.close();
}
