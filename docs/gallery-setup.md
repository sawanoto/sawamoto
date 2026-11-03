# スマホから作品を残す

## 公開先と現在の状態

- 子どもの制作: https://sawanoto.github.io/sawamoto/gallery/children/
- 手仕事・実物作品: https://sawanoto.github.io/sawamoto/gallery/handwork/
- 案内ページ: https://sawanoto.github.io/sawamoto/gallery-admin/
- 実際の投稿画面: 初期設定で作られる `https://sawamoto-gallery.<あなたのWorkersサブドメイン>.workers.dev/`

ギャラリーは既存のGitHub Pagesで公開します。投稿画面は別サービスのCloudflare Worker上です。案内ページに投稿フォームやトークン入力欄はありません。認証設定・Secretが揃わない場合、Workerは画面もAPIも503で拒否します。写真・個人情報を設定前の動作確認として公開しないでください。

## 方式を選んだ理由

| 方式 | 日常操作・初期設定 | 認証情報と維持 |
| --- | --- | --- |
| ブラウザからGitHub APIへ直接PAT送信 | 実装は簡単だが、トークン入力や保管が必要 | スマホへの恒久保存を避けたいので不採用 |
| GitHub OAuth + バックエンド | GitHubログイン、OAuth登録・コールバック・セッション管理が必要 | 安全に実装可能だが、公開リポジトリ向けOAuthの権限が広い |
| GitHub App + バックエンド | インストール・秘密鍵・JWT・トークン発行処理が必要 | リポジトリを限定でき、将来の有力候補。本人専用には設定が多い |
| **Cloudflare Access + Worker + fine-grained PAT** | **メールのワンタイムコードで本人認証。初回のみ下記設定** | **PATはWorker Secret。対象リポジトリのみ。ブラウザには渡さない** |

Cloudflareの利用規約・無料枠・料金条件は登録時に本人が確認してください。既存のPages公開方式・記事ファイル・デジタル作品を移し替える必要はありません。外部サービス設定はこの実装作業では実施していません。

## 初回設定（スマートフォンのブラウザで可能）

画面名はサービス側の更新で変わる場合があります。GitHubの設定画面が見えにくい場合はブラウザの「デスクトップ用Webサイトを表示」を利用してください。トークンやメールの認証コードを記事・チャット・リポジトリのファイルに貼らないでください。

1. **Cloudflareのアカウントを作成**し、Workers & PagesでWorkersサブドメインを設定します。Account IDを控えます。API Tokensで **Edit Cloudflare Workers** を基に、対象アカウントに限定したデプロイ用APIトークンを作成します。アカウントのWorkers Scriptsの編集と、User Detailsの参照など、Wranglerに必要な権限を有効にしてください。カスタムドメインやDNS変更は必須ではありません。
2. **GitHubの専用トークンを作成**します。Settings → Developer settings → Personal access tokens → Fine-grained tokens。Repository accessは **Only select repositories → sawanoto/sawamotoだけ**、Repository permissionsは **Contents: Read and write**、Metadata: Read。Workflow・Administrationなどの権限は不要です。有効期限を設定し更新日を控えます。このトークンは日常の投稿には入力しません。
3. [GitHubリポジトリ設定](https://github.com/sawanoto/sawamoto/settings/secrets/actions) → Secrets and variables → Actions → Repository secretsに次の4件を登録します。
   - `CLOUDFLARE_API_TOKEN`: 手順1のデプロイ用トークン
   - `CLOUDFLARE_ACCOUNT_ID`: 手順1のAccount ID
   - `GALLERY_REPO_TOKEN`: 手順2のGitHub専用トークン
   - `GALLERY_OWNER_EMAIL`: 投稿する本人のメールアドレス（手順5のAccessポリシーにも同じ値を設定）
4. [Actions](https://github.com/sawanoto/sawamoto/actions/workflows/gallery-service.yml) → **Deploy private gallery service** → Run workflow → mainを選択して実行します。初回は認証変数が空なので **503（初期設定待ち）が正常** です。Workerのデプロイ先URLはCloudflareのWorkers & Pages → sawamoto-galleryで確認できます。
5. **Cloudflare Zero Trust / Accessを設定**します。Workers & Pages → sawamoto-gallery → Settings → Domains & Routesで **workers.devのAccess保護を有効** にします。必要ならZero Trustチームを作成し、Access → ApplicationsでこのWorkerの **ホスト全体（パスを限定しない）** を対象にSelf-hostedアプリを作成してください。`/api/*`も必ず対象に含めます。AllowポリシーのIncludeは **Emails → 自分のメールアドレス1件だけ**。Everyone、Bypass、Service Authは使いません。Login methodsにOne-time PINを有効にし、セッション有効期間は24時間などにします。WorkersのプレビューURLは構成で無効にしています。
6. Accessアプリの **Application Audience (AUD)** と、Zero Trustの **team name**（`https://<team>.cloudflareaccess.com` の `<team>` 部分）を確認します。[GitHub ActionsのVariables](https://github.com/sawanoto/sawamoto/settings/variables/actions) に次を登録します。
   - `GALLERY_ACCESS_TEAM`: team nameのみ（URL全体ではありません）
   - `GALLERY_ACCESS_AUD`: アプリのAUD
7. 手順4のWorkflowをもう一度実行します。投稿用URLをスマートフォンで開き、本人メールに届くコードでログインします。ホーム画面への追加やブックマークを推奨します。本人メールとGitHubトークンはGitHub Actions SecretからWorker Secretへ登録し、デプロイの公開ログにも値を出しません。チーム名とAUDだけをVariablesとして使います。ブラウザには有効期限付きのAccessセッションCookieだけを持たせ、GitHubトークンは渡しません。
8. **利用開始前に確認**します。プライベートブラウズでは認証が必要なこと、別のメールでは入れないことを確認し、個人情報のないテスト写真を1枚投稿します。Actionsの **Deploy GitHub Pages** 成功後、対応する公開ギャラリーに表示されることを確認します。作品編集・削除も一度試してください。Accessの設定を変えた後はこの確認を繰り返します。

CloudflareとGitHubのアカウントは本人が管理してください。こちらから登録・承認やSecret値の代理入力は行っていません。mainに保護ルールがあり直接コミットできない場合は保存時にエラーになります。保護を緩める前に運用を検討してください（投稿用PRの自動マージは未実装）。

## 毎回の投稿

1. ホーム画面の投稿画面を開く（セッションが切れたときだけメール認証）。
2. 「子どもの作品」か「自分の作品」を選ぶ。
3. 「写真を選ぶ」で複数枚選択、または「カメラで撮影」。
4. プレビューを確認して **投稿する**。名前・説明は空のままで構いません。

日付はスマホの今日の日付です。過去の制作物は任意項目を開いて制作日を変更してください。複数写真は1つの作品になります。別作品として並べたいときは分けて投稿してください。画像は順番に処理し、最大12枚、長辺1920px・JPEG品質85%を目安に容量に応じて圧縮（1枚1.5MB以下）。EXIFの向きを反映してCanvasで描画し直し、EXIF/GPSなどの元メタデータを引き継ぎません。WorkerでもJPEGのAPP/COMメタデータを除去します。ファイル名はUUIDなので元の写真名を公開しません。

HEICなどブラウザで読み込めない画像はエラーになります。写真アプリでJPEGに書き出すか、端末のカメラ設定で互換性優先/JPEGを利用してください。実機のiOS/AndroidやHEICの直接変換は未検証です。位置情報の削除は、写真に写り込んだ顔・名札・背景の除去ではありません。本人がプレビューで確認してください。

## あとから編集

「これまでの作品」の作品をタップし、任意項目を開いて変更 → **変更を保存**。関連記事・販売ページのURLは後付けできます。記事作成・公開は従来のルールで独立して行い、公開したURLを貼り付けます。写真追加は編集中に写真を選択します。作品削除は確認画面を出し、JSONと対応画像を同じコミットで削除します。個別写真の差し替え・削除・順序変更は未実装です。

公開順は制作日の新しい順、同日は初回投稿時刻順。公開ギャラリーは1ページ24作品でページ分けされます。写真をタップすると拡大、閉じるボタン／Escapeで戻ります。JavaScriptが無効でも画像ファイルへのリンクは使えます。

## 保存と失敗時

- データ: `content/galleries/<UUID>.json`。画像: `assets/images/galleries/<UUID>.jpg`。記事の `YYYY-MM-DD-slug.md` 規則とは独立しています。
- GitHub Git Data APIで画像・JSONを一つのtree/commitにまとめ、mainを **forceなし** で更新します。途中失敗で公開ファイルの一部だけが反映されることはありません。失敗前に作成された参照のないblob/commitは公開対象になりません。
- 編集にはJSONのblob SHAを付け、競合時は409で拒否します。他の更新を上書きせず、一覧から最新内容を読み直せます。通信切断で同じ内容を再送しても、同じ作品IDと内容なら保存済みとして扱います。
- 失敗時には理由を表示し、開いている画面には入力・写真を残します。同じボタンで再試行してください。一覧の「読み直す」で保存済みかも確認できます。画面を閉じる／再読み込みすると未保存の入力は失われます。オフラインの永続下書きは作っていません。
- 保存成功はGitHubコミットの成功です。Pagesの完了とは別なので数分待ち、[Actions](https://github.com/sawanoto/sawamoto/actions)で公開結果を確認してください。専用PATによるコミットなので既存pushワークフローが起動します（ActionsのGITHUB_TOKENは投稿に使いません）。
- GitHubトークン失効は、新しいfine-grained PATを同じ `GALLERY_REPO_TOKEN` Secretに登録し、投稿サービスのWorkflowを再実行します。Cloudflareデプロイ用トークンの失効も同様です。
- 写真は公開Gitリポジトリにも保存されます。**削除してもGit履歴や配布済みコピーには残ります**。公開できない写真は投稿しないでください。誤公開時は削除に加えて履歴・キャッシュへの対応が別途必要です。
- GitHub APIのレート制限・リポジトリ容量制限があります。一覧は作品ごとのJSONを取得するため、数千件の規模になる前に読み取りの分割や画像保存先を再検討してください。

## 保守・検証

```sh
python scripts/check_writing.py
python -m unittest discover -s tests -p 'test_*.py'
python build.py
cd gallery-service
npm ci
npm test
npx wrangler deploy --dry-run
# リポジトリ直下でPlaywrightとChromiumを用意して実行
node tests/gallery.browser.cjs
```

`gallery-service/.dev.vars`、Cloudflare Secret、GitHub Secret以外にトークンを書かないでください。`.dev.vars`はgitignore対象です。Workerの本体には設定未完了の拒否・Access JWT署名/issuer/audience/有効期限/本人メール確認・同一Origin確認・パス固定・入力検証・保存時の競合確認を実装しています。

実装時に確認した項目と未検証項目は [gallery-verification.md](gallery-verification.md) を参照してください。
