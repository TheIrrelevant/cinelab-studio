/**
 * @file lab-helpers.mjs
 * @description Shared Playwright helpers for the human lab browser checks: React range input
 *   setter, measured height, canvas pixel sampling and pixel difference ratio.
 * @depends playwright page objects
 */

/** Sets a React-controlled range input and fires the input event React listens to. */
export async function setSlider(page, key, value) {
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

export const heightCm = async (page) => Number((await page.getByTestId("body-height").textContent()).match(/(\d+) cm/)?.[1]);
export const settle = (page) => page.waitForTimeout(400);

/** Downsampled greyscale pixels read back from the WebGL canvas (preserveDrawingBuffer). */
export const viewport = (page) =>
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
export const differs = (a, b) => a.reduce((count, value, i) => count + (Math.abs(value - b[i]) > 6 ? 1 : 0), 0) / a.length;

/** Opens the lab and waits until the body has loaded. */
export async function openLab(page, base) {
  await page.goto(`${base}/lab/human`);
  await page.getByTestId("body-height").filter({ hasText: "cm" }).waitFor({ timeout: 60_000 });
  await settle(page);
}
