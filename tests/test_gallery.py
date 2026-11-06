import json
import tempfile
import unittest
from pathlib import Path
from gallery import load_entries, render_galleries


class GalleryTests(unittest.TestCase):
    def test_data_only_entry_pagination_and_escaping(self):
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder)
            content = root / 'content'
            (content / 'galleries').mkdir(parents=True)
            (root / 'assets/images/galleries').mkdir(parents=True)
            photo = 'assets/images/galleries/12345678-1234-4234-8234-123456789abc.jpg'
            (root / photo).write_bytes(b'fixture')
            for n in range(25):
                id_ = f'12345678-1234-4234-8234-{n:012x}'
                item = {'id': id_, 'kind': 'children', 'date': '2026-11-03', 'photos': [photo], 'title': '<script>', 'article_url': 'https://example.com/article'}
                (content / 'galleries' / f'{id_}.json').write_text(json.dumps(item))
            self.assertEqual(len(load_entries(content)), 25)
            import html
            pages = {}
            render_galleries(content, lambda path, text: pages.update({path: text}), lambda title, desc, path, body: body, lambda path: '/sawamoto/' + path, html.escape, lambda label, url: f'<a href="{html.escape(url)}">{label}</a>')
            self.assertIn('gallery/children/page/2', pages)
            self.assertEqual(pages['gallery/children'].count('class="gallery-card"'), 25)
            self.assertIn('&lt;script&gt;', pages['gallery/children'])
            self.assertIn('https://example.com/article', pages['gallery/children'])
            self.assertEqual(pages['gallery/handwork'].count('data-physical-kind="children"'), 25)
            for n in range(25):
                id_ = f'22345678-1234-4234-8234-{n:012x}'
                item = {'id': id_, 'kind': 'life', 'date': '2026-11-04', 'photos': [photo]}
                (content / 'galleries' / f'{id_}.json').write_text(json.dumps(item))
            pages = {}
            render_galleries(content, lambda path, text: pages.update({path: text}), lambda title, desc, path, body: body, lambda path: '/sawamoto/' + path, html.escape, lambda label, url: '')
            self.assertEqual(pages['gallery/life'].split('<section id="life-gallery"')[1].count('class="gallery-card"'), 24)
            self.assertEqual(pages['gallery/life/page/2'].split('<section id="life-gallery"')[1].count('class="gallery-card"'), 1)
            self.assertIn('撮影日', pages['gallery/life'])
            physical, life = pages['gallery/children'].split('<section id="life-gallery"')
            self.assertNotIn('work-22345678', physical)
            self.assertIn('work-22345678', life)
            self.assertNotIn('work-12345678', life)
            self.assertIn('/sawamoto/' + photo, life)
            (root / photo).unlink()
            with self.assertRaises(ValueError):
                load_entries(content)

    def test_mixed_physical_order_and_legacy_pages(self):
        import html
        from html.parser import HTMLParser
        class Cards(HTMLParser):
            def __init__(self):
                super().__init__(); self.ids = []
            def handle_starttag(self, tag, attrs):
                attrs = dict(attrs)
                if 'data-physical-kind' in attrs:
                    self.ids.append((attrs['id'], attrs['data-physical-kind']))
        with tempfile.TemporaryDirectory() as folder:
            root = Path(folder); content = root / 'content'
            (content / 'galleries').mkdir(parents=True)
            photo = 'assets/images/galleries/12345678-1234-4234-8234-123456789abc.jpg'
            (root / photo).parent.mkdir(parents=True); (root / photo).write_bytes(b'fixture')
            for n in range(30):
                id_ = f'12345678-1234-4234-8234-{n:012x}'
                item = {'id': id_, 'kind': 'children' if n % 2 else 'handwork', 'date': f'2026-11-{n+1:02d}', 'photos': [photo]}
                (content / 'galleries' / f'{id_}.json').write_text(json.dumps(item))
            pages = {}
            render_galleries(content, lambda path, text: pages.update({path: text}), lambda t, d, p, b: b, lambda p: '/' + p, html.escape, lambda l, u: '')
            for route in ['gallery/children', 'gallery/handwork', 'gallery/life']:
                parser = Cards(); parser.feed(pages[route])
                self.assertEqual(len(parser.ids), 30)
                self.assertEqual([id_ for id_, kind in parser.ids], [f'work-12345678-1234-4234-8234-{n:012x}' for n in reversed(range(30))])
                self.assertEqual({kind for id_, kind in parser.ids}, {'children', 'handwork'})
                self.assertIn('大人の作品', pages[route])
