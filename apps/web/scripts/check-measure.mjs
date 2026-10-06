/**
 * @file check-measure.mjs
 * @description Browser check for plan 2.3 in the MakeHuman lab (/lab/human): measurements show,
 *   typed cm/kg solve the body within 0.5 cm and 0.5 kg (as measured on the mesh), out-of-range
 *   input is clamped with its range shown, and a screenshot of the panel is saved.
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { setSlider, settle } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/human-lab";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const number = async (page, id) => Number.parseFloat(await page.getByTestId(id).textContent());

async function solve(page, cm, kg) {
  await page.getByTestId("input-height-cm").fill(String(cm));
  await page.getByTestId("input-mass-kg").fill(String(kg));
  await page.getByTestId("solve-size").click();
  await page.getByTestId("solve-range").waitFor();
  await settle(page);
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${base}/lab/human`);
  await page.getByTestId("measure-height").waitFor({ timeout: 60_000 });
  await settle(page);
  const start = { cm: await number(page, "measure-height"), kg: await number(page, "measure-mass"), waist: await number(page, "measure-waist") };
  assert.ok(start.cm > 150 && start.kg > 40 && start.waist > 55, JSON.stringify(start));
  console.log("PASS measurements", start);

  await setSlider(page, "gender", 1);
  await settle(page);
  await solve(page, 182, 72);
  const cm = await number(page, "measure-height");
  const kg = await number(page, "measure-mass");
  assert.ok(Math.abs(cm - 182) < 0.5 && Math.abs(kg - 72) < 0.5, `solved ${cm} cm ${kg} kg`);
  assert.ok(!(await page.getByTestId("solve-range").textContent()).includes("Clamped"));
  await page.locator("aside").screenshot({ path: `${output}/measure-182cm-72kg.png` });
  console.log("PASS solve 182 cm / 72 kg", { cm, kg });

  await solve(page, 300, 200);
  const clamped = await page.getByTestId("solve-range").textContent();
  assert.ok(clamped.includes("Clamped"), clamped);
  assert.ok((await number(page, "measure-height")) < 300);
  await page.locator("aside").screenshot({ path: `${output}/measure-clamped.png` });
  console.log("PASS clamp", clamped);

  assert.deepEqual(errors, []);
  console.log("PASS no page errors");
} finally {
  await browser.close();
}
