"""One build-time projection of the original records; no second hand-edited catalog."""
from __future__ import annotations

from collections import Counter
from copy import deepcopy
from datetime import datetime, timezone
import csv
import html
import json
import re

CONFIDENCE = {"confirmed": "確定", "estimated": "推定", "unknown": "不明"}
STAGES = {"幼少期": "childhood", "小学生": "elementary", "中学生": "middle", "高校生": "high", "大学生": "university", "社会人": "adult"}
FILES = {"anime": "anime.json", "movie": "movie-history.json", "reading": "reading.json", "game": "games.json", "life": "timeline.json"}


def read_json(content, name):
    return json.loads((content / name).read_text(encoding="utf-8"))


def paragraphs(values, e=html.escape):
    return "".join(f'<p class="life-paragraph">{e(value)}</p>' for value in values if value)


def unknown_date(label="時期未整理"):
    return {"startYear": None, "endYear": None, "confidence": "unknown", "label": label or "時期未整理", "basis": "体験年を判断できる根拠がありません。", "ranges": []}


def stage_date(stages, settings, current_year, label):
    ranges = []
    for stage in dict.fromkeys(stages):
        if stage not in settings["stageRanges"]:
            continue
        span = dict(settings["stageRanges"][stage])
        span["endYear"] = span["endYear"] or current_year
        ranges.append(span)
    if not ranges:
        return unknown_date(label)
    start, end = min(r["startYear"] for r in ranges), max(r["endYear"] for r in ranges)
    return {"startYear": start, "endYear": end, "confidence": "estimated", "label": f"{start}–{end}年頃", "basis": settings["stageBasis"], "ranges": ranges}


def explicit_date(label):
    """Read a stated EXPERIENCE date, never a title, releaseYear or release field."""
    match = re.match(r"^(\d{4})(?:[〜～–−-](\d{4}))?(?:年|(?:-\d{2})?$)", label)
    if not match:
        return None
    start = int(match[1])
    end = int(match[2] or match[1])
    estimated = end != start or any(word in label for word in ("頃", "ごろ", "以降", "推定", "未確認"))
    month = re.match(r"^\d{4}(?:年|-)(\d{1,2})(?:月|[〜～–-]\d{1,2}月|$)", label)
    return {"startYear": start, "endYear": end, "month": int(month[1]) if month else None, "confidence": "estimated" if estimated else "confirmed", "label": label, "basis": "元記録に明記された体験時期。", "ranges": [{"startYear": start, "endYear": end}]}


def record_date(kind, raw, settings, current_year):
    if "timelineDate" in raw:
        value = deepcopy(raw["timelineDate"])
        if value.get("confidence") not in CONFIDENCE:
            raise ValueError("Invalid timelineDate confidence")
        if value["confidence"] == "unknown":
            return unknown_date(value.get("label"))
        start, end = value.get("startYear"), value.get("endYear")
        if type(start) is not int or type(end) is not int or start > end or not value.get("basis"):
            raise ValueError("timelineDate needs ordered years and an evidence basis")
        value.setdefault("label", f"{start}–{end}年頃")
        value.setdefault("ranges", [{"startYear": start, "endYear": end}])
        return value
    if kind == "life":
        return explicit_date(raw.get("date") or raw.get("period", "")) or unknown_date(raw.get("period"))
    if kind == "anime":
        if raw.get("watchedYear") is not None:
            date = explicit_date(str(raw["watchedYear"]))
            if raw.get("watchedYearConfidence") == "推定":
                date["confidence"] = "estimated"
            elif raw.get("watchedYearConfidence") == "不明":
                return unknown_date(raw.get("watchedPeriod"))
            return date
        # A period crossing school stages must keep the whole range.
        stages = [value for key, value in STAGES.items() if key in raw.get("watchedPeriod", "")]
        if raw.get("era") == "childhood":
            stages = ["childhood"]
        return stage_date(stages, settings, current_year, raw.get("watchedPeriod"))
    if kind == "game":
        # Ownership is not evidence of when (or whether) the game was played.
        if raw.get("status") == "所有のみ":
            return unknown_date(raw.get("playedPeriod"))
        stages = [{"junior": "middle"}.get(p, p) for p in raw.get("periods", [])]
        return stage_date(stages, settings, current_year, raw.get("playedPeriod"))
    label = raw.get("period", "") if kind == "reading" else raw.get("viewed", "")
    stated = explicit_date(label)
    if stated:
        return stated
    stages = [value for key, value in STAGES.items() if key in label]
    date = stage_date(stages, settings, current_year, label)
    if date["startYear"] is not None and "から" in label:
        date["endYear"] = current_year
        date["ranges"] = [{"startYear": date["startYear"], "endYear": current_year}]
        date["label"] = f'{date["startYear"]}年以降（推定）'
    return date


def load_timeline(content, works, articles, current_year=None):
    current_year = current_year or datetime.now(timezone.utc).year
    settings = read_json(content, "timeline-settings.json")
    copies = read_json(content, "history-context.json")
    genres = settings["genres"]
    if not genres or any(not re.fullmatch(r"[a-z][a-z0-9-]*", key) for key in genres):
        raise ValueError("Invalid timeline genre keys")
    for evidence in settings["stageEvidence"]:
        path = content.parent / evidence["path"]
        if evidence["text"] not in path.read_text(encoding="utf-8"):
            raise ValueError(f"Timeline stage evidence changed: {evidence['path']}")
        if evidence.get("id"):
            anchor = next(x for x in read_json(content, path.name) if x["id"] == evidence["id"])
            if anchor.get("period") != evidence["text"]:
                raise ValueError("Timeline stage evidence date changed")
    periods = deepcopy(settings["periods"])
    for year in range(settings["annualFrom"], current_year + 1):
        periods.append({"id": str(year), "startYear": year, "endYear": year, "label": f"{year}年"})
    if len({p["id"] for p in periods}) != len(periods) or any(not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", p["id"]) for p in periods):
        raise ValueError("Invalid or duplicate timeline period ID")
    expected_start = settings["startYear"]
    for period in periods:
        if period["startYear"] != expected_start or period["endYear"] < period["startYear"]:
            raise ValueError("Timeline periods must cover continuous, non-overlapping years")
        expected_start = period["endYear"] + 1

    def place(date):
        if date["confidence"] == "unknown":
            return "unknown"
        start, end = date["startYear"], date["endYear"]
        if type(start) is not int or type(end) is not int or start > end:
            raise ValueError("Invalid timeline date interval")
        for span in date.get("ranges", []):
            if not start <= span["startYear"] <= span["endYear"] <= end:
                raise ValueError("Invalid timeline subrange")
        # A broad/multiple-period memory appears once, at the start of its range.
        for period in periods:
            if period["startYear"] <= start <= period["endYear"]:
                return period["id"]
        raise ValueError(f"Experience year outside timeline: {start}")

    records, notes = [], []
    movie = read_json(content, FILES["movie"])
    sources = {kind: read_json(content, filename) for kind, filename in FILES.items() if kind != "movie"}
    sources["movie"] = [item for group in movie["groups"] for item in group["entries"]]
    movie_group = {item["id"]: group for group in movie["groups"] for item in group["entries"]}
    eras = read_json(content, "anime-eras.json")
    for kind, items in sources.items():
        for raw in items:
            id_ = f'{kind}-{raw["id"]}'
            if not re.fullmatch(r"[a-z0-9]+(?:-[a-z0-9]+)*", id_):
                raise ValueError(f"Invalid timeline ID: {id_}")
            item_genres = raw.get("timelineGenres", [kind])
            if kind == "movie" and "アニメ" in raw.get("kind", "") and "timelineGenres" not in raw:
                item_genres = ["movie", "anime"]
            if kind == "life" and raw["id"] == "library-wide-reading-2024" and "timelineGenres" not in raw:
                item_genres = ["life", "reading"]
            if not item_genres or len(set(item_genres)) != len(item_genres) or not set(item_genres) <= genres.keys():
                raise ValueError(f"Invalid timeline genres: {id_}")
            date = record_date(kind, raw, settings, current_year)
            record = {"id": id_, "source": {"file": f"content/{FILES[kind]}", "id": raw["id"]}, "sourceKind": kind,
                      "title": raw["title"], "genres": item_genres, "date": date, "periodId": place(date),
                      "metadata": deepcopy(raw), "sections": [], "relatedIds": [], "links": [], "legacyPaths": []}
            if kind == "anime":
                record["sections"] = [{"title": "当時の思い出", "paragraphs": [raw["memory"]]}, {"title": "作品に対する感想", "paragraphs": [raw["impression"]]}, {"title": "作品情報の注記", "paragraphs": [raw.get("releaseNote", "")]}]
                record["relatedIds"] = [f"anime-{id_}" for id_ in raw["relatedWorks"]]
                record["legacyPaths"] = [f'anime/{raw["slug"]}/']
            elif kind == "game":
                record["sections"] = [{"title": "思い出", "paragraphs": raw["memories"]}]
                record["legacyPaths"] = [f'games/{raw["id"]}/']
            elif kind == "reading":
                record["sections"] = [{"title": "感想", "paragraphs": raw.get("reviews", [])}, {"title": "印象", "paragraphs": [raw.get("impression", "")]}]
                record["relatedIds"] = [f"reading-{id_}" for id_ in raw.get("related_ids", [])]
                record["legacyPaths"] = [f'reading/#reading-{raw["id"]}']
            elif kind == "movie":
                group = movie_group[raw["id"]]
                record["source"]["groupId"] = group["id"]
                record["sections"] = [{"title": "思い出・感想", "paragraphs": raw["memories"]}]
                record["legacyPaths"] = [f'movie-history/#{raw["id"]}']
                if raw.get("related_reading_id"):
                    alias = raw["related_reading_id"]
                    mapped = settings["movieReadingAliases"].get(alias)
                    if mapped is None:
                        raise ValueError(f"Unknown movie/reading alias: {alias}")
                    record["relatedIds"] = [f"reading-{mapped}"]
            else:
                record["sections"] = [{"title": "記録", "paragraphs": [raw.get("summary", "")]}]
                for key, collection, section in (("work_ids", works, "works"), ("article_ids", articles, "writing")):
                    for linked_id in raw.get(key, []):
                        if linked_id not in collection:
                            raise ValueError(f"Unknown related ID: {linked_id}")
                        linked = collection[linked_id]
                        record["links"].append({"label": linked["title"], "path": f'{section}/{linked["slug"]}/'})
                record["legacyPaths"] = [f'about/#timeline-{raw["id"]}']
            record["links"].extend({"label": x["label"], "url": x["url"]} for x in raw.get("links", []))
            records.append(record)
    by_id = {record["id"]: record for record in records}
    if len(by_id) != len(records):
        raise ValueError("Duplicate unified timeline ID")
    for record in records:
        for related_id in list(record["relatedIds"]):
            if related_id not in by_id:
                raise ValueError(f"Unknown unified related ID: {related_id}")
            if record["sourceKind"] == "movie" and record["id"] not in by_id[related_id]["relatedIds"]:
                by_id[related_id]["relatedIds"].append(record["id"])

    def note(id_, genre, title, texts, source, date=None, metadata=None):
        date = date or unknown_date()
        notes.append({"id": id_, "genres": [genre], "title": title, "paragraphs": texts,
                      "source": source, "metadata": deepcopy(metadata or {}), "date": date, "periodId": place(date) if date["confidence"] != "unknown" else None})
    for key, copy in copies.items():
        genre = key.split("-")[0]
        note(f"context-{key}", genre, copy["title"], copy["paragraphs"], {"file": "content/history-context.json", "id": key}, metadata=copy)
    for era in eras:
        date = stage_date([era["id"]], settings, current_year, era["label"])
        note(f'anime-era-{era["id"]}', "anime", era["heading"], [era["memory"]], {"file": "content/anime-eras.json", "id": era["id"]}, date, metadata=era)
    # Unknown-era prose stays in the supplementary notes, never disappears.
    note("movie-intro", "movie", movie["title"], [movie["intro"]], {"file": "content/movie-history.json", "id": "intro"})
    note("movie-preferences", "movie", "映画の好みについて", movie["preferences"], {"file": "content/movie-history.json", "id": "preferences"})
    for group in movie["groups"]:
        if group["note"]:
            note(f'movie-group-{group["id"]}', "movie", group["title"] + "：記録の注記", [group["note"]], {"file": "content/movie-history.json", "id": group["id"]})

    records.sort(key=lambda x: (x["date"]["startYear"] or 9999, x["date"].get("month") or 0, x["date"]["confidence"] != "confirmed", x["metadata"].get("order", 0), x["id"]))
    periods.append({"id": "unknown", "startYear": None, "endYear": None, "label": "時期未整理"})
    return {"schemaVersion": 1, "genres": genres, "periods": periods, "records": records, "notes": notes,
            "stats": {"total": len(records), "bySource": dict(Counter(x["sourceKind"] for x in records)),
                      "byConfidence": dict(Counter(x["date"]["confidence"] for x in records)),
                      "byGenre": {g: sum(g in x["genres"] for x in records) for g in genres}}}


META_LABELS = {
    "releaseYear": "公開・発売年（体験年とは別）", "watchedPeriod": "元の視聴時期", "watchedYearConfidence": "元記録の視聴時期の確度", "watchedYear": "明記された視聴年",
    "mediaType": "媒体", "tags": "タグ", "updatedAt": "更新日", "platform": "ゲーム機", "playedPeriod": "元のプレイ時期", "periodIsEstimated": "元記録の推定表示",
    "companions": "一緒に遊んだ相手", "status": "状況", "author": "著者", "period": "元の時期", "period_note": "時期の補足", "genres": "読書ジャンル", "medium": "媒体",
    "featured": "特に印象に残った本", "kind": "種別", "release": "公開・制作・上演年（体験年とは別）", "viewed": "元の鑑賞時期", "method": "鑑賞方法", "original": "原作との関係", "importance": "元の重要度"
}


def render_timeline(data, local, e, external, image_url):
    by_id = {record["id"]: record for record in data["records"]}

    def notes_html(notes):
        return "".join(f'<details class="life-note" data-life-note data-genres="{e(" ".join(note["genres"]))}" id="{e(note["id"])}"><summary>{e(note["title"])}</summary><div class="life-detail">{paragraphs(note["paragraphs"], e)}</div></details>' for note in notes)

    def record_html(record):
        date = record["date"]
        fields = []
        for key, label in META_LABELS.items():
            if key not in record["metadata"]:
                continue
            value = record["metadata"][key]
            if isinstance(value, list):
                value = " / ".join(value)
            if isinstance(value, bool):
                value = "はい" if value else "いいえ"
            if value is None or value == "":
                value = "未確認"
            fields.append(f'<div><dt>{e(label)}</dt><dd>{e(value)}</dd></div>')
        sections = "".join(f'<section><h3>{e(section["title"])}</h3>{paragraphs(section["paragraphs"], e)}</section>' for section in record["sections"] if any(section["paragraphs"]))
        links = "".join(f'<li><a href="{local(link["path"])}">{e(link["label"])}</a></li>' if "path" in link else f'<li>{external(link["label"], link["url"])}</li>' for link in record["links"])
        related = "".join(f'<li><a href="#{e(id_)}" data-life-related>{e(by_id[id_]["title"])}</a></li>' for id_ in record["relatedIds"])
        related = f'<aside><h3>関連する記録</h3><ul class="link-list">{related}</ul></aside>' if related else ""
        image = record["metadata"].get("image")
        image = f'<img class="life-image" src="{image_url(image)}" alt="{e(record["title"])}" loading="lazy">' if image else ""
        badges = " / ".join(data["genres"][g] for g in record["genres"])
        when = f'<span class="life-when">{e(date["label"])}</span>' if date["confidence"] != "unknown" else ""
        date_label = ("時期未整理" if date["confidence"] == "unknown" else date["label"]) + f' · {CONFIDENCE[date["confidence"]]}'
        ranges = "、".join(f'{r["startYear"]}–{r["endYear"]}年頃' for r in date["ranges"])
        basis = f'<p class="meta">{e(date["basis"])}</p>' if date["confidence"] == "estimated" else ""
        span_note = f'<p class="meta">記録された体験の範囲：{e(ranges)}</p>' if len(date["ranges"]) > 1 else ""
        return f'''<li data-life-record data-genres="{e(" ".join(record["genres"]))}" data-record-id="{e(record["id"])}"><details id="{e(record["id"])}" class="life-event"><summary><span class="life-title">{e(record["title"])}</span>{when}<span class="life-genre">{e(badges)}</span></summary><div class="life-detail"><p class="meta">{e(date_label)}</p>{basis}{span_note}{image}{sections}<dl class="life-facts">{"".join(fields)}</dl>{related}<ul class="link-list">{links}</ul></div></details></li>'''

    groups = []
    for period in data["periods"]:
        records = [x for x in data["records"] if x["periodId"] == period["id"]]
        notes = [x for x in data["notes"] if x["periodId"] == period["id"]]
        # Retain the initial 1995 endpoint without inventing a birth/event.
        if not records and not notes and period != data["periods"][0]:
            continue
        bounds = '' if period["startYear"] is None else f' data-start-year="{period["startYear"]}" data-end-year="{period["endYear"]}"'
        groups.append(f'<section class="life-year" data-year="{e(period["id"])}"{bounds}><h2 id="year-{e(period["id"])}">{e(period["label"])}</h2>{notes_html(notes)}<ol>{"".join(record_html(x) for x in records)}</ol></section>')
    buttons = '<button type="button" data-genre="all" aria-pressed="true" aria-controls="life-years">すべて</button>'
    buttons += "".join(f'<button type="button" data-genre="{e(key)}" aria-pressed="false" aria-controls="life-years">{e(label)}</button>' for key, label in data["genres"].items())
    notes = notes_html([x for x in data["notes"] if x["periodId"] is None])
    jumps = "".join(f'<li><a href="#year-{e(p["id"])}" data-year-jump="{e(p["id"])}">{e(p["label"])}</a></li>' for p in data["periods"] if any(x["periodId"] == p["id"] for x in data["records"]))
    return f'''<div class="page-heading"><p class="kicker">Life timeline / 1995 —</p><h1>人生年表</h1><p>観たもの、読んだもの、遊んだもの。生活の出来事と一緒に、これまでを振り返ります。</p></div>
    <div class="life-timeline"><div class="life-filters" role="group" aria-label="年表のジャンル" hidden>{buttons}</div><p class="life-status" role="status" aria-live="polite" data-timeline-status>すべて：{data["stats"]["total"]}件</p>
    <p class="timeline-lead">タイトルをタップすると、感想や思い出が開きます。年代は体験の時期をもとにした目安です。幅のある記録は、その範囲の始まりに一度だけ表示しています。</p>
    <details class="life-guide"><summary>年代の読み方・推定について</summary><div class="life-detail"><p>確定：体験年が明記されている記録。推定：既存の生活記録から幅を持たせて配置した記録。不明：判断できず「時期未整理」に残した記録。</p><p>学校時代の年代は、2013年度の高校3年生、2014年の大学1年生、2018年の就職を根拠に、通常の修業年限から推定しています。公開年・発売年を体験年として使っていません。詳細には元の時期表記と推定の根拠を残しています。</p></div></details>
    <nav class="life-jumps" aria-label="年表の年代"><ul>{jumps}</ul></nav><noscript><p>すべての記録を表示しています。JavaScriptが無効でも詳細を開けます。ジャンルの切り替えにはJavaScriptが必要です。</p></noscript>
    <div class="life-years" id="life-years">{"".join(groups)}</div><p class="empty" data-timeline-empty hidden>このジャンルの記録はまだありません。</p>
    <section class="life-context" aria-labelledby="life-context-heading"><h2 id="life-context-heading">記録の背景</h2>{notes}</section></div>'''


def migration_manifest(data):
    return {"schemaVersion": 1, "stats": data["stats"], "records": [{"source": x["source"], "unifiedId": x["id"], "genres": x["genres"], "date": x["date"], "periodId": x["periodId"], "relatedIds": x["relatedIds"], "links": x["links"], "legacyPaths": x["legacyPaths"]} for x in data["records"]],
            "notes": [{"source": x["source"], "unifiedId": x["id"], "periodId": x["periodId"]} for x in data["notes"]]}


def write_migration_artifacts(folder, data):
    """Rebuilt alongside the HTML; never edited independently from the sources."""
    for filename, value in (("records.json", data), ("migration.json", migration_manifest(data))):
        (folder / filename).write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    with (folder / "migration.csv").open("w", encoding="utf-8-sig", newline="") as stream:
        writer = csv.writer(stream)
        writer.writerow(["元ファイル", "元ID", "統合ID", "タイトル", "ジャンル", "開始年", "終了年", "確度", "表示区間", "関連ID", "関連リンク", "旧URL（転送元）"])
        for record in data["records"]:
            writer.writerow([record["source"]["file"], record["source"]["id"], record["id"], record["title"],
                             " / ".join(record["genres"]), record["date"]["startYear"], record["date"]["endYear"],
                             CONFIDENCE[record["date"]["confidence"]], record["periodId"], " / ".join(record["relatedIds"]),
                             " / ".join(link.get("path", link.get("url", "")) for link in record["links"]), " / ".join(record["legacyPaths"])])


def legacy_routes(data):
    """Retired URLs keep bookmarks working, with no second public catalog."""
    roots = {"anime": "anime", "games": "game", "movie-history": "movie", "reading": "reading"}
    routes = {path: {"target": f"timeline/?genre={genre}", "anchors": {}} for path, genre in roots.items()}
    for record in data["records"]:
        target = f'timeline/?genre={record["sourceKind"]}#{record["id"]}'
        for old in record["legacyPaths"]:
            path, _, fragment = old.partition("#")
            path = path.rstrip("/")
            if path == "about":
                continue
            if fragment:
                routes[path]["anchors"][fragment] = target
            else:
                routes[path] = {"target": target, "anchors": {}}
    for note in data["notes"]:
        if note["id"].startswith("anime-era-"):
            routes["anime"]["anchors"]["era-" + note["source"]["id"]] = f'timeline/?genre=anime#{note["id"]}'
    for period in ("elementary", "junior", "high", "university", "adult", "current", "unknown"):
        matches = [r for r in data["records"] if r["sourceKind"] == "game" and (period in r["metadata"]["periods"] or (period == "unknown" and not r["metadata"]["periods"]))]
        if matches:
            routes["games"]["anchors"][period] = f'timeline/?genre=game#year-{matches[0]["periodId"]}'
    for record in data["records"]:
        if record["sourceKind"] == "movie":
            routes["movie-history"]["anchors"].setdefault(record["source"]["groupId"], f'timeline/?genre=movie#year-{record["periodId"]}')
    routes["movie-history"]["anchors"]["preferences"] = "timeline/?genre=movie#movie-preferences"
    routes["reading"]["anchors"]["reading-library"] = "timeline/?genre=reading"
    return routes


def redirect_data(target, anchors, local):
    data = {"target": local(target) if target else None, "anchors": {key: local(value) for key, value in anchors.items()}}
    return json.dumps(data, ensure_ascii=False).replace("<", "\\u003c").replace(">", "\\u003e").replace("&", "\\u0026")


def redirect_document(route, local, origin, e):
    target = local(route["target"])
    return f'''<!doctype html><html lang="ja"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
    <title>人生年表へ移動 | 澤本優哉</title><meta name="robots" content="noindex,follow"><link rel="canonical" href="{origin}{local('timeline/')}">
    <noscript><meta http-equiv="refresh" content="0;url={e(target)}"></noscript><link rel="stylesheet" href="{local('assets/style.css')}">
    <script id="timeline-redirect-data" type="application/json">{redirect_data(route['target'], route['anchors'], local)}</script><script src="{local('assets/timeline-redirect.js')}" defer></script>
    </head><body><main class="shell page-heading"><h1>人生年表に統合しました</h1><p><a href="{e(target)}">人生年表を開く →</a></p></main></body></html>'''
