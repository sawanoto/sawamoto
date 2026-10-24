const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../dist');
const origin = 'https://anime.test';
const types = {'.html':'text/html; charset=utf-8','.js':'application/javascript','.css':'text/css'};
(async () => {
  const browser = await chromium.launch(process.env.CHROMIUM_PATH ? {executablePath:process.env.CHROMIUM_PATH} : {});
  try {
    const context = await browser.newContext({reducedMotion:'reduce'});
    const serve = route => {
      const url = new URL(route.request().url());
      if (url.origin !== origin) return route.abort();
      let relative = url.pathname.replace(/^\/sawamoto\//, '');
      if (!relative || relative.endsWith('/')) relative += 'index.html';
      const file = path.resolve(root, relative);
      if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404, body:'Missing'});
      return route.fulfill({body:fs.readFileSync(file), contentType:types[path.extname(file)] || 'application/octet-stream'});
    };
    await context.route('**/*', serve);
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [320,390,1280]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/sawamoto/anime/`);
      assert.equal(await page.locator('.anime-row:visible').count(),29);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false);
      await page.locator('#anime-search').fill('ガンダム');
      assert.equal(await page.locator('.anime-row:visible').count(),3);
      await page.locator('#anime-search').fill('ｓｔｅｉｎｓ');
      assert.equal(await page.locator('.anime-row:visible').count(),1);
      await page.locator('.anime-row:visible').click();
      assert.match(page.url(),/steins-gate\/$/);
      assert.match(await page.locator('.anime-facts').innerText(),/不明/);
      await page.locator('.back').first().click();
      await page.locator('#anime-search').fill('存在しない作品');
      assert.equal(await page.locator('.anime-row:visible').count(),0);
      assert.match(await page.locator('#anime-result').innerText(),/該当する作品はありません/);
      await page.locator('.anime-jumps a').first().click();
      assert.equal(await page.locator('.anime-row:visible').count(),29);
      for (const slug of ['haruhi','orb','gankochan','pokemon']) {
        await page.goto(`${origin}/sawamoto/anime/${slug}/`);
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false,`${slug} at ${width}`);
      }
    }
    await page.goto(`${origin}/sawamoto/anime/`);
    await page.locator('#anime-search').focus();
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.className),'anime-row');
    await page.keyboard.press('Enter');
    await page.waitForURL('**/anime/doraemon/');
    const noJS = await browser.newContext({javaScriptEnabled:false});
    await noJS.route('**/*', serve);
    const staticPage = await noJS.newPage();
    await staticPage.goto(`${origin}/sawamoto/anime/`);
    assert.equal(await staticPage.locator('.anime-row:visible').count(),29);
    assert.equal(await staticPage.locator('.anime-search:visible').count(),0);
    await staticPage.locator('a[href="/sawamoto/anime/pokemon/"]').click();
    assert.match(await staticPage.locator('.prose').innerText(),/今後追記予定/);
    await noJS.close();
    assert.deepEqual(errors,[]);
    fs.mkdirSync(path.resolve(__dirname,'../.private/anime-screenshots'),{recursive:true});
    await page.setViewportSize({width:390,height:900});
    await page.goto(`${origin}/sawamoto/anime/`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/anime-screenshots/mobile.png')});
    console.log('Anime browser checks passed: widths, search, era jumps, direct URLs, return links, keyboard and console.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exit(1);});
