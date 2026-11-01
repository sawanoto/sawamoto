// Run after python build.py; requires Playwright and Chromium.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');
const root = path.resolve(__dirname, '../dist');
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  try {
    const context = await browser.newContext({javaScriptEnabled:false});
    const missing = [];
    await context.route('**/*', route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'https://schedule.test') return route.abort();
      let relative = url.pathname.replace(/^\/sawamoto\//, '');
      if (relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) {
        missing.push(url.pathname);
        return route.fulfill({status:404, body:'Not found'});
      }
      const type = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript'}[path.extname(file)];
      return route.fulfill({body:fs.readFileSync(file),contentType:type || 'application/octet-stream'});
    });
    const page = await context.newPage();
    for (const width of [320,375,768,1280]) {
      await page.setViewportSize({width,height:900});
      await page.goto('https://schedule.test/sawamoto/writing/childcare-daily-schedule/');
      assert.equal(await page.locator('.daily-schedule__slot').count(),23);
      assert.equal(await page.locator('.daily-schedule__activity > p:not(.daily-schedule__category)').count(),58);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      const slots = await page.locator('.daily-schedule__slot').evaluateAll(nodes => nodes.map(n => {
        const time=n.querySelector('.daily-schedule__time').getBoundingClientRect();
        const activity=n.querySelector('.daily-schedule__activity').getBoundingClientRect();
        return {left:time.right <= activity.left,top:n.getBoundingClientRect().top};
      }));
      assert(slots.every((s,i) => s.left && (!i || s.top > slots[i-1].top)));
      fs.mkdirSync(path.resolve(__dirname,'../.private/schedule-screenshots'),{recursive:true});
      await page.screenshot({path:path.resolve(__dirname,`../.private/schedule-screenshots/${width}.png`),fullPage:true});
    }
    await page.goto('https://schedule.test/sawamoto/writing/');
    assert.equal(await page.locator('a[href="/sawamoto/writing/childcare-daily-schedule/"]').count(),1);
    for (const route of ['writing/omiyamairi-four-generations-20261031/','writing/mel-chan-knitted-vest/','works/']) {
      await page.goto(`https://schedule.test/sawamoto/${route}`);
      assert.equal(await page.locator('link[href$="daily-schedule.css"]').count(),0);
      assert.equal(await page.locator('h1').count(),1);
    }
    assert.deepEqual(missing,[]);
    console.log('Schedule: 23 slots, paragraphs, listing, existing URLs, isolated CSS and 320/375/768/1280px layouts pass (JavaScript disabled).');
  } finally { await browser.close(); }
})().catch(error => {console.error(error); process.exitCode=1;});
