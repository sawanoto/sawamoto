# 検索での発見とサイトマップ

公開記事は `content/writing/` の `draft` を外して main に反映すると、既存の GitHub Pages ワークフローで HTML と `sitemap.xml` に追加されます。記事一覧から詳細へは通常の HTML リンクを出力します。記事の `published`（更新時は `updated`）をサイトマップの `lastmod` に使います。原稿の訪問日や制作日を公開日として扱いません。

公開前に `python build.py` と `python scripts/check_seo.py` を実行してください。検査はサイトマップの XML、URL の重複、ページの存在、タイトル・説明・canonical・言語・noindex、トップからの HTML リンク到達性を確認します。PR と公開ワークフローでも同じ検査を行います。

Google Search Console では `https://sawanoto.github.io/sawamoto/` の URL プレフィックス プロパティを選び、サイトマップに `https://sawanoto.github.io/sawamoto/sitemap.xml` を送信します。以前の送信が「取得できませんでした」のままなら、詳細画面で最終取得日時とエラーを確認し、現行の URL を再送信してください。代表的な記事は URL 検査のライブテストで、クロール可・ページ取得成功・canonical を確認します。送信はクロールや登録を保証しません。

Google が参照するホスト直下の [robots.txt](https://sawanoto.github.io/robots.txt) は、ユーザーサイトの [sawanoto/sawanoto.github.io](https://github.com/sawanoto/sawanoto.github.io) で管理しています。同じホストの全プロジェクトのクロールを許可し、澤本公式サイトのサイトマップを案内します。`/sawamoto/robots.txt` は直接取得できますが、Google のクロール規則はホスト直下のファイルが決めます。
