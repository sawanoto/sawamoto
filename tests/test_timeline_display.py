"""Keep the default timeline view correct even before JavaScript runs."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]


class TimelineDisplayTests(unittest.TestCase):
    def test_life_records_are_unified_and_about_bookmarks_are_mapped(self):
        subprocess.run([sys.executable, "build.py"], cwd=ROOT, check=True, capture_output=True)
        about = (ROOT / 'dist/about/index.html').read_text()
        timeline = (ROOT / 'dist/timeline/index.html').read_text()
        events = json.loads((ROOT / 'content/timeline.json').read_text())
        self.assertNotIn('class="timeline-fold"', about)
        self.assertIn('href="/sawamoto/timeline/"', about)
        for event in events:
            self.assertIn('timeline-' + event['id'], about)
            self.assertIn('timeline/#life-' + event['id'], about)
            self.assertIn('id="life-' + event['id'] + '"', timeline)
        self.assertNotIn('class="life-event" open', timeline)


if __name__ == "__main__":
    unittest.main()
