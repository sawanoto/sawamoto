# 記事ファイル名の整理

基準コミット: `827938e`（main）。全24件中、公開22件・下書き2件を対象とする。

ファイル名は `YYYY-MM-DD-slug.md`。公開済み記事および公開日の記録がある下書きは既存の `published`、公開日未定の下書きは `written` を仮の日付として使用する。末尾の年・体験日はファイル名から省くが、公開URL用の `slug` には旧ファイル名をそのまま保存する。

## 日付の根拠

READMEでは `published` が公開日、`visit_date` が訪問日、`period` が制作時期・出来事の日付として定義されている。main の各記事の変更履歴でも、記録された `published` は変更されていない。ジョーモピアの記事は初期版に公開日がなく、後から `2026-10-16` が追加されている。バルーンの記事は公開対象だった履歴があり、現在は下書きなので元の公開日を残す。

Gitの追加日・マージ日とメタデータの日付が異なる記事もある。実際の初回配信時刻を証明するものではなく、今回は既存の公開日記録を採用し、日付の訂正は行わない。たとえば日本舞踊は体験日10月18日に対して公開日10月19日、あゆみは訪問日10月27日に対して公開日10月28日、ワクワク広場は体験日10月19日に対して公開日10月20日で命名する。

## 対応表

| 旧ファイル名 | 新ファイル名 | 日付の根拠 |
|---|---|---|
| `ai-radio-jomon-miyahata-2026.md` | `2026-10-18-ai-radio-jomon-miyahata.md` | 既存の公開日 |
| `asunaro-rhythmics-20261023.md` | `2026-10-23-asunaro-rhythmics.md` | 既存の公開日 |
| `azuma-teshigotoichi-20261025.md` | `2026-10-25-azuma-teshigotoichi.md` | 既存の公開日 |
| `jododaira-family-autumn.md` | `2026-10-23-jododaira-family-autumn.md` | 既存の公開日 |
| `jomopia-miyahata-acorns.md` | `2026-10-16-jomopia-miyahata-acorns.md` | 既存の公開日 |
| `knitting-my-own-time.md` | `2026-10-18-knitting-my-own-time.md` | 既存の公開日 |
| `male-parental-leave-ten-years.md` | `2026-10-14-male-parental-leave-ten-years.md` | 既存の公開日 |
| `mel-chan-knitted-vest.md` | `2026-10-14-mel-chan-knitted-vest.md` | 既存の公開日 |
| `nihon-buyou-20261018.md` | `2026-10-19-nihon-buyou.md` | 既存の公開日 |
| `parent-day-balloon-20261021.md` | `2026-10-21-parent-day-balloon.md` | 既存の公開日 |
| `starting-lifesketch.md` | `2026-10-16-starting-lifesketch.md` | 既存の公開日 |
| `support-center-ayumi-halloween-20261027.md` | `2026-10-28-support-center-ayumi-halloween.md` | 既存の公開日 |
| `support-center-halloween-craft-2026.md` | `2026-10-14-support-center-halloween-craft.md` | 既存の公開日 |
| `support-center-hokushin-halloween-20261021.md` | `2026-10-21-support-center-hokushin-halloween.md` | 既存の公開日 |
| `support-center-hokushin-halloween-20261028.md` | `2026-10-28-support-center-hokushin-halloween.md` | 既存の公開日 |
| `support-center-minnanoie-halloween-20261030.md` | `2026-10-30-support-center-minnanoie-halloween.md` | 既存の公開日 |
| `support-center-music-therapy-2026.md` | `2026-10-15-support-center-music-therapy.md` | 既存の公開日 |
| `support-center-quick-information-exchange-2026.md` | `2026-10-15-support-center-quick-information-exchange.md` | 既存の公開日 |
| `support-center-segami-hokkori-20261029.md` | `2026-10-29-support-center-segami-hokkori.md` | 既存の公開日 |
| `support-center-toriyano-20261026.md` | `2026-10-27-support-center-toriyano.md` | 既存の公開日 |
| `support-center-wakuwaku-20261019.md` | `2026-10-20-support-center-wakuwaku.md` | 既存の公開日 |
| `support-center-watching-over-2026.md` | `2026-10-15-support-center-watching-over.md` | 既存の公開日 |
| `tsuchiyu-imo-fes-20261024.md` | `2026-10-24-tsuchiyu-imo-fes.md` | 既存の公開日 |
| `while-clouds-change-color.md` | `2026-10-17-while-clouds-change-color.md` | 執筆日（未公開） |

## 互換性

- `build.py` は明示した `slug` をURL・canonical・関連リンク・サイトマップに使い、省略時は従来のファイル名にフォールバックする。
- 既存メタデータ値・本文・画像ファイル・画像参照・公開状態・関連IDは維持する。
- ファイル名順の変化で同日記事の順序が変わらないよう、読み込み結果はURL用slugでソートする。
- 画像は `assets/` または外部URLを参照するため改名不要。記事の旧URLも維持するため、本文や外部リンクの置換は不要。
- README・公開記録内のソース参照と、ファイル名を前提にするテストだけを更新する。既存の公開URLを参照するテストは変更しない。

## 検証結果

- 変更前（827938e）と変更後を `/sawamoto/` と `/` の両設定でビルド。各125ファイルのパスとSHA-256がすべて一致（93 HTMLページを含む）。
- 全24原稿で、追加した `slug` を除く既存メタデータと本文の一致を確認。画像・その他のコンテンツファイルは変更なし。
- `PYTHONUTF8=1 python -m unittest discover -s tests -p 'test_*.py'`：27件成功。Windowsでは既存テストの文字コード既定値に合わせるためUTF-8モードを使用。
- `node --test tests/seasonal.test.cjs`：5件成功。
- 回帰テストを追加：ソース再改名後の全生成ファイル一致、旧形式のURLフォールバック、不正slug・重複slugの拒否。既存の下書き非掲載・再公開・関連ID検証も成功。
