// Build first. CHROMIUM_PATH can select an installed Chromium.
const {chromium} = require('playwright');
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const output = path.resolve(__dirname, '../dist');
const data = JSON.parse(fs.readFileSync(path.join(output, 'timeline/records.json')));
const origin = 'https://timeline.test';
const serve = route => {
  const url = new URL(route.request().url());
  if (url.origin !== origin) return route.abort();
  let relative = url.pathname.replace(/^\/sawamoto\//, '');
  if (!relative || relative.endsWith('/')) relative += 'index.html';
  const file = path.resolve(output, relative);
  if (!file.startsWith(output + path.sep) || !fs.existsSync(file)) return route.fulfill({status:404, body:'Missing'});
  return route.fulfill({path:file});
};
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)});
  try {
    const context = await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/*', serve);
    const page = await context.newPage();
    const errors=[];
    page.on('pageerror', error => errors.push(error.message));
    for (const width of [320,375,768,1280]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/sawamoto/timeline/`);
      assert.equal(await page.locator('[data-life-record]:visible').count(), data.stats.total);
      assert.equal(await page.locator('.life-event[open]').count(), 0);
      const first = page.locator('.life-event').first();
      await first.locator('summary').click();
      assert.equal(await first.getAttribute('open'), '');
      await first.locator('summary').click();
      assert.equal(await first.getAttribute('open'), null);
      await first.locator('summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await first.getAttribute('open'), '');
      const second = page.locator('.life-event').nth(1);
      await second.locator('summary').click();
      assert.equal(await first.getAttribute('open'), '');
      assert.equal(await second.getAttribute('open'), '');
      let navigations=0;
      const navigation = request => { if (request.isNavigationRequest()) navigations++; };
      page.on('request', navigation);
      for (const genre of ['anime','movie','reading','game','life','all']) {
        const expected = genre === 'all' ? data.stats.total : data.stats.byGenre[genre];
        const button = page.locator(`button[data-genre="${genre}"]`);
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('[data-life-record]:visible').count(),expected,`${genre}, ${width}`);
        assert.match(await page.locator('[data-timeline-status]').textContent(),new RegExp(`${expected}件`));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`width ${width}`);
        assert.equal(new URL(page.url()).searchParams.get('genre'), genre === 'all' ? null : genre);
      }
      page.off('request', navigation);
      assert.equal(navigations,0,'filters do not navigate or reload');
      assert.equal(await first.getAttribute('open'), '', 'open state survives filtering');
      // A movie-to-book link reveals and focuses the reading record across genres.
      await page.locator('button[data-genre="movie"]').click();
      await page.locator('#movie-sakura > summary').click();
      await page.locator('#movie-sakura [data-life-related]').click();
      const related = page.locator('#reading-book-028');
      assert.equal(await related.getAttribute('open'),'');
      assert.equal(await related.isVisible(),true);
      assert.equal(await page.locator('button[data-genre="all"]').getAttribute('aria-pressed'),'true');
      assert.equal(await related.locator('summary').evaluate(el => document.activeElement === el),true);
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('button[data-genre="movie"]').getAttribute('aria-pressed') === 'true');
      assert.equal(await page.locator('[data-life-record]:visible').count(),data.stats.byGenre.movie);
      // Full paragraphs, metadata and multiple reading/film experiences remain separate.
      await page.goto(`${origin}/sawamoto/timeline/?genre=reading#reading-book-034`);
      assert.equal(await page.locator('#reading-book-034').getAttribute('open'),'');
      assert.match(await page.locator('#reading-book-034').innerText(),/黒暗森林理論/);
      await page.locator('#reading-book-034 [href="#movie-three-body-problem"]').click();
      assert.equal(await page.locator('#movie-three-body-problem').getAttribute('open'),'');
      assert.notEqual(await page.locator('#movie-three-body-problem').innerText(),await page.locator('#reading-book-034').innerText());
      assert.equal(await page.locator('[data-year="unknown"]').isVisible(),true);
    }
    for (const [legacy, genre] of [['anime','anime'],['games','game'],['movie-history','movie'],['reading','reading']]) {
      await page.goto(`${origin}/sawamoto/${legacy}/`);
      await page.waitForFunction(g => document.querySelector(`button[data-genre="${g}"]`)?.getAttribute('aria-pressed') === 'true', genre);
      assert.equal(await page.locator('[data-life-record]:visible').count(),data.stats.byGenre[genre]);
    }
    await page.goto(`${origin}/sawamoto/timeline/#timeline-first-child-parental-leave`);
    assert.equal(await page.locator('#life-first-child-parental-leave').getAttribute('open'),'');
    await page.goto(`${origin}/sawamoto/timeline/?genre=invalid#%E0%A4%A`);
    assert.equal(await page.locator('[data-life-record]:visible').count(),data.stats.total);
    // Empty results remain usable when a new genre is defined before records are added.
    await page.route('**/timeline/', async route => {
      let html=fs.readFileSync(path.join(output,'timeline/index.html'),'utf8');
      html=html.replace('すべて</button>', 'すべて</button><button type="button" data-genre="music" aria-pressed="false">音楽</button>');
      return route.fulfill({body:html,contentType:'text/html'});
    });
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.locator('button[data-genre="music"]').click();
    assert.equal(await page.locator('[data-life-record]:visible').count(),0);
    assert.equal(await page.locator('[data-timeline-empty]').isVisible(),true);
    await page.unroute('**/timeline/');
    const plainContext = await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:850}});
    await plainContext.route('**/*',serve);
    const plain = await plainContext.newPage();
    await plain.goto(`${origin}/sawamoto/timeline/`);
    assert.equal(await plain.locator('[data-life-record]:visible').count(),data.stats.total);
    assert.equal(await plain.locator('.life-filters').isVisible(),false);
    await plain.locator('#reading-book-034 > summary').click();
    assert.equal(await plain.locator('#reading-book-034').getAttribute('open'),'');
    assert.match(await plain.locator('#reading-book-034').innerText(),/黒暗森林理論/);
    assert.equal(await plain.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true);
    await plainContext.close();
    const touchContext = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:375,height:850}});
    await touchContext.route('**/*',serve);
    const touch = await touchContext.newPage();
    touch.on('pageerror',error => errors.push(error.message));
    await touch.goto(`${origin}/sawamoto/timeline/`);
    await touch.locator('button[data-genre="movie"]').tap();
    await touch.locator('#movie-sakura > summary').tap();
    assert.equal(await touch.locator('#movie-sakura').getAttribute('open'),'');
    await touch.locator('#movie-sakura > summary').tap();
    assert.equal(await touch.locator('#movie-sakura').getAttribute('open'),null);
    await touch.locator('button[data-genre="reading"]').tap();
    assert.equal(await touch.locator('[data-life-record]:visible').count(),data.stats.byGenre.reading);
    await touchContext.close();
    assert.deepEqual(errors,[]);
    fs.mkdirSync(path.resolve(__dirname,'../.private/timeline'),{recursive:true});
    await page.setViewportSize({width:375,height:900});
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/mobile.png')});
    await page.goto(`${origin}/sawamoto/timeline/#movie-sakura`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/mobile-detail.png')});
    await page.setViewportSize({width:1280,height:900});
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/desktop.png')});
    console.log('Timeline passed: 207 records, 6 filters without reload, widths 320/375/768/1280, disclosure, keyboard, cross-genre links, URL/history, legacy URLs, empty results, no-JS and console.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
