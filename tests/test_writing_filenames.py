import json
from pathlib import Path
import tempfile
import unittest

from scripts.check_writing import ROOT, validate_writing


class WritingFilenameTests(unittest.TestCase):
    def test_repository_articles_and_drafts_follow_rules(self):
        series = json.loads((ROOT / "content/series.json").read_text(encoding="utf-8"))
        self.assertEqual(validate_writing(ROOT / "content/writing",
                                         (item["slug"] for item in series)), [])

    def validate_fixture(self, filename, metadata, series=()):
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            (folder / filename).write_text("---\n" + json.dumps(metadata) + "\n---\n本文\n",
                                           encoding="utf-8")
            return validate_writing(folder, series)

    def test_publication_date_is_independent_of_event_date_and_url(self):
        self.assertEqual(self.validate_fixture("2026-11-01-visit.md", {
            "slug": "visit-20261031", "published": "2026-11-01",
            "visit_date": "2026-10-31", "updated": "2026-11-02",
        }), [])

    def test_unpublished_draft_uses_written_and_returned_draft_keeps_published(self):
        self.assertEqual(self.validate_fixture("2026-10-31-essay.md", {
            "slug": "essay", "draft": True, "written": "2026-10-31",
        }), [])
        self.assertEqual(self.validate_fixture("2026-11-01-essay.md", {
            "slug": "essay", "draft": True, "written": "2026-10-31",
            "published": "2026-11-01",
        }), [])

    def test_rejects_wrong_names_dates_and_missing_url_slug(self):
        valid = {"slug": "essay", "published": "2026-11-01"}
        cases = [
            ("essay.md", valid),
            ("2026-10-31-essay.md", valid),
            ("2026-11-01-Upper_case.md", valid),
            ("2026-11-01-essay.md", {"published": "2026-11-01"}),
            ("2026-11-01-essay.md", dict(valid, slug="../escape")),
            ("2026-11-01-essay.md", {"slug": "essay", "written": "2026-11-01"}),
            ("2026-02-30-essay.md", dict(valid, published="2026-02-30")),
            ("2026-11-01-essay.md", dict(valid, published="20261101")),
            ("2026-11-01-essay.md", dict(valid, draft="false")),
            ("2026-11-01-essay.md", {"slug": "essay", "draft": True}),
            ("2026-11-01-essay.md", {"slug": "essay", "draft": True,
                                         "written": "2026-10-31"}),
        ]
        for name, metadata in cases:
            with self.subTest(name=name, metadata=metadata):
                self.assertTrue(self.validate_fixture(name, metadata))

    def test_drafts_cannot_duplicate_article_or_series_slug(self):
        metadata = {"slug": "essay", "draft": True, "written": "2026-11-01"}
        self.assertTrue(self.validate_fixture("2026-11-01-essay.md", metadata, ["essay"]))
        with tempfile.TemporaryDirectory() as temp:
            folder = Path(temp)
            for name in ("essay", "another"):
                (folder / f"2026-11-01-{name}.md").write_text(
                    "---\n" + json.dumps(metadata) + "\n---\n本文\n", encoding="utf-8")
            self.assertTrue(validate_writing(folder))


if __name__ == "__main__":
    unittest.main()
