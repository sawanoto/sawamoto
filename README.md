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

記事ファイルは `period` の代わりに `published`（`YYYY-MM-DD`）、任意の `updated`、`tags`、`work_ids` を設定します。年表の各項目には `id`、`period`、`sort`（並び順のための `YYYY-MM-DD`）、`title`、`summary`、`work_ids`、`article_ids` を設定します。各 ID はその種類の中で一意にし、関連 ID は実在する公開コンテンツを指してください。未公開コンテンツへの関連 ID はビルドエラーになります。

外部 URL は `http` / `https` のみ許可します。Markdown 本文は自分で確認した文章とリンクだけを入れてください。画像は公開を許可されたものだけを `assets/` などに配置してください。

## GitHub Pages で公開

1. 公開内容を確認して `main` ブランチに push します。
2. GitHub リポジトリの **Settings → Pages → Build and deployment → Source** で **GitHub Actions** を選びます。
3. `.github/workflows/pages.yml` がビルドして公開します。URL は `https://sawanoto.github.io/sawamoto/` です。

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
