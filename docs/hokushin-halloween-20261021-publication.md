# 北信学習センター・キッズクラブの記事追加

- 記事：`content/writing/support-center-hokushin-halloween-20261021.md`
- 訪問日・記事日付：2026年10月21日。
- 公開時のURL：https://sawanoto.github.io/sawamoto/writing/support-center-hokushin-halloween-20261021/
- カテゴリー「子育て」、既存シリーズ「支援センター巡り」。Writing一覧・シリーズ一覧・トップ・サイトマップへ自動追加。
- 共通テンプレート・CSS・既存記事は変更していない。写真の追加なし。
- 体験部分は依頼原稿のみをもとにした。補足は記事作成時の調査と明示し、当日の先生方の説明と区別した。指定された除外テーマ、参加者の個人情報は記載していない。

## 確認した参考資料（2026年10月21日）

- Alder Hey Children’s NHS Foundation Trust『Fine Motor Skills Five Steps to Function』。初公開年は記載なし。ページの最終レビュー日は2024年9月4日。微細運動・目と手の協応の定義、シールを剥がして紙に貼る活動例を確認。https://www.alderhey.nhs.uk/conditions/patient-information-leaflets/fine-motor-skills-five-steps-to-function/
- 文部科学省『幼稚園教育要領』2017年告示。主体的な活動、自分なりに考えたり表現したりすることについて確認。シール貼りの実験的な効果の根拠とはしていない。https://www.mext.go.jp/component/a_menu/education/micro_detail/__icsFiles/afieldfile/2018/04/24/1384661_3_2.pdf
- Strooband KFB, de Rosnay M, Okely AD, Veldman SLC『Systematic Review and Meta-Analyses: Motor Skill Interventions to Improve Fine Motor Development in Children Aged Birth to 6 Years』2020年。PubMed要旨で複数の介入プログラムの結果、研究間の違いとバイアスに関する限界を確認。シール貼り単独や今回の活動の効果は断定しない。https://pubmed.ncbi.nlm.nih.gov/31977589/

## 動作確認

- `.venv/bin/python build.py`：23ページ生成成功。
- 既存Pythonテスト8件成功。
- Chromiumで320px・390px・1280px表示を確認。横はみ出しなし。390pxの画面を目視確認。
- 新規記事の単一h1、写真なし、シリーズへの戻りリンクを確認。
- トップ・Writing・シリーズ一覧・サイトマップに新規URLが含まれることを確認。
- 追加前後の生成物を比較。新規記事以外はトップ・Writing一覧・シリーズ一覧・サイトマップのみ更新。既存記事詳細・About・作品・アセットは不変。

## 公開状況

ローカル実装・検証済み。README記載の本人レビュー後にmainへマージする手順に従い、mainへのマージ・本番公開は行っていない。
