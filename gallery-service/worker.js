import { createRemoteJWKSet, jwtVerify } from 'jose';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const imagePath = /^assets\/images\/galleries\/[0-9a-f-]{36}\.jpg$/;
const fields = ['title','place','materials','description','article_url','sale_url'];
const json = (data, status = 200) => Response.json(data, {status, headers:{'Cache-Control':'no-store'}});
const fail = (message, status = 400) => { throw Object.assign(new Error(message), {status}); };
const keys = new Map();
function logFailure(code, stage, status) {
  // Fixed labels only: never log request headers, URLs, response bodies or errors.
  console.error(JSON.stringify({service:'gallery', code, stage, status}));
}
export async function authorize(request, env) {
  for (const name of ['ACCESS_TEAM','ACCESS_AUD','OWNER_EMAIL','GITHUB_TOKEN','REPO','BRANCH']) {
    if (typeof env[name] !== 'string' || !env[name].trim()) {
      logFailure('missing_configuration',name,503);
      fail('投稿サービスは初期設定待ちです。', 503);
    }
  }
  if (!/^[a-z0-9-]+$/.test(env.ACCESS_TEAM)) fail('認証設定が正しくありません。', 503);
  if (!/^[A-Za-z0-9_-]+$/.test(env.ACCESS_AUD) || !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(env.REPO) || !/^[A-Za-z0-9._/-]+$/.test(env.BRANCH)) {
    logFailure('invalid_configuration','worker_vars',503);
    fail('投稿サービスの設定が正しくありません。',503);
  }
  const issuer = `https://${env.ACCESS_TEAM}.cloudflareaccess.com`;
  if (!keys.has(issuer)) keys.set(issuer, createRemoteJWKSet(new URL(`${issuer}/cdn-cgi/access/certs`)));
  try {
    const token = request.headers.get('Cf-Access-Jwt-Assertion');
    if (!token) fail('本人認証が必要です。', 401);
    const {payload} = await jwtVerify(token, keys.get(issuer), {issuer, audience:env.ACCESS_AUD, algorithms:['RS256']});
    if (!payload.exp || !payload.sub || payload.email !== env.OWNER_EMAIL) fail('本人のみ利用できます。', 403);
  } catch (error) {
    if (error.status === 403) throw error;
    fail('本人認証が必要です。再ログインしてください。', 401);
  }
}

export function validate(input) {
  if (!input || !uuid.test(input.id) || !['children','handwork'].includes(input.kind)) fail('作品の種類またはIDが不正です。');
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.date) || !Number.isFinite(Date.parse(input.date)) || new Date(input.date).toISOString().slice(0,10) !== input.date) fail('制作日を確認してください。');
  const item = {id:input.id, kind:input.kind, date:input.date};
  for (const field of fields) {
    const value = input[field] ?? '';
    if (typeof value !== 'string' || value.length > (field === 'description' ? 2000 : 500)) fail('入力が長すぎるか形式が不正です。');
    item[field] = value.trim();
    if (field.endsWith('_url') && item[field]) {
      let url; try { url = new URL(item[field]); } catch { fail('リンクの形式を確認してください。'); }
      if (url.protocol !== 'https:' || url.username || url.password) fail('リンクは https:// で入力してください。');
    }
  }
  if (!Array.isArray(input.photos) || !input.photos.length || input.photos.length > 12 || input.photos.some(x => typeof x !== 'string' || !imagePath.test(x))) fail('写真は1〜12枚です。');
  item.photos = [...new Set(input.photos)];
  return item;
}

// Canvas re-encoding removes EXIF on the phone. Strip APP/COM again at the trust boundary.
export function stripMetadata(bytes) {
  if (bytes.length < 4 || bytes[0] !== 255 || bytes[1] !== 216 || bytes.at(-2) !== 255 || bytes.at(-1) !== 217) fail('JPEG画像を選んでください。');
  const parts = [bytes.slice(0,2)]; let pos = 2;
  while (pos < bytes.length) {
    if (bytes[pos] !== 255) fail('画像データが不正です。');
    const marker = bytes[pos+1];
    if (marker === 218) { parts.push(bytes.slice(pos)); return concat(parts); }
    const length = (bytes[pos+2] << 8) | bytes[pos+3];
    if (length < 2 || pos + 2 + length > bytes.length) fail('画像データが不正です。');
    if (!(marker >= 224 && marker <= 239) && marker !== 254) parts.push(bytes.slice(pos, pos+2+length));
    pos += 2 + length;
  }
  fail('画像データが不正です。');
}
function concat(parts) { const result = new Uint8Array(parts.reduce((n,p)=>n+p.length,0)); let offset=0; for (const p of parts) {result.set(p,offset);offset+=p.length;} return result; }
function base64(bytes) { let text=''; for(let i=0;i<bytes.length;i+=8192) text+=String.fromCharCode(...bytes.subarray(i,i+8192)); return btoa(text); }

export class Repository {
  constructor(env, fetcher = fetch) { this.env=env; this.fetcher=fetcher; }
  async api(path, method='GET', body) {
    const stage = /^\/git\/ref\//.test(path) ? 'ref' : /^\/git\/commits\//.test(path) ? 'commit' : /^\/git\/trees\//.test(path) ? 'tree' : /^\/git\/blobs\//.test(path) ? 'blob' : 'write';
    let response;
    try {
      // Workers' native fetch must be called as a function, not as a method of Repository.
      const fetcher = this.fetcher;
      response = await fetcher(`https://api.github.com/repos/${this.env.REPO}${path}`, {method, headers:{Authorization:`Bearer ${this.env.GITHUB_TOKEN}`, Accept:'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28','User-Agent':'sawamoto-gallery','Content-Type':'application/json'}, ...(body ? {body:JSON.stringify(body)} : {})});
    } catch {
      logFailure('github_network_error',stage,502);
      fail('GitHubへの接続に失敗しました。再試行してください。',502);
    }
    if (!response.ok) {
      logFailure('github_http_error',stage,response.status);
      fail(response.status === 409 || response.status === 422 ? '同時に更新されました。一覧を読み直して再試行してください。' : `GitHubへの保存に失敗しました (${response.status})。権限・有効期限・通信を確認し再試行してください。`, response.status === 409 || response.status === 422 ? 409 : 502);
    }
    if (response.status === 204) return null;
    try { return await response.json(); }
    catch {
      logFailure('github_invalid_json',stage,502);
      fail('GitHubからの応答を読み取れませんでした。',502);
    }
  }
  async snapshot() {
    const ref = await this.api(`/git/ref/heads/${this.env.BRANCH}`);
    if (typeof ref?.object?.sha !== 'string') { logFailure('github_invalid_shape','ref',502); fail('GitHubからの応答を読み取れませんでした。',502); }
    const commit = await this.api(`/git/commits/${ref.object.sha}`);
    if (typeof commit?.tree?.sha !== 'string') { logFailure('github_invalid_shape','commit',502); fail('GitHubからの応答を読み取れませんでした。',502); }
    const tree = await this.api(`/git/trees/${commit.tree.sha}?recursive=1`);
    if (!Array.isArray(tree?.tree)) { logFailure('github_invalid_shape','tree',502); fail('GitHubからの応答を読み取れませんでした。',502); }
    if (tree.truncated) fail('リポジトリが大きいため一覧を取得できません。管理者に連絡してください。', 503);
    return {head:ref.object.sha, tree:commit.tree.sha, files:tree.tree};
  }
  async item(file) {
    const blob = await this.api(`/git/blobs/${file.sha}`);
    try { return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(blob.content.replace(/\s/g,'')), c=>c.charCodeAt(0)))); }
    catch { logFailure('gallery_invalid_item','blob',502); fail('保存済み作品を読み取れませんでした。',502); }
  }
  async save(form, remove=false) {
    let input; try {input=JSON.parse(form.get('item'));} catch {fail('投稿内容が不正です。');}
    const item = validate(input), snapshot = await this.snapshot();
    const path = `content/galleries/${item.id}.json`;
    const old = snapshot.files.find(x=>x.path===path);
    const oldItem = old ? await this.item(old) : null;
    if (remove && !old && form.get('version')) return {alreadyDeleted:true};
    if (!remove && oldItem && JSON.stringify(validate(oldItem)) === JSON.stringify(item)) return {alreadySaved:true};
    if ((old?.sha || '') !== (form.get('version') || '')) fail('別の更新があります。一覧を読み直してください。',409);
    if (remove && !old) fail('作品が見つかりません。',404);
    item.created_at = oldItem?.created_at || new Date().toISOString();
    const uploads = remove ? [] : form.getAll('images');
    const paths = remove ? [] : JSON.parse(form.get('paths') || '[]');
    if (uploads.length !== paths.length || uploads.length > 12 || new Set(paths).size !== paths.length) fail('画像の枚数が不正です。');
    const allowed = new Set(oldItem?.photos || []);
    const changes = [];
    for (let i=0;i<uploads.length;i++) {
      const photo = paths[i], file = uploads[i];
      if (!imagePath.test(photo) || snapshot.files.some(x=>x.path===photo) || !item.photos.includes(photo) || !(file instanceof Blob) || file.size > 1500000) fail('画像形式・容量・保存先を確認してください。');
      const bytes = stripMetadata(new Uint8Array(await file.arrayBuffer()));
      const blob = await this.api('/git/blobs','POST',{encoding:'base64', content:base64(bytes)});
      changes.push({path:photo,mode:'100644',type:'blob',sha:blob.sha}); allowed.add(photo);
    }
    if (!remove && item.photos.some(x=>!allowed.has(x))) fail('写真の保存先が不正です。');
    if (remove) {
      changes.push({path,mode:'100644',type:'blob',sha:null});
      // Each photo belongs to one item; JSON validation prevents adopting another item's files.
      for (const photo of oldItem.photos) changes.push({path:photo,mode:'100644',type:'blob',sha:null});
    } else changes.push({path,mode:'100644',type:'blob',content:JSON.stringify(item,null,2)+'\n'});
    const tree = await this.api('/git/trees','POST',{base_tree:snapshot.tree,tree:changes});
    const commit = await this.api('/git/commits','POST',{message:`gallery: ${remove?'delete':'save'} ${item.id}`,tree:tree.sha,parents:[snapshot.head]});
    await this.api(`/git/refs/heads/${this.env.BRANCH}`,'PATCH',{sha:commit.sha,force:false});
    return {commit:commit.sha};
  }
}

export default {
  async fetch(request, env) {
    let response;
    try {
      await authorize(request, env);
      const url = new URL(request.url);
      if (request.method !== 'GET' && (request.headers.get('Origin') !== url.origin || request.headers.get('X-Gallery-Request') !== '1')) fail('投稿元を確認できません。',403);
      const repo = new Repository(env);
      if (url.pathname === '/api/items' && request.method === 'GET') {
        const snapshot=await repo.snapshot();
        const files=snapshot.files.filter(x=>/^content\/galleries\/[0-9a-f-]{36}\.json$/.test(x.path));
        const items=[]; for (const file of files) items.push({...await repo.item(file),version:file.sha});
        response=json(items.sort((a,b)=>b.date.localeCompare(a.date)));
      } else if (url.pathname === '/api/items' && request.method === 'POST') {
        if (Number(request.headers.get('Content-Length') || 0) > 20000000) fail('写真の容量が大きすぎます。');
        const data=await request.arrayBuffer();
        if(data.byteLength>20000000) fail('写真の容量が大きすぎます。');
        const form=await new Response(data,{headers:{'Content-Type':request.headers.get('Content-Type') || ''}}).formData();
        response=json(await repo.save(form,form.get('remove')==='1'));
      } else if (url.pathname.startsWith('/api/')) response=json({error:'見つかりません。'},404);
      else if (request.method !== 'GET') response=json({error:'操作できません。'},405);
      else response=await env.ASSETS.fetch(request);
    } catch (error) {
      if (!error.status) logFailure('unexpected_error','worker',500);
      response=json({error:error.status ? error.message : '処理に失敗しました。通信状態を確認し再試行してください。'},error.status || 500);
    }
    const headers = new Headers(response.headers);
    headers.set('Cache-Control','no-store'); headers.set('X-Content-Type-Options','nosniff'); headers.set('Referrer-Policy','no-referrer');
    headers.set('Content-Security-Policy',"default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' blob: https://sawanoto.github.io; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'");
    return new Response(response.body,{status:response.status,headers});
  }
};
