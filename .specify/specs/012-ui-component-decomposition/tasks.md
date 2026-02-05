# タスク: UIコンポーネント分割

**入力**: `/specs/012-ui-component-decomposition/` からの設計ドキュメント
**前提条件**: spec.md

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並行実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1, US2, US3, US4）

---

## フェーズ 1: セットアップ（共有インフラ）

**目的**: 新しいディレクトリ構造と共通インターフェースの準備

- [ ] T001 `src/components/settings/mapping/` ディレクトリを作成
- [ ] T002 `src/components/modals/` ディレクトリを作成
- [ ] T003 `src/components/widgets/` ディレクトリを作成
- [ ] T004 TransformationConfigProps インターフェースを `src/components/settings/mapping/types.ts` に定義
- [ ] T005 WidgetProps インターフェースを `src/components/widgets/types.ts` に定義

**チェックポイント**: ディレクトリ構造と型定義が準備完了

---

## フェーズ 2: 基盤（コンポーネント登録メカニズム）

**目的**: 動的コンポーネント読み込みの基盤

- [ ] T006 [US1] `src/components/settings/mapping/index.ts` に設定パネル登録メカニズムを実装
- [ ] T007 [US3] `src/components/widgets/index.ts` にウィジェット登録メカニズムを実装

**チェックポイント**: 基盤準備完了 - 個別コンポーネント分割を開始可能

---

## フェーズ 3: ユーザーストーリー 1 - MappingDesigner分割 (優先度: P1)

**ゴール**: 各変換タイプの設定UIを個別コンポーネントに分割

**独立テスト**: MappingDesignerで各変換タイプの設定が正常に動作する

### 基本変換設定パネル（並行実行可能）

- [ ] T008 [P] [US1] `src/components/settings/mapping/SourceConfigPanel.tsx` を作成
- [ ] T009 [P] [US1] `src/components/settings/mapping/TargetConfigPanel.tsx` を作成
- [ ] T010 [P] [US1] `src/components/settings/mapping/FilterConfigPanel.tsx` を作成
- [ ] T011 [P] [US1] `src/components/settings/mapping/ExpressionConfigPanel.tsx` を作成

### 集計変換設定パネル（並行実行可能）

- [ ] T012 [P] [US1] `src/components/settings/mapping/AggregatorConfigPanel.tsx` を作成
- [ ] T013 [P] [US1] `src/components/settings/mapping/SorterConfigPanel.tsx` を作成
- [ ] T014 [P] [US1] `src/components/settings/mapping/RankConfigPanel.tsx` を作成
- [ ] T015 [P] [US1] `src/components/settings/mapping/SequenceConfigPanel.tsx` を作成

### 結合変換設定パネル（並行実行可能）

- [ ] T016 [P] [US1] `src/components/settings/mapping/JoinerConfigPanel.tsx` を作成
- [ ] T017 [P] [US1] `src/components/settings/mapping/LookupConfigPanel.tsx` を作成
- [ ] T018 [P] [US1] `src/components/settings/mapping/UnionConfigPanel.tsx` を作成

### データ処理変換設定パネル（並行実行可能）

- [ ] T019 [P] [US1] `src/components/settings/mapping/RouterConfigPanel.tsx` を作成
- [ ] T020 [P] [US1] `src/components/settings/mapping/NormalizerConfigPanel.tsx` を作成
- [ ] T021 [P] [US1] `src/components/settings/mapping/DeduplicatorConfigPanel.tsx` を作成
- [ ] T022 [P] [US1] `src/components/settings/mapping/PivotConfigPanel.tsx` を作成
- [ ] T023 [P] [US1] `src/components/settings/mapping/UnpivotConfigPanel.tsx` を作成

### 高度な変換設定パネル（並行実行可能）

- [ ] T024 [P] [US1] `src/components/settings/mapping/SQLConfigPanel.tsx` を作成
- [ ] T025 [P] [US1] `src/components/settings/mapping/WebServiceConfigPanel.tsx` を作成
- [ ] T026 [P] [US1] `src/components/settings/mapping/HierarchyParserConfigPanel.tsx` を作成
- [ ] T027 [P] [US1] `src/components/settings/mapping/CleansingConfigPanel.tsx` を作成
- [ ] T028 [P] [US1] `src/components/settings/mapping/UpdateStrategyConfigPanel.tsx` を作成

### MappingDesigner更新

- [ ] T029 [US1] MappingDesigner.tsx から設定パネルロジックを削除し、動的インポートに置き換え
- [ ] T030 [US1] MappingDesigner.tsx のコード行数が500行以下になったことを確認

**チェックポイント**: MappingDesignerの分割が完了

---

## フェーズ 4: ユーザーストーリー 2 - JobMonitor分割 (優先度: P2)

**ゴール**: モーダルコンポーネントをJobMonitorから分離

**独立テスト**: JobDetailModalが正しく開閉し、ログが表示される

- [ ] T031 [US2] `src/components/modals/JobDetailModal.tsx` を作成
- [ ] T032 [US2] JobDetailModal にログ表示ロジックを移動
- [ ] T033 [US2] JobDetailModal にジョブ詳細情報表示を実装
- [ ] T034 [US2] JobMonitor.tsx から JobDetailModal を使用するよう更新
- [ ] T035 [US2] JobMonitor.tsx からモーダル関連コードを削除

**チェックポイント**: JobMonitorの分割が完了

---

## フェーズ 5: ユーザーストーリー 3 - BiDashboard分割 (優先度: P2)

**ゴール**: 各ウィジェットを独立したコンポーネントに分割

**独立テスト**: 各ウィジェットが独立して動作し、BiDashboard全体が正常に表示される

### ウィジェットコンポーネント（並行実行可能）

- [ ] T036 [P] [US3] `src/components/widgets/RecordCountWidget.tsx` を作成
- [ ] T037 [P] [US3] `src/components/widgets/ThroughputWidget.tsx` を作成
- [ ] T038 [P] [US3] `src/components/widgets/ErrorRateWidget.tsx` を作成
- [ ] T039 [P] [US3] `src/components/widgets/ProcessingTimeWidget.tsx` を作成
- [ ] T040 [P] [US3] その他のウィジェットを特定し分割（BiDashboard.tsx分析に基づく）

### BiDashboard更新

- [ ] T041 [US3] BiDashboard.tsx からウィジェットロジックを削除し、新しいコンポーネントを使用

**チェックポイント**: BiDashboardの分割が完了

---

## フェーズ 6: ユーザーストーリー 4 - DatabaseSettings分割 (優先度: P3)

**ゴール**: TableEditorを汎用コンポーネントとして分離

**独立テスト**: TableEditorが独立して動作し、DatabaseSettingsから正しく呼び出される

- [ ] T042 [US4] `src/components/common/TableEditor.tsx` を作成
- [ ] T043 [US4] TableEditor にカラム定義・編集機能を実装
- [ ] T044 [US4] TableEditor にスキーマプレビュー機能を実装
- [ ] T045 [US4] DatabaseSettings.tsx から TableEditor を使用するよう更新
- [ ] T046 [US4] DatabaseSettings.tsx からテーブルエディタ関連コードを削除

**チェックポイント**: DatabaseSettingsの分割が完了

---

## フェーズ 7: ポリッシュと検証

**目的**: 品質保証とコード整理

- [ ] T047 [P] 各新規コンポーネントに日本語コメントを追加
- [ ] T048 [P] 分割されたコンポーネントの型エラーをすべて解消
- [ ] T049 npm test && npm run build で最終検証
- [ ] T050 アプリケーションを起動し、すべての設定画面が正常に動作することを確認
- [ ] T051 各コンポーネントのコード行数が300行以下であることを確認

---

## 依存関係と実行順序

### フェーズの依存関係

- **セットアップ (フェーズ 1)**: 依存関係なし
- **基盤 (フェーズ 2)**: フェーズ 1 完了に依存
- **US1 MappingDesigner (フェーズ 3)**: フェーズ 2 の T006 完了に依存
- **US2 JobMonitor (フェーズ 4)**: フェーズ 1 完了に依存（フェーズ 2 とは独立）
- **US3 BiDashboard (フェーズ 5)**: フェーズ 2 の T007 完了に依存
- **US4 DatabaseSettings (フェーズ 6)**: フェーズ 1 完了に依存（他と独立）
- **ポリッシュ (フェーズ 7)**: フェーズ 3, 4, 5, 6 完了後

### ユーザーストーリー間の並行実行

- US1 と US2 は並行実行可能
- US3 と US4 は並行実行可能
- フェーズ 3 内のすべての ConfigPanel 作成タスクは並行実行可能
- フェーズ 5 内のすべての Widget 作成タスクは並行実行可能

---

## 注記

- 各コンポーネント分割後に npm run build を実行して型エラーを早期に検出
- 既存の MappingDesigner.tsx の機能をすべて維持することを確認
- 動的インポートを使用する場合は、読み込み遅延に注意
- コンポーネント間の状態共有は props または Context を通じて行う
