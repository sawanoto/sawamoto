"""Verify generated history, shared memories and uncertain chronology."""
import json
from pathlib import Path
import subprocess
import sys
import unittest
from game_history import load_games

ROOT = Path(__file__).resolve().parents[1]


class GameHistoryTests(unittest.TestCase):
    def test_generated_history(self):
        subprocess.run([sys.executable, 'build.py'], cwd=ROOT, check=True, capture_output=True)
        games = load_games(ROOT / 'content/games.json')
        self.assertEqual(len(games), 26)
        listing = (ROOT / 'dist/games/index.html').read_text()
        home = (ROOT / 'dist/index.html').read_text()
        self.assertIn('href="/sawamoto/games/"', home)
        sitemap = (ROOT / 'dist/sitemap.xml').read_text()
        for game in games:
            detail = ROOT / 'dist/games' / game['id'] / 'index.html'
            self.assertTrue(detail.exists())
            self.assertIn('/games/' + game['id'] + '/', sitemap)
            self.assertEqual(listing.count('href="/sawamoto/games/' + game['id'] + '/"'), max(1, len(game['periods'])))
            for memory in game['memories']:
                self.assertIn(memory, detail.read_text())
        university = listing.split('id="university"')[1].split('id="adult"')[0]
        self.assertNotIn('なめこ', university)
        self.assertIn('時期未確定', listing.split('id="unknown"')[1])
        self.assertIn('発売年：未確認', listing)


if __name__ == '__main__':
    unittest.main()
