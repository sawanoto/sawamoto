"""Independent photo galleries; articles and existing works stay untouched."""
import json
import re
from datetime import date

KINDS = {'children': '子どもの作品', 'handwork': '手仕事'}


def load_entries(content):
    entries = []
    for file in (content / 'galleries').glob('*.json'):
        item = json.loads(file.read_text(encoding='utf-8'))
        if not re.fullmatch(r'[0-9a-f-]{36}', item['id']) or file.stem != item['id']:
            raise ValueError('Invalid gallery ID')
        if item['kind'] not in KINDS:
            raise ValueError('Invalid gallery kind')
        date.fromisoformat(item['date'])
        if not item['photos']:
            raise ValueError('Gallery needs a photo')
        for photo in item['photos']:
            if not re.fullmatch(r'assets/images/galleries/[0-9a-f-]{36}\.jpg', photo) or not (content.parent / photo).is_file():
                raise ValueError('Missing or invalid gallery photo')
        entries.append(item)
    return sorted(entries, key=lambda x: (x['date'], x.get('created_at', ''), x['id']), reverse=True)


def render_galleries(content, write, page, local, e, external, digital_galleries=""):
    entries = load_entries(content)
    for kind, title in KINDS.items():
        selected = [x for x in entries if x['kind'] == kind]
        chunks = [selected[i:i+24] for i in range(0, len(selected), 24)] or [[]]
        for index, chunk in enumerate(chunks):
            cards = []
            for item in chunk:
                photos = ''.join(f'<a href="{local(src)}" class="gallery-photo"><img src="{local(src)}" alt="{e(item.get("title") or "作品写真")}" loading="lazy" decoding="async"></a>' for src in item['photos'])
                text = ''.join(f'<p>{e(item.get(key, ""))}</p>' for key in ('place', 'materials', 'description') if item.get(key))
                links = ''.join(external(label, item[key]) for key, label in [('article_url', '関連記事'), ('sale_url', '販売ページ')] if item.get(key))
                cards.append(f'<article class="gallery-card" id="work-{item["id"]}"><div class="gallery-photos">{photos}</div><time datetime="{item["date"]}">{item["date"]}</time><h2>{e(item.get("title") or "無題")}</h2>{text}<p>{links}</p></article>')
            path = f'gallery/{kind}/' + (f'page/{index+1}/' if index else '')
            jumps = ''.join(f'<a href="{local(f"gallery/{kind}/" + (f"page/{n+1}/" if n else ""))}" {"aria-current=page" if n == index else ""}>{n+1}</a> ' for n in range(len(chunks)))
            description = '実物作品とデジタル作品、日々の暮らしの記録。'
            heading = f'<div class="page-heading"><p class="kicker">Gallery</p><h1>Gallery</h1><p>{description}</p><div class="gallery-filters" role="group" aria-label="Galleryのカテゴリ" hidden><button type="button" data-gallery-category="physical" aria-controls="physical-gallery" aria-pressed="true">実物作品</button><button type="button" data-gallery-category="digital" aria-controls="digital-gallery" aria-pressed="false">デジタル作品</button><button type="button" data-gallery-category="life" aria-controls="life-gallery" aria-pressed="false">生活</button></div></div>'
            subcategories = ''.join(f'<li><a href="{local(f"gallery/{key}/")}"' + (' aria-current="page"' if key == kind else '') + f'>{label}</a></li>' for key, label in [('children', '子どもの作品'), ('handwork', '手仕事（編み物・革細工など）')])
            physical = f'<section id="physical-gallery" class="gallery-category" aria-labelledby="physical-gallery-title"><div class="section-head"><h2 id="physical-gallery-title">実物作品</h2></div><ul class="link-list" aria-label="実物作品の分類">{subcategories}</ul><p class="kicker">{e(title)}</p><p>制作した日をたどる、写真の記録。新しい制作日から並べています。</p><div class="gallery-grid">{"".join(cards) or "<p>作品の記録を、少しずつ。</p>"}</div><nav aria-label="ギャラリーのページ">{jumps}</nav></section>'
            life = '<section id="life-gallery" class="gallery-category" aria-labelledby="life-gallery-title"><div class="section-head"><h2 id="life-gallery-title">生活</h2></div><p>日常の風景や出来事の写真。写真はまだ掲載していません。</p></section>'
            body = heading + physical + digital_galleries + life + f'<dialog id="photo-view"><button type="button" autofocus>閉じる</button><img alt="作品写真の拡大"></dialog><link rel="stylesheet" href="{local("assets/gallery.css")}"><script src="{local("assets/gallery.js")}" defer></script>'
            write(path.rstrip('/'), page('Gallery', description, path, body))
    write('gallery-admin', page('作品の投稿', '本人専用の投稿画面について。', 'gallery-admin/', '<div class="page-heading"><h1>作品の投稿</h1><p>投稿画面は本人認証で保護された別の専用URLで利用します。現在は初期設定待ちです。</p><p>設定手順は<a href="https://github.com/sawanoto/sawamoto/blob/main/docs/gallery-setup.md">スマホ投稿の初期設定ガイド</a>を確認してください。</p></div>'))
