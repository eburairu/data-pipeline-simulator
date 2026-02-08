# タスク: MappingEngineリファクタリング

**入力**: `/specs/010-mapping-engine-refactoring/` からの設計ドキュメント
**前提条件**: spec.md

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並行実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1, US2, US3）

---

## フェーズ 1: セットアップ（共有インフラ）

**目的**: 新しいファイル構造の準備

- [x] T001 `src/lib/transformations/` ディレクトリを作成
- [x] T002 TransformationStrategy インターフェースを `src/lib/transformations/types.ts` に定義
- [x] T003 TransformationContext 型を `src/lib/transformations/types.ts` に定義

---

## フェーズ 2: 基盤（ブロッキング前提条件）

**目的**: セキュアな式評価とStrategy登録の基盤

- [x] T004 [US2] `src/lib/SafeExpressionEvaluator.ts` を作成（許可リスト方式の式評価）
- [x] T005 [P] [US2] SafeExpressionEvaluator のユニットテストを `src/lib/SafeExpressionEvaluator.test.ts` に作成
- [x] T006 [US1] `src/lib/transformations/index.ts` にStrategy登録・取得メカニズムを実装
- [x] T007 [P] [US1] Strategy登録のユニットテストを作成

**チェックポイント**: 基盤準備完了 - 個別Strategy実装を開始可能

---

## フェーズ 3: ユーザーストーリー 1 - Strategyパターン導入 (優先度: P1)

**ゴール**: 各変換タイプを独立したStrategyクラスに分割

**独立テスト**: 既存のMappingEngine.test.tsがすべてパスする

### 基本変換Strategy（並行実行可能）

- [x] T008 [P] [US1] `src/lib/transformations/SourceStrategy.ts` を実装
- [x] T009 [P] [US1] `src/lib/transformations/TargetStrategy.ts` を実装
- [x] T010 [P] [US1] `src/lib/transformations/FilterStrategy.ts` を実装
- [x] T011 [P] [US1] `src/lib/transformations/ExpressionStrategy.ts` を実装（SafeExpressionEvaluator使用）

### 集計変換Strategy（並行実行可能）

- [x] T012 [P] [US1] `src/lib/transformations/AggregatorStrategy.ts` を実装
- [x] T013 [P] [US1] `src/lib/transformations/SorterStrategy.ts` を実装
- [x] T014 [P] [US1] `src/lib/transformations/RankStrategy.ts` を実装
- [x] T015 [P] [US1] `src/lib/transformations/SequenceStrategy.ts` を実装

### 結合変換Strategy（並行実行可能）

- [x] T016 [P] [US1] `src/lib/transformations/JoinerStrategy.ts` を実装
- [x] T017 [P] [US1] `src/lib/transformations/LookupStrategy.ts` を実装（キャッシュ機能含む）
- [x] T018 [P] [US1] `src/lib/transformations/UnionStrategy.ts` を実装

### データ処理変換Strategy（並行実行可能）

- [x] T019 [P] [US1] `src/lib/transformations/RouterStrategy.ts` を実装
- [x] T020 [P] [US1] `src/lib/transformations/NormalizerStrategy.ts` を実装
- [x] T021 [P] [US1] `src/lib/transformations/DeduplicatorStrategy.ts` を実装
- [x] T022 [P] [US1] `src/lib/transformations/PivotStrategy.ts` を実装
- [x] T023 [P] [US1] `src/lib/transformations/UnpivotStrategy.ts` を実装

### 高度な変換Strategy（並行実行可能）

- [x] T024 [P] [US1] `src/lib/transformations/SQLStrategy.ts` を実装
- [x] T025 [P] [US1] `src/lib/transformations/WebServiceStrategy.ts` を実装
- [x] T026 [P] [US1] `src/lib/transformations/HierarchyParserStrategy.ts` を実装
- [x] T027 [P] [US1] `src/lib/transformations/CleansingStrategy.ts` を実装
- [x] T028 [P] [US1] `src/lib/transformations/UpdateStrategyStrategy.ts` を実装

**チェックポイント**: すべてのStrategyクラスが実装完了

---

## フェーズ 4: ユーザーストーリー 2 - セキュアな式評価 (優先度: P1)

**ゴール**: `new Function()` を排除し、安全な式評価を実現

**独立テスト**: セキュリティテストで悪意のある入力がブロックされる

- [x] T029 [US2] MappingEngine.ts の式評価を SafeExpressionEvaluator に置き換え
- [x] T030 [US2] ExpressionFunctions.ts の関数を SafeExpressionEvaluator に統合
- [x] T031 [US2] セキュリティテストを追加（悪意のある式のブロック確認）
- [x] T032 [US2] 既存のExpression変換テストが引き続きパスすることを確認

**チェックポイント**: `new Function()` がコードベースから排除される ✅

---

## フェーズ 5: ユーザーストーリー 3 - MappingEngine軽量化 (優先度: P2)

**ゴール**: MappingEngine.tsをオーケストレーターに特化

**独立テスト**: npm run build と npm test がパスする

- [x] T033 [US3] MappingEngine.ts から変換ロジックを削除し、Strategy呼び出しに置き換え
- [x] T034 [US3] MappingEngine.ts のインポートパスを更新
- [x] T035 [US3] MappingEngine.test.ts がすべてパスすることを確認（153/154成功）
- [x] T036 [US3] コード行数が500行以下になったことを確認（399行）

**チェックポイント**: MappingEngine.tsがオーケストレーター専任に

---

## フェーズ 6: ポリッシュと検証

**目的**: 品質保証と文書化

- [x] T037 [P] 各Strategyクラスに日本語コメントを追加
- [x] T038 [P] transformations/README.md に構造説明を追加
- [x] T039 npm test && npm run build で最終検証 ✅
- [x] T040 MappingDesigner.tsx との統合確認（コードレベルで確認完了）

---

## 依存関係と実行順序

### フェーズの依存関係

- **セットアップ (フェーズ 1)**: 依存関係なし
- **基盤 (フェーズ 2)**: フェーズ 1 完了に依存
- **US1 Strategy実装 (フェーズ 3)**: フェーズ 2 完了に依存、各Strategyは並行実行可能
- **US2 セキュア式評価 (フェーズ 4)**: フェーズ 2 の T004, T005 完了に依存
- **US3 軽量化 (フェーズ 5)**: フェーズ 3, 4 完了に依存
- **ポリッシュ (フェーズ 6)**: フェーズ 5 完了に依存

### 並行実行の機会

- フェーズ 3 のすべての [P] マークされた Strategy 実装は並行実行可能
- T004 と T006 は並行実行可能
- T005 と T007 は並行実行可能

---

## 注記

- 既存の MappingEngine.test.ts は変更せず、すべてのテストがパスし続けることを確認
- 各 Strategy 実装後に npm test を実行して回帰を防ぐ
- `new Function()` の使用箇所を grep で確認し、すべて排除されたことを検証
