"""Check the structured data in the generated, crawlable HTML."""
import json
import re
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

import build
from scripts.check_seo import PageParser


class StructuredDataTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        temp = tempfile.TemporaryDirectory()
        cls.addClassCleanup(temp.cleanup)
        cls.out = Path(temp.name) / "dist"
        with patch.object(build, "OUT", cls.out):
            build.build()

    def read(self, path):
        html = (self.out / path / "index.html").read_text(encoding="utf-8")
        matches = re.findall(r'<script type="application/ld\+json">(.*?)</script>', html)
        self.assertEqual(len(matches), 1, path)
        data = json.loads(matches[0])
        self.assertEqual(data["@context"], "https://schema.org")
        return html, {node["@type"]: node for node in data["@graph"]}

    def assert_primary_entity(self, html, graph, entity, page_type="WebPage"):
        page = PageParser()
        page.feed(html)
        node = graph[page_type]
        self.assertEqual(node["@id"], page.canonical)
        self.assertEqual(node["url"], page.canonical)
        self.assertEqual(node["inLanguage"], page.lang)
        self.assertEqual(node["mainEntity"], {"@id": entity["@id"]})
        self.assertEqual(entity["mainEntityOfPage"], {"@id": page.canonical})
        self.assertEqual(entity["url"], page.canonical)

    def test_profile_and_home_share_person(self):
        html, profile = self.read("about")
        person = profile["Person"]
        self.assert_primary_entity(html, profile, person, "ProfilePage")
        self.assertEqual(person["@id"], "https://sawanoto.github.io/sawamoto/about/#person")
        self.assertIn('id="person"', html)
        for key in ("name", "alternateName", "description"):
            self.assertIn(build.e(person[key]), html)
        self.assertEqual(set(person["sameAs"]), {
            "https://github.com/sawanoto", "https://x.com/yuyasaw",
            "https://www.instagram.com/yuyasaw", "https://yuyasaw.itch.io/",
            "https://bookmeter.com/users/1454192",
        })
        for url in person["sameAs"]:
            self.assertIn(f'href="{url}"', html)

        home, graph = self.read("")
        site, page = graph["WebSite"], graph["WebPage"]
        self.assertEqual(page["isPartOf"], {"@id": site["@id"]})
        self.assertEqual(site["publisher"]["@id"], person["@id"])
        self.assertEqual(site["inLanguage"], "ja")
        self.assertIn(f'href="{build.local(build.ABOUT_PATH)}"', home)

    def test_every_published_article_uses_real_dates_and_visible_author(self):
        for item in build.WRITING:
            with self.subTest(article=item["slug"]):
                html, graph = self.read("writing/" + item["slug"])
                article = graph["BlogPosting"]
                self.assert_primary_entity(html, graph, article)
                self.assertEqual(article["headline"], item["title"])
                self.assertIn(f'<h1>{build.e(article["headline"])}</h1>', html)
                self.assertEqual(article.get("description"), item.get("summary") or None)
                self.assertEqual(article["inLanguage"], "ja")
                self.assertEqual(article["author"], build.person_reference())
                self.assertIn(f'<a rel="author" href="{build.local(build.ABOUT_PATH)}">{build.e(build.SITE["name"])}</a>', html)
                self.assertEqual(article["datePublished"], item["published"])
                self.assertEqual(article.get("dateModified"), item.get("updated") or None)
                for date in filter(None, (article["datePublished"], article.get("dateModified"))):
                    self.assertIn(f'<time datetime="{date}">{date}</time>', html)
                self.assertIn('<meta property="og:type" content="article">', html)
                if "image" in article:
                    self.assertIn(f'<meta property="og:image" content="{build.e(article["image"])}">', html)
                if item.get("featured_work"):
                    self.assertEqual(article["about"]["creator"], {"@id": build.PERSON_ID})
                    self.assertIn(build.e(article["about"]["name"]), html)

    def test_works_and_parts_share_creator(self):
        types = set()
        for item in build.WORKS:
            with self.subTest(work=item["slug"]):
                html, graph = self.read("works/" + item["slug"])
                work = next(node for kind, node in graph.items() if kind != "WebPage")
                self.assert_primary_entity(html, graph, work)
                self.assertEqual(work["name"], item["title"])
                types.add(work["@type"])
                for node in [work, *work.get("hasPart", [])]:
                    self.assertEqual(node["creator"], {"@id": build.PERSON_ID})
                    self.assertIn(build.e(node["name"]), html)
        self.assertEqual(types, {"CreativeWork", "SoftwareApplication", "VideoObject"})

    def test_listing_and_admin_are_not_articles(self):
        for path in ["writing", "works", "gallery-admin", *["writing/" + s["slug"] for s in build.SERIES]]:
            file = self.out / path / "index.html"
            if file.exists():
                self.assertNotIn('type="application/ld+json"', file.read_text(encoding="utf-8"))

    def test_script_json_preserves_content_without_closing_script_tag(self):
        description = '</script><p>作品 & "写真"</p>'
        encoded = build.json_script_data({"description": description})
        self.assertNotIn("<", encoded)
        self.assertEqual(json.loads(encoded)["description"], description)
