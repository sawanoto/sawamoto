"""Render a personal game history; each game and its memories have one source."""
import json
import re

PERIODS = [('elementary', '小学生時代'), ('junior', '中学生時代'),
           ('high', '高校生時代'), ('university', '大学生時代'),
           ('adult', '社会人時代'), ('current', '現在')]


def load_games(path):
    games = json.loads(path.read_text(encoding='utf-8'))
    ids = set()
    required = {'id', 'title', 'platform', 'releaseYear', 'playedPeriod',
                'periodIsEstimated', 'memories', 'companions', 'status', 'periods'}
    for game in games:
        if not required <= game.keys():
            raise ValueError('Missing game fields')
        if not re.fullmatch(r'[a-z0-9]+(?:-[a-z0-9]+)*', game['id']) or game['id'] in ids:
            raise ValueError('Invalid or duplicate game ID')
        ids.add(game['id'])
        if set(game['periods']) - dict(PERIODS).keys():
            raise ValueError('Unknown game period')
        if type(game['periodIsEstimated']) is not bool:
            raise ValueError('periodIsEstimated must be boolean')
        if game['releaseYear'] is not None and (type(game['releaseYear']) is not int or not 1900 <= game['releaseYear'] <= 2100):
            raise ValueError('releaseYear must be a year or null')
        if game['status'] not in {'クリア済み', '未クリア', 'プレイ済み', '所有のみ', '不明'}:
            raise ValueError('Unknown game status')
        for field in ('periods', 'memories', 'companions'):
            if not isinstance(game[field], list) or not all(isinstance(x, str) for x in game[field]):
                raise ValueError(f'{field} must be a list of strings')
    return games


def render_games(content, write, page, local, e, image_url):
    games = load_games(content / 'games.json')
    copy = json.loads((content / 'history-context.json').read_text(encoding='utf-8'))['game']['paragraphs']
    intro, note = copy

    def played(game):
        return game['playedPeriod'] + ('（推定）' if game['periodIsEstimated'] else '')

    def release(game):
        return f"{game['releaseYear']}年" if game['releaseYear'] else '未確認'

    def card(game):
        return (f'<li class="game-entry" data-platform="{e(game["platform"] or "未確認")}" '
                f'data-companions="{e(json.dumps(game["companions"], ensure_ascii=False))}">'
                f'<a class="game-card" href="{local("games/" + game["id"] + "/")}">'
                f'<h3>{e(game["title"])}</h3><p class="meta">ゲーム機：{e(game["platform"] or "未確認")}<br>'
                f'発売年：{e(release(game))} ／ プレイ時期：{e(played(game))}</p>'
                f'<p>{e(game["memories"][0])}</p><span class="game-more">思い出を読む →</span></a></li>')

    def options(values):
        return '<option value="">すべて</option>' + ''.join(f'<option>{e(v)}</option>' for v in sorted(values))

    filters = (f'<div class="game-filters" hidden><label>ゲーム機 <select id="game-platform">'
               f'{options({g["platform"] or "未確認" for g in games})}</select></label>'
               f'<label>一緒に遊んだ相手 <select id="game-companion">'
               f'{options({c for g in games for c in g["companions"]})}</select></label>'
               '<button type="button" id="game-reset">絞り込みを解除</button></div>'
               '<p id="game-count" class="meta" role="status" aria-live="polite"></p>')
    sections = []
    for id_, title in PERIODS + [('unknown', '時期未確定')]:
        items = [g for g in games if id_ in g['periods'] or (id_ == 'unknown' and not g['periods'])]
        sections.append(f'<section class="game-period content-section" id="{id_}"><div class="section-head"><h2>{title}</h2></div>'
                        f'<ul class="game-list">{"".join(card(g) for g in items)}</ul></section>')
    jumps = ''.join(f'<li><a href="#{id_}">{title}</a></li>' for id_, title in PERIODS + [('unknown', '時期未確定')])
    body = (f'<div class="page-heading"><p class="kicker">Game history</p><h1>ゲーム遍歴</h1><p>{e(intro)}</p></div>'
            f'<p class="section-copy">{e(note)}</p>'
            f'<nav aria-label="ゲーム遍歴の時代"><ul class="link-list">{jumps}</ul></nav>{filters}{"".join(sections)}'
            f'<script src="{local("assets/games.js")}" defer></script>')
    write('games', page('ゲーム遍歴', intro, 'games/', body))
    for game in games:
        facts = [('ゲーム機', game['platform'] or '未確認'), ('発売年', release(game)),
                 ('プレイ時期', played(game)), ('一緒に遊んだ相手', '、'.join(game['companions']) or '未確認'), ('状況', game['status'])]
        facts_html = ''.join(f'<div><dt>{e(k)}</dt><dd>{e(v)}</dd></div>' for k, v in facts)
        image = f'<figure class="feature-image"><img src="{image_url(game["image"])}" alt="{e(game["title"])}"></figure>' if game.get('image') else ''
        memories = ''.join(f'<p>{e(p)}</p>' for p in game['memories'])
        links = ''.join(f'<li><a href="{local("games/#" + p)}">{e(dict(PERIODS)[p])}</a></li>' for p in game['periods'])
        detail = (f'<div class="detail-heading"><a class="back" href="{local("games/")}">← ゲーム遍歴</a>'
                  f'<p class="kicker">Game memories</p><h1>{e(game["title"])}</h1></div>'
                  f'<dl class="work-facts game-facts">{facts_html}</dl>{image}'
                  f'<article class="prose"><h2>思い出</h2>{memories}</article>'
                  f'<nav aria-label="掲載している時代"><ul class="link-list">{links}</ul></nav>')
        write('games/' + game['id'], page(game['title'], game['memories'][0], 'games/' + game['id'] + '/', detail))
