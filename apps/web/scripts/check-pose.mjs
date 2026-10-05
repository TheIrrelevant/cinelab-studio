/**
 * @file check-pose.mjs
 * @description Browser check for plan 1.4 on /lab/human: clicking a handle selects the bone and
 *   shows the gizmo; numeric X/Y/Z edits round-trip and are clamped to the joint limits; a gizmo
 *   drag rotates within limits as one undo step; undo/redo (buttons and keyboard) restore exact
 *   values; reset selected / reset all; the root moves with the move gizmo. Saves screenshots.
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

const canvasPoint = async (page, point) => {
  const box = await page.locator('[data-testid="human-viewport"] canvas').boundingBox();
  return { x: box.x + point.x, y: box.y + point.y };
};
const handle = async (page, bone) => canvasPoint(page, await page.evaluate((b) => window.__humanLab.project(b), bone));
const gizmo = async (page, group, axis) => canvasPoint(page, await page.evaluate(([g, a]) => window.__humanLab.gizmoPoint(g, a), [group, axis]));
const values = async (page) => Promise.all(["x", "y", "z"].map(async (axis) => Number(await page.getByTestId(`pose-${axis}`).inputValue())));
async function typeValue(page, axis, value) {
  const input = page.getByTestId(`pose-${axis}`);
  await input.fill(String(value));
  await input.press("Enter");
  await page.waitForTimeout(250);
}
async function drag(page, from, dx, dy) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  for (let i = 1; i <= 8; i += 1) await page.mouse.move(from.x + (dx * i) / 8, from.y + (dy * i) / 8);
  await page.mouse.up();
  await page.waitForTimeout(300);
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await openLab(page, base);
  await page.getByTestId("toggle-handles").click();
  await page.waitForTimeout(400);

  const elbow = await handle(page, "lowerarm01.L");
  await page.mouse.click(elbow.x, elbow.y);
  await page.waitForTimeout(400);
  assert.deepEqual(await values(page), [0, 0, 0], "selected elbow starts at rest");
  assert.ok(await page.evaluate(() => window.__humanLab.gizmoPoint("rotate", "E")), "rotate gizmo is shown");
  console.log("PASS select shows gizmo and numeric bar");

  await typeValue(page, "x", 60);
  assert.deepEqual(await values(page), [60, 0, 0], "numeric X round-trips");
  await typeValue(page, "x", 170);
  assert.equal((await values(page))[0], 110, "numeric X is clamped to the elbow limit");
  await typeValue(page, "z", 30);
  assert.equal((await values(page))[2], 0, "elbow hinge keeps Z at 0");
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/pose-numeric.png` });
  console.log("PASS numeric edits round-trip and clamp");

  await page.getByTestId("pose-undo").click();
  await page.waitForTimeout(250);
  assert.deepEqual(await values(page), [60, 0, 0], "undo restores the exact previous value");
  await page.keyboard.press("ControlOrMeta+z");
  await page.waitForTimeout(250);
  assert.deepEqual(await values(page), [0, 0, 0], "keyboard undo");
  await page.keyboard.press("ControlOrMeta+Shift+z");
  await page.getByTestId("pose-redo").click();
  await page.waitForTimeout(250);
  assert.deepEqual(await values(page), [110, 0, 0], "redo (keyboard and button)");
  console.log("PASS undo and redo");

  const shoulder = await handle(page, "upperarm01.L");
  await page.mouse.click(shoulder.x, shoulder.y);
  await page.waitForTimeout(400);
  await drag(page, await gizmo(page, "rotate", "E"), 0, 60);
  const dragged = await values(page);
  assert.ok(dragged.some((v) => Math.abs(v) > 3), `gizmo drag rotates the shoulder (${dragged})`);
  assert.ok(dragged[0] >= -60 && dragged[0] <= 170 && dragged[2] >= -70 && dragged[2] <= 140, "gizmo respects limits");
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/pose-gizmo.png` });
  await page.getByTestId("pose-undo").click();
  await page.waitForTimeout(250);
  assert.deepEqual(await values(page), [0, 0, 0], "one undo reverts the whole drag");
  console.log("PASS gizmo drag within limits, one undo step", dragged);

  await page.getByTestId("pose-redo").click();
  await page.getByTestId("pose-reset-selected").click();
  await page.waitForTimeout(250);
  assert.deepEqual(await values(page), [0, 0, 0], "reset selected");
  await page.keyboard.press("Escape");
  await page.waitForTimeout(200);
  assert.match(await page.getByTestId("selected-bones").textContent(), /Selected: none/, "Escape clears the selection");
  // The root handle is a ring around the hips; click its side.
  const root = await canvasPoint(page, await page.evaluate(() => window.__humanLab.project("root", [0.16, 0, 0])));
  await page.mouse.click(root.x, root.y);
  await page.waitForTimeout(300);
  assert.match(await page.getByTestId("selected-bones").textContent(), /Selected: root/, "ring selects the root");
  await page.getByTestId("gizmo-move").click();
  await page.waitForTimeout(300);
  const headBefore = await handle(page, "head");
  await drag(page, await gizmo(page, "translate", "Y"), 0, -50);
  const headAfter = await handle(page, "head");
  assert.ok(headBefore.y - headAfter.y > 15, `move gizmo lifts the body (${(headBefore.y - headAfter.y).toFixed(0)} px)`);
  await page.getByTestId("human-viewport").screenshot({ path: `${output}/pose-move.png` });
  await page.getByTestId("pose-reset-all").click();
  await page.waitForTimeout(300);
  const headReset = await handle(page, "head");
  assert.ok(Math.abs(headReset.y - headBefore.y) < 2, "reset all returns the root");
  console.log("PASS root move and reset all");

  assert.deepEqual(errors, [], "no page or console errors");
  console.log("PASS no errors");
} finally {
  await browser.close();
}
