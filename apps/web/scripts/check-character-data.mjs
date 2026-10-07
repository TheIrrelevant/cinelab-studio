/**
 * @file check-character-data.mjs
 * @description Browser check for plan 2.9 (character data v2): a v1 character in localStorage
 *   migrates and opens in the creator from the library; a creator character (name, body type, head
 *   modifier, hair from the Asian preset) saves as version 2, the URL gets `?id=`, and reloading
 *   that deep link restores the same body (same cm/kg, same picture), name and choices.
 * @depends playwright; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { differs } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/character-data";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const KEY = "cinelab-studio:characters:v1";
const V1 = {
  id: "legacy-1", name: "Mira", baseModelId: "base-aria", genderPresentation: "feminine", bodyPreset: "plus",
  skinTone: "skin-05", hairStyle: "hair-curly", hairColor: "#aa3311", faceReferenceImageIds: [], notes: "",
  createdAt: "2026-07-01T00:00:00.000Z", updatedAt: "2026-07-01T00:00:00.000Z",
};
const pixels = (page) =>
  page.evaluate(() => {
    const source = document.querySelector('[data-testid="creator-viewport"] canvas');
    const copy = Object.assign(document.createElement("canvas"), { width: 400, height: 400 });
    const context = copy.getContext("2d");
    context.drawImage(source, 0, 0, copy.width, copy.height);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    return Array.from({ length: data.length / 4 }, (_, i) => Math.round((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3));
  });
const measured = async (page) => (await page.getByTestId("creator-measured").textContent()).match(/[\d.]+/g).map(Number).slice(0, 2);
const ready = async (page) => {
  await page.getByTestId("creator-measured").filter({ hasText: "Measured" }).waitFor({ timeout: 90_000 });
  await page.waitForTimeout(1500);
};
const stored = (page) => page.evaluate((key) => JSON.parse(window.localStorage.getItem(key) ?? "[]"), KEY);

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));

  await page.goto(`${base}/characters`);
  await page.evaluate(([key, v1]) => window.localStorage.setItem(key, JSON.stringify([v1])), [KEY, V1]);
  await page.reload();
  await page.getByRole("link", { name: "Edit Mira" }).click();
  await page.waitForURL(/\/characters\/creator\?id=legacy-1/);
  await ready(page);
  assert.equal(await page.getByLabel("Character name").inputValue(), "Mira");
  assert.equal(await page.getByRole("radio", { name: "Heavy", exact: true }).getAttribute("aria-checked"), "true");
  assert.equal(await page.getByRole("radio", { name: "African", exact: true }).getAttribute("aria-checked"), "true");
  await page.getByTestId("creator-viewport").screenshot({ path: `${output}/migrated-v1.png` });
  console.log("PASS v1 character migrates and opens", await measured(page));

  await page.goto(`${base}/characters/creator`);
  await ready(page);
  await page.getByRole("radio", { name: "Asian", exact: true }).click();
  await page.getByRole("radio", { name: "Curvy", exact: true }).click();
  await page.getByRole("tab", { name: "Head" }).click();
  await page.getByRole("radio", { name: "heart" }).click();
  await page.getByRole("tab", { name: "Body" }).click();
  await page.getByLabel("Character name").fill("Lena");
  await page.waitForTimeout(1500);
  const before = { size: await measured(page), pixels: await pixels(page) };
  await page.getByRole("button", { name: "Save" }).click();
  await page.waitForURL(/\/characters\/creator\?id=.+/);
  assert.equal(await page.getByRole("status").textContent(), "Saved.");
  const [saved] = (await stored(page)).filter((c) => c.name === "Lena");
  assert.equal(saved.version, 2);
  assert.equal(saved.human.shape.bodyType.id, "curvy");
  assert.ok(saved.human.shape.modifiers["head/head-invertedtriangular"] > 0, "face shape saved");
  console.log("PASS saved as v2", page.url().replace(base, ""));

  await page.reload();
  await ready(page);
  const after = { size: await measured(page), pixels: await pixels(page) };
  assert.equal(await page.getByLabel("Character name").inputValue(), "Lena");
  assert.equal(await page.getByRole("radio", { name: "Curvy", exact: true }).getAttribute("aria-checked"), "true");
  assert.deepEqual(after.size, before.size);
  const change = differs(before.pixels, after.pixels);
  assert.ok(change < 0.002, `reloaded picture differs by ${change}`);
  await page.getByTestId("creator-viewport").screenshot({ path: `${output}/deep-link-reload.png` });
  console.log("PASS deep link reload restores the character", after.size, change.toFixed(4));

  await page.getByRole("button", { name: "Save" }).click();
  assert.equal((await stored(page)).filter((c) => c.name === "Lena").length, 1);
  console.log("PASS second save updates, no duplicate");
  assert.deepEqual(errors, []);
  console.log("PASS no page errors");
} finally {
  await browser.close();
}
