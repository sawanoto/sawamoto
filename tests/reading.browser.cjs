// Run after python build.py: node tests/reading.browser.cjs
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const {existsSync} = require('node:fs');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || (existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined), args:['--no-sandbox']});
  try {
    const context = await browser.newContext();
    await context.route('**/*', async route => {
      const url = new URL(route.request().url());
      if (url.origin !== 'http://reading.test') return route.abort();
      let file = url.pathname.replace(/^\/sawamoto\//, '');
      if (!file || file.endsWith('/')) file += 'index.html';
      await route.fulfill({path:path.join(__dirname, '../dist', file)});
    });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('http://reading.test/sawamoto/');
    await page.getByRole('link', {name:'読書遍歴', exact:true}).click();
    assert.equal(await page.locator('.reading-record').count(),87);
    assert.equal(await page.locator('.reading-featured li').count(),10);
    await page.locator('#reading-view').selectOption('genre');
    await page.locator('#reading-genre').selectOption('SF');
    assert.equal(await page.locator('.reading-record').count(),14);
    await page.locator('#reading-search').fill('劉慈欣');
    assert.equal(await page.locator('.reading-record').count(),4);
    await page.locator('#reading-status').selectOption('途中で中断');
    assert.equal(await page.locator('.reading-record').count(),1);
    assert.match(await page.locator('.reading-record h3').innerText(),/白亜紀/);
    await page.locator('#reading-search').fill('見つからない検索');
    assert.equal(await page.locator('.reading-record').count(),0);
    await page.getByRole('link', {name:'殺人の門',exact:true}).click();
    assert.equal(await page.locator('.reading-record').count(),87);
    await page.waitForFunction(()=>document.activeElement.id === 'reading-book-022');
    for (const width of [320,390,768,1280]) {
      await page.setViewportSize({width,height:850});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`overflow at ${width}`);
    }
    await page.setViewportSize({width:390,height:844});
    await page.goto('http://reading.test/sawamoto/reading/');
    await page.screenshot({path:'/tmp/reading-mobile.png',fullPage:false});
    const noJS = await browser.newContext({javaScriptEnabled:false});
    await noJS.route('**/*', async route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'http://reading.test') return route.abort();
      let file = url.pathname.replace(/^\/sawamoto\//,'');
      if(file.endsWith('/')) file+='index.html';
      await route.fulfill({path:path.join(__dirname,'../dist',file)});
    });
    const plain = await noJS.newPage();
    await plain.goto('http://reading.test/sawamoto/reading/');
    assert.equal(await plain.locator('.reading-record').count(),87);
    assert.equal(await plain.locator('.reading-controls').isVisible(),false);
    assert.deepEqual(errors,[]);
    console.log('Reading: navigation, groups, search, status, empty results, featured anchors, mobile widths, no-JS passed');
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exit(1)});
