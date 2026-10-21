"""Keep the default timeline view correct even before JavaScript runs."""
import json
from pathlib import Path
import subprocess
import sys
import unittest


ROOT = Path(__file__).resolve().parents[1]


class TimelineDisplayTests(unittest.TestCase):
    def test_major_events_are_visible_and_other_events_are_closed(self):
        subprocess.run([sys.executable, "build.py"], cwd=ROOT, check=True, capture_output=True)
        html = (ROOT / "dist/about/index.html").read_text(encoding="utf-8")
        events = json.loads((ROOT / "content/timeline.json").read_text(encoding="utf-8"))
        major_html, folded_html = html.split('<details class="timeline-fold"', 1)

        self.assertNotIn("timeline-controls", html)
        self.assertEqual(major_html.count('class="timeline-item timeline-major"'),
                         sum(item["importance"] == "major" for item in events))
        self.assertNotIn('class="timeline-item timeline-medium"', major_html)
        self.assertNotIn('class="timeline-item timeline-minor"', major_html)
        self.assertIn('data-importance="medium"><summary>', folded_html)
        self.assertIn('data-importance="minor"><summary>', folded_html)
        self.assertNotIn('<details class="timeline-fold" open', html)


if __name__ == "__main__":
    unittest.main()
