---
description: "システム全体のリファクタリングと型安全のためのタスク"
---

# タスク: 005-system-refactoring

**入力**: `.specify/specs/005-system-refactoring/` からの設計ドキュメント
**前提条件**: plan.md, spec.md

## フェーズ 1: セットアップ

**目的**: 環境とツールの検証

- [x] T001 リンター設定と現在のエラー数を確認

## フェーズ 2: 基盤（型安全とコンテキスト）

**目的**: 厳格な型定義を確立し、コアコンテキストを修正。

- [x] T002 [P] `src/lib/types.ts` に `DataRow`、`Schema`、`FieldDefinition` の厳格なインターフェースを定義
- [x] T003 [P] `src/lib/MappingTypes.ts` のマッピング型を統合・改善
- [x] T004 [US1] `src/lib/SettingsContext.tsx` をリファクタリングし、`any` を除去して定義された型を使用

## フェーズ 3: コアロジックリファクタリング（Zero Any）

**目的**: マッピングエンジンとコアロジックから `any` を除去。

- [x] T005 [US1] `src/lib/MappingEngine.ts` の `evaluateExpression` を厳格な型を使用するようリファクタリング
- [x] T006 [US1] `src/lib/MappingEngine.ts` の再帰的マッピングロジックを厳格な型を使用するようリファクタリング
- [x] T007 [US1] `src/lib/DataGenerator.ts` を新しい型定義を使用するよう更新
- [x] T008 [US1] `src/lib/Validation.ts` を新しい型定義を使用するよう更新

## フェーズ 4: フック抽出とロジック分離

**目的**: UIコンポーネントからロジックを分離。

- [x] T009 [US2] `src/lib/hooks/useSimulationTimers.ts` をタイマー管理用に作成
- [x] T010 [US2] `src/lib/hooks/useSimulationEngine.ts` を厳格な型と改善された状態管理を使用するようリファクタリング

## フェーズ 5: コンポーネントのモジュール化

**目的**: App.tsx をクリーンアップし、UIをモジュール化。

- [x] T011 [US3] `DatabaseView` ロジックを `src/components/views/DatabaseView.tsx` に抽出（新規ファイル）
- [x] T012 [US3] `StorageViews` ロジックを `src/components/views/StorageViews.tsx` に抽出（新規ファイル）
- [x] T013 [US3] `src/App.tsx` をクリーンアップし、抽出されたコンポーネントとフックを使用

## フェーズ 6: ポリッシュと検証

**目的**: 品質と安定性の確保。

- [x] T014 完全な型チェック（`tsc`）を実行し、エラーがゼロであることを確認
- [x] T015 リントチェック（`npm run lint`）を実行し、残りの警告を修正
- [x] T016 アプリケーション機能を検証（手動テスト）

## 依存関係と実行順序

- **フェーズ 2** は他のすべてをブロック。`SettingsContext` はあらゆる場所で使用されている。
- **フェーズ 3** はフェーズ 2 に依存。
- **フェーズ 4 & 5** はフェーズ 2 の後に並行実行可能だが、複雑なUIリファクタリングの前にフェーズ 3 を完了することを推奨。
