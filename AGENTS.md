# 記事の作成・編集ルール

このルールはリポジトリ全体に適用します。Codex Cloud を含むエージェントは、記事の作成・編集時に従ってください。

## content/writing の命名

- 新規記事は `content/writing/YYYY-MM-DD-descriptive-name.md` に作成します。説明部分は半角小文字英数字とハイフンを使います。
- 日付は JSON front matter の `published`（初回公開日、`YYYY-MM-DD`）と一致させます。訪問日・体験日・制作日・Gitへの追加日を公開日として推測しないでください。
- 公開日未定の下書きは `draft: true` と `written`（執筆日、`YYYY-MM-DD`）を設定し、執筆日で仮命名します。公開時に `published` を設定し、ファイル名の日付を合わせます。過去に公開した記事を下書きに戻した場合は、既存の `published` とファイル名の日付を保持します。
- 冒頭は既存記事と同じ `---` で囲む JSON 形式です。URL用の `slug` を必ず明記し、ファイル名の日付から切り離します。新規記事では通常、説明部分と同じ値を使用します。
- `slug` は半角小文字英数字とハイフンで一意にします。下書きも含む他の記事、`content/series.json` のシリーズと重複させません。

## 既存記事を維持する

- 既存記事の `id` と `slug` は維持します。ファイル名を変えても公開URLを変えないでください。既存の `slug` に年や体験日が含まれていても削除しません。
- `published` は初回公開日、`updated` は更新日、`visit_date` は訪問日、`period` は出来事・制作時期です。更新時に `published` を上書きしません。
- 依頼に含まれない本文・画像・画像参照・関連ID・公開状態は変更しません。下書きの編集・改名だけで `draft` を解除したり、公開日を捏造したりしません。
- ファイルを改名したら README・docs・テストなどの原稿パス参照を確認します。公開URLと原稿パスを混同しないでください。

## 確認

依存関係は `python -m pip install -r requirements.txt` で準備します。変更後は次を実行し、問題を修正してください。

```sh
python scripts/check_writing.py
python -m unittest discover -s tests -p 'test_*.py'
python build.py
```

Windows では既存テストの文字コードのため `PYTHONUTF8=1` を設定してください。命名検証は下書きも対象にし、PRの既存CIでも実行されます。詳細と改名前後の対応表は README の「記事ファイル名とURL」および `docs/writing-filenames.md` を参照してください。

## 作品写真ギャラリー

- ギャラリーは `content/galleries/<UUID>.json` と `assets/images/galleries/<UUID>.jpg`。記事とは独立させ、既存記事や作品の公開状態・画像を勝手に移行しません。
- 認証情報は公開HTML・JS・JSONに含めません。投稿サービスは `gallery-service/` のAccess JWT検証を必須にし、初期設定未完了時の拒否を維持します。
- ギャラリー変更時は上のPython確認に加え、`cd gallery-service && npm ci && npm test && npx wrangler deploy --dry-run`、直下で `node tests/gallery.browser.cjs` を実行します（Playwright/Chromium必要）。
- `docs/gallery-setup.md` の本人設定・公開写真の注意点と、実際に検証した範囲を維持してください。
