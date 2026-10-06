/**
 * @file check-body-types.mjs
 * @description Browser check for plan 2.4 in the MakeHuman lab (/lab/human): for a female and a male
 *   body, each of the seven body types keeps the typed height and weight (within 0.5 cm / 0.5 kg),
 *   changes the rendered body, and is saved as a screenshot; the intensity slider also keeps them.
 * @depends playwright, ./lab-helpers.mjs; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";
import { differs, setSlider, settle, viewport } from "./lab-helpers.mjs";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/body-types";
const TYPES = ["average", "slim", "athletic", "muscular", "curvy", "soft", "heavy"];
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });
const number = async (page, id) => Number.parseFloat(await page.getByTestId(id).textContent());

async function assertKept(page, keep, label) {
  const cm = await number(page, "measure-height");
  const kg = await number(page, "measure-mass");
  assert.ok(Math.abs(cm - keep.cm) < 0.5 && Math.abs(kg - keep.kg) < 0.5, `${label}: ${cm} cm ${kg} kg`);
  return { cm, kg };
}

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${base}/lab/human`);
  await page.getByTestId("measure-height").waitFor({ timeout: 60_000 });
  await settle(page);

  for (const [gender, keep] of [[0, { cm: 165, kg: 55 }], [1, { cm: 180, kg: 74 }]]) {
    await setSlider(page, "gender", gender);
    await page.getByTestId("body-type-average").click();
    await page.getByTestId("input-height-cm").fill(String(keep.cm));
    await page.getByTestId("input-mass-kg").fill(String(keep.kg));
    await page.getByTestId("solve-size").click();
    await settle(page);
    let average = null;
    for (const id of TYPES) {
      await page.getByTestId(`body-type-${id}`).click();
      await settle(page);
      const kept = await assertKept(page, keep, id);
      const shot = await viewport(page);
      if (id === "average") average = shot;
      else assert.ok(differs(average, shot) > 0.001, `${id} differs from average`);
      await page.getByTestId("human-viewport").screenshot({ path: `${output}/${gender ? "male" : "female"}-${id}.png` });
      console.log("PASS", gender ? "male" : "female", id, kept);
    }
    await setSlider(page, "type-intensity", 0.5);
    await settle(page);
    console.log("PASS intensity 50%", await assertKept(page, keep, "intensity"));
    await setSlider(page, "type-intensity", 1);
    await settle(page);
  }
  assert.deepEqual(errors, []);
  console.log("PASS no page errors");
} finally {
  await browser.close();
}
