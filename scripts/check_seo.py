"""Check the built site's sitemap and crawlable HTML links."""
from collections import deque
from datetime import date
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urljoin, urlsplit, urlunsplit
import sys
import xml.etree.ElementTree as ET

ROOT = Path(__file__).resolve().parents[1] / "dist"
SITE = "https://sawanoto.github.io"
BASE = "/sawamoto/"
NS = "{http://www.sitemaps.org/schemas/sitemap/0.9}"


def internal_target(source, href):
    target = urlsplit(urljoin(source, href))
    if target.hostname != urlsplit(SITE).hostname:
        return None
    path = unquote(target.path)
    if not path.startswith(BASE):
        # Other projects share this host. Flag paths that match this build.
        project_path = path.lstrip("/")
        if project_path and (ROOT / project_path).exists():
            raise AssertionError(f"Missing project base path: {source} -> {href}")
        return None
    relative = path.removeprefix(BASE)
    assert ".." not in relative.split("/"), f"Invalid internal path: {source} -> {href}"
    file = ROOT / relative
    assert file.exists(), f"Broken internal link: {source} -> {href}"
    if file.is_dir():
        assert path.endswith("/"), f"Missing trailing slash: {source} -> {href}"
        file /= "index.html"
    else:
        assert not path.endswith("/") and file.name != "index.html", (
            f"Noncanonical internal link: {source} -> {href}"
        )
    assert file.is_file(), f"Broken internal link: {source} -> {href}"
    return urlunsplit((target.scheme, target.netloc, target.path, "", ""))


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
        self.images = set()

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
        elif tag == "img" and attrs.get("src"):
            self.images.add(attrs["src"])

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
        source = queue.popleft()
        for image in pages[source].images:
            internal_target(source, image)
        for link in pages[source].links:
            target = internal_target(source, link)
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
