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
- 年表の公開先は `/timeline/` に一本化しました。Aboutには入口だけを表示し、従来の生活年表アンカーも該当する統合記録へ転送します。
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

`content/writing/anatomica-chino-ii.md` は写真なしで公開する愛用品の記録です。後から本人のCHINO II写真を追加する場合は、既存の `hero_image` または `gallery_images` を利用できます。手書きの手紙の写真は別途掲載指示があるまで追加しません。掲載する場合も元画像は上書きせず、公開用コピーで店員さんの個人名・署名など個人情報が読み取れないように加工し、公開前に確認してください。未加工の手紙はリポジトリや公開用assetsに置かないでください。

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

## 読書遍歴

`content/reading.json` で作品・媒体・読書時期・読了状況・感想を管理します。追加方法と確認手順は [読書遍歴の編集](docs/reading-history.md) を参照してください。書籍・販売作品の `content/books.json` とは別データです。

## 映画遍歴

`/movie-history/`（公開時は `/sawamoto/movie-history/`）。共通ナビゲーションとAboutの「文化の遍歴」から参照できます。アニメ遍歴・ゲーム遍歴と共通の配色・見出しを使い、時代別に鑑賞体験を整理しています。

編集元は `content/movie-history.json`、生成処理は `build.py` の `movie_history()` です。`groups` とその中の `entries` の配列順が表示順です。作品を追加するときは、一意の英数字・ハイフンの `id`、作品名 `title`、公開年 `release`、鑑賞時期 `viewed`、鑑賞方法 `method`、種別 `kind`、段落配列 `memories` を設定します。公開年から鑑賞時期を推測せず、不明な項目は未確認と明記してください。`original` は任意の原作情報です。

`related_reading_id` は将来の読書遍歴に関連付ける安定したIDです。現在はリンクを生成しません。読書遍歴の公開後に対応する実在ページへリンクする処理を追加してください。原作や考察記事など、未確認のリンクは作成しません。

## ゲーム遍歴

一覧は `/sawamoto/games/`、詳細は `/sawamoto/games/<id>/` です。アニメ遍歴と同じサイト共通の見出し・配色・年表のデザイン規則に合わせています。

`content/games.json` の配列に1作品ずつ追加し、`python build.py` で生成します。表示処理は `game_history.py`、絞り込みは `assets/games.js` です。

```json
{
  "id": "example-game",
  "title": "作品名",
  "platform": null,
  "releaseYear": null,
  "playedPeriod": "小学校高学年頃",
  "periodIsEstimated": true,
  "periods": ["elementary", "junior"],
  "memories": ["思い出の最初の段落。", "続きの段落。"],
  "companions": ["自分", "友達"],
  "status": "プレイ済み",
  "image": null
}
```

- `id` は英小文字・数字・ハイフンの一意な値で、詳細URLになります。公開後は変更しないでください。
- `periods` は掲載先です。`elementary`（小学生）、`junior`（中学生）、`high`（高校生）、`university`（大学生）、`adult`（社会人）、`current`（現在）を指定します。複数指定しても作品データや本文の複製は不要です。時期未確定は空配列 `[]` とし、専用欄に表示します。
- `playedPeriod` は実際のプレイ時期の説明です。曖昧な推定時期は `periodIsEstimated: true`、完全に不明なら「時期未確定」とします。`releaseYear` は発売年の整数または `null` です。初版では発売年を未確認とし、プレイ時期から推定していません。
- `platform` は実際に遊んだ機種・環境を記載し、不明なら `null`。`companions` は相手の配列で、不明なら `[]`（未確認）。機種と相手の絞り込み候補はデータから自動生成します。
- `status` は「クリア済み」「未クリア」「プレイ済み」「所有のみ」「不明」。観戦のみの場合はプレイ済みと断定せず、本文に状況を記載します。
- `memories` は段落ごとの文字列配列です。先頭の段落が一覧にも表示されます。本文はHTMLとして実行されません。
- `image` は省略または `null` で表示できます。使う場合は利用権を確認した `assets/` 以下の画像パスなどを指定してください。初版は外部画像を使用していません。

確認コマンド：`python -m unittest discover -s tests`、`python build.py`。PlaywrightとChromiumがある環境では `CHROMIUM_PATH=/usr/bin/chromium node tests/games.browser.cjs` でスマートフォン・タブレット・PC幅、絞り込み、詳細リンク、JavaScript無効時の表示を確認できます。

## アニメ遍歴

`/sawamoto/anime/` に個人的なアニメ年表を生成します。作品は `content/anime.json`、時代別の思い出は `content/anime-eras.json` で更新できます。データ項目・追加例・確認コマンドは [アニメ遍歴の更新手順](docs/anime.md) を参照してください。

## 統合人生年表 `/timeline/`

アニメ・映画・読書・ゲーム・生活を、1995年から現在までの一本の年表で表示します。初期表示は「すべて」。6種類のボタンでページ再読み込みなしに切り替え、通常表示は趣味のまとまり34件と生活の出来事46件です。趣味を開くと作品の一覧・時代別の思い出が現れ、作品名をさらに開くと感想・思い出の全文と関連記録へのリンクを読めます。フィルターは `?genre=anime` などのURLにも対応します。JavaScript無効時も全件と詳細を読めます。

グループ一覧と所属件数は [趣味グループ対応表](docs/timeline-groups.md) を参照してください。全207記録を保持し、見せ方だけを二階層にしています。

### 正本と自動生成

| 正本 | 内容 | 初回統合件数 |
| --- | --- | ---: |
| `content/anime.json` | アニメ・関連視聴作品 | 29 |
| `content/movie-history.json` | 映画・関連鑑賞体験 | 19 |
| `content/reading.json` | 読書（シリーズを含む記録） | 87 |
| `content/games.json` | ゲーム | 26 |
| `content/timeline.json` | 生活・活動 | 46 |

**正本は引き続き上記のJSONです。** `life_timeline.py` がビルド時に207件を共通構造へ自動変換します。統合用の作品JSONを手作業で二重管理しません。各元JSONのID・本文・既存フィールドは変更していません。作品の所属・タイトル・年代の参照元は `content/timeline-groups.json` で別管理し、感想本文を複製しません。旧ページの生成処理は入力検証にも使用しますが、公開出力は新年表への転送ページです。`content/books.json` は販売作品用で、読書遍歴には使用しません。

追加の文章の正本は以下です。

- `content/anime-eras.json`：6区分の時代別の思い出。対応する西暦見出しの下から開け、不明区分の文章は「記録の背景」から読めます。
- `content/movie-history.json`：導入文・グループ別注記・映画の好み。
- `content/history-context.json`：従来 `build.py` / `game_history.py` 内にあった導入文・読書観・注意書きを全文移設。統合年表がこの共通文章を読み込みます。

「遍歴データが存在しない」という前回実装時の説明は誤りでした。古い作業HEAD `6dd5249` と未更新のローカル `origin/main` を調べていたことが原因です。今回は指定どおり `git fetch origin main` を実行し、最新main **`6cb64ed1de932686acfec8500a6722da4fe980b7`** を作業基準としました。公開反映前にはさらにmain `e51e5c9`（PR #34のあすなろリトミック記事）を取り込み、その記事を保持した状態で再検証しています。前回の未コミット変更はGit stashと `/workspace/timeline-previous-implementation/` に保全しています（後者は今回の作業環境内の保存先）。

### 年代の扱い

`content/timeline-settings.json` に、重複しない表示区間の開始年・終了年、ジャンル定義、推定規則と根拠をまとめています。2024年以降はビルドした年まで西暦の区間を自動追加します。

- **確定**：生活記録の明記された年月、または明記された体験年。
- **推定**：元の学校時代・社会人時代の記録を、既存の「2013年度・高校3年生」「2014年・大学1年生」「2018年・就職」と通常の修業年限から、幅を持たせて配置。出生年・入学日を確定する処理ではありません。小学生以前は1995〜2007年の広い範囲です。
- **不明**：根拠がない記録は「時期未整理」。読書の「時期不明」、ゲームの所有のみの記録、第一子の育休などを含み、全件を閲覧できます。

作品の公開年・発売年や `updatedAt` は体験年に使いません。元データの「確定」が学校時代だけを指す場合も、西暦への換算は「推定」として別管理します。

複数の時期を含む記録は一度だけ表示し、元の時期表記と各範囲を詳細に保持します。例えばMinecraftは中学生時代と社会人時代の2範囲を持ちます。年表に直接出るのは生活の出来事と趣味のまとまりです。その所属は**開始年を含む表示区間**で一意に決め、タイトル横に範囲を表示します。作品自体の年代・確度は保存データで元どおり保持します。画面の年代表示は、年代見出しと趣味・生活の項目の目安に絞ります。原作と映像版など、別の元記録は統合して消さず、別IDで関連付けます。

### 今後の追加・修正

作品は該当する正本JSONへ既存形式で追加し、`content/timeline-groups.json` の該当グループの `recordIds` に統合ID（例：`reading-book-088`）を追加します。`python build.py` で年表・対応表・旧URLの転送先へ反映され、HTMLの編集は不要です。生活の記録は `content/timeline.json` に追加するだけで個別表示されます。

所属をまだ決めていない新作も、ジャンルごとの「その他の記録」に自動収納されます。補助グループのID一覧は生成JSON/CSVから確認できます。明示的な所属が優先されるので、後で `recordIds` に追加すれば補助グループから自動で移ります。存在しないID・重複所属・生活記録を趣味に入れる指定はビルドエラーになります。

新しいまとまりの定義例（`groups` 配列に追加）：

```json
{
  "id": "new-interest",
  "title": "既存の体験に根拠のある趣味の変化",
  "recordIds": ["reading-book-088"],
  "noteIds": [],
  "dateFrom": ["reading-book-088"],
  "evidenceIds": ["reading-book-088"]
}
```

- `recordIds`：所属する作品の統合ID。一つの作品に正規の所属は一つです。作品間の関連リンクは引き続き利用できます。
- `noteIds`：時代別の思い出や導入文のID。元の文章を参照します。体験・感想・思い出をグループ内や「記録の背景」で表示し、年代の算出説明など管理用の注記は画面に出しません。全文は保存データに保持します。
- `evidenceIds`：タイトルの根拠となる所属作品・補足文章のID。気持ちや体験を推測で作らないための確認先です。
- `dateFrom`：グループの時期を判断する所属作品・補足文章のID。これらの既存体験時期から幅を持たせて「推定」とし、無指定または全件不明なら「時期未整理」です。**グループの年代で作品の年代を上書きしません。**
- グループのジャンルは所属作品から自動で集めます。アニメから原作小説へ進んだ記憶や原作・映像の体験は、アニメ／読書、映画／読書など両方のフィルターから開けます。選択中のジャンルに合う作品だけがグループ内に表示されます。

二階層化は最新main `ada552d`（ショップ機能も保持）を基準に実装しています。初回は34グループ・生活46件の80項目で、161作品と全207記録を参照できます。未所属は0件、補助グループには26件（アニメ1・ゲーム4・読書21）を保持しています。映画の補助グループは予備定義で、所属0件のため表示しません。

必要に応じ、各項目へ次の任意フィールドを追加できます。

```json
{
  "timelineGenres": ["reading", "life"],
  "timelineDate": {
    "startYear": 2025,
    "endYear": 2025,
    "confidence": "confirmed",
    "label": "2025年",
    "basis": "本人の当時の読書記録に記載"
  }
}
```

`confidence` は `confirmed` / `estimated` / `unknown`。確定・推定には開始年、終了年と根拠 `basis` が必要です。正確な体験年が判明した際は、このフィールドで推定を置き換えられます。不明は `{"confidence":"unknown","label":"時期未整理"}`。既存フィールドはそのまま残せます。

`timelineGenres` はサイト内の分類です。読書JSONの `genres`（SFなどの書籍ジャンル）とは別です。新しいジャンルは `timeline-settings.json` の `genres` に追加し、例えば生活記録へ `"timelineGenres":["life","music"]` と設定すれば、ボタン・識別表示へ自動反映されます。ジャンルIDは半角英小文字で始まる英数字・ハイフンを使います。

映画から読書への既存別名参照は、同設定の `movieReadingAliases` で `sakura → book-028`、`three-body-problem → book-034` に対応させ、統合時に双方向リンクを生成します。元データ間の存在しない参照・ID重複・表示区間の重複はビルドエラーになります。

### 移行対応表と検証

ビルドのたびに次を生成します。これらは出力物であり、手動編集しません。

- `dist/timeline/records.json`：統合ID、元ID・ファイル、元フィールド全文、複数ジャンル、年代・確度・根拠、本文、関連ID、記事・制作物など関連ページへのリンク、旧URLの転送元情報。
- `dist/timeline/migration.json`：元記録から統合記録・表示項目への207行の対応表と集計、グループ・生活の各表示項目、補足文章19項目の対応表。
- `dist/timeline/migration.csv`：同じ記録対応を表計算ソフトで確認できるCSV（表示項目IDも収録）。
- `dist/timeline/groups.json` / `groups.csv`：グループごとのタイトル、件数、所属ID、年代、根拠、補助グループの区別。

初回結果は207件、確定45件・推定78件・不明84件。アニメ年代別6項目などの補足文章19項目は、作品・出来事の件数とは別です。ジャンルフィルターの対象記録数は複数分類を含むため、アニメ30件・読書88件になります（アニメにも属する映画側のDVD鑑賞記録、読書にも属する生活側の図書館記録）。

```sh
python build.py
python -m unittest discover -s tests -p 'test_*.py'
node --test --test-isolation=none tests/seasonal.test.cjs
node tests/life-timeline.browser.cjs
```

新規Pythonテストは全207件の元フィールドと本文、全IDの所属・表示先、生活46件の個別表示、補足文章、全ローカルリンク・関連参照、年代区間、グループ追加・JSON追加のみの反映を照合します。ブラウザテストは6フィルター、320/375/768/1280px、複数開閉、キーボード、原作・映像間の移動、旧URL・保存済みアンカーからの自動転送、JavaScript無効時を確認します。PlaywrightとChromiumが必要で、実行ファイルは `CHROMIUM_PATH` でも指定できます。

### 既存URL

`/anime/`、`/games/`、`/movie-history/`、`/reading/` と作品詳細URLは、人生年表への転送ページに変更しました。サイト内の旧一覧・旧詳細へのリンクと、Aboutに重複していた生活年表は削除しています。元JSONと本文は保持しています。

`legacy_routes()` が元ID・旧URLから転送先を自動生成します。例えば `/anime/steins-gate/` は `/timeline/?genre=anime#anime-steins-gate`、`/reading/#reading-book-034` は対応する読書記録、`/movie-history/#sakura` は映画の『さくら』へ移動します。Aboutの `#timeline-…` も新しい生活記録へ転送します。通常のAboutプロフィールはそのまま閲覧できます。

旧URLは検索対象から外す `noindex` と新年表のcanonicalを設定し、サイトマップにも含めません。JavaScript無効時は旧ページから新年表へmeta refreshで転送し、明示リンクも用意しています。JavaScript有効時は保存済みアンカーも対応する詳細・年代へ引き継ぎ、趣味グループと作品詳細を両方自動で展開します。個別記録内の「この記録へのリンク」も同じ固定IDを使います。

`records.json` / `migration.json` の `legacyPaths` とCSVの「旧URL（転送元）」列に対応を保持します。年表上には旧ページへ戻るリンクを表示しません。

### 「澤本家 手しごと商店」を更新する

独立した構想ページは `/handcraft-shop/`（GitHub Pagesでは `/sawamoto/handcraft-shop/`）。Works の「構想中の創作企画」からアクセスできます。

`content/handcraft-shop.json` の `family` は参加構想、`categories` は商品・展示案、`display` は売り場、`progress` は制作進捗、`goals` は今後の目標です。進捗の `stage` は `構想中`・`試作中`・`完成`・`出品候補` から選び、出店など未定の項目は `null` にします。経験があることと、販売用作品が完成していることは区別し、補足を `note` に記入してください。

写真は公開可能な実物の画像を `assets/images/` に置き、該当カテゴリの `images` に `{"src":"assets/images/ファイル名.jpg","alt":"画像の説明","caption":"作品の制作状況や写真の説明"}` を追加します。空配列なら写真枠も表示しません。未制作のものを完成品として掲載せず、家族の実名・顔写真・個人情報は載せないでください。参加承諾や提供可否の状況が変わったときは、ページ本文の注記も確認してください。

導入・注記の文章は `build.py` の `render_handcraft`、ページ専用の装飾は `assets/handcraft-shop.css` で編集します。更新後は `python build.py` で再生成します。公開は既存の main 向け GitHub Pages ワークフローに従います。

### 年表の詳細表示を簡素化

表示は作品名、感想・思い出、関連記録や記事・詳細へのリンクを中心にしています。作品ごとのメタ情報表、公開・発売年、確度・媒体・タグ・更新日、年代の推定根拠、年表全体の算出方法、管理用の補足文章はHTMLに出力しません。作品の感想を短縮・生成せず、短文の「当時の思い出」などの小見出しも省いています。趣味のまとまりと生活の項目では、年代の目安を引き続き表示します。

これは `render_timeline()` の表示制御です。元JSON、統合JSON/CSV、年代・並び順・グループ所属・全メタデータは変更しません。原文の管理用注記は `NOTE_PARAGRAPHS` で表示対象だけを選び、作品の公開年などの注記セクションも表示から外します。旧注記のアンカーは空の非表示アンカーとして残し、趣味グループを開くようにするため、既存の転送ページ自体は変更しません。
