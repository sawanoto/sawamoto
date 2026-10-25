const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require('playwright');
module.exports = async function check(folder, genre, cases) {
  const root = path.resolve(__dirname,'../dist');
  const data = JSON.parse(fs.readFileSync(path.join(root,'timeline/records.json')));
  const browser = await chromium.launch({executablePath:process.env.CHROMIUM_PATH || (fs.existsSync('/usr/bin/chromium') ? '/usr/bin/chromium' : undefined)});
  try {
    const context = await browser.newContext();
    await context.route('**/*',route => {
      const url = new URL(route.request().url());
      if(url.origin !== 'https://legacy.test') return route.abort();
      let relative=url.pathname.replace(/^\/sawamoto\//,'');
      if(relative.endsWith('/')) relative+='index.html';
      return route.fulfill({path:path.join(root,relative)});
    });
    const page=await context.newPage();
    const errors=[];
    page.on('pageerror',error=>errors.push(error.message));
    for(const width of [320,390,1280]) {
      await page.setViewportSize({width,height:900});
      await page.goto(`https://legacy.test/sawamoto/${folder}/`);
      await page.waitForURL(`**/timeline/?genre=${genre}`);
      await page.waitForFunction(g => document.querySelector(`[data-genre="${g}"]`)?.getAttribute('aria-pressed')==='true',genre);
      assert.equal(await page.locator('[data-life-item]:visible').count(),data.stats.byEntryGenre[genre]);
      assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    for(const [old,target] of cases) {
      await page.goto(`https://legacy.test/sawamoto/${old}`);
      await page.waitForURL(url => url.pathname==='/sawamoto/timeline/' && url.hash==='#'+target);
      await page.waitForFunction(id => {
        let el=document.getElementById(id);
        if(el?.matches('[data-life-note-anchor]')) el=el.closest('details') || document.getElementById('life-context-heading');
        return el?.open===true && el.getClientRects().length>0;
      },target);
    }
    assert.deepEqual(errors,[]);
    console.log(`${folder}: legacy list/detail/bookmark redirects and mobile filters passed`);
  } finally { await browser.close(); }
};
