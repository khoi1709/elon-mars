import puppeteer from 'puppeteer-core';
import { mkdir, writeFile } from 'node:fs/promises';

const output = 'C:/Hackathon/output/ares-release/repo/output/mission-v2/lake-field-review';
const url = 'http://127.0.0.1:3000/?mission=frontiers';
const storageKey = 'ares-cradle-mission-v2';
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
});
const result = { url, viewport: { width: 1280, height: 800 }, errors: [], screenshots: [] };
try {
  await mkdir(output, { recursive: true });
  const page = await browser.newPage();
  page.on('pageerror', error => result.errors.push(`page: ${error.message}`));
  page.on('console', message => { if (message.type() === 'error') result.errors.push(`console: ${message.text()}`); });
  page.on('requestfailed', request => result.errors.push(`request: ${request.url()} ${request.failure()?.errorText}`));
  await page.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1 });
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
  await page.waitForSelector('.mission-start-screen', { timeout: 20000 });
  result.title = await page.title();
  result.startHeading = await page.$eval('h1', element => element.innerText);
  for (const button of await page.$$('.start-region')) {
    if ((await button.evaluate(element => element.textContent ?? '')).includes('Old Lake Shore')) {
      await button.click();
      break;
    }
  }
  await page.click('.start-action');
  await page.waitForSelector('.mission-cinematic__skip', { timeout: 15000 });
  result.introHeading = await page.evaluate(() => document.querySelector('#cinematic-title')?.textContent?.trim() ?? null);
  await page.click('.mission-cinematic__skip');
  await page.waitForSelector('.mission-stage canvas', { timeout: 25000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await new Promise(resolve => setTimeout(resolve, 1200));
  result.save = await page.evaluate(key => {
    const raw = localStorage.getItem(key);
    if (raw === null) return null;
    const state = JSON.parse(raw);
    return {
      saveRevision: state.saveRevision,
      started: state.started,
      startRegion: state.startRegion,
      introSeen: state.introSeen,
      leo: state.leo,
      activeRover: state.activeRover,
      rover: state.rovers?.lake,
      stock: state.bases?.lake?.stock,
      observations: state.surveys?.lake?.observations,
      activityProgress: state.surveys?.lake?.activityProgress,
    };
  }, storageKey);
  result.world = await page.evaluate(() => {
    const canvas = document.querySelector('.mission-stage canvas');
    const rect = canvas?.getBoundingClientRect();
    return {
      canvas: canvas ? { bitmap: [canvas.width, canvas.height], rect: rect && { x: rect.x, y: rect.y, width: rect.width, height: rect.height } } : null,
      visibleText: document.querySelector('main')?.innerText.slice(0, 1000) ?? '',
      visibleButtons: [...document.querySelectorAll('main button')].map(button => ({ text: button.innerText.trim(), label: button.getAttribute('aria-label'), disabled: button.disabled })).slice(0, 40),
    };
  });
  const imagePath = `${output}/01-lake-field-first-world.png`;
  await page.screenshot({ path: imagePath, type: 'png' });
  result.screenshots.push(imagePath);
  result.checks = [
    'Fresh profile selected Old Lake Shore through the public start buttons.',
    'Intro cinematic completed with its visible Skip scene button.',
    'First world image captured without writing or injecting mission state.',
    'Mission save inspected read-only from the documented localStorage key.',
  ];
  await writeFile(`${output}/preview-result.json`, JSON.stringify(result, null, 2));
  console.log(JSON.stringify(result, null, 2));
} catch (error) {
  result.error = String(error?.stack ?? error);
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/preview-result.json`, JSON.stringify(result, null, 2));
  console.error(JSON.stringify(result, null, 2));
  process.exitCode = 1;
} finally {
  await browser.close();
}
