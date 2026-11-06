const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch(process.env.CHROMIUM_PATH?{executablePath:process.env.CHROMIUM_PATH}:{});
 try{
  const context=await browser.newContext();const page=await context.newPage();let stored=[], uploads=[],failNext=false;
  await context.route('**/*',async route=>{
   const req=route.request(),url=new URL(req.url());
   if(url.origin==='https://admin.test'){
    if(url.pathname==='/api/items'){
     if(req.method()==='GET')return route.fulfill({json:stored});
     const data=await new Response(req.postDataBuffer(),{headers:{'Content-Type':req.headers()['content-type']}}).formData();
     if(failNext){failNext=false;return route.fulfill({status:502,json:{error:'GitHubへの保存に失敗しました (502)'}});}
     assert.equal(req.headers()['x-gallery-request'],'1');
     const item=JSON.parse(data.get('item'));uploads=await Promise.all(data.getAll('images').map(async blob=>Buffer.from(await blob.arrayBuffer())));
     if(data.get('remove')==='1')stored=stored.filter(x=>x.id!==item.id);else stored=[{...item,version:'saved-version'}];
     return route.fulfill({json:{commit:'mock-commit'}});
    }
    const file=path.join(root,'gallery-service/public',url.pathname==='/'?'index.html':url.pathname);
    return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'text/html'});
   }
   if(url.origin==='https://gallery.test'){
    let relative=url.pathname.replace(/^\/sawamoto\//,'');if(!relative || relative.endsWith('/'))relative+='index.html';
    const file=path.join(root,'dist',relative);
    if(!fs.existsSync(file))return route.fulfill({status:404,body:'missing'});
    let body=fs.readFileSync(file);
    if(file.endsWith('gallery/children/index.html'))body=Buffer.from(body.toString().replace('<div class="gallery-grid">','<div class="gallery-grid"><article class="gallery-card"><a class="gallery-photo" href="/photo.jpg"><img alt="作品" src="/photo.jpg"></a></article>'));
    return route.fulfill({body,contentType:file.endsWith('.html')?'text/html':file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream'});
   }
   return route.abort();
  });
  const digitalUrls=['https://sawanoto.github.io/p5js/','https://sawanoto.github.io/MovingSketch/','https://sawanoto.github.io/LifeSketch/'];
  for(const width of [320,375,768,1280]){
   await page.setViewportSize({width,height:900});await page.goto('https://admin.test/');await page.waitForFunction(()=>!document.querySelector('#controls').disabled);
   assert.deepEqual(await page.locator('[name=kind] option').allTextContents(),['子どもの作品','自分の作品','生活']);
   assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`admin overflow ${width}`);
   await page.goto('https://gallery.test/sawamoto/');
   for(const url of digitalUrls)assert.equal(await page.locator(`a[href="${url}"]`).count(),0);
   assert.equal(await page.locator('header a[href="/sawamoto/gallery/handwork/"]').count(),1);
   for(const kind of ['children','handwork']){
    await page.goto(`https://gallery.test/sawamoto/gallery/${kind}/`);assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`gallery overflow ${width}`);
    assert.equal(await page.locator('h1').textContent(),'Gallery');
    for(const [id,label] of [['physical-gallery','実物作品'],['digital-gallery','デジタル作品'],['life-gallery','生活']]){
     assert.equal(await page.locator(`#${id} h2`).first().textContent(),label);
     const category=id.replace('-gallery','');
     const button=page.locator(`[data-gallery-category="${category}"]`);
     await button.focus();await page.keyboard.press('Enter');
     assert.equal(await button.getAttribute('aria-pressed'),'true');
     assert.equal(await page.locator('.gallery-category:visible').count(),1);
     assert(await page.locator(`#${id}`).isVisible());
     assert.equal(new URL(page.url()).searchParams.get('category'),category);
     assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
    }
    assert.equal(await page.locator('#physical-gallery .link-list a[aria-current=page]').count(),1);
    assert.equal(await page.locator('#digital-gallery-title').textContent(),'デジタル作品');
    for(const url of digitalUrls)assert.equal(await page.locator(`.gallery-links a[href="${url}"]`).count(),1);
   }
  }
  await page.goto('https://gallery.test/sawamoto/gallery/handwork/?category=digital');
  assert(await page.locator('#digital-gallery').isVisible());await page.reload();assert(await page.locator('#digital-gallery').isVisible());
  await page.goto('https://gallery.test/sawamoto/gallery/handwork/#life-gallery');assert(await page.locator('#life-gallery').isVisible());
  await page.goto('https://gallery.test/sawamoto/gallery/handwork/?category=unknown');assert(await page.locator('#physical-gallery').isVisible());
  const noScript=await browser.newContext({javaScriptEnabled:false});
  await noScript.route('**/*',route=>{const url=new URL(route.request().url());if(url.origin!=='https://gallery.test')return route.abort();let file=path.join(root,'dist',url.pathname.replace(/^\/sawamoto\//,''));if(url.pathname.endsWith('/'))file=path.join(file,'index.html');return route.fulfill({body:fs.readFileSync(file),contentType:file.endsWith('.css')?'text/css':'text/html'});});
  const fallback=await noScript.newPage();await fallback.goto('https://gallery.test/sawamoto/gallery/handwork/');
  assert.equal(await fallback.locator('.gallery-category:visible').count(),3);assert.equal(await fallback.locator('.gallery-filters').isVisible(),false);await noScript.close();
  await page.goto('https://gallery.test/sawamoto/gallery/children/');await page.locator('.gallery-photo').first().click();assert(await page.locator('#photo-view').evaluate(x=>x.open));await page.keyboard.press('Escape');assert.equal(await page.locator('#photo-view').evaluate(x=>x.open),false);
  await page.setViewportSize({width:375,height:812});await page.goto('https://admin.test/');await page.waitForFunction(()=>!document.querySelector('#controls').disabled);
  // Real JPEG, with EXIF orientation 6 injected. The browser must rotate it before resizing.
  const original=Buffer.from(await page.evaluate(()=>{const canvas=document.createElement('canvas');canvas.width=4000;canvas.height=2000;const c=canvas.getContext('2d');c.fillStyle='#a14';c.fillRect(0,0,4000,2000);return canvas.toDataURL('image/jpeg',.95).split(',')[1];}),'base64');
  const exif=Buffer.from([255,225,0,34,69,120,105,102,0,0,73,73,42,0,8,0,0,0,1,0,18,1,3,0,1,0,0,0,6,0,0,0,0,0,0,0]);
  const oriented=Buffer.concat([original.subarray(0,2),exif,original.subarray(2)]);
  const fixture={name:'phone.jpg',mimeType:'image/jpeg',buffer:oriented};
  await page.locator('#photos').setInputFiles([fixture,fixture]);await page.waitForFunction(()=>document.querySelectorAll('#preview img').length===2 && !document.querySelector('#controls').disabled);
  const dimensions=await page.locator('#preview img').first().evaluate(img=>new Promise(resolve=>{const done=()=>resolve([img.naturalWidth,img.naturalHeight]);if(img.complete)done();else img.onload=done;}));assert.deepEqual(dimensions,[960,1920]);
  assert.equal(await page.locator('[name=title]').inputValue(),'');
  failNext=true;await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('(502)'));assert.equal(await page.locator('#preview img').count(),2);
  await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));
  assert.equal(stored.length,1);assert.equal(stored[0].photos.length,2);assert.equal(stored[0].title,'');assert.equal(uploads.length,2);
  for(const bytes of uploads){assert(bytes.length<oriented.length);assert(!bytes.includes(Buffer.from('Exif')));assert(bytes.length<=1500000);}
  await page.locator('#items button').first().click();await page.locator('summary').click();await page.locator('[name=title]').fill('編んだもの');await page.locator('[name=article_url]').fill('https://example.com/later');await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));assert.equal(stored[0].article_url,'https://example.com/later');assert.equal(stored[0].title,'編んだもの');assert.equal(stored[0].photos.length,2);
  await page.locator('#items button').first().click();await page.locator('#camera').setInputFiles(fixture);await page.waitForFunction(()=>document.querySelectorAll('#preview img').length===3 && !document.querySelector('#controls').disabled);await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));assert.equal(stored[0].photos.length,3);
  await page.locator('#items button').first().click();page.once('dialog',dialog=>dialog.accept());await page.locator('#delete').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));assert.equal(stored.length,0);
  await page.locator('[name=kind]').selectOption('handwork');await page.locator('#photos').setInputFiles(fixture);await page.waitForFunction(()=>document.querySelectorAll('#preview img').length===1 && !document.querySelector('#controls').disabled);await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));assert.equal(stored[0].kind,'handwork');assert.equal(stored[0].photos.length,1);
  await page.goto('https://gallery.test/sawamoto/gallery/life/');assert(await page.locator('#life-gallery').isVisible());await page.reload();assert(await page.locator('#life-gallery').isVisible());
  await page.goto('https://admin.test/');await page.waitForFunction(()=>!document.querySelector('#controls').disabled);
  await page.locator('[name=kind]').selectOption('life');assert.equal(await page.locator('#date-label').textContent(),'撮影日');
  await page.locator('#photos').setInputFiles(fixture);await page.waitForFunction(()=>document.querySelectorAll('#preview img').length===1 && !document.querySelector('#controls').disabled);
  await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));
  assert.equal(stored[0].kind,'life');assert.equal(stored[0].title,'');assert.equal(stored[0].photos.length,1);assert.match(await page.locator('#items button').first().textContent(),/生活/);
  await page.locator('#items button').first().click();assert.equal(await page.locator('[name=kind]').inputValue(),'life');assert.equal(await page.locator('#date-label').textContent(),'撮影日');
  await page.locator('summary').click();await page.locator('[name=title]').fill('日常の写真');await page.locator('[name=date]').fill('2026-01-02');
  await page.locator('#submit').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));assert.equal(stored[0].title,'日常の写真');assert.equal(stored[0].date,'2026-01-02');assert.equal(stored[0].kind,'life');
  await page.locator('#items button').first().click();page.once('dialog',dialog=>dialog.accept());await page.locator('#delete').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('保存しました'));assert.equal(stored.length,0);
  assert.equal(await page.locator('#date-label').textContent(),'制作日');
  await fs.promises.mkdir(path.join(root,'.private'),{recursive:true});await page.screenshot({path:path.join(root,'.private/gallery-admin-mobile.png'),fullPage:true});
  console.log('PASS: 320/375/768/1280px; enlargement; photo-only/multiple; EXIF orientation; compression; retry; edit/article link; append/delete (mock API).');
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exit(1);});
