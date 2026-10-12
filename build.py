"""Build the public, static GitHub Pages site from reviewed content files."""
from __future__ import annotations

import html
import json
import os
import re
import shutil
from pathlib import Path
from urllib.parse import urlparse
from xml.sax.saxutils import escape as xml_escape

import markdown

ROOT = Path(__file__).parent
CONTENT = ROOT / "content"
OUT = ROOT / "dist"
BASE = os.environ.get("SITE_BASE_PATH", "/sawamoto/")
if not BASE.startswith("/") or not BASE.endswith("/") or ".." in BASE:
    raise ValueError("SITE_BASE_PATH must be an absolute URL path ending in /")
ORIGIN = "https://sawanoto.github.io"
SITE = json.loads((CONTENT / "site.json").read_text(encoding="utf-8"))
TIMELINE = json.loads((CONTENT / "timeline.json").read_text(encoding="utf-8"))
BOOKS = json.loads((CONTENT / "books.json").read_text(encoding="utf-8"))


def e(value: object) -> str:
    return html.escape(str(value), quote=True)


def safe_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme not in {"https", "http"} or not parsed.netloc:
        raise ValueError(f"Only absolute HTTP(S) links are allowed: {value}")
    return e(value)


def external(label: str, url: str) -> str:
    return f'<a href="{safe_url(url)}" target="_blank" rel="noopener noreferrer">{e(label)} <span aria-hidden="true">↗</span></a>'


def local(path: str) -> str:
    return BASE + path


def image_url(value: str) -> str:
    if value.startswith("https://") or value.startswith("http://"):
        return safe_url(value)
    if value.startswith("assets/") and ".." not in value:
        return local(value)
    raise ValueError(f"Use a public assets/ path or HTTP(S) image URL: {value}")


def data_files(folder: str) -> list[dict]:
    items = []
    for file in sorted((CONTENT / folder).glob("*.md")):
        raw = file.read_text(encoding="utf-8")
        match = re.match(r"\A---\s*\n(.*?)\n---\s*\n(.*)\Z", raw, re.S)
        if not match:
            raise ValueError(f"Missing JSON front matter: {file}")
        item = json.loads(match.group(1))
        item["body"] = match.group(2)
        item["slug"] = file.stem
        if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", item["slug"]):
            raise ValueError(f"Use an ASCII slug: {file}")
        items.append(item)
    return items


WORKS = data_files("works")
WRITING = data_files("writing")
work_by_id = {x["id"]: x for x in WORKS}
article_by_id = {x["id"]: x for x in WRITING}
timeline_by_id = {x["id"]: x for x in TIMELINE}
for items in (WORKS, WRITING, TIMELINE):
    if len({x["id"] for x in items}) != len(items):
        raise ValueError("Duplicate content ID")


def related(ids: list[str], collection: dict, section: str) -> str:
    links = []
    for id_ in ids:
        if id_ not in collection:
            raise ValueError(f"Unknown related ID: {id_}")
        item = collection[id_]
        href = local(f"{section}/{item['slug']}/") if section != "about" else local(f"about/#timeline-{e(id_)}")
        links.append(f'<li><a href="{href}">{e(item["title"])}</a></li>')
    return '<ul class="link-list">' + "".join(links) + "</ul>" if links else ""


def page(title: str, description: str, path: str, body: str) -> str:
    full_title = f"{title} | {SITE['name']}" if title else f"{SITE['name']} / {SITE['name_en']}"
    url = ORIGIN + local(path)
    nav = [("Home", ""), ("About", "about/"), ("Works", "works/"), ("Writing", "writing/")]
    if BOOKS:
        nav.append(("Books", "books/"))
    nav_html = "".join(f'<a href="{local(p)}" {"aria-current=\"page\"" if p == path else ""}>{label}</a>' for label, p in nav)
    return f'''<!doctype html>
<html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="theme-color" content="#f8f7f3"><title>{e(full_title)}</title><meta name="description" content="{e(description)}">
<link rel="canonical" href="{url}"><meta property="og:type" content="website"><meta property="og:locale" content="ja_JP">
<meta property="og:title" content="{e(full_title)}"><meta property="og:description" content="{e(description)}"><meta property="og:url" content="{url}">
<meta property="og:site_name" content="{e(SITE['name'])}"><link rel="stylesheet" href="{local('assets/style.css')}">
</head><body><a class="skip" href="#main">本文へ移動</a><div class="shell"><header class="header">
<a class="brand" href="{local('')}">{e(SITE['name'])}<small>{e(SITE['name_en'])}</small></a>
<nav aria-label="メインナビゲーション">{nav_html}</nav></header><main id="main">{body}</main>
<footer class="footer"><span>{e(SITE['name'])} / {e(SITE['name_en'])}</span><a href="#main">上へ戻る ↑</a></footer></div></body></html>'''


def write(path: str, content: str) -> None:
    file = OUT / path / "index.html"
    file.parent.mkdir(parents=True, exist_ok=True)
    file.write_text(content, encoding="utf-8")


def card(item: dict, section: str) -> str:
    href = local(f"{section}/{item['slug']}/")
    image = f'<img src="{image_url(item["thumbnail"])}" alt="{e(item.get("thumbnail_alt", ""))}" loading="lazy">' if item.get("thumbnail") else '<span class="image-placeholder" aria-hidden="true">Y / S</span>'
    meta = item.get("period", item.get("date", ""))
    return f'<article class="card"><a class="card-image" href="{href}">{image}</a><div class="card-body"><p class="meta">{e(meta)}{(" · " + e(item.get("category", ""))) if item.get("category") else ""}</p><h3><a href="{href}">{e(item["title"])}</a></h3><p>{e(item.get("summary", ""))}</p></div></article>'


def section_head(kicker: str, title: str, path: str = "") -> str:
    link = f'<a class="text-link" href="{local(path)}">一覧を見る <span aria-hidden="true">→</span></a>' if path else ""
    return f'<div class="section-head"><div><p class="kicker">{e(kicker)}</p><h2>{e(title)}</h2></div>{link}</div>'


def build() -> None:
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / "assets").mkdir(parents=True)
    shutil.copy(ROOT / "assets" / "style.css", OUT / "assets" / "style.css")
    for asset in (ROOT / "assets").rglob("*"):
        if asset.is_file() and asset.name != "style.css":
            target = OUT / "assets" / asset.relative_to(ROOT / "assets")
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy(asset, target)
    (OUT / ".nojekyll").write_text("", encoding="utf-8")

    recent_works = sorted(WORKS, key=lambda x: x.get("sort", x.get("date", "")), reverse=True)[:3]
    recent_articles = sorted(WRITING, key=lambda x: x.get("published", ""), reverse=True)[:3]
    works_home = "".join(card(x, "works") for x in recent_works) if recent_works else '<p class="empty">公開できる制作物を準備中です。</p>'
    writing_home = "".join(card(x, "writing") for x in recent_articles) if recent_articles else '<p class="empty">記事を準備中です。</p>'
    home = f'''<section class="hero"><p class="kicker">Personal site</p><h1>{e(SITE['name'])}<span>{e(SITE['name_en'])}</span></h1>
    <p class="lead">{e(SITE['description'])}</p><p class="intro">{e(SITE['intro'])}</p>
    <a class="button" href="{local('about/')}">澤本優哉について <span aria-hidden="true">→</span></a></section>
    <section class="home-section">{section_head('01 / Works', '制作物', 'works/')}<div class="card-grid">{works_home}</div></section>
    <section class="home-section">{section_head('02 / Writing', '文章・考察', 'writing/')}<div class="card-grid">{writing_home}</div></section>
    <section class="home-section">{section_head('03 / About', 'これまでの活動', 'about/#timeline')}<p class="section-copy">活動の記録は、時期や公開範囲を確認しながら年表に加えていきます。</p></section>'''
    write("", page("", SITE["description"], "", home))

    timeline_parts = []
    for item in sorted(TIMELINE, key=lambda x: x.get("sort", ""), reverse=True):
        links = related(item.get("work_ids", []), work_by_id, "works") + related(item.get("article_ids", []), article_by_id, "writing")
        timeline_parts.append(f'<li id="timeline-{e(item["id"])}" class="timeline-item"><span class="meta">{e(item.get("period", ""))}</span><div><h3>{e(item["title"])}</h3><p>{e(item.get("summary", ""))}</p>{links}</div></li>')
    timeline_html = '<ol class="timeline">' + "".join(timeline_parts) + "</ol>" if timeline_parts else '<p class="empty">公開する記録を確認中です。</p>'
    social = '<ul class="link-list">' + "".join(f'<li>{external(x["label"], x["url"])}</li>' for x in SITE.get("links", [])) + "</ul>" if SITE.get("links") else '<p class="empty">公開中の外部リンクはありません。</p>'
    interests = "".join(f'<li>{e(x)}</li>' for x in SITE.get("interests", []))
    about = f'''<div class="page-heading"><p class="kicker">About</p><h1>澤本優哉について</h1><p>{e(SITE['about'])}</p></div>
    <section class="content-section">{section_head('Interests', '現在の関心')}<ul class="chips">{interests}</ul></section>
    <section class="content-section" id="timeline">{section_head('Timeline', '活動の記録')}{timeline_html}</section>
    <section class="content-section">{section_head('Elsewhere', '外部リンク')}{social}</section>'''
    write("about", page("About", "澤本優哉のプロフィールと活動の記録。", "about/", about))

    works_list = "".join(card(x, "works") for x in WORKS) if WORKS else '<p class="empty">公開できる制作物を準備中です。作品を確認後、ここに追加します。</p>'
    write("works", page("Works", "澤本優哉の制作物。", "works/", f'<div class="page-heading"><p class="kicker">Works</p><h1>制作物</h1><p>形式や時期を問わず、公開できる作品を掲載します。</p></div><div class="card-grid listing">{works_list}</div>'))
    for item in WORKS:
        youtube_id = item.get("youtube_id")
        if youtube_id and not re.fullmatch(r"[A-Za-z0-9_-]{11}", youtube_id):
            raise ValueError(f"Invalid YouTube ID: {youtube_id}")
        if youtube_id:
            media = f'<div class="video-frame"><iframe src="https://www.youtube-nocookie.com/embed/{youtube_id}" title="{e(item["title"])}の動画" loading="lazy" referrerpolicy="strict-origin-when-cross-origin" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe></div>'
            link_label = "YouTubeで動画を開く"
        else:
            media = f'<figure class="feature-image"><img src="{image_url(item["thumbnail"])}" alt="{e(item.get("thumbnail_alt", ""))}"></figure>' if item.get("thumbnail") else ""
            link_label = "作品を見る"
        link = f'<p class="outbound">{external(link_label, item["url"])}</p>' if item.get("url") else ""
        facts = [("制作時期", "period"), ("カテゴリ", "category"), ("動画の長さ", "duration"), ("使用ソフト", "software"), ("担当", "role")]
        facts_html = "".join(f'<div><dt>{label}</dt><dd>{e(item[key])}</dd></div>' for label, key in facts if item.get(key))
        info = f'<dl class="work-facts">{facts_html}</dl>' if facts_html else ""
        article_links = related(item.get("article_ids", []), article_by_id, "writing")
        timeline_links = related(item.get("timeline_ids", []), timeline_by_id, "about")
        body = markdown.markdown(item["body"], extensions=["extra", "sane_lists"])
        detail = f'<div class="detail-heading"><a class="back" href="{local("works/")}">← Works</a><p class="meta">{e(item.get("period", ""))} · {e(item.get("category", ""))}</p><h1>{e(item["title"])}</h1><p class="lead">{e(item.get("summary", ""))}</p></div>{media}{link}{info}<article class="prose">{body}</article><aside class="related"><h2>関連する記録</h2>{article_links}{timeline_links or "<p>関連する公開記録はありません。</p>"}</aside>'
        write(f'works/{item["slug"]}', page(item["title"], item.get("summary", ""), f'works/{item["slug"]}/', detail))

    writing_list = "".join(card(x, "writing") for x in WRITING) if WRITING else '<p class="empty">公開する記事を準備中です。</p>'
    write("writing", page("Writing", "澤本優哉の文章と考察。", "writing/", f'<div class="page-heading"><p class="kicker">Writing</p><h1>文章・考察</h1><p>制作の記録や、日々考えたことを文章で残します。</p></div><div class="card-grid listing">{writing_list}</div>'))
    for item in WRITING:
        body = markdown.markdown(item["body"], extensions=["extra", "sane_lists"])
        tags = "".join(f'<li>{e(t)}</li>' for t in item.get("tags", []))
        updated = f' · 更新 {e(item["updated"])}' if item.get("updated") else ""
        related_works = related(item.get("work_ids", []), work_by_id, "works")
        detail = f'<div class="detail-heading"><a class="back" href="{local("writing/")}">← Writing</a><p class="meta">{e(item.get("published", ""))}{updated} · {e(item.get("category", ""))}</p><h1>{e(item["title"])}</h1><p class="lead">{e(item.get("summary", ""))}</p><ul class="chips">{tags}</ul></div><article class="prose">{body}</article><aside class="related"><h2>関連する作品</h2>{related_works or "<p>関連する公開作品はありません。</p>"}</aside>'
        write(f'writing/{item["slug"]}', page(item["title"], item.get("summary", ""), f'writing/{item["slug"]}/', detail))

    # Books stays off the navigation until a real, approved item is added.
    if BOOKS:
        cards = "".join(f'<article class="book"><h2>{e(x["title"])}</h2><p>{e(x.get("summary", ""))}</p>{external("販売ページ", x["url"])}</article>' for x in BOOKS)
        write("books", page("Books", "澤本優哉の書籍と販売作品。", "books/", f'<div class="page-heading"><p class="kicker">Books</p><h1>書籍・販売</h1></div>{cards}'))

    paths = ["", "about/", "works/", "writing/"] + [f'works/{x["slug"]}/' for x in WORKS] + [f'writing/{x["slug"]}/' for x in WRITING] + (["books/"] if BOOKS else [])
    urls = "".join(f'<url><loc>{xml_escape(ORIGIN + local(x))}</loc></url>' for x in paths)
    (OUT / "sitemap.xml").write_text(f'<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">{urls}</urlset>', encoding="utf-8")
    (OUT / "robots.txt").write_text(f'User-agent: *\nAllow: /\nSitemap: {ORIGIN + local("sitemap.xml")}\n', encoding="utf-8")


if __name__ == "__main__":
    build()
    print(f"Built {len(list(OUT.rglob('index.html')))} pages in {OUT}")
