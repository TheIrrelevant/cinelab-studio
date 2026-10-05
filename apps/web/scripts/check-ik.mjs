/**
 * @file check-ik.mjs
 * @description Browser check for plan 1.5 on /lab/human: an arm in IK mode follows its target
 *   gizmo (hand on the target), legs in IK keep the feet planted while the root moves down
 *   (reach limits are covered by ik-solver.test.ts), one undo reverts it, and switching back to FK keeps the
 *   pose. Saves screenshots.
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { openLab } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/human-lab";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });

const probe = (page, fn, arg) => page.evaluate(([f, a]) => window.__humanLab[f](...[].concat(a)), [fn, arg]);
async function onPage(page, point) {
  const box = await page.locator('[data-testid="human-viewport"] canvas').boundingBox();
  return { x: box.x + point.x, y: box.y + point.y };
}
const gap = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
async function drag(page, from, dx, dy) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 10; i += 1) await page.mouse.move(from.x + (dx * i) / 10, from.y + (dy * i) / 10);
  await page.mouse.up();
  await page.waitForTimeout(400);
}
const click = async (page, point) => {
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(300);
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await openLab(page, base);
  await page.getByTestId("toggle-handles").click();
  await page.waitForTimeout(400);

  const wristRest = await probe(page, "project", "wrist.L");
  await page.getByTestId("ik-arm.L").click();
  await page.waitForTimeout(300);
  assert.ok(gap(await probe(page, "project", "wrist.L"), wristRest) < 1, "switching to IK keeps the pose");
  await click(page, await onPage(page, wristRest));
  await page.getByTestId("gizmo-move").click();
  await page.waitForTimeout(300);
  await drag(page, await onPage(page, await probe(page, "gizmoPoint", ["translate", "Y"])), 0, -70);
  const target = await probe(page, "projectNamed", "ik-target");
  const wrist = await probe(page, "project", "wrist.L");
  assert.ok(gap(target, wristRest) > 25, `target moved (${gap(target, wristRest).toFixed(0)} px)`);
  assert.ok(gap(wrist, target) < 4, `hand follows the IK target (${gap(wrist, target).toFixed(1)} px)`);
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/ik-arm.png` });
  console.log("PASS arm follows the IK target");


  await page.getByTestId("ik-leg.L").click();
  await page.getByTestId("ik-leg.R").click();
  await page.keyboard.press("Escape");
  const feet = [await probe(page, "project", "foot.L"), await probe(page, "project", "foot.R")];
  await click(page, await onPage(page, await probe(page, "project", ["root", [0.16, 0, 0]])));
  await page.getByTestId("gizmo-move").click();
  await page.waitForTimeout(300);
  const hips = await probe(page, "project", "spine05");
  await drag(page, await onPage(page, await probe(page, "gizmoPoint", ["translate", "Y"])), 0, 45);
  const hipsDown = await probe(page, "project", "spine05");
  assert.ok(hipsDown.y - hips.y > 15, `hips moved down (${(hipsDown.y - hips.y).toFixed(0)} px)`);
  for (const [i, foot] of ["foot.L", "foot.R"].entries()) {
    assert.ok(gap(await probe(page, "project", foot), feet[i]) < 2, `${foot} stays planted`);
  }
  await page.getByTestId("view-side").click();
  await page.waitForTimeout(600);
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/ik-squat-side.png` });
  await page.getByTestId("view-body").click();
  await page.waitForTimeout(600);
  console.log("PASS feet planted while the hips move down");

  await page.getByTestId("pose-undo").click();
  await page.waitForTimeout(400);
  assert.ok(gap(await probe(page, "project", "spine05"), hips) < 2, "one undo reverts the squat");
  const footBefore = await probe(page, "project", "foot.L");
  await page.getByTestId("ik-leg.L").click();
  await page.waitForTimeout(300);
  assert.ok(gap(await probe(page, "project", "foot.L"), footBefore) < 1, "switching back to FK keeps the pose");
  console.log("PASS undo and FK switch");

  assert.deepEqual(errors, [], "no page or console errors");
  console.log("PASS no errors");
} finally {
  await browser.close();
}
