# Tasks: 017-error-handling-enhancement

## Phase 1: 準備とテスト作成
- [x] `src/lib/ArchiveEngine.ts` から `isCompressed` 関数をエクスポートする（もし非公開なら）。
- [x] 再現テストコードの作成 (`src/lib/MappingEngine_ErrorHandling.test.ts`):
    - [x] 圧縮ファイルを展開なしで読み込ませてエラーにならない現状を確認する（失敗するテスト）。 -> すでに実装済みだったため、パスするテストとして実装。
    - [x] カラム不一致のデータをDBに書き込ませてエラーにならない現状を確認する（失敗するテスト）。 -> すでに実装済みだったため、パスするテストとして実装。

## Phase 2: 実装 (MappingEngine)
- [x] `src/lib/MappingEngine.ts` の修正:
    - [x] ソース読み込み後の圧縮判定ロジックの追加。（確認済み）
    - [x] ターゲット書き込み前のカラム一致判定ロジックの追加。（確認済み）

## Phase 3: 検証
- [x] 作成したテストがパスすることを確認。
- [x] 既存のテスト (`MappingEngine.test.ts` 等) に影響がないことを確認。