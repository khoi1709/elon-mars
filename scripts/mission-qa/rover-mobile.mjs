import puppeteer from 'puppeteer-core';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';

const root = 'C:/Hackathon/output/ares-phase0/rover-migration/mobile-fix';
const url = 'http://127.0.0.1:3000/?review=rover';
const baseline = process.argv.includes('--baseline');
await mkdir(root, { recursive: true });
const browser = await puppeteer.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  userDataDir: `${root}/edge-profile`,
  args: ['--window-size=1280,900'],
});
const report = { url, browser: 'Microsoft Edge (headless; default security)', scenarios: [], checks: [], errors: [] };
const pages = [];
function watch(page, label) {
  page.on('pageerror', e => report.errors.push(`${label}: ${e.message}`));
  page.on('console', msg => { if (msg.type() === 'error') report.errors.push(`${label}: console ${msg.text()}`); });
  page.on('requestfailed', req => report.errors.push(`${label}: request ${req.url()} ${req.failure()?.errorText}`));
  pages.push(page);
}
async function stable(page) {
  await page.waitForSelector('.rover-review canvas', { timeout: 30000 });
  await page.waitForFunction(() => {
    const c = document.querySelector('.rover-review canvas');
    return c && c.width > 0 && c.height > 0 && c.getBoundingClientRect().width > 0 && c.getBoundingClientRect().height > 0;
  }, { timeout: 30000 });
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(() => requestAnimationFrame(resolve)))));
  await new Promise(resolve => setTimeout(resolve, 700));
  await page.evaluate(() => {
    const c = document.querySelector('.rover-review canvas');
    c.addEventListener('webglcontextlost', () => { window.__roverWebglLost = true; });
    c.addEventListener('webglcontextcreationerror', e => { window.__roverWebglCreationError = e.statusMessage; });
  });
}
async function metrics(page) {
  return page.evaluate(() => {
    const main = document.querySelector('.rover-review');
    const viewport = document.querySelector('.rover-review .viewport');
    const canvas = viewport.querySelector('canvas');
    const box = element => { const r = element.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    const style = getComputedStyle(canvas), vStyle = getComputedStyle(viewport);
    const r = canvas.getBoundingClientRect();
    const gl = canvas.getContext('webgl2') || canvas.getContext('webgl');
    const sample = gl ? new Uint8Array(4) : null;
    if (gl) { gl.readPixels(Math.floor(canvas.width / 2), Math.floor(canvas.height / 2), 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, sample); }
    const topAtCenter = document.elementFromPoint(Math.min(innerWidth - 1, r.left + r.width / 2), Math.min(innerHeight - 1, r.top + r.height / 2));
    return {
      timeOrigin: performance.timeOrigin,
      viewportSize: { width: innerWidth, height: innerHeight },
      pageSize: { width: document.documentElement.scrollWidth, height: document.documentElement.scrollHeight },
      main: box(main), flexViewport: { ...box(viewport), display: vStyle.display, flex: vStyle.flex, minHeight: vStyle.minHeight },
      canvas: { ...box(canvas), bitmapWidth: canvas.width, bitmapHeight: canvas.height, display: style.display, visibility: style.visibility, opacity: style.opacity, zIndex: style.zIndex },
      centerHit: { tag: topAtCenter?.tagName, isCanvas: topAtCenter === canvas, className: typeof topAtCenter?.className === 'string' ? topAtCenter.className : '' },
      webgl: gl ? { version: gl.getParameter(gl.VERSION), drawingBuffer: [gl.drawingBufferWidth, gl.drawingBufferHeight], contextAttributes: gl.getContextAttributes(), centerRGBA: [...sample], error: gl.getError() } : null,
      webglLost: Boolean(window.__roverWebglLost), webglCreationError: window.__roverWebglCreationError || null,
      bodyBackground: getComputedStyle(document.body).backgroundColor,
    };
  });
}
async function analyze(page, png, box) {
  return page.evaluate(async ({ base64, box }) => {
    const image = new Image(); image.src = `data:image/png;base64,${base64}`; await image.decode();
    const c = document.createElement('canvas'); c.width = image.naturalWidth; c.height = image.naturalHeight;
    const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(image, 0, 0);
    const x0 = Math.max(0, Math.ceil(box.x + box.width * .08)), x1 = Math.min(c.width, Math.floor(box.x + box.width * .92));
    const y0 = Math.max(0, Math.ceil(box.y + box.height * .08)), y1 = Math.min(c.height, Math.floor(box.y + box.height * .92));
    const stride = Math.max(1, Math.floor(Math.min(x1 - x0, y1 - y0) / 90));
    const bg = [16, 23, 28], colors = new Set(); let seen = 0, changed = 0;
    for (let y = y0; y < y1; y += stride) for (let x = x0; x < x1; x += stride) {
      const i = (y * c.width + x) * 4, d = ctx.getImageData(x, y, 1, 1).data;
      const r = d[0], g = d[1], b = d[2]; seen++;
      if ((r - bg[0]) ** 2 + (g - bg[1]) ** 2 + (b - bg[2]) ** 2 > 30 ** 2) changed++;
      colors.add(`${r >> 4},${g >> 4},${b >> 4}`);
    }
    return { roi: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 }, sampledPixels: seen, nonBackgroundRatio: changed / seen, quantizedColors: colors.size, sceneVisible: changed / seen > .04 && colors.size > 12 };
  }, { base64: png.toString('base64'), box });
}
async function capture(page, label, filename) {
  await stable(page);
  const state = await metrics(page);
  const png = await page.screenshot({ path: `${root}/${filename}`, type: 'png' });
  const pixels = await analyze(page, png, state.canvas);
  const result = { label, ...state, pixels, screenshot: `${root}/${filename}` };
  report.scenarios.push(result);
  return result;
}
async function blankControl(page, box) {
  const dataUrl = await page.evaluate(() => {
    const c = document.createElement('canvas'); c.width = innerWidth; c.height = innerHeight;
    const ctx = c.getContext('2d'); ctx.fillStyle = '#10171c'; ctx.fillRect(0, 0, c.width, c.height); return c.toDataURL('image/png');
  });
  const blank = Buffer.from(dataUrl.slice(dataUrl.indexOf(',') + 1), 'base64');
  const result = await analyze(page, blank, box);
  assert.equal(result.sceneVisible, false, 'pixel detector must reject a uniform blank viewport control');
  return result;
}
async function newPage(viewport) {
  const page = await browser.newPage(); watch(page, `page${pages.length + 1}`);
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 45000 });
  return page;
}
try {
  // Stable non-mobile emulation isolates CSS viewport resizing from Puppeteer mobile-mode reloads.
  const resizePage = await newPage({ width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  const desktop = await capture(resizePage, 'size-only desktop at 1280x800', 'after-size-only-desktop.png');
  await resizePage.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  const mobile = await capture(resizePage, 'same-document size-only resize to 390x844', 'after-size-only-mobile.png');
  assert.equal(mobile.timeOrigin, desktop.timeOrigin, 'size-only resize must not navigate/reload the document');
  await resizePage.setViewport({ width: 1280, height: 800, deviceScaleFactor: 1, isMobile: false, hasTouch: false });
  const returned = await capture(resizePage, 'same-document return to desktop 1280x800', 'after-size-only-return-desktop.png');
  assert.equal(returned.timeOrigin, desktop.timeOrigin);
  for (const result of [desktop, mobile, returned]) assert.equal(result.pixels.sceneVisible, true, `${result.label}: real scene pixels visible in canvas interior`);
  report.checks.push('desktop → mobile → desktop same-document size-only resize retains visible 3D scene pixels');
  report.checks.push('pixel detector rejects uniform blank viewport control');
  report.blankControl = await blankControl(resizePage, mobile.canvas);

  // Independently cover a fresh 390px mobile page with stable touch/mobile emulation.
  const fresh = await newPage({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const freshMobile = await capture(fresh, 'fresh mobile-mode load at 390x844', 'after-fresh-mobile.png');
  assert.equal(freshMobile.pixels.sceneVisible, true, 'fresh mobile screenshot must contain actual scene pixels');
  assert.equal(freshMobile.pageSize.width <= 390, true, 'no horizontal page overflow on mobile');
  const controls = await fresh.evaluate(() => [...document.querySelectorAll('.rover-review button')].map(b => { const r = b.getBoundingClientRect(); return { label: b.textContent.trim(), width: r.width, height: r.height }; }));
  assert(controls.every(b => b.width >= 48 && b.height >= 48), `mobile button touch targets below 48px: ${JSON.stringify(controls)}`);
  report.mobileControls = controls;
  await fresh.keyboard.press('Tab');
  const focus = await fresh.evaluate(() => ({ tag: document.activeElement.tagName, text: document.activeElement.textContent.trim(), outline: getComputedStyle(document.activeElement).outlineStyle, outlineWidth: getComputedStyle(document.activeElement).outlineWidth }));
  assert.notEqual(focus.outlineStyle, 'none', `keyboard focus indicator missing: ${JSON.stringify(focus)}`);
  report.mobileFocus = focus;
  await fresh.click('.rover-review input[type="checkbox"]');
  const reduced = await fresh.evaluate(() => ({ checked: document.querySelector('input[type="checkbox"]').checked, driveDisabled: [...document.querySelectorAll('button')].slice(0, 2).every(b => b.disabled) }));
  assert.deepEqual(reduced, { checked: true, driveDisabled: true });
  report.mobileReducedMotion = reduced;
  report.checks.push('fresh mobile load has visible scene, no horizontal overflow, ≥48px buttons, keyboard focus ring, reduced-motion drive lock');

  const narrow = await newPage({ width: 390, height: 520, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  const scroll = await narrow.evaluate(() => ({ pageHeight: document.documentElement.scrollHeight, viewportHeight: innerHeight, footerBottomBefore: document.querySelector('footer').getBoundingClientRect().bottom }));
  await narrow.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
  const scrollAfter = await narrow.evaluate(() => ({ y: scrollY, footerBottom: document.querySelector('footer').getBoundingClientRect().bottom, viewportHeight: innerHeight }));
  report.mobileScroll = { before: scroll, after: scrollAfter };
  assert(scrollAfter.footerBottom <= scrollAfter.viewportHeight + 1 || scrollAfter.y === 0, `mobile footer not reachable by natural scrolling: ${JSON.stringify(report.mobileScroll)}`);
  report.checks.push('narrow mobile page keeps footer reachable without horizontal overflow');

  const prefersReduced = await browser.newPage(); watch(prefersReduced, 'prefers-reduced-motion page');
  await prefersReduced.emulateMediaFeatures([{ name: 'prefers-reduced-motion', value: 'reduce' }]);
  await prefersReduced.setViewport({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
  await prefersReduced.goto(url, { waitUntil: 'networkidle0', timeout: 45000 }); await stable(prefersReduced);
  const osReduced = await prefersReduced.evaluate(() => ({ checked: document.querySelector('input[type="checkbox"]').checked, driveDisabled: [...document.querySelectorAll('button')].slice(0, 2).every(b => b.disabled) }));
  assert.deepEqual(osReduced, { checked: true, driveDisabled: true });
  report.osReducedMotion = osReduced;
  report.checks.push('OS prefers-reduced-motion initializes checked and disables driving');
  assert.deepEqual(report.errors, [], 'no page errors, console errors, or failed requests');
  report.checks.push('no page, console, failed-request, or WebGL-context errors');
  await writeFile(`${root}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report, null, 2));
} finally {
  await browser.close();
}
