"""Exercise the actual build in an isolated copy of the site's inputs."""
import json
from pathlib import Path
import shutil
import subprocess
import sys
import tempfile
import unittest


ROOT = Path(__file__).resolve().parents[1]
SLUG = "while-clouds-change-color"
TITLE = "雲が色を変えるあいだに"


class DraftBuildTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        for folder in ("content", "assets"):
            shutil.copytree(ROOT / folder, self.root / folder)
        for name in ("build.py", "kigo.py", "game_history.py", "life_timeline.py", "google9f55b9147023d4f7.html"):
            shutil.copy(ROOT / name, self.root / name)
        self.article = self.root / "content/writing" / f"{SLUG}.md"
        _, metadata, self.body = self.article.read_text().split("---", 2)
        self.metadata = json.loads(metadata)

    def save(self):
        self.article.write_text("---\n" + json.dumps(self.metadata) + "\n---" + self.body)

    def build(self):
        return subprocess.run([sys.executable, "build.py"], cwd=self.root,
                              capture_output=True, text=True)

    def assert_hidden(self):
        out = self.root / "dist"
        self.assertFalse((out / "writing" / SLUG).exists())
        for file in out.rglob("*"):
            if file.is_file():
                data = file.read_bytes()
                self.assertNotIn(SLUG.encode(), data, str(file))
                self.assertNotIn(TITLE.encode(), data, str(file))
                self.assertNotIn("朝、走りながら空を見上げる。".encode(), data, str(file))
        self.assertFalse(list(out.rglob("*.md")))

    def test_draft_leaves_public_output_unchanged(self):
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_hidden()
        out = self.root / "dist"
        before = {str(p.relative_to(out)): p.read_bytes() for p in out.rglob("*") if p.is_file()}
        self.article.unlink()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        after = {str(p.relative_to(out)): p.read_bytes() for p in out.rglob("*") if p.is_file()}
        self.assertEqual(before, after)

    def test_explicit_publish_then_return_to_draft_removes_stale_page(self):
        # Keep this fixture in the homepage's latest three as real articles grow.
        self.metadata.update(draft=False, published="9999-12-31")
        self.save()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        out = self.root / "dist"
        self.assertTrue((out / "writing" / SLUG / "index.html").exists())
        for path in ("index.html", "writing/index.html", "sitemap.xml"):
            self.assertIn(SLUG, (out / path).read_text())
        self.metadata["draft"] = True
        self.save()
        result = self.build()
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assert_hidden()

    def test_non_boolean_draft_fails_closed(self):
        for value in ("true", "false", "", 0, 1, None):
            with self.subTest(value=value):
                self.metadata["draft"] = value
                self.save()
                result = self.build()
                self.assertNotEqual(result.returncode, 0)
                self.assertIn("draft must be a JSON boolean", result.stderr)

    def test_public_reference_to_draft_fails_build(self):
        work = next((self.root / "content/works").glob("*.md"))
        _, metadata, body = work.read_text().split("---", 2)
        data = json.loads(metadata)
        data["article_ids"] = [SLUG]
        work.write_text("---\n" + json.dumps(data) + "\n---" + body)
        result = self.build()
        self.assertNotEqual(result.returncode, 0)
        self.assertIn(f"Unknown related ID: {SLUG}", result.stderr)


if __name__ == "__main__":
    unittest.main()
