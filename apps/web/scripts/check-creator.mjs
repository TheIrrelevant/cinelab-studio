/**
 * @file check-creator.mjs
 * @description Browser check for plan 2.5 (/characters/creator): every body tab control changes the
 *   rendered body - gender, the four ethnicity presets, cm/kg, the seven body types, every region
 *   slider - while the locked cm/kg hold within 0.5; the Waist slider widens the measured waist.
 *   Screenshots of presets (female and male), body types and regions are saved.
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { differs } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/creator";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const settle = (page, ms = 700) => page.waitForTimeout(ms);
const pixels = (page) =>
  page.evaluate(() => {
    const source = document.querySelector('[data-testid="creator-viewport"] canvas');
    const copy = Object.assign(document.createElement("canvas"), { width: 400, height: 400 });
    const context = copy.getContext("2d");
    context.drawImage(source, 0, 0, copy.width, copy.height);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    return Array.from({ length: data.length / 4 }, (_, i) => Math.round((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3));
  });
const measured = async (page) => {
  const [cm, kg, waist] = (await page.getByTestId("creator-measured").textContent()).match(/[\d.]+/g).map(Number);
  return { cm, kg, waist };
};
const setRange = (page, scope, label, value) =>
  page.evaluate(([scopeId, name, next]) => {
    const root = scopeId ? document.querySelector(`[data-testid="${scopeId}"]`) : document;
    const input = root.querySelector(`input[aria-label="${name}"]`);
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
  await settle(page);
  const changes = async (label, act) => {
    const before = await pixels(page);
    await act();
    let share = 0;
    // Solving and re-shaping can take a moment; poll until the frame changed (max 5 s).
    for (let i = 0; i < 25 && share <= 0.0005; i += 1) {
      await settle(page, 200);
      share = differs(before, await pixels(page));
    }
    assert.ok(share > 0.0005, `${label} changes the body (${share})`);
    await settle(page, 400);
    return share;
  };

  for (const gender of ["Female", "Male"]) {
    // The creator opens female, so only the switch to male is a change.
    if (gender === "Male") await changes("gender Male", () => page.getByRole("radio", { name: gender, exact: true }).click());
    for (const id of ["Asian", "African", "Latin", "European"]) {
      await changes(`${gender} ${id}`, () => page.getByRole("radio", { name: id, exact: true }).click());
      await shot(page, `ethnicity-${gender.toLowerCase()}-${id.toLowerCase()}`);
    }
    console.log("PASS ethnicity presets", gender);
  }
  await changes("gender Female", () => page.getByRole("radio", { name: "Female", exact: true }).click());

  await page.getByLabel("Height (cm)").fill("170");
  await page.getByLabel("Weight (kg)").fill("60");
  await page.getByLabel("Weight (kg)").press("Enter");
  await settle(page);
  const lock = { cm: 170, kg: 60 };
  const held = async (label) => {
    let m = await measured(page);
    // The size is re-solved shortly after a slider settles; poll up to 3 s.
    for (let i = 0; i < 15 && !(Math.abs(m.cm - lock.cm) < 0.5 && Math.abs(m.kg - lock.kg) < 0.5); i += 1) {
      await settle(page, 200);
      m = await measured(page);
    }
    assert.ok(Math.abs(m.cm - lock.cm) < 0.5 && Math.abs(m.kg - lock.kg) < 0.5, `${label} keeps ${lock.cm} cm ${lock.kg} kg: ${JSON.stringify(m)}`);
    return m;
  };
  console.log("PASS size", await held("typed size"));

  for (const type of ["Slim", "Athletic", "Muscular", "Curvy", "Soft", "Heavy", "Average"]) {
    await changes(type, () => page.getByRole("radio", { name: type, exact: true }).click());
    await held(type);
    await shot(page, `type-${type.toLowerCase()}`);
  }
  console.log("PASS body types keep cm/kg");

  const regions = await page.locator('[data-testid^="region-"]').evaluateAll((nodes) => nodes.map((n) => n.dataset.testid));
  for (const region of regions) {
    await page.getByTestId(region).locator("summary").click();
    const labels = await page.getByTestId(region).locator('input[type="range"]').evaluateAll((nodes) => nodes.map((n) => n.getAttribute("aria-label")));
    for (const label of labels) {
      const before = await measured(page);
      await changes(`${region} ${label}`, () => setRange(page, region, label, 1));
      const after = await held(`${region} ${label}`);
      if (label === "Waist") assert.ok(after.waist > before.waist + 2, `waist ${before.waist} -> ${after.waist}`);
      await shot(page, `${region}-${label.toLowerCase().replaceAll(" ", "-")}`);
      // One control at a time, so the locked weight stays reachable.
      await page.getByTestId(region).getByRole("button", { name: /^Reset/ }).click();
      await held(`${region} reset`);
    }
    console.log("PASS", region, labels.length, "controls");
  }
  assert.deepEqual(errors, []);
  console.log("PASS no page errors");
} finally {
  await browser.close();
}
