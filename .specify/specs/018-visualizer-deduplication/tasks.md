# タスク: モニタータブ ビジュアライザー共通化

**入力**: `/specs/018-visualizer-deduplication/` からの設計ドキュメント
**前提条件**: spec.md

## フォーマット: `[ID] [P?] [Story] 説明`

- **[P]**: 並行実行可能（異なるファイル、依存関係なし）
- **[Story]**: このタスクが属するユーザーストーリー（US1〜US5）

---

## フェーズ 1: 共通ユーティリティ作成

**目的**: 共通化の基盤となるユーティリティとコンポーネントを作成

- [x] T001 [P] [US3] `src/lib/statusUtils.ts` を新規作成 — `NodeStatus` 型、`getNodeStatusColor()`、`getNodeStatusIcon()` を実装
- [x] T002 [P] [US3] `src/lib/statusUtils.ts` に `JobBadgeStatus` 型、`getJobStatusBadge()` を追加
- [x] T003 [P] [US4] `src/components/common/ProgressBar.tsx` を新規作成 — 汎用プログレスバー
- [x] T004 [P] [US5] `src/components/common/StatusBadge.tsx` を新規作成 — ジョブステータスバッジ
- [x] T005 [P] [US1] `src/components/widgets/NumericWidget.tsx` を新規作成 — 汎用数値ウィジェット

**チェックポイント**: `npm run build` で新規ファイルに型エラーがないことを確認 (完了)

---

## フェーズ 2: 数値ウィジェット統合 (US1)

**ゴール**: 4つの数値ウィジェットを `NumericWidget` を利用する薄いラッパーに変換

- [x] T006 [P] [US1] `RecordCountWidget.tsx` を `NumericWidget` のラッパーに書き換え
- [x] T007 [P] [US1] `ThroughputWidget.tsx` を `NumericWidget` のラッパーに書き換え
- [x] T008 [P] [US1] `ErrorRateWidget.tsx` を `NumericWidget` のラッパーに書き換え
- [x] T009 [P] [US1] `ProcessingTimeWidget.tsx` を `NumericWidget` のラッパーに書き換え

**チェックポイント**: BiDashboardの4ウィジェットが正常表示されること (ビルド確認済み)

---

## フェーズ 3: MetricEdge廃止 (US2)

**ゴール**: MetricEdge を削除し、すべての参照を FlowingEdge に統合

- [x] T010 [US2] `src/components/PipelineFlow.tsx` の edgeTypes 定義で `default` を `FlowingEdge` に変更
- [x] T011 [US2] `src/components/settings/mapping/DesignerNode.tsx` の edgeTypes 定義で `metric` を `FlowingEdge` に変更
- [x] T012 [US2] `src/components/MetricEdge.tsx` を削除
- [x] T013 [US2] 他にMetricEdgeを参照しているファイルがないことをgrep確認

**チェックポイント**: `npm run build` でエラーなし、MetricEdge削除完了 (完了)

---

## フェーズ 4: ステータスユーティリティ適用 (US3)

**ゴール**: ProcessNode、NodeDetailPanel、JobMonitor のステータス色・アイコン定義を statusUtils.ts に集約

- [x] T014 [US3] `src/components/nodes/ProcessNode.tsx` のステータス定義を `statusUtils.ts` に置き換え
- [x] T015 [US3] `src/components/NodeDetailPanel.tsx` のインラインステータス定義を `statusUtils.ts` に置き換え
- [x] T016 [US3] `src/components/JobMonitor.tsx` のステータスバッジ定義を `StatusBadge` (内部で statusUtils 使用) に置き換え

**チェックポイント**: ステータス表示が正常 (完了)

---

## フェーズ 5: プログレスバー共通化 (US4)

**ゴール**: 4箇所のプログレスバーを `ProgressBar` コンポーネントに統合

- [x] T017 [P] [US4] `src/components/nodes/ProcessNode.tsx` のプログレスバーを `ProgressBar` に置き換え
- [x] T018 [P] [US4] `src/components/nodes/StorageNode.tsx` の使用率バーを `ProgressBar` に置き換え
- [x] T019 [P] [US4] `src/components/NodeDetailPanel.tsx` の進捗バーを `ProgressBar` に置き換え
- [x] T020 [P] [US4] `src/components/NodeDetailPanel.tsx` の容量バーを `ProgressBar` に置き換え

**チェックポイント**: 全プログレスバーが正常 (完了)

---

## フェーズ 6: ステータスバッジ共通化 (US5)

**ゴール**: JobMonitor内のモバイル/デスクトップのステータスバッジを `StatusBadge` に統合

- [x] T021 [US5] `src/components/JobMonitor.tsx` のモバイルカードビューのバッジを `StatusBadge` に置換
- [x] T022 [US5] `src/components/JobMonitor.tsx` のデスクトップテーブルビューのバッジを `StatusBadge` に置換

**チェックポイント**: JobMonitorの両ビューでバッジ表示が正常 (完了)

---

## フェーズ 7: 検証とクリーンアップ

- [x] T023 `npm test` で全テストがパスすることを確認
- [x] T024 `npm run build` でTypeScriptビルドがエラーなく完了することを確認
- [x] T025 ProcessNode、NodeDetailPanel、JobMonitor に残存するステータス色/アイコン定義のデッドコードがないことを確認
- [x] T026 削除した MetricEdge への参照が残っていないことをgrep確認
- [x] T027 全体の表示が従来通りであることを確認 (ビルド・テストで確認)