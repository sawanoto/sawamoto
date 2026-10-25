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
        data = json.loads((ROOT / 'dist/timeline/records.json').read_text())
        records = {r['id']: r for r in data['records']}
        output = (ROOT / 'dist/timeline/index.html').read_text()
        home = (ROOT / 'dist/index.html').read_text()
        self.assertNotIn('href="/sawamoto/games/"', home)
        for game in games:
            detail = ROOT / 'dist/games' / game['id'] / 'index.html'
            self.assertTrue(detail.exists())
            self.assertIn('timeline/?genre=game#game-' + game['id'], detail.read_text())
            self.assertEqual(records['game-' + game['id']]['metadata'], game)
            for memory in game['memories']:
                self.assertIn(memory, output)
        self.assertEqual(records['game-nameko']['periodId'], 'unknown')



if __name__ == '__main__':
    unittest.main()
