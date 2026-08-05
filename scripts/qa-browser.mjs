import fs from "node:fs";
import path from "node:path";

const { chromium } = await import("file:///C:/Users/scowell1/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs");
const repo = path.resolve(import.meta.dirname, "..");
const output = path.resolve(repo, "..", "..", "outputs", "qa-browser");
fs.mkdirSync(output, { recursive: true });

const base = "http://127.0.0.1:8881";
const failures = [];
const results = [];
const must = (condition, message) => {
  if (!condition) failures.push(message);
};

const browser = await chromium.launch({
  headless: true,
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe"
});

async function checkViewport(label, viewport) {
  const context = await browser.newContext({ viewport, deviceScaleFactor: 1 });
  const page = await context.newPage();
  const responseFailures = [];
  page.on("response", (response) => {
    if (response.status() >= 400) responseFailures.push(`${response.status()} ${response.url()}`);
  });
  page.on("pageerror", (error) => responseFailures.push(`pageerror ${error.message}`));

  await page.goto(`${base}/index.html`, { waitUntil: "networkidle" });
  must(await page.locator("h1").count() === 1, `${label}: landing page must have one H1`);
  must(await page.locator('.module-card:has(a[href^="module.html"])').count() === 11, `${label}: landing page must show 11 modules`);
  must(await page.getByText(/Integration inference — teacher-adjustable sequence/i).count() > 0, `${label}: cadence inference is missing`);
  must(await page.getByText(/No current dimensioned project plan was supplied/i).count() > 0, `${label}: plan gate is missing`);
  const indexOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  must(indexOverflow <= 1, `${label}: landing page overflows horizontally by ${indexOverflow}px`);
  await page.screenshot({ path: path.join(output, `${label}-index.png`), fullPage: true });

  for (const moduleNumber of [1, 11]) {
    await page.goto(`${base}/module.html?module=${moduleNumber}`, { waitUntil: "networkidle" });
    must(await page.locator("h1").count() === 1, `${label}: module ${moduleNumber} must have one H1`);
    must(await page.getByRole("button", { name: "Check answer" }).count() === 30, `${label}: module ${moduleNumber} must show 30 checks`);
    must(await page.getByRole("radio").count() === 120, `${label}: module ${moduleNumber} must show 120 answer options`);
    must(await page.locator("textarea").count() === 6, `${label}: module ${moduleNumber} must show six written-evidence areas`);
    must(await page.locator('a[target="_blank"]').filter({ hasText: /Open larger/ }).count() === 3, `${label}: module ${moduleNumber} needs three Open larger links`);
    const imagesBroken = await page.evaluate(() => [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src));
    must(imagesBroken.length === 0, `${label}: module ${moduleNumber} has broken images: ${imagesBroken.join(", ")}`);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    must(overflow <= 1, `${label}: module ${moduleNumber} overflows horizontally by ${overflow}px`);
    await page.locator(".theory-section").first().screenshot({ path: path.join(output, `${label}-module-${moduleNumber}-theory-1.png`) });
  }

  await page.goto(`${base}/module.html?module=1`, { waitUntil: "networkidle" });
  const firstQuestion = page.locator(".check").first();
  const radios = firstQuestion.getByRole("radio");
  const correctIndex = 0;
  await radios.nth(correctIndex === 0 ? 1 : 0).check();
  await firstQuestion.getByRole("button", { name: "Check answer" }).click();
  must((await firstQuestion.locator(".feedback").innerText()).startsWith("Not yet."), `${label}: incorrect feedback is not specific`);
  await radios.nth(correctIndex).check();
  await firstQuestion.getByRole("button", { name: "Check answer" }).click();
  must((await firstQuestion.locator(".feedback").innerText()).startsWith("Correct."), `${label}: correct feedback is missing`);
  await page.locator("textarea").first().fill("Module autosave QA");
  await page.waitForTimeout(450);
  await page.reload({ waitUntil: "networkidle" });
  must(await page.locator("textarea").first().inputValue() === "Module autosave QA", `${label}: module autosave did not restore`);
  await page.evaluate(() => localStorage.clear());

  await page.goto(`${base}/folio.html`, { waitUntil: "networkidle" });
  must(await page.locator(".folio-card").count() === 12, `${label}: folio must contain 12 cards`);
  must(await page.locator("textarea").count() === 36, `${label}: folio must contain 36 evidence textareas`);
  must(await page.locator("input[data-photo]").count() === 12, `${label}: folio must provide 12 optional photo controls`);
  must(await page.locator('a[target="_blank"]').filter({ hasText: /Open larger/ }).count() === 12, `${label}: folio needs 12 Open larger links`);
  const card4 = await page.locator("#folio-card-04").innerText();
  must(/only a title slide/i.test(card4) && /not a design brief or plan/i.test(card4), `${label}: Module 4 source gate is not visibly rendered`);
  const card12 = await page.locator("#folio-card-12").innerText();
  must(/Teacher to confirm\/provide current plan/i.test(card12) && /No current dimensioned/i.test(card12), `${label}: Card 12 plan gate is not visibly rendered`);
  await page.locator("textarea").first().fill("Folio autosave QA");
  await page.waitForTimeout(450);
  await page.reload({ waitUntil: "networkidle" });
  must(await page.locator("textarea").first().inputValue() === "Folio autosave QA", `${label}: folio autosave did not restore`);
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: "networkidle" });
  must(await page.locator("textarea").first().inputValue() === "", `${label}: QA autosave data did not clear`);
  const folioOverflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  must(folioOverflow <= 1, `${label}: folio overflows horizontally by ${folioOverflow}px`);
  await page.locator("#folio-card-04").screenshot({ path: path.join(output, `${label}-folio-card-04.png`) });
  await page.locator("#folio-card-12").screenshot({ path: path.join(output, `${label}-folio-card-12.png`) });

  await page.keyboard.press("Tab");
  const focused = await page.evaluate(() => ({ tag: document.activeElement?.tagName, text: document.activeElement?.textContent?.trim().slice(0, 80) }));
  must(Boolean(focused.tag), `${label}: keyboard focus did not enter the page`);
  must(responseFailures.length === 0, `${label}: browser errors: ${responseFailures.join(" | ")}`);
  results.push({ label, viewport, responseFailures, focused });
  await context.close();
}

await checkViewport("desktop", { width: 1440, height: 1000 });
await checkViewport("mobile-390", { width: 390, height: 844 });
await browser.close();

const report = { passed: failures.length === 0, results, failures };
fs.writeFileSync(path.join(output, "qa-report.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
if (failures.length) {
  console.error(failures.join("\n"));
  process.exit(1);
}
console.log("Browser QA passed at 1440px and 390px with no broken images, page errors or horizontal overflow.");
