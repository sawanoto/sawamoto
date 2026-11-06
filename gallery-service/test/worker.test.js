import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { validate, stripMetadata, Repository } from '../worker.js';
const id='12345678-1234-4234-8234-123456789abc';
const photo=`assets/images/galleries/${id}.jpg`;
const item={id,kind:'children',date:'2026-11-03',photos:[photo]};
const jpeg=new Uint8Array([255,216,255,225,0,8,69,120,105,102,0,0,255,218,0,2,5,255,217]);
test('photo-only item; dates, text and URL validation',()=>{
 assert.equal(validate(item).title,'');
 for(const bad of [{...item,date:'2026-02-30'},{...item,kind:'other'},{...item,photos:[]},{...item,photos:['../secret']},{...item,article_url:'javascript:alert(1)'},{...item,sale_url:'http://example.com'},{...item,title:5}])assert.throws(()=>validate(bad));
 assert.equal(validate({...item,article_url:'https://example.com/post'}).article_url,'https://example.com/post');
});
test('EXIF/APP metadata is stripped and invalid JPEG fails',()=>{
 assert.deepEqual(stripMetadata(jpeg),new Uint8Array([255,216,255,218,0,2,5,255,217]));
 assert.throws(()=>stripMetadata(new Uint8Array([0,1,2,3])));
});
test('unconfigured service and unauthenticated visitor cannot read UI or write',async()=>{
 for(const method of ['GET','POST']){
  let response=await worker.fetch(new Request('https://admin.test/api/items',{method}),{});
  assert.equal(response.status,503);
  response=await worker.fetch(new Request('https://admin.test/api/items',{method}),{ACCESS_TEAM:'example',ACCESS_AUD:'aud',OWNER_EMAIL:'owner@example.com',GITHUB_TOKEN:'test',REPO:'sawanoto/sawamoto',BRANCH:'main'});
  assert.equal(response.status,401);
 }
});
class MockRepo extends Repository {
 constructor(old=null){super({});this.old=old;this.calls=[];}
 async snapshot(){return {head:'head',tree:'tree',files:this.old?[{path:`content/galleries/${id}.json`,sha:'version'},{path:photo,sha:'photo'}]:[]};}
 async item(){return this.old;}
 async api(path,method,body){this.calls.push({path,method,body});return {sha:'new-sha'};}
}
test('repository calls fetch without a Repository receiver',async()=>{
 const repo=new Repository({REPO:'sawanoto/sawamoto',GITHUB_TOKEN:'dummy'},function(url){
  assert.equal(this,undefined);
  assert.equal(url,'https://api.github.com/repos/sawanoto/sawamoto/git/ref/heads/main');
  return Response.json({object:{sha:'head'}});
 });
 assert.deepEqual(await repo.api('/git/ref/heads/main'),{object:{sha:'head'}});
});
function form(value=item,version=''){const data=new FormData();data.set('item',JSON.stringify(value));data.set('version',version);data.set('paths','[]');return data;}
test('multiple photos and JSON are committed atomically, never force-pushed',async()=>{
 const repo=new MockRepo();const photo2=photo.replace(id,'12345678-1234-4234-8234-123456789abd');
 const data=form({...item,photos:[photo,photo2]});data.set('paths',JSON.stringify([photo,photo2]));data.append('images',new Blob([jpeg]));data.append('images',new Blob([jpeg]));
 await repo.save(data);
 const tree=repo.calls.find(c=>c.path==='/git/trees');assert.equal(tree.body.tree.length,3);
 assert.equal(repo.calls.filter(c=>c.path==='/git/commits').length,1);
 assert.deepEqual(repo.calls.at(-1).body,{sha:'new-sha',force:false});
});
test('edit and add article link; conflict and retry prevent lost updates and duplicates',async()=>{
 const old=validate(item);const repo=new MockRepo(old);
 await assert.rejects(repo.save(form({...item,title:'変更'},'stale')),/別の更新/);assert.equal(repo.calls.length,0);
 await repo.save(form({...item,article_url:'https://example.com/article'},'version'));
 const saved=JSON.parse(repo.calls.find(c=>c.path==='/git/trees').body.tree[0].content);
 assert.equal(saved.article_url,'https://example.com/article');assert.deepEqual(saved.photos,[photo]);
 const retry=new MockRepo(old);assert.deepEqual(await retry.save(form(item)),{alreadySaved:true});assert.equal(retry.calls.length,0);
});
test('append photo preserves old photo; delete removes record and images',async()=>{
 const repo=new MockRepo(validate(item));const photo2=photo.replace(id,'12345678-1234-4234-8234-123456789abd');
 const data=form({...item,photos:[photo,photo2]},'version');data.set('paths',JSON.stringify([photo2]));data.append('images',new Blob([jpeg]));await repo.save(data);
 const stored=JSON.parse(repo.calls.find(c=>c.path==='/git/trees').body.tree.at(-1).content);assert.equal(stored.photos.length,2);
 const del=new MockRepo(validate(item));await del.save(form(item,'version'),true);assert.equal(del.calls.find(c=>c.path==='/git/trees').body.tree.filter(x=>x.sha===null).length,2);
});
test('cannot attach an unrelated existing image',async()=>{
 const repo=new MockRepo();await assert.rejects(repo.save(form()),/保存先が不正/);assert.equal(repo.calls.length,0);
});
test('signed owner JWT, wrong owner, expired and forged tokens; cross-origin writes rejected',async()=>{
 const {generateKeyPair,exportJWK,SignJWT}=await import('jose');
 const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='test-key';
 const original=globalThis.fetch;
 globalThis.fetch=async()=>Response.json({keys:[jwk]});
 const env={ACCESS_TEAM:'test-owner-jwt',ACCESS_AUD:'audience',OWNER_EMAIL:'owner@example.com',GITHUB_TOKEN:'dummy',REPO:'sawanoto/sawamoto',BRANCH:'main',ASSETS:{fetch:async()=>new Response('private')}};
 const sign=(email,exp='1h')=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://test-owner-jwt.cloudflareaccess.com').setAudience('audience').setSubject('owner-id').setExpirationTime(exp).sign(privateKey);
 try{
  const token=await sign(env.OWNER_EMAIL);
  let response=await worker.fetch(new Request('https://admin.test/',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);assert.equal(response.status,200);
  response=await worker.fetch(new Request('https://admin.test/api/items',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':token,Origin:'https://evil.test','X-Gallery-Request':'1'}}),env);assert.equal(response.status,403);
  for(const [bad,status] of [[await sign('other@example.com'),403],[await sign(env.OWNER_EMAIL,'-1h'),401],[token.slice(0,-8)+'forgedxx',401]]){
   response=await worker.fetch(new Request('https://admin.test/',{headers:{'Cf-Access-Jwt-Assertion':bad}}),env);assert.equal(response.status,status);
  }
 }finally{globalThis.fetch=original;}
});
test('authenticated items read follows GitHub ref, commit and tree; failures have safe diagnostics',async()=>{
 const {generateKeyPair,exportJWK,SignJWT}=await import('jose');
 const {publicKey,privateKey}=await generateKeyPair('RS256');const jwk=await exportJWK(publicKey);jwk.kid='list-key';
 const env={ACCESS_TEAM:'test-gallery-list',ACCESS_AUD:'audience',OWNER_EMAIL:'owner@example.com',GITHUB_TOKEN:'private-token',REPO:'sawanoto/sawamoto',BRANCH:'main'};
 const token=await new SignJWT({email:env.OWNER_EMAIL}).setProtectedHeader({alg:'RS256',kid:'list-key'}).setIssuer('https://test-gallery-list.cloudflareaccess.com').setAudience(env.ACCESS_AUD).setSubject('owner-id').setExpirationTime('1h').sign(privateKey);
 const request=new Request('https://admin.test/api/items',{headers:{'Cf-Access-Jwt-Assertion':token}});
 const originalFetch=globalThis.fetch,originalError=console.error;
 const calls=[],logs=[];
 console.error=(message)=>logs.push(message);
 globalThis.fetch=async(url,options)=>{
  if (String(url).endsWith('/cdn-cgi/access/certs')) return Response.json({keys:[jwk]});
  calls.push({url:String(url),authorization:options.headers.Authorization});
  if (String(url).endsWith('/git/ref/heads/main')) return Response.json({object:{sha:'head'}});
  if (String(url).endsWith('/git/commits/head')) return Response.json({tree:{sha:'tree'}});
  if (String(url).endsWith('/git/trees/tree?recursive=1')) return Response.json({tree:[]});
  throw Error('unexpected request');
 };
 try {
  let response=await worker.fetch(request,env);
  assert.equal(response.status,200);assert.deepEqual(await response.json(),[]);
  assert.equal(calls.length,3);assert(calls.every(x=>x.authorization==='Bearer private-token'));
  globalThis.fetch=async(url)=>String(url).includes('/git/ref/') ? Promise.reject(Error('private-token owner@example.com')) : Response.json({keys:[jwk]});
  response=await worker.fetch(request,env);
  assert.equal(response.status,502);
  assert.equal(logs.at(-1),JSON.stringify({service:'gallery',code:'github_network_error',stage:'ref',status:502}));
  assert(!logs.join('').includes('private-token'));assert(!logs.join('').includes('owner@example.com'));
 } finally { globalThis.fetch=originalFetch;console.error=originalError; }
});
test('deleting with pending image selections never publishes new images',async()=>{
 const repo=new MockRepo(validate(item));const photo2=photo.replace(id,'12345678-1234-4234-8234-123456789abd');
 const data=form({...item,photos:[photo,photo2]},'version');data.set('paths',JSON.stringify([photo2]));data.append('images',new Blob([jpeg]));await repo.save(data,true);
 assert.equal(repo.calls.filter(c=>c.path==='/git/blobs').length,0);
 assert(repo.calls.find(c=>c.path==='/git/trees').body.tree.every(x=>x.sha===null));
});

for (const kind of ['children','handwork','life']) {
 test(`${kind}: photo-only save, edit and delete use the same repository format`,async()=>{
  const value={...item,kind};
  const repo=new MockRepo();const data=form(value);
  data.set('paths',JSON.stringify([photo]));data.append('images',new Blob([jpeg]));
  await repo.save(data);
  const saved=JSON.parse(repo.calls.find(c=>c.path==='/git/trees').body.tree.at(-1).content);
  assert.equal(saved.kind,kind);assert.equal(saved.title,'');assert.deepEqual(saved.photos,[photo]);
  const edit=new MockRepo(saved);await edit.save(form({...value,title:'変更'},'version'));
  const changed=JSON.parse(edit.calls.find(c=>c.path==='/git/trees').body.tree[0].content);
  assert.equal(changed.kind,kind);assert.equal(changed.title,'変更');assert.equal(changed.created_at,saved.created_at);
  const del=new MockRepo(changed);await del.save(form(changed,'version'),true);
  assert.deepEqual(del.calls.find(c=>c.path==='/git/trees').body.tree.map(x=>[x.path,x.sha]),[[`content/galleries/${id}.json`,null],[photo,null]]);
 });
}
