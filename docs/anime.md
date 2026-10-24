# アニメ遍歴の更新

既存の `build.py` が `content/anime.json` と `content/anime-eras.json` を読み、年表と全詳細ページを生成します。追加サービス・DB・依存パッケージはありません。公開先は既存設定では `/sawamoto/anime/`、詳細は `/sawamoto/anime/<slug>/` です。各URLに `index.html` を生成するため、GitHub Pagesで直接開けます。

## 作品の追加

GitHub上で `content/anime.json` の配列に次のような1件を追加します。JSONは末尾カンマを使えません。

```json
{
  "id": "new-anime",
  "slug": "new-anime",
  "title": "追加する作品名",
  "releaseYear": null,
  "watchedPeriod": "社会人",
  "watchedYear": null,
  "watchedYearConfidence": "推定",
  "impression": "",
  "memory": "",
  "relatedWorks": [],
  "tags": [],
  "updatedAt": "2026-10-23",
  "era": "adult",
  "mediaType": "アニメ"
}
```

- `id` と `slug` はそれぞれ重複させず、一度公開した `slug` は維持します。slugは英小文字・数字・区切りのハイフンのみ。日本語や記号は `title` に自由に使えます。
- `releaseYear` は対象アニメの放送開始年。シリーズや版が未特定なら `null` とし、任意の `releaseNote` に補足を記入できます。
- `watchedYear` は実際の視聴年。不明なら必ず `null` にし、放送開始年から埋めません。
- `watchedPeriod` は表示する視聴時期。`watchedYearConfidence` はその時期の確度（`確定`・`推定`・`不明`）。大まかな時代が確定していても具体的な年は `null` にできます。
- `era` は `childhood`（小学生以前）／`middle`（中学生）／`high`（高校生）／`university`（大学生）／`adult`（社会人）／`unknown`（視聴時期未確定）。複数時代にまたがる場合は1か所に置き、`watchedPeriod` に範囲を書きます。超電磁砲は高校生欄に「中学生〜高校生頃・推定」として掲載しています。
- `memory` と `impression` は本文の文字列。空文字なら「今後追記予定」。段落は `\n\n` で区切ります。HTML・Markdownは解釈せず安全なテキストとして表示します。
- `relatedWorks` は同じJSON内の作品の `id` の配列。実在しないID、重複ID・slug、不正な年などはビルドで検出します。
- `tags` は短い文字列の配列。`updatedAt` は更新日（YYYY-MM-DD）。
- 人形劇は `mediaType: "人形劇"` とすると年表・詳細の双方でアニメとの違いを表示します。

ファイル内の並び順が各時代の作品の表示順になります。追加後のビルドで年表・詳細ページ・サイトマップすべてに反映されます。

## 時代別の思い出

`content/anime-eras.json` の対象時代の `heading`（見出し）、`memory`（本文）を編集してください。`id` は作品側の `era` と対応するため維持します。本文の段落は `\n\n` です。作品ごとの思い出は `anime.json` の `memory` を更新します。

## ビルドと確認

```sh
pip install -r requirements.txt
python build.py
python -m unittest discover -s tests -p 'test_*.py'
node --test --test-isolation=none tests/seasonal.test.cjs
# Playwright と Chromium がある開発環境で実行
node tests/anime.browser.cjs
# システムの Chromium を使う場合
CHROMIUM_PATH=/usr/bin/chromium node tests/anime.browser.cjs
```

生成物はGit管理対象外の `dist/`。公開は既存と同じくmainへのpushを契機とするGitHub Pagesワークフローを使用します。既存のPR用ワークフローにもアニメのブラウザ確認を追加しています。公開操作は今回実施していません。

初期データはアニメ28作品＋関連視聴の人形劇1作品。全作品の具体的な視聴年は未提供のため `null` です。ドラえもんは1979年版の開始年を版未特定の注記付きで掲載、しまじろうはシリーズ未特定のため開始年も `null`。感想や視聴歴は依頼本文にある情報のみ使用しています。

外部検索ツールが情報を返さなかったため、作品の正式表記・放送開始年を公式サイトとオンライン照合する確認は未完了です。入力データの表記を基本に一般に使われる表記と開始年を登録しており、公開前に必要に応じて対象シリーズを確認してください。公式画像は使用していません。
