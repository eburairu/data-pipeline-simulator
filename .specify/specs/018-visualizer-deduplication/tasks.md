# タスク: モニタータブ ビジュアライザー共通化

**入力**: `/specs/018-visualizer-deduplication/` からの設計ドキュメント
**前提条件**: spec.md

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並行実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1〜US5）

---

## フェーズ 1: 共通ユーティリティ作成

**目的**: 共通化の基盤となるユーティリティとコンポーネントを作成

- [ ] T001 [P] [US3] `src/lib/statusUtils.ts` を新規作成 — `NodeStatus` 型、`getNodeStatusColor()`、`getNodeStatusIcon()` を実装（ProcessNode.tsx の既存ロジックを移植）
- [ ] T002 [P] [US3] `src/lib/statusUtils.ts` に `JobBadgeStatus` 型、`getJobStatusBadge()` を追加（JobMonitor.tsx の既存ロジックを移植）
- [ ] T003 [P] [US4] `src/components/common/ProgressBar.tsx` を新規作成 — `percent`, `colorClass`, `colorFn`, `heightClass`, `bgClass`, `className` props を持つ汎用プログレスバー
- [ ] T004 [P] [US5] `src/components/common/StatusBadge.tsx` を新規作成 — `statusUtils.ts` の `getJobStatusBadge()` を利用するジョブステータスバッジ
- [ ] T005 [P] [US1] `src/components/widgets/NumericWidget.tsx` を新規作成 — `icon`, `iconColorClass`, `valueColorFn` を追加propsとした汎用数値ウィジェット

**チェックポイント**: `npm run build` で新規ファイルに型エラーがないことを確認

---

## フェーズ 2: 数値ウィジェット統合 (US1)

**ゴール**: 4つの数値ウィジェットを `NumericWidget` を利用する薄いラッパーに変換

**独立テスト**: BiDashboardで4種類の数値ウィジェットが従来と同一表示

- [ ] T006 [P] [US1] `RecordCountWidget.tsx` を `NumericWidget` のラッパーに書き換え（icon=Database, color=blue, unit="件"）
- [ ] T007 [P] [US1] `ThroughputWidget.tsx` を `NumericWidget` のラッパーに書き換え（icon=Activity, color=green, unit="rec/s"）
- [ ] T008 [P] [US1] `ErrorRateWidget.tsx` を `NumericWidget` のラッパーに書き換え（icon=AlertTriangle, color=orange, unit="%", valueColorFn付き）
- [ ] T009 [P] [US1] `ProcessingTimeWidget.tsx` を `NumericWidget` のラッパーに書き換え（icon=Clock, color=purple, unit="ms", valueColorFn付き）

**チェックポイント**: BiDashboardの4ウィジェットが従来と同一表示であること

---

## フェーズ 3: MetricEdge廃止 (US2)

**ゴール**: MetricEdge を削除し、すべての参照を FlowingEdge に統合

**独立テスト**: PipelineFlow と MappingDesigner のエッジ表示が従来と同一

- [ ] T010 [US2] `src/components/PipelineFlow.tsx` の edgeTypes 定義で `default` を `FlowingEdge` に変更し、MetricEdge の import を削除
- [ ] T011 [US2] `src/components/settings/mapping/DesignerNode.tsx` の edgeTypes 定義で `metric` を `FlowingEdge` に変更し、MetricEdge の import を削除
- [ ] T012 [US2] `src/components/MetricEdge.tsx` を削除
- [ ] T013 [US2] 他にMetricEdgeを参照しているファイルがないことをgrep確認

**チェックポイント**: `npm run build` でエラーなし、PipelineFlowのエッジ表示が正常

---

## フェーズ 4: ステータスユーティリティ適用 (US3)

**ゴール**: ProcessNode、NodeDetailPanel、JobMonitor のステータス色・アイコン定義を statusUtils.ts に集約

**独立テスト**: 各コンポーネントのステータス表示が従来と同一

- [ ] T014 [US3] `src/components/nodes/ProcessNode.tsx` の `getStatusColor()` と `getStatusIcon()` を削除し、`statusUtils.ts` の関数に置き換え
- [ ] T015 [US3] `src/components/NodeDetailPanel.tsx` のインラインステータス色/アイコン定義を `statusUtils.ts` の関数に置き換え
- [ ] T016 [US3] `src/components/JobMonitor.tsx` のステータスバッジ色/アイコン定義を `statusUtils.ts` の `getJobStatusBadge()` に置き換え

**チェックポイント**: ステータス表示が全コンポーネントで従来通り

---

## フェーズ 5: プログレスバー共通化 (US4)

**ゴール**: 4箇所のプログレスバーを `ProgressBar` コンポーネントに統合

**独立テスト**: 各ノード・パネルのプログレスバーが従来と同一表示

- [ ] T017 [P] [US4] `src/components/nodes/ProcessNode.tsx` のプログレスバー（h-1.5, bg-orange-500）を `ProgressBar` に置き換え
- [ ] T018 [P] [US4] `src/components/nodes/StorageNode.tsx` の使用率バー（h-1.5, しきい値色変更）を `ProgressBar` に置き換え（`colorFn` 使用）
- [ ] T019 [P] [US4] `src/components/NodeDetailPanel.tsx` の進捗バー（h-2, ステータス色）を `ProgressBar` に置き換え
- [ ] T020 [P] [US4] `src/components/NodeDetailPanel.tsx` の容量バー（h-1.5, bg-blue-500）を `ProgressBar` に置き換え

**チェックポイント**: 全プログレスバーが従来と同一表示

---

## フェーズ 6: ステータスバッジ共通化 (US5)

**ゴール**: JobMonitor内のモバイル/デスクトップのステータスバッジを `StatusBadge` に統合

**独立テスト**: JobMonitorのモバイル/デスクトップ両方でステータスバッジが従来と同一表示

- [ ] T021 [US5] `src/components/JobMonitor.tsx` のモバイルカードビュー（行250-262付近）のステータスバッジを `StatusBadge` コンポーネント呼び出しに置き換え
- [ ] T022 [US5] `src/components/JobMonitor.tsx` のデスクトップテーブルビュー（行356-368付近）のステータスバッジを `StatusBadge` コンポーネント呼び出しに置き換え

**チェックポイント**: JobMonitorの両ビューでバッジ表示が従来通り

---

## フェーズ 7: 検証とクリーンアップ

**目的**: 全体の整合性確認とデッドコード除去

- [ ] T023 `npm test` で全テストがパスすることを確認
- [ ] T024 `npm run build` でTypeScriptビルドがエラーなく完了することを確認
- [ ] T025 ProcessNode、NodeDetailPanel、JobMonitor に残存するステータス色/アイコン定義のデッドコードがないことを確認
- [ ] T026 削除した MetricEdge への参照が残っていないことをgrep確認
- [ ] T027 アプリケーションを起動し、PipelineFlow・JobMonitor・BiDashboard・NodeDetailPanel の表示が従来と同一であることを目視確認

---

## 依存関係と実行順序

### フェーズの依存関係

- **フェーズ 1（共通ユーティリティ作成）**: 依存関係なし — 全タスクが並行実行可能
- **フェーズ 2（数値ウィジェット統合）**: T005 完了に依存
- **フェーズ 3（MetricEdge廃止）**: 依存関係なし — フェーズ 1 と並行実行可能
- **フェーズ 4（ステータスユーティリティ適用）**: T001, T002 完了に依存
- **フェーズ 5（プログレスバー共通化）**: T003 完了に依存
- **フェーズ 6（ステータスバッジ共通化）**: T002, T004 完了に依存
- **フェーズ 7（検証）**: フェーズ 2〜6 すべて完了後

### タスク間の並行実行

- フェーズ 1 の T001〜T005 はすべて並行実行可能
- フェーズ 2 の T006〜T009 はすべて並行実行可能
- フェーズ 3 の T010〜T011 は並行実行可能、T012 は T010/T011 完了後
- フェーズ 5 の T017〜T020 はすべて並行実行可能
- フェーズ 3 はフェーズ 1/2/4/5/6 と独立して並行実行可能

---

## 注記

- すべての変更は純粋なリファクタリング — ユーザーから見た振る舞いは変更しない
- 各フェーズのチェックポイントで `npm run build` を実行して型エラーを早期検出
- ウィジェットレジストリ (`widgets/index.ts`) の登録は変更不要
- `NumericWidgetProps` 型（`widgets/types.ts`）は変更不要 — 内部用の拡張propsは `NumericWidget.tsx` 内で定義
