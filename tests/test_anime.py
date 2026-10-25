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
        for name in ('build.py', 'kigo.py', 'game_history.py', 'life_timeline.py', 'google9f55b9147023d4f7.html'):
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
        out = self.root / 'dist'
        data = json.loads((out / 'timeline/records.json').read_text())
        records = {x['id']: x for x in data['records']}
        self.assertEqual(sum(r['sourceKind'] == 'anime' for r in records.values()), 29)
        for item in self.items:
            detail = (out / 'anime' / item['slug'] / 'index.html').read_text()
            self.assertIn('timeline/?genre=anime#anime-' + item['id'], detail)
            self.assertEqual(records['anime-' + item['id']]['metadata'], item)
            self.assertNotIn('/anime/' + item['slug'] + '/', (out / 'sitemap.xml').read_text())
        self.assertEqual(records['anime-steins-gate']['date']['confidence'], 'unknown')

    def test_data_only_addition_and_safe_text(self):
        item = dict(self.items[0], id='new-work', slug='new-work', title='<新作 & 思い出>', releaseYear=None,
                    memory='', impression='', relatedWorks=['haruhi'])
        self.items.append(item)
        self.save()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        output = (self.root / 'dist/timeline/index.html').read_text()
        self.assertIn('&lt;新作 &amp; 思い出&gt;', output)
        self.assertIn('href="#anime-haruhi"', output)
        self.assertIn('timeline/?genre=anime#anime-new-work', (self.root / 'dist/anime/new-work/index.html').read_text())

    def test_invalid_references_and_slugs_fail(self):
        for key, value in [('relatedWorks', ['missing-id']), ('slug', '../escape'), ('slug', '日本語'), ('watchedYear', '2000')]:
            with self.subTest(key=key, value=value):
                original = self.items[0][key]
                self.items[0][key] = value
                self.save()
                self.assertNotEqual(self.build().returncode, 0)
                self.items[0][key] = original
