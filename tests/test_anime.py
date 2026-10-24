"""Build real pages and verify data additions, unknown dates and invalid links."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

ROOT = Path(__file__).resolve().parents[1]


class AnimeBuildTests(unittest.TestCase):
    def setUp(self):
        temp = tempfile.TemporaryDirectory()
        self.addCleanup(temp.cleanup)
        self.root = Path(temp.name)
        for folder in ('content', 'assets'):
            shutil.copytree(ROOT / folder, self.root / folder)
        for name in ('build.py', 'kigo.py', 'google9f55b9147023d4f7.html'):
            shutil.copy(ROOT / name, self.root / name)
        self.data = self.root / 'content/anime.json'
        self.items = json.loads(self.data.read_text())

    def build(self):
        return subprocess.run([sys.executable, 'build.py'], cwd=self.root, capture_output=True, text=True)

    def save(self):
        self.data.write_text(json.dumps(self.items))

    def test_all_initial_pages_and_unknown_dates(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(len(self.items), 29)
        out = self.root / 'dist'
        top = (out / 'anime/index.html').read_text()
        for item in self.items:
            self.assertIn(item['title'].replace('&', '&amp;'), top)
            detail = (out / 'anime' / item['slug'] / 'index.html').read_text()
            self.assertIn('実際の視聴年</dt><dd>不明', detail)
            self.assertIn('/sawamoto/anime/#era-', detail)
            self.assertIn(f'/sawamoto/anime/{item["slug"]}/', (out / 'sitemap.xml').read_text())
        self.assertIn('今後追記予定', (out / 'anime/pokemon/index.html').read_text())
        self.assertIn('人形劇（アニメではありません）', top)
        unknown = top.split('id="era-unknown"', 1)[1]
        self.assertIn('STEINS;GATE', unknown)
        self.assertNotIn('STEINS;GATE', top.split('id="era-unknown"', 1)[0])

    def test_data_only_addition_and_safe_text(self):
        item = dict(self.items[0], id='new-work', slug='new-work', title='<新作 & 思い出>', releaseYear=None,
                    memory='', impression='', relatedWorks=['haruhi'])
        self.items.append(item)
        self.save()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        page = (self.root / 'dist/anime/new-work/index.html').read_text()
        self.assertIn('&lt;新作 &amp; 思い出&gt;', page)
        self.assertIn('今後追記予定', page)
        self.assertIn('/sawamoto/anime/haruhi/', page)
        self.assertIn('new-work/', (self.root / 'dist/anime/index.html').read_text())

    def test_invalid_references_and_slugs_fail(self):
        for key, value in [('relatedWorks', ['missing-id']), ('slug', '../escape'), ('slug', '日本語'), ('watchedYear', '2000')]:
            with self.subTest(key=key, value=value):
                original = self.items[0][key]
                self.items[0][key] = value
                self.save()
                self.assertNotEqual(self.build().returncode, 0)
                self.items[0][key] = original
