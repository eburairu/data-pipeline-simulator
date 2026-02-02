---
description: "コードベース改善と技術的負債削減のためのタスク"
---

# タスク: 006-codebase-improvements

**入力**: コードベース分析と `spec.md`
**前提条件**: なし

## フェーズ 1: 型安全とコアロジック

- [x] T001 [Type] `src/lib/ExpressionFunctions.ts` を `any` の代わりにジェネリクスを使用するようリファクタリング。
- [x] T002 [Type] `src/lib/i18n/translations.ts` に `TranslationKey` 型を定義し、`LanguageContext.tsx` を更新。

## フェーズ 2: アーキテクチャの分解

- [x] T003 [Refactor] `StorageView` を `src/App.tsx` から `src/components/views/StorageView.tsx` に抽出。
- [x] T004 [Refactor] `DatabaseView` を `src/App.tsx` から `src/components/views/DatabaseView.tsx` に抽出。
- [x] T005 [Refactor] `src/lib/migrations/DataMigration.ts` を作成し、`src/lib/context/DataContext.tsx`（または該当する場合は `SettingsContext.tsx`）からマイグレーションロジックを移動。

## フェーズ 3: UI標準化

- [ ] T006 [UI] キー・バリューペア編集用の `src/components/common/ParamInput.tsx` を作成。
- [ ] T007 [UI] `MappingTaskSettings.tsx` のインラインパラメータ入力を `ParamInput` に置き換え。
- [ ] T008 [UI] `DataSourceSettings.tsx` のインラインパラメータ入力を `ParamInput` に置き換え。

## フェーズ 4: パフォーマンスとポリッシュ

- [ ] T009 [Perf] `DatabaseView` にDOMの肥大化を防ぐためのレンダリング制限（最大100アイテム）を実装。
- [ ] T010 [Test] `npm test` と `npm run build` を実行してリグレッションがないことを確認。
