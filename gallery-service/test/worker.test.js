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
  response=await worker.fetch(new Request('https://admin.test/api/items',{method}),{ACCESS_TEAM:'example',ACCESS_AUD:'aud',OWNER_EMAIL:'owner@example.com',GITHUB_TOKEN:'test'});
  assert.equal(response.status,401);
 }
});
class MockRepo extends Repository {
 constructor(old=null){super({});this.old=old;this.calls=[];}
 async snapshot(){return {head:'head',tree:'tree',files:this.old?[{path:`content/galleries/${id}.json`,sha:'version'},{path:photo,sha:'photo'}]:[]};}
 async item(){return this.old;}
 async api(path,method,body){this.calls.push({path,method,body});return {sha:'new-sha'};}
}
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
 const env={ACCESS_TEAM:'test-owner-jwt',ACCESS_AUD:'audience',OWNER_EMAIL:'owner@example.com',GITHUB_TOKEN:'dummy',ASSETS:{fetch:async()=>new Response('private')}};
 const sign=(email,exp='1h')=>new SignJWT({email}).setProtectedHeader({alg:'RS256',kid:'test-key'}).setIssuer('https://test-owner-jwt.cloudflareaccess.com').setAudience('audience').setSubject('owner-id').setExpirationTime(exp).sign(privateKey);
 try{
  const token=await sign(env.OWNER_EMAIL);
  let response=await worker.fetch(new Request('https://admin.test/',{headers:{'Cf-Access-Jwt-Assertion':token}}),env);assert.equal(response.status,200);
  response=await worker.fetch(new Request('https://admin.test/api/items',{method:'POST',headers:{'Cf-Access-Jwt-Assertion':token,Origin:'https://evil.test','X-Gallery-Request':'1'}}),env);assert.equal(response.status,403);
  for(const bad of [await sign('other@example.com'),await sign(env.OWNER_EMAIL,'-1h'),token.slice(0,-8)+'forgedxx']){
   response=await worker.fetch(new Request('https://admin.test/',{headers:{'Cf-Access-Jwt-Assertion':bad}}),env);assert.equal(response.status,401);
  }
 }finally{globalThis.fetch=original;}
});
test('deleting with pending image selections never publishes new images',async()=>{
 const repo=new MockRepo(validate(item));const photo2=photo.replace(id,'12345678-1234-4234-8234-123456789abd');
 const data=form({...item,photos:[photo,photo2]},'version');data.set('paths',JSON.stringify([photo2]));data.append('images',new Blob([jpeg]));await repo.save(data,true);
 assert.equal(repo.calls.filter(c=>c.path==='/git/blobs').length,0);
 assert(repo.calls.find(c=>c.path==='/git/trees').body.tree.every(x=>x.sha===null));
});
