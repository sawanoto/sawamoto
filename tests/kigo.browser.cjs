// Build first, then: CHROMIUM_PATH=/usr/bin/chromium node tests/kigo.browser.cjs
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../dist');
const data = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../content/kigo.json')));
const shots = path.resolve(__dirname, '../.private/kigo-screenshots');
const origin = 'https://kigo.test';
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css'};
async function routeLocal(context) {
  await context.route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.origin !== origin) return route.abort();
    let relative = decodeURIComponent(url.pathname.replace(/^\/sawamoto\//, ''));
    if (!relative || relative.endsWith('/')) relative += 'index.html';
    const file = path.resolve(root, relative);
    if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404,body:'Not found'});
    return route.fulfill({body:fs.readFileSync(file),contentType:types[path.extname(file)] || 'application/octet-stream'});
  });
}
(async () => {
  fs.mkdirSync(shots, {recursive:true});
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  try {
    const context = await browser.newContext({timezoneId:'America/Los_Angeles',reducedMotion:'reduce'});
    await routeLocal(context);
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.clock.install({time:new Date('2026-10-18T03:00:00Z')});
    await page.goto(`${origin}/sawamoto/`);
    const widget = page.locator('.daily-kigo');
    const details = widget.locator('details');
    const summary = widget.locator('summary');
    assert.equal(await widget.locator('time').textContent(), '十月十八日');
    assert.equal(await widget.locator('.kigo-term').textContent(), '秋深し');
    await summary.focus();
    await page.keyboard.press('Enter');
    assert.equal(await details.getAttribute('open'), '');
    assert.equal(await widget.locator('[data-kigo=season]').textContent(), '秋');
    await page.keyboard.press('Escape');
    assert.equal(await details.getAttribute('open'), null);
    assert.equal(await summary.evaluate(el => el === document.activeElement), true);
    await summary.click();
    await widget.getByRole('button', {name:'閉じる',exact:true}).click();
    assert.equal(await details.getAttribute('open'), null);
    await summary.click();
    await summary.click();
    assert.equal(await details.getAttribute('open'), null);
    await page.reload();
    assert.equal(await widget.locator('.kigo-term').textContent(), '秋深し');
    // Every real leap-year date, rendered using a non-Japan browser time zone.
    for (const [key, entry] of Object.entries(data)) {
      await page.clock.setSystemTime(new Date(`2024-${key}T03:00:00Z`));
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
      assert.equal(await widget.locator('.kigo-term').textContent(), entry.term, key);
      assert.equal(await widget.locator('time').getAttribute('datetime'), `2024-${key}`);
    }
    // Rollover while open: ordinary day, leap/non-leap February, month and year.
    for (const [before, after] of [
      ['2026-10-18','2026-10-19'], ['2026-02-28','2026-03-01'],
      ['2024-02-28','2024-02-29'], ['2024-02-29','2024-03-01'],
      ['2026-10-31','2026-11-01'], ['2026-12-31','2027-01-01']
    ]) {
      await page.clock.setSystemTime(new Date(`${before}T14:59:59Z`));
      await page.evaluate(() => window.dispatchEvent(new Event('pageshow')));
      await summary.click();
      await page.clock.runFor(1100);
      assert.equal(await widget.locator('time').getAttribute('datetime'), after);
      assert.equal(await widget.locator('.kigo-term').textContent(), data[after.slice(5)].term);
      assert.equal(await details.getAttribute('open'), null);
    }
    // Resuming after sleep, going back from BFCache, and focus all refresh immediately.
    for (const event of ['visibilitychange','pageshow','focus']) {
      await page.clock.setSystemTime(new Date('2028-02-29T03:00:00Z'));
      await page.evaluate(type => (type === 'visibilitychange' ? document : window).dispatchEvent(new Event(type)), event);
      assert.equal(await widget.locator('time').getAttribute('datetime'), '2028-02-29');
      await page.clock.setSystemTime(new Date('2028-03-01T03:00:00Z'));
      await page.evaluate(type => (type === 'visibilitychange' ? document : window).dispatchEvent(new Event(type)), event);
      assert.equal(await widget.locator('time').getAttribute('datetime'), '2028-03-01');
    }
    // Both short and long words and descriptions, all seasonal palettes and narrow screens.
    for (const width of [1280,768,600,390,320]) {
      await page.setViewportSize({width,height:900});
      for (const month of [1,2,3,4,5,6,7,8,9,10,11,12]) {
        await page.clock.setSystemTime(new Date(`2026-${String(month).padStart(2,'0')}-06T03:00:00Z`));
        await page.goto(`${origin}/sawamoto/`);
        const heroBefore = await page.locator('.hero').boundingBox();
        await summary.click();
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${width}/${month}`);
        const mark = await page.locator('.seasonal-mark').boundingBox();
        const box = await widget.boundingBox();
        const hero = await page.locator('.hero').boundingBox();
        const header = await page.locator('.header').boundingBox();
        const panel = await widget.locator('.kigo-detail').boundingBox();
        assert.ok(box.x >= mark.x + mark.width, 'word sits beside seasonal illustration');
        assert.ok(box.y < mark.y + mark.height && mark.y < box.y + box.height, 'word stays on illustration row');
        assert.equal(hero.y, heroBefore.y, 'opening details must not push down the hero');
        assert.ok(panel.y >= header.y + header.height, 'details open below navigation');
        assert.ok(panel.x >= 0 && panel.x + panel.width <= width, 'panel fits viewport');
      }
      await page.clock.setSystemTime(new Date('2026-10-18T03:00:00Z'));
      await page.goto(`${origin}/sawamoto/`);
      await page.screenshot({path:path.join(shots, `${width}-closed.png`)});
      await summary.click();
      await page.screenshot({path:path.join(shots, `${width}-open.png`)});
    }
    // Longest words must remain in the header on the smallest screen too.
    await page.setViewportSize({width:320,height:640});
    for (const key of ['03-06','04-26','06-30']) {
      await page.clock.setSystemTime(new Date(`2026-${key}T03:00:00Z`));
      await page.goto(`${origin}/sawamoto/`);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      const heroBefore = await page.locator('.hero').boundingBox();
      await summary.click();
      assert.equal((await page.locator('.hero').boundingBox()).y,heroBefore.y);
      await widget.getByRole('button',{name:'閉じる',exact:true}).click();
    }
    await summary.click();
    await page.mouse.click(5,160);
    assert.equal(await details.getAttribute('open'),null,'outside tap closes details');
    await page.goto(`${origin}/sawamoto/about/`);
    assert.equal(await widget.count(),0);
    assert.equal(await page.locator('script[src$="/kigo.js"],link[href$="/kigo.css"],#kigo-data').count(),0);
    assert.deepEqual(errors,[]);
    const touchContext = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:390,height:844}});
    await routeLocal(touchContext);
    const touch = await touchContext.newPage();
    await touch.goto(`${origin}/sawamoto/`);
    await touch.locator('.kigo-term').tap();
    assert.equal(await touch.locator('.daily-kigo details').getAttribute('open'),'');
    await touch.getByRole('button',{name:'閉じる',exact:true}).tap();
    assert.equal(await touch.locator('.daily-kigo details').getAttribute('open'),null);
    const noJsContext = await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:900}});
    await routeLocal(noJsContext);
    const noJs = await noJsContext.newPage();
    await noJs.goto(`${origin}/sawamoto/`);
    assert.equal(await noJs.locator('.daily-kigo').isVisible(),false);
    await noJs.getByRole('link',{name:'About',exact:true}).click();
    assert.equal(new URL(noJs.url()).pathname,'/sawamoto/about/');
    console.log('366 dates; JST midnight, leap/year rollovers; resume; reload; keyboard/touch; 5 widths × 12 months; home-only; no-JS: passed.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
