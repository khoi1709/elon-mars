import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'C:/Hackathon/output/ares-release/repo/isolatedoutput/mission-v2/integration-review';
const edge = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
await mkdir(out, { recursive: true });
const browser = await puppeteer.launch({ executablePath: edge, headless: true });
const result = { url: 'http://127.0.0.1:3000/?mission=frontiers', pageErrors: [], checks: [], screenshots: [] };
try {
  const page = await browser.newPage();
  page.on('pageerror', error => result.pageErrors.push(error.message));
  await page.setViewport({ width: 1280, height: 800 });
  await page.goto(result.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.mission-start-screen', { timeout: 20000 });
  result.title = await page.title();
  result.startHeading = await page.$eval('h1', element => element.innerText);
  await page.screenshot({ path: `${out}/01-title.png` });
  result.screenshots.push(`${out}/01-title.png`);
  result.checks.push('title screen rendered');
  await page.click('.start-action');
  await page.waitForSelector('.mission-intro-screen', { timeout: 15000 });
  result.introHeading = await page.$eval('h1', element => element.innerText);
  await page.click('.mission-intro-screen .primary-action');
  await page.waitForSelector('.mission-stage canvas', { timeout: 25000 });
  await new Promise(resolve => setTimeout(resolve, 2500));
  result.canvas = await page.$eval('.mission-stage canvas', canvas => ({ width: canvas.width, height: canvas.height, cssWidth: canvas.clientWidth, cssHeight: canvas.clientHeight }));
  result.worldText = (await page.$eval('main', element => element.innerText)).slice(0, 900);
  await page.screenshot({ path: `${out}/02-world.png` });
  result.screenshots.push(`${out}/02-world.png`);
  result.checks.push('intro-to-world rendered canvas');
  await page.evaluate(() => document.activeElement instanceof HTMLElement && document.activeElement.blur());
  const before = await page.evaluate(() => localStorage.getItem('ares-cradle-mission-v2'));
  await page.keyboard.down('w');
  await new Promise(resolve => setTimeout(resolve, 1100));
  await page.keyboard.up('w');
  const after = await page.evaluate(() => localStorage.getItem('ares-cradle-mission-v2'));
  result.movementSaveChanged = before !== after;
  if (before && after) {
    const a = JSON.parse(before), b = JSON.parse(after);
    result.pose = { before: a.leo, after: b.leo };
    result.movementObserved = Math.hypot(a.leo.x - b.leo.x, a.leo.z - b.leo.z) > 0.01;
    result.checks.push(`real W movement changed Leo pose: ${result.movementObserved}`);
  }
  await writeFile(`${out}/browser-result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result));
} catch (error) {
  result.error = String(error?.stack ?? error);
  await writeFile(`${out}/browser-result.json`, JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result));
  process.exitCode = 1;
} finally {
  await browser.close();
}
