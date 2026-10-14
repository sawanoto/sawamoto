# 澤本優哉 / Yuya Sawamoto

個人公式サイトのソースです。Python と Markdown で静的 HTML を生成し、GitHub Pages に公開します。データベースや有料サービスは不要です。

## ローカルで確認

```powershell
python -m venv .venv
.venv\Scripts\python -m pip install -r requirements.txt
$env:SITE_BASE_PATH = "/"
.venv\Scripts\python build.py
.venv\Scripts\python -m http.server 8000 --directory dist
```

`http://localhost:8000/` で確認できます。公開前には `$env:SITE_BASE_PATH` を解除して再ビルドしてください。GitHub Actions 上では既定の `/sawamoto/` が使われます。

## 更新する

- サイト名、トップの説明、About、関心、外部リンク：`content/site.json`。説明文は仮文なので自由に更新できます。
- 年表：`content/timeline.json`。本人が確認し、公開可能な項目だけ追加してください。
- 作品：`content/works/` に英数字とハイフンのファイル名で `.md` を追加します。
- 記事：`content/writing/` に同様の `.md` を追加します。本文は通常の Markdown なので、後の再編集や電子書籍化に再利用できます。
- 書籍：`content/books.json` に実在する販売作品を追加すると Books ページとナビゲーションが生成されます。

作品ファイルの例（**この例は公開データには含めません**）：

```markdown
---
{"id":"work-example","title":"作品名","period":"2026年","category":"プログラミング","summary":"短い説明","thumbnail":"https://example.com/image.jpg","thumbnail_alt":"画像の説明","url":"https://example.com/","article_ids":["article-example"],"timeline_ids":["event-example"]}
---
# 制作背景

本文を Markdown で書きます。
```

動画作品では `youtube_id` に YouTube URL の動画 ID を設定すると、詳細ページに動画を埋め込めます。`url` は埋め込みが再生できない場合の外部リンクとして表示されます。`duration`、`software`、`role` は任意の制作情報です。サムネイルには YouTube の `https://img.youtube.com/vi/動画ID/hqdefault.jpg` も指定できます。

複数の動画を一つのプロジェクトとして掲載する場合は、同じ作品ファイルに `videos` 配列を追加します。各要素に `title`、`youtube_id`、`url`、`description`、必要なら `note` を設定します。先頭が代表動画になり、ほかの動画は閲覧者が「動画を読み込む」を押したときだけプレーヤーを読み込みます。公開されていない動画には `availability_note` を設定すると、再生ボタンの代わりにその説明を表示します。すべての動画に YouTube への直接リンクが表示されます。任意の `work_count` と `organization` は作品情報として表示されます。Works 一覧にはそのプロジェクトを一件として表示し、`thumbnail` には代表動画の画像を指定できます。実例は `content/works/university-coop-videos-2014.md` を参照してください。

記事ファイルは `published`（`YYYY-MM-DD`）、任意の制作時期 `period`、`updated`、`tags`、`work_ids` を設定します。作品と年表の `sort` は並び順用の文字列で、確認できる精度の年（`YYYY`）や年月日（`YYYY-MM-DD`）を設定できます。年表の各項目には `id`、`period`、`sort`、`title`、`summary`、`work_ids`、`article_ids` を設定します。各 ID はその種類の中で一意にし、関連 ID は実在する公開コンテンツを指してください。未公開コンテンツへの関連 ID はビルドエラーになります。

手仕事などの写真付き記事では、`period` に制作時期、`published` に公開日を別々に設定できます。公開を確認した画像を `assets/images/` に置き、記事の `thumbnail` と `hero_image` にその `assets/` から始まるパスを設定すると、一覧と記事冒頭に表示されます。`thumbnail_alt`、`hero_image_alt`、`hero_caption` で画像の説明を指定できます。実例は `content/writing/mel-chan-knitted-vest.md` を参照してください。後続の記事へのリンクは、公開された記事ができてから本文に追加してください。

記事の途中に複数の写真を置くときは、`gallery_images` に各画像の `src`、`alt`、`caption` を設定し、本文の挿入位置に `<!-- image-gallery -->` を一行で置きます。画像の出典や加工の有無が分かる説明を添えてください。実例は `content/writing/support-center-halloween-craft-2026.md` にあります。

### 「支援センター巡り」に記事を追加する

`content/writing/support-center-halloween-craft-2026.md` を手本に、`content/writing/` に新しい Markdown ファイルを作ります。冒頭の JSON に一意の `id`、`series_id: "support-center-visits"`、公開日 `published`、訪問日 `visit_date`（`YYYY-MM-DD`）、本人が確認した呼称の `center`、`activity`、短い `summary` を設定してください。任意の `play_type` には「制作遊び」などの一語を入れられます。記事を追加すると、`/writing/support-center-visits/` のシリーズ一覧に訪問日順で表示されます。シリーズ名や説明は `content/series.json` で変更できます。

本文には「体験したこと」「子どもの様子」「この遊びには、どんな意味がある？」「参考資料」を分けて記します。資料にない発達効果や、個別の子どもへの効果は断定しません。確認済みの公的資料・論文へのリンクを本文と参考資料に残してください。非公開の訪問メモや写真は公開リポジトリに置かず、掲載が決まった内容だけを追加してください。

外部 URL は `http` / `https` のみ許可します。Markdown 本文は自分で確認した文章とリンクだけを入れてください。画像は公開を許可されたものだけを `assets/` などに配置してください。

## GitHub Pages で公開

1. 公開内容を確認して `main` ブランチに push します。
2. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選びます。
3. `.github/workflows/pages.yml` がビルドして公開します。URL は `https://sawanoto.github.io/sawamoto/` です。

Codex Cloud での変更は検証ブランチと PR で確認し、本人が承認した後に `main` へマージします。マージすると GitHub Pages の公開ワークフローが動きます。

公開前に氏名以外の個人情報、作品の権利・公開許可、リンク先、画像の公開許可、各文章の事実関係を確認してください。非公開原稿や資料はこのリポジトリに置かないでください。`.private/` はローカル退避用で Git の対象外ですが、秘密情報の保管場所として長期利用しないでください。

## 構成

- `build.py`：ページ、SEO メタデータ、サイトマップを生成
- `content/site.json`：共通文言
- `content/timeline.json`：年表
- `content/works/*.md`：作品
- `content/writing/*.md`：記事
- `content/books.json`：将来の販売作品
- `assets/style.css`：共通デザイン
- `.github/workflows/pages.yml`：Pages 公開

今後は実際の作品・記事を追加したうえで、カテゴリ絞り込み、OGP画像、Books のナビゲーションなどを検討できます。
