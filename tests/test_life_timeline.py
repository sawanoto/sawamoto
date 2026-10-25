"""Compare every source record and paragraph with the generated unified timeline."""
from collections import Counter
from copy import deepcopy
import html
import csv
from html.parser import HTMLParser
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest

from life_timeline import FILES, load_timeline, render_timeline

ROOT = Path(__file__).resolve().parents[1]


class Page(HTMLParser):
    def __init__(self, text):
        super().__init__()
        self.ids = set()
        self.links = []
        self.records = {}
        self.current = None
        self.feed(text)

    def handle_starttag(self, tag, attrs):
        attrs = dict(attrs)
        if 'id' in attrs:
            if attrs['id'] in self.ids:
                raise AssertionError(f'Duplicate HTML ID: {attrs["id"]}')
            self.ids.add(attrs['id'])
        if tag == 'a' and 'href' in attrs:
            self.links.append(attrs['href'])
        if tag == 'details' and 'life-event' in attrs.get('class', '').split():
            self.current = attrs['id']
            self.records[self.current] = ''

    def handle_data(self, text):
        if self.current:
            self.records[self.current] += text

    def handle_endtag(self, tag):
        if tag == 'details':
            self.current = None


def originals(content):
    for kind, filename in FILES.items():
        data = json.loads((content / filename).read_text())
        items = data if isinstance(data, list) else [item for group in data['groups'] for item in group['entries']]
        for raw in items:
            yield kind, filename, raw


def text_fields(kind, raw):
    if kind == 'anime':
        return [raw['memory'], raw['impression']]
    if kind in {'movie', 'game'}:
        return raw['memories']
    if kind == 'reading':
        return raw.get('reviews', []) + [raw.get('impression', '')]
    return [raw.get('summary', '')]


class LifeTimelineTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run([sys.executable, 'build.py'], cwd=ROOT, check=True, capture_output=True)
        cls.data = json.loads((ROOT / 'dist/timeline/records.json').read_text())
        cls.manifest = json.loads((ROOT / 'dist/timeline/migration.json').read_text())
        cls.page = Page((ROOT / 'dist/timeline/index.html').read_text())
        cls.records = {x['id']: x for x in cls.data['records']}

    def test_all_207_sources_metadata_and_full_text_match(self):
        expected = Counter(kind for kind, _, _ in originals(ROOT / 'content'))
        total = sum(expected.values())
        self.assertEqual(self.data['stats']['bySource'], expected)
        self.assertEqual(len(self.records), total)
        self.assertEqual(len(self.page.records), total)
        self.assertEqual(len(self.manifest['records']), total)
        with (ROOT / 'dist/timeline/migration.csv').open(encoding='utf-8-sig', newline='') as stream:
            rows = list(csv.DictReader(stream))
        self.assertEqual(len(rows), total)
        self.assertEqual({r['統合ID'] for r in rows}, set(self.records))
        manifest = {x['unifiedId']: x for x in self.manifest['records']}
        for kind, filename, raw in originals(ROOT / 'content'):
            id_ = f'{kind}-{raw["id"]}'
            with self.subTest(id=id_):
                record = self.records[id_]
                self.assertEqual(record['metadata'], raw, 'every original field, including nulls and arrays')
                self.assertEqual(record['source']['id'], raw['id'])
                self.assertEqual(record['source']['file'], 'content/' + filename)
                self.assertEqual(manifest[id_]['source'], record['source'])
                for text in text_fields(kind, raw):
                    self.assertIn(text, self.page.records[id_], 'unabridged text in its own disclosure')

    def test_notes_keep_all_shared_prose_and_era_memories(self):
        output = html.unescape((ROOT / 'dist/timeline/index.html').read_text())
        notes = {n['id']: n for n in self.data['notes']}
        suppressed = {'context-movie','context-reading-library','context-reading-featured','anime-era-unknown',
                      'movie-group-school','movie-group-university','movie-group-unknown','movie-group-related'}
        for note in notes.values():
            visible = note['paragraphs']
            if note['id'] in {'context-anime', 'context-game'}:
                visible = visible[:1]
            elif note['id'] in suppressed:
                visible = []
            for paragraph in visible:
                self.assertIn(paragraph, output)
            for paragraph in note['paragraphs']:
                if paragraph not in visible:
                    self.assertNotIn(paragraph, output)
            self.assertIn(note['id'], self.page.ids, 'old note anchors remain usable')
        eras = json.loads((ROOT / 'content/anime-eras.json').read_text())
        for era in eras:
            self.assertEqual(notes['anime-era-' + era['id']]['paragraphs'], [era['memory']])
            self.assertEqual(notes['anime-era-' + era['id']]['metadata'], era)
        copy = json.loads((ROOT / 'content/history-context.json').read_text())
        for key, value in copy.items():
            self.assertEqual(notes['context-' + key]['paragraphs'], value['paragraphs'])
        movies = json.loads((ROOT / 'content/movie-history.json').read_text())
        self.assertEqual(notes['movie-preferences']['paragraphs'], movies['preferences'])
        self.assertEqual(notes['movie-intro']['paragraphs'], [movies['intro']])
        for group in movies['groups']:
            if group['note']:
                self.assertEqual(notes['movie-group-' + group['id']]['paragraphs'], [group['note']])

    def test_presentation_hides_metadata_without_mutating_saved_data(self):
        data = deepcopy(self.data)
        for record in data['records']:
            record['metadata']['tags'] = ['__HIDDEN_TAG__']
            record['metadata']['author'] = '__HIDDEN_AUTHOR__'
            record['metadata']['releaseYear'] = '__HIDDEN_RELEASE_YEAR__'
            record['date']['basis'] = '__HIDDEN_DATE_BASIS__'
            record['sections'].append({'title':'作品情報の注記','paragraphs':['__HIDDEN_RELEASE_NOTE__']})
        before = deepcopy(data)
        output = render_timeline(data, lambda p: '/sawamoto/' + p, lambda v: html.escape(str(v), quote=True), lambda label,url: '', lambda p:p)
        self.assertEqual(data, before)
        for marker in ['__HIDDEN_TAG__','__HIDDEN_AUTHOR__','__HIDDEN_RELEASE_YEAR__','__HIDDEN_DATE_BASIS__','__HIDDEN_RELEASE_NOTE__']:
            self.assertNotIn(marker, output)
        for old_ui in ['life-facts','life-guide','年代の読み方・推定について','明記された視聴年','元の視聴時期','まとまりの時期：','作品それぞれの体験時期は','<h3>当時の思い出</h3>']:
            self.assertNotIn(old_ui, output)
        self.assertNotIn('未確認', self.page.records['anime-doraemon'])
        self.assertNotIn('1979', self.page.records['anime-doraemon'])
        self.assertIn('妻と一緒に遊びました。', self.page.records['game-age-of-calamity'])

    def test_relations_and_all_local_paths_exist(self):
        self.assertIn('reading-book-028', self.records['movie-sakura']['relatedIds'])
        self.assertIn('movie-sakura', self.records['reading-book-028']['relatedIds'])
        self.assertIn('reading-book-034', self.records['movie-three-body-problem']['relatedIds'])
        self.assertEqual(self.records['reading-book-034']['sourceKind'], 'reading')
        for record in self.records.values():
            for id_ in record['relatedIds']:
                self.assertIn(id_, self.records)
                self.assertIn('#' + id_, self.page.links)
        for href in self.page.links:
            if href.startswith('#'):
                self.assertIn(href[1:], self.page.ids)
            elif href.startswith('/sawamoto/'):
                relative, _, fragment = href[len('/sawamoto/'):].partition('#')
                target = ROOT / 'dist' / relative / 'index.html'
                self.assertTrue(target.exists(), href)
                if fragment:
                    self.assertIn(fragment, Page(target.read_text()).ids, href)

    def test_non_overlapping_periods_chronology_and_no_release_year_inference(self):
        known = [p for p in self.data['periods'] if p['startYear'] is not None]
        self.assertEqual(known[0]['startYear'], 1995)
        for left, right in zip(known, known[1:]):
            self.assertEqual(left['endYear'] + 1, right['startYear'])
        starts = [r['date']['startYear'] or 9999 for r in self.data['records']]
        self.assertEqual(starts, sorted(starts))
        for record in self.records.values():
            if record['date']['confidence'] == 'unknown':
                self.assertEqual(record['periodId'], 'unknown')
                self.assertIn(record['id'], self.page.records)
        self.assertEqual(self.records['anime-steins-gate']['date']['confidence'], 'unknown')
        self.assertEqual(self.records['game-pikmin']['date']['confidence'], 'unknown')
        self.assertEqual(self.records['anime-doraemon']['metadata']['releaseYear'], 1979)
        self.assertGreaterEqual(self.records['anime-doraemon']['date']['startYear'], 1995)
        self.assertEqual(self.records['life-first-child-parental-leave']['date']['confidence'], 'unknown')
        self.assertEqual(len(self.records['game-minecraft']['date']['ranges']), 2)
        # Month order is numeric, so October follows July rather than preceding it.
        july = list(self.records).index('life-second-child-birth-2026')
        october = list(self.records).index('life-ofuse-registration-2026')
        self.assertLess(july, october)
        stats = Counter(r['date']['confidence'] for r in self.records.values())
        self.assertEqual(stats, self.data['stats']['byConfidence'])

    def test_legacy_urls_and_nav_are_preserved(self):
        for folder, genre in [('anime','anime'), ('games','game'), ('movie-history','movie'), ('reading','reading')]:
            output = (ROOT / f'dist/{folder}/index.html').read_text()
            self.assertIn('/sawamoto/timeline/?genre=' + genre, output)
            self.assertIn('timeline-redirect-data', output)
            self.assertIn('noindex,follow', output)
        for file in (ROOT / 'dist').rglob('index.html'):
            output = file.read_text()
            if 'timeline-redirect-data' in output and file.parent.name != 'about':
                continue
            for href in Page(output).links:
                self.assertFalse(any(href.startswith('/sawamoto/' + old + '/') for old in ['anime','games','movie-history','reading']), href)
        for folder, field in [('anime','slug'), ('games','id')]:
            for item in json.loads((ROOT / f'content/{folder}.json').read_text()):
                self.assertTrue((ROOT / 'dist' / folder / item[field] / 'index.html').exists())

    def test_data_only_addition_and_new_genre(self):
        with tempfile.TemporaryDirectory() as temp:
            content = Path(temp) / 'content'
            shutil.copytree(ROOT / 'content', content)
            settings_path = content / 'timeline-settings.json'
            settings = json.loads(settings_path.read_text())
            settings['genres']['music'] = '音楽'
            settings_path.write_text(json.dumps(settings))
            items_path = content / 'reading.json'
            items = json.loads(items_path.read_text())
            items.append(dict(items[0], id='future-record', title='<script> & 本', reviews=['全文\n\n二段落目'],
                              timelineGenres=['reading', 'music'], timelineDate={'startYear':2025, 'endYear':2025, 'confidence':'confirmed', 'label':'2025年', 'basis':'本人の記録'}))
            items_path.write_text(json.dumps(items))
            # Existing published work/article lookups are read from the generated links.
            works, articles = self.published_lookups()
            data = load_timeline(content, works, articles, 2026)
            record = next(x for x in data['records'] if x['id'] == 'reading-future-record')
            self.assertEqual(record['date']['confidence'], 'confirmed')
            self.assertEqual(record['genres'], ['reading', 'music'])
            self.assertEqual(record['periodId'], '2025')
            output = render_timeline(data, lambda p: '/' + p, lambda v: html.escape(str(v), quote=True), lambda label,url: '', lambda p:p)
            self.assertIn('&lt;script&gt; &amp; 本', output)
            self.assertNotIn('<script> & 本', output)
            self.assertIn('全文\n\n二段落目', output)
            self.assertIn('data-genre="music"', output)

    def published_lookups(self):
        # Only public content is eligible, matching build.py's draft filtering.
        lookups = []
        for folder in ('works', 'writing'):
            items = {}
            for file in (ROOT / 'content' / folder).glob('*.md'):
                data = json.loads(file.read_text().split('---', 2)[1])
                if not data.get('draft', False):
                    items[data['id']] = dict(data, slug=file.stem)
            lookups.append(items)
        return lookups

    def test_every_record_has_one_display_entry_and_life_events_stay_individual(self):
        entries = {entry['id']: entry for entry in self.data['entries']}
        groups = {group['id']: group for group in self.data['groups']}
        membership = Counter(id_ for entry in entries.values() for id_ in entry['recordIds'])
        self.assertEqual(set(membership), set(self.records))
        self.assertTrue(all(count == 1 for count in membership.values()))
        life = [entry for entry in entries.values() if entry['kind'] == 'life']
        self.assertEqual([entry['id'] for entry in life], [r['id'] for r in self.records.values() if r['sourceKind'] == 'life'])
        expected_life = sum(r['sourceKind'] == 'life' for r in self.records.values())
        self.assertEqual(len(life), expected_life)
        self.assertEqual(len(entries), len(groups) + expected_life)
        self.assertEqual(sum(len(group['recordIds']) for group in groups.values()), len(self.records) - expected_life)
        for record in self.records.values():
            entry = entries[record['entryId']]
            self.assertIn(record['id'], entry['recordIds'])
            self.assertEqual(self.manifest['records'][list(self.records).index(record['id'])]['entryId'], record['entryId'])
            if record['sourceKind'] == 'life':
                self.assertEqual(entry['recordIds'], [record['id']])
                self.assertEqual(entry['id'], record['id'])
                self.assertEqual(entry['title'], record['title'])
                self.assertEqual(entry['date'], record['date'])
                self.assertEqual(entry['periodId'], record['periodId'])
            else:
                self.assertEqual(entry['kind'], 'hobby')
        for entry in entries.values():
            self.assertEqual(set(entry['genres']), {genre for genre in self.data['genres'] if any(genre in self.records[id_]['genres'] for id_ in entry['recordIds'])})
        with (ROOT / 'dist/timeline/groups.csv').open(encoding='utf-8-sig', newline='') as stream:
            rows = list(csv.DictReader(stream))
        self.assertEqual(len(rows), len(groups))

    def test_group_dates_do_not_change_unknown_work_dates(self):
        groups = {group['id']: group for group in self.data['groups']}
        novel = self.records['reading-book-008']
        self.assertEqual(novel['date']['confidence'], 'unknown')
        self.assertEqual(groups[novel['entryId']]['date']['confidence'], 'estimated')
        self.assertEqual(groups['hobby-science-fiction']['periodId'], 'unknown')
        self.assertEqual(groups['hobby-games-with-wife']['date']['startYear'], 2018)
        self.assertEqual(self.records['game-minecraft']['date']['startYear'], 2008)
        self.assertEqual(self.records['game-minecraft']['metadata']['playedPeriod'], '中学生時代から／社会人時代にもプレイ')
        self.assertEqual(self.data['stats']['fallbackRecords'], 26)
        self.assertEqual(self.data['stats']['unassignedRecords'], 0)
        entries = self.data['entries']
        starts = [entry['date']['startYear'] or 9999 for entry in entries]
        self.assertEqual(starts, sorted(starts))

    def test_group_membership_validation_and_extension(self):
        with tempfile.TemporaryDirectory() as temp:
            content = Path(temp) / 'content'
            shutil.copytree(ROOT / 'content', content)
            path = content / 'timeline-groups.json'
            definitions = json.loads(path.read_text())
            original = json.loads(path.read_text())
            definitions['groups'][0]['recordIds'].append('anime-missing')
            path.write_text(json.dumps(definitions))
            with self.assertRaisesRegex(ValueError, 'Unknown work'):
                load_timeline(content, *self.published_lookups(), 2026)
            definitions = json.loads(json.dumps(original))
            definitions['groups'][1]['recordIds'].append('anime-doraemon')
            path.write_text(json.dumps(definitions))
            with self.assertRaisesRegex(ValueError, 'multiple hobby groups'):
                load_timeline(content, *self.published_lookups(), 2026)
            definitions = json.loads(json.dumps(original))
            definitions['groups'][0]['recordIds'].append('life-first-child-birth-2024')
            path.write_text(json.dumps(definitions))
            with self.assertRaisesRegex(ValueError, 'life event in hobby group'):
                load_timeline(content, *self.published_lookups(), 2026)
            definitions = json.loads(json.dumps(original))
            # Explicit new groups take precedence over the fallback regardless of definition order.
            definitions['groups'].append({'id':'after-broadcast','title':'放送後に出会ったアニメ',
                'recordIds':['anime-steins-gate'],'evidenceIds':['anime-steins-gate']})
            path.write_text(json.dumps(definitions))
            extended = load_timeline(content, *self.published_lookups(), 2026)
            record = next(r for r in extended['records'] if r['id'] == 'anime-steins-gate')
            self.assertEqual(record['entryId'], 'hobby-after-broadcast')
            self.assertEqual(record['date']['confidence'], 'unknown')
            self.assertNotIn('hobby-other-anime', {group['id'] for group in extended['groups']})

    def test_invalid_relationship_and_overlap_fail_build_projection(self):
        with tempfile.TemporaryDirectory() as temp:
            content = Path(temp) / 'content'
            shutil.copytree(ROOT / 'content', content)
            path = content / 'reading.json'
            items = json.loads(path.read_text())
            items[0]['related_ids'] = ['missing']
            path.write_text(json.dumps(items))
            with self.assertRaisesRegex(ValueError, 'Unknown unified related ID'):
                load_timeline(content, *self.published_lookups(), 2026)
            items[0]['related_ids'] = []
            path.write_text(json.dumps(items))
            path = content / 'timeline-settings.json'
            settings = json.loads(path.read_text())
            settings['periods'][1]['startYear'] = 2007
            path.write_text(json.dumps(settings))
            with self.assertRaisesRegex(ValueError, 'non-overlapping'):
                load_timeline(content, *self.published_lookups(), 2026)


if __name__ == '__main__':
    unittest.main()
