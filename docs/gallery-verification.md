# ギャラリーの検証記録

2026-11-03、実装環境で確認。公開用の作品・子どもの写真や架空のサンプル作品は追加していません。

| 項目 | 結果・方法 |
| --- | --- |
| 記事命名規則 | `python scripts/check_writing.py` 成功。既存記事は変更なし |
| サイト全体のPythonテスト | `python -m unittest discover -s tests -p 'test_*.py'` 34件成功 |
| HTML生成 | `python build.py` 成功、100ページ（既存97 + ギャラリー2 + 案内1） |
| 既存URL・本文 | mainの238077aを一時ディレクトリで生成して比較。既存97URLを保持。新ナビを除く既存HTMLの差分はWorksの新ギャラリーへの導線のみ |
| データ追加による表示 | Pythonテストで一時データ25件を読み込み、24件でのページ分け、文字のエスケープ、記事リンク、画像欠損の拒否を確認 |
| Workerテスト | `cd gallery-service && npm test` 9件成功。GitHub APIはモック |
| 認証と投稿防止 | 未設定503、未認証401、テスト用RSA署名の本人JWTの許可、他人・期限切れ・改ざんJWT拒否、別Originの書込み拒否を確認。実際のCloudflareログインは未検証 |
| 保存・編集・削除 | モックGitHubで複数写真とJSONの単一コミット、forceなしの更新、SHA競合の拒否、同じ内容の再送、リンク後付け、写真追加、JSONと写真の削除を確認。削除時に未保存の追加写真が公開されないことも確認 |
| スマホ表示 | Playwright + `/usr/bin/chromium`、320/375/768/1280pxで公開ギャラリーと管理フォームに横はみ出しなし。画像の拡大・Escapeで閉じる操作を確認 |
| スマホ投稿相当の操作 | `tests/gallery.browser.cjs`。実際の管理HTML/JSで写真だけの投稿、2枚同時投稿、子ども／自分の分類、編集・記事リンク追加・写真追加・削除を確認。投稿APIはモック |
| 画像圧縮・EXIF | 同ブラウザテストで4000×2000のJPEGにEXIF orientation=6を付加。960×1920に回転・縮小、元画像より小さいJPEG、1.5MB以下、EXIFの消失を確認。WorkerのAPP/COM除去は単体テスト |
| 失敗時 | モックAPIの502で写真・入力を維持し、同じ投稿ボタンで再試行して成功。実際の電波切断・端末再起動は未検証 |
| デプロイ可能なビルド | `npx wrangler deploy --dry-run` 成功。Workerと静的管理画面をバンドルできることを確認。実際のCloudflareへのデプロイは本人設定待ち |
| 依存パッケージ | `npm audit --omit=dev` 既知の脆弱性0件（検証時点） |
| 既存の年表 | `tests/life-timeline.browser.cjs` 成功。320/375/768/1280px、関連リンク、旧URL、タッチ／キーボードなど |
| 既存季節テーマ | `node --test tests/seasonal.test.cjs` 5件成功 |
| 既存の一日の記録 | `tests/daily-schedule.browser.cjs` は50行目のsummaryクリック待ちでタイムアウト。変更前238077aの隔離コピーでも同じ50行目で再現。成功扱いにしていない |

## 本人の初期設定後に必要な確認

- 実際のCloudflare Accessメール認証と別メールの拒否、プライベートブラウズでの認証要求。
- 実際のiPhone／Androidでの写真選択・カメラ撮影、HEICなど各端末の画像形式。
- GitHub専用PATによる本番コミット、push後のPages公開と公開写真の表示、編集・削除。
- Pages公開後の反映は実コミットからActionsを追って確認する。単体テストやモック投稿の成功だけで本番投稿・反映の成功とはしない。

手順は [gallery-setup.md](gallery-setup.md)。検証用の画像・一覧はメモリ／一時ディレクトリで使用し、公開リポジトリには登録していません。
