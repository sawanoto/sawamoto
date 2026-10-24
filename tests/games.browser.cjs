const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath: process.env.CHROMIUM_PATH} : {});
  const context = await browser.newContext();
  const root = path.resolve(__dirname, '../dist');
  const routeLocal = route => {
    const url = new URL(route.request().url());
    if (url.origin !== 'https://games.test') return route.abort();
    let relative = url.pathname.replace(/^\/sawamoto\//, '');
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404});
    return route.fulfill({body:fs.readFileSync(file), contentType: ({'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript'})[path.extname(file)] || 'application/octet-stream'});
  };
  await context.route('**/*', routeLocal);
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  for (const width of [375, 768, 1280]) {
    await page.setViewportSize({width,height:900});
    await page.goto('https://games.test/sawamoto/games/');
    assert.equal(await page.locator('.game-entry:visible').count(),30);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await page.selectOption('#game-companion', '妻');
    assert.equal(await page.locator('.game-entry:visible').count(),5);
    await page.selectOption('#game-platform', 'PSP');
    assert.equal(await page.locator('.game-entry:visible').count(),0);
    assert.match(await page.locator('#game-count').innerText(), /条件に合う作品はありません/);
    await page.click('#game-reset');
    await page.locator('.game-card').first().click();
    await page.waitForURL('**/games/pokemon-leafgreen/');
    assert.match(await page.locator('.prose').innerText(), /記憶にある最初のゲーム/);
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  }
  assert.deepEqual(errors, []);
  await context.close();
  const noJS = await browser.newContext({javaScriptEnabled:false});
  const p = await noJS.newPage();
  await noJS.route('**/*', routeLocal);
  await p.goto('https://games.test/sawamoto/games/');
  assert.equal(await p.locator('.game-entry:visible').count(),30);
  assert.equal(await p.locator('.game-filters:visible').count(),0);
  await browser.close();
  console.log('Game history: mobile/tablet/desktop, filters, details and no-JS checks passed.');
})().catch(error => {console.error(error);process.exit(1);});
