/**
 * @file check-human.mjs
 * @description Browser check for the MakeHuman lab (/lab/human): the body loads without errors,
 *   ethnicity presets and gender change the rendered pixels, the height slider changes the
 *   measured height, ages 18-25 share the adult body, and screenshots of the three ethnic
 *   presets (female and male) and three ages are saved; hairstyle, hair colour, eye colour and
 *   skin tone change the portrait, and three portraits are saved.
 * @depends playwright; running Next dev server on STUDIO_URL or http://localhost:3000
 */
import assert from "node:assert/strict";
import { mkdir } from "node:fs/promises";
import { chromium } from "playwright";

const base = process.env.STUDIO_URL ?? "http://localhost:3000";
const output = "screenshots/human-lab";
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: process.env.PLAYWRIGHT_CHANNEL ?? "chrome" });

/** Sets a React-controlled range input and fires the input event React listens to. */
async function setSlider(page, key, value) {
  await page.evaluate(
    ([testId, next]) => {
      const input = document.querySelector(`[data-testid="${testId}"]`);
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value").set;
      setter.call(input, String(next));
      input.dispatchEvent(new Event("input", { bubbles: true }));
    },
    [`slider-${key}`, value],
  );
}

const heightCm = async (page) => Number((await page.getByTestId("body-height").textContent()).match(/(\d+) cm/)?.[1]);
const settle = (page) => page.waitForTimeout(400);
/** Downsampled greyscale pixels read back from the WebGL canvas (preserveDrawingBuffer). */
const viewport = (page) =>
  page.evaluate(() => {
    const source = document.querySelector('[data-testid="human-viewport"] canvas');
    const copy = document.createElement("canvas");
    copy.width = 200;
    copy.height = 180;
    const context = copy.getContext("2d");
    context.drawImage(source, 0, 0, copy.width, copy.height);
    const { data } = context.getImageData(0, 0, copy.width, copy.height);
    return Array.from({ length: data.length / 4 }, (_, i) => Math.round((data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / 3));
  });
/** Share of sampled pixels whose grey value changed by more than 6 levels. */
const differs = (a, b) => a.reduce((count, value, i) => count + (Math.abs(value - b[i]) > 6 ? 1 : 0), 0) / a.length;

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()));
  await page.goto(`${base}/lab/human`);
  await page.getByTestId("body-height").filter({ hasText: "cm" }).waitFor({ timeout: 60_000 });
  await settle(page);
  const average = await heightCm(page);
  assert.ok(average >= 155 && average <= 180, `average height ${average} cm`);
  console.log("PASS body loads", { average });

  for (const gender of [0, 1]) {
    await setSlider(page, "gender", gender);
    let previous = null;
    for (const preset of ["african", "asian", "caucasian"]) {
      await page.getByTestId(`preset-${preset}`).click();
      await settle(page);
      const shot = await viewport(page);
      const name = `${preset}-${gender ? "male" : "female"}.png`;
      await page.getByTestId("human-viewport").screenshot({ path: `${output}/${name}` });
      if (previous) assert.ok(differs(previous, shot) > 0.001, `${name} differs from previous preset`);
      previous = shot;
      console.log("PASS screenshot", name, `${await heightCm(page)} cm`);
    }
  }

  await setSlider(page, "height", 0);
  await settle(page);
  const short = await heightCm(page);
  await setSlider(page, "height", 1);
  await settle(page);
  const tall = await heightCm(page);
  assert.ok(tall - short > 40, `height slider range ${short}-${tall} cm`);
  console.log("PASS height slider", { short, tall });

  await setSlider(page, "height", 0.5);
  const ageShots = {};
  for (const age of [18, 25, 35]) {
    await setSlider(page, "ageYears", age);
    await settle(page);
    ageShots[age] = { cm: await heightCm(page), shot: await viewport(page) };
    await page.getByTestId("human-viewport").screenshot({ path: `${output}/age-${age}.png` });
  }
  assert.equal(ageShots[18].cm, ageShots[25].cm, "18 and 25 years share the adult body");
  assert.ok(differs(ageShots[18].shot, ageShots[25].shot) < 0.001, "18 and 25 years render the same");
  assert.ok(Math.abs(ageShots[35].cm - ageShots[25].cm) <= 3, `35 years stays adult-sized (${ageShots[35].cm} cm)`);
  console.log("PASS age range", Object.fromEntries(Object.entries(ageShots).map(([age, { cm }]) => [age, cm])));

  // Appearance, framed on the head.
  await setSlider(page, "ageYears", 25);
  await page.getByTestId("view-portrait").click();
  await settle(page);
  const still = differs(await viewport(page), (await page.waitForTimeout(800), await viewport(page)));
  assert.ok(still < 0.0001, `render is stable without changes (${still.toFixed(4)})`);
  console.log("PASS stable render", still.toFixed(4));
  const changes = async (label, action) => {
    const before = await viewport(page);
    await action();
    await page.waitForTimeout(1200);
    const ratio = differs(before, await viewport(page));
    assert.ok(ratio > 0.0002, `${label} changes the render (${ratio.toFixed(4)})`);
    console.log("PASS", label, ratio.toFixed(4));
  };
  await changes("hairstyle", () => page.getByTestId("select-hair").selectOption("long01"));
  await changes("hair colour", () => page.getByTestId("hair-colour-blonde").click());
  await changes("no hair", () => page.getByTestId("select-hair").selectOption(""));
  await page.getByTestId("select-hair").selectOption("short02");
  await page.waitForTimeout(1500);
  await changes("eye colour", () => page.getByTestId("select-eyeColour").selectOption("blue"));
  await changes("skin tone", () => setSlider(page, "skinTone", 0.1));
  await setSlider(page, "skinTone", 0.5);
  const looks = [
    ["caucasian", 0, "long01", "blonde", "blue"],
    ["african", 1, "afro01", "black", "brown"],
    ["asian", 0, "bob02", "dark-brown", "brownlight"],
  ];
  for (const [ethnicity, gender, hair, colour, eye] of looks) {
    await setSlider(page, "gender", gender);
    await page.getByTestId(`preset-${ethnicity}`).click();
    await page.getByTestId("select-hair").selectOption(hair);
    await page.getByTestId(`hair-colour-${colour}`).click();
    await page.getByTestId("select-eyeColour").selectOption(eye);
    await page.waitForTimeout(1500);
    await page.getByTestId("human-viewport").screenshot({ path: `${output}/portrait-${ethnicity}.png` });
  }
  console.log("PASS portraits saved");

  assert.deepEqual(errors, [], "no page or console errors");
  console.log("PASS no errors");
} finally {
  await browser.close();
}
