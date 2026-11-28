// Build first. Use real browser contexts to verify locale, persistence and fallback.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
const root = path.resolve(__dirname, '../dist');
const url = 'https://home.test/sawamoto/';
(async () => {
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || undefined});
  try {
    async function context(options = {}) {
      const ctx = await browser.newContext(options);
      await ctx.route('**/*', route => {
        const u = new URL(route.request().url());
        if (u.origin !== 'https://home.test') return route.abort();
        const file = path.join(root, u.pathname.replace(/^\/sawamoto\//, ''), u.pathname.endsWith('/') ? 'index.html' : '');
        assert(file.startsWith(root + path.sep) && fs.existsSync(file), `Missing local resource: ${u.pathname}`);
        const type = {'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript'}[path.extname(file)];
        return route.fulfill({body:fs.readFileSync(file),contentType:type || 'application/octet-stream'});
      });
      return ctx;
    }
    async function checkHome(page, language) {
      const japanese = language === 'ja';
      const title = japanese ? '澤本優哉 | 創作と日々の記録' : 'Yuya Sawamoto | Creative work & everyday life';
      const description = japanese
        ? '澤本優哉の個人サイト。創作活動、執筆、プログラミング、育児や日々の暮らしを記録しています。'
        : 'Creative work, writing, programming, and everyday life.';
      assert.equal(await page.locator('html').getAttribute('lang'), language);
      assert.equal(await page.title(), title);
      assert.equal(await page.locator('meta[name="description"]').getAttribute('content'), description);
      assert.equal(await page.locator('meta[property="og:title"]').getAttribute('content'), title);
      assert.equal(await page.locator('meta[property="og:description"]').getAttribute('content'), description);
      assert.equal(await page.locator('meta[property="og:locale"]').getAttribute('content'), japanese ? 'ja_JP' : 'en_US');
      assert.equal(await page.locator('link[rel="canonical"]').getAttribute('href'), 'https://sawanoto.github.io/sawamoto/');
      assert.equal(await page.locator('link[hreflang]').count(), 0);
      const graph = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent())['@graph'];
      for (const node of graph) assert.equal(node.inLanguage, 'ja');
      assert.equal(graph.find(node => node['@type'] === 'WebPage').name, '澤本優哉 | 創作と日々の記録');
      assert.equal(await page.locator('nav a[href="/sawamoto/writing/"]').textContent(), japanese ? '文章' : 'Writing');
      assert.equal(await page.locator('.home-section h2').last().textContent(), japanese ? '活動の記録' : 'History');
    }
    let originalLinks;
    for (const locale of ['ja-JP', 'en-US', 'fr-FR']) {
      const ctx = await context({locale});
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(url);
      await checkHome(page, 'ja');
      assert.equal(await page.evaluate(() => localStorage.getItem('sawamoto.language')), null);
      const links = await page.locator('a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
      if (!originalLinks) originalLinks = links;
      else assert.deepEqual(links, originalLinks);
      for (const width of [320,375,768,1280]) {
        await page.setViewportSize({width,height:900});
        for (const language of ['en','ja']) {
          const button = page.locator(`[data-language="${language}"]`);
          await button.click();
          await checkHome(page, language);
          assert.equal(await button.getAttribute('aria-pressed'),'true');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false, `Overflow ${width}/${language}`);
          assert.equal(await page.locator('.lead').textContent(), language === 'ja' ? '制作、執筆、プログラミング、日々の活動の記録。' : 'Creative work, writing, programming, and everyday life.');
          assert.equal(await page.locator('.content-language:visible').count(),language === 'en' ? 6 : 0);
          assert.equal(await page.locator('.card h3').first().getAttribute('lang'),'ja');
          fs.mkdirSync(path.resolve(__dirname, '../.private/home-screenshots'), {recursive:true});
          await page.screenshot({path:path.resolve(__dirname, `../.private/home-screenshots/${width}-${language}.png`),fullPage:true});
        }
      }
      await page.locator('[data-language="en"]').focus();
      await page.keyboard.press('Enter');
      assert.equal(await page.evaluate(() => localStorage.getItem('sawamoto.language')),'en');
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('lang'),'en');
      await page.locator('[data-language="ja"]').click();
      await page.reload();
      assert.equal(await page.locator('html').getAttribute('lang'),'ja');
      await page.locator('[data-language="en"]').click();
      const second = await ctx.newPage();
      await second.goto(url);
      assert.equal(await second.locator('html').getAttribute('lang'),'en');
      // Every existing local destination remains a valid Japanese page.
      for (const href of new Set(links.filter(link => link.startsWith('/sawamoto/') && link !== '/sawamoto/'))) {
        await second.goto(new URL(href, url).href);
        assert.equal(await second.locator('html').getAttribute('lang'),'ja');
      }
      assert.deepEqual(errors,[]);
      await ctx.close();
    }
    const noJS = await context({locale:'en-US',javaScriptEnabled:false});
    const fallback = await noJS.newPage();
    await fallback.goto(url);
    assert.equal(await fallback.locator('html').getAttribute('lang'),'ja');
    assert.equal(await fallback.locator('.language-switch').isVisible(),false);
    assert.match(await fallback.locator('.lead').textContent(),/制作/);
    await checkHome(fallback, 'ja');
    await noJS.close();
    const blocked = await context({locale:'en-US'});
    await blocked.addInitScript(() => {
      Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
    });
    const page = await blocked.newPage();
    await page.goto(url);
    await checkHome(page, 'ja');
    await page.locator('[data-language="en"]').click();
    await checkHome(page, 'en');
    await page.locator('[data-language="ja"]').click();
    await checkHome(page, 'ja');
    await blocked.close();
    // An invalid saved value falls back to Japanese.
    const future = await context({locale:'en-US'});
    await future.addInitScript(() => localStorage.setItem('sawamoto.language','invalid'));
    const futurePage = await future.newPage();
    await futurePage.goto(url);
    await checkHome(futurePage, 'ja');
    await future.close();
    console.log('Home i18n: locales, switch, keyboard, persistence, no JS, blocked storage, responsive layout, and links passed.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
