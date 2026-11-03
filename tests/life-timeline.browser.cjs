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
  const errors = [];
  const life = data.records.filter(r => r.sourceKind === 'life');
  const defaultLife = life.filter(r => (r.metadata.importance || 'medium') !== 'minor');
  try {
    const context = await browser.newContext({reducedMotion:'reduce'});
    await context.route('**/*', serve);
    const page = await context.newPage();
    page.on('pageerror', error => errors.push(error.message));
    async function check(category, importance = 'medium') {
      const expected = data.records.filter(r => r.sourceKind === category && (category !== 'life' || importance === 'all' || r.metadata.importance === 'major' || (importance === 'medium' && (r.metadata.importance || 'medium') === 'medium')));
      const state = await page.evaluate(() => ({
        records: [...document.querySelectorAll('[data-life-record]')].filter(r => !r.hidden && !r.closest('[data-life-item][hidden]')).map(r => r.dataset.recordId),
        entries: document.querySelectorAll('[data-life-item]:not([hidden])').length,
        years: [...document.querySelectorAll('[data-year]:not([hidden])')].map(y => y.dataset.year),
        jumps: [...document.querySelectorAll('[data-year-jump]')].filter(j => !j.closest('li').hidden).map(j => j.dataset.yearJump)
      }));
      assert.deepEqual(state.records.sort(), expected.map(r => r.id).sort());
      assert.deepEqual(state.years.sort(), [...new Set(data.entries.filter(e => e.recordIds.some(id => expected.some(r => r.id === id))).map(e => e.periodId))].sort());
      assert.deepEqual(state.jumps.sort(), state.years.sort());
      assert.match(await page.locator('[data-timeline-status]').textContent(), new RegExp(`${state.entries}項目（${expected.length}記録）`));
      assert.equal(await page.locator('.life-importance').isVisible(), category === 'life');
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
      for (const year of state.years) {
        await page.locator(`[data-year-jump="${year}"]`).click();
        assert.equal(new URL(page.url()).hash, `#year-${year}`);
        const top = await page.locator(`#year-${year}`).evaluate(e => e.getBoundingClientRect().top);
        assert(top >= 0 && top < 900, `${category}/${year}: ${top}`);
      }
    }
    for (const width of [320,375,768,1280]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/sawamoto/timeline/`);
      assert.equal(await page.locator('h1').textContent(), 'History');
      assert.equal(await page.locator('button[data-genre="all"]').count(), 0);
      assert.equal(await page.locator('button[data-genre="life"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-life-record]').count(), data.stats.total);
      await check('life');
      for (const level of ['major','all','medium']) {
        await page.locator(`[data-importance-filter="${level}"]`).click();
        await check('life',level);
      }
      for (const category of ['anime','movie','reading','game','music','life']) {
        await page.locator(`[data-genre="${category}"]`).click();
        await check(category);
        assert.match(await page.locator('[data-category-description]').textContent(), /記録|人生/);
      }
      await page.goto(`${origin}/sawamoto/timeline/?genre=movie#movie-sakura`);
      await page.locator('#movie-sakura [data-life-related]').click();
      assert.equal(await page.locator('[data-genre="reading"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('#reading-book-028').isVisible(),true);
      await page.goBack();
      assert.equal(await page.locator('[data-genre="movie"]').getAttribute('aria-pressed'), 'true');
    }
    for (const [legacy,category] of [['anime','anime'],['movie-history','movie'],['reading','reading'],['games','game']]) {
      await page.goto(`${origin}/sawamoto/${legacy}/`);
      await page.waitForSelector(`[data-genre="${category}"][aria-pressed="true"]`);
      await check(category);
    }
    await page.goto(`${origin}/sawamoto/timeline/#timeline-ofuse-registration-2026`);
    assert.equal(await page.locator('#life-ofuse-registration-2026').isVisible(),true);
    assert.equal(await page.locator('[data-importance-filter="all"]').getAttribute('aria-pressed'),'true');
    await page.goto(`${origin}/sawamoto/timeline/?genre=all`);
    await check('life');
    await page.locator('[data-genre="anime"]').focus();
    await page.keyboard.press('Enter');
    await check('anime');
    const plainContext = await browser.newContext({javaScriptEnabled:false});
    await plainContext.route('**/*',serve);
    const plain = await plainContext.newPage();
    await plain.goto(`${origin}/sawamoto/timeline/`);
    assert.equal(await plain.locator('[data-life-item]:visible').count(),defaultLife.length);
    assert.equal(await plain.locator('[data-entry-kind="hobby"]:visible').count(),0);
    await plainContext.close();
    const touchContext = await browser.newContext({hasTouch:true,isMobile:true,viewport:{width:375,height:850}});
    await touchContext.route('**/*',serve);
    const touch = await touchContext.newPage();
    await touch.goto(`${origin}/sawamoto/timeline/`);
    await touch.locator('[data-genre="music"]').tap();
    assert.equal(await touch.locator('[data-genre="music"]').getAttribute('aria-pressed'),'true');
    await touchContext.close();
    fs.mkdirSync(path.resolve(__dirname,'../.private/timeline'),{recursive:true});
    for (const width of [375,1280]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`${origin}/sawamoto/timeline/`);
      await page.locator('[data-genre="music"]').click();
      await page.locator('#hobby-music-elementary > summary').click();
      await page.screenshot({path:path.resolve(__dirname,`../.private/timeline/music-${width}.png`)});
    }
    assert.deepEqual(errors,[]);
    console.log('History: category isolation/counts, importance, year jumps, legacy and related links, keyboard/touch, no-JS initial view, 320/375/768/1280px passed.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
