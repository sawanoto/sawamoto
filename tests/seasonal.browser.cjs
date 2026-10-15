// Optional real-browser layout checks. Run after build.py; see README.md.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../dist');
const shots = path.resolve(__dirname, '../.private/seasonal-screenshots');
const origin = 'https://seasonal.test';
const article = '/sawamoto/writing/support-center-music-therapy-2026/';
const types = {'.html':'text/html; charset=utf-8', '.js':'application/javascript', '.css':'text/css', '.png':'image/png'};

async function routeLocal(context) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    // No server or external network needed: serve generated files via Playwright.
    if (url.origin !== origin) return route.abort();
    let relative = decodeURIComponent(url.pathname.replace(/^\/sawamoto\//, ''));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404, body:'Not found'});
    return route.fulfill({body:fs.readFileSync(file), contentType:types[path.extname(file)] || 'application/octet-stream'});
  });
}

(async () => {
  fs.mkdirSync(shots, {recursive:true});
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  const context = await browser.newContext({timezoneId:'America/Los_Angeles', reducedMotion:'reduce'});
  await routeLocal(context);
  const page = await context.newPage();
  const errors=[];
  page.on('pageerror', error => errors.push(error.message));
  for (const width of [1280,390,320]) {
    await page.setViewportSize({width, height:900});
    for (let month=1;month<=12;month++) {
      await page.goto(`${origin}/sawamoto/?themeMonth=${month}`);
      assert.equal(await page.locator('html').getAttribute('data-theme-month'), String(month));
      assert.equal(await page.locator('.seasonal-mark svg').count(), 1);
      assert.equal(await page.locator('.seasonal-mark').getAttribute('aria-hidden'), 'true');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `overflow month ${month}, width ${width}`);
      const mark = await page.locator('.seasonal-mark').boundingBox();
      const brand = await page.locator('.brand').boundingBox();
      const nav = await page.locator('.header nav').boundingBox();
      assert.ok(mark.x >= brand.x + brand.width, 'decoration must not overlap brand');
      assert.ok(mark.x+mark.width <= width, 'decoration stays inside viewport');
      assert.ok(nav.y >= mark.y+mark.height || nav.x >= mark.x+mark.width, 'navigation stays separate');
      await page.screenshot({path:path.join(shots, `${String(month).padStart(2,'0')}-${width}.png`)});
      await page.goto(`${origin}${article}?themeMonth=${month}`);
      assert.equal(await page.locator('.prose').count(),1);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `article overflow month ${month}, width ${width}`);
    }
  }
  // Tokyo midnight while the browser is configured to another time zone.
  await page.clock.install({time:new Date('2026-10-31T14:59:59Z')});
  await page.goto(`${origin}/sawamoto/`);
  assert.equal(await page.locator('html').getAttribute('data-theme-month'), '10');
  await page.clock.runFor(1100);
  assert.equal(await page.locator('html').getAttribute('data-theme-month'), '11');
  await page.goto(`${origin}/sawamoto/?themeMonth=2`);
  assert.equal(await page.locator('html').getAttribute('data-theme-month'), '2');
  // Preview URLs never replace canonical SEO URLs.
  assert.equal(await page.locator('link[rel=canonical]').getAttribute('href'), 'https://sawanoto.github.io/sawamoto/');
  assert.deepEqual(errors, []);
  const noJs = await browser.newContext({javaScriptEnabled:false, viewport:{width:390,height:900}});
  await routeLocal(noJs);
  const fallback = await noJs.newPage();
  await fallback.goto(`${origin}/sawamoto/?themeMonth=10`);
  assert.equal(await fallback.locator('html').getAttribute('data-theme-month'), null);
  assert.equal(await fallback.locator('.seasonal-mark').isVisible(), false);
  assert.equal(await fallback.evaluate(() => getComputedStyle(document.body).backgroundColor), 'rgb(248, 247, 243)');
  await fallback.getByRole('link',{name:'Writing',exact:true}).click();
  assert.equal(new URL(fallback.url()).pathname, '/sawamoto/writing/');
  await browser.close();
  console.log('All 12 themes at desktop / 390px / 320px, articles, no-JS fallback, canonical and live JST rollover passed.');
})().catch(error => {console.error(error);process.exitCode=1;});
