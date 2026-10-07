/**
 * @file check-face.mjs
 * @description Browser check for plan 3.1 (creator Face tab): every facial action changes the frontal
 *   face portrait and goes back on reset; a few combined expressions are captured; an expression is
 *   saved with the character and comes back after reloading the deep link.
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { differs } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/face";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const pixels = (page) =>
  page.evaluate(() => {
    const source = document.querySelector('[data-testid="creator-viewport"] canvas');
    const copy = Object.assign(document.createElement("canvas"), { width: 400, height: 400 });
    const context = copy.getContext("2d");
    context.drawImage(source, 0, 0, copy.width, copy.height);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    return Array.from({ length: data.length / 4 }, (_, i) => Math.round((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3));
  });
const setRange = (page, label, value) =>
  page.evaluate(([name, next]) => {
    const input = document.querySelector(`input[aria-label="${name}"]`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, [label, value]);
const settle = (page) => page.waitForTimeout(350);
const shot = (page, name) => page.getByTestId("creator-viewport").screenshot({ path: `${output}/${name}.png` });
const EXPRESSIONS = {
  smile: { "Mouth: Smile left": 1, "Mouth: Smile right": 1, "Cheeks and nose: Squint left": 0.5, "Cheeks and nose: Squint right": 0.5 },
  surprise: { "Brows: Inner up": 1, "Brows: Outer up left": 1, "Brows: Outer up right": 1, "Eyes: Wide left": 1, "Eyes: Wide right": 1, "Jaw: Open": 0.5 },
  blink: { "Eyes: Blink left": 1, "Eyes: Blink right": 1 },
  "look-left": { "Eyes: Look out left": 1, "Eyes: Look in right": 1 },
  angry: { "Brows: Down left": 1, "Brows: Down right": 1, "Cheeks and nose: Sneer left": 0.7, "Cheeks and nose: Sneer right": 0.7, "Mouth: Press left": 0.6, "Mouth: Press right": 0.6 },
};

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${base}/characters/creator`);
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  await page.getByRole("tab", { name: "Face" }).click();
  await page.waitForTimeout(1500);
  await shot(page, "neutral");
  const neutral = await pixels(page);

  const subtle = [];
  for (const group of await page.locator('[data-testid^="face-"]').evaluateAll((nodes) => nodes.map((n) => n.dataset.testid))) {
    await page.getByTestId(group).locator("summary").click();
    const labels = await page.getByTestId(group).locator('input[type="range"]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
    for (const label of labels) {
      await setRange(page, label, 1);
      await settle(page);
      const change = differs(neutral, await pixels(page));
      assert.ok(change > 0.0005, `${label} changed only ${change}`);
      if (change < 0.005) subtle.push(`${label} ${change.toFixed(4)}`);
      await setRange(page, label, 0);
    }
    await settle(page);
    assert.ok(differs(neutral, await pixels(page)) < 0.0005, `${group} back to neutral`);
    console.log("PASS", group, labels.length, "actions");
  }
  console.log("PASS all actions change the face", subtle.length ? `subtle: ${subtle.join(", ")}` : "");

  for (const [name, values] of Object.entries(EXPRESSIONS)) {
    for (const [label, value] of Object.entries(values)) await setRange(page, label, value);
    await settle(page);
    await shot(page, name);
    await page.getByRole("button", { name: "Reset face" }).click();
  }
  console.log("PASS combined expressions captured");

  for (const [label, value] of Object.entries(EXPRESSIONS.smile)) await setRange(page, label, value);
  await page.getByLabel("Character name").fill("Smiling");
  await settle(page);
  const before = await pixels(page);
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/characters\/creator\?id=.+/);
  await page.reload();
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  await page.getByRole("tab", { name: "Face" }).click();
  await page.waitForTimeout(1500);
  const change = differs(before, await pixels(page));
  assert.ok(change < 0.002, `saved expression differs by ${change}`);
  console.log("PASS expression saved and restored", change.toFixed(4));
  assert.deepEqual(errors, []);
  console.log("PASS no page errors");
} finally {
  await browser.close();
}
