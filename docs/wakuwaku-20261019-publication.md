# ワクワク広場の記事追加

- 記事URL： https://sawanoto.github.io/sawamoto/writing/support-center-wakuwaku-20261019/
- 体験日：2026年10月19日。公開日（原稿では2026年10月20日）は、本人の修正完了後、実際の公開日に合わせてメタデータと本文を更新してください。
- カテゴリは依頼どおり「子育て」、シリーズは既存の「支援センター巡り」。トップの最新記事、Writing一覧、シリーズ一覧、サイトマップに自動追加。
- 記事ファイル：`content/writing/support-center-wakuwaku-20261019.md`
- `build.py`：記事ごとの任意の `seo_title` / `meta_description` に対応。指定がない記事は従来のタイトル・要約を維持。SEOタイトルには既存仕様どおりサイト名が付く。表示見出しは記事タイトルのまま。
- 内部の記録方法についての推測を削除し、先生一人という記述は利用者が見た範囲に限定。

## 施設の確認（2026年10月20日）

- 北信福祉会の沿革 https://www.happyisland.org/company ：「わくわくひろばにじ」は2013年2月1日開設。
- 福島県の紹介 https://www.pref.fukushima.lg.jp/sec/21055a/okunai34.html ：661㎡、壁全体の遮蔽シート、運営主体を確認。
- 法人の紹介 https://www.happyisland.org/facility/child/163.html ：遮蔽シート採用、2018年4月以降は団体予約のみで個人利用不可という案内。
- 園公式 https://www.hokushin-hoikuen.com/support ：正式名は「ほくしん子育て支援センター」。本文に反映。
- 園公式の2025年7月通信 https://www.hokushin-hoikuen.com/wp-content/uploads/2025/03/e0a34bc8516e36cd51a43d8ae915fee7.pdf ：「わくわく広場遊び」の活動は確認できるが、「にじ」との同一性は明記されていない。
- 福島市の2026年10月月予定表 https://www.city.fukushima.fukushima.jp/kosodate-portal/asobiba/shiencenter/13289.html からリンクされた https://www.city.fukushima.fukushima.jp/material/files/group/53/hokusin810.pdf は取得タイムアウト。
- 今回の会場と「にじ」の同一性、震災・原発事故後の整備事業との直接的な関係は確認できなかった。記事では未確認と明記し、今回の会場の開設年・面積・建設目的として断定しない。

## 検証

- Pythonビルド成功（22ページ）、既存Pythonテスト8件、季節テーマJavaScriptテスト5件成功。
- Chromiumで320px・390px・1280pxの記事表示を確認。見出し重複・横はみ出しなし。
- SEOタイトル・説明、公開日・体験日、一覧・シリーズ・サイトマップの導線を確認。
- 追加前後の生成物比較で、既存記事詳細・作品・About・アセットの出力が不変であることを確認。

## 文体の更新

再依頼の指定に合わせ、本文と一覧用要約を「です・ます調」に統一しました。心の中の問いかけ・体言止めには自然な語り口を残しています。公開日・体験日・URL・施設情報の確認状況は維持しています。

## 公開待ち

この原稿は本人の修正待ちのドラフトPRで管理します。mainへのマージ・公開は本人の明示的な依頼まで行いません。main上の先行公開は取り消しています。
