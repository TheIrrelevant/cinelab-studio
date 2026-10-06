/**
 * @file check-head.mjs
 * @description Browser check for plan 2.6 (/characters/creator, Head tab): the camera frames the
 *   head; every face-shape preset and every head control (all head modifiers) changes the portrait;
 *   group resets restore it. Saves a portrait per face shape and per group (first controls at +100).
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { differs } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/head";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const wait = (page, ms) => page.waitForTimeout(ms);
const pixels = (page) =>
  page.evaluate(() => {
    const source = document.querySelector('[data-testid="creator-viewport"] canvas');
    const copy = Object.assign(document.createElement("canvas"), { width: 480, height: 480 });
    const context = copy.getContext("2d");
    context.drawImage(source, 0, 0, copy.width, copy.height);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    return Array.from({ length: data.length / 4 }, (_, i) => Math.round((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3));
  });
const setRange = (page, scope, label, value) =>
  page.evaluate(([scopeId, name, next]) => {
    const input = document.querySelector(`[data-testid="${scopeId}"] input[aria-label="${name}"]`);
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set.call(input, String(next));
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, [scope, label, value]);
const shot = (page, name) => page.getByTestId("creator-viewport").screenshot({ path: `${output}/${name}.png` });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${base}/characters/creator`);
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  const fullBody = await pixels(page);
  await page.getByRole("tab", { name: "Head" }).click();
  await wait(page, 800);
  const portrait = await pixels(page);
  assert.ok(differs(fullBody, portrait) > 0.2, "camera frames the head");
  await shot(page, "natural");

  // 0.01 % of the sampled pixels: the finest controls (philtrum, nose compression) move few pixels.
  const changes = async (label, act, min = 0.0001) => {
    const before = await pixels(page);
    await act();
    let share = 0;
    for (let i = 0; i < 20 && share <= min; i += 1) {
      await wait(page, 150);
      share = differs(before, await pixels(page));
    }
    assert.ok(share > min, `${label} changes the portrait (${share})`);
    return share;
  };

  for (const id of ["oval", "round", "square", "heart", "long", "diamond", "triangular"]) {
    await changes(`face ${id}`, () => page.getByRole("radio", { name: id, exact: true }).click());
    await shot(page, `face-${id}`);
  }
  await page.getByRole("radio", { name: "Natural", exact: true }).click();
  await wait(page, 600);
  console.log("PASS face shapes");

  const groups = await page.locator('[data-testid^="region-head-"]').evaluateAll((nodes) => nodes.map((n) => n.dataset.testid));
  let total = 0;
  const weak = [];
  for (const group of groups) {
    await page.getByTestId(group).locator("summary").click();
    const controls = await page.getByTestId(group).locator('input[type="range"]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
    for (const label of controls) {
      const share = await changes(`${group} ${label}`, () => setRange(page, group, label, 1));
      if (share < 0.002) weak.push(`${group}/${label} ${share.toFixed(4)}`);
      await setRange(page, group, label, 0);
      await wait(page, 350);
      total += 1;
    }
    for (const label of controls.slice(0, 3)) await setRange(page, group, label, 1);
    await wait(page, 700);
    await shot(page, group);
    await page.getByTestId(group).getByRole("button", { name: /^Reset/ }).click();
    await wait(page, 500);
    await page.getByTestId(group).locator("summary").click();
    console.log("PASS", group, controls.length, "controls");
  }
  console.log("PASS head controls", total, "subtle:", weak.join(", ") || "none");
  assert.deepEqual(errors, []);
  console.log("PASS no page errors");
} finally {
  await browser.close();
}
