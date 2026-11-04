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
    let originalLinks;
    for (const [locale, expected] of [['ja-JP','ja'], ['en-US','en'], ['fr-FR','en']]) {
      const ctx = await context({locale});
      const page = await ctx.newPage();
      const errors = [];
      page.on('pageerror', err => errors.push(err.message));
      await page.goto(url);
      assert.equal(await page.locator('html').getAttribute('lang'), expected);
      const links = await page.locator('a').evaluateAll(nodes => nodes.map(n => n.getAttribute('href')));
      if (!originalLinks) originalLinks = links;
      else assert.deepEqual(links, originalLinks);
      for (const width of [320,375,768,1280]) {
        await page.setViewportSize({width,height:900});
        for (const language of ['en','ja']) {
          const button = page.locator(`[data-language="${language}"]`);
          await button.click();
          assert.equal(await page.locator('html').getAttribute('lang'),language);
          assert.equal(await button.getAttribute('aria-pressed'),'true');
          assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth),false, `Overflow ${width}/${language}`);
          assert.equal(await page.locator('.lead').textContent(), language === 'ja' ? '制作、執筆、プログラミング、日々の活動の記録。' : 'Creative work, writing, programming, and everyday life.');
          assert.equal(await page.locator('.content-language:visible').count(),language === 'en' ? 6 : 0);
          assert.equal(await page.locator('.card h3').first().getAttribute('lang'),'ja');
          assert.equal(await page.locator('meta[property="og:locale"]').getAttribute('content'),language === 'en' ? 'en_US' : 'ja_JP');
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
    await noJS.close();
    const blocked = await context({locale:'en-US'});
    await blocked.addInitScript(() => {
      Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}});
    });
    const page = await blocked.newPage();
    await page.goto(url);
    await page.locator('[data-language="ja"]').click();
    assert.equal(await page.locator('html').getAttribute('lang'),'ja');
    await blocked.close();
    // An invalid saved value falls back to the browser language.
    const future = await context({locale:'en-US'});
    await future.addInitScript(() => localStorage.setItem('sawamoto.language','invalid'));
    const futurePage = await future.newPage();
    await futurePage.goto(url);
    assert.equal(await futurePage.locator('html').getAttribute('lang'),'en');
    await future.close();
    console.log('Home i18n: locales, switch, keyboard, persistence, no JS, blocked storage, responsive layout, and links passed.');
  } finally { await browser.close(); }
})().catch(error => {console.error(error);process.exitCode=1;});
