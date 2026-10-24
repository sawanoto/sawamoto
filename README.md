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
- Aboutの「好きなもの」は `content/site.json` の `likes`、「普段の過ごし方」は `daily_life`、「最近気になっていること」は `interests` で編集します。一覧は配列の項目を追加・削除し、文章は文字列を変更して再ビルドしてください。
- Aboutの制作物紹介は今回は追加していません。今後は `content/works/` や `content/writing/` の実在する作品・記事と、公開済みの画像を選んで紹介できます。編み物の既存記事は `content/writing/mel-chan-knitted-vest.md`。写真の加工については同記事の注記を維持してください。
- Aboutの趣味一覧：`content/site.json` の `hobbies`。各カテゴリの `category` が見出し、`items` が趣味名の配列です。項目を追加・削除し、ビルドすると反映されます。現在・過去の趣味をまとめて掲載します。
- Aboutの資格・検定一覧：`content/site.json` の `qualifications`。各分野の `category` が見出し、`items` が資格・検定名の配列です。取得済みの項目を追加・修正し、ビルドすると反映されます。
- 年表：`content/timeline.json`。本人が確認し、公開可能な項目だけ追加してください。各項目の `importance` は `major`（大）、`medium`（中）、`minor`（小）から選びます。`date` は判明している精度で `YYYY` または `YYYY-MM` と記入し、表示文字列は `period` に設定します。`order` は新しい順の表示位置を決め、同じ年月の項目は任意の順序にできます。既存のIDは作品・記事からのリンクにも使われるため変更しないでください。
- 年表は大の出来事を最初に表示し、中・小の出来事はそれぞれ折りたたんでいます。見出しを押すと展開でき、作品・記事から中・小の項目へ直接移動した場合は自動で開きます。
- 年表から記事へリンクする場合は、公開済みの記事の `id` を年表項目の `article_ids` に追加します（例：`"article_ids":["knitting-my-own-time"]`）。作品は `work_ids` に作品IDを追加します。未公開・存在しない記事IDは設定せず、記事公開後に追加してください。
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

LifeSketch作品は `url` に単独ページ、`interactive_url` に `https://sawanoto.github.io/LifeSketch/` 以下の埋め込み表示用URLを指定できます。作品詳細では「作品を読み込む」を押した後にiframeを作り、単独ページへのリンクも表示します。作品の公開後にリンク先を確認してください。

LifeSketchの記事内にも作品を埋め込むときは、記事のメタデータに `interactive_url` を指定し、本文の表示したい位置に `<!-- interactive-work -->` を一行で置きます。外部作品はボタンを押すまで読み込みません。

複数の動画を一つのプロジェクトとして掲載する場合は、同じ作品ファイルに `videos` 配列を追加します。各要素に `title`、`youtube_id`、`url`、`description`、必要なら `note` を設定します。先頭が代表動画になり、ほかの動画は閲覧者が「動画を読み込む」を押したときだけプレーヤーを読み込みます。公開されていない動画には `availability_note` を設定すると、再生ボタンの代わりにその説明を表示します。すべての動画に YouTube への直接リンクが表示されます。任意の `work_count` と `organization` は作品情報として表示されます。Works 一覧にはそのプロジェクトを一件として表示し、`thumbnail` には代表動画の画像を指定できます。実例は `content/works/university-coop-videos-2014.md` を参照してください。

記事ファイルは `published`（`YYYY-MM-DD`）、任意の制作時期 `period`、`updated`、`tags`、`work_ids` を設定します。作品と年表の `sort` は並び順用の文字列で、確認できる精度の年（`YYYY`）や年月日（`YYYY-MM-DD`）を設定できます。年表の各項目には `id`、`period`、`sort`、`title`、`summary`、`work_ids`、`article_ids` を設定します。各 ID はその種類の中で一意にし、関連 ID は実在する公開コンテンツを指してください。未公開コンテンツへの関連 ID はビルドエラーになります。

手仕事などの写真付き記事では、`period` に制作時期、`published` に公開日を別々に設定できます。公開を確認した画像を `assets/images/` に置き、記事の `thumbnail` と `hero_image` にその `assets/` から始まるパスを設定すると、一覧と記事冒頭に表示されます。`thumbnail_alt`、`hero_image_alt`、`hero_caption` で画像の説明を指定できます。実例は `content/writing/mel-chan-knitted-vest.md` を参照してください。後続の記事へのリンクは、公開された記事ができてから本文に追加してください。

記事の途中に複数の写真を置くときは、`gallery_images` に各画像の `src`、`alt`、`caption` を設定し、本文の挿入位置に `<!-- image-gallery -->` を一行で置きます。画像の出典や加工の有無が分かる説明を添えてください。実例は `content/writing/support-center-halloween-craft-2026.md` にあります。

### 記事を下書きとして保存する

`content/writing/*.md` の冒頭の JSON に `"draft":true` を設定すると、本文を GitHub 上で何度でも修正しながら保存できます。執筆日は `written`（`YYYY-MM-DD`）に記録し、公開日 `published` は公開時に設定します。実例は `content/writing/while-clouds-change-color.md` です。

ビルドは `draft: true` の記事・作品を読み込み時に除外します。個別ページ、トップ、一覧、シリーズ、関連リンク、サイトマップの公開対象にならず、原稿の Markdown も `dist/` にコピーしません。RSS は現在生成していません。毎回 `dist/` を作り直すため、公開済み記事を下書きに戻した場合も以前のページは残りません。公開コンテンツから下書きの ID を参照するとビルドエラーになります。

修正中は必ず `"draft":true` を維持してください。公開すると決めたら、内容を確認して `"draft":false` に変更し、`published` に公開日を追加し、必要に応じて `summary` を記入します。ビルドを確認し、公開用 PR をレビューして `main` にマージしたときだけ Pages に反映します。日付が来ても下書きは自動公開されません。既存記事との互換性のため、`draft` のない記事は従来どおり公開対象です。`draft` に文字列や数値など JSON の真偽値以外を指定すると、誤公開を避けるためビルドが失敗します。

ここでいう非公開は公式サイトへの非掲載を意味します。GitHub のリポジトリや PR を閲覧できる人は下書きも読めます。

下書きの回帰テストは `python -m unittest discover -s tests -p 'test_*.py'` で実行します。

### 「支援センター巡り」に記事を追加する

`content/writing/support-center-halloween-craft-2026.md` を手本に、`content/writing/` に新しい Markdown ファイルを作ります。冒頭の JSON に一意の `id`、`series_id: "support-center-visits"`、公開日 `published`、訪問日 `visit_date`（`YYYY-MM-DD`）、本人が確認した呼称の `center`、`activity`、短い `summary` を設定してください。任意の `play_type` には「制作遊び」などの一語を入れられます。記事を追加すると、`/writing/support-center-visits/` のシリーズ一覧に訪問日順で表示されます。シリーズ名や説明は `content/series.json` で変更できます。

本文には「体験したこと」「子どもの様子」「この遊びには、どんな意味がある？」「参考資料」を分けて記します。資料にない発達効果や、個別の子どもへの効果は断定しません。確認済みの公的資料・論文へのリンクを本文と参考資料に残してください。非公開の訪問メモや写真は公開リポジトリに置かず、掲載が決まった内容だけを追加してください。

外部 URL は `http` / `https` のみ許可します。Markdown 本文は自分で確認した文章とリンクだけを入れてください。画像は公開を許可されたものだけを `assets/` などに配置してください。

## GitHub Pages で公開

1. 公開内容を確認して `main` ブランチに push します。
2. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選びます。
3. `.github/workflows/pages.yml` がビルドして公開します。URL は `https://sawanoto.github.io/sawamoto/` です。

Codex Cloud での変更は検証ブランチと PR で確認し、本人が承認した後に `main` へマージします。マージすると GitHub Pages の公開ワークフローが動きます。

公開前に氏名以外の個人情報、作品の権利・公開許可、リンク先、画像の公開許可、各文章の事実関係を確認してください。GitHub 上でも非公開にする必要のある原稿や資料はこのリポジトリに置かないでください。`.private/` はローカル退避用で Git の対象外ですが、秘密情報の保管場所として長期利用しないでください。

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

## 毎月の季節デザイン

ヘッダーの小さなSVGと淡い背景・アクセント色が、日本時間（`Asia/Tokyo`）の月に合わせて切り替わります。毎年繰り返し使え、月替わりの再ビルド・再デプロイは不要です。JavaScriptが無効なら、従来の標準デザインを表示します。装飾にアニメーションはなく、読み上げやキーボード操作の対象にもなりません。

12か月の色とイラストは **`assets/seasonal.js` の `THEMES`** だけで管理します。共通の配置は `assets/seasonal.css`、全ページへの読み込みと装飾の置き場所は `build.py` の共通テンプレートにあります。外部画像・外部API・Cookie・ローカルストレージは使いません。

| 月 | テーマ | 公開後の確認用URL |
| --- | --- | --- |
| 1 | お正月 | https://sawanoto.github.io/sawamoto/?themeMonth=1 |
| 2 | 雪と冬 | https://sawanoto.github.io/sawamoto/?themeMonth=2 |
| 3 | 春の芽吹き | https://sawanoto.github.io/sawamoto/?themeMonth=3 |
| 4 | 桜 | https://sawanoto.github.io/sawamoto/?themeMonth=4 |
| 5 | 新緑 | https://sawanoto.github.io/sawamoto/?themeMonth=5 |
| 6 | 梅雨と紫陽花 | https://sawanoto.github.io/sawamoto/?themeMonth=6 |
| 7 | 七夕 | https://sawanoto.github.io/sawamoto/?themeMonth=7 |
| 8 | 夏とひまわり | https://sawanoto.github.io/sawamoto/?themeMonth=8 |
| 9 | 月見 | https://sawanoto.github.io/sawamoto/?themeMonth=9 |
| 10 | ハロウィン | https://sawanoto.github.io/sawamoto/?themeMonth=10 |
| 11 | 紅葉 | https://sawanoto.github.io/sawamoto/?themeMonth=11 |
| 12 | クリスマス | https://sawanoto.github.io/sawamoto/?themeMonth=12 |

`themeMonth` はそのURLだけに適用される開発者用プレビューです。通常ページに選択UIは出ません。指定を外せば現在の日本時間の月へ戻ります。`1`〜`12` 以外の値は無視します。記事ページにも `?themeMonth=10` などを付けて確認できます。ページを移動した先にもプレビューを適用したい場合は、移動先URLにも指定してください。

開いたままのページは、次の月の1日午前0時（日本時間）に切り替えます。タイマーは最長1時間ごとにも日付を確認し、端末の時刻変更に対応します。タブが非表示だったり端末が休止していたりした場合は、復帰時・再表示時・ページへのフォーカス時にも更新します。ブラウザーがバックグラウンドで処理を止めている間は実行できませんが、再表示時には現在の月になります。

### マージ前にローカルで確認する

この変更のブランチをチェックアウトして、既存のPython環境で次を実行します（bashの例）。本番URLの変更は不要です。

```bash
SITE_BASE_PATH=/ python build.py
python -m http.server 8000 --directory dist
```

`http://localhost:8000/?themeMonth=10` を開き、数字を `1`〜`12` に変えて確認してください。スマートフォン幅は390px・320px、PC幅は1280pxを目安に確認できます。本番用に戻すときは `SITE_BASE_PATH` を指定せず `python build.py` を実行してください。

ブラウザーで手軽に見比べたい場合は、ビルド後に次を実行すると、月と画面幅を選べる確認専用HTMLも作れます。この選択UIは公開サイトには入りません。

```bash
python scripts/seasonal-preview.py
```

出力された `.private/seasonal-preview.html` をブラウザーで開いてください。生成済みトップページにCSSとテーマのスクリプトを埋め込むため、ローカルHTTPサーバーは不要です。ページ内のリンクは公開サイトへ移動します。

### 自動検証

切り替えのロジックはNode.jsの標準機能だけで検証できます。

```bash
node --test --test-isolation=none tests/seasonal.test.cjs
```

12か月の配色（通常文字のコントラスト比4.5以上）、プレビューの不正値、日本時間の全月の境界、年越し、複数年での繰り返し、再表示・時計変更などを検証します。`--test-isolation=none` に対応するNode.js 22.8以降を使ってください。

実ブラウザー検証には任意の開発用依存 `playwright` とChromiumが必要です。

```bash
npm install --no-save --package-lock=false playwright
npx playwright install chromium
python build.py
python scripts/seasonal-preview.py
node tests/seasonal.browser.cjs
```

システムのChromiumを使う場合は `CHROMIUM_PATH=/usr/bin/chromium node tests/seasonal.browser.cjs` のように指定できます。サイトにnpm依存は追加されず、本番ビルドは従来どおりPythonだけです。ブラウザー検証は、生成したファイルをPlaywright内で配信するためローカルHTTPサーバーは不要です。全12か月のPC・モバイル配置、記事の横はみ出し、JavaScript無効時、別タイムゾーンの端末での日本時間の月替わりを確認し、`.private/seasonal-screenshots/` にスクリーンショットを出力します。

PRではGitHub Actionsの **Check seasonal themes** も同じ検証を実行します。実行結果の **Artifacts → seasonal-theme-preview** をダウンロードすると、確認専用HTMLとPC・スマートフォン各月のスクリーンショットを取得できます。テストに失敗した場合も、その時点で生成できた確認ファイルを保存します。公開・デプロイは行いません。

## 今日の季語（トップページ）

毎日、日本時間0時に切り替わる季語を、トップページ右上の季節イラストの横に単語だけ表示します。タップすると日付・読み・季節・意味・情景を読み、もう一度タップ、閉じるボタン、Escape、欄の外のタップで閉じられます。スマートフォンでも本文を押し下げません。

編集元は **`content/kigo.json`**。`MM-DD` をキーに366日分（閏日を含む）の表記・読み・季節・短い説明・情景・参考URLを管理します。編集後に `python build.py` で反映し、日付の網羅性や重複などを自動検査します。外部APIは使いません。

[データの編集方法・出典と日付対応の留意点・動作検証](docs/daily-kigo.md)を参照してください。季語の分類と実際の気候には地域差があり、節気・旧暦行事の紹介日は毎年の実施日を示すものではありません。プレビュー用の単体HTMLには季語表示も含まれます。

## 映画遍歴

`/movie-history/`（公開時は `/sawamoto/movie-history/`）。共通ナビゲーションとAboutの「文化の遍歴」から参照できます。このチェックアウトにはアニメ遍歴・ゲーム遍歴がないため、共通の配色・見出し・Aboutの年表を踏襲しています。

編集元は `content/movie-history.json`、生成処理は `build.py` の `movie_history()` です。`groups` とその中の `entries` の配列順が表示順です。作品を追加するときは、一意の英数字・ハイフンの `id`、作品名 `title`、公開年 `release`、鑑賞時期 `viewed`、鑑賞方法 `method`、種別 `kind`、段落配列 `memories` を設定します。公開年から鑑賞時期を推測せず、不明な項目は未確認と明記してください。`original` は任意の原作情報です。

`related_reading_id` は将来の読書遍歴に関連付ける安定したIDです。現在はリンクを生成しません。読書遍歴の公開後に対応する実在ページへリンクする処理を追加してください。原作や考察記事など、未確認のリンクは作成しません。
