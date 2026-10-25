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
      assert.equal(await page.locator('[data-life-item]:visible').count(), data.stats.entries);
      assert.equal(await page.locator('.life-event[open]').count(), 0);
      assert.equal(await page.locator('.life-group[open]').count(), 0);
      assert.equal(await page.locator('.life-year > ol > li[data-life-record]').count(),data.stats.lifeEntries);
      assert.equal(await page.locator('[data-life-record]').count(),data.stats.total);
      const first = page.locator('.life-group').first();
      await first.locator(':scope > summary').click();
      assert.equal(await first.getAttribute('open'), '');
      const work = first.locator('.life-event').first();
      await work.locator('summary').click();
      assert.equal(await work.getAttribute('open'),'');
      await first.locator(':scope > summary').click();
      assert.equal(await first.getAttribute('open'), null);
      await first.locator(':scope > summary').focus();
      await page.keyboard.press('Enter');
      assert.equal(await first.getAttribute('open'), '');
      const second = page.locator('.life-group').nth(1);
      await second.locator(':scope > summary').click();
      assert.equal(await first.getAttribute('open'), '');
      assert.equal(await second.getAttribute('open'), '');
      let navigations=0;
      const navigation = request => { if (request.isNavigationRequest()) navigations++; };
      page.on('request', navigation);
      for (const genre of ['anime','movie','reading','game','life','all']) {
        const expected = genre === 'all' ? data.stats.entries : data.stats.byEntryGenre[genre];
        const recordCount = genre === 'all' ? data.stats.total : data.stats.byGenre[genre];
        const button = page.locator(`button[data-genre="${genre}"]`);
        await button.click();
        assert.equal(await button.getAttribute('aria-pressed'), 'true');
        assert.equal(await page.locator('[data-life-item]:visible').count(),expected,`${genre}, ${width}`);
        assert.match(await page.locator('[data-timeline-status]').textContent(),new RegExp(`${expected}項目（${recordCount}記録）`));
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth),true,`width ${width}`);
        assert.equal(new URL(page.url()).searchParams.get('genre'), genre === 'all' ? null : genre);
      }
      page.off('request', navigation);
      assert.equal(navigations,0,'filters do not navigate or reload');
      assert.equal(await first.getAttribute('open'), '', 'open state survives filtering');
      // A movie-to-book link reveals and focuses the reading record across genres.
      await page.locator('button[data-genre="movie"]').click();
      await page.locator('#hobby-kanako-nishi > summary').click();
      await page.locator('#movie-sakura > summary').click();
      await page.locator('#movie-sakura [data-life-related]').click();
      const related = page.locator('#reading-book-028');
      assert.equal(await related.getAttribute('open'),'');
      assert.equal(await related.isVisible(),true);
      assert.equal(await page.locator('button[data-genre="all"]').getAttribute('aria-pressed'),'true');
      assert.equal(await related.locator('summary').evaluate(el => document.activeElement === el),true);
      await page.goBack();
      await page.waitForFunction(() => document.querySelector('button[data-genre="movie"]').getAttribute('aria-pressed') === 'true');
      assert.equal(await page.locator('[data-life-item]:visible').count(),data.stats.byEntryGenre.movie);
      // Full paragraphs, metadata and multiple reading/film experiences remain separate.
      await page.goto(`${origin}/sawamoto/timeline/?genre=reading#reading-book-034`);
      assert.equal(await page.locator('#reading-book-034').getAttribute('open'),'');
      assert.match(await page.locator('#reading-book-034').innerText(),/黒暗森林理論/);
      await page.locator('#reading-book-034 [href="#movie-three-body-problem"]').click();
      assert.equal(await page.locator('#movie-three-body-problem').getAttribute('open'),'');
      assert.notEqual(await page.locator('#movie-three-body-problem').innerText(),await page.locator('#reading-book-034').innerText());
      assert.equal(await page.locator('[data-year="unknown"]').isVisible(),true);
    }
    await page.goto(`${origin}/sawamoto/timeline/#hobby-light-novels`);
    assert.equal(await page.locator('#hobby-light-novels').getAttribute('open'),'');
    await page.locator('button[data-genre="anime"]').click();
    assert.equal(await page.locator('#hobby-light-novels [data-group-count]').textContent(),'6記録');
    await page.locator('button[data-genre="reading"]').click();
    assert.equal(await page.locator('#hobby-light-novels [data-group-count]').textContent(),'9記録');
    // Living events remain independent, even after multiple hobby groups were expanded.
    await page.locator('button[data-genre="life"]').click();
    assert.equal(await page.locator('.life-group:visible').count(),0);
    assert.equal(await page.locator('[data-life-record]:visible').count(),data.stats.lifeEntries);
    await page.goto(`${origin}/sawamoto/timeline/?genre=anime#anime-mobile-suit-gundam`);
    assert.equal(await page.locator('#hobby-television').getAttribute('open'),'');
    await page.locator('#anime-mobile-suit-gundam [href="#anime-zeta-gundam"]').click();
    assert.equal(await page.locator('#hobby-anime-at-own-pace').getAttribute('open'),'');
    assert.equal(await page.locator('#anime-zeta-gundam').getAttribute('open'),'');
    assert.equal(await page.locator('button[data-genre="anime"]').getAttribute('aria-pressed'),'true');
    for (const [legacy, genre] of [['anime','anime'],['games','game'],['movie-history','movie'],['reading','reading']]) {
      await page.goto(`${origin}/sawamoto/${legacy}/`);
      await page.waitForFunction(g => document.querySelector(`button[data-genre="${g}"]`)?.getAttribute('aria-pressed') === 'true', genre);
      assert.equal(await page.locator('[data-life-item]:visible').count(),data.stats.byEntryGenre[genre]);
    }
    await page.goto(`${origin}/sawamoto/timeline/#timeline-first-child-parental-leave`);
    assert.equal(await page.locator('#life-first-child-parental-leave').getAttribute('open'),'');
    await page.goto(`${origin}/sawamoto/timeline/?genre=invalid#%E0%A4%A`);
    assert.equal(await page.locator('[data-life-item]:visible').count(),data.stats.entries);
    // Empty results remain usable when a new genre is defined before records are added.
    await page.route('**/timeline/', async route => {
      let html=fs.readFileSync(path.join(output,'timeline/index.html'),'utf8');
      html=html.replace('すべて</button>', 'すべて</button><button type="button" data-genre="music" aria-pressed="false">音楽</button>');
      return route.fulfill({body:html,contentType:'text/html'});
    });
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.locator('button[data-genre="music"]').click();
    assert.equal(await page.locator('[data-life-item]:visible').count(),0);
    assert.equal(await page.locator('[data-timeline-empty]').isVisible(),true);
    await page.unroute('**/timeline/');
    const plainContext = await browser.newContext({javaScriptEnabled:false,viewport:{width:320,height:850}});
    await plainContext.route('**/*',serve);
    const plain = await plainContext.newPage();
    await plain.goto(`${origin}/sawamoto/timeline/`);
    assert.equal(await plain.locator('[data-life-item]:visible').count(),data.stats.entries);
    assert.equal(await plain.locator('.life-filters').isVisible(),false);
    await plain.locator('#hobby-science-fiction > summary').click();
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
    await touch.locator('#hobby-kanako-nishi > summary').tap();
    await touch.locator('#movie-sakura > summary').tap();
    assert.equal(await touch.locator('#movie-sakura').getAttribute('open'),'');
    await touch.locator('#movie-sakura > summary').tap();
    assert.equal(await touch.locator('#movie-sakura').getAttribute('open'),null);
    await touch.locator('button[data-genre="reading"]').tap();
    assert.equal(await touch.locator('[data-life-item]:visible').count(),data.stats.byEntryGenre.reading);
    await touchContext.close();
    assert.deepEqual(errors,[]);
    fs.mkdirSync(path.resolve(__dirname,'../.private/timeline'),{recursive:true});
    await page.setViewportSize({width:375,height:900});
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/mobile.png')});
    await page.goto(`${origin}/sawamoto/timeline/#hobby-internet-culture`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/mobile-group.png')});
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.locator('[data-year="1995-2007"]').evaluate(el => el.scrollIntoView({block:'start'}));
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/mobile-entries.png')});
    await page.setViewportSize({width:1280,height:900});
    await page.goto(`${origin}/sawamoto/timeline/`);
    await page.screenshot({path:path.resolve(__dirname,'../.private/timeline/desktop.png')});
    console.log('Timeline passed: 34 hobby groups, 46 individual life events, all 207 records, 6 filters without reload, widths 320/375/768/1280, disclosure, keyboard, cross-genre links, URL/history, legacy URLs, empty results, no-JS and console.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
