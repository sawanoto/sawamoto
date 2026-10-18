"""Create one offline review HTML file without deploying or changing the public UI."""
from pathlib import Path
import json
import re
import sys

root = Path(__file__).resolve().parent.parent
output = Path(sys.argv[1]) if len(sys.argv) > 1 else root / '.private' / 'seasonal-preview.html'
html = (root / 'dist' / 'index.html').read_text()
style = (root / 'assets' / 'style.css').read_text() + '\n' + (root / 'assets' / 'seasonal.css').read_text() + '\n' + (root / 'assets' / 'kigo.css').read_text()
script = (root / 'assets' / 'seasonal.js').read_text() + '\n' + (root / 'assets' / 'kigo.js').read_text()
# Review the exact built homepage with inlined assets; only the preview month is fixed.
html = re.sub(r'<link rel="stylesheet" href="[^"]+">', '', html)
html = re.sub(r'<script src="[^"]*(?:seasonal|kigo).js" defer></script>', '', html)
html = html.replace('</head>', '<style>' + style + '</style></head>')
html = html.replace('href="/sawamoto/', 'href="https://sawanoto.github.io/sawamoto/')
html = html.replace('src="/sawamoto/', 'src="https://sawanoto.github.io/sawamoto/')
review = '''<!doctype html><html lang="ja"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>季節デザイン・マージ前プレビュー</title>
<style>body{margin:0;background:#e9e9e5;color:#242923;font:15px/1.7 sans-serif}header{padding:16px 24px}h1{font-size:20px;margin:0}p{margin:4px 0 10px}label{margin-right:16px}iframe{display:block;background:white;border:1px solid #ccc;width:calc(100% - 32px);max-width:1280px;height:80vh;margin:0 auto 20px}select{font:inherit;padding:4px}a{color:inherit}</style>
<header><h1>12か月の季節デザイン</h1><p>マージ前の確認用ファイルです。月・画面幅を選ぶと、生成したトップページを表示します。本文リンクは公開サイトへ移動します。</p>
<label>月 <select id="month"></select></label><label>幅 <select id="width"><option value="1280">PC（1280px）</option><option value="390">スマートフォン（390px）</option><option value="320">小さな画面（320px）</option></select></label></header>
<iframe id="preview" title="季節テーマのプレビュー"></iframe>
<script>
const template=__HTML__, themeScript=__SCRIPT__;
const names=['お正月','雪と冬','春の芽吹き','桜','新緑','梅雨と紫陽花','七夕','夏とひまわり','月見','ハロウィン','紅葉','クリスマス'];
const month=document.querySelector('#month'),width=document.querySelector('#width'),frame=document.querySelector('#preview');
names.forEach((name,i)=>{const o=new Option(`${i+1}月：${name}`,i+1);month.add(o)});month.value='10';
function show(){const fixed=themeScript.replace('window.location.search',JSON.stringify('?themeMonth='+month.value));frame.srcdoc=template.replace('</body>','<script>'+fixed+'<\\/script></body>');frame.style.maxWidth=width.value+'px';}
month.addEventListener('change',show);width.addEventListener('change',show);show();
</script></html>'''
# Escape closing-script sequences in data embedded in the review wrapper.
review = review.replace('__HTML__', json.dumps(html, ensure_ascii=False).replace('</', '<\\/'))
review = review.replace('__SCRIPT__', json.dumps(script, ensure_ascii=False).replace('</', '<\\/'))
output.parent.mkdir(parents=True, exist_ok=True)
output.write_text(review)
print(output)
