"""Build imported drafts in an ignored copy, without changing publication flags."""
from pathlib import Path
import html
import json
import os
import shutil
import subprocess
import sys

import markdown


ROOT = Path(__file__).resolve().parents[1]
PREVIEW = ROOT / ".private" / "sawanoalan-preview"


def main():
    PREVIEW.mkdir(parents=True, exist_ok=True)
    for folder in ("content", "assets"):
        # Replace only the two known input directories under this preview folder.
        target = PREVIEW / folder
        if target.exists():
            if target.is_symlink() or target.resolve().parent != PREVIEW.resolve():
                raise ValueError("Unexpected preview path")
            shutil.rmtree(target)
        shutil.copytree(ROOT / folder, target)
    for pattern in ("*.py", "google*.html"):
        for source in ROOT.glob(pattern):
            shutil.copyfile(source, PREVIEW / source.name)
    mapping = json.loads((ROOT / "docs/sawanoalan/url-map.json").read_text(encoding="utf-8"))
    review_articles = []
    review_links = []
    for entry in mapping:
        article = PREVIEW / entry["file"]
        _, front, body = article.read_text(encoding="utf-8").split("---", 2)
        metadata = json.loads(front)
        metadata["draft"] = False
        article.write_text("---\n" + json.dumps(metadata, ensure_ascii=False, indent=2)
                           + "\n---" + body, encoding="utf-8")
        slug = article.stem
        title = html.escape(metadata["title"])
        note = html.escape(entry.get("review_notes", ""))
        review_links.append(f'<li><a href="#{slug}">{title}</a></li>')
        review_articles.append(f'<article id="{slug}"><p>{html.escape(metadata["published"])} · 下書き</p>'
                               f'<h2>{title}</h2><p class="note">{note}</p>'
                               + markdown.markdown(body, extensions=["extra", "sane_lists"])
                               + '<p><a href="#contents">記事一覧へ戻る</a></p></article>')
    env = dict(os.environ, SITE_BASE_PATH="/", PYTHONUTF8="1")
    subprocess.run([sys.executable, "build.py"], cwd=PREVIEW, env=env, check=True)
    standalone = '''<!doctype html><html lang="ja"><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>さわのま 移植記事の確認</title><style>
body{font-family:system-ui,sans-serif;max-width:850px;margin:40px auto;padding:0 20px;line-height:1.9;color:#26302a;background:#faf9f5}
article{border-top:1px solid #ccc;padding:36px 0;scroll-margin-top:20px}a{color:#245b52;overflow-wrap:anywhere}
table{border-collapse:collapse;display:block;overflow:auto}td,th{border:1px solid #bbb;padding:8px}
pre{overflow:auto}p,li{overflow-wrap:anywhere}.note{background:#eee9db;padding:12px}.note:empty{display:none}
</style><h1>さわのま 移植記事の確認</h1><p>25件すべて確認用の下書きです。公開サイトへは追加されていません。</p>
<nav id="contents"><h2>記事一覧</h2><ul>'''
    standalone += "".join(review_links) + '</ul></nav>' + "".join(review_articles) + '</html>'
    (PREVIEW / "review.html").write_text(standalone, encoding="utf-8")
    print("Open without a server: .private/sawanoalan-preview/review.html")
    print("Preview: .private/sawanoalan-preview/dist/writing/index.html")
    print("Serve: python -m http.server 8000 --directory .private/sawanoalan-preview/dist")


if __name__ == "__main__":
    main()
