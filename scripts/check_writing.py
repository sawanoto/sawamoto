"""Validate writing source names and explicit URL slugs, including drafts."""
from datetime import date
import json
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[1]
SLUG = r"[a-z0-9]+(?:-[a-z0-9]+)*"


def validate_writing(folder: Path, series_slugs=()) -> list[str]:
    errors = []
    seen = set(series_slugs)
    for file in sorted(folder.glob("*.md")):
        try:
            raw = file.read_text(encoding="utf-8")
            match = re.fullmatch(r"---\s*\n(.*?)\n---\s*\n(.*)", raw, re.S)
            if not match:
                raise ValueError("Missing JSON front matter")
            item = json.loads(match[1])
            if not isinstance(item, dict):
                raise ValueError("Front matter must be a JSON object")
            if "draft" in item and type(item["draft"]) is not bool:
                raise ValueError("draft must be a JSON boolean")
            slug = item.get("slug")
            if not isinstance(slug, str) or not re.fullmatch(SLUG, slug):
                raise ValueError("Explicit ASCII slug is required")
            if slug in seen:
                raise ValueError(f"Duplicate article/series slug: {slug}")
            seen.add(slug)
            key = "written" if item.get("draft", False) and "published" not in item else "published"
            value = item.get(key)
            if not isinstance(value, str) or not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
                raise ValueError(f"{key} must be YYYY-MM-DD")
            date.fromisoformat(value)
            name = re.fullmatch(rf"(\d{{4}}-\d{{2}}-\d{{2}})-({SLUG})\.md", file.name)
            if not name or name[1] != value:
                raise ValueError(f"Filename must be {value}-descriptive-name.md ({key})")
        except (ValueError, UnicodeError) as exc:
            errors.append(f"{file.name}: {exc}")
    return errors


def main():
    series = json.loads((ROOT / "content/series.json").read_text(encoding="utf-8"))
    errors = validate_writing(ROOT / "content/writing", (item["slug"] for item in series))
    if errors:
        raise SystemExit("\n".join(errors))
    print("Writing filenames and slugs are valid (including drafts).")


if __name__ == "__main__":
    main()
