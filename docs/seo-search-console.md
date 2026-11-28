# 検索での発見とサイトマップ

公開記事は `content/writing/` の `draft` を外して main に反映すると、既存の GitHub Pages ワークフローで HTML と `sitemap.xml` に追加されます。記事一覧から詳細へは通常の HTML リンクを出力します。記事の `published`（更新時は `updated`）をサイトマップの `lastmod` に使います。原稿の訪問日や制作日を公開日として扱いません。

公開前に `python build.py` と `python scripts/check_seo.py` を実行してください。検査はサイトマップの XML、URL の重複、ページの存在、タイトル・説明・canonical・言語・noindex、トップからの HTML リンク到達性を確認します。PR と公開ワークフローでも同じ検査を行います。

Google Search Console では `https://sawanoto.github.io/sawamoto/` の URL プレフィックス プロパティを選び、サイトマップに `https://sawanoto.github.io/sawamoto/sitemap.xml` を送信します。以前の送信が「取得できませんでした」のままなら、詳細画面で最終取得日時とエラーを確認し、現行の URL を再送信してください。代表的な記事は URL 検査のライブテストで、クロール可・ページ取得成功・canonical を確認します。送信はクロールや登録を保証しません。

Google が参照するホスト直下の [robots.txt](https://sawanoto.github.io/robots.txt) は、ユーザーサイトの [sawanoto/sawanoto.github.io](https://github.com/sawanoto/sawanoto.github.io) で管理しています。同じホストの全プロジェクトのクロールを許可し、澤本公式サイトのサイトマップを案内します。`/sawamoto/robots.txt` は直接取得できますが、Google のクロール規則はホスト直下のファイルが決めます。

## 人物情報と構造化データ

人物情報は `content/site.json` にまとめ、About の `ProfilePage` で `Person` を定義します。`links`・`about_links` のうち、本人の公開プロフィールとして確認したリンクに `"profile": true` を設定すると `sameAs` にも反映されます。トップの `WebSite`、記事の `BlogPosting`、作品の `CreativeWork` などは同じ人物 ID を参照します。

記事・作品ページの JSON-LD は既存の原稿情報から生成します。記事の更新日は `updated` があるときに出力します。記事で紹介する本人制作の実物作品は、記事内に登場する作品名を `featured_work` に指定できます。ブラウザーで動く作品には `schema_type: "SoftwareApplication"`、制作史に含まれるシリーズには `collection_parts` を使えます。公開 HTML と構造化データの言語は日本語です。トップを英語表示に切り替えると、同じ URL 上の表示とタイトル・説明・OGP が切り替わります。

反映後は Search Console の URL 検査でトップ、About、代表記事、作品をライブテストし、取得した HTML 内の JSON-LD とユーザー指定 canonical を確認します。インデックス登録後は Google が選んだ canonical も確認できます。Google の対応する検索機能は [リッチリザルト テスト](https://search.google.com/test/rich-results) で About と代表記事を、一般の Schema.org の型とプロパティは [Schema Markup Validator](https://validator.schema.org/) でトップと作品を確認できます。
