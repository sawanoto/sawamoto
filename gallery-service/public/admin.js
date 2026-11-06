const $ = selector => document.querySelector(selector);
const form = $('#editor'), controls = $('#controls'), status = $('#status');
const fields = ['kind','date','title','place','materials','description','article_url','sale_url'];
let current, images = [], items = [], busy = false;
const say = (message, error=false) => {status.textContent=message;status.classList.toggle('error',error);};
const today = () => {const date=new Date();return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;};
function reset() {
  images.forEach(x=>{if(x.url?.startsWith('blob:')) URL.revokeObjectURL(x.url);});
  current={id:crypto.randomUUID(),version:''}; images=[]; form.reset(); form.elements.date.value=today();
  $('#delete').hidden=true; $('#submit').textContent='投稿する'; form.querySelector('details').open=false; updateKind(); preview();
}
async function api(path, options={}) {
  const response=await fetch(path,{...options,headers:{'X-Gallery-Request':'1',...options.headers}});
  if(response.redirected || !response.headers.get('Content-Type')?.includes('application/json')) throw new Error('本人認証が切れました。この画面を再読み込みしてログインしてください。');
  const data=await response.json(); if(!response.ok) throw new Error(data.error || `通信に失敗しました (${response.status})`); return data;
}
async function load() {
  try {
    items=await api('/api/items'); const list=$('#items');list.replaceChildren();
    for(const item of items){const button=document.createElement('button');button.type='button';button.textContent=`${item.date} · ${{children:'子どもの作品',handwork:'大人の作品',life:'生活'}[item.kind]} · ${item.title||'無題'} (${item.photos.length}枚)`;button.onclick=()=>edit(item);list.append(button);}
    controls.disabled=false; say('写真を選んで投稿できます。');
  } catch(error){say(error.message,true);}
}
function edit(item) {
  if(busy)return;
  if(images.some(x=>x.blob) && !confirm('選択中の写真を破棄して編集しますか？'))return;
  reset(); current={...item};for(const field of fields)form.elements[field].value=item[field]||'';
  updateKind(); images=item.photos.map(path=>({path,url:`https://sawanoto.github.io/sawamoto/${path}`}));
  $('#delete').hidden=false;$('#submit').textContent='変更を保存';preview();window.scrollTo({top:0,behavior:'smooth'});
}
function updateKind(){$('#date-label').textContent=form.elements.kind.value==='life'?'撮影日':'制作日';document.querySelectorAll('[data-kind]').forEach(label=>{label.hidden=label.dataset.kind!==form.elements.kind.value;});}
form.elements.kind.onchange=updateKind;
function preview(){
  const list=$('#preview');list.replaceChildren();
  images.forEach(image=>{const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=image.url;img.alt='公開する作品写真';caption.textContent=image.blob?`${Math.round(image.blob.size/1024)} KB · 圧縮済み`:'登録済み';figure.append(img,caption);list.append(figure);});
}
export async function compress(file) {
  if(file.size>40000000)throw new Error('元写真は40MB以下で選択してください。');
  let bitmap;
  try{bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});}catch{throw new Error('この画像を読み込めません。HEICの場合は写真アプリからJPEGで書き出して選んでください。');}
  try {
    const scale=Math.min(1,1920/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    const context=canvas.getContext('2d');context.fillStyle='#fff';context.fillRect(0,0,canvas.width,canvas.height);context.drawImage(bitmap,0,0,canvas.width,canvas.height);
    let blob;for(const quality of [.85,.72,.58,.45]){blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));if(blob && blob.size<=1500000)break;}
    if(!blob || blob.size>1500000)throw new Error('写真の圧縮に失敗しました。小さい写真を選んでください。');
    return blob;
  } finally {bitmap.close();}
}
async function choose(event) {
  if(busy)return;
  const files=[...event.target.files];event.target.value='';
  if(files.length+images.length>12){say('1作品につき写真は12枚までです。',true);return;}
  setBusy(true);say('写真を圧縮しています…');
  try{for(const file of files){const blob=await compress(file);images.push({path:`assets/images/galleries/${crypto.randomUUID()}.jpg`,blob,url:URL.createObjectURL(blob)});}say('プレビューを確認して投稿してください。位置情報は削除済みです。');}
  catch(error){say(error.message,true);}finally{preview();setBusy(false);}
}
function setBusy(value){busy=value;controls.disabled=value;$('#reload').disabled=value;form.setAttribute('aria-busy',String(value));}
async function save(remove=false){
  if(busy)return;
  if(!images.length){say('写真を1枚以上選んでください。',true);return;}
  if(remove && !confirm('作品と写真を公開ギャラリーから削除します。Git履歴には残ります。削除しますか？'))return;
  const item={id:current.id,photos:images.map(x=>x.path)};for(const field of fields)item[field]=form.elements[field].value;
  const data=new FormData();data.set('item',JSON.stringify(item));data.set('version',current.version||'');
  const added=remove?[]:images.filter(x=>x.blob);data.set('paths',JSON.stringify(added.map(x=>x.path)));added.forEach(x=>data.append('images',x.blob,'photo.jpg'));if(remove)data.set('remove','1');
  setBusy(true);say('GitHubに保存しています。この画面を閉じずにお待ちください…');
  try{await api('/api/items',{method:'POST',body:data});reset();await load();say('保存しました。公開サイトへの反映には数分かかります。');}
  catch(error){say(`${error.message}\n入力と写真はこの画面に残っています。同じボタンで再試行できます。通信が切れた場合は、一覧を読み直して保存済みか確認してください。`,true);}
  finally{setBusy(false);}
}
form.onsubmit=event=>{event.preventDefault();save();};$('#delete').onclick=()=>save(true);$('#new-work').onclick=()=>{if(!images.length||confirm('入力を破棄して新しい作品を作成しますか？'))reset();};$('#reload').onclick=()=>load();$('#photos').onchange=choose;$('#camera').onchange=choose;
window.addEventListener('beforeunload',event=>{if(busy||images.some(x=>x.blob)){event.preventDefault();event.returnValue='';}});
reset();load();
