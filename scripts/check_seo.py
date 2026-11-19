"""Check the built site's sitemap and crawlable HTML links."""
from collections import deque
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlparse
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "dist"
SITE = "https://sawanoto.github.io"
BASE = "/sawamoto/"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


class PageParser(HTMLParser):
    def __init__(self):
        super().__init__()
        self.lang = ""
        self.title = ""
        self.in_title = False
        self.description = ""
        self.canonical = ""
        self.robots = ""
        self.links = set()

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if tag == "html":
            self.lang = attrs.get("lang", "")
        elif tag == "title":
            self.in_title = True
        elif tag == "meta":
            if attrs.get("name") == "description":
                self.description = attrs.get("content", "")
            if attrs.get("name") == "robots":
                self.robots = attrs.get("content", "")
        elif tag == "link" and attrs.get("rel") == "canonical":
            self.canonical = attrs.get("href", "")
        elif tag == "a" and attrs.get("href"):
            self.links.add(attrs["href"])

    def handle_endtag(self, tag):
        if tag == "title":
            self.in_title = False

    def handle_data(self, data):
        if self.in_title:
            self.title += data


def check():
    sitemap = ET.parse(ROOT / "sitemap.xml").getroot()
    assert sitemap.tag == NS + "urlset", "Invalid sitemap namespace"
    urls = [entry.findtext(NS + "loc") for entry in sitemap.findall(NS + "url")]
    assert len(urls) == len(set(urls)), "Duplicate sitemap URL"
    assert SITE + BASE in urls, "Home missing from sitemap"
    assert SITE + BASE + "gallery-admin/" not in urls, "Admin guide in sitemap"

    pages = {}
    writing_titles = set()
    for entry in sitemap.findall(NS + "url"):
        modified = entry.findtext(NS + "lastmod")
        if modified:
            date.fromisoformat(modified)
    for url in urls:
        assert url and url.startswith(SITE + BASE) and url.endswith("/"), f"Invalid URL: {url}"
        path = url.removeprefix(SITE + BASE)
        file = ROOT / path / "index.html"
        assert file.is_file(), f"Sitemap page missing: {url}"
        page = PageParser()
        page.feed(file.read_text(encoding="utf-8"))
        assert page.lang == "ja", f"Wrong language: {url}"
        assert page.title.strip() and page.description.strip(), f"Missing title or description: {url}"
        assert page.canonical == url, f"Wrong canonical: {url}"
        assert "noindex" not in page.robots.lower(), f"Noindex URL in sitemap: {url}"
        if url.startswith(SITE + BASE + "writing/") and url != SITE + BASE + "writing/":
            assert page.title not in writing_titles, f"Duplicate writing title: {page.title}"
            writing_titles.add(page.title)
        pages[url] = page

    for file in ROOT.rglob("index.html"):
        relative = file.relative_to(ROOT).parent.as_posix()
        url = SITE + BASE + ("" if relative == "." else relative + "/")
        page = PageParser()
        page.feed(file.read_text(encoding="utf-8"))
        if "noindex" not in page.robots.lower():
            assert url in pages, f"Indexable page missing from sitemap: {url}"

    seen = {SITE + BASE}
    queue = deque(seen)
    while queue:
        for link in pages[queue.popleft()].links:
            parsed = urlparse(link)
            if parsed.scheme or parsed.netloc:
                target = link.split("#", 1)[0]
            else:
                target = SITE + parsed.path
            if target in pages and target not in seen:
                seen.add(target)
                queue.append(target)
    assert seen == set(urls), f"Unlinked sitemap pages: {sorted(set(urls) - seen)}"
    print(f"SEO check passed: {len(urls)} sitemap pages, all linked from home")


if __name__ == "__main__":
    try:
        check()
    except (AssertionError, ET.ParseError) as exc:
        sys.exit(str(exc))
